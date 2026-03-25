# Smart Model Router — Plan 1: Dataset Generation + Training

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a synthetic training dataset with Haiku, train a prompt complexity classifier on a 3070, export as ONNX.

**Architecture:** TypeScript script calls claude-haiku-4-5 to generate ~15K labeled prompt/score pairs. Python script fine-tunes all-MiniLM-L6-v2 + regression head on the dataset. ONNX export produces a ~20MB model file for gateway integration.

**Tech Stack:** @anthropic-ai/sdk (TS), PyTorch, sentence-transformers, onnxruntime (Python), 3070 GPU

**Spec:** `docs/specs/2026-03-24-smart-model-router.md`

---

## File Map

### New files

| File | Purpose |
|------|---------|
| `scripts/train-classifier/generate-dataset.ts` | Calls Haiku to generate labeled prompts |
| `scripts/train-classifier/tsconfig.json` | TS config for the script |
| `scripts/train-classifier/package.json` | Dependencies (@anthropic-ai/sdk) |
| `scripts/train-classifier/train.py` | Fine-tunes sentence-transformer + regression head |
| `scripts/train-classifier/validate.py` | Holdout validation, MAE, score distribution |
| `scripts/train-classifier/requirements.txt` | Python deps (torch, sentence-transformers, onnx) |
| `scripts/train-classifier/dataset.jsonl` | Generated dataset (gitignored) |
| `models/prompt-classifier.onnx` | Trained model artifact |
| `models/prompt-classifier.sha256` | SHA-256 checksum for integrity verification |

---

### Task 1: Scaffold the training scripts directory

**Files:**
- Create: `scripts/train-classifier/package.json`
- Create: `scripts/train-classifier/tsconfig.json`
- Create: `scripts/train-classifier/requirements.txt`
- Create: `scripts/train-classifier/.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "train-classifier",
  "private": true,
  "type": "module",
  "scripts": {
    "generate": "npx tsx generate-dataset.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.52.0",
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["*.ts"]
}
```

- [ ] **Step 3: Create requirements.txt**

```
torch>=2.5.0
sentence-transformers>=4.0.0
onnx>=1.17.0
onnxruntime>=1.20.0
numpy>=2.0.0
scikit-learn>=1.6.0
matplotlib>=3.10.0
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dataset.jsonl
*.pt
*.bin
__pycache__/
```

- [ ] **Step 5: Install TS deps**

```bash
cd scripts/train-classifier && pnpm install
```

- [ ] **Step 6: Install Python deps**

```bash
cd scripts/train-classifier && pip install -r requirements.txt
```

- [ ] **Step 7: Commit**

```bash
git add scripts/train-classifier/
git commit -m "chore: scaffold training scripts directory"
```

---

### Task 2: Dataset generation script

**Files:**
- Create: `scripts/train-classifier/generate-dataset.ts`

- [ ] **Step 1: Write the generation script**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";

const client = new Anthropic();
const OUTPUT = "dataset.jsonl";
const SAMPLES_PER_BAND = 150;
const BANDS = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface Sample {
  messages: Message[];
  score: number;
}

function bandDescription(score: number): string {
  if (score <= 0.1) return "trivial — simple greetings, factual lookups, unit conversions, one-word answers";
  if (score <= 0.3) return "easy — short summaries, simple explanations, basic code snippets, single-function tasks";
  if (score <= 0.5) return "medium — multi-step reasoning, moderate code with error handling, comparing tradeoffs, debugging simple issues";
  if (score <= 0.7) return "hard — complex refactoring, multi-file changes, system design questions, writing tests for edge cases, API integration";
  if (score <= 0.9) return "very hard — architecture design, security audits, performance optimization across systems, complex agentic multi-step workflows";
  return "hardest — distributed systems design, migrating entire architectures, cryptographic protocol review, multi-service orchestration with failure handling";
}

