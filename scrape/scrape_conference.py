"""Scrape General Conference talks from churchofjesuschrist.org.

Index page (e.g. https://www.churchofjesuschrist.org/study/general-conference/2026/04?lang=eng)
lists sessions and per-session talks. Each talk page carries a consistent
structure under <div class="body"> — a header (h1, byline, kicker), one or more
<div class="body-block"> paragraph groups, and an optional <footer class="notes">
with footnote list items linking out to scriptures.

Output layout (rooted at --out, default ./out):
    out/<year>-<month>/index.json           # conference index
    out/<year>-<month>/talks/<slug>.json    # one file per talk

Run:
    uv sync
    uv run python scrape_conference.py 2026/04
    uv run python scrape_conference.py 2026/04 --limit 2      # smoke test
    uv run python scrape_conference.py 2026/04 --only 11oaks  # single talk
    uv run python scrape_conference.py backfill               # every conference, resumable
"""

from __future__ import annotations

import json
import logging
import re
import sys
import time
from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Annotated
from urllib.parse import urljoin, urlparse

import typer

from scrapling.fetchers import Fetcher

# Scrapling emits an INFO line per request ("Fetched (200) <GET ...> (referer: ...)").
# For bulk backfill/check runs that's hundreds of lines of noise before our own
# output — silence it.
logging.getLogger("scrapling").setLevel(logging.WARNING)

BASE = "https://www.churchofjesuschrist.org"


def _first(selectors):
    """Return the first Selector or None; scrapling's css() always returns a list."""
    return selectors[0] if len(selectors) else None


_WS_RE = re.compile(r"\s+")
# Whitespace that sneaks in before punctuation when adjacent inline tags
# (e.g. a scripture-ref followed by a bare ".") are joined with " ".
_PUNCT_SPACE_RE = re.compile(r"\s+([.,;:!?)\]])")


def _text(selector) -> str:
    """Extract collapsed, single-space text from a scrapling Selector."""
    if selector is None:
        return ""
    raw = selector.get_all_text(separator=" ", strip=True)
    collapsed = _WS_RE.sub(" ", raw).strip()
    return _PUNCT_SPACE_RE.sub(r"\1", collapsed)
# Modern (2000s+) slugs are numeric-prefixed (e.g. 11oaks); older conferences
# (1971–2010ish) use descriptive slugs (e.g. a-mother-heart). Match both.
TALK_HREF_RE = re.compile(r"^/study/general-conference/\d{4}/\d{2}/[a-z0-9][a-z0-9-]*(?:\?|$)")
SESSION_HREF_RE = re.compile(r"/study/general-conference/\d{4}/\d{2}/[a-z-]+-session(?:\?|$)")


@dataclass
class TalkRef:
    slug: str
    title: str
    speaker: str
    url: str
    session: str | None = None
    session_number: int = 0  # 1-indexed ordinal of the session within the conference
    session_position: int = 0  # 1-indexed position of the talk within its session
    conference_position: int = 0  # 1-indexed absolute position in the conference


@dataclass
class Note:
    marker: str
    text: str
    refs: list[dict] = field(default_factory=list)


@dataclass
class Talk:
    url: str
    slug: str
    conference: str
    session: str | None
    session_number: int
    session_position: int
    conference_position: int
    title: str
    speaker: str | None
    speaker_role: str | None
    kicker: str | None
    paragraphs: list[dict]
    notes: list[Note]


def fetch(url: str):
    """Fetch a page with stealth headers. Raises on non-200."""
    page = Fetcher.get(url, stealthy_headers=True, timeout=30)
    if page.status != 200:
        raise RuntimeError(f"{url} -> HTTP {page.status}")
    return page


def slug_from_href(href: str) -> str:
    path = urlparse(href).path
    return path.rsplit("/", 1)[-1]


