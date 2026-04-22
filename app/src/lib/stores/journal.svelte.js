/**
 * Session-only markdown journal.
 */
export const journal = $state({
  content: '',
  /** 'edit' | 'preview' */
  mode: 'edit',
});

/**
 * Append a formatted scripture + optional user note to the journal.
 */
export function appendEntry({ verseTitle, scriptureText, userNote }) {
  let entry = `> ${scriptureText} (${verseTitle})`;
  if (userNote?.trim()) entry = `${userNote.trim()}\n${entry}`;
  journal.content = journal.content ? `${journal.content}\n\n${entry}` : entry;
}

export function clearJournal() {
  journal.content = '';
}
