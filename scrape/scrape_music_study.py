"""Scrape hymns from the /study/manual/hymns/ section of churchofjesuschrist.org.

Unlike the /media/music/ pages (see scrape_music.py), the study version is
server-rendered HTML with stable per-line anchors:

    <figure class="music" id="figure1">
      <p class="label">Triumphantly</p>
      <div class="poetry">
        <div class="stanza">
          <p class="line" id="figure1_p2"><span class="verse-number">1. </span>The morning breaks…</p>
          <p class="line" id="figure1_p3">Lo, Zion's standard…</p>
          …
        </div>
        <div class="chorus">
          <p class="label" id="figure1_p10">[Chorus]</p>
          <p class="line" id="figure1_p11">…</p>
        </div>
      </div>
      <div class="citation-info">…Text:/Music:…</div>
    </figure>

Each line carries an `id="figure1_pN"` that doubles as a deep-link anchor:
    /study/manual/hymns/<slug>?lang=eng&id=figure1_pN#figure1_pN

We capture every line individually (id + data-aid + text — same shape as the
conference scraper's paragraphs) and group them into verses. Each verse also
records the first line's marker as its anchor URL so the app can link straight
to it.

Output layout (rooted at --out, default ./out):
    out/music/hymns-study/index.json
    out/music/hymns-study/songs/NNN-<slug>.json

Run:
    uv sync
    uv run python scrape_music_study.py scrape                  # all 341 hymns
    uv run python scrape_music_study.py scrape --limit 2        # smoke test
    uv run python scrape_music_study.py scrape --only the-morning-breaks
    uv run python scrape_music_study.py song the-morning-breaks  # single
"""

from __future__ import annotations

import json
import logging
import re
import sys
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Annotated
from urllib.parse import urljoin

import typer

from scrapling.fetchers import Fetcher

logging.getLogger("scrapling").setLevel(logging.WARNING)

BASE = "https://www.churchofjesuschrist.org"
INDEX_URL = f"{BASE}/study/manual/hymns?lang=eng"
COLLECTION_NAME = "hymns-study"

# class names from the React build are hashed (item-U_5Ca etc.). Use stable bits:
# `id="liN"` on the anchor where N is the songNumber, and the inner spans hold
# the printed song number + title. Regex over raw HTML side-steps the hashed
# class noise entirely.
_INDEX_ITEM_RE = re.compile(
    r'<a[^>]*href="(?P<href>/study/manual/hymns/[^"?]+\?[^"]*)"[^>]*id="li(?P<li>\d+)"[^>]*>'
    r'.*?<span[^>]*class="songNumber-[^"]*">(?P<num>[^<]*)</span>'
    r'\s*<span[^>]*>(?P<title>[^<]+)</span>',
    re.S,
)

_WS_RE = re.compile(r"\s+")
_PUNCT_SPACE_RE = re.compile(r"\s+([.,;:!?)\]])")


def _text(selector) -> str:
    if selector is None:
        return ""
    raw = selector.get_all_text(separator=" ", strip=True)
    return _PUNCT_SPACE_RE.sub(r"\1", _WS_RE.sub(" ", raw).strip())


def _first(selectors):
    return selectors[0] if len(selectors) else None


@dataclass
class HymnRef:
    slug: str
    song_number: str
    position: int  # 1-indexed; matches songNumber for the hymns collection
    title: str
    url: str


@dataclass
class Line:
    id: str  # e.g. "figure1_p2"
    aid: str  # data-aid; numeric across the corpus
    text: str  # plain text, with verse-number prefix already stripped


@dataclass
class Verse:
    number: int  # 0 for chorus/unnumbered
    type: str  # "Verse" | "Chorus"
    label: str | None  # e.g. "[Chorus]" — only set for choruses
    marker: str  # id of the first line, used as the deep-link anchor
    url: str  # full ?id=…#… URL into churchofjesuschrist.org
    lines: list[Line]
    text: str  # \n-joined plain text of all lines (no verse-number prefix)


