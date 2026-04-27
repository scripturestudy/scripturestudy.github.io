/**
 * Build a single consolidated JSON bundle for the hymns from
 * /study/manual/hymns/ (i.e. scrape_music_study.py output).
 *
 * Reads scrape/out/music/hymns-study/songs/*.json and writes
 * assets/hymns.json:
 *
 *   {
 *     hymns: [{ sl, sn, t, tp, cr, u, mu }, ...],
 *     // [hymnIdx, verseNumber, verseType('V'|'C'), marker, text]
 *     verses: [[idx, n, k, m, txt], ...],
 *     meta: { totalHymns, totalVerses, built }
 *   }
 *
 * Choruses that share the same text within a hymn are deduped (keep first).
 * Refrains read identically every time, so showing a card per chorus repeat
 * adds noise. The first chorus's marker is kept as the deep-link anchor.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const songsDir = path.join(root, 'scrape', 'out', 'music', 'hymns-study', 'songs');
const outPath = path.join(root, 'assets', 'hymns.json');

function mediaUrl(slug) {
  return `https://www.churchofjesuschrist.org/media/music/songs/${slug}?lang=eng`;
}

function build() {
  if (!fs.existsSync(songsDir)) {
    throw new Error(`hymns scrape directory missing: ${songsDir}`);
  }
  const files = fs
    .readdirSync(songsDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  const hymns = [];
  const verses = [];

  for (const f of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(songsDir, f), 'utf8'));
    const idx = hymns.length;
    hymns.push({
      sl: raw.slug || '',
      sn: raw.song_number || '',
      t: raw.title || '',
      tp: raw.tempo || '',
      cr: raw.credits || '',
      u: raw.url || '',
      mu: mediaUrl(raw.slug || ''),
    });

    const seenChorus = new Set();
    for (const v of raw.verses || []) {
      const text = (v.text || '').trim();
      if (!text) continue;
      const isChorus = v.type === 'Chorus';
      if (isChorus) {
        if (seenChorus.has(text)) continue;
        seenChorus.add(text);
      }
      verses.push([
        idx,
        v.number || 0,
        isChorus ? 'C' : 'V',
        v.marker || '',
        text,
      ]);
    }
  }

  return {
    hymns,
    verses,
    meta: {
      totalHymns: hymns.length,
      totalVerses: verses.length,
      built: new Date().toISOString(),
    },
  };
}

const bundle = build();
fs.writeFileSync(outPath, JSON.stringify(bundle));
const size = fs.statSync(outPath).size;
console.log(
  `wrote ${path.relative(root, outPath)}: ${bundle.hymns.length} hymns, ` +
    `${bundle.verses.length} verses, ${(size / 1024).toFixed(1)} KB`,
);
