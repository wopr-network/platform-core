# Smart Model Router

> Prompt complexity classifier embedded in the gateway. Fixed price to users, variable model cost underneath.

## Problem

The gateway currently routes all LLM requests to a single model (whatever the product configured or OpenRouter default). This leaves money on the table — simple requests that could use a $0.26/1M model get sent to the same provider as complex agentic tasks that need a $3/1M model. Users pay a fixed credit rate, but our cost is unnecessarily high.

## Design Principle

Users never choose the model. The gateway owns model selection entirely. Every request gets classified by complexity, routed to the cheapest model that can handle it, and billed at the same fixed rate. The user experience doesn't change. Our margin improves.

## Architecture

Two decoupled layers:

**Layer 1: Classifier** — a lightweight ONNX model that scores prompt complexity on a continuous 0–1 scale. It knows nothing about models, costs, or products. It answers one question: "how complex is this prompt?"

**Layer 2: Tier map** — a per-product config that maps score ranges to models. Completely independent of the classifier. Products can change model assignments without retraining. Different products can map the same score to different models.

For every incoming chat/completions request:

1. Extract the prompt from the messages array
2. Score complexity (0.0–1.0) using the embedded classifier (~1ms)
3. Map score to model via the product's tier map config
4. Overwrite the `model` field in the request
5. Existing gateway flow takes over (arbitrage router → provider → execute)

The classifier runs AFTER `enforcedModel`/`defaultModel` resolution and OVERWRITES it. The classifier always wins — users and product defaults do not control model selection. This is intentional: the gateway owns routing.

The classifier is a sentence embedding (MiniLM, ~20MB) + linear head (~1KB), trained on synthetic data, exported as ONNX, loaded once at gateway boot.

## Classifier Output

The classifier returns a single float: **0.0** (trivial) to **1.0** (hardest). This is the only contract between the classifier and the rest of the system. The classifier has no knowledge of models, pricing, or tiers.

## Tier Map (per-product config)

Each product defines score thresholds and model assignments:

```ts
// Default tier map — products override via admin panel
const DEFAULT_TIERS = [
  { maxScore: 0.25, model: "deepseek/deepseek-v3.2" },     // trivial + easy
  { maxScore: 0.50, model: "qwen/qwen3-coder-next" },      // medium
  { maxScore: 0.75, model: "qwen/qwen3-coder" },           // hard
  { maxScore: 1.00, model: "anthropic/claude-sonnet-4.6" }, // hardest
];
```

| Score Range | Default Model | Our Cost/1M (in/out) | Use Case |
|-------------|---------------|----------------------|----------|
| 0.00–0.25 | `deepseek/deepseek-v3.2` | $0.26/$0.38 | Simple lookups, greetings, basic chat |
| 0.25–0.50 | `qwen/qwen3-coder-next` | ~$0.20/$0.60 | Multi-step reasoning, moderate code |
| 0.50–0.75 | `qwen/qwen3-coder` | $0.18/$0.54 | Complex agent workflows, large context |
| 0.75–1.00 | `anthropic/claude-sonnet-4.6` | $3/$15 | Architecture, security, deep analysis |

Note: Qwen3 Coder Next and Qwen3 Coder 480B have similar pricing. Tier 3 (Next) is faster but less capable; Tier 4 (480B) is slower but higher quality for complex tasks. The cost difference is negligible — the routing is about capability, not savings between these two.

Products can:
- Change which model serves any score range
- Add or remove tiers (e.g., a budget product maps everything to DeepSeek)
- Adjust thresholds (e.g., route more traffic to cheap models by raising thresholds)

The tier map is stored in the product_config tables (admin panel). Defaults are hardcoded as fallback.

## Economics

At fixed 7x sell rate ($0.00182/$0.00266 per 1K tokens):

| Tier | Margin | Estimated Traffic |
|------|--------|------------------|
| 1-2 | ~7x | ~60% |
| 3 | ~4-9x | ~25% |
| 4 | ~5-10x | ~10% |
| 5 | <1x (loss leader) | ~5% |

**Blended margin: ~6-8x** depending on traffic distribution. Tier 5 is rare enough that the losses are absorbed by the volume of cheap requests.

### Sell Rate Invariant

Users pay the same rate regardless of which model serves the request. The `sell_rates` table must have identical pricing for ALL tier models. When a new model is added to the tier map, a corresponding sell rate row must be created at the same fixed price. The `rate-lookup.ts` cache resolves sell rates by model name — after the classifier rewrites the model field, the lookup hits the correct (but identically priced) sell rate row.

