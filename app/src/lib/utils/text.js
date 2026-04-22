export function normalizeWord(word) {
  if (!word) return '';
  return word
    .toLowerCase()
    .replace(/^[^\w\s]+|[^\w\s]+$/g, '')
    .replace(/'s$/g, '')
    .replace(/[.,;:!?"'()[\]{}<>]/g, '');
}

/** Fisher-Yates shuffle; returns a new array (does not mutate input). */
export function shuffleArray(input) {
  const array = input.slice();
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
