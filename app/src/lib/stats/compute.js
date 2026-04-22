import { HARDCODED_VOLUME_ORDER } from '$lib/constants/volumes.js';
import { STOP_WORDS } from '$lib/constants/stopwords.js';
import { normalizeWord } from '$lib/utils/text.js';
import { calculateNGrams } from './ngrams.js';

/**
 * @typedef {Object} StatsResult
 * @property {number} totalMatched
 * @property {Array<{volume:string, count:number}>} perVolume
 * @property {Array<{word:string, count:number}>|null} wordForms
 * @property {{
 *   1: Array<{word:string,total:number,unique:number,freqPerScripture:number,freqPerWord:number,coverage:number}>,
 *   2: Array<{phrase:string,total:number,unique:number}>,
 *   3: Array<{phrase:string,total:number,unique:number}>,
 *   4: Array<{phrase:string,total:number,unique:number}>,
 * }} ngrams
 */

/**
 * Compute statistics for a result set.
 *
 * @param {Array} results
 * @param {{ term: string, useRegex: boolean, excludeStopWords: boolean }} opts
 * @returns {StatsResult|null}
 */
export function computeStatistics(results, { term, useRegex, excludeStopWords }) {
  if (!results || results.length === 0) return null;

  // --- Single pass for 1-grams + per-volume + word forms -------------------
  const volumeCounts = {};
  const wordTotal = {};
  const wordUnique = {};
  const wordForms = {};
  let totalWordsCounted = 0;

  const singleWordMode =
    !useRegex && term && !term.includes(' ') && !term.match(/\s+(AND|OR)\s+/i);
  const prefix = singleWordMode ? normalizeWord(term) : null;

  for (const verse of results) {
    const volume = verse.volume_title || 'Unknown Volume';
    volumeCounts[volume] = (volumeCounts[volume] || 0) + 1;

    const tokens = (verse.scripture_text || '').split(/\s+/);
    const seenInVerse = new Set();
    for (const raw of tokens) {
      const w = normalizeWord(raw);
      if (!w) continue;

      const count = !excludeStopWords || !STOP_WORDS.has(w);
      if (count) {
        totalWordsCounted++;
        wordTotal[w] = (wordTotal[w] || 0) + 1;
        if (!seenInVerse.has(w)) {
          wordUnique[w] = (wordUnique[w] || 0) + 1;
          seenInVerse.add(w);
        }
      }
      if (prefix && w.startsWith(prefix)) {
        wordForms[w] = (wordForms[w] || 0) + 1;
      }
    }
  }

  const totalMatched = results.length;
  const oneGrams = Object.keys(wordTotal)
    .map((word) => {
      const total = wordTotal[word];
      const uniq = wordUnique[word] || 0;
      return {
        word,
        total,
        unique: uniq,
        freqPerScripture: totalMatched > 0 ? total / totalMatched : 0,
        freqPerWord: totalWordsCounted > 0 ? total / totalWordsCounted : 0,
        coverage: totalMatched > 0 ? uniq / totalMatched : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  // --- Per-volume in canonical order, with unknowns appended ---------------
  const perVolume = [];
  const seen = new Set();
  for (const name of HARDCODED_VOLUME_ORDER) {
    if (volumeCounts[name]) {
      perVolume.push({ volume: name, count: volumeCounts[name] });
      seen.add(name);
    }
  }
  for (const [vol, count] of Object.entries(volumeCounts)) {
    if (!seen.has(vol)) perVolume.push({ volume: vol, count });
  }

  return {
    totalMatched,
    perVolume,
    wordForms: singleWordMode
      ? Object.entries(wordForms)
          .sort((a, b) => b[1] - a[1])
          .map(([word, count]) => ({ word, count }))
      : null,
    ngrams: {
      1: oneGrams,
      2: calculateNGrams(results, 2, excludeStopWords),
      3: calculateNGrams(results, 3, excludeStopWords),
      4: calculateNGrams(results, 4, excludeStopWords),
    },
  };
}
