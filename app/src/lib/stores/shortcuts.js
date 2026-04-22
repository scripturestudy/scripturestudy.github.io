/**
 * Global keyboard shortcuts. Call `installShortcuts()` once at app mount.
 *
 *   /           focus the main search input
 *   Cmd/Ctrl+J  toggle journal
 *   Cmd/Ctrl+H  toggle history
 *   ?           open search help
 *   Escape      handled natively by dialogs/sheets; we don't intercept
 */

import { toggleJournal, toggleHistory, openModal } from './ui.svelte.js';

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export function installShortcuts() {
  if (typeof window === 'undefined') return () => {};

  function handler(e) {
    const typing = isTypingTarget(e.target);

    if (!typing && e.key === '/') {
      const input = document.getElementById('searchInput');
      if (input) {
        e.preventDefault();
        input.focus();
        input.select?.();
      }
      return;
    }

    if (!typing && e.key === '?') {
      e.preventDefault();
      openModal('search-help');
      return;
    }

    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'j') {
      e.preventDefault();
      toggleJournal();
      return;
    }
    if (mod && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      toggleHistory();
      return;
    }
  }

  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}
