import { VOLUME_ACRONYM_MAP } from '$lib/constants/volumes.js';
import { escapeRegex } from '$lib/utils/regex.js';

/**
 * Build a case-insensitive regex for the verse-title filter. Every acronym in
 * VOLUME_ACRONYM_MAP is rewritten as `(?:acronym|fullName)` so that typing
 * e.g. `^D&C 4` matches both `D&C 4:...` and `Doctrine and Covenants 4:...`.
 *
 * Returns { regex, error }.
 */
export function buildVerseTitleRegex(pattern) {
  const p = (pattern || '').trim();
  if (!p) return { regex: null, error: null };

  let expanded = p;
  for (const [acronym, fullName] of Object.entries(VOLUME_ACRONYM_MAP)) {
    const escAcr = escapeRegex(acronym);
    const escFull = escapeRegex(fullName);
    expanded = expanded.replace(new RegExp(escAcr, 'gi'), `(?:${escAcr}|${escFull})`);
  }

  try {
    return { regex: new RegExp(expanded, 'i'), error: null };
  } catch (e) {
    return { regex: null, error: `Invalid Regex: ${e.message}` };
  }
}