@dataclass
class ScriptureRef:
    text: str
    href: str


@dataclass
class Hymn:
    url: str
    slug: str
    collection: str
    song_number: str
    position: int
    title: str
    tempo: str | None  # the figure-level label (e.g. "Triumphantly")
    verses: list[Verse]
    credits: str  # plain text from div.citation-info
    scriptures: list[ScriptureRef] = field(default_factory=list)


def fetch(url: str):
    page = Fetcher.get(url, stealthy_headers=True, timeout=30)
    if page.status != 200:
        raise RuntimeError(f"{url} -> HTTP {page.status}")
    return page


def hymn_url(slug: str) -> str:
    return f"{BASE}/study/manual/hymns/{slug}?lang=eng"


def deep_link(slug: str, marker: str) -> str:
    return f"{BASE}/study/manual/hymns/{slug}?lang=eng&id={marker}#{marker}"


def scrape_index() -> list[HymnRef]:
    """Fetch the hymns index. Returns 341 entries in songNumber order."""
    page = fetch(INDEX_URL)
    html = page.body.decode("utf-8", errors="replace") if isinstance(page.body, bytes) else str(page.body)
    refs: list[HymnRef] = []
    seen: set[str] = set()
    for m in _INDEX_ITEM_RE.finditer(html):
        href = m.group("href")
        # Slug is the last path segment before the query.
        slug = href.split("?", 1)[0].rsplit("/", 1)[-1]
        if slug in seen:
            continue
        seen.add(slug)
        refs.append(
            HymnRef(
                slug=slug,
                song_number=m.group("num").strip(),
                position=int(m.group("li")),
                title=m.group("title").strip(),
                url=urljoin(BASE, href),
            )
        )
    if not refs:
        raise RuntimeError(f"No hymns found at {INDEX_URL}")
    refs.sort(key=lambda r: r.position)
    return refs


_VERSE_NUM_RE = re.compile(r"^\s*(\d+)\.\s*")


def _line_from_p(p) -> Line:
    """Build a Line from a <p class="line">. Strips any leading verse-number
    span so the text is just the lyric."""
    # Drop the verse-number span if present so it doesn't end up in `text`.
    raw = _text(p)
    raw = _VERSE_NUM_RE.sub("", raw)
    return Line(
        id=p.attrib.get("id") or "",
        aid=p.attrib.get("data-aid") or "",
        text=raw,
    )


def _verse_number_of(p) -> int:
    """If the line starts with a verse-number span, return that integer; else 0."""
    span = _first(p.css("span.verse-number"))
    if span is None:
        return 0
    m = _VERSE_NUM_RE.match(_text(span))
    return int(m.group(1)) if m else 0


def _build_verse(stanza, slug: str, kind: str, label_p) -> Verse | None:
    """kind is "Verse" or "Chorus". For choruses, label_p is the
    <p class="label">[Chorus]</p> element; its id (typically the lowest in the
    stanza) becomes the verse marker so the deep link lands on the heading."""
    line_ps = stanza.css("p.line")
    if not line_ps:
        return None
    lines = [_line_from_p(p) for p in line_ps]
    number = _verse_number_of(line_ps[0]) if kind == "Verse" else 0
    label_text = _text(label_p) if label_p is not None else None
    label_id = label_p.attrib.get("id") if label_p is not None else ""
    # For verses: marker is the first line (where the lyric starts).
    # For choruses with a label: marker is the label's id (the section header).
    marker = label_id or lines[0].id
    return Verse(
        number=number,
        type=kind,
        label=label_text,
        marker=marker,
        url=deep_link(slug, marker) if marker else hymn_url(slug),
        lines=lines,
        text="\n".join(l.text for l in lines),
    )


