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

import argparse
import json
import re
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse

from scrapling.fetchers import Fetcher

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
    current_session: str | None = None

    # Walk every <a> in document order. Session anchors come before their
    # child talk anchors in the sidebar nav, so we can track the current
    # session as a running header.
    for a in page.css("a[href*='/study/general-conference/']"):
        href = a.attrib.get("href", "")
        if SESSION_HREF_RE.search(href):
            label = _text(a)
            if label:
                current_session = label
            continue
        if not TALK_HREF_RE.match(href):
            continue
        slug = slug_from_href(href)
        # Dedupe; the nav lists each talk once but the page can repeat anchors
        # in other components (related links, etc.).
        if any(t.slug == slug for t in talks):
            continue
        # Title + subtitle (speaker) live in nested <p> tags inside the anchor.
        paragraphs = a.css("p")
        talk_title = _text(paragraphs[0]) if len(paragraphs) else _text(a)
        speaker = _text(paragraphs[1]) if len(paragraphs) > 1 else ""
        talks.append(
            TalkRef(
                slug=slug,
                title=talk_title,
                speaker=speaker,
                url=urljoin(BASE, href),
                session=current_session,
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
    return bool(data.get("talks")) and all(
        (talks_dir / f"{t['slug']}.json").exists() for t in data["talks"]
    )


def run_conference(
    conference: str,
    out: Path,
    *,
    delay: float = 0.5,
    skip_existing: bool = False,
    limit: int | None = None,
    only: str | None = None,
) -> int:
    """Scrape one conference. Returns the number of talks written."""
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
    for i, ref in enumerate(refs, 1):
        dest = talks_dir / f"{ref.slug}.json"
        if skip_existing and dest.exists():
            print(f"  [{i}/{len(refs)}] {ref.slug} — cached", file=sys.stderr)
            continue
        print(f"  [{i}/{len(refs)}] {ref.slug} — {ref.title}", file=sys.stderr)
        talk = scrape_talk(ref, conference)
        dest.write_text(json.dumps(_talk_to_dict(talk), indent=2, ensure_ascii=False))
        written += 1
        if i < len(refs) and delay:
            time.sleep(delay)

    print(f"✓ Wrote {root}/ ({written} new, {len(refs) - written} cached)", file=sys.stderr)
    return written


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_scrape = sub.add_parser("scrape", help="Scrape one conference (YYYY/MM).")
    p_scrape.add_argument("conference", help="Conference as YYYY/MM, e.g. 2026/04")
    p_scrape.add_argument("--out", default="out", help="Output directory (default: ./out)")
    p_scrape.add_argument("--limit", type=int, default=None, help="Only scrape the first N talks")
    p_scrape.add_argument("--only", default=None, help="Scrape a single talk by slug (e.g. 11oaks)")
    p_scrape.add_argument("--delay", type=float, default=0.5, help="Seconds between talk fetches")
    p_scrape.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip talks that already have a JSON file on disk.",
    )

    p_bf = sub.add_parser(
        "backfill",
        help="Scrape every semi-annual conference, resuming from the cache.",
    )
    p_bf.add_argument("--out", default="out", help="Output directory (default: ./out)")
    p_bf.add_argument("--start", type=int, default=1971, help="Earliest year (default: 1971)")
    p_bf.add_argument(
        "--end",
        type=int,
        default=datetime.now().year,
        help="Latest year, inclusive (default: current year)",
    )
    p_bf.add_argument(
        "--months",
        default="04,10",
        help="Comma-separated MM values to try each year (default: 04,10)",
    )
    p_bf.add_argument("--delay", type=float, default=0.5, help="Seconds between talk fetches")
    p_bf.add_argument(
        "--conference-delay",
        type=float,
        default=1.0,
        help="Seconds between conferences (default: 1.0)",
    )

    return parser


def _normalize_argv(argv: list[str]) -> list[str]:
    """Let `scrape_conference.py 2026/04` keep working by inserting the subcommand."""
    if argv and (argv[0] == "-h" or argv[0] == "--help"):
        return argv
    if argv and argv[0] not in {"scrape", "backfill"}:
        return ["scrape", *argv]
    return argv


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    raw = list(argv) if argv is not None else sys.argv[1:]
    args = parser.parse_args(_normalize_argv(raw))

    if args.cmd == "scrape":
        if not re.fullmatch(r"\d{4}/\d{2}", args.conference):
            parser.error("conference must look like YYYY/MM (e.g. 2026/04)")
        run_conference(
            args.conference,
            Path(args.out),
            delay=args.delay,
            skip_existing=args.skip_existing,
            limit=args.limit,
            only=args.only,
        )
        return 0

    # backfill
    months = [m.strip() for m in args.months.split(",") if m.strip()]
    if not months:
        parser.error("--months must list at least one MM value")
    out = Path(args.out)
    skipped = scraped = failed = 0

    for year in range(args.start, args.end + 1):
        for month in months:
            conference = f"{year}/{month}"
            if is_conference_cached(out, conference):
                print(f"⏭  {conference} — fully cached", file=sys.stderr)
                skipped += 1
                continue
            try:
                run_conference(
                    conference,
                    out,
                    delay=args.delay,
                    skip_existing=True,
                )
                scraped += 1
            except Exception as exc:  # noqa: BLE001 — keep backfill going
                print(f"⚠  {conference} — {exc}", file=sys.stderr)
                failed += 1
                continue
            if args.conference_delay:
                time.sleep(args.conference_delay)

    print(
        f"done. scraped={scraped} cached={skipped} failed={failed}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
