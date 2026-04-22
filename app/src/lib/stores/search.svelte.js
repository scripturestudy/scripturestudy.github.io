import { scripturesState, load } from './scriptures.svelte.js';
import { settings } from './settings.svelte.js';
import { history as historyStore } from './history.svelte.js';
import { runSearch } from '$lib/search/engine.js';
import { computeStatistics } from '$lib/stats/compute.js';
import * as semantic from '$lib/search/semantic.js';
import { RESULT_RENDER_LIMIT } from '$lib/constants/limits.js';
import { writeStateToHash } from './urlSync.js';

/**
 * Top-level search state. Owns query text, results, status, errors, and the
 * current stats snapshot. Everything here is driven by `run()`.
 */
export const searchState = $state({
  term: '',
  verseTitleFilter: '',
  /** @type {Array} */
  results: [],
  status: '',
  /** @type {string|null} */
  termError: null,
  /** @type {string|null} */
  verseTitleError: null,
  overLimit: false,
  /** @type {'empty'|'phrase'|'regex'|'auto-and'|'auto-or'|'semantic-hybrid'} */
  rankingMode: 'empty',
  wasAutoConverted: false,
  firstSearchPerformed: false,
  /** @type {import('$lib/stats/compute.js').StatsResult|null} */
  stats: null,
  statsError: null,
  // current active tab: 'scriptures' | 'statistics'
  activeTab: 'scriptures',
});

export function setTerm(t) { searchState.term = t; }
export function setVerseTitleFilter(t) { searchState.verseTitleFilter = t; }

/**
 * Execute a search and update all dependent state.
 * Loads scripture data on first call.
 */
export async function run() {
  searchState.termError = null;
  searchState.verseTitleError = null;
  searchState.statsError = null;

  if (!scripturesState.loaded) await load();

  // Compute semantic scores up front (if enabled + non-empty query). This
  // lets the pure engine stay synchronous.
  let semanticScores = null;
  if (settings.semanticEnabled && searchState.term.trim()) {
    try {
      semanticScores = await semantic.scoreAll(searchState.term.trim());
    } catch (err) {
      searchState.termError = `Semantic search failed: ${err.message}`;
      return;
    }
  }

  const out = runSearch(scripturesState.verses, {
    term: searchState.term,
    verseTitleFilter: searchState.verseTitleFilter,
    useRegex: settings.useRegex,
    caseSensitive: settings.caseSensitive,
    selectedVolumes: settings.selectedVolumes,
    shuffle: settings.shuffleResults,
    semantic: settings.semanticEnabled,
    semanticAlpha: settings.semanticAlpha,
    semanticScores,
    allVolumes: scripturesState.availableVolumes,
  });

  if (out.error) {
    if (out.error.field === 'term') searchState.termError = out.error.message;
    if (out.error.field === 'verseTitle') searchState.verseTitleError = out.error.message;
    searchState.results = [];
    searchState.stats = null;
    searchState.status = '';
    searchState.overLimit = false;
    return;
  }

  searchState.status = out.status;
  searchState.wasAutoConverted = out.wasAutoConverted;
  searchState.rankingMode = out.rankingMode;
  searchState.activeTab = 'scriptures';

  const overLimit = out.results.length > RESULT_RENDER_LIMIT;
  searchState.overLimit = overLimit;
  searchState.results = overLimit ? [] : out.results;

  if (!overLimit && out.results.length > 0) {
    try {
      searchState.stats = computeStatistics(out.results, {
        term: searchState.term.trim(),
        useRegex: settings.useRegex,
        excludeStopWords: settings.excludeStopWords,
      });
    } catch (err) {
      searchState.stats = null;
      searchState.statsError = `Error generating statistics: ${err.message}`;
    }
    historyStore.record({
      term: searchState.term.trim(),
      verseTitleFilter: searchState.verseTitleFilter.trim(),
      useRegex: settings.useRegex,
      caseSensitive: settings.caseSensitive,
      columnsByVolume: settings.columnsByVolume,
      shuffleResults: settings.shuffleResults,
      selectedVolumes: settings.selectedVolumes.slice(),
    });
  } else {
    searchState.stats = null;
  }

  searchState.firstSearchPerformed = true;
  writeStateToHash();
}

/** Recompute stats after a toggle like "Exclude Stop Words" flips, reusing cached results. */
export function recomputeStats() {
  if (!searchState.results.length) return;
  try {
    searchState.stats = computeStatistics(searchState.results, {
      term: searchState.term.trim(),
      useRegex: settings.useRegex,
      excludeStopWords: settings.excludeStopWords,
    });
    searchState.statsError = null;
  } catch (err) {
    searchState.statsError = `Error updating statistics: ${err.message}`;
  }
}