Alternatively, the smart router can inject a `skipRateLookup` flag so the gateway always uses the product's default sell rate, bypassing per-model lookup entirely. This is simpler and ensures pricing can never diverge.

## Training Pipeline

### Synthetic Dataset Generation

Use Claude to generate ~15,000 prompts with continuous complexity scores (0.0–1.0). Each sample includes a system prompt + user message pair to match the classifier's input format:

- **~0.0**: "What's the capital of France?", "Say hello", "Convert 5km to miles"
- **~0.25**: "Summarize this paragraph", "Write a haiku about spring", "Explain REST vs GraphQL in 2 sentences"
- **~0.5**: "Write a function that parses CSV with error handling", "Debug this SQL query", "Explain the tradeoffs between Redis and Memcached"
- **~0.75**: "Refactor this 200-line module into clean abstractions", "Design an event sourcing system for this domain", "Write a retry mechanism with exponential backoff, jitter, and circuit breaking"
- **~1.0**: "Review this authentication system for security vulnerabilities", "Design a distributed consensus protocol for this multi-region setup", "Architect a migration from monolith to microservices for this codebase"

### Training

- Model: Sentence-transformer (all-MiniLM-L6-v2 or similar) + single regression head (sigmoid output)
- Framework: PyTorch, fine-tune on 3070
- Loss: MSE on 0–1 target scores
- Export: ONNX via `torch.onnx.export`
- Validation: hold out 20%, target MAE < 0.1 (within ~10% of correct score)

### Iteration

As production data accumulates, retrain on real prompts + outcomes. The gateway logs every routing decision (prompt hash, tier assigned, model used, success/failure). This becomes the next training set.

## Gateway Integration

### New Files

**`src/gateway/classifier.ts`**

Loads the ONNX model at boot. Exposes:
```ts
interface PromptClassifier {
  score(messages: Array<{ role: string; content: string }>): Promise<number>; // returns 0.0–1.0
}

function createClassifier(modelPath: string): Promise<PromptClassifier>;
```

Uses `onnxruntime-node` for inference. Extracts the **system prompt + last user message** (concatenated), tokenizes with the MiniLM tokenizer, runs the model, returns a sigmoid-normalized score. Using both system and last user captures the full context — a "yes" response to a complex system prompt should score higher than a "yes" in casual chat.

**`src/gateway/tier-map.ts`**

Maps score → model. DB-backed with in-memory cache (same pattern as `rate-lookup.ts`):
```ts
interface TierConfig {
  maxScore: number;
  model: string;
}

interface TierMap {
  resolve(score: number): string; // returns model ID
}

function createTierMap(defaults: TierConfig[], dbLookup?: () => Promise<TierConfig[]>): TierMap;
```

The `resolve` function walks the tiers in order, returns the first where `score <= maxScore`. Pure config — no ML, no complexity.

**`src/gateway/smart-route.ts`**

Shared helper used by all protocol handlers:
```ts
import type { PromptClassifier } from "./classifier.js";
import type { TierMap } from "./tier-map.js";

interface SmartRouteResult {
  model: string;
  score: number;
}

/**
 * Score prompt complexity and resolve the optimal model.
 * Returns null if classifier is not configured or fails.
 * On any error, logs and returns null (caller falls through to default model).
 */
export async function smartRoute(
  messages: Array<{ role: string; content: string }>,
  classifier: PromptClassifier | undefined,
  tierMap: TierMap | undefined,
  logger: { info: Function; error: Function },
  tenantId: string,
): Promise<SmartRouteResult | null> {
  if (!classifier || !tierMap) return null;
  try {
    const score = await Promise.race([
      classifier.score(messages),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("classifier timeout")), 10)),
    ]);
    const model = tierMap.resolve(score);
    logger.info("Smart router", { score, model, tenant: tenantId });
    return { model, score };
  } catch (err) {
    logger.error("Smart router failed, using default model", { error: (err as Error).message, tenant: tenantId });
    return null;
  }
}
```

Key properties:
- 10ms hard timeout — falls through on slow classification
- try/catch — any classifier error returns null, request continues with default model
- Shared by all 3 protocol handlers

### Modified Files

**`src/gateway/proxy.ts`**

In the `chatCompletions` handler, after body parsing and before the arbitrage block. Note: `body` must be changed from `const` to `let`.

