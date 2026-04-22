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

export default defineConfig({
  plugins: [svelte(), serveRepoRootData()],
  resolve: {
    alias: {
      $lib: path.resolve(here, 'src/lib'),
    },
  },
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: true,
  },
});
