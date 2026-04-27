"""Scrape hymns (and other music collections) from churchofjesuschrist.org.

The /media/music site is React-rendered, but its data layer is a public JSON
endpoint at /media/music/api?type=<kind>&...:

    type=songBookData  identifier=<collection-slug>  -> ordered song list
    type=song          identifier=<song-slug>        -> verses, scriptures, etc.

Default collection is `hymns` (e.g.
https://www.churchofjesuschrist.org/media/music/collections/hymns?lang=eng).
The `childrens-songbook` collection works the same way.

Output layout (rooted at --out, default ./out):
    out/music/<collection>/index.json           # collection metadata + song list
    out/music/<collection>/songs/NNN-<slug>.json  # one file per song

Run:
    uv sync
    uv run python scrape_music.py scrape                  # full hymns collection
    uv run python scrape_music.py scrape --limit 2        # smoke test
    uv run python scrape_music.py scrape --only he-died-the-great-redeemer-died
    uv run python scrape_music.py scrape childrens-songbook
    uv run python scrape_music.py song he-died-the-great-redeemer-died
"""

from __future__ import annotations

import json
import logging
import re
import sys
import time
from dataclasses import asdict, dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Annotated

import typer

from scrapling.fetchers import Fetcher

logging.getLogger("scrapling").setLevel(logging.WARNING)

BASE = "https://www.churchofjesuschrist.org"
API = f"{BASE}/media/music/api"


@dataclass
class SongRef:
    slug: str
    song_number: str
    position: int  # 1-indexed order in the collection


@dataclass
class Verse:
    number: int
    type: str  # "Verse", "Chorus", "Refrain", etc.
    text: str  # plain text, line-broken on \n


@dataclass
class ScriptureRef:
    text: str
    href: str


@dataclass
class Tune:
    name: str
    alternate_titles: list[str] = field(default_factory=list)


@dataclass
class Asset:
    type: str  # AUDIO_ACCOMPANIMENT, MIDI, PDF, etc.
    url: str
    duration_ms: int | None = None


@dataclass
class Song:
    url: str
    slug: str
    collection: str
    song_number: str
    position: int
    title: str
    description: str | None
    credits: str  # plain text from fullCreditsText (Text:/Music:/Arrangement:)
    verses: list[Verse]
    scriptures: list[ScriptureRef]
    tunes: list[Tune]
    assets: list[Asset]


def fetch_json(url: str) -> dict:
    """Fetch a JSON endpoint with stealth headers. Raises on non-200."""
    page = Fetcher.get(url, stealthy_headers=True, timeout=30)
    if page.status != 200:
        raise RuntimeError(f"{url} -> HTTP {page.status}")
    return json.loads(page.body)


# verseBody / fullCreditsText use a simple subset: <p>, <br>, <i>, <b>, <span>.
# We want plain text where each <p> or <br><br> becomes a newline. The stdlib
# HTMLParser handles entities (e.g. &nbsp;) that a plain regex would miss.
class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag == "br":
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag == "p":
            self.parts.append("\n")


_NEWLINE_PAD_RE = re.compile(r"[ \t]*\n[ \t]*")
_NEWLINE_RUN_RE = re.compile(r"\n+")


def html_to_text(s: str) -> str:
    if not s:
        return ""
    p = _TextExtractor()
    p.feed(s)
    out = "".join(p.parts)
    # Whitespace adjacent to newlines (e.g. "</p><br><br> <p>" from credits)
    # comes through as " \n \n " — strip it before collapsing run lengths.
    out = _NEWLINE_PAD_RE.sub("\n", out)
    out = _NEWLINE_RUN_RE.sub("\n", out)
    return out.strip()


def song_url(slug: str) -> str:
    return f"{BASE}/media/music/songs/{slug}?lang=eng"


def collection_url(slug: str) -> str:
    return f"{BASE}/media/music/collections/{slug}?lang=eng"


