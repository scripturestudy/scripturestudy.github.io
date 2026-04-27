/**
 * User-visible search + display settings.
 *
 * On first access, desktop/mobile defaults are applied once. Components mutate
 * fields directly (e.g. `settings.caseSensitive = true`) — Svelte runes handle
 * the reactivity.
 */
const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

export const settings = $state({
  // search flags
  useRegex: false,
  caseSensitive: false,
  // display
  compactView: isMobile,
  /** 'canonical' | 'reverse' | 'shuffle' */
  scriptureSortMode: 'canonical',
  columnsByVolume: !isMobile,
  singleColumn: false,
  // semantic
  semanticEnabled: false,
  semanticAlpha: 0.5,
  // selected volumes — seeded once scriptures load
  /** @type {string[]} */
  selectedVolumes: [],
  // Come Follow Me
  cfmEnabled: false,
  cfmWeekIndex: -1,
  // stats
  excludeStopWords: true,
  // General Conference
  /** whether the conference tab has ever been opened (enables lazy load) */
  conferenceEnabled: false,
  /** inclusive year range filter */
  conferenceYearFrom: 2020,
  conferenceYearTo: 2026,
  conferenceIncludeApril: true,
  conferenceIncludeOctober: true,
  /** empty = all speakers; otherwise exact speaker-name match */
  /** @type {string[]} */
  conferenceSelectedSpeakers: [],
  /** empty = all callings; otherwise speaker_role must match one of these group ids */
  /** @type {string[]} */
  conferenceSelectedCallings: [],
  /** 'year-desc' | 'year-asc' | 'shuffle' */
  conferenceSortMode: 'year-desc',

  // Hymns
  /** whether the hymns tab has ever been opened (enables lazy load) */
  hymnsEnabled: false,
  /** show chorus cards alongside verses (deduped to one chorus per hymn) */
  hymnsIncludeChoruses: true,
  /** 'number-asc' | 'number-desc' | 'title-asc' | 'shuffle' */
  hymnsSortMode: 'number-asc',
});

/**
 * Called once after scriptures load to populate the initial volume selection.
 */
export function seedVolumes(volumes) {
  if (settings.selectedVolumes.length === 0) {
    settings.selectedVolumes = volumes.slice();
  }
}

export function toggleVolume(name) {
  if (settings.selectedVolumes.includes(name)) {
    settings.selectedVolumes = settings.selectedVolumes.filter((v) => v !== name);
  } else {
    settings.selectedVolumes = [...settings.selectedVolumes, name];
  }
}

export function setAllVolumes(allVolumes, checked) {
  settings.selectedVolumes = checked ? allVolumes.slice() : [];
}
