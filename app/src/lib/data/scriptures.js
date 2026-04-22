import { HARDCODED_VOLUME_ORDER, normalizeVolumeName } from '$lib/constants/volumes.js';
import { dataUrl } from '$lib/utils/url.js';
import { FALLBACK_VERSES } from './fallback.js';

/**
 * @typedef {Object} Verse
 * @property {string} volume_title
 * @property {string} book_title
 * @property {string} [book_short_title]
 * @property {number} chapter_number
 * @property {number} verse_number
 * @property {string} verse_title
 * @property {string} [verse_short_title]
 * @property {string} scripture_text
 * @property {number} __idx  row index; aligned with embeddings.bin
 */

/**
 * Load + normalize the full scripture dataset.
 * On fetch/parse failure, returns the tiny fallback dataset with usedFallback=true.
 *
 * @returns {Promise<{ verses: Verse[], availableVolumes: string[], usedFallback: boolean }>}
 */
export async function loadScriptures() {
  let raw;
  let usedFallback = false;
  try {
    const res = await fetch(dataUrl('lds-scriptures.json'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.json();
    if (!Array.isArray(raw)) throw new Error('Scripture data is not an array');
  } catch (err) {
    console.warn('Falling back to minimal scripture set:', err.message);
    raw = FALLBACK_VERSES;
    usedFallback = true;
  }

  const foundVolumes = new Set();
  const verses = new Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i];
    if (!v || typeof v.volume_title !== 'string' || typeof v.book_title !== 'string') {
      verses[i] = v;
      continue;
    }
    const volume = normalizeVolumeName(v.volume_title);
    // Mutate-in-place is fine here: `raw` is our copy, never shared elsewhere.
    v.volume_title = volume;
    v.__idx = i;
    verses[i] = v;
    foundVolumes.add(volume);
  }

  const remaining = new Set(foundVolumes);
  const ordered = [];
  for (const name of HARDCODED_VOLUME_ORDER) {
    if (remaining.has(name)) {
      ordered.push(name);
      remaining.delete(name);
    }
  }
  ordered.push(...Array.from(remaining).sort());

  return { verses, availableVolumes: ordered, usedFallback };
}
