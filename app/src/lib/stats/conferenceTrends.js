import { buildTalkMask } from '$lib/search/conference.js';

/**
 * @typedef {Object} TrendPoint
 * @property {string} key     unique identifier: "2020" or "2020-04"
 * @property {string} label   display text: "2020" or "2020 Apr"
 * @property {number} year
 * @property {number|null} month   null when granularity='year'
 */

/**
 * @typedef {Object} TrendSeries
 * @property {string} phrase
 * @property {number[]} counts    raw occurrence counts per bucket
 * @property {number[]} freq      count / wordsPerBucket * 10000 (per 10k words)
 * @property {number} total       sum of counts across the whole range
 */

/**
 * @typedef {Object} TrendResult
 * @property {TrendPoint[]} points
 * @property {TrendSeries[]} series
 * @property {number[]} wordTotals       per-bucket total word count (across filtered talks)
 * @property {number} talksConsidered
 * @property {'year'|'session'} granularity
 */

/**
 * Count phrase occurrences per bucket across filtered General Conference paragraphs.
 *
 * Two granularities:
 *   - 'year'    : one bucket per year (April + October aggregated)
 *   - 'session' : one bucket per (year, April/October)
 *
 * For each phrase we count every occurrence in a paragraph (not just whether
 * the paragraph contains it). Also tracks the total words per bucket so the
 * UI can normalize (`freq` = occurrences per 10 000 words).
 *
 * @param {import('$lib/data/conference.js').ConferenceTalk[]} talks
 * @param {Array<[number, string, string]>} paragraphs
 * @param {string[]} phrases
 * @param {Object} settings
 * @param {number} settings.yearFrom
 * @param {number} settings.yearTo
 * @param {boolean} settings.includeApril
 * @param {boolean} settings.includeOctober
 * @param {string[]} settings.selectedSpeakers   empty = all
 * @param {string[]} [settings.selectedCallings] empty = all (calling group ids)
 * @param {boolean} [settings.caseSensitive=false]
 * @param {boolean} [settings.useRegex=false]  when true, each phrase is a JS regex
 * @param {'year'|'session'} [settings.granularity='year']
 * @returns {TrendResult}
 */
export function computePhraseTrends(talks, paragraphs, phrases, settings) {
  const cleaned = (phrases || []).map((p) => (p || '').trim());
  const yearFrom = settings.yearFrom;
  const yearTo = settings.yearTo;
  const granularity = settings.granularity === 'session' ? 'session' : 'year';
  const useRegex = !!settings.useRegex;

  // Build bucket list respecting April/October toggles. For 'year', each year
  // is one bucket (included iff at least one of April/October is enabled);
  // for 'session', each enabled session in each year is its own bucket.
  //
  // Skip buckets that have no talks in the bundle — keeps future sessions
  // (e.g. 2026-10 before it happens) out of the chart. Auto-updates as soon
  // as new conferences are scraped and rebuilt.
  const availableSessions = new Set();
  const availableYears = new Set();
  for (let i = 0; i < talks.length; i++) {
    availableSessions.add(`${talks[i].y}-${talks[i].m}`);
    availableYears.add(talks[i].y);
  }

  const points = [];
  const keyToIdx = new Map();
  const includeAny = settings.includeApril || settings.includeOctober;
  for (let y = yearFrom; y <= yearTo; y++) {
    if (granularity === 'session') {
      if (settings.includeApril && availableSessions.has(`${y}-4`)) {
        const key = `${y}-04`;
        keyToIdx.set(key, points.length);
        points.push({ key, label: `${y} Apr`, year: y, month: 4 });
      }
      if (settings.includeOctober && availableSessions.has(`${y}-10`)) {
        const key = `${y}-10`;
        keyToIdx.set(key, points.length);
        points.push({ key, label: `${y} Oct`, year: y, month: 10 });
      }
    } else {
      if (!includeAny) continue;
      if (!availableYears.has(y)) continue;
      const key = String(y);
      keyToIdx.set(key, points.length);
      points.push({ key, label: String(y), year: y, month: null });
    }
  }

  const series = cleaned.map((p) => ({
    phrase: p,
    counts: new Array(points.length).fill(0),
    freq: new Array(points.length).fill(0),
    total: 0,
  }));
  const wordTotals = new Array(points.length).fill(0);

  if (!cleaned.some(Boolean) || !points.length) {
    return { points, series, wordTotals, granularity, talksConsidered: 0 };
  }

  const mask = buildTalkMask(talks, settings);
  const caseSensitive = !!settings.caseSensitive;
  const needles = cleaned.map((p) => (!p ? '' : caseSensitive ? p : p.toLowerCase()));

  // Compile regexes up front. Invalid patterns fall back to null so that
  // phrase's row just reports zero counts rather than crashing the chart.
  const regexes = useRegex
    ? cleaned.map((p) => {
        if (!p) return null;
        try {
          return new RegExp(p, caseSensitive ? 'g' : 'gi');
        } catch {
          return null;
        }
      })
    : null;

  let talksConsidered = 0;
  for (let i = 0; i < talks.length; i++) if (mask[i]) talksConsidered++;

  for (let i = 0; i < paragraphs.length; i++) {
    const row = paragraphs[i];
    const tIdx = row[0];
    if (!mask[tIdx]) continue;
    const talk = talks[tIdx];
    const key =
      granularity === 'session'
        ? `${talk.y}-${talk.m === 4 ? '04' : talk.m === 10 ? '10' : String(talk.m).padStart(2, '0')}`
        : String(talk.y);
    const bucket = keyToIdx.get(key);
    if (bucket === undefined) continue;
    const raw = row[2];

    // Word count: cheap whitespace split. Consistent across buckets so the
    // ratio is meaningful even if we're under-counting hyphenations.
    if (raw) {
      // Avoid allocating the array — count whitespace runs directly.
      let words = 0;
      let inWord = false;
      for (let c = 0; c < raw.length; c++) {
        const ch = raw.charCodeAt(c);
        const isSpace = ch === 32 || ch === 9 || ch === 10 || ch === 13 || ch === 160;
        if (isSpace) inWord = false;
        else if (!inWord) {
          words++;
          inWord = true;
        }
      }
      wordTotals[bucket] += words;
    }

    const hay = caseSensitive ? raw : raw.toLowerCase();

    for (let p = 0; p < needles.length; p++) {
      let count = 0;
      if (useRegex) {
        const re = regexes[p];
        if (!re) continue;
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(raw)) !== null) {
          count++;
          // Guard against zero-width matches (e.g. /a*/) causing infinite loops.
          if (m.index === re.lastIndex) re.lastIndex++;
        }
      } else {
        const needle = needles[p];
        if (!needle) continue;
        let pos = 0;
        const step = needle.length;
        while (true) {
          const next = hay.indexOf(needle, pos);
          if (next === -1) break;
          count++;
          pos = next + step;
        }
      }
      if (count) {
        series[p].counts[bucket] += count;
        series[p].total += count;
      }
    }
  }

  // Compute per-10k-words frequency after all counts are tallied.
  for (let p = 0; p < series.length; p++) {
    for (let i = 0; i < points.length; i++) {
      const w = wordTotals[i];
      series[p].freq[i] = w > 0 ? (series[p].counts[i] / w) * 10000 : 0;
    }
  }

  return { points, series, wordTotals, granularity, talksConsidered };
}
