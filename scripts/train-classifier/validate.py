"""
Validate the trained ONNX classifier against holdout data.

Usage: python validate.py [--model ../../models/prompt-classifier.onnx] [--dataset dataset.jsonl]
"""

import argparse
import json

import numpy as np
import onnxruntime as ort
from sentence_transformers import SentenceTransformer


def main(args):
    # Load encoder + ONNX model
    encoder = SentenceTransformer("all-MiniLM-L6-v2")
    session = ort.InferenceSession(args.model)

    # Load dataset
    texts, scores = [], []
    with open(args.dataset) as f:
        for line in f:
            record = json.loads(line)
            parts = []
            for msg in record["messages"]:
                if msg["role"] in ("system", "user"):
                    parts.append(msg["content"])
            texts.append(" ".join(parts)[:2048])
            scores.append(float(record["score"]))

    # Encode + predict
    embeddings = encoder.encode(texts, show_progress_bar=True, convert_to_numpy=True)
    preds = session.run(["score"], {"embedding": embeddings.astype(np.float32)})[0]

    true = np.array(scores)
    pred = preds.flatten()

    # Metrics
    mae = np.mean(np.abs(pred - true))
    rmse = np.sqrt(np.mean((pred - true) ** 2))
    print(f"MAE:  {mae:.4f}")
    print(f"RMSE: {rmse:.4f}")
    print(f"Target MAE < 0.1: {'PASS' if mae < 0.1 else 'FAIL'}")

    # Per-band accuracy (within 0.15 of true score)
    print("\nPer-band accuracy (within 0.15):")
    for band in [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]:
        mask = np.abs(true - band) < 0.05
        if mask.sum() == 0:
            continue
        band_pred = pred[mask]
        band_true = true[mask]
        acc = np.mean(np.abs(band_pred - band_true) < 0.15)
        print(f"  {band:.1f}: {acc:.1%} ({mask.sum()} samples)")

    # Score distribution
    print("\nPredicted score distribution:")
    for lo in [0.0, 0.25, 0.5, 0.75]:
        hi = lo + 0.25
        count = np.sum((pred >= lo) & (pred < hi))
        print(f"  {lo:.2f}–{hi:.2f}: {count} ({count/len(pred):.1%})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="../../models/prompt-classifier.onnx")
    parser.add_argument("--dataset", default="dataset.jsonl")
    main(parser.parse_args())