def scrape_index(conference: str) -> tuple[str, list[TalkRef]]:
    """Return (conference_title, talks). `conference` is 'YYYY/MM'."""
    url = f"{BASE}/study/general-conference/{conference}?lang=eng"
    page = fetch(url)
    conf_title = _text(_first(page.css("title"))) or conference

    talks: list[TalkRef] = []
    seen_slugs: set[str] = set()
    # Canonical session URL → {number, label, position}. Dict insertion order
    # captures the order sessions first appear in the DOM, which matches the
    # conference running order.
    session_state: dict[str, dict] = {}
    current_session_url: str | None = None

    # Walk every <a> in document order. Session anchors come before their
    # child talk anchors in the sidebar nav, so we can track the current
    # session as a running header.
    for a in page.css("a[href*='/study/general-conference/']"):
        href = a.attrib.get("href", "")
        if SESSION_HREF_RE.search(href):
            canon = urlparse(href).path
            state = session_state.get(canon)
            if state is None:
                state = {
                    "number": len(session_state) + 1,
                    "label": _text(a),
                    "position": 0,
                }
                session_state[canon] = state
            elif not state["label"]:
                state["label"] = _text(a)
            current_session_url = canon
            continue
        if not TALK_HREF_RE.match(href):
            continue
        slug = slug_from_href(href)
        # Dedupe; the nav lists each talk once but the page can repeat anchors
        # in other components (related links, etc.).
        if slug in seen_slugs:
            continue
        seen_slugs.add(slug)
        # Title + subtitle (speaker) live in nested <p> tags inside the anchor.
        paragraphs = a.css("p")
        talk_title = _text(paragraphs[0]) if len(paragraphs) else _text(a)
        speaker = _text(paragraphs[1]) if len(paragraphs) > 1 else ""

        state = session_state.get(current_session_url) if current_session_url else None
        if state is not None:
            state["position"] += 1
            session_label = state["label"] or None
            session_number = state["number"]
            session_position = state["position"]
        else:
            session_label = None
            session_number = 0
            session_position = 0

        talks.append(
            TalkRef(
                slug=slug,
                title=talk_title,
                speaker=speaker,
                url=urljoin(BASE, href),
                session=session_label,
                session_number=session_number,
                session_position=session_position,
                conference_position=len(talks) + 1,
            )
        )

    if not talks:
        raise RuntimeError(f"No talks found on index page {url}")
    return conf_title, talks


def _collect_paragraphs(page) -> list[dict]:
    paras: list[dict] = []
    for block in page.css("div.body-block"):
        for p in block.css("p"):
            text = _text(p)
            if not text:
                continue
            paras.append(
                {
                    "id": p.attrib.get("id") or "",
                    "aid": p.attrib.get("data-aid") or "",
                    "text": text,
                }
            )
    return paras


def _collect_notes(page) -> list[Note]:
    notes: list[Note] = []
    footer = _first(page.css("footer.notes"))
    if footer is None:
        return notes
    for li in footer.css("li"):
        marker = li.attrib.get("data-marker") or li.attrib.get("data-full-marker") or ""
        refs = [
            {"text": _text(link), "href": urljoin(BASE, link.attrib.get("href", ""))}
            for link in li.css("a.scripture-ref")
        ]
        notes.append(Note(marker=marker.strip(), text=_text(li), refs=refs))
    return notes


def scrape_talk(ref: TalkRef, conference: str) -> Talk:
    page = fetch(ref.url)
    title = _text(_first(page.css("div.body h1")) or _first(page.css("h1"))) or ref.title

    speaker = _text(_first(page.css("p.author-name"))) or None
    # "By President Dallin H. Oaks" -> strip leading "By "
    if speaker and speaker.lower().startswith("by "):
        speaker = speaker[3:].strip()

    return Talk(
        url=ref.url,
        slug=ref.slug,
        conference=conference,
        session=ref.session,
        session_number=ref.session_number,
        session_position=ref.session_position,
        conference_position=ref.conference_position,
        title=title,
        speaker=speaker,
        speaker_role=_text(_first(page.css("p.author-role"))) or None,
        kicker=_text(_first(page.css("p.kicker"))) or None,
        paragraphs=_collect_paragraphs(page),
        notes=_collect_notes(page),
    )


def _talk_to_dict(t: Talk) -> dict:
    d = asdict(t)
    d["notes"] = [asdict(n) for n in t.notes]
    return d


def _conference_dir(out: Path, conference: str) -> Path:
    return out / conference.replace("/", "-")


def _talk_filename(position: int, slug: str) -> str:
    """Zero-padded ordinal prefix keeps shell/filesystem sort order aligned
    with conference running order (e.g. 01-introduction.json)."""
    return f"{position:02d}-{slug}.json"


def _fmt_duration(seconds: float) -> str:
    s = int(seconds)
    h, rem = divmod(s, 3600)
    m, sec = divmod(rem, 60)
    if h:
        return f"{h}h{m:02d}m{sec:02d}s"
    if m:
        return f"{m}m{sec:02d}s"
    return f"{sec}s"


