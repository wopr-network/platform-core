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
# SentenceTransformer encoding is now in encode.py — train.py loads cached embeddings


class PromptDataset(Dataset):
    """Dataset loaded from pre-cached embeddings (embeddings.npz).

    Channel weights and normalization are applied here — these are
    the parameters autoresearch should evolve.
    """

    # === EVOLVABLE PARAMETERS ===
    SYSTEM_WEIGHT = 0.3
    USER_WEIGHT = 1.0
    ASSISTANT_WEIGHT = 1.2
    NORMALIZE = "l2"  # "none", "l2", "zscore", "minmax"

    def __init__(self, path: str):
        data = np.load(path)
        system_embs = data["system"]
        user_embs = data["user"]
        asst_embs = data["assistant"]
        self.scores = data["scores"]

        print(f"Loaded {len(self.scores)} samples from cache")
        print(f"Channel weights: system={self.SYSTEM_WEIGHT}, user={self.USER_WEIGHT}, assistant={self.ASSISTANT_WEIGHT}")
        print(f"Normalization: {self.NORMALIZE}")

        # Apply channel weights
        weighted_system = system_embs * self.SYSTEM_WEIGHT
        weighted_user = user_embs * self.USER_WEIGHT
        weighted_asst = asst_embs * self.ASSISTANT_WEIGHT

        # Concatenate channels
        self.embeddings = np.concatenate([weighted_system, weighted_user, weighted_asst], axis=1)

        # Apply normalization
        if self.NORMALIZE == "l2":
            norms = np.linalg.norm(self.embeddings, axis=1, keepdims=True)
            norms[norms == 0] = 1
            self.embeddings = self.embeddings / norms
        elif self.NORMALIZE == "zscore":
            mean = self.embeddings.mean(axis=0, keepdims=True)
            std = self.embeddings.std(axis=0, keepdims=True)
            std[std == 0] = 1
            self.embeddings = (self.embeddings - mean) / std
        elif self.NORMALIZE == "minmax":
            mn = self.embeddings.min(axis=0, keepdims=True)
            mx = self.embeddings.max(axis=0, keepdims=True)
            rng = mx - mn
            rng[rng == 0] = 1
            self.embeddings = (self.embeddings - mn) / rng

        self.embeddings = self.embeddings.astype(np.float32)
        print(f"Embeddings shape: {self.embeddings.shape}")

    def __len__(self):
        return len(self.scores)

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

    # Load cached embeddings (run encode.py first)
    dataset = PromptDataset(args.dataset)

    # Get embedding dimension from cached data
    actual_embedding_dim = dataset.embeddings.shape[1]
    print(f"Embedding dimension: {actual_embedding_dim}")

    # Split 70/30 — larger validation set for more reliable MAE measurement
    train_size = int(0.7 * len(dataset))
    val_size = len(dataset) - train_size
    train_set, val_set = random_split(dataset, [train_size, val_size], generator=torch.Generator().manual_seed(42))

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

    # === TWO-PHASE TRAINING ===
    # Phase 1 (PROBE): Train for probe_epochs. Check if loss trajectory is declining.
    #   If flat (<1% improvement): ABORT early. Don't waste time on dead ends.
    # Phase 2 (EXPLOIT): If promising, train remaining epochs.
    # DO NOT REMOVE THIS TWO-PHASE LOGIC. It is critical for autoresearch exploration.

    probe_epochs = args.probe_epochs
    best_val_mae = float("inf")
    mae_history = []

    def run_epoch(epoch_num):
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
        avg_loss = train_loss / len(train_loader)
        print(f"Epoch {epoch_num}/{args.epochs} — loss: {avg_loss:.4f}, val MAE: {val_mae:.4f}")
        return val_mae

    # Phase 1: Probe
    print(f"\n=== PHASE 1: PROBE ({probe_epochs} epochs) ===")
    for epoch in range(1, probe_epochs + 1):
        val_mae = run_epoch(epoch)
        mae_history.append(val_mae)
        if val_mae < best_val_mae:
            best_val_mae = val_mae
            torch.save(model.state_dict(), "best_head.pt")

    # Check trajectory
    if len(mae_history) >= 3:
        first_half = np.mean(mae_history[:len(mae_history)//2])
        second_half = np.mean(mae_history[len(mae_history)//2:])
        improvement_rate = (first_half - second_half) / first_half
        print(f"\nProbe: first_half={first_half:.4f}, second_half={second_half:.4f}, improvement={improvement_rate:.2%}")

        if improvement_rate < 0.01:
            print(f"ABORT: trajectory too flat ({improvement_rate:.2%}). Skipping full training.")
            print(f"\nBest val MAE: {best_val_mae:.4f}")
            print(f"PROBE_ABORTED: True")
        else:
            print(f"PROMISING: {improvement_rate:.2%} improvement. Full training.")
            remaining = args.epochs - probe_epochs
            print(f"\n=== PHASE 2: FULL TRAINING ({remaining} more epochs) ===")
            for epoch in range(probe_epochs + 1, args.epochs + 1):
                val_mae = run_epoch(epoch)
                mae_history.append(val_mae)
                if val_mae < best_val_mae:
                    best_val_mae = val_mae
                    torch.save(model.state_dict(), "best_head.pt")
            print(f"\nBest val MAE: {best_val_mae:.4f}")
    else:
        for epoch in range(probe_epochs + 1, args.epochs + 1):
            val_mae = run_epoch(epoch)
            mae_history.append(val_mae)
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
    parser.add_argument("--dataset", default="embeddings.npz")
    parser.add_argument("--output", default="../../models/prompt-classifier.onnx")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--probe-epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=128)
    parser.add_argument("--lr", type=float, default=3e-4)
    train(parser.parse_args())
