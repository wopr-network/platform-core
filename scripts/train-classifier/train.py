"""
Train a prompt complexity classifier.

Input: dataset.jsonl — {messages: [{role, content}], score: float}
Output: prompt-classifier.onnx — ONNX model (embedding + regression head)

Usage: python train.py [--epochs 5] [--batch-size 32] [--output ../../models/prompt-classifier.onnx]
"""

import argparse
import json
import os
import hashlib

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset, random_split
from sentence_transformers import SentenceTransformer


class PromptDataset(Dataset):
    """Dataset of prompts with complexity scores."""

    def __init__(self, path: str, encoder: SentenceTransformer):
        self.samples = []
        self.encoder = encoder

        with open(path) as f:
            for line in f:
                record = json.loads(line)
                text = self._extract_text(record["messages"])
                score = float(record["score"])
                self.samples.append((text, score))

        print(f"Loaded {len(self.samples)} samples")

        # Pre-encode all texts
        texts = [s[0] for s in self.samples]
        print("Encoding texts...")
        self.embeddings = encoder.encode(texts, show_progress_bar=True, convert_to_numpy=True)
        self.scores = np.array([s[1] for s in self.samples], dtype=np.float32)

    def _extract_text(self, messages: list) -> str:
        """Extract text with exponential weighting towards recent messages and structural signals."""
        parts = []

        # Count turns and extract tool call signals
        turn_count = len([m for m in messages if m["role"] == "user"])
        tool_call_count = sum(1 for m in messages if m["role"] == "assistant" and "tool_use" in m.get("content", ""))

        # Exponentially weight recent messages (more recent = higher weight)
        n_msgs = len(messages)
        weights = {}
        for i, msg in enumerate(messages):
            # Exponential weight: earlier messages get lower weight
            weight = 2.0 ** (i / max(1, n_msgs - 1))  # 1.0 to 2.0 range
            weights[i] = weight

        max_weight = weights[n_msgs - 1] if n_msgs > 0 else 1.0

        # Extract features by role with weighting
        for i, msg in enumerate(messages):
            role = msg["role"]
            content = msg.get("content", "")

            if role == "system":
                parts.append(f"[SYSTEM] {content}")
            elif role == "user":
                weight = weights.get(i, 1.0)
                # Repeat recent user messages to give them more weight
                repeat_count = max(1, int(weight))
                parts.append(f"[USER {int(weight)}x] {content}" * repeat_count)
            elif role == "assistant":
                weight = weights.get(i, 1.0)
                repeat_count = max(1, int(weight))
                # Highlight tool usage
                tool_marker = "[TOOLS]" if "tool_use" in content else ""
                parts.append(f"[ASST {int(weight)}x] {tool_marker} {content}"[:1024] * repeat_count)

        # Add structural features as prefix
        structural = f"[TURNS:{turn_count}] [TOOLS:{tool_call_count}] [LEN:{len(messages)}]"
        return (structural + " " + " ".join(parts))[:2048]

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        return (
            torch.tensor(self.embeddings[idx], dtype=torch.float32),
            torch.tensor(self.scores[idx], dtype=torch.float32),
        )


class ComplexityHead(nn.Module):
    """Single regression head on top of sentence embeddings."""

    def __init__(self, input_dim: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(128, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        return self.net(x).squeeze(-1)


def train(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    # Load encoder (frozen — we only train the head)
    encoder = SentenceTransformer("all-MiniLM-L6-v2")
    embedding_dim = encoder.get_sentence_embedding_dimension()

    # Load dataset
    dataset = PromptDataset(args.dataset, encoder)

    # Split 80/20
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_set, val_set = random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_set, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_set, batch_size=args.batch_size)

    # Model
    model = ComplexityHead(embedding_dim).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-5)
    criterion = nn.HuberLoss(delta=0.1, reduction='mean')

    # Train
    best_val_mae = float("inf")
    for epoch in range(args.epochs):
        model.train()
        train_loss = 0
        for embeddings, scores in train_loader:
            embeddings, scores = embeddings.to(device), scores.to(device)
            pred = model(embeddings)
            loss = criterion(pred, scores)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            train_loss += loss.item()

        # Validate
        model.eval()
        val_preds, val_true = [], []
        with torch.no_grad():
            for embeddings, scores in val_loader:
                embeddings = embeddings.to(device)
                pred = model(embeddings)
                val_preds.extend(pred.cpu().numpy())
                val_true.extend(scores.numpy())

        val_mae = np.mean(np.abs(np.array(val_preds) - np.array(val_true)))
        print(f"Epoch {epoch+1}/{args.epochs} — loss: {train_loss/len(train_loader):.4f}, val MAE: {val_mae:.4f}")

        if val_mae < best_val_mae:
            best_val_mae = val_mae
            torch.save(model.state_dict(), "best_head.pt")

    print(f"\nBest val MAE: {best_val_mae:.4f}")

    # Export to ONNX
    model.load_state_dict(torch.load("best_head.pt", weights_only=True))
    model.eval()
    model.to("cpu")

    dummy = torch.randn(1, embedding_dim)
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    torch.onnx.export(
        model,
        dummy,
        args.output,
        input_names=["embedding"],
        output_names=["score"],
        dynamic_axes={"embedding": {0: "batch"}, "score": {0: "batch"}},
        opset_version=17,
    )
    print(f"Exported: {args.output}")

    # SHA-256 checksum
    sha = hashlib.sha256(open(args.output, "rb").read()).hexdigest()
    sha_path = args.output.replace(".onnx", ".sha256")
    with open(sha_path, "w") as f:
        f.write(sha)
    print(f"Checksum: {sha_path} ({sha[:16]}...)")

    # Cleanup
    os.remove("best_head.pt")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default="dataset.jsonl")
    parser.add_argument("--output", default="../../models/prompt-classifier.onnx")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--lr", type=float, default=1e-3)
    train(parser.parse_args())
