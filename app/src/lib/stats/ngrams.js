import { STOP_WORDS } from '$lib/constants/stopwords.js';
import { normalizeWord } from '$lib/utils/text.js';

/**
 * Compute n-gram frequencies across a set of verses.
 *
 * When excludeStopWords is true, stop words are removed from the token stream
 * BEFORE windowing — so "of the" never forms a 2-gram when excluded. This
 * matches the original app's documented semantics.
 *
 * @param {Array<{scripture_text?: string}>} results
 * @param {number} n  2, 3, or 4
 * @param {boolean} excludeStopWords
 * @returns {Array<{phrase: string, total: number, unique: number}>}
 */
export function calculateNGrams(results, n, excludeStopWords) {
  const total = {};
  const unique = {};

  for (const verse of results) {
    const text = verse.scripture_text || '';
    const tokens = text
      .split(/\s+/)
      .map(normalizeWord)
      .filter(Boolean);
    const words = excludeStopWords ? tokens.filter((w) => !STOP_WORDS.has(w)) : tokens;

    if (words.length < n) continue;

    const seenInVerse = new Set();
    for (let i = 0; i <= words.length - n; i++) {
      const item = words.slice(i, i + n).join(' ');
      if (!item.trim()) continue;
      total[item] = (total[item] || 0) + 1;
      if (!seenInVerse.has(item)) {
        unique[item] = (unique[item] || 0) + 1;
        seenInVerse.add(item);
      }
    }
  }

  return Object.keys(total)
    .map((phrase) => ({ phrase, total: total[phrase], unique: unique[phrase] || 0 }))
    .sort((a, b) => b.total - a.total);
}
