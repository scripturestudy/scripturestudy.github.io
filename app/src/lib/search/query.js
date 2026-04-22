import { escapeRegex } from '$lib/utils/regex.js';

/**
 * @typedef {Object} ParsedQuery
 * @property {'empty'|'phrase'|'regex'|'auto-and'|'auto-or'} mode
 * @property {RegExp|null} regex         main search regex (null when mode is 'phrase' or 'empty')
 * @property {string} phrase             substring to match when mode is 'phrase' (already case-adjusted)
 * @property {boolean} wasAutoConverted  true if AND/OR was rewritten into regex
 * @property {string|null} error
 */

/**
 * Parse the user's main search term into either a regex or a phrase.
 *
 * Order matters: AND is tried before OR so `love AND hope OR charity` always
 * parses as AND. Use explicit regex for complex logic — this matches the old
 * app's documented behavior (and its help modal).
 *
 * @param {{ term: string, useRegex: boolean, caseSensitive: boolean }} opts
 * @returns {ParsedQuery}
 */
export function parseQuery({ term, useRegex, caseSensitive }) {
  const trimmed = (term || '').trim();
  if (!trimmed) {
    return { mode: 'empty', regex: null, phrase: '', wasAutoConverted: false, error: null };
  }

  let pattern = null;
  let wasAutoConverted = false;
  let mode = useRegex ? 'regex' : 'phrase';

  if (!useRegex) {
    const andMatch = trimmed.match(/^(.*?)\s+AND\s+(.*?)$/i);
    const orMatch = !andMatch && trimmed.match(/^(.*?)\s+OR\s+(.*?)$/i);
    if (andMatch) {
      const a = escapeRegex(andMatch[1].trim());
      const b = escapeRegex(andMatch[2].trim());
      pattern = `(${a}.*?${b}|${b}.*?${a})`;
      mode = 'auto-and';
      wasAutoConverted = true;
    } else if (orMatch) {
      const a = escapeRegex(orMatch[1].trim());
      const b = escapeRegex(orMatch[2].trim());
      pattern = `(${a}|${b})`;
      mode = 'auto-or';
      wasAutoConverted = true;
    }
  }

  if (useRegex) pattern = trimmed;

  if (pattern !== null) {
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      return {
        mode,
        regex: new RegExp(pattern, flags),
        phrase: '',
        wasAutoConverted,
        error: null,
      };
    } catch (e) {
      return {
        mode,
        regex: null,
        phrase: '',
        wasAutoConverted,
        error: `Invalid Regex: ${e.message}`,
      };
    }
  }

  return {
    mode: 'phrase',
    regex: null,
    phrase: caseSensitive ? trimmed : trimmed.toLowerCase(),
    wasAutoConverted: false,
    error: null,
  };
}
