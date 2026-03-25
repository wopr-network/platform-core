"""
Pre-encode dataset into cached embeddings using Ollama.

Runs ONCE. Saves raw per-channel embeddings + scores to embeddings.npz.
train.py loads these and applies weights/normalization at training time.

Usage: python encode.py [--dataset dataset-final.jsonl] [--output embeddings.npz]

Requires: ollama running locally with qwen3-embedding model
  docker run -d --name ollama-embed --gpus all -v wopr_ollama-data:/root/.ollama -p 11434:11434 ollama/ollama
"""

import argparse
import json
import requests
import numpy as np
from typing import List

OLLAMA_URL = "http://localhost:11434/api/embed"
MODEL = "qwen3-embedding:0.6b"


def embed_batch(texts: List[str], batch_size: int = 32) -> np.ndarray:
    """Encode texts via Ollama embedding API in batches."""
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        resp = requests.post(OLLAMA_URL, json={"model": MODEL, "input": batch})
        resp.raise_for_status()
        data = resp.json()
        all_embeddings.extend(data["embeddings"])
        done = min(i + batch_size, len(texts))
        print(f"  {done}/{len(texts)} ({done * 100 // len(texts)}%)")
    return np.array(all_embeddings, dtype=np.float32)


def encode(args):
    # Verify ollama is running
    try:
        test = requests.post(OLLAMA_URL, json={"model": MODEL, "input": ["test"]})
        test.raise_for_status()
        dim = len(test.json()["embeddings"][0])
        print(f"Model: {MODEL}, dim: {dim}")
    except Exception as e:
        print(f"ERROR: Cannot reach ollama at {OLLAMA_URL}: {e}")
        print("Start ollama: docker run -d --name ollama-embed --gpus all -v wopr_ollama-data:/root/.ollama -p 11434:11434 ollama/ollama")
        return

    # Load dataset
    messages_list = []
    scores = []
    with open(args.dataset) as f:
        for line in f:
            record = json.loads(line)
            messages_list.append(record["messages"])
            scores.append(float(record["score"]))

    print(f"Loaded {len(scores)} samples")

    # Extract text channels — NO truncation, let the 32K context model handle it
    print("Extracting text channels...")
    system_texts, user_texts, asst_texts = [], [], []
    for messages in messages_list:
        system_texts.append(" ".join([m.get("content", "") for m in messages if m.get("role") == "system"]) or "[EMPTY]")
        user_texts.append(" ".join([m.get("content", "") for m in messages if m.get("role") == "user"]) or "[EMPTY]")
        asst_texts.append(" ".join([m.get("content", "") for m in messages if m.get("role") == "assistant"]) or "[EMPTY]")

    # Encode each channel
    print(f"\nEncoding {len(system_texts)} system prompts...")
    system_embs = embed_batch(system_texts, batch_size=args.batch_size)

    print(f"\nEncoding {len(user_texts)} user messages...")
    user_embs = embed_batch(user_texts, batch_size=args.batch_size)

    print(f"\nEncoding {len(asst_texts)} assistant messages...")
    asst_embs = embed_batch(asst_texts, batch_size=args.batch_size)

    scores_arr = np.array(scores, dtype=np.float32)

    # Save raw embeddings — NO weights applied, NO normalization
    np.savez_compressed(
        args.output,
        system=system_embs,
        user=user_embs,
        assistant=asst_embs,
        scores=scores_arr,
    )

    print(f"\nSaved: {args.output}")
    print(f"  system:    {system_embs.shape}")
    print(f"  user:      {user_embs.shape}")
    print(f"  assistant: {asst_embs.shape}")
    print(f"  scores:    {scores_arr.shape}")
    print(f"  Score range: {scores_arr.min():.2f} — {scores_arr.max():.2f}")
    print(f"  Score mean:  {scores_arr.mean():.2f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default="dataset-final.jsonl")
    parser.add_argument("--output", default="embeddings.npz")
    parser.add_argument("--batch-size", type=int, default=32)
    encode(parser.parse_args())
