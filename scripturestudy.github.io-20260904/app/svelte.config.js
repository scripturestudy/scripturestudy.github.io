import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  // Per-file runes detection — our components opt in automatically via `$state`,
  // `$derived`, etc.; lucide-svelte (legacy) stays in Svelte-4 compat mode.
};
