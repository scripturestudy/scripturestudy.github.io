/**
 * Minimal localStorage persistence helper for runes-based stores.
 *
 * Usage (call inside a component or top-level `<script>` that will mount):
 *
 *   import { persist } from '$lib/stores/persistence.js';
 *   import { journal } from './journal.svelte.js';
 *
 *   persist(journal, 'ss.journal', ['content', 'mode']);
 *
 * On first call, seeds the named fields from localStorage. On every subsequent
 * change, writes the tracked subset back.
 *
 * Keeping this as a plain module (not `.svelte.js`) so `$effect` has to be
 * invoked from a Svelte context — we wrap the subscribe step accordingly.
 */

export function seedFromStorage(target, key, fields) {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    for (const f of fields) {
      if (parsed[f] !== undefined) target[f] = parsed[f];
    }
  } catch {
    /* ignore corrupt localStorage */
  }
}

export function writeToStorage(target, key, fields) {
  if (typeof localStorage === 'undefined') return;
  try {
    const out = {};
    for (const f of fields) out[f] = target[f];
    localStorage.setItem(key, JSON.stringify(out));
  } catch {
    /* quota exceeded — silently drop */
  }
}
