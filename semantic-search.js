// Semantic search module. Lazy-loaded on first use of the "Semantic search" toggle.
//
// Public surface (attached to window.__semanticSearch):
//   init()              -> Promise<void>          prepares model + embeddings (cached after first call)
//   isReady()           -> boolean
//   scoreAll(query)     -> Promise<Float32Array>  cosine-similarity per verse, aligned with lds-scriptures.json order
//   onStatus(cb)        -> (status:string) => void  UI hook for progress messages
//   meta                -> { dim, num_verses, model }
//
// Design:
//   - EmbeddingGemma ONNX (q4 weights) via transformers.js v3, running on WASM/WebGPU.
//   - Per-verse int8 vectors (unit-normalized, scale=1/127) dequantized once into a single
//     Float32Array for cache-friendly dot products. 42k * 256 * 4 = ~43 MB in memory.
//   - No index structure; brute-force loop. ~20-40 ms on a modern laptop.

const TRANSFORMERS_CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3";
const MODEL_ID = "onnx-community/embeddinggemma-300m-ONNX";
const EMBEDDINGS_URL = "assets/embeddings.bin";
const META_URL = "assets/embeddings-meta.json";

let pipelinePromise = null;    // Promise<FeatureExtractionPipeline>
let embeddingsPromise = null;  // Promise<{ vectors: Float32Array, meta: object }>
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
    emit("Loading embedding runtime...");
    const { pipeline } = await import(/* @vite-ignore */ TRANSFORMERS_CDN);
    emit("Downloading EmbeddingGemma (first time only; cached after)...");
    const pipe = await pipeline("feature-extraction", MODEL_ID, {
      dtype: "q4",
    });
    emit("Model ready.");
    return pipe;
  })();
  return pipelinePromise;
}

async function loadEmbeddings() {
  if (embeddingsPromise) return embeddingsPromise;
  embeddingsPromise = (async () => {
    emit("Fetching verse embeddings...");
    const [metaRes, binRes] = await Promise.all([
      fetch(META_URL),
      fetch(EMBEDDINGS_URL),
    ]);
    if (!metaRes.ok) throw new Error(`embeddings-meta.json: HTTP ${metaRes.status}`);
    if (!binRes.ok) throw new Error(`embeddings.bin: HTTP ${binRes.status}`);
    const meta = await metaRes.json();
    const buf = await binRes.arrayBuffer();

    const expected = meta.num_verses * meta.dim;
    if (buf.byteLength !== expected) {
      throw new Error(`embeddings.bin size ${buf.byteLength} != expected ${expected} (num_verses*dim)`);
    }
    if (meta.dtype !== "int8") {
      throw new Error(`unsupported dtype in meta: ${meta.dtype}`);
    }

    const quant = new Int8Array(buf);
    const scale = meta.scale;
    const vectors = new Float32Array(expected);
    for (let i = 0; i < expected; i++) vectors[i] = quant[i] * scale;

    emit(`Index ready: ${meta.num_verses.toLocaleString()} verses @ ${meta.dim}-dim.`);
    return { vectors, meta };
  })();
  return embeddingsPromise;
}

async function init() {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const [pipe, emb] = await Promise.all([loadPipeline(), loadEmbeddings()]);
    return { pipe, ...emb };
  })();
  return readyPromise;
}

function isReady() {
  return readyPromise !== null && embeddingsPromise !== null;
}

async function embedQuery(text) {
  const { pipe, meta } = await init();
  // Query prefix comes from embeddings-meta.json so it stays in lockstep with
  // the Python pipeline that built the index.
  const prefix = meta.query_prompt || "task: search result | query: ";
  const output = await pipe(prefix + text, {
    pooling: "mean",
    normalize: true,
  });
  const full = output.data; // Float32Array, length = native dim (768 for EmbeddingGemma)
  if (full.length === meta.dim) return full;
  if (full.length < meta.dim) {
    throw new Error(`query dim ${full.length} < index dim ${meta.dim}`);
  }
  // Matryoshka truncation: take first meta.dim components, then re-normalize.
  const trunc = new Float32Array(meta.dim);
  for (let i = 0; i < meta.dim; i++) trunc[i] = full[i];
  let norm = 0;
  for (let i = 0; i < meta.dim; i++) norm += trunc[i] * trunc[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < meta.dim; i++) trunc[i] /= norm;
  return trunc;
}

async function scoreAll(query) {
  const { vectors, meta } = await init();
  const q = await embedQuery(query);
  const dim = meta.dim;
  const n = meta.num_verses;
  const scores = new Float32Array(n);
  // Tight dot-product loop. Both sides are unit-normalized -> dot == cosine.
  for (let i = 0; i < n; i++) {
    const base = i * dim;
    let s = 0;
    for (let j = 0; j < dim; j++) s += vectors[base + j] * q[j];
    scores[i] = s;
  }
  return scores;
}

function onStatus(cb) {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}

window.__semanticSearch = {
  init,
  isReady,
  scoreAll,
  onStatus,
  get meta() { return embeddingsPromise ? embeddingsPromise.then(e => e.meta) : null; },
};
