import { BOOK_PATHS } from './bookPaths.js';

const BOOK_INDEX = new Map(Object.keys(BOOK_PATHS).map((title, i) => [title, i]));

export function compareVersesCanonical(a, b) {
  const ai = BOOK_INDEX.get(a.book_title) ?? Number.MAX_SAFE_INTEGER;
  const bi = BOOK_INDEX.get(b.book_title) ?? Number.MAX_SAFE_INTEGER;
  if (ai !== bi) return ai - bi;
  const ac = Number(a.chapter_number) || 0;
  const bc = Number(b.chapter_number) || 0;
  if (ac !== bc) return ac - bc;
  return (Number(a.verse_number) || 0) - (Number(b.verse_number) || 0);
}