def scrape_index(collection: str) -> tuple[str, list[SongRef]]:
    """Return (collection_title, songs)."""
    url = f"{API}?type=songBookData&lang=eng&identifier={collection}"
    payload = fetch_json(url)
    items = payload.get("data") or []
    if not items:
        raise RuntimeError(f"No data for collection {collection!r} at {url}")
    book = items[0] if isinstance(items, list) else items
    title = book.get("title") or collection
    songs = [
        SongRef(
            slug=s["slug"],
            song_number=str(s.get("songNumber") or ""),
            position=i,
        )
        for i, s in enumerate(book.get("songList") or [], start=1)
    ]
    if not songs:
        raise RuntimeError(f"Collection {collection!r} has empty songList")
    return title, songs


def scrape_song(ref: SongRef, collection: str) -> Song:
    url = f"{API}?type=song&lang=eng&identifier={ref.slug}"
    payload = fetch_json(url)
    sd = payload.get("data") or {}
    if not sd:
        raise RuntimeError(f"empty song payload for {ref.slug}")

    verses = [
        Verse(
            number=int(v.get("verseNumber") or 0),
            type=v.get("verseType") or "",
            text=html_to_text(v.get("verseBody") or ""),
        )
        for v in sd.get("verses") or []
    ]
    scriptures = [
        ScriptureRef(
            text=s.get("linkText") or "",
            # linkUrl is site-relative (e.g. /scriptures/nt/matt/27?id=p35#p35)
            href=BASE + s["linkUrl"] if s.get("linkUrl", "").startswith("/") else s.get("linkUrl") or "",
        )
        for s in sd.get("scriptures") or []
    ]
    tunes = [
        Tune(
            name=t.get("name") or "",
            alternate_titles=list(t.get("alternateTitles") or []),
        )
        for t in sd.get("tunes") or []
    ]
    assets = [
        Asset(
            type=a.get("assetType") or "",
            url=a.get("distributionUrl") or "",
            duration_ms=a.get("duration") if isinstance(a.get("duration"), int) else None,
        )
        for a in sd.get("assets") or []
        if a.get("distributionUrl")
    ]

    return Song(
        url=sd.get("url") or song_url(ref.slug),
        slug=sd.get("slug") or ref.slug,
        collection=collection,
        song_number=ref.song_number,
        position=ref.position,
        title=sd.get("title") or "",
        description=sd.get("description") or None,
        credits=html_to_text(sd.get("fullCreditsText") or ""),
        verses=verses,
        scriptures=scriptures,
        tunes=tunes,
        assets=assets,
    )


def _song_to_dict(s: Song) -> dict:
    d = asdict(s)
    d["verses"] = [asdict(v) for v in s.verses]
    d["scriptures"] = [asdict(r) for r in s.scriptures]
    d["tunes"] = [asdict(t) for t in s.tunes]
    d["assets"] = [asdict(a) for a in s.assets]
    return d


def _collection_dir(out: Path, collection: str) -> Path:
    return out / "music" / collection


def _song_filename(ref: SongRef) -> str:
    """Zero-padded prefix so `ls` sorts in collection order. Falls back to
    position when songNumber is non-numeric or missing."""
    if ref.song_number.isdigit():
        prefix = f"{int(ref.song_number):03d}"
    else:
        prefix = f"p{ref.position:03d}"
    return f"{prefix}-{ref.slug}.json"


def run_collection(
    collection: str,
    out: Path,
    *,
    delay: float = 0.5,
    skip_existing: bool = False,
    limit: int | None = None,
    only: str | None = None,
) -> tuple[int, int, int]:
    """Scrape one collection. Returns (newly_written, total_in_scope, failures).

    Per-song failures are logged and counted but don't abort the collection.
    """
    root = _collection_dir(out, collection)
    songs_dir = root / "songs"
    songs_dir.mkdir(parents=True, exist_ok=True)

    print(f"→ Fetching index for {collection}", file=sys.stderr)
    title, all_refs = scrape_index(collection)
    print(f"  found {len(all_refs)} songs", file=sys.stderr)

    (root / "index.json").write_text(
        json.dumps(
            {
                "collection": collection,
                "title": title,
                "url": collection_url(collection),
                "songs": [asdict(r) for r in all_refs],
            },
            indent=2,
            ensure_ascii=False,
        )
    )

    if only:
        refs = [r for r in all_refs if r.slug == only]
        if not refs:
            raise RuntimeError(f"--only {only} did not match any song in {collection}")
    elif limit:
        refs = all_refs[:limit]
    else:
        refs = all_refs

    written = 0
    failures = 0
    for i, ref in enumerate(refs, 1):
        dest = songs_dir / _song_filename(ref)
        if skip_existing and dest.exists():
            print(f"  [{i}/{len(refs)}] {ref.slug} — cached", file=sys.stderr)
            continue
        label = f"#{ref.song_number}" if ref.song_number else f"p{ref.position}"
        print(f"  [{i}/{len(refs)}] {label} {ref.slug}", file=sys.stderr)
        try:
            song = scrape_song(ref, collection)
            dest.write_text(json.dumps(_song_to_dict(song), indent=2, ensure_ascii=False))
        except Exception as exc:  # noqa: BLE001 — keep going on one bad fetch
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
    name="scrape-music",
    help="Scrape hymns and other music collections from churchofjesuschrist.org.",
    no_args_is_help=True,
    add_completion=False,
)


