#!/usr/bin/env python3
"""
Offline embedding pipeline for scripture semantic search.

Reads lds-scriptures.json, embeds each verse with google/embeddinggemma-300m,
truncates to a Matryoshka dimension, L2-normalizes, int8-quantizes, and writes
assets/embeddings.bin + assets/embeddings-meta.json.

Usage:
    pip install -r requirements.txt
    huggingface-cli login   # EmbeddingGemma is gated; accept license on HF first
    python build_embeddings.py --dim 256 --batch-size 32

Outputs (row-major, verse order matches lds-scriptures.json):
    assets/embeddings.bin        int8, shape (N, dim), N*dim bytes
    assets/embeddings-meta.json  model + quantization metadata

Browser dequant: float(x) = int8(x) * scale  where scale = 1/127.
Since vectors are unit-normalized, max abs component <= 1, so int8 covers full range.
"""

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

ROOT = Path(__file__).resolve().parent.parent
SCRIPTURES_JSON = ROOT / "lds-scriptures.json"
OUT_DIR = ROOT / "assets"
OUT_BIN = OUT_DIR / "embeddings.bin"
OUT_META = OUT_DIR / "embeddings-meta.json"

MODEL_ID = "google/embeddinggemma-300m"
# Explicit task prefixes from the EmbeddingGemma model card. Kept as literal
# strings (rather than using SentenceTransformer's prompt_name) so the JS side
# can apply the identical prefix without depending on a library version.
DOC_PROMPT = "title: none | text: "
QUERY_PROMPT = "task: search result | query: "  # for reference; applied in browser


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--dim", type=int, default=256, choices=[128, 256, 512, 768],
                   help="Matryoshka output dimension (default: 256).")
    p.add_argument("--batch-size", type=int, default=32, help="Embedding batch size.")
    p.add_argument("--device", type=str, default=None,
                   help="torch device (cuda, mps, cpu). Default: auto.")
    p.add_argument("--limit", type=int, default=None,
                   help="Only embed the first N verses (for smoke tests).")
    return p.parse_args()


def pick_device(requested: str | None) -> str:
    if requested:
        return requested
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
        if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return "mps"
    except Exception:
        pass
    return "cpu"


def main() -> int:
    args = parse_args()

    if not SCRIPTURES_JSON.exists():
        print(f"error: {SCRIPTURES_JSON} not found", file=sys.stderr)
        return 1

    print(f"Loading verses from {SCRIPTURES_JSON}...")
    with SCRIPTURES_JSON.open() as f:
        verses = json.load(f)
    if args.limit:
        verses = verses[: args.limit]
    texts = [v["scripture_text"] for v in verses]
    print(f"  {len(texts):,} verses")

    device = pick_device(args.device)
    print(f"Loading model {MODEL_ID} on {device}...")
    model = SentenceTransformer(MODEL_ID, device=device, truncate_dim=args.dim)

    print(f"Embedding {len(texts):,} verses (dim={args.dim}, batch={args.batch_size})...")
    print(f"  applying document prefix: {DOC_PROMPT!r}")
    prefixed = [DOC_PROMPT + t for t in texts]
    t0 = time.time()
    emb = model.encode(
        prefixed,
        batch_size=args.batch_size,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=True,
    ).astype(np.float32)
    elapsed = time.time() - t0
    print(f"  done in {elapsed:.1f}s ({len(texts)/elapsed:.1f} verses/s)")

    if emb.shape != (len(texts), args.dim):
        print(f"error: unexpected embedding shape {emb.shape}", file=sys.stderr)
        return 1

    # Sanity: unit-normalized
    norms = np.linalg.norm(emb, axis=1)
    if not np.allclose(norms, 1.0, atol=1e-3):
        print(f"warning: norms not ~1 (min={norms.min():.4f}, max={norms.max():.4f}); re-normalizing")
        emb = emb / np.clip(norms, 1e-9, None)[:, None]

    max_abs = float(np.abs(emb).max())
    print(f"  max abs component: {max_abs:.4f} (should be < 1)")

    # Quantize to int8 with scale = 1/127.
    scale = 1.0 / 127.0
    quant = np.clip(np.round(emb / scale), -127, 127).astype(np.int8)

    # Reconstruct to measure quantization error.
    reconstructed = quant.astype(np.float32) * scale
    recon_sim = (emb * reconstructed).sum(axis=1) / (
        np.linalg.norm(emb, axis=1) * np.linalg.norm(reconstructed, axis=1)
    )
    print(f"  post-quant cosine similarity: mean={recon_sim.mean():.4f}, min={recon_sim.min():.4f}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_BIN.write_bytes(quant.tobytes())
    size_mb = OUT_BIN.stat().st_size / (1024 * 1024)
    print(f"Wrote {OUT_BIN} ({size_mb:.2f} MB)")

    meta = {
        "model": MODEL_ID,
        "num_verses": len(texts),
        "dim": args.dim,
        "dtype": "int8",
        "scale": scale,
        "doc_prompt": DOC_PROMPT,
        "query_prompt": QUERY_PROMPT,
        "normalized": True,
        "order": "row-major; row i corresponds to lds-scriptures.json[i]",
        "recon_cosine_mean": float(recon_sim.mean()),
        "recon_cosine_min": float(recon_sim.min()),
    }
    OUT_META.write_text(json.dumps(meta, indent=2) + "\n")
    print(f"Wrote {OUT_META}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
