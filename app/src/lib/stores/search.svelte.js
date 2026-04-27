import { scripturesState, load } from './scriptures.svelte.js';
import { conferenceState, loadConferenceData } from './conference.svelte.js';
import { hymnsState, loadHymnsData } from './hymns.svelte.js';
import { settings } from './settings.svelte.js';
import { history as historyStore } from './history.svelte.js';
import { runSearch } from '$lib/search/engine.js';
import { runConferenceSearch } from '$lib/search/conference.js';
import { runHymnsSearch } from '$lib/search/hymns.js';
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
  /** Regex source for HighlightedText. For AND/OR queries this is an
   *  alternation over the parsed phrases; for plain phrase searches it's the
   *  raw term (unquoted). */
  highlightPattern: '',
  highlightUseRegex: false,
  firstSearchPerformed: false,
  /** @type {import('$lib/stats/compute.js').StatsResult|null} */
  stats: null,
  statsError: null,
  // current active tab: 'scriptures' | 'conference' | 'statistics'
  activeTab: 'scriptures',
  /** The trimmed term as of the last completed run(). Watched by the
   *  conference trend panel so each new search replaces its first phrase. */
  lastRunTerm: '',

  // --- Conference (lazy) ---
  /** @type {import('$lib/search/conference.js').ConferenceSearchResult|null} */
  conference: null,
  /** @type {string|null} */
  conferenceError: null,
  conferenceSearching: false,

  // --- Hymns (lazy) ---
  /** @type {import('$lib/search/hymns.js').HymnsSearchResult|null} */
  hymns: null,
  /** @type {string|null} */
  hymnsError: null,
  hymnsSearching: false,
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
    sortMode: settings.scriptureSortMode,
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
  searchState.highlightPattern = out.highlightPattern;
  searchState.highlightUseRegex = out.highlightUseRegex;

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
      scriptureSortMode: settings.scriptureSortMode,
      selectedVolumes: settings.selectedVolumes.slice(),
    });
  } else {
    searchState.stats = null;
  }

  searchState.firstSearchPerformed = true;
  searchState.lastRunTerm = searchState.term.trim();
  writeStateToHash();

  // Run conference search if the user has opened that tab at any point.
  // Loading is lazy and errors are surfaced inline rather than blocking scripture results.
  if (settings.conferenceEnabled) {
    runConference().catch((err) => {
      searchState.conferenceError = err.message;
    });
  }

  if (settings.hymnsEnabled) {
    runHymns().catch((err) => {
      searchState.hymnsError = err.message;
    });
  }
}

/**
 * Run the conference search. Loads the conference bundle on first call.
 * Safe to call even with an empty term — returns paragraphs filtered by
 * year/conference/speaker only.
 */
export async function runConference() {
  searchState.conferenceError = null;
  if (!conferenceState.loaded) {
    searchState.conferenceSearching = true;
    try {
      await loadConferenceData();
    } finally {
      searchState.conferenceSearching = false;
    }
    if (conferenceState.error) {
      searchState.conferenceError = conferenceState.error;
      return;
    }
  }

  searchState.conferenceSearching = true;
  try {
    const out = runConferenceSearch(
      conferenceState.talks,
      conferenceState.paragraphs,
      {
        term: searchState.term,
        useRegex: settings.useRegex,
        caseSensitive: settings.caseSensitive,
        yearFrom: settings.conferenceYearFrom,
        yearTo: settings.conferenceYearTo,
        includeApril: settings.conferenceIncludeApril,
        includeOctober: settings.conferenceIncludeOctober,
        selectedSpeakers: settings.conferenceSelectedSpeakers,
        selectedCallings: settings.conferenceSelectedCallings,
        sortMode: settings.conferenceSortMode,
      },
      RESULT_RENDER_LIMIT,
    );
    if (out.error) {
      searchState.conferenceError = out.error.message;
      searchState.conference = null;
      return;
    }
    searchState.conference = out;
    // Conference can run independently of the scripture engine (e.g. via
    // enableConference()). Keep the highlight pattern in sync either way.
    searchState.highlightPattern = out.highlightPattern;
    searchState.highlightUseRegex = out.highlightUseRegex;
  } finally {
    searchState.conferenceSearching = false;
  }
}

/**
 * Run the hymns search. Loads the hymns bundle on first call. Empty term
 * returns every verse (subject to the chorus toggle).
 */
export async function runHymns() {
  searchState.hymnsError = null;
  if (!hymnsState.loaded) {
    searchState.hymnsSearching = true;
    try {
      await loadHymnsData();
    } finally {
      searchState.hymnsSearching = false;
    }
    if (hymnsState.error) {
      searchState.hymnsError = hymnsState.error;
      return;
    }
  }

  searchState.hymnsSearching = true;
  try {
    const out = runHymnsSearch(
      hymnsState.hymns,
      hymnsState.verses,
      {
        term: searchState.term,
        useRegex: settings.useRegex,
        caseSensitive: settings.caseSensitive,
        includeChoruses: settings.hymnsIncludeChoruses,
        sortMode: settings.hymnsSortMode,
      },
      RESULT_RENDER_LIMIT,
    );
    if (out.error) {
      searchState.hymnsError = out.error.message;
      searchState.hymns = null;
      return;
    }
    searchState.hymns = out;
    searchState.highlightPattern = out.highlightPattern;
    searchState.highlightUseRegex = out.highlightUseRegex;
  } finally {
    searchState.hymnsSearching = false;
  }
}

/**
 * Opt the hymns tab in. Kicks off the bundle fetch and runs an initial search.
 */
export async function enableHymns() {
  if (!settings.hymnsEnabled) settings.hymnsEnabled = true;
  await runHymns();
}

/**
 * Opt the conference tab in. Kicks off the bundle fetch immediately and
 * runs an initial search so the tab is populated when the user switches.
 */
export async function enableConference() {
  if (!settings.conferenceEnabled) settings.conferenceEnabled = true;
  // Clamp the year range to what the data actually contains once we know it.
  await runConference();
  if (conferenceState.loaded) {
    if (settings.conferenceYearFrom < conferenceState.minYear)
      settings.conferenceYearFrom = conferenceState.minYear;
    if (settings.conferenceYearTo > conferenceState.maxYear)
      settings.conferenceYearTo = conferenceState.maxYear;
  }
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