def scrape_hymn(ref: HymnRef) -> Hymn:
    page = fetch(ref.url)
    title = _text(_first(page.css("h1#title1")) or _first(page.css("h1"))) or ref.title

    fig = _first(page.css("figure.music"))
    if fig is None:
        raise RuntimeError(f"no <figure class='music'> on {ref.url}")

    # Tempo / style label is the first p.label that's a *direct* child of the
    # figure (not the chorus's "[Chorus]" label, which sits inside .chorus).
    tempo = None
    for p in fig.css("p.label"):
        # Walk up; if any ancestor is a .chorus, this isn't the figure-level label.
        cur = p
        in_chorus = False
        for _ in range(6):
            cur = cur.parent
            if cur is None or cur is fig:
                break
            cls = cur.attrib.get("class") or ""
            if "chorus" in cls.split():
                in_chorus = True
                break
        if not in_chorus:
            tempo = _text(p)
            break

    verses: list[Verse] = []
    poetry = _first(fig.css("div.poetry"))
    if poetry is not None:
        for child in poetry.css("div.stanza, div.chorus"):
            cls = (child.attrib.get("class") or "").split()
            if "chorus" in cls:
                label_p = _first(child.css("p.label"))
                v = _build_verse(child, ref.slug, "Chorus", label_p)
            else:
                v = _build_verse(child, ref.slug, "Verse", None)
            if v:
                verses.append(v)

    # Credits: <div class="citation-info"><p>…Text: …</p><p>…Music: …</p></div>
    cit = _first(fig.css("div.citation-info"))
    credits = ""
    if cit is not None:
        parts = [_text(p) for p in cit.css("p")]
        credits = "\n".join(p for p in parts if p)

    # Scripture references appear as <p><a class="scripture-ref" href="..."> after the figure.
    scriptures = [
        ScriptureRef(text=_text(a), href=urljoin(BASE, a.attrib.get("href", "")))
        for a in page.css("a.scripture-ref")
    ]

    return Hymn(
        url=ref.url,
        slug=ref.slug,
        collection=COLLECTION_NAME,
        song_number=ref.song_number,
        position=ref.position,
        title=title,
        tempo=tempo,
        verses=verses,
        credits=credits,
        scriptures=scriptures,
    )


def _hymn_to_dict(h: Hymn) -> dict:
    d = asdict(h)
    d["verses"] = [_verse_to_dict(v) for v in h.verses]
    d["scriptures"] = [asdict(s) for s in h.scriptures]
    return d


def _verse_to_dict(v: Verse) -> dict:
    d = asdict(v)
    d["lines"] = [asdict(l) for l in v.lines]
    return d


def _collection_dir(out: Path) -> Path:
    return out / "music" / COLLECTION_NAME


def _hymn_filename(ref: HymnRef) -> str:
    if ref.song_number.isdigit():
        prefix = f"{int(ref.song_number):03d}"
    else:
        prefix = f"p{ref.position:03d}"
    return f"{prefix}-{ref.slug}.json"


def run_collection(
    out: Path,
    *,
    delay: float = 0.5,
    skip_existing: bool = False,
    limit: int | None = None,
    only: str | None = None,
) -> tuple[int, int, int]:
    root = _collection_dir(out)
    songs_dir = root / "songs"
    songs_dir.mkdir(parents=True, exist_ok=True)

    print(f"→ Fetching index ({INDEX_URL})", file=sys.stderr)
    all_refs = scrape_index()
    print(f"  found {len(all_refs)} hymns", file=sys.stderr)

    (root / "index.json").write_text(
        json.dumps(
            {
                "collection": COLLECTION_NAME,
                "title": "Hymns",
                "url": INDEX_URL,
                "songs": [asdict(r) for r in all_refs],
            },
            indent=2,
            ensure_ascii=False,
        )
    )

    if only:
        refs = [r for r in all_refs if r.slug == only]
        if not refs:
            raise RuntimeError(f"--only {only} did not match any hymn")
    elif limit:
        refs = all_refs[:limit]
    else:
        refs = all_refs

    written = 0
    failures = 0
    for i, ref in enumerate(refs, 1):
        dest = songs_dir / _hymn_filename(ref)
        if skip_existing and dest.exists():
            print(f"  [{i}/{len(refs)}] {ref.slug} — cached", file=sys.stderr)
            continue
        print(f"  [{i}/{len(refs)}] #{ref.song_number} {ref.slug}", file=sys.stderr)
        try:
            hymn = scrape_hymn(ref)
            dest.write_text(json.dumps(_hymn_to_dict(hymn), indent=2, ensure_ascii=False))
        except Exception as exc:  # noqa: BLE001
            print(f"    ⚠ {ref.slug} — {exc}", file=sys.stderr)
            failures += 1
        else:
            written += 1
        if i < len(refs) and delay:
            time.sleep(delay)

    cached = len(refs) - written - failures
    print(
        f"✓ Wrote {root}/ ({written} new, {cached} cached, {failures} failed)",
        file=sys.stderr,
    )
    return written, len(refs), failures


