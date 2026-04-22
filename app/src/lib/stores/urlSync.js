/**
 * Hash-based URL sync for search state. Makes searches shareable.
 *
 * Format: `#?q=faith&vt=^John&re=1&cs=0&sem=0&a=50&vols=all`
 *
 * - `q`    search term
 * - `vt`   verse title filter
 * - `re`   useRegex (0/1)
 * - `cs`   caseSensitive (0/1)
 * - `sem`  semantic enabled (0/1)
 * - `a`    semantic alpha (0–100)
 * - `vols` comma-separated selected volumes (or `all` sentinel)
 */

import { searchState, setTerm, setVerseTitleFilter } from './search.svelte.js';
import { settings } from './settings.svelte.js';
import { scripturesState } from './scriptures.svelte.js';

export function readHashIntoState() {
  if (typeof location === 'undefined') return false;
  const hash = location.hash || '';
  if (!hash.startsWith('#?')) return false;
  const params = new URLSearchParams(hash.slice(2));

  if (params.has('q')) setTerm(params.get('q'));
  if (params.has('vt')) setVerseTitleFilter(params.get('vt'));
  if (params.has('re')) settings.useRegex = params.get('re') === '1';
  if (params.has('cs')) settings.caseSensitive = params.get('cs') === '1';
  if (params.has('sem')) settings.semanticEnabled = params.get('sem') === '1';
  if (params.has('a')) {
    const n = parseInt(params.get('a'), 10);
    if (!Number.isNaN(n)) settings.semanticAlpha = Math.max(0, Math.min(1, n / 100));
  }
  if (params.has('vols')) {
    const raw = params.get('vols');
    if (raw === 'all' && scripturesState.availableVolumes.length) {
      settings.selectedVolumes = scripturesState.availableVolumes.slice();
    } else if (raw && raw !== 'all') {
      settings.selectedVolumes = raw.split(',').filter(Boolean);
    }
  }
  return true;
}

export function writeStateToHash() {
  if (typeof location === 'undefined') return;
  const params = new URLSearchParams();
  if (searchState.term.trim()) params.set('q', searchState.term.trim());
  if (searchState.verseTitleFilter.trim()) params.set('vt', searchState.verseTitleFilter.trim());
  if (settings.useRegex) params.set('re', '1');
  if (settings.caseSensitive) params.set('cs', '1');
  if (settings.semanticEnabled) {
    params.set('sem', '1');
    params.set('a', String(Math.round(settings.semanticAlpha * 100)));
  }
  const all = scripturesState.availableVolumes;
  if (all.length && settings.selectedVolumes.length !== all.length) {
    params.set('vols', settings.selectedVolumes.join(','));
  } else {
    params.set('vols', 'all');
  }
  const next = params.toString();
  const target = next ? `#?${next}` : '';
  if (target !== location.hash) {
    history.replaceState(null, '', `${location.pathname}${location.search}${target}`);
  }
}
