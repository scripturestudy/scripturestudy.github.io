import { parseQuery } from './query.js';
import { buildVerseTitleRegex } from './verseTitle.js';
import { shuffleArray } from '$lib/utils/text.js';
import { compareVersesCanonical } from '$lib/constants/bookOrder.js';
import { SEMANTIC_TOP_K } from '$lib/constants/limits.js';

/**
 * @typedef {Object} SearchSettings
 * @property {string}   term
 * @property {string}   verseTitleFilter
 * @property {boolean}  useRegex
 * @property {boolean}  caseSensitive
 * @property {string[]} selectedVolumes
 * @property {'canonical'|'reverse'|'shuffle'} sortMode
 * @property {boolean}  semantic          // semantic hybrid mode
 * @property {number}   semanticAlpha     // 0..1 weight of semantic score
 * @property {Float32Array|null} semanticScores  // index-aligned with full verse array
 * @property {string[]} allVolumes        // for status line (all-vs-selected)
 */

/**
 * @typedef {Object} SearchResult
 * @property {Array} results
 * @property {string} status
 * @property {boolean} wasAutoConverted
 * @property {'empty'|'phrase'|'regex'|'auto-and'|'auto-or'|'semantic-hybrid'} rankingMode
 * @property {string} highlightPattern        regex source for HighlightedText
 * @property {boolean} highlightUseRegex      true when highlightPattern should be treated as regex
 * @property {{ field: 'term'|'verseTitle', message: string }|null} error
 */

/**
 * Pure search function.
 *
 * @param {Array} data
 * @param {SearchSettings} settings
 * @returns {SearchResult}
 */
export function runSearch(data, settings) {
  const parsed = parseQuery({
    term: settings.term,
    useRegex: settings.useRegex,
    caseSensitive: settings.caseSensitive,
  });
  if (parsed.error) {
    return emptyResult({ error: { field: 'term', message: parsed.error } });
  }

  const title = buildVerseTitleRegex(settings.verseTitleFilter);
  if (title.error) {
    return emptyResult({ error: { field: 'verseTitle', message: title.error } });
  }

  if (!settings.selectedVolumes.length) {
    return emptyResult({ status: 'Please select at least one volume to search.' });
  }

  const volumeSet = new Set(settings.selectedVolumes);
  const pool = data.filter((v) => v && typeof v.volume_title === 'string' && volumeSet.has(v.volume_title));

  let results;
  let rankingMode;

  const semanticActive = settings.semantic && settings.semanticScores && parsed.mode !== 'empty';
  if (semanticActive) {
    results = hybridRescore(pool, settings.semanticScores, settings.semanticAlpha, (text) =>
      matchText(text, parsed, settings.caseSensitive),
    );
    if (title.regex) results = results.filter((v) => title.regex.test(v.verse_title || ''));
    results = results.slice(0, SEMANTIC_TOP_K);
    rankingMode = 'semantic-hybrid';
  } else {
    results = pool;
    if (parsed.mode !== 'empty') {
      results = results.filter((v) => matchText(v.scripture_text || '', parsed, settings.caseSensitive));
    }
    if (title.regex) results = results.filter((v) => title.regex.test(v.verse_title || ''));
    rankingMode = parsed.mode;
  }

  if (!semanticActive && results.length > 0) {
    if (settings.sortMode === 'shuffle') {
      results = shuffleArray(results);
    } else if (settings.sortMode === 'reverse') {
      results = results.slice().sort((a, b) => compareVersesCanonical(b, a));
    } else {
      results = results.slice().sort(compareVersesCanonical);
    }
  }

  return {
    results,
    status: composeStatus(settings, parsed, rankingMode),
    wasAutoConverted: parsed.wasAutoConverted,
    rankingMode,
    highlightPattern: parsed.highlightSource,
    highlightUseRegex: parsed.mode !== 'phrase' && parsed.mode !== 'empty',
    error: null,
  };
}

/** Hybrid rescore: (1-α)·kw + α·sem. sem is cosine shifted from [-1,1] to [0,1]. */
function hybridRescore(pool, scores, alpha, kwMatch) {
  const out = new Array(pool.length);
  for (let i = 0; i < pool.length; i++) {
    const v = pool[i];
    const idx = v.__idx;
    const sem = idx != null && idx < scores.length ? (scores[idx] + 1) * 0.5 : 0;
    const kw = kwMatch(v.scripture_text || '') ? 1 : 0;
    out[i] = { v, fused: (1 - alpha) * kw + alpha * sem };
  }
  out.sort((a, b) => b.fused - a.fused);
  return out.map((s) => s.v);
}

/**
 * Test whether `text` satisfies the parsed query. Cheap path uses
 * `String.prototype.includes` (case-folded once); only explicit-regex mode
 * pays for the RegExp engine.
 */
export function matchText(text, parsed, caseSensitive) {
  if (!text) return false;
  if (parsed.mode === 'regex') {
    if (!parsed.regex) return false;
    parsed.regex.lastIndex = 0;
    const ok = parsed.regex.test(text);
    parsed.regex.lastIndex = 0;
    return ok;
  }
  if (parsed.mode === 'phrase') {
    const hay = caseSensitive ? text : text.toLowerCase();
    return hay.includes(parsed.phrase);
  }
  if (parsed.mode === 'auto-and' || parsed.mode === 'auto-or') {
    const hay = caseSensitive ? text : text.toLowerCase();
    if (parsed.mode === 'auto-and') {
      for (const t of parsed.terms) if (!hay.includes(t)) return false;
      return true;
    }
    for (const t of parsed.terms) if (hay.includes(t)) return true;
    return false;
  }
  return false;
}

function composeStatus(settings, parsed, rankingMode) {
  const parts = [];
  const term = settings.term.trim();
  if (term) {
    parts.push(`Searching for "${term}"`);
    if (rankingMode === 'semantic-hybrid') {
      parts.push(`hybrid rank (${Math.round(settings.semanticAlpha * 100)}% semantic)`);
    } else if (rankingMode === 'regex') {
      parts.push('using regex');
    } else if (rankingMode === 'auto-and') {
      parts.push(`as ${parsed.terms.length} AND-joined phrases`);
    } else if (rankingMode === 'auto-or') {
      parts.push(`as ${parsed.terms.length} OR-joined phrases`);
    } else {
      parts.push('as exact phrase');
    }
    parts.push(settings.caseSensitive ? '(case-sensitive)' : '(case-insensitive)');
  } else {
    parts.push('Showing all verses');
  }
  if (settings.verseTitleFilter.trim()) {
    parts.push(`filtering titles by regex "${settings.verseTitleFilter.trim()}"`);
  }
  if (settings.selectedVolumes.length < settings.allVolumes.length) {
    parts.push('in selected volumes');
  } else {
    parts.push('in all volumes');
  }
  return parts.join(', ') + '.';
}

function emptyResult({ error = null, status = '' } = {}) {
  return {
    results: [],
    status,
    wasAutoConverted: false,
    rankingMode: 'empty',
    highlightPattern: '',
    highlightUseRegex: false,
    error,
  };
}
