import { loadConference } from '$lib/data/conference.js';

/**
 * Conference talks + paragraphs. Lazy-loaded: only fetched when the user
 * opts in (opens the Conference tab or enables conference search).
 *
 * `talks` and `paragraphs` use `$state.raw` for the same reason `verses`
 * does — they are never mutated after load; deep proxying ~150k entries
 * would just slow down the search loop.
 */
class ConferenceStore {
  /** @type {import('$lib/data/conference.js').ConferenceTalk[]} */
  talks = $state.raw([]);
  /** @type {Array<[number, string, string]>} */
  paragraphs = $state.raw([]);
  /** @type {string[]} */
  speakers = $state.raw([]);
  minYear = $state(0);
  maxYear = $state(0);

  loading = $state(false);
  loaded = $state(false);
  /** @type {string|null} */
  error = $state(null);
}

export const conferenceState = new ConferenceStore();

let loadPromise = null;

export function loadConferenceData() {
  if (loadPromise) return loadPromise;
  conferenceState.loading = true;
  conferenceState.error = null;
  loadPromise = loadConference()
    .then((bundle) => {
      conferenceState.talks = bundle.talks;
      conferenceState.paragraphs = bundle.paragraphs;
      conferenceState.speakers = bundle.meta?.speakers || [];
      conferenceState.minYear = bundle.meta?.minYear || 0;
      conferenceState.maxYear = bundle.meta?.maxYear || 0;
      conferenceState.loaded = true;
    })
    .catch((err) => {
      conferenceState.error = err.message;
      loadPromise = null;
    })
    .finally(() => {
      conferenceState.loading = false;
    });
  return loadPromise;
}