def is_conference_cached(out: Path, conference: str) -> bool:
    """True when index.json exists and every talk it names has a JSON file."""
    root = _conference_dir(out, conference)
    idx = root / "index.json"
    if not idx.exists():
        return False
    try:
        data = json.loads(idx.read_text())
    except (OSError, json.JSONDecodeError):
        return False
    talks_dir = root / "talks"
    talks = data.get("talks") or []
    if not talks:
        return False
    for t in talks:
        pos = t.get("conference_position")
        if not pos:
            return False  # legacy index without positions — force re-scrape
        if not (talks_dir / _talk_filename(pos, t["slug"])).exists():
            return False
    return True


def run_conference(
    conference: str,
    out: Path,
    *,
    delay: float = 0.5,
    skip_existing: bool = False,
    limit: int | None = None,
    only: str | None = None,
    log_writer: Callable[[str], None] | None = None,
    verbose: bool = False,
) -> tuple[int, int, int]:
    """Scrape one conference. Returns (newly_written, total_in_scope, talk_failures).

    Talk-level exceptions are caught and logged so one bad fetch doesn't abort
    the whole conference. `scrape_index` errors still propagate — if the index
    itself can't be read, there's nothing to iterate over.

    When `verbose`, each talk's outcome is logged (SUCCESS/CACHED). In
    non-verbose mode only per-talk FAILs are logged; the caller handles the
    conference-level summary.
    """
    root = _conference_dir(out, conference)
    talks_dir = root / "talks"
    talks_dir.mkdir(parents=True, exist_ok=True)

    print(f"→ Fetching index for {conference}", file=sys.stderr)
    conf_title, all_refs = scrape_index(conference)
    print(f"  found {len(all_refs)} talks", file=sys.stderr)

    # Always persist the full index — is_conference_cached() relies on it listing
    # every talk in the conference, so --limit / --only must not truncate it.
    (root / "index.json").write_text(
        json.dumps(
            {"conference": conference, "title": conf_title, "talks": [asdict(r) for r in all_refs]},
            indent=2,
            ensure_ascii=False,
        )
    )

    if only:
        refs = [r for r in all_refs if r.slug == only]
        if not refs:
            raise RuntimeError(f"--only {only} did not match any talk")
    elif limit:
        refs = all_refs[:limit]
    else:
        refs = all_refs

    written = 0
    talk_failures = 0
    for i, ref in enumerate(refs, 1):
        dest = talks_dir / _talk_filename(ref.conference_position, ref.slug)
        ts = datetime.now().isoformat(timespec="seconds")
        if skip_existing and dest.exists():
            print(f"  [{i}/{len(refs)}] {ref.slug} — cached", file=sys.stderr)
            if log_writer and verbose:
                log_writer(f"{ts} {conference} CACHED {ref.slug} {ref.url}")
            continue
        print(f"  [{i}/{len(refs)}] {ref.slug} — {ref.title}", file=sys.stderr)
        try:
            talk = scrape_talk(ref, conference)
            dest.write_text(json.dumps(_talk_to_dict(talk), indent=2, ensure_ascii=False))
        except Exception as exc:  # noqa: BLE001 — keep scraping remaining talks
            print(f"    ⚠ {ref.slug} — {exc}", file=sys.stderr)
            if log_writer:
                log_writer(f"{ts} {conference} FAIL {ref.slug} {ref.url} err={exc!r}")
            talk_failures += 1
        else:
            if log_writer and verbose:
                log_writer(f"{ts} {conference} SUCCESS {ref.slug} {ref.url}")
            written += 1
        if i < len(refs) and delay:
            time.sleep(delay)

    cached_count = len(refs) - written - talk_failures
    print(
        f"✓ Wrote {root}/ ({written} new, {cached_count} cached, {talk_failures} failed)",
        file=sys.stderr,
    )
    return written, len(refs), talk_failures


app = typer.Typer(
    name="scrape-conference",
    help="Scrape General Conference talks from churchofjesuschrist.org.",
    no_args_is_help=True,
    add_completion=False,
)


def _parse_months(raw: str) -> list[str]:
    months = [m.strip() for m in raw.split(",") if m.strip()]
    if not months:
        raise typer.BadParameter("--months must list at least one MM value")
    return months


