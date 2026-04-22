import { dataUrl } from '$lib/utils/url.js';

let cache = null;

export async function getRandomSeekMessage() {
  if (!cache) {
    try {
      const res = await fetch(dataUrl('assets/seek-scriptures.json'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      cache = Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('seek-scriptures fetch failed:', err.message);
      cache = [];
    }
  }
  if (!cache.length) return null;
  return cache[Math.floor(Math.random() * cache.length)];
}
