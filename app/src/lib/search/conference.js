import { parseQuery } from './query.js';
import { matchText } from './engine.js';
import { shuffleArray } from '$lib/utils/text.js';
import { roleMatchesCallings } from '$lib/constants/callings.js';

/**
 * @typedef {Object} ConferenceSearchSettings
 * @property {string}  term
 * @property {boolean} useRegex
 * @property {boolean} caseSensitive
 * @property {number}  yearFrom      inclusive
 * @property {number}  yearTo        inclusive
 * @property {boolean} includeApril
 * @property {boolean} includeOctober
 * @property {string[]} selectedSpeakers  empty = all speakers
 * @property {string[]} [selectedCallings] empty = all callings (group ids from constants/callings.js)
 * @property {'year-desc'|'year-asc'|'shuffle'} sortMode
 */

/**
 * @typedef {Object} ConferenceHit
 * @property {number} talkIdx
 * @property {string} paraId
 * @property {string} text
 * @property {import('$lib/data/conference.js').ConferenceTalk} talk
 */

/**
 * @typedef {Object} ConferenceSearchResult
 * @property {ConferenceHit[]} hits
 * @property {Map<number, ConferenceHit[]>} byTalk   talkIdx -> hits (insertion order preserved)
 * @property {number[]} talkOrder                    talkIdx in the order they first appear
 * @property {number} total
 * @property {boolean} overLimit
 * @property {string} status
 * @property {'empty'|'phrase'|'regex'|'auto-and'|'auto-or'} rankingMode
 * @property {string} highlightPattern
 * @property {boolean} highlightUseRegex
 * @property {{ field: 'term', message: string }|null} error
 */

/**
 * Pure search over all conference paragraphs.
 *
 * Two-phase:
 *   1. Pre-compute a Uint8Array talkMask from talk-level filters (year range,
 *      April/October, speaker) so the hot paragraph loop only checks an index.
 *   2. Walk paragraphs, apply query, collect up to `limit` hits.
 *
 * An empty query returns every paragraph that passes the talk mask (capped).
 *
 * @param {import('$lib/data/conference.js').ConferenceTalk[]} talks
 * @param {Array<[number, string, string]>} paragraphs
 * @param {ConferenceSearchSettings} settings
 * @param {number} limit  stop collecting once hits > limit (we report `overLimit`)
 * @returns {ConferenceSearchResult}
 */
export function runConferenceSearch(talks, paragraphs, settings, limit) {
  const parsed = parseQuery({
    term: settings.term,
    useRegex: settings.useRegex,
    caseSensitive: settings.caseSensitive,
  });
  if (parsed.error) {
    return emptyResult({ error: { field: 'term', message: parsed.error } });
  }

  const talkMask = buildTalkMask(talks, settings);
  const hits = [];
  let overLimit = false;

  const caseSensitive = settings.caseSensitive;
  const emptyQuery = parsed.mode === 'empty';

  for (let i = 0; i < paragraphs.length; i++) {
    const row = paragraphs[i];
    const tIdx = row[0];
    if (!talkMask[tIdx]) continue;
    const text = row[2];

    if (!emptyQuery && !matchText(text, parsed, caseSensitive)) continue;

    if (hits.length >= limit) {
      overLimit = true;
      break;
    }

    hits.push({
      talkIdx: tIdx,
      paraId: row[1],
      text,
      talk: talks[tIdx],
    });
  }

  // Group by talk so the UI can render talk-headers with matched paragraphs.
  const byTalk = new Map();
  const talkOrder = [];
  for (const h of hits) {
    let bucket = byTalk.get(h.talkIdx);
    if (!bucket) {
      bucket = [];
      byTalk.set(h.talkIdx, bucket);
      talkOrder.push(h.talkIdx);
    }
    bucket.push(h);
  }

  sortTalkOrder(talkOrder, talks, settings.sortMode);

  return {
    hits,
    byTalk,
    talkOrder,
    total: hits.length,
    overLimit,
    status: composeStatus(settings, parsed, hits.length, overLimit, talkOrder.length),
    rankingMode: parsed.mode,
    highlightPattern: parsed.highlightSource,
    highlightUseRegex: parsed.mode !== 'phrase' && parsed.mode !== 'empty',
    error: null,
  };
}

function sortTalkOrder(order, talks, mode) {
  if (order.length < 2) return;
  if (mode === 'shuffle') {
    const shuffled = shuffleArray(order);
    for (let i = 0; i < order.length; i++) order[i] = shuffled[i];
    return;
  }
  const dir = mode === 'year-asc' ? 1 : -1;
  order.sort((ai, bi) => {
    const a = talks[ai];
    const b = talks[bi];
    if (a.y !== b.y) return (a.y - b.y) * dir;
    if (a.m !== b.m) return (a.m - b.m) * dir;
    const asn = a.sn ?? 0;
    const bsn = b.sn ?? 0;
    if (asn !== bsn) return (asn - bsn) * dir;
    return (ai - bi) * dir;
  });
}

/**
 * Build a per-talk boolean mask of which talks pass the non-text filters.
 * Returns a Uint8Array for branch-free integer-index reads in the hot loop.
 */
export function buildTalkMask(talks, settings) {
  const mask = new Uint8Array(talks.length);
  const speakerSet = settings.selectedSpeakers && settings.selectedSpeakers.length
    ? new Set(settings.selectedSpeakers)
    : null;
  const callings = settings.selectedCallings && settings.selectedCallings.length
    ? settings.selectedCallings
    : null;
  for (let i = 0; i < talks.length; i++) {
    const t = talks[i];
    if (t.y < settings.yearFrom || t.y > settings.yearTo) continue;
    if (t.m === 4 && !settings.includeApril) continue;
    if (t.m === 10 && !settings.includeOctober) continue;
    if (speakerSet && !speakerSet.has(t.sp)) continue;
    if (callings && !roleMatchesCallings(t.r, callings)) continue;
    mask[i] = 1;
  }
  return mask;
}

function composeStatus(settings, parsed, total, overLimit, talksMatched) {
  const term = settings.term.trim();
  const parts = [];
  if (term) {
    parts.push(`Searching conference talks for "${term}"`);
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
    parts.push('Showing conference paragraphs');
  }
  parts.push(`${settings.yearFrom}–${settings.yearTo}`);
  const seasons = [];
  if (settings.includeApril) seasons.push('April');
  if (settings.includeOctober) seasons.push('October');
  parts.push(seasons.length === 2 ? 'both sessions' : seasons.join(', ') || 'no sessions');
  if (settings.selectedSpeakers && settings.selectedSpeakers.length) {
    parts.push(`${settings.selectedSpeakers.length} speaker${settings.selectedSpeakers.length > 1 ? 's' : ''}`);
  }
  if (settings.selectedCallings && settings.selectedCallings.length) {
    parts.push(`${settings.selectedCallings.length} calling${settings.selectedCallings.length > 1 ? 's' : ''}`);
  }
  const suffix = overLimit
    ? `${total}+ paragraphs (limit reached)`
    : `${total} paragraph${total === 1 ? '' : 's'} in ${talksMatched} talk${talksMatched === 1 ? '' : 's'}`;
  return parts.join(', ') + '. ' + suffix + '.';
}

function emptyResult({ error = null, status = '' } = {}) {
  return {
    hits: [],
    byTalk: new Map(),
    talkOrder: [],
    total: 0,
    overLimit: false,
    status,
    rankingMode: 'empty',
    highlightPattern: '',
    highlightUseRegex: false,
    error,
  };
}