```ts
// Smart model routing — score prompt complexity, resolve model from tier map
const routed = await smartRoute(parsedBody?.messages ?? [], deps.classifier, deps.tierMap, logger, tenant.id);
if (routed) {
  requestModel = routed.model;
  if (parsedBody) {
    parsedBody.model = routed.model;
    body = JSON.stringify(parsedBody);
  }
}
```

**`src/gateway/protocol/openai.ts`**

Same pattern — call `smartRoute()` after extracting messages, before forwarding to upstream.

**`src/gateway/protocol/anthropic.ts`**

Same pattern — call `smartRoute()` after extracting messages from the Anthropic format, before forwarding.

All three handlers use the same `smartRoute()` function. The classifier is protocol-agnostic — it only needs the messages array.

**`src/gateway/types.ts`**

Add to `GatewayConfig`:
```ts
classifier?: import("./classifier.js").PromptClassifier;
tierMap?: import("./tier-map.js").TierMap;
```

### Training Scripts (in platform-core `scripts/train-classifier/`)

**`generate-dataset.ts`** — TypeScript, uses `@anthropic-ai/sdk`
- Calls `claude-haiku-4-5` in batches
- For each complexity band (0.0, 0.1, 0.2, ... 1.0), generates ~150 prompts
- Each sample is a realistic conversation: system prompt + user message(s) (1-5 turns)
- Mix of single-turn (~60%) and multi-turn (~40%) conversations
- Haiku both generates the prompt AND assigns the complexity score
- Outputs `dataset.jsonl` with `{ messages: [{role, content}], score: number }` records
- ~16,500 samples total, cost < $1

Prompt template per batch:
```
Generate 150 realistic conversations that a user would have with a coding AI assistant.
Target complexity: {score} on a 0.0-1.0 scale (0 = trivial, 1 = hardest).
Include a mix of single-turn and multi-turn (2-5 turns) conversations.
Each conversation should have a system prompt and user messages.
Output as a JSON array of { messages: [{role, content}], score: number }.
```

Validation: spot-check ~100 random samples across all bands. Fix obvious mislabels. This is bootstrap data — production logs will improve it.

**`train.py`** — Python, runs on 3070
- Loads dataset, fine-tunes sentence-transformer (all-MiniLM-L6-v2) + regression head
- Input: concatenated system + last user message (truncated to 512 tokens)
- For multi-turn: concatenates system + all user messages
- Exports to ONNX via `torch.onnx.export`

**`validate.py`** — Python
- Holdout validation (20%), prints MAE, score distribution histogram, per-band accuracy

These run locally on the 3070. The output `.onnx` file ships with platform-core.

## Model Artifact

The trained ONNX model (~20MB) can be:
- Committed to platform-core in `models/` (simple, versioned)
- Hosted on GitHub Releases or S3 (smaller package, fetched on boot)
- Bundled in the Docker image (no runtime fetch)

Recommend: commit to `models/` for now. It's 20MB — not ideal but simple. Move to S3 when it becomes a problem.

The loader verifies a SHA-256 checksum before initializing inference. The expected hash is stored in `models/prompt-classifier.sha256`. If the hash doesn't match, the classifier is disabled (not loaded) and a warning is logged. This prevents corrupted or tampered models from silently misrouting requests.

## Logging and Analytics

Every routing decision is logged:
```ts
{
  tenant, score, resolvedModel, promptLength, promptHash, timestamp
}
```

`promptHash` is SHA-256 truncated to 16 bytes (hex-encoded, 32 chars). Sufficient for deduplication without collision risk at production volumes.

This feeds back into:
1. Training data for the next model iteration
2. Admin dashboard showing tier distribution per product
3. Margin tracking (actual cost vs sell rate per tier)

## Rollback

If the classifier produces bad results:
1. Set `classifier: undefined` in gateway config → disables smart routing
2. All requests fall back to the product's default model
3. No code change needed, just config

## Dependencies

- `onnxruntime-node` — ONNX inference runtime for Node.js
- No Python in production
- Training requires PyTorch + transformers (3070 only, not deployed)

## Future

- Retrain on production data (prompt + tier + quality signal)
- Per-tenant routing preferences (power users can request tier 5)
- Streaming-aware classification (currently works on full prompt, could classify on first message)
- Provider preferences per tier (route tier 4 to DeepInfra for faster Qwen3)
