import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

/**
 * Dev middleware that serves files the SPA needs from the repo root:
 *   /lds-scriptures.json, /cfm2026.json, /assets/*
 * Production assumes the app is co-deployed with those files at the same origin.
 */
function serveRepoRootData() {
  const served = new Set(['/lds-scriptures.json', '/cfm2026.json']);
  return {
    name: 'serve-repo-root-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];
        const isAsset = url.startsWith('/assets/');
        if (!served.has(url) && !isAsset) return next();
        const filepath = path.join(repoRoot, url);
        if (!fs.existsSync(filepath)) return next();
        if (url.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
        else if (url.endsWith('.bin')) res.setHeader('Content-Type', 'application/octet-stream');
        fs.createReadStream(filepath).pipe(res);
      });
    },
  };
}

// Pre-declare every lucide icon the app uses so Vite bundles them all up
// front. Without this, Vite discovers icons one-by-one as components mount and
// kicks off mid-page re-optimizations whose chunk hashes don't match what's
// already in flight, causing TypeErrors deep in the Svelte runtime
// ("first_child_getter.call(node)" with first_child_getter undefined).
const LUCIDE_ICONS = [
  'book-plus', 'check', 'chevron-down', 'chevron-up', 'clipboard-copy',
  'clock', 'copy', 'download', 'external-link', 'eye', 'help-circle', 'info',
  'menu', 'minus', 'more-vertical', 'music', 'notebook-pen', 'pencil', 'plus',
  'search', 'settings-2', 'trash-2', 'trending-up', 'triangle-alert', 'x',
];

export default defineConfig({
  plugins: [svelte(), serveRepoRootData()],
  resolve: {
    alias: {
      $lib: path.resolve(here, 'src/lib'),
    },
  },
  optimizeDeps: {
    include: LUCIDE_ICONS.map((n) => `lucide-svelte/icons/${n}`),
  },
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: true,
  },
});
