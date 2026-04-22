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
  shuffleResults: !isMobile,
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
