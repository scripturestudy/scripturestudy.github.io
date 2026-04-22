/**
 * Lazy-loaded semantic search. Mirrors the old `window.__semanticSearch` API but
 * is scoped to this module (not a window singleton), and uses a dynamic import
 * from the CDN so the main bundle stays small.
 *
 * Public:
 *   init()                  → Promise<void>
 *   scoreAll(query)         → Promise<Float32Array>   cosine score per verse
 *   onStatus(cb)            → unsubscribe
 *   meta                    → async getter → { dim, num_verses, model, ... }
 */
import { dataUrl } from '$lib/utils/url.js';

const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3';
const MODEL_ID = 'onnx-community/embeddinggemma-300m-ONNX';

let pipelinePromise = null;
let embeddingsPromise = null;
let readyPromise = null;
const statusListeners = new Set();

function emit(status) {
  for (const cb of statusListeners) {
    try { cb(status); } catch { /* ignore */ }
  }
}

async function loadPipeline() {
  if (pipelinePromise) return pipelinePromise;
  pipelinePromise = (async () => {
    emit('Loading embedding runtime...');
    const { pipeline } = await import(/* @vite-ignore */ TRANSFORMERS_CDN);
    emit('Downloading EmbeddingGemma (first time only; cached after)...');
    const pipe = await pipeline('feature-extraction', MODEL_ID, { dtype: 'q4' });
    emit('Model ready.');
    return pipe;
  })();
  return pipelinePromise;
}

async function loadEmbeddings() {
  if (embeddingsPromise) return embeddingsPromise;
  embeddingsPromise = (async () => {
    emit('Fetching verse embeddings...');
    const [metaRes, binRes] = await Promise.all([
      fetch(dataUrl('assets/embeddings-meta.json')),
      fetch(dataUrl('assets/embeddings.bin')),
    ]);
    if (!metaRes.ok) throw new Error(`embeddings-meta.json: HTTP ${metaRes.status}`);
    if (!binRes.ok) throw new Error(`embeddings.bin: HTTP ${binRes.status}`);
    const meta = await metaRes.json();
    const buf = await binRes.arrayBuffer();
    const expected = meta.num_verses * meta.dim;
    if (buf.byteLength !== expected) {
      throw new Error(`embeddings.bin size ${buf.byteLength} != expected ${expected}`);
    }
    if (meta.dtype !== 'int8') throw new Error(`unsupported dtype: ${meta.dtype}`);

    const quant = new Int8Array(buf);
    const scale = meta.scale;
    const vectors = new Float32Array(expected);
    for (let i = 0; i < expected; i++) vectors[i] = quant[i] * scale;
    emit(`Index ready: ${meta.num_verses.toLocaleString()} verses @ ${meta.dim}-dim.`);
    return { vectors, meta };
  })();
  return embeddingsPromise;
}

export async function init() {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const [pipe, emb] = await Promise.all([loadPipeline(), loadEmbeddings()]);
    return { pipe, ...emb };
  })();
  return readyPromise;
}

async function embedQuery(text) {
  const { pipe, meta } = await init();
  const prefix = meta.query_prompt || 'task: search result | query: ';
  const output = await pipe(prefix + text, { pooling: 'mean', normalize: true });
  const full = output.data;
  if (full.length === meta.dim) return full;
  if (full.length < meta.dim) throw new Error(`query dim ${full.length} < index dim ${meta.dim}`);
  // Matryoshka truncation: keep first meta.dim components and re-normalize.
  const trunc = new Float32Array(meta.dim);
  for (let i = 0; i < meta.dim; i++) trunc[i] = full[i];
  let norm = 0;
  for (let i = 0; i < meta.dim; i++) norm += trunc[i] * trunc[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < meta.dim; i++) trunc[i] /= norm;
  return trunc;
}

export async function scoreAll(query) {
  const { vectors, meta } = await init();
  const q = await embedQuery(query);
  const dim = meta.dim;
  const n = meta.num_verses;
  const scores = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const base = i * dim;
    let s = 0;
    for (let j = 0; j < dim; j++) s += vectors[base + j] * q[j];
    scores[i] = s;
  }
  return scores;
}

export function onStatus(cb) {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}

export function isReady() {
  return readyPromise !== null && embeddingsPromise !== null;
}