@app.command()
def scrape(
    conference: Annotated[
        str, typer.Argument(help="Conference as YYYY/MM, e.g. 2026/04.")
    ],
    out: Annotated[Path, typer.Option(help="Output directory.")] = Path("out"),
    limit: Annotated[
        int | None, typer.Option(help="Only scrape the first N talks.")
    ] = None,
    only: Annotated[
        str | None,
        typer.Option(help="Scrape a single talk by slug (e.g. 11oaks)."),
    ] = None,
    delay: Annotated[
        float, typer.Option(help="Seconds between talk fetches.")
    ] = 0.5,
    skip_existing: Annotated[
        bool,
        typer.Option(
            "--skip-existing",
            help="Skip talks whose JSON file already exists on disk.",
        ),
    ] = False,
) -> None:
    """Scrape one conference (YYYY/MM)."""
    if not re.fullmatch(r"\d{4}/\d{2}", conference):
        raise typer.BadParameter("conference must look like YYYY/MM (e.g. 2026/04)")
    run_conference(
        conference,
        out,
        delay=delay,
        skip_existing=skip_existing,
        limit=limit,
        only=only,
    )


@app.command()
def backfill(
    out: Annotated[Path, typer.Option(help="Output directory.")] = Path("out"),
    start: Annotated[int, typer.Option(help="Earliest year (inclusive).")] = 1971,
    end: Annotated[
        int, typer.Option(help="Latest year (inclusive).")
    ] = datetime.now().year,
    months: Annotated[
        str, typer.Option(help="Comma-separated MM values to try each year.")
    ] = "04,10",
    delay: Annotated[
        float, typer.Option(help="Seconds between talk fetches.")
    ] = 0.5,
    conference_delay: Annotated[
        float,
        typer.Option("--conference-delay", help="Seconds between conferences."),
    ] = 1.0,
    log: Annotated[
        Path | None,
        typer.Option(
            help=(
                "Per-conference log file (default <out>/_backfill.log). "
                "Pass /dev/null to disable."
            ),
        ),
    ] = None,
    force: Annotated[
        bool,
        typer.Option(
            "--force",
            help=(
                "Also process conferences whose output directory already exists. "
                "Existing talk files are never overwritten."
            ),
        ),
    ] = False,
    check: Annotated[
        bool,
        typer.Option(
            "--check",
            help=(
                "Read-only audit: fetch each conference index, compare expected "
                "talk count against on-disk files, print a status line, and exit. "
                "Nothing is written."
            ),
        ),
    ] = False,
    verbose: Annotated[
        bool,
        typer.Option(
            "--verbose",
            "-v",
            help=(
                "Log one line per talk (SUCCESS/CACHED). Default logs per-talk "
                "lines only for FAILs; conferences get a single OK summary line."
            ),
        ),
    ] = False,
) -> None:
    """Scrape every semi-annual conference, resuming from the cache."""
    month_list = _parse_months(months)
    out.mkdir(parents=True, exist_ok=True)

    if check:
        raise typer.Exit(_run_check(out, start, end, month_list))

    raise typer.Exit(
        _run_backfill(
            out=out,
            start=start,
            end=end,
            months=month_list,
            delay=delay,
            conference_delay=conference_delay,
            log_path_override=log,
            force=force,
            verbose=verbose,
        )
    )


def _run_check(out: Path, start: int, end: int, months: list[str]) -> int:
    """Audit mode: fetch each index, compare counts, print results. Read-only."""
    statuses: dict[str, int] = {}

    def bump(status: str) -> None:
        statuses[status] = statuses.get(status, 0) + 1

    header = f"{'conference':8s}  {'status':9s}  {'disk':>4s} / {'expected':>8s}  note"
    print(header, flush=True)
    print("-" * len(header), flush=True)

    for year in range(start, end + 1):
        for month in months:
            conference = f"{year}/{month}"
            conf_dir = _conference_dir(out, conference)
            talks_dir = conf_dir / "talks"
            on_disk = (
                len(list(talks_dir.glob("*.json"))) if talks_dir.is_dir() else 0
            )
            try:
                _, refs = scrape_index(conference)
            except Exception as exc:  # noqa: BLE001 — audit must keep going
                bump("FAIL")
                print(
                    f"{conference:8s}  {'FAIL':9s}  {on_disk:>4d} / {'?':>8s}  {exc}",
                    flush=True,
                )
                continue
            expected = len(refs)
            if on_disk > expected:
                status = "EXTRA"
            elif on_disk == expected:
                status = "OK"
            elif on_disk == 0:
                status = "NOT_RUN" if not conf_dir.exists() else "EMPTY"
            else:
                status = "PARTIAL"
            bump(status)
            print(
                f"{conference:8s}  {status:9s}  {on_disk:>4d} / {expected:>8d}",
                flush=True,
            )

    parts = " ".join(f"{k}={v}" for k, v in sorted(statuses.items()))
    total = sum(statuses.values())
    print(f"summary: {parts} total={total}", file=sys.stderr)
    return 0


