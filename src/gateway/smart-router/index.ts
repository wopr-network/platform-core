import { logger } from "../../config/logger.js";
import { ComplexityClassifier } from "./classifier.js";
import { type ChannelTexts, MiniLMEmbedder } from "./embedder.js";
import { resolveTier, type TierConfig, type TierResult } from "./tier-map.js";

export interface SmartRouteResult extends TierResult {
  embedMs: number;
  classifyMs: number;
  totalMs: number;
}

interface Message {
  role: string;
  content: string | unknown;
}

export class SmartRouter {
  private embedder: MiniLMEmbedder;
  private classifier: ComplexityClassifier;

  private constructor(embedder: MiniLMEmbedder, classifier: ComplexityClassifier) {
    this.embedder = embedder;
    this.classifier = classifier;
  }

  /** Load models from disk. Call once at startup. */
  static async create(modelsDir: string): Promise<SmartRouter> {
    const embedder = await MiniLMEmbedder.load(`${modelsDir}/minilm`);
    const classifier = await ComplexityClassifier.load(`${modelsDir}/prompt-classifier.onnx`);
    return new SmartRouter(embedder, classifier);
  }

  /** Classify a messages array and resolve to a model tier. */
  async route(messages: Message[], tiers: TierConfig[]): Promise<SmartRouteResult> {
    const channels = SmartRouter.extractChannels(messages);
    const t0 = performance.now();
    const embedding = await this.embedder.embedChannels(channels);
    const t1 = performance.now();
    const score = await this.classifier.score(embedding);
    const t2 = performance.now();
    const tier = resolveTier(score, tiers);

    const result: SmartRouteResult = {
      ...tier,
      embedMs: t1 - t0,
      classifyMs: t2 - t1,
      totalMs: t2 - t0,
    };

    logger.info("smart-router: classified request", {
      score: result.score.toFixed(3),
      tier: result.label,
      model: result.model,
      embedMs: result.embedMs.toFixed(1),
      classifyMs: result.classifyMs.toFixed(1),
      totalMs: result.totalMs.toFixed(1),
    });

    return result;
  }

  /** Extract user/assistant text channels from a messages array. */
  static extractChannels(messages: Message[]): ChannelTexts {
    const user: string[] = [];
    const assistant: string[] = [];
    for (const msg of messages) {
      const text = typeof msg.content === "string" ? msg.content : "";
      if (!text) continue;
      if (msg.role === "user") user.push(text);
      else if (msg.role === "assistant") assistant.push(text);
    }
    return {
      user: user.join(" ") || "[EMPTY]",
      assistant: assistant.join(" ") || "[EMPTY]",
    };
  }
}

export type { ChannelTexts } from "./embedder.js";
export type { TierConfig, TierResult } from "./tier-map.js";
