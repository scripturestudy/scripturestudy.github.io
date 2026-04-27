/**
 * Build a single consolidated JSON file for all General Conference talks.
 *
 * Reads scrape/out/YYYY-MM/talks/*.json and writes assets/conference.json
 * as a compact structure:
 *
 *   {
 *     talks:      [{ y, m, sn, s, sp, r, t, sl, k, cp, u }, ...],
 *     paragraphs: [[talkIdx, paraId, text], ...]
 *   }
 *
 * Field names are shortened to keep the file small; 147k paragraphs + 4k
 * talks compress to roughly ~50MB raw / ~12MB gzipped.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const scrapeOut = path.join(root, 'scrape', 'out');
const outPath = path.join(root, 'assets', 'conference.json');

function readConferences() {
  const conferences = [];
  for (const name of fs.readdirSync(scrapeOut).sort()) {
    if (name.startsWith('_') || name.startsWith('.')) continue;
    const m = /^(\d{4})-(\d{2})$/.exec(name);
    if (!m) continue;
    const talksDir = path.join(scrapeOut, name, 'talks');
    if (!fs.existsSync(talksDir)) continue;
    conferences.push({ year: Number(m[1]), month: Number(m[2]), dir: talksDir });
  }
  return conferences;
}

function buildBundle() {
  const talks = [];
  const paragraphs = [];
  const speakerSet = new Set();
  let minYear = Infinity;
  let maxYear = -Infinity;

  for (const conf of readConferences()) {
    const files = fs.readdirSync(conf.dir).filter((f) => f.endsWith('.json')).sort();
    for (const f of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(conf.dir, f), 'utf8'));
      const talkIdx = talks.length;
      talks.push({
        y: conf.year,
        m: conf.month,
        sn: raw.session_number ?? null,
        s: raw.session || '',
        sp: raw.speaker || '',
        r: raw.speaker_role || '',
        t: raw.title || '',
        sl: raw.slug || '',
        k: raw.kicker || '',
        cp: raw.conference_position ?? null,
        u: raw.url || '',
      });
      speakerSet.add(raw.speaker || '');
      if (conf.year < minYear) minYear = conf.year;
      if (conf.year > maxYear) maxYear = conf.year;
      for (const p of raw.paragraphs || []) {
        const text = (p.text || '').trim();
        if (!text) continue;
        paragraphs.push([talkIdx, p.id || '', text]);
      }
    }
  }

  return {
    talks,
    paragraphs,
    meta: {
      minYear,
      maxYear,
      speakers: Array.from(speakerSet).filter(Boolean).sort(),
      built: new Date().toISOString(),
    },
  };
}

const bundle = buildBundle();
fs.writeFileSync(outPath, JSON.stringify(bundle));
const size = fs.statSync(outPath).size;
console.log(
  `wrote ${path.relative(root, outPath)}: ${bundle.talks.length} talks, ` +
    `${bundle.paragraphs.length} paragraphs, ${(size / 1024 / 1024).toFixed(1)} MB`,
);
