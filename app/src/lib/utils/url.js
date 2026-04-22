/**
 * Resolve a data file path. We assume the app is co-deployed at the same origin
 * as the data files (e.g., app at /app/, data at /). In dev, Vite middleware
 * serves these from the repo root.
 */
export function dataUrl(path) {
  const clean = path.startsWith('/') ? path : '/' + path;
  return clean;
}
