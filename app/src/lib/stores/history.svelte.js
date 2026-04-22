import { MAX_SEARCH_HISTORY } from '$lib/constants/limits.js';

/**
 * @typedef {Object} HistoryEntry
 * @property {string} term
 * @property {string} verseTitleFilter
 * @property {boolean} useRegex
 * @property {boolean} caseSensitive
 * @property {boolean} columnsByVolume
 * @property {boolean} shuffleResults
 * @property {string[]} selectedVolumes
 * @property {string} timestamp  ISO
 */

export const history = $state({
  /** @type {HistoryEntry[]} */
  entries: [],
});

history.record = function record(entry) {
  history.entries = [
    { ...entry, timestamp: new Date().toISOString() },
    ...history.entries,
  ].slice(0, MAX_SEARCH_HISTORY);
};
