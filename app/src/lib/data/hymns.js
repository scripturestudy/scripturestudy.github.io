import { dataUrl } from '$lib/utils/url.js';

/**
 * @typedef {Object} Hymn
 * @property {string} sl  slug
 * @property {string} sn  song number (string; "1"…"341")
 * @property {string} t   title
 * @property {string} tp  tempo / style label (e.g. "Triumphantly")
 * @property {string} cr  credits ("Text: …\nMusic: …")
 * @property {string} u   /study/manual/hymns/<slug> URL
 * @property {string} mu  /media/music/songs/<slug> URL
 */

/**
 * @typedef {Object} HymnsBundle
 * @property {Hymn[]} hymns
 * @property {Array<[number, number, 'V'|'C', string, string]>} verses
 *   [hymnIdx, verseNumber (0 for chorus), kind, marker (figure1_pN), text]
 * @property {{ totalHymns: number, totalVerses: number, built: string }} meta
 */

/** @returns {Promise<HymnsBundle>} */
export async function loadHymns() {
  const res = await fetch(dataUrl('assets/hymns.json'));
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching hymns data`);
  const data = await res.json();
  if (!data || !Array.isArray(data.hymns) || !Array.isArray(data.verses)) {
    throw new Error('Malformed hymns data');
  }
  return data;
}