def _run_backfill(
    *,
    out: Path,
    start: int,
    end: int,
    months: list[str],
    delay: float,
    conference_delay: float,
    log_path_override: Path | None,
    force: bool,
    verbose: bool,
) -> int:
    # Leading underscore keeps the log file sorted above the YYYY-MM/ directories.
    log_path = log_path_override if log_path_override else out / "_backfill.log"
    # Line-buffered append so a Ctrl-C still leaves a readable log.
    log = open(log_path, "a", buffering=1, encoding="utf-8")

    def write_log(line: str) -> None:
        print(line, file=log)

    scraped = skipped = 0
    failed: list[tuple[str, str]] = []  # (conference, err_repr) for index-level failures
    talk_fail_total = 0
    total_start = time.perf_counter()
    write_log(
        f"=== backfill started {datetime.now().isoformat(timespec='seconds')} "
        f"start={start} end={end} months={','.join(months)} "
        f"force={force} verbose={verbose} out={out} ==="
    )

    try:
        for year in range(start, end + 1):
            for month in months:
                conference = f"{year}/{month}"
                ts = datetime.now().isoformat(timespec="seconds")
                conf_start = time.perf_counter()
                conf_dir = _conference_dir(out, conference)

                if conf_dir.exists() and not force:
                    print(
                        f"⏭  {conference} — {conf_dir}/ exists (use --force to resume)",
                        file=sys.stderr,
                    )
                    write_log(f"{ts} {conference} EXISTS")
                    skipped += 1
                    continue

                if is_conference_cached(out, conference):
                    print(f"⏭  {conference} — fully cached", file=sys.stderr)
                    write_log(f"{ts} {conference} CACHED")
                    skipped += 1
                    continue

                try:
                    new, total, talk_fails = run_conference(
                        conference,
                        out,
                        delay=delay,
                        skip_existing=True,
                        log_writer=write_log,
                        verbose=verbose,
                    )
                except Exception as exc:  # noqa: BLE001 — index fetch failed
                    print(f"⚠  {conference} — {exc}", file=sys.stderr)
                    write_log(f"{ts} {conference} FAIL_INDEX err={exc!r}")
                    failed.append((conference, repr(exc)))
                    continue

                elapsed = time.perf_counter() - conf_start
                fail_note = f" fail={talk_fails}" if talk_fails else ""
                write_log(
                    f"{ts} {conference} OK new={new}/{total}{fail_note} t={elapsed:.1f}s"
                )
                talk_fail_total += talk_fails
                scraped += 1

                if conference_delay:
                    time.sleep(conference_delay)
    finally:
        total_elapsed = time.perf_counter() - total_start
        summary = (
            f"done. conferences scraped={scraped} cached={skipped} failed={len(failed)} "
            f"talk_failures={talk_fail_total} total={_fmt_duration(total_elapsed)}"
        )
        write_log(
            f"=== backfill finished {datetime.now().isoformat(timespec='seconds')} "
            f"total={_fmt_duration(total_elapsed)} "
            f"scraped={scraped} cached={skipped} failed={len(failed)} "
            f"talk_failures={talk_fail_total} ==="
        )
        log.close()
        print(summary, file=sys.stderr)
        if failed:
            print("failed conferences (index fetch):", file=sys.stderr)
            for conf, err in failed:
                print(f"  {conf}: {err}", file=sys.stderr)
        if talk_fail_total:
            print(
                f"(per-talk FAIL lines in the log — grep FAIL {log_path})",
                file=sys.stderr,
            )
        print(f"log: {log_path}", file=sys.stderr)
    return 0


def _main() -> None:
    """Entry point. Rewrites argv[1] to `scrape YYYY/MM` for backward compat."""
    argv = sys.argv[1:]
    if (
        argv
        and argv[0] not in {"scrape", "backfill", "--help", "-h"}
        and re.fullmatch(r"\d{4}/\d{2}", argv[0])
    ):
        sys.argv.insert(1, "scrape")
    app()


if __name__ == "__main__":
    _main()
