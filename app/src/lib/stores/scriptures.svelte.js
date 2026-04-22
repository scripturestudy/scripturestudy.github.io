import { loadScriptures } from '$lib/data/scriptures.js';

/**
 * Scripture data + available volumes. One-time load, idempotent.
 *
 * `verses` uses `$state.raw` because the 40k verse objects are never mutated
 * after load; deep reactivity would just add proxy overhead in the inner loop
 * of every search.
 */
class ScripturesStore {
  /** @type {Array} */
  verses = $state.raw([]);
  /** @type {string[]} */
  availableVolumes = $state([]);
  loading = $state(false);
  loaded = $state(false);
  usedFallback = $state(false);
  /** @type {string|null} */
  error = $state(null);
}

export const scripturesState = new ScripturesStore();

let loadPromise = null;

export function load() {
  if (loadPromise) return loadPromise;
  scripturesState.loading = true;
  loadPromise = loadScriptures()
    .then((res) => {
      scripturesState.verses = res.verses;
      scripturesState.availableVolumes = res.availableVolumes;
      scripturesState.usedFallback = res.usedFallback;
      scripturesState.loaded = true;
    })
    .catch((err) => {
      scripturesState.error = err.message;
    })
    .finally(() => {
      scripturesState.loading = false;
    });
  return loadPromise;
}
