# Smart Model Router — Plan 2: Gateway Integration

**Goal:** Wire the trained ONNX classifier into the gateway so every chat request gets scored for complexity and routed to the cheapest model that can handle it.

**Architecture:** Two ONNX models loaded at startup — MiniLM (windowed embedding) + classifier head. Protocol handlers call a shared `smartRoute()` function before forwarding. The model in the request body is overwritten with the routed model. Per-product tier maps live in the DB via ProductConfigService.

**Tech Stack:** onnxruntime-node, existing gateway protocol handlers, ProductConfigService for tier maps.

**Prerequisites:** Plan 1 complete — `models/prompt-classifier.onnx` exists and validates.

---

### Task 1: Install onnxruntime-node

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add onnxruntime-node dependency**

```bash
pnpm add onnxruntime-node
```

- [ ] **Step 2: Verify it loads**

```bash
node -e "const ort = require('onnxruntime-node'); console.log('ONNX Runtime:', ort.env.versions.onnxruntime)"
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: add onnxruntime-node for smart model router"
```

---

### Task 2: MiniLM ONNX Embedding Service

**Files:**
- Create: `src/gateway/smart-router/embedder.ts`
- Create: `src/gateway/smart-router/embedder.test.ts`

The embedder loads MiniLM as ONNX, tokenizes text, runs inference, and returns 384-dim vectors. Uses the same windowed approach as encode.py: tail-truncate → chunk into 8 windows of ~1024 chars → embed each → concat.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { MiniLMEmbedder } from "./embedder.js";