async function generateBatch(targetScore: number, count: number): Promise<Sample[]> {
  const turnMix = targetScore < 0.3
    ? "90% single-turn, 10% multi-turn (2 turns)"
    : targetScore < 0.6
      ? "60% single-turn, 40% multi-turn (2-3 turns)"
      : "40% single-turn, 60% multi-turn (3-5 turns)";

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `Generate exactly ${count} realistic conversations that a user would have with a coding/AI assistant.

Target complexity: ${targetScore.toFixed(1)} on a 0.0–1.0 scale.
Complexity level: ${bandDescription(targetScore)}

Turn distribution: ${turnMix}

Each conversation MUST include:
- A system prompt (role: "system") describing the assistant's role/context
- One or more user messages (role: "user")
- For multi-turn: include assistant responses between user messages

Vary the domains: web dev, backend, DevOps, data science, mobile, security, databases, ML, etc.

Output ONLY a valid JSON array. Each element:
{
  "messages": [{"role": "system"|"user"|"assistant", "content": "..."}],
  "score": ${targetScore.toFixed(1)}
}

No markdown, no explanation. Just the JSON array.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  try {
    const parsed = JSON.parse(text) as Sample[];
    return parsed.filter(
      (s) => Array.isArray(s.messages) && s.messages.length >= 2 && typeof s.score === "number",
    );
  } catch {
    console.error(`Failed to parse response for band ${targetScore}`);
    return [];
  }
}

async function main() {
  if (!existsSync(OUTPUT)) writeFileSync(OUTPUT, "");

  let total = 0;
  for (const band of BANDS) {
    console.log(`\nGenerating band ${band.toFixed(1)} (${bandDescription(band).split("—")[0].trim()})...`);

    // Generate in sub-batches of 50 to stay within token limits
    const batchSize = 50;
    const batches = Math.ceil(SAMPLES_PER_BAND / batchSize);

    for (let i = 0; i < batches; i++) {
      const count = Math.min(batchSize, SAMPLES_PER_BAND - i * batchSize);
      console.log(`  Batch ${i + 1}/${batches} (${count} samples)...`);

      try {
        const samples = await generateBatch(band, count);
        for (const sample of samples) {
          appendFileSync(OUTPUT, JSON.stringify(sample) + "\n");
        }
        total += samples.length;
        console.log(`  Got ${samples.length} samples (total: ${total})`);
      } catch (err) {
        console.error(`  Error on batch ${i + 1}:`, (err as Error).message);
      }

      // Rate limit courtesy
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`\nDone! Total samples: ${total}`);
  console.log(`Output: ${OUTPUT}`);
}

main().catch(console.error);
```

- [ ] **Step 2: Test with a single band**

```bash
cd scripts/train-classifier
ANTHROPIC_API_KEY=your-key npx tsx generate-dataset.ts
# Ctrl+C after first band completes
# Check: wc -l dataset.jsonl (should be ~150)
# Check: head -1 dataset.jsonl | python3 -m json.tool
```

- [ ] **Step 3: Commit**

```bash
git add scripts/train-classifier/generate-dataset.ts
git commit -m "feat: add synthetic dataset generation script (Haiku)"
```

---

### Task 3: Generate the full dataset

- [ ] **Step 1: Run the full generation**

```bash
cd scripts/train-classifier
ANTHROPIC_API_KEY=your-key npx tsx generate-dataset.ts
```

Expected: ~15-20 minutes, ~16,500 samples, cost < $1.

- [ ] **Step 2: Validate the output**

```bash
wc -l dataset.jsonl
# Expected: ~15000-16500

# Check score distribution
python3 -c "
import json
from collections import Counter
scores = []
with open('dataset.jsonl') as f:
    for line in f:
        s = json.loads(line)
        scores.append(round(s['score'], 1))
for k, v in sorted(Counter(scores).items()):
    print(f'{k:.1f}: {v} samples')
"
```

- [ ] **Step 3: Spot-check 20 random samples**

```bash
python3 -c "
import json, random
lines = open('dataset.jsonl').readlines()
for line in random.sample(lines, 20):
    s = json.loads(line)
    msgs = s['messages']
    user_msg = [m['content'] for m in msgs if m['role'] == 'user'][-1]
    print(f'[{s[\"score\"]:.1f}] {user_msg[:120]}')
    print()
"
```

Eyeball: do the scores make sense? Fix obvious mislabels if any.

- [ ] **Step 4: Commit dataset stats (not the dataset itself — it's gitignored)**

```bash
git commit --allow-empty -m "data: generated 16K+ synthetic training samples"
```

---

### Task 4: Training script

**Files:**
- Create: `scripts/train-classifier/train.py`

- [ ] **Step 1: Write the training script**

```python
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
        """Extract system prompt + all user messages, concatenated."""
        parts = []
        for msg in messages:
            if msg["role"] in ("system", "user"):
                parts.append(msg["content"])
        return " ".join(parts)[:2048]  # Truncate to ~512 tokens worth

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
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    criterion = nn.MSELoss()

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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/train-classifier/train.py
git commit -m "feat: add classifier training script (PyTorch → ONNX)"
```

---

### Task 5: Validation script

**Files:**
- Create: `scripts/train-classifier/validate.py`

- [ ] **Step 1: Write the validation script**

```python
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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/train-classifier/validate.py
git commit -m "feat: add classifier validation script"
```

---

### Task 6: Train and export the model

- [ ] **Step 1: Train on 3070**

```bash
cd scripts/train-classifier
python train.py --epochs 10 --batch-size 64
```

Expected output:
```
Device: cuda
Loaded 16500 samples
Encoding texts...
Epoch 1/10 — loss: 0.0XXX, val MAE: 0.1XXX
...
Epoch 10/10 — loss: 0.00XX, val MAE: 0.0XXX
Best val MAE: 0.0XXX
Exported: ../../models/prompt-classifier.onnx
Checksum: ../../models/prompt-classifier.sha256
```

- [ ] **Step 2: Validate**

```bash
python validate.py
```

Expected:
```
MAE:  < 0.10
Target MAE < 0.1: PASS
```

If MAE > 0.1: increase epochs, add more data, or check for label noise.

- [ ] **Step 3: Verify the ONNX model file**

```bash
ls -lh ../../models/prompt-classifier.onnx
# Expected: ~1-5MB (just the head, not the embedding model)
cat ../../models/prompt-classifier.sha256
```

- [ ] **Step 4: Commit the model artifact**

```bash
git add models/prompt-classifier.onnx models/prompt-classifier.sha256
git commit -m "feat: trained prompt complexity classifier (MAE < 0.1)"
```

---

### Task 7: Quick smoke test from Node.js

Verify the ONNX model loads and runs from Node before handing off to Plan 2 (gateway integration).

**Files:**
- Create: `scripts/train-classifier/smoke-test.ts`

- [ ] **Step 1: Write smoke test**

```typescript
import { InferenceSession, Tensor } from "onnxruntime-node";

async function main() {
  const session = await InferenceSession.create("../../models/prompt-classifier.onnx");
  console.log("Model loaded. Inputs:", session.inputNames, "Outputs:", session.outputNames);

  // Fake embedding (384-dim for MiniLM)
  const fakeEmbedding = new Float32Array(384).fill(0.1);
  const tensor = new Tensor("float32", fakeEmbedding, [1, 384]);
  const result = await session.run({ embedding: tensor });
  const score = result.score.data[0];

  console.log(`Test score: ${score} (should be 0.0–1.0)`);
  console.log(score >= 0 && score <= 1 ? "PASS" : "FAIL");
}

main().catch(console.error);
```

- [ ] **Step 2: Run it**

```bash
cd scripts/train-classifier
pnpm add onnxruntime-node
npx tsx smoke-test.ts
```

Expected:
```
Model loaded. Inputs: [ 'embedding' ] Outputs: [ 'score' ]
Test score: 0.XXXX (should be 0.0–1.0)
PASS
```

- [ ] **Step 3: Commit**

```bash
git add scripts/train-classifier/smoke-test.ts
git commit -m "test: ONNX model smoke test from Node.js"
```

---

## Notes for Plan 2 (Gateway Integration)

Plan 2 will cover:
- `src/gateway/classifier.ts` — loads ONNX + MiniLM tokenizer, exposes `score(messages)`
- `src/gateway/tier-map.ts` — score → model config
- `src/gateway/smart-route.ts` — shared helper for all protocol handlers
- `src/gateway/proxy.ts` modifications
- `src/gateway/protocol/openai.ts` modifications
- `src/gateway/protocol/anthropic.ts` modifications
- Tests for all of the above

The model artifact from this plan (`models/prompt-classifier.onnx`) is the input for Plan 2.
