# Embedding pipeline

Offline generator for `assets/embeddings.bin` — the per-verse embeddings the
browser loads when "Semantic search" is enabled.

## One-time setup

Requires [uv](https://docs.astral.sh/uv/) (`brew install uv` or see the
[install docs](https://docs.astral.sh/uv/getting-started/installation/)).

```bash
cd embed
uv sync
```

EmbeddingGemma is a gated model. You must:
1. Accept the license at <https://huggingface.co/google/embeddinggemma-300m>
2. `uv run hf auth login`

## Build

```bash
uv run python build_embeddings.py              # default: dim=256, ~11 MB output
uv run python build_embeddings.py --dim 128    # smaller: ~5.4 MB, slight quality loss
uv run python build_embeddings.py --dim 768    # full: ~32 MB
uv run python build_embeddings.py --limit 100  # smoke test
```

Outputs:
- `../assets/embeddings.bin` — int8, row-major `(num_verses, dim)`
- `../assets/embeddings-meta.json` — model, dim, scale, prompt names

Row `i` corresponds to `lds-scriptures.json[i]`. The browser loads both in lockstep.

## Runtime contract

The browser code in `semantic-search.js` assumes:
- Vectors are **unit-normalized** before quantization
- `dtype = "int8"`, `scale = 1/127` → `float(x) = int8(x) * scale`
- Row `i` ↔ `lds-scriptures.json[i]`
- `meta.query_prompt` is the exact string the browser prepends to user queries
  before embedding. The Python pipeline applies `meta.doc_prompt` to each verse.
  Keeping both prefixes in the meta file (rather than hardcoded separately)
  ensures parity across regenerations.

If you change the dim or model, regenerate and the browser picks up the new
meta on next load. Bump `CACHE_NAME` in `sw.js` so returning users re-fetch.