@app.command()
def scrape(
    collection: Annotated[
        str,
        typer.Argument(help="Collection slug (e.g. hymns, childrens-songbook)."),
    ] = "hymns",
    out: Annotated[Path, typer.Option(help="Output directory.")] = Path("out"),
    limit: Annotated[
        int | None, typer.Option(help="Only scrape the first N songs.")
    ] = None,
    only: Annotated[
        str | None,
        typer.Option(help="Scrape a single song by slug."),
    ] = None,
    delay: Annotated[
        float, typer.Option(help="Seconds between song fetches.")
    ] = 0.5,
    skip_existing: Annotated[
        bool,
        typer.Option(
            "--skip-existing",
            help="Skip songs whose JSON file already exists on disk.",
        ),
    ] = False,
) -> None:
    """Scrape an entire music collection."""
    new, total, failures = run_collection(
        collection,
        out,
        delay=delay,
        skip_existing=skip_existing,
        limit=limit,
        only=only,
    )
    if failures:
        raise typer.Exit(1)
    _ = (new, total)


@app.command()
def song(
    slug: Annotated[str, typer.Argument(help="Song slug.")],
    collection: Annotated[
        str,
        typer.Option(help="Collection the song belongs to."),
    ] = "hymns",
    out: Annotated[Path, typer.Option(help="Output directory.")] = Path("out"),
) -> None:
    """Scrape a single song. Writes to out/music/<collection>/songs/."""
    # Look up song_number/position from the collection index so the filename
    # prefix matches a full scrape.
    _, refs = scrape_index(collection)
    ref = next((r for r in refs if r.slug == slug), None)
    if ref is None:
        # Song isn't in the named collection — scrape it anyway with position 0.
        ref = SongRef(slug=slug, song_number="", position=0)
    songs_dir = _collection_dir(out, collection) / "songs"
    songs_dir.mkdir(parents=True, exist_ok=True)
    s = scrape_song(ref, collection)
    dest = songs_dir / _song_filename(ref)
    dest.write_text(json.dumps(_song_to_dict(s), indent=2, ensure_ascii=False))
    print(f"✓ {dest}", file=sys.stderr)


@app.command()
def index(
    collection: Annotated[
        str,
        typer.Argument(help="Collection slug (e.g. hymns, childrens-songbook)."),
    ] = "hymns",
    out: Annotated[Path, typer.Option(help="Output directory.")] = Path("out"),
) -> None:
    """Fetch only the collection index (no per-song pages)."""
    title, refs = scrape_index(collection)
    root = _collection_dir(out, collection)
    root.mkdir(parents=True, exist_ok=True)
    (root / "index.json").write_text(
        json.dumps(
            {
                "collection": collection,
                "title": title,
                "url": collection_url(collection),
                "songs": [asdict(r) for r in refs],
            },
            indent=2,
            ensure_ascii=False,
        )
    )
    print(f"✓ {root/'index.json'} ({len(refs)} songs)", file=sys.stderr)


def _main() -> None:
    """Entry point. Bare slug arg defaults to `scrape <slug>` for ergonomics."""
    argv = sys.argv[1:]
    known = {"scrape", "song", "index", "--help", "-h"}
    if argv and argv[0] not in known and not argv[0].startswith("-"):
        # Heuristic: bare collection slug -> default to scrape
        sys.argv.insert(1, "scrape")
    app()


if __name__ == "__main__":
    _main()