describe("MiniLMEmbedder", () => {
  let embedder: MiniLMEmbedder;

  beforeAll(async () => {
    embedder = await MiniLMEmbedder.load();
  });

  it("embeds a short text to correct dimensions", async () => {
    const result = await embedder.embedWindowed("Hello world");
    // 8 windows * 384 dims = 3072
    expect(result.length).toBe(3072);
    expect(result.every((v) => typeof v === "number" && !isNaN(v))).toBe(true);
  });

  it("embeds channels and concatenates", async () => {
    const result = await embedder.embedChannels({
      system: "You are a helpful assistant",
      user: "Fix the auth bug",
      assistant: "I'll look into the authentication module",
    });
    // 3 channels * 8 windows * 384 dims = 9216
    expect(result.length).toBe(9216);
  });

  it("zero-pads short texts", async () => {
    const short = await embedder.embedWindowed("Hi");
    const long = await embedder.embedWindowed("x ".repeat(5000));
    expect(short.length).toBe(long.length);
    // First windows of short text should be zero (padding)
    const firstWindowSum = short.slice(0, 384).reduce((a, b) => a + Math.abs(b), 0);
    expect(firstWindowSum).toBe(0);
  });

  it("tail-truncates long text", async () => {
    const veryLong = "word ".repeat(50000); // way over 30K chars
    const result = await embedder.embedWindowed(veryLong);
    expect(result.length).toBe(3072);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/gateway/smart-router/embedder.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement MiniLMEmbedder**

```typescript
import * as ort from "onnxruntime-node";
import { join } from "node:path";

const WINDOWS_PER_CHANNEL = 8;
const EMBED_DIM = 384;
const MAX_CHARS = 30000;
const CHARS_PER_WINDOW = 1024;

export interface ChannelTexts {
  system: string;
  user: string;
  assistant: string;
}

export class MiniLMEmbedder {
  private session: ort.InferenceSession;
  // Tokenizer loaded from tokenizer.json (HuggingFace format)
  private tokenizer: any;

  private constructor(session: ort.InferenceSession, tokenizer: any) {
    this.session = session;
    this.tokenizer = tokenizer;
  }

  static async load(modelDir?: string): Promise<MiniLMEmbedder> {
    const dir = modelDir ?? join(__dirname, "../../../models/minilm");
    const session = await ort.InferenceSession.create(join(dir, "model.onnx"));
    // Load tokenizer — use @xenova/transformers or a lightweight tokenizer
    const tokenizer = await loadTokenizer(dir);
    return new MiniLMEmbedder(session, tokenizer);
  }

  /** Embed a single text using windowed approach. Returns WINDOWS_PER_CHANNEL * EMBED_DIM floats. */
  async embedWindowed(text: string): Promise<Float32Array> {
    const truncated = text.slice(-MAX_CHARS);
    const windows = textToWindows(truncated);
    const embeddings = new Float32Array(WINDOWS_PER_CHANNEL * EMBED_DIM);

    for (let i = 0; i < windows.length; i++) {
      if (windows[i] === "") {
        // Zero-pad — already zeros in Float32Array
        continue;
      }
      const vec = await this.embedSingle(windows[i]);
      embeddings.set(vec, i * EMBED_DIM);
    }

    return embeddings;
  }

  /** Embed 3 channels and concatenate. Returns 3 * WINDOWS_PER_CHANNEL * EMBED_DIM floats. */
  async embedChannels(texts: ChannelTexts): Promise<Float32Array> {
    const system = await this.embedWindowed(texts.system || "[EMPTY]");
    const user = await this.embedWindowed(texts.user || "[EMPTY]");
    const assistant = await this.embedWindowed(texts.assistant || "[EMPTY]");

    const result = new Float32Array(system.length + user.length + assistant.length);
    result.set(system, 0);
    result.set(user, system.length);
    result.set(assistant, system.length + user.length);
    return result;
  }

  private async embedSingle(text: string): Promise<Float32Array> {
    const encoded = this.tokenizer.encode(text, { truncation: true, maxLength: 256 });
    const inputIds = new ort.Tensor("int64", BigInt64Array.from(encoded.ids.map(BigInt)), [1, encoded.ids.length]);
    const attentionMask = new ort.Tensor("int64", BigInt64Array.from(encoded.attentionMask.map(BigInt)), [1, encoded.ids.length]);
    const tokenTypeIds = new ort.Tensor("int64", new BigInt64Array(encoded.ids.length), [1, encoded.ids.length]);

    const output = await this.session.run({ input_ids: inputIds, attention_mask: attentionMask, token_type_ids: tokenTypeIds });
    // Mean pooling over token embeddings
    const lastHidden = output["last_hidden_state"] ?? output["token_embeddings"];
    return meanPool(lastHidden.data as Float32Array, encoded.ids.length, EMBED_DIM);
  }
}

function textToWindows(text: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHARS_PER_WINDOW) {
    chunks.push(text.slice(i, i + CHARS_PER_WINDOW));
  }
  if (chunks.length === 0) chunks.push("[EMPTY]");

  if (chunks.length >= WINDOWS_PER_CHANNEL) {
    return chunks.slice(-WINDOWS_PER_CHANNEL);
  }
  const pad = new Array(WINDOWS_PER_CHANNEL - chunks.length).fill("");
  return [...pad, ...chunks];
}

function meanPool(data: Float32Array, seqLen: number, dim: number): Float32Array {
  const result = new Float32Array(dim);
  for (let t = 0; t < seqLen; t++) {
    for (let d = 0; d < dim; d++) {
      result[d] += data[t * dim + d];
    }
  }
  for (let d = 0; d < dim; d++) {
    result[d] /= seqLen;
  }
  // L2 normalize
  let norm = 0;
  for (let d = 0; d < dim; d++) norm += result[d] * result[d];
  norm = Math.sqrt(norm) || 1;
  for (let d = 0; d < dim; d++) result[d] /= norm;
  return result;
}
```

Note: The exact tokenizer approach needs investigation at implementation time. Options:
- `@xenova/transformers` (full HuggingFace in JS, ~50MB)
- `tokenizers` npm package (Rust bindings, fast)
- Pre-ship `tokenizer.json` and use a lightweight loader

The implementer should pick the lightest option that works with MiniLM's WordPiece tokenizer.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/gateway/smart-router/embedder.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/gateway/smart-router/embedder.ts src/gateway/smart-router/embedder.test.ts
git commit -m "feat: MiniLM windowed embedder for smart router"
```

---

### Task 3: Classifier Service

**Files:**
- Create: `src/gateway/smart-router/classifier.ts`
- Create: `src/gateway/smart-router/classifier.test.ts`

Loads the trained ONNX classifier, takes an embedding vector, returns a 0.0-1.0 score.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { ComplexityClassifier } from "./classifier.js";

describe("ComplexityClassifier", () => {
  let classifier: ComplexityClassifier;

  beforeAll(async () => {
    classifier = await ComplexityClassifier.load();
  });

  it("returns a score between 0 and 1", async () => {
    const input = new Float32Array(9216).fill(0.1);
    const score = await classifier.score(input);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("returns consistent scores for same input", async () => {
    const input = new Float32Array(9216).fill(0.5);
    const score1 = await classifier.score(input);
    const score2 = await classifier.score(input);
    expect(score1).toBe(score2);
  });

  it("runs fast (< 10ms)", async () => {
    const input = new Float32Array(9216).fill(0.3);
    const start = performance.now();
    await classifier.score(input);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(10);
  });
});
```

- [ ] **Step 2: Implement ComplexityClassifier**

```typescript
import * as ort from "onnxruntime-node";
import { join } from "node:path";

export class ComplexityClassifier {
  private session: ort.InferenceSession;

  private constructor(session: ort.InferenceSession) {
    this.session = session;
  }

  static async load(modelPath?: string): Promise<ComplexityClassifier> {
    const path = modelPath ?? join(__dirname, "../../../models/prompt-classifier.onnx");
    const session = await ort.InferenceSession.create(path);
    return new ComplexityClassifier(session);
  }

  async score(embedding: Float32Array): Promise<number> {
    const tensor = new ort.Tensor("float32", embedding, [1, embedding.length]);
    const output = await this.session.run({ embedding: tensor });
    return output["score"].data[0] as number;
  }
}
```

- [ ] **Step 3: Run tests, commit**

```bash
npx vitest run src/gateway/smart-router/classifier.test.ts
git add src/gateway/smart-router/classifier.ts src/gateway/smart-router/classifier.test.ts
git commit -m "feat: ONNX complexity classifier service"
```

---

### Task 4: Tier Map — Score to Model

**Files:**
- Create: `src/gateway/smart-router/tier-map.ts`
- Create: `src/gateway/smart-router/tier-map.test.ts`

Maps a complexity score to a model name using per-product tier configuration from the DB.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { resolveTier, type TierConfig } from "./tier-map.js";

const tiers: TierConfig[] = [
  { maxScore: 0.3, model: "deepseek/deepseek-chat-v3-0324", label: "cheap" },
  { maxScore: 0.7, model: "qwen/qwen3-coder", label: "mid" },
  { maxScore: 1.0, model: "anthropic/claude-sonnet-4-6", label: "premium" },
];

describe("resolveTier", () => {
  it("routes low scores to cheapest model", () => {
    expect(resolveTier(0.1, tiers).model).toBe("deepseek/deepseek-chat-v3-0324");
    expect(resolveTier(0.0, tiers).model).toBe("deepseek/deepseek-chat-v3-0324");
    expect(resolveTier(0.3, tiers).model).toBe("deepseek/deepseek-chat-v3-0324");
  });

  it("routes mid scores to mid-tier model", () => {
    expect(resolveTier(0.5, tiers).model).toBe("qwen/qwen3-coder");
    expect(resolveTier(0.31, tiers).model).toBe("qwen/qwen3-coder");
  });

  it("routes high scores to premium model", () => {
    expect(resolveTier(0.8, tiers).model).toBe("anthropic/claude-sonnet-4-6");
    expect(resolveTier(1.0, tiers).model).toBe("anthropic/claude-sonnet-4-6");
  });

  it("falls back to last tier for out-of-range scores", () => {
    expect(resolveTier(1.5, tiers).model).toBe("anthropic/claude-sonnet-4-6");
  });

  it("handles single-tier config (no routing)", () => {
    const single: TierConfig[] = [{ maxScore: 1.0, model: "deepseek/deepseek-chat-v3-0324", label: "only" }];
    expect(resolveTier(0.9, single).model).toBe("deepseek/deepseek-chat-v3-0324");
  });
});
```

- [ ] **Step 2: Implement tier-map**

```typescript
export interface TierConfig {
  maxScore: number;
  model: string;
  label: string;
}

export interface TierResult {
  model: string;
  label: string;
  score: number;
  tierIndex: number;
}

export function resolveTier(score: number, tiers: TierConfig[]): TierResult {
  for (let i = 0; i < tiers.length; i++) {
    if (score <= tiers[i].maxScore) {
      return { model: tiers[i].model, label: tiers[i].label, score, tierIndex: i };
    }
  }
  // Fallback to last tier
  const last = tiers[tiers.length - 1];
  return { model: last.model, label: last.label, score, tierIndex: tiers.length - 1 };
}
```

- [ ] **Step 3: Run tests, commit**

```bash
npx vitest run src/gateway/smart-router/tier-map.test.ts
git add src/gateway/smart-router/tier-map.ts src/gateway/smart-router/tier-map.test.ts
git commit -m "feat: tier map — score to model resolution"
```

---

### Task 5: Smart Route Service — Ties It All Together

**Files:**
- Create: `src/gateway/smart-router/index.ts`
- Create: `src/gateway/smart-router/smart-route.test.ts`

The top-level service that protocol handlers call. Extracts text channels from messages, embeds, classifies, resolves tier, returns the routed model.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeAll } from "vitest";
import { SmartRouter, type SmartRouteResult } from "./index.js";

describe("SmartRouter", () => {
  let router: SmartRouter;

  beforeAll(async () => {
    router = await SmartRouter.create();
  });

  it("routes a simple message to cheap tier", async () => {
    const result = await router.route([
      { role: "user", content: "Hello" },
    ], defaultTiers);
    expect(result.model).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("extracts channels correctly", () => {
    const messages = [
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Fix the bug" },
      { role: "assistant", content: "Looking at the code..." },
      { role: "user", content: "Thanks, now refactor it" },
    ];
    const channels = SmartRouter.extractChannels(messages);
    expect(channels.system).toContain("You are helpful");
    expect(channels.user).toContain("Fix the bug");
    expect(channels.user).toContain("now refactor it");
    expect(channels.assistant).toContain("Looking at the code");
  });

  it("returns timing info for observability", async () => {
    const result = await router.route([
      { role: "user", content: "Hello" },
    ], defaultTiers);
    expect(result.embedMs).toBeGreaterThanOrEqual(0);
    expect(result.classifyMs).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Implement SmartRouter**

```typescript
import { MiniLMEmbedder, type ChannelTexts } from "./embedder.js";
import { ComplexityClassifier } from "./classifier.js";
import { resolveTier, type TierConfig, type TierResult } from "./tier-map.js";

export interface SmartRouteResult extends TierResult {
  embedMs: number;
  classifyMs: number;
  totalMs: number;
}

interface Message {
  role: string;
  content: string;
}

export class SmartRouter {
  private embedder: MiniLMEmbedder;
  private classifier: ComplexityClassifier;

  private constructor(embedder: MiniLMEmbedder, classifier: ComplexityClassifier) {
    this.embedder = embedder;
    this.classifier = classifier;
  }

  static async create(modelsDir?: string): Promise<SmartRouter> {
    const embedder = await MiniLMEmbedder.load(modelsDir ? `${modelsDir}/minilm` : undefined);
    const classifier = await ComplexityClassifier.load(modelsDir ? `${modelsDir}/prompt-classifier.onnx` : undefined);
    return new SmartRouter(embedder, classifier);
  }

  async route(messages: Message[], tiers: TierConfig[]): Promise<SmartRouteResult> {
    const channels = SmartRouter.extractChannels(messages);

    const t0 = performance.now();
    const embedding = await this.embedder.embedChannels(channels);
    const t1 = performance.now();

    const score = await this.classifier.score(embedding);
    const t2 = performance.now();

    const tier = resolveTier(score, tiers);
    return {
      ...tier,
      embedMs: t1 - t0,
      classifyMs: t2 - t1,
      totalMs: t2 - t0,
    };
  }

  static extractChannels(messages: Message[]): ChannelTexts {
    const system: string[] = [];
    const user: string[] = [];
    const assistant: string[] = [];

    for (const msg of messages) {
      const text = typeof msg.content === "string" ? msg.content : "";
      if (msg.role === "system") system.push(text);
      else if (msg.role === "user") user.push(text);
      else if (msg.role === "assistant") assistant.push(text);
    }

    return {
      system: system.join(" ") || "[EMPTY]",
      user: user.join(" ") || "[EMPTY]",
      assistant: assistant.join(" ") || "[EMPTY]",
    };
  }
}

export { type TierConfig, type TierResult } from "./tier-map.js";
```

- [ ] **Step 3: Run tests, commit**

```bash
npx vitest run src/gateway/smart-router/smart-route.test.ts
git add src/gateway/smart-router/
git commit -m "feat: SmartRouter service — embed + classify + tier resolve"
```

---

### Task 6: Add Tier Map to Product Config

**Files:**
- Modify: `src/db/schema/product-config.ts`
- Modify: `src/product-config/product-config-service.ts`

Add `smartRouterTiers` to the product config schema so each product can define its own cost/quality tradeoff.

- [ ] **Step 1: Add column to schema**

Add a `smart_router_tiers` JSONB column to the product_config table. Default value is a single tier (no routing — all requests go to the product's default model).

- [ ] **Step 2: Add to ProductConfigService**

`getSmartRouterTiers()` method that returns `TierConfig[]` from the product config, with a sensible default.

- [ ] **Step 3: Add to platformBoot presets**

Each product preset gets a default tier map:
- Paperclip: 3 tiers (DeepSeek / Qwen3 / Sonnet)
- WOPR: 3 tiers (DeepSeek / Qwen3 / Sonnet)
- Holy Ship: 2 tiers (DeepSeek / Qwen3) — no premium tier
- NemoClaw: 1 tier (DeepSeek only) — cheapest possible

- [ ] **Step 4: Migration**

```bash
npx drizzle-kit generate
```

- [ ] **Step 5: Test, commit**

```bash
npx vitest run src/product-config/
git add src/db/ src/product-config/
git commit -m "feat: smart router tier map in product config"
```

---

### Task 7: Wire SmartRouter into Protocol Handlers

**Files:**
- Modify: `src/gateway/protocol/deps.ts` — add SmartRouter to ProtocolDeps
- Modify: `src/gateway/protocol/openai.ts` — call smartRoute before forwarding
- Modify: `src/gateway/protocol/anthropic.ts` — call smartRoute before forwarding
- Modify: `src/gateway/proxy.ts` — initialize SmartRouter, pass to protocol deps

This is the critical integration. The protocol handlers currently parse the request body, extract the model, and forward to OpenRouter. We insert smart routing between parse and forward.

- [ ] **Step 1: Add SmartRouter to ProtocolDeps**

```typescript
// In deps.ts
import type { SmartRouter } from "../smart-router/index.js";

export interface ProtocolDeps {
  // ... existing fields ...
  smartRouter?: SmartRouter;
  smartRouterTiers?: TierConfig[];
}
```

- [ ] **Step 2: Modify OpenAI handler**

In `chatCompletionsHandler`, after parsing the body and before forwarding:

```typescript
// Smart route — override model based on complexity
if (deps.smartRouter && deps.smartRouterTiers) {
  const routeResult = await deps.smartRouter.route(parsedBody.messages ?? [], deps.smartRouterTiers);
  parsedBody.model = routeResult.model;
  // Log for observability
  c.header("x-smart-route-score", routeResult.score.toFixed(3));
  c.header("x-smart-route-model", routeResult.model);
  c.header("x-smart-route-tier", routeResult.label);
  c.header("x-smart-route-ms", routeResult.totalMs.toFixed(1));
}
```

The key invariant: **the model in the request body gets overwritten**. The user never sees this — they send whatever model they want (or none), we route to what we want. The sell rate stays the same regardless of which model we pick.

- [ ] **Step 3: Modify Anthropic handler**

Same pattern — override `anthropicReq.model` before translation/forwarding.

- [ ] **Step 4: Initialize in proxy.ts**

```typescript
// In mountGateway or gateway setup
const smartRouter = await SmartRouter.create();
const tiers = await productConfigService.getSmartRouterTiers();
// Pass to protocol deps
```

SmartRouter loads once at startup (~2s for ONNX model load). After that, each classification is ~10ms.

- [ ] **Step 5: Add feature flag**

Add `SMART_ROUTER_ENABLED=true|false` to product config. When false, skip classification and use the existing model resolution (defaultModel / resolveDefaultModel). This allows gradual rollout.

- [ ] **Step 6: Test the full flow**

```typescript
// Integration test: request comes in → smart route → model overwritten → forwarded
describe("smart routing integration", () => {
  it("overrides model based on complexity score", async () => {
    // Send a simple "hello" request
    // Verify the forwarded model is the cheap tier
  });

  it("passes through when smart router is disabled", async () => {
    // With feature flag off, model is not overwritten
  });

  it("falls back gracefully if classifier fails", async () => {
    // If ONNX inference throws, use default model
  });
});
```

- [ ] **Step 7: Commit**

```bash
git add src/gateway/
git commit -m "feat: wire smart router into protocol handlers"
```

---

### Task 8: Observability — Metrics + Logging

**Files:**
- Modify: `src/gateway/smart-router/index.ts` — add structured logging
- Modify: `src/observability/metrics.ts` — add smart router metrics

- [ ] **Step 1: Add structured logging to SmartRouter.route()**

Log every routing decision with: score, tier, model, embed_ms, classify_ms, total_ms, message_count, channel_lengths.

- [ ] **Step 2: Add metrics**

- `smart_router_score` histogram — distribution of complexity scores
- `smart_router_tier` counter — how many requests per tier
- `smart_router_latency_ms` histogram — classification latency
- `smart_router_fallback` counter — times classifier failed and fell back

- [ ] **Step 3: Commit**

```bash
git add src/gateway/smart-router/ src/observability/
git commit -m "feat: smart router observability — metrics + structured logging"
```

---

### Task 9: Model Files + Smoke Test

**Files:**
- Create: `models/minilm/` — MiniLM ONNX model + tokenizer files
- Verify: `models/prompt-classifier.onnx` — from Plan 1

- [ ] **Step 1: Export MiniLM to ONNX**

```python
from transformers import AutoTokenizer, AutoModel
import torch

model = AutoModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")

dummy = tokenizer("test", return_tensors="pt")
torch.onnx.export(
    model,
    (dummy["input_ids"], dummy["attention_mask"], dummy["token_type_ids"]),
    "models/minilm/model.onnx",
    input_names=["input_ids", "attention_mask", "token_type_ids"],
    output_names=["last_hidden_state"],
    dynamic_axes={"input_ids": {0: "batch", 1: "seq"}, "attention_mask": {0: "batch", 1: "seq"}, "token_type_ids": {0: "batch", 1: "seq"}, "last_hidden_state": {0: "batch", 1: "seq"}},
    opset_version=17,
)
tokenizer.save_pretrained("models/minilm/")
```

- [ ] **Step 2: Smoke test from Node**

```typescript
// smoke-test-router.ts
import { SmartRouter } from "./src/gateway/smart-router/index.js";

const router = await SmartRouter.create();
const tiers = [
  { maxScore: 0.3, model: "deepseek/deepseek-chat-v3-0324", label: "cheap" },
  { maxScore: 0.7, model: "qwen/qwen3-coder", label: "mid" },
  { maxScore: 1.0, model: "anthropic/claude-sonnet-4-6", label: "premium" },
];

const result = await router.route([
  { role: "user", content: "Hello!" },
], tiers);
console.log("Simple:", result);

const result2 = await router.route([
  { role: "system", content: "You are an expert systems architect..." },
  { role: "user", content: "Redesign the entire authentication system to support SAML, OAuth2, and LDAP across all our microservices..." },
], tiers);
console.log("Complex:", result2);
```

Expected: "Hello!" routes to cheap tier, complex architecture question routes to mid or premium.

- [ ] **Step 3: Commit**

```bash
git add models/ scripts/
git commit -m "feat: MiniLM ONNX export + smoke test"
```

---

### Task 10: End-to-End Validation

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

- [ ] **Step 2: Manual E2E test with a real product**

Start the platform locally, send requests through the gateway, verify:
- Smart router scores are logged
- Model in the forwarded request matches the tier
- Response headers include `x-smart-route-*`
- Sell rate is unchanged (user pays the same regardless of routed model)

- [ ] **Step 3: Verify fallback behavior**

- Delete the ONNX model file → should fall back to default model
- Send malformed messages → should fall back gracefully
- Disable feature flag → should skip routing entirely

- [ ] **Step 4: Final commit + PR**

```bash
git add -A
git commit -m "feat: smart model router — gateway integration complete"
```
