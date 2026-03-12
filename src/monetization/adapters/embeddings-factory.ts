/**
 * Embeddings adapter factory — instantiates all available embeddings adapters
 * from environment config and returns them ready to register.
 *
 * Only adapters with valid config are created. The factory never touches
 * the database — it returns plain ProviderAdapter instances that the caller
 * registers with an ArbitrageRouter or AdapterSocket.
 *
 * Priority order (cheapest first, when all adapters available):
 *   self-hosted-embeddings (GPU, cheapest — not yet implemented)
 *   → OpenRouter ($0.02/1M tokens via text-embedding-3-small)
 */

import { createOpenRouterAdapter, type OpenRouterAdapterConfig } from "./openrouter.js";
import type { ProviderAdapter } from "./types.js";

/** Top-level factory config. Only providers with an API key are instantiated. */
export interface EmbeddingsFactoryConfig {
  /** OpenRouter API key. Omit or empty string to skip. */
  openrouterApiKey?: string;
  /** Per-adapter config overrides */
  openrouter?: Omit<Partial<OpenRouterAdapterConfig>, "apiKey">;
}

/** Result of the factory — adapters + metadata for observability. */
export interface EmbeddingsFactoryResult {
  /** All instantiated adapters, ordered by cost priority (cheapest first). */
  adapters: ProviderAdapter[];
  /** Map of adapter name → ProviderAdapter for direct registration. */
  adapterMap: Map<string, ProviderAdapter>;
  /** Names of providers that were skipped (missing config). */
  skipped: string[];
}

/**
 * Create embeddings adapters from the provided config.
 *
 * Returns only adapters whose API key is present and non-empty.
 * Order matches arbitrage priority: cheapest first.
 */
export function createEmbeddingsAdapters(config: EmbeddingsFactoryConfig): EmbeddingsFactoryResult {
  const adapters: ProviderAdapter[] = [];
  const skipped: string[] = [];

  // OpenRouter — $0.02/1M tokens (text-embedding-3-small via OpenAI)
  if (config.openrouterApiKey) {
    adapters.push(createOpenRouterAdapter({ ...config.openrouter, apiKey: config.openrouterApiKey }));
  } else {
    skipped.push("openrouter");
  }

  // Future: self-hosted-embeddings will go BEFORE openrouter (GPU tier, cheapest)

  const adapterMap = new Map<string, ProviderAdapter>();
  for (const adapter of adapters) {
    adapterMap.set(adapter.name, adapter);
  }

  return { adapters, adapterMap, skipped };
}

/**
 * Create embeddings adapters from environment variables.
 *
 * Reads API keys from:
 *   - OPENROUTER_API_KEY
 *
 * Accepts optional per-adapter overrides.
 */
export function createEmbeddingsAdaptersFromEnv(
  overrides?: Omit<EmbeddingsFactoryConfig, "openrouterApiKey">,
): EmbeddingsFactoryResult {
  return createEmbeddingsAdapters({
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    ...overrides,
  });
}
