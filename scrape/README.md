# churchofjesuschrist.org scrapers

[Scrapling](https://github.com/D4Vinci/Scrapling) pipelines that pull content
from churchofjesuschrist.org into structured JSON.

- `scrape_conference.py` — General Conference talks (one file per talk +
  conference index).
- `scrape_music.py` — hymns and other music collections from `/media/music/`
  via its public JSON API (one file per song + collection index).
- `scrape_music_study.py` — hymns from `/study/manual/hymns/`. Same hymn
  catalog as above but parsed from server-rendered HTML, which carries
  per-line anchors (`figure1_pN`) suitable for deep-linking individual
  verses.

## One-time setup

Requires [uv](https://docs.astral.sh/uv/).

```bash
cd scrape
uv sync
```

## Conference scraper

One conference:

```bash
uv run python scrape_conference.py 2026/04                   # full conference
uv run python scrape_conference.py 2026/04 --limit 2         # smoke test
uv run python scrape_conference.py 2026/04 --only 11oaks     # single talk
uv run python scrape_conference.py 2026/04 --skip-existing   # resume-friendly
```

Backfill every conference on the site (April + October of each year since
1971). By default any `out/YYYY-MM/` directory that already exists is left
alone — not even the index is re-fetched. That keeps a second invocation
strictly additive (it fills gaps, not re-visits years).

```bash
uv run python scrape_conference.py backfill
uv run python scrape_conference.py backfill --start 2000 --end 2010
uv run python scrape_conference.py backfill --months 04,10
```

Pass `--force` to re-enter years that already have a folder. Even with
`--force`, existing talk JSON files are never overwritten — the scraper still
passes `--skip-existing` internally, so partial conferences resume talk-by-talk
and fully-cached ones short-circuit with no network calls. If you want a true
re-scrape, `rm -rf out/<YYYY-MM>/` first.

```bash
uv run python scrape_conference.py backfill --force            # resume partials
rm -rf out/2000-04 && uv run python scrape_conference.py backfill --start 2000 --end 2000 --months 04
```

Flags:
- `--out DIR` — output root (default `./out`).
- `--limit N` / `--only SLUG` — scope a single-conference scrape.
- `--delay SEC` — sleep between talk fetches (default `0.5`).
- `--skip-existing` (scrape) — skip talks whose JSON already exists.
- `--start YYYY` / `--end YYYY` / `--months MM,MM` (backfill) — iteration range.
- `--conference-delay SEC` (backfill) — pause between conferences (default `1.0`).
- `--log PATH` (backfill) — per-conference log file (default
  `<out>/_backfill.log`; leading underscore keeps it sorted above the
  `YYYY-MM/` directories. Pass `/dev/null` to disable).
- `--force` (backfill) — process years whose `out/YYYY-MM/` already exists
  (resumes partials; never overwrites talk files).
- `--verbose` / `-v` (backfill) — log one line per talk (`SUCCESS`/`CACHED`)
  instead of the default one-line-per-conference summary. Per-talk `FAIL`
  lines are always logged regardless of verbosity.
- `--check` (backfill) — read-only audit mode. Fetches each conference index
  and compares expected talk count to on-disk files. Prints a status line per
  conference (`OK`, `PARTIAL`, `NOT_RUN`, `EMPTY`, `EXTRA`, `FAIL`). Nothing
  is written.

## Backfill log

`backfill` appends to a log file, wrapped in a run header/footer. The line
format is:

```
<ISO timestamp> <YYYY/MM> <STATUS> [<slug> <url>] [details]
```

`STATUS` values:

| Status       | Scope       | When                                                     |
|--------------|-------------|----------------------------------------------------------|
| `OK`         | conference  | Scraped normally; always logged (default)                |
| `EXISTS`     | conference  | Folder present, skipped (pass `--force` to re-enter)     |
| `CACHED`     | conference  | Fully cached by index check; no network                  |
| `FAIL_INDEX` | conference  | The conference index itself couldn't be fetched          |
| `FAIL`       | talk        | Fetch/parse raised; includes `err=<repr>`. Always logged |
| `SUCCESS`    | talk        | Written to disk. Only with `--verbose`                   |
| `CACHED`     | talk        | Skipped (already on disk). Only with `--verbose`         |

By default you get one summary line per conference plus one `FAIL` line per
talk that couldn't be fetched — e.g.:

```
=== backfill started 2026-04-22T07:30:00 start=1971 end=2026 months=04,10 force=False verbose=False out=out ===
2026-04-22T07:30:00 1969/04 FAIL_INDEX err=RuntimeError('... -> HTTP 404')
2026-04-22T07:30:12 1971/04 OK new=45/45 t=12.3s
2026-04-22T07:30:24 1971/10 OK new=44/44 t=11.8s
2026-04-22T07:30:24 1972/04 FAIL some-slug https://... err=RuntimeError('... -> HTTP 503')
2026-04-22T07:30:36 1972/04 OK new=40/41 fail=1 t=12.1s
=== backfill finished 2026-04-22T08:00:00 total=30m00s scraped=110 cached=2 failed=5 talk_failures=1 ===
```

With `--verbose`, every talk gets its own `SUCCESS`/`CACHED` line (useful for
debugging gaps, noisier in normal operation). Talk failures always log
regardless of verbosity. A single talk failure no longer aborts its conference
— the scraper logs `FAIL` for that slug and keeps going. Index-fetch failures
(e.g. pre-1971) still count as conference-level `FAIL_INDEX`.

Handy greps:

```bash
grep ' FAIL '       out/_backfill.log     # talk-level failures
grep ' FAIL_INDEX ' out/_backfill.log     # conference-level failures
grep ' OK '         out/_backfill.log | wc -l
```

The log is append-only — `tail -f out/_backfill.log` is safe while a backfill
runs, and rerunning stacks a fresh header after the previous run.

## Audit (--check)

Before or after a run, `backfill --check` fetches each conference index and
compares expected talk count against on-disk files. No network is used for
talk pages, nothing is written. Output goes to stdout:

```
$ uv run python scrape_conference.py backfill --check --start 1971 --end 1973
conference  status     disk / expected  note
---------------------------------------------------------------
1971/04     OK           45 /       45
1971/10     OK           44 /       44
1972/04     PARTIAL      20 /       41
1972/10     NOT_RUN       0 /       42
1973/04     OK           41 /       41
1973/10     OK           41 /       41
summary: NOT_RUN=1 OK=4 PARTIAL=1 total=6
```

| Status    | Meaning                                                          |
|-----------|------------------------------------------------------------------|
| `OK`      | on-disk count equals index count                                 |
| `PARTIAL` | some talks present, not all                                      |
| `EMPTY`   | folder exists but no talk JSONs                                  |
| `NOT_RUN` | no folder at all                                                 |
| `EXTRA`   | more files on disk than the live index lists (stale data)        |
| `FAIL`    | index fetch errored (e.g. pre-1971 404)                          |

## Output

```
out/2026-04/
├── index.json                   # conference metadata + ordered talk list
└── talks/
    ├── 01-11oaks.json           # filename prefix = conference_position
    ├── 02-12christofferson.json
    └── ...
```

Filenames are prefixed with the talk's 1-indexed position in the conference so
a plain `ls` sorts chronologically.

Per-talk JSON shape:

```json
{
  "url": "https://www.churchofjesuschrist.org/...",
  "slug": "11oaks",
  "conference": "2026/04",
  "session": "Saturday Morning Session",
  "session_number": 1,
  "session_position": 1,
  "conference_position": 1,
  "title": "Introduction",
  "speaker": "Dallin H. Oaks",
  "speaker_role": "President of The Church of Jesus Christ of Latter-day Saints",
  "kicker": "The conference we convene today is different...",
  "paragraphs": [
    {"id": "p_fvoG6", "aid": "171130159", "text": "My dear brothers and sisters..."}
  ],
  "notes": [
    {
      "marker": "1.",
      "text": "3 Nephi 15:9.",
      "refs": [{"text": "3 Nephi 15:9", "href": "https://.../3-ne/15?lang=eng&id=p9#p9"}]
    }
  ]
}
```

Position fields:
- `session_number` — 1-indexed ordinal of the session within the conference
  (e.g. Saturday Morning = 1, Saturday Afternoon = 2; older conferences ran
  Friday→Sunday and can have up to 7).
- `session_position` — 1-indexed position of the talk within its session.
- `conference_position` — 1-indexed absolute position across the conference;
  also the numeric prefix on the talk's filename.

## Selector notes

Class names from the React build include hashed suffixes (e.g. `item-U_5Ca`)
that change on redeploys. The scraper avoids those and relies on stable
attributes:

- **Index page** — anchor `href` patterns (`/study/general-conference/YYYY/MM/Ntalker`
  for talks, `...-session?lang=eng` for session headers).
- **Talk page** — `div.body-block`, `h1`, `p.author-name`, `p.author-role`,
  `p.kicker`, `footer.notes` — these class names are not hashed in the current
  build. If the site ever renames them, update the selectors in
  `scrape_conference.py` rather than adding fallbacks.

## Music scraper

`scrape_music.py` pulls hymns and other music collections (e.g.
`childrens-songbook`) from `/media/music/collections/<slug>`. The site is
React-rendered, but the page's data layer is a public JSON endpoint:

```
https://www.churchofjesuschrist.org/media/music/api?type=songBookData&lang=eng&identifier=<collection>
https://www.churchofjesuschrist.org/media/music/api?type=song&lang=eng&identifier=<song-slug>
```

So the scraper is a thin wrapper over those — no HTML parsing, no
JavaScript. Verses and credits arrive as small HTML snippets (`<p>`, `<br>`,
`<i>`) which we flatten to plain text with newlines.

```bash
uv run python scrape_music.py scrape                              # full hymns collection (341 songs)
uv run python scrape_music.py scrape --limit 2                    # smoke test
uv run python scrape_music.py scrape --only he-died-the-great-redeemer-died
uv run python scrape_music.py scrape --skip-existing              # resume-friendly
uv run python scrape_music.py scrape childrens-songbook           # different collection
uv run python scrape_music.py hymns --limit 5                     # bare slug shorthand
uv run python scrape_music.py song the-morning-breaks             # single song, no full index walk
uv run python scrape_music.py index                               # write index.json only
```

Flags (mirror the conference scraper where they overlap):

- `--out DIR` — output root (default `./out`; songs land under `out/music/<collection>/`).
- `--limit N` / `--only SLUG` — scope a single-collection scrape.
- `--delay SEC` — sleep between song fetches (default `0.5`).
- `--skip-existing` — skip songs whose JSON already exists.

### Output

```
out/music/hymns/
├── index.json                            # collection metadata + ordered song list
└── songs/
    ├── 001-the-morning-breaks.json       # filename prefix = zero-padded songNumber
    ├── 002-the-spirit-of-god.json
    └── ...
```

Per-song JSON shape:

```json
{
  "url": "https://www.churchofjesuschrist.org/media/music/songs/he-died-the-great-redeemer-died?lang=eng",
  "slug": "he-died-the-great-redeemer-died",
  "collection": "hymns",
  "song_number": "192",
  "position": 192,
  "title": "He Died! The Great Redeemer Died",
  "description": "“He Died! The Great Redeemer Died” from Hymns (English).",
  "credits": "Text: Isaac Watts, 1674–1748, alt\nMusic: George Careless, 1839–1932",
  "verses": [
    {"number": 1, "type": "Verse", "text": "He died! The great Redeemer died,\nAnd Israel’s daughters wept around.\n..."}
  ],
  "scriptures": [
    {"text": "Matthew 27:35, 45, 51", "href": "https://.../scriptures/nt/matt/27?id=p35,p45,p51#p35"}
  ],
  "tunes": [
    {"name": "Offering", "alternate_titles": []}
  ],
  "assets": [
    {"type": "AUDIO_ACCOMPANIMENT", "url": "https://.../he_died_..._accompaniment_eng.mp3", "duration_ms": 184000},
    {"type": "MIDI", "url": "...", "duration_ms": 0},
    {"type": "PDF",  "url": "...", "duration_ms": 0}
  ]
}
```

Notes:

- `verses` preserves the order returned by the API. Hymns with refrains
  interleave `Chorus` entries (`verseNumber: 0`, `verseType: "Chorus"`)
  between the numbered verses — that's the source-of-truth structure.
- `song_number` is a string because some collections use non-numeric IDs in
  the future-proofing slot. The filename prefix uses zero-padded numeric
  values (`001-`, `192-`); non-numeric numbers fall back to position
  (`p001-`).
- `assets` includes whatever the API returns — MP3, MIDI, MXL, PDF, mobile
  PDF, etc. `duration_ms` is non-zero only for audio assets.

## Hymns (study version)

`scrape_music_study.py` pulls the same 341 hymns from
`/study/manual/hymns/<slug>` instead of `/media/music/`. The pages are
server-rendered HTML and — crucially — every line of every verse has a stable
anchor id of the form `figure1_pN`:

```html
<p class="line" id="figure1_p2"><span class="verse-number">1. </span>The morning breaks…</p>
```

That makes each verse deep-linkable, e.g.
`/study/manual/hymns/the-morning-breaks?lang=eng&id=figure1_p2#figure1_p2`.
The scraper records every line individually (`id` + `data-aid` + `text`,
mirroring the conference scraper's paragraphs) and groups them into verses
and choruses. Each verse exposes its first marker as the deep-link anchor:

- For a regular stanza, the marker is the first line's id.
- For a chorus (which has its own `<p class="label">[Chorus]</p>`), the
  marker is the label's id, so a click lands on the `[Chorus]` heading.

```bash
uv run python scrape_music_study.py scrape                           # all 341 hymns
uv run python scrape_music_study.py scrape --limit 2                 # smoke test
uv run python scrape_music_study.py scrape --only the-morning-breaks
uv run python scrape_music_study.py scrape --skip-existing           # resume-friendly
uv run python scrape_music_study.py the-morning-breaks               # bare slug shorthand → song
uv run python scrape_music_study.py index                            # write index.json only
```

Flags: `--out`, `--limit`, `--only`, `--delay`, `--skip-existing` (same
semantics as the other scrapers).

### Output

```
out/music/hymns-study/
├── index.json
└── songs/
    ├── 001-the-morning-breaks.json
    └── ...
```

Per-hymn JSON shape:

```json
{
  "url": "https://www.churchofjesuschrist.org/study/manual/hymns/the-morning-breaks?lang=eng",
  "slug": "the-morning-breaks",
  "collection": "hymns-study",
  "song_number": "1",
  "position": 1,
  "title": "The Morning Breaks",
  "tempo": "Triumphantly",
  "verses": [
    {
      "number": 1,
      "type": "Verse",
      "label": null,
      "marker": "figure1_p2",
      "url": "https://www.churchofjesuschrist.org/study/manual/hymns/the-morning-breaks?lang=eng&id=figure1_p2#figure1_p2",
      "lines": [
        {"id": "figure1_p2", "aid": "128081102", "text": "The morning breaks, the shadows flee;"}
      ],
      "text": "The morning breaks, the shadows flee;\nLo, Zion's standard is unfurled!\n…"
    }
  ],
  "credits": "Text: Parley P. Pratt, 1807–1857\nMusic: George Careless, 1839–1932",
  "scriptures": [
    {"text": "Isaiah 60:1–3", "href": "https://.../study/scriptures/ot/isa/60?lang=eng&id=p1-p3#p1"}
  ]
}
```

Notes:

- Choruses are interleaved with their surrounding verses in the order they
  appear on the page (`type: "Chorus"`, `number: 0`, `label: "[Chorus]"`).
- The verse-number prefix (`"1. "`) is stripped from the line text — it lives
  in `verses[].number` instead.
- `verses[].url` is what the app should link to when surfacing a hit; it
  matches the share-link format the live site uses.
