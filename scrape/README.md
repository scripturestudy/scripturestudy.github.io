# General Conference scraper

[Scrapling](https://github.com/D4Vinci/Scrapling) pipeline that pulls General
Conference talks from churchofjesuschrist.org into structured JSON — one file
per talk plus a conference index.

## One-time setup

Requires [uv](https://docs.astral.sh/uv/).

```bash
cd scrape
uv sync
```

## Run

One conference:

```bash
uv run python scrape_conference.py 2026/04                   # full conference
uv run python scrape_conference.py 2026/04 --limit 2         # smoke test
uv run python scrape_conference.py 2026/04 --only 11oaks     # single talk
uv run python scrape_conference.py 2026/04 --skip-existing   # resume-friendly
```

Backfill every conference on the site (April + October of each year since
1971). Safe to re-run — conferences whose `index.json` plus every listed talk
are already on disk are skipped without hitting the network. Partially-scraped
conferences resume talk-by-talk.

```bash
uv run python scrape_conference.py backfill
uv run python scrape_conference.py backfill --start 2000 --end 2010
uv run python scrape_conference.py backfill --months 04,10
```

Flags:
- `--out DIR` — output root (default `./out`).
- `--limit N` / `--only SLUG` — scope a single-conference scrape.
- `--delay SEC` — sleep between talk fetches (default `0.5`).
- `--skip-existing` (scrape) — skip talks whose JSON already exists.
- `--start YYYY` / `--end YYYY` / `--months MM,MM` (backfill) — iteration range.
- `--conference-delay SEC` (backfill) — pause between conferences (default `1.0`).

## Output

```
out/2026-04/
├── index.json              # conference metadata + talk list
└── talks/
    ├── 11oaks.json
    ├── 12christofferson.json
    └── ...
```

Per-talk JSON shape:

```json
{
  "url": "https://www.churchofjesuschrist.org/...",
  "slug": "11oaks",
  "conference": "2026/04",
  "session": "Saturday Morning Session",
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
