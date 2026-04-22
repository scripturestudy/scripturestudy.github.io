/**
 * Glue: seeds + writes-through for all persisted stores. Call `initPersistence()`
 * once at app mount (inside a Svelte component).
 */
import { journal } from './journal.svelte.js';
import { history } from './history.svelte.js';
import { settings } from './settings.svelte.js';
import { seedFromStorage, writeToStorage } from './persistence.js';

const JOURNAL_KEY = 'ss.journal';
const JOURNAL_FIELDS = ['content', 'mode'];
const HISTORY_KEY = 'ss.history';
const HISTORY_FIELDS = ['entries'];
const SETTINGS_KEY = 'ss.settings';
// CFM state is intentionally session-only.
const SETTINGS_FIELDS = [
  'useRegex',
  'caseSensitive',
  'compactView',
  'shuffleResults',
  'columnsByVolume',
  'singleColumn',
  'semanticEnabled',
  'semanticAlpha',
  'excludeStopWords',
  'selectedVolumes',
];

export function initPersistence() {
  seedFromStorage(journal, JOURNAL_KEY, JOURNAL_FIELDS);
  seedFromStorage(history, HISTORY_KEY, HISTORY_FIELDS);
  seedFromStorage(settings, SETTINGS_KEY, SETTINGS_FIELDS);

  $effect(() => writeToStorage(journal, JOURNAL_KEY, JOURNAL_FIELDS));
  $effect(() => writeToStorage(history, HISTORY_KEY, HISTORY_FIELDS));
  $effect(() => writeToStorage(settings, SETTINGS_KEY, SETTINGS_FIELDS));
}