app = typer.Typer(
    name="scrape-music-study",
    help="Scrape hymns from /study/manual/hymns/ on churchofjesuschrist.org.",
    no_args_is_help=True,
    add_completion=False,
)


@app.command()
def scrape(
    out: Annotated[Path, typer.Option(help="Output directory.")] = Path("out"),
    limit: Annotated[
        int | None, typer.Option(help="Only scrape the first N hymns.")
    ] = None,
    only: Annotated[
        str | None, typer.Option(help="Scrape a single hymn by slug.")
    ] = None,
    delay: Annotated[
        float, typer.Option(help="Seconds between hymn fetches.")
    ] = 0.5,
    skip_existing: Annotated[
        bool,
        typer.Option(
            "--skip-existing",
            help="Skip hymns whose JSON file already exists on disk.",
        ),
    ] = False,
) -> None:
    """Scrape every hymn from /study/manual/hymns/."""
    _, _, failures = run_collection(
        out,
        delay=delay,
        skip_existing=skip_existing,
        limit=limit,
        only=only,
    )
    if failures:
        raise typer.Exit(1)


@app.command()
def song(
    slug: Annotated[str, typer.Argument(help="Hymn slug (e.g. the-morning-breaks).")],
    out: Annotated[Path, typer.Option(help="Output directory.")] = Path("out"),
) -> None:
    """Scrape a single hymn. Looks up its songNumber from the index for filename ordering."""
    refs = scrape_index()
    ref = next((r for r in refs if r.slug == slug), None)
    if ref is None:
        ref = HymnRef(slug=slug, song_number="", position=0, title=slug, url=hymn_url(slug))
    songs_dir = _collection_dir(out) / "songs"
    songs_dir.mkdir(parents=True, exist_ok=True)
    h = scrape_hymn(ref)
    dest = songs_dir / _hymn_filename(ref)
    dest.write_text(json.dumps(_hymn_to_dict(h), indent=2, ensure_ascii=False))
    print(f"✓ {dest}", file=sys.stderr)


@app.command()
def index(
    out: Annotated[Path, typer.Option(help="Output directory.")] = Path("out"),
) -> None:
    """Fetch only the hymns index (no per-hymn pages)."""
    refs = scrape_index()
    root = _collection_dir(out)
    root.mkdir(parents=True, exist_ok=True)
    (root / "index.json").write_text(
        json.dumps(
            {
                "collection": COLLECTION_NAME,
                "title": "Hymns",
                "url": INDEX_URL,
                "songs": [asdict(r) for r in refs],
            },
            indent=2,
            ensure_ascii=False,
        )
    )
    print(f"✓ {root/'index.json'} ({len(refs)} hymns)", file=sys.stderr)


def _main() -> None:
    argv = sys.argv[1:]
    known = {"scrape", "song", "index", "--help", "-h"}
    if not argv:
        sys.argv.insert(1, "scrape")  # bare invocation = full scrape
    elif argv[0] not in known and not argv[0].startswith("-"):
        # bare positional → assume `song <slug>` (scrape takes no positional arg)
        sys.argv.insert(1, "song")
    app()


if __name__ == "__main__":
    _main()
