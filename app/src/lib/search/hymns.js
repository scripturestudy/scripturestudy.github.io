import { parseQuery } from './query.js';
import { matchText } from './engine.js';
import { shuffleArray } from '$lib/utils/text.js';

/**
 * @typedef {Object} HymnsSearchSettings
 * @property {string}  term
 * @property {boolean} useRegex
 * @property {boolean} caseSensitive
 * @property {boolean} includeChoruses
 * @property {'number-asc'|'number-desc'|'title-asc'|'shuffle'} sortMode
 */

/**
 * @typedef {Object} HymnsHit
 * @property {number} hymnIdx
 * @property {number} verseNumber  0 for chorus
 * @property {'V'|'C'} kind
 * @property {string} marker        e.g. "figure1_p2"
 * @property {string} text          \n-joined lyric lines
 * @property {import('$lib/data/hymns.js').Hymn} hymn
 */

/**
 * @typedef {Object} HymnsSearchResult
 * @property {HymnsHit[]} hits
 * @property {Map<number, HymnsHit[]>} byHymn
 * @property {number[]} hymnOrder
 * @property {number} total
 * @property {boolean} overLimit
 * @property {string} status
 * @property {'empty'|'phrase'|'regex'|'auto-and'|'auto-or'} rankingMode
 * @property {string} highlightPattern
 * @property {boolean} highlightUseRegex
 * @property {{ field: 'term', message: string }|null} error
 */

/**
 * Pure search over all hymn verses. Each verse is one hit.
 *
 * @param {import('$lib/data/hymns.js').Hymn[]} hymns
 * @param {Array<[number, number, 'V'|'C', string, string]>} verses
 * @param {HymnsSearchSettings} settings
 * @param {number} limit
 * @returns {HymnsSearchResult}
 */
export function runHymnsSearch(hymns, verses, settings, limit) {
  const parsed = parseQuery({
    term: settings.term,
    useRegex: settings.useRegex,
    caseSensitive: settings.caseSensitive,
  });
  if (parsed.error) {
    return emptyResult({ error: { field: 'term', message: parsed.error } });
  }

  const hits = [];
  let overLimit = false;

  const caseSensitive = settings.caseSensitive;
  const emptyQuery = parsed.mode === 'empty';
  const includeChoruses = settings.includeChoruses !== false;

  for (let i = 0; i < verses.length; i++) {
    const row = verses[i];
    const kind = row[2];
    if (kind === 'C' && !includeChoruses) continue;
    const text = row[4];

    if (!emptyQuery && !matchText(text, parsed, caseSensitive)) continue;

    if (hits.length >= limit) {
      overLimit = true;
      break;
    }

    hits.push({
      hymnIdx: row[0],
      verseNumber: row[1],
      kind,
      marker: row[3],
      text,
      hymn: hymns[row[0]],
    });
  }

  const byHymn = new Map();
  const hymnOrder = [];
  for (const h of hits) {
    let bucket = byHymn.get(h.hymnIdx);
    if (!bucket) {
      bucket = [];
      byHymn.set(h.hymnIdx, bucket);
      hymnOrder.push(h.hymnIdx);
    }
    bucket.push(h);
  }

  sortHymnOrder(hymnOrder, hymns, settings.sortMode);

  return {
    hits,
    byHymn,
    hymnOrder,
    total: hits.length,
    overLimit,
    status: composeStatus(settings, parsed, hits.length, overLimit, hymnOrder.length),
    rankingMode: parsed.mode,
    highlightPattern: parsed.highlightSource,
    highlightUseRegex: parsed.mode !== 'phrase' && parsed.mode !== 'empty',
    error: null,
  };
}

function sortHymnOrder(order, hymns, mode) {
  if (order.length < 2) return;
  if (mode === 'shuffle') {
    const shuffled = shuffleArray(order);
    for (let i = 0; i < order.length; i++) order[i] = shuffled[i];
    return;
  }
  if (mode === 'title-asc') {
    order.sort((a, b) => (hymns[a].t || '').localeCompare(hymns[b].t || ''));
    return;
  }
  // 'number-asc' (default) or 'number-desc'
  const dir = mode === 'number-desc' ? -1 : 1;
  order.sort((a, b) => {
    const na = Number(hymns[a].sn) || 0;
    const nb = Number(hymns[b].sn) || 0;
    return (na - nb) * dir;
  });
}

function composeStatus(settings, parsed, total, overLimit, hymnsMatched) {
  const term = settings.term.trim();
  const parts = [];
  if (term) {
    parts.push(`Searching hymns for "${term}"`);
    if (parsed.mode === 'regex') {
      parts.push('using regex');
    } else if (parsed.mode === 'auto-and') {
      parts.push(`as ${parsed.terms.length} AND-joined phrases`);
    } else if (parsed.mode === 'auto-or') {
      parts.push(`as ${parsed.terms.length} OR-joined phrases`);
    } else {
      parts.push('as exact phrase');
    }
    parts.push(settings.caseSensitive ? '(case-sensitive)' : '(case-insensitive)');
  } else {
    parts.push('Showing all hymn verses');
  }
  if (settings.includeChoruses === false) parts.push('verses only');
  const suffix = overLimit
    ? `${total}+ verses (limit reached)`
    : `${total} verse${total === 1 ? '' : 's'} in ${hymnsMatched} hymn${hymnsMatched === 1 ? '' : 's'}`;
  return parts.join(', ') + '. ' + suffix + '.';
}

function emptyResult({ error = null, status = '' } = {}) {
  return {
    hits: [],
    byHymn: new Map(),
    hymnOrder: [],
    total: 0,
    overLimit: false,
    status,
    rankingMode: 'empty',
    highlightPattern: '',
    highlightUseRegex: false,
    error,
  };
}
