import { dataUrl } from '$lib/utils/url.js';

/**
 * @typedef {Object} ConferenceTalk
 * @property {number} y   year (e.g. 2025)
 * @property {number} m   month (4 or 10)
 * @property {number|null} sn   session number
 * @property {string} s   session name ("Saturday Morning Session")
 * @property {string} sp  speaker
 * @property {string} r   speaker role
 * @property {string} t   talk title
 * @property {string} sl  slug
 * @property {string} k   kicker
 * @property {number|null} cp   conference position
 * @property {string} u   URL on churchofjesuschrist.org
 */

/**
 * @typedef {Object} ConferenceBundle
 * @property {ConferenceTalk[]} talks
 * @property {Array<[number, string, string]>} paragraphs   [talkIdx, paraId, text]
 * @property {{ minYear: number, maxYear: number, speakers: string[], built: string }} meta
 */

/**
 * Fetch the consolidated conference bundle. Produced by
 * scripts/build-conference-data.js.
 *
 * @returns {Promise<ConferenceBundle>}
 */
export async function loadConference() {
  const res = await fetch(dataUrl('assets/conference.json'));
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching conference data`);
  const data = await res.json();
  if (!data || !Array.isArray(data.talks) || !Array.isArray(data.paragraphs)) {
    throw new Error('Malformed conference data');
  }
  return data;
}
