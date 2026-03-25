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
        self.raw_messages = []

        with open(path) as f:
            for line in f:
                record = json.loads(line)
                messages = record["messages"]
                score = float(record["score"])
                self.samples.append((messages, score))
                self.raw_messages.append(messages)

        print(f"Loaded {len(self.samples)} samples")

        # Pre-encode all texts with batched multi-channel approach
        print("Extracting text channels...")
        system_texts, user_texts, asst_texts = [], [], []
        for messages in self.raw_messages:
            system_texts.append(" ".join([m.get("content", "")[:1000] for m in messages if m.get("role") == "system"]) or "[EMPTY]")
            user_texts.append(" ".join([m.get("content", "")[:1000] for m in messages if m.get("role") == "user"]) or "[EMPTY]")
            asst_texts.append(" ".join([m.get("content", "")[:1000] for m in messages if m.get("role") == "assistant"]) or "[EMPTY]")

        print(f"Encoding {len(system_texts)} system prompts...")
        system_embs = encoder.encode(system_texts, show_progress_bar=True, convert_to_numpy=True, batch_size=256)
        print(f"Encoding {len(user_texts)} user messages...")
        user_embs = encoder.encode(user_texts, show_progress_bar=True, convert_to_numpy=True, batch_size=256)
        print(f"Encoding {len(asst_texts)} assistant messages...")
        asst_embs = encoder.encode(asst_texts, show_progress_bar=True, convert_to_numpy=True, batch_size=256)

        # Weight and concatenate channels
        self.embeddings = np.concatenate([
            system_embs * 0.3,
            user_embs * 1.0,
            asst_embs * 1.2,
        ], axis=1).astype(np.float32)
        self.scores = np.array([s[1] for s in self.samples], dtype=np.float32)
        print(f"Embeddings shape: {self.embeddings.shape}")


    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        return (
            torch.tensor(self.embeddings[idx], dtype=torch.float32),
            torch.tensor(self.scores[idx], dtype=torch.float32),
        )


class ResidualBlock(nn.Module):
    """Pre-norm residual: LayerNorm → expand → GELU → contract → add."""

    def __init__(self, dim: int, expand: int = 4, dropout: float = 0.1):
        super().__init__()
        self.norm = nn.LayerNorm(dim)
        self.ff = nn.Sequential(
            nn.Linear(dim, dim * expand),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(dim * expand, dim),
            nn.Dropout(dropout),
        )

    def forward(self, x):
        return x + self.ff(self.norm(x))


class ComplexityHead(nn.Module):
    """Autoencoder complexity scorer.

    Encoder: input → 512 → 256 → 64 bottleneck (compact complexity representation)
    Decoder: 64 → 256 → 512 → input (reconstruction, auxiliary loss)
    Scorer: bottleneck → 4 residual blocks → prediction

    The autoencoder forces the model to learn what MATTERS about the input.
    The scorer predicts from that compressed representation.
    """

    def __init__(self, input_dim: int):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 512),
            nn.LayerNorm(512),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(512, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(256, 64),
            nn.LayerNorm(64),
            nn.GELU(),
        )

        self.decoder = nn.Sequential(
            nn.Linear(64, 256),
            nn.GELU(),
            nn.Linear(256, 512),
            nn.GELU(),
            nn.Linear(512, input_dim),
        )

        self.scorer = nn.Sequential(
            ResidualBlock(64, expand=4, dropout=0.1),
            ResidualBlock(64, expand=4, dropout=0.1),
            ResidualBlock(64, expand=4, dropout=0.05),
            ResidualBlock(64, expand=4, dropout=0.05),
            nn.LayerNorm(64),
            nn.Linear(64, 32),
            nn.GELU(),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

        self._mode = "score_only"  # or "with_reconstruction"

    def forward(self, x):
        z = self.encoder(x)
        score = self.scorer(z).squeeze(-1)
        if self._mode == "with_reconstruction":
            return score, self.decoder(z)
        return score


def train(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    # Load encoder (frozen — we only train the head)
    encoder = SentenceTransformer("all-MiniLM-L6-v2")
    embedding_dim = encoder.get_sentence_embedding_dimension()

    # Load dataset
    dataset = PromptDataset(args.dataset, encoder)

    # Get actual embedding dimension from dataset (multi-channel = 3 * embedding_dim)
    actual_embedding_dim = dataset.embeddings.shape[1]
    print(f"Embedding dimension: {actual_embedding_dim} (multi-channel: 3x{embedding_dim})")

    # Split 80/20
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_set, val_set = random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_set, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_set, batch_size=args.batch_size)

    # Model
    model = ComplexityHead(actual_embedding_dim).to(device)
    model._mode = "with_reconstruction"
    param_count = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Model parameters: {param_count:,}")

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)
    score_criterion = nn.HuberLoss(delta=0.05)
    recon_criterion = nn.MSELoss()
    recon_weight = 0.05  # auxiliary loss weight

    # Train
    best_val_mae = float("inf")
    for epoch in range(args.epochs):
        model.train()
        model._mode = "with_reconstruction"
        train_loss = 0
        for embeddings, scores in train_loader:
            embeddings, scores = embeddings.to(device), scores.to(device)
            pred, recon = model(embeddings)
            loss = score_criterion(pred, scores) + recon_weight * recon_criterion(recon, embeddings)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
        scheduler.step()

        # Validate (score only, no reconstruction)
        model.eval()
        model._mode = "score_only"
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

    # Export to ONNX (score-only mode, no reconstruction branch)
    model.load_state_dict(torch.load("best_head.pt", weights_only=True))
    model.eval()
    model._mode = "score_only"
    model.to("cpu")

    dummy = torch.randn(1, actual_embedding_dim)
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
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch-size", type=int, default=128)
    parser.add_argument("--lr", type=float, default=3e-4)
    train(parser.parse_args())
