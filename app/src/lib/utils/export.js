/**
 * Format a result set as markdown blockquotes.
 * Used by the "Export results" action; safe to call with 0..RESULT_RENDER_LIMIT verses.
 */
export function resultsToMarkdown(verses) {
  return verses
    .map((v) => `> ${v.scripture_text} (${v.verse_title})`)
    .join('\n\n');
}
