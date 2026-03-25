# Classifier AutoResearch

You are an autonomous AI researcher optimizing a prompt complexity classifier. Your goal: get the lowest holdout MAE (mean absolute error).

## The Task

You are training a classifier that predicts how complex an AI coding assistant's response will be, given the conversation context. The classifier takes sentence embeddings as input and outputs a float 0.0-1.0.

## Files

- **`train.py`** — the file you modify. Contains the model architecture (embedding + regression head), optimizer, training loop, ONNX export. Everything is fair game: architecture, learning rate, dropout, batch size, number of layers, activation functions, loss function, data augmentation, feature engineering.
- **`dataset-*.jsonl`** — training data. Each line: `{"messages": [...], "score": 0.65}`. DO NOT modify these files.
- **`autoresearch.md`** — this file. DO NOT modify.

## Setup

1. Activate the venv: `source .venv/bin/activate`
2. Run baseline: `python train.py --epochs 10 --output /tmp/autoresearch-model.onnx 2>&1 | tee run.log`
3. Record baseline MAE from output
4. Begin experimentation

## Experiment Loop

1. Look at git state: current branch/commit
2. Modify `train.py` with an experimental idea
3. `git add train.py && git commit -m "experiment: [description]"`
4. Run: `python train.py --epochs 10 --output /tmp/autoresearch-model.onnx > run.log 2>&1`
5. Read results: `grep "Best val MAE\|val MAE" run.log | tail -1`
6. If grep is empty, the run crashed. Run `tail -n 50 run.log` to read the stack trace. Fix and retry. If you can't fix after 3 attempts, revert and try something else.
7. Record results in `results.tsv`
8. If MAE improved (lower): keep the commit. This is now the new baseline.
9. If MAE is equal or worse: `git reset --hard HEAD~1` to discard.
10. Go to step 1.

## Results Tracking

Log every experiment to `results.tsv` (tab-separated). Header row and 5 columns:

1. git commit hash (short, 7 chars)
2. val MAE achieved (e.g. 0.0834) — use 9.999999 for crashes
3. peak GPU memory in GB (read from log or nvidia-smi) — use 0.0 for crashes
4. status: `keep`, `discard`, or `crash`
5. short text description of what this experiment tried

Do NOT commit results.tsv — leave it untracked.

## What You CAN Change

Everything in `train.py`:
- Model architecture (more layers, different activations, attention, residual connections)
- Loss function (MSE, Huber, weighted MSE, focal loss)
- Optimizer (Adam, AdamW, SGD with momentum, learning rate schedules)
- Regularization (dropout, weight decay, label smoothing, data augmentation)
- Feature engineering (how text is extracted from messages, truncation strategy, weighting recent vs old messages)
- Batch size, number of epochs
- Embedding model (try different sentence-transformers if available)
- Ensemble methods
- Cross-validation strategies

## What You CANNOT Change

- The dataset files (`dataset-*.jsonl`)
- The JSONL format (messages array + score float)
- This file (`autoresearch.md`)
- The sentence-transformers library (use what's installed)
- The ONNX export requirement (final model must export to ONNX)

## Goal

Get the lowest possible holdout MAE. The holdout is 20% of the dataset, split randomly with a fixed seed.

Current baseline MAE: TBD (run baseline first)

## Tips

- The regression head is tiny (~50K params). The real leverage is in feature engineering — HOW you extract signal from the messages array matters more than making the head bigger.
- Consider weighting recent messages more heavily than old ones
- The system prompt contains role information, the user messages contain the actual task
- Multi-turn conversations have cumulative complexity — the score at turn 30 depends on everything before it
- Tool call patterns in assistant messages (if present) are strong complexity signals
- Message length is a weak signal — don't over-rely on it
- The score distribution is roughly: 20% at 0.0-0.2, 30% at 0.3-0.5, 35% at 0.5-0.8, 15% at 0.8-1.0

## NEVER STOP

Once the experiment loop has begun, do NOT pause to ask if you should continue. Do NOT ask "should I keep going?" or "is this a good stopping point?". Continue working indefinitely until you are manually stopped. If you run out of ideas, think harder — try combining previous near-misses, try more radical architectural changes, try different feature engineering approaches. The loop runs until interrupted.
