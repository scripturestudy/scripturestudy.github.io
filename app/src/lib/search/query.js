import { escapeRegex } from '$lib/utils/regex.js';

/**
 * @typedef {Object} ParsedQuery
 * @property {'empty'|'phrase'|'regex'|'auto-and'|'auto-or'} mode
 * @property {RegExp|null} regex         alternation regex over all terms (used for highlighting & explicit-regex matching)
 * @property {string} phrase             substring to match when mode is 'phrase' (already case-adjusted)
 * @property {string[]} terms            case-adjusted phrase terms when mode is 'auto-and' or 'auto-or'
 * @property {string} highlightSource    regex source for HighlightedText (alternation for and/or, raw for phrase/regex)
 * @property {boolean} wasAutoConverted  true if AND/OR was rewritten
 * @property {string|null} error
 */

/**
 * Parse the user's main search term.
 *
 * Supports:
 *   - Single phrase: `faith in christ`
 *   - Quoted phrase: `"faith in christ"` (lets the phrase contain literal AND/OR)
 *   - N-ary AND: `faith AND hope`, `faith AND hope AND charity`, `"faith in" AND "hope in"`
 *   - N-ary OR:  `faith OR hope OR charity`
 *   - Explicit regex (when useRegex is set)
 *
 * AND wins over OR — `love AND hope OR charity` parses as AND. Use explicit
 * regex for arbitrary boolean logic.
 *
 * @param {{ term: string, useRegex: boolean, caseSensitive: boolean }} opts
 * @returns {ParsedQuery}
 */
export function parseQuery({ term, useRegex, caseSensitive }) {
  const trimmed = (term || '').trim();
  if (!trimmed) {
    return {
      mode: 'empty',
      regex: null,
      phrase: '',
      terms: [],
      highlightSource: '',
      wasAutoConverted: false,
      error: null,
    };
  }

  const flags = caseSensitive ? 'g' : 'gi';

  if (useRegex) {
    try {
      return {
        mode: 'regex',
        regex: new RegExp(trimmed, flags),
        phrase: '',
        terms: [],
        highlightSource: trimmed,
        wasAutoConverted: false,
        error: null,
      };
    } catch (e) {
      return {
        mode: 'regex',
        regex: null,
        phrase: '',
        terms: [],
        highlightSource: '',
        wasAutoConverted: false,
        error: `Invalid Regex: ${e.message}`,
      };
    }
  }

  // Try AND first, then OR (precedence as before).
  const andParts = splitOnOperator(trimmed, 'AND');
  const orParts = andParts ? null : splitOnOperator(trimmed, 'OR');
  const parts = andParts || orParts;

  if (parts) {
    const mode = andParts ? 'auto-and' : 'auto-or';
    const normalized = parts.map((p) => (caseSensitive ? p : p.toLowerCase()));
    const highlightSource = '(' + parts.map(escapeRegex).join('|') + ')';
    return {
      mode,
      regex: new RegExp(highlightSource, flags),
      phrase: '',
      terms: normalized,
      highlightSource,
      wasAutoConverted: true,
      error: null,
    };
  }

  // Single phrase (strip wrapping quotes if user added them).
  const phrase = stripQuotes(trimmed);
  return {
    mode: 'phrase',
    regex: null,
    phrase: caseSensitive ? phrase : phrase.toLowerCase(),
    terms: [],
    highlightSource: phrase,
    wasAutoConverted: false,
    error: null,
  };
}

/**
 * Split `input` on `\s+OP\s+` (case-insensitive), but only outside of double
 * quotes so quoted phrases can contain literal AND/OR. Returns the cleaned,
 * unquoted parts when there are at least two non-empty pieces; otherwise null.
 */
function splitOnOperator(input, op) {
  const opLen = op.length;
  const parts = [];
  let buf = '';
  let inQuote = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      inQuote = !inQuote;
      buf += c;
      continue;
    }
    if (!inQuote && isSpace(c)) {
      // Look ahead for: \s+OP\s+
      let j = i;
      while (j < input.length && isSpace(input[j])) j++;
      if (
        j + opLen <= input.length &&
        input.slice(j, j + opLen).toUpperCase() === op &&
        j + opLen < input.length &&
        isSpace(input[j + opLen])
      ) {
        let k = j + opLen;
        while (k < input.length && isSpace(input[k])) k++;
        parts.push(buf);
        buf = '';
        i = k - 1;
        continue;
      }
    }
    buf += c;
  }
  parts.push(buf);

  if (parts.length < 2) return null;
  const cleaned = parts.map((p) => stripQuotes(p.trim())).filter((p) => p.length > 0);
  if (cleaned.length < 2) return null;
  return cleaned;
}

function isSpace(c) {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r';
}

function stripQuotes(s) {
  if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
    return s.slice(1, -1);
  }
  return s;
}
