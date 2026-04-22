/**
 * Global UI state: which modal is open, whether panels are open.
 * One modal at a time. Opening a modal carries an optional payload.
 */
export const ui = $state({
  /** 'search-help'|'stats-help'|'stop-words'|'context'|'note'|'command-palette'|null */
  activeModal: null,
  /** @type {any} */
  modalPayload: null,
  journalOpen: false,
  historyOpen: false,
  filtersCollapsed: false,
  /** transient status message shown under the search bar */
  seekMessage: '',
});

export function openModal(name, payload = null) {
  ui.activeModal = name;
  ui.modalPayload = payload;
}

export function closeModal() {
  ui.activeModal = null;
  ui.modalPayload = null;
}

export function toggleJournal(show) {
  ui.journalOpen = show === undefined ? !ui.journalOpen : show;
}

export function toggleHistory(show) {
  ui.historyOpen = show === undefined ? !ui.historyOpen : show;
}

export function toggleFilters(collapse) {
  ui.filtersCollapsed = collapse === undefined ? !ui.filtersCollapsed : collapse;
}

export function setSeekMessage(msg) {
  ui.seekMessage = msg;
}
