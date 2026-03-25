"""
Pre-encode dataset into cached embeddings using windowed MiniLM.

Strategy: tail-truncate each channel, chunk into 256-token windows,
embed each window with MiniLM, concat window vectors per channel.
This gives a fixed-size vector covering wide context from a tiny model.

Two channels only: user + assistant. System prompt is static noise — dropped.
12 windows per channel (gained from dropping system's 8 windows).

Output: embeddings.npz with shape (N, WINDOWS_PER_CHANNEL * 2 * 384)
train.py loads these and trains the classifier head.

Supports CHECKPOINT/RESUME: saves after each channel completes.

Usage: python encode.py [--dataset dataset-final.jsonl] [--output embeddings.npz]
"""

import argparse
import json
import os
import numpy as np
from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"
MAX_TOKENS = 256  # MiniLM context window
WINDOWS_PER_CHANNEL = 12  # 12 per channel (was 8 — gained from dropping system)
EMBED_DIM = 384  # MiniLM output dimension
MAX_CHARS = 30000  # tail truncation limit per channel
# Rough char-to-token ratio for English text
CHARS_PER_WINDOW = MAX_TOKENS * 4  # ~1024 chars per 256-token window


def text_to_windows(text: str, num_windows: int = WINDOWS_PER_CHANNEL) -> list[str]:
    """Split tail-truncated text into fixed number of windows.

    Takes the last num_windows chunks. Zero-pads (empty string) if
    fewer chunks than slots. This preserves positional meaning:
    window[-1] is always the most recent text.
    """
    chunks = []
    for i in range(0, len(text), CHARS_PER_WINDOW):
        chunks.append(text[i:i + CHARS_PER_WINDOW])

    if not chunks:
        chunks = ["[EMPTY]"]

    if len(chunks) >= num_windows:
        return chunks[-num_windows:]
    else:
        pad_count = num_windows - len(chunks)
        return [""] * pad_count + chunks


def encode_channel(model: SentenceTransformer, texts: list[str],
                   batch_size: int = 256) -> np.ndarray:
    """Encode a channel of texts using windowed embedding.

    For each text: split into windows, embed each, concat.
    Returns (N, WINDOWS_PER_CHANNEL * EMBED_DIM) array.
    """
    all_windows = []
    for text in texts:
        windows = text_to_windows(text)
        all_windows.extend(windows)

    total_windows = len(all_windows)
    print(f"  {total_windows} windows ({len(texts)} texts x {WINDOWS_PER_CHANNEL} windows)")

    all_embeddings = model.encode(
        all_windows,
        batch_size=batch_size,
        show_progress_bar=True,
        normalize_embeddings=True,
    )

    result = all_embeddings.reshape(len(texts), WINDOWS_PER_CHANNEL * EMBED_DIM)
    return result.astype(np.float32)


def encode(args):
    checkpoint_path = args.output.replace(".npz", ".checkpoint.npz")

    print(f"Model: {MODEL_NAME}")
    print(f"Windows per channel: {WINDOWS_PER_CHANNEL}")
    print(f"Chars per window: ~{CHARS_PER_WINDOW}")
    print(f"Max chars (tail truncate): {MAX_CHARS}")
    print(f"Output dim per channel: {WINDOWS_PER_CHANNEL * EMBED_DIM}")
    print(f"Total output dim: {WINDOWS_PER_CHANNEL * EMBED_DIM * 2} (user + assistant)")

    # Check for existing checkpoint
    checkpoint = {}
    if os.path.exists(checkpoint_path):
        checkpoint = dict(np.load(checkpoint_path))
        completed = [k for k in ["user", "assistant"] if k in checkpoint]
        print(f"RESUMING from checkpoint — already have: {', '.join(completed)}")

    # Load dataset
    messages_list = []
    scores = []
    with open(args.dataset) as f:
        for line in f:
            record = json.loads(line)
            messages_list.append(record["messages"])
            scores.append(float(record["score"]))

    print(f"Loaded {len(scores)} samples")
    scores_arr = np.array(scores, dtype=np.float32)

    # Extract text channels — user + assistant only (system is static noise)
    need_user = "user" not in checkpoint
    need_assistant = "assistant" not in checkpoint

    user_texts, asst_texts = [], []
    if need_user or need_assistant:
        print(f"Extracting text channels (last {MAX_CHARS} chars, {WINDOWS_PER_CHANNEL} windows each)...")
        for messages in messages_list:
            usr_parts = [m.get("content", "") for m in messages if m.get("role") == "user"]
            ast_parts = [m.get("content", "") for m in messages if m.get("role") == "assistant"]

            usr_text = " ".join(usr_parts) or "[EMPTY]"
            ast_text = " ".join(ast_parts) or "[EMPTY]"

            user_texts.append(usr_text[-MAX_CHARS:])
            asst_texts.append(ast_text[-MAX_CHARS:])

    # Load model on GPU if available
    print(f"\nLoading {MODEL_NAME}...")
    device = "cuda" if __import__("torch").cuda.is_available() else "cpu"
    model = SentenceTransformer(MODEL_NAME, device=device)

    # Encode each channel with checkpointing (no system — it's static noise)
    if need_user:
        print(f"\nEncoding {len(user_texts)} user messages...")
        checkpoint["user"] = encode_channel(model, user_texts, batch_size=args.batch_size)
        np.savez_compressed(checkpoint_path, **checkpoint, scores=scores_arr)
        print(f"  Checkpoint saved (user done) — shape: {checkpoint['user'].shape}")
    else:
        print(f"User: loaded from checkpoint ({checkpoint['user'].shape})")

    if need_assistant:
        print(f"\nEncoding {len(asst_texts)} assistant messages...")
        checkpoint["assistant"] = encode_channel(model, asst_texts, batch_size=args.batch_size)
        np.savez_compressed(checkpoint_path, **checkpoint, scores=scores_arr)
        print(f"  Checkpoint saved (assistant done) — shape: {checkpoint['assistant'].shape}")
    else:
        print(f"Assistant: loaded from checkpoint ({checkpoint['assistant'].shape})")

    # Save final output (user + assistant only)
    np.savez_compressed(
        args.output,
        user=checkpoint["user"],
        assistant=checkpoint["assistant"],
        scores=scores_arr,
    )

    # Clean up checkpoint
    if os.path.exists(checkpoint_path):
        os.remove(checkpoint_path)
        print("Checkpoint cleaned up")

    total_dim = checkpoint["user"].shape[1] + checkpoint["assistant"].shape[1]
    print(f"\nSaved: {args.output}")
    print(f"  user:      {checkpoint['user'].shape}")
    print(f"  assistant: {checkpoint['assistant'].shape}")
    print(f"  scores:    {scores_arr.shape}")
    print(f"  Total input dim: {total_dim}")
    print(f"  Score range: {scores_arr.min():.2f} — {scores_arr.max():.2f}")
    print(f"  Score mean:  {scores_arr.mean():.2f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default="dataset-final.jsonl")
    parser.add_argument("--output", default="embeddings.npz")
    parser.add_argument("--batch-size", type=int, default=256)
    parser.add_argument("--windows", type=int, default=WINDOWS_PER_CHANNEL)
    args = parser.parse_args()
    WINDOWS_PER_CHANNEL = args.windows
    encode(args)
