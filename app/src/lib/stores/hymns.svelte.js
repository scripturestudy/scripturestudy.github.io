import { loadHymns } from '$lib/data/hymns.js';

/**
 * Hymns + per-verse rows from /study/manual/hymns/. Lazy-loaded the first time
 * the user opens the Hymns tab.
 *
 * `hymns` and `verses` are `$state.raw` because the search loop iterates them
 * thousands of times and they never mutate after load.
 */
class HymnsStore {
  /** @type {import('$lib/data/hymns.js').Hymn[]} */
  hymns = $state.raw([]);
  /** @type {Array<[number, number, 'V'|'C', string, string]>} */
  verses = $state.raw([]);

  loading = $state(false);
  loaded = $state(false);
  /** @type {string|null} */
  error = $state(null);
}

export const hymnsState = new HymnsStore();

let loadPromise = null;

export function loadHymnsData() {
  if (loadPromise) return loadPromise;
  hymnsState.loading = true;
  hymnsState.error = null;
  loadPromise = loadHymns()
    .then((bundle) => {
      hymnsState.hymns = bundle.hymns;
      hymnsState.verses = bundle.verses;
      hymnsState.loaded = true;
    })
    .catch((err) => {
      hymnsState.error = err.message;
      loadPromise = null;
    })
    .finally(() => {
      hymnsState.loading = false;
    });
  return loadPromise;
}
