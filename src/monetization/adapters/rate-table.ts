/**
 * Two-tier pricing rate table.
 *
 * Maps (capability, tier) → cost parameters. This is the central reference for:
 * - Pricing comparisons (standard vs premium)
 * - Admin dashboard pricing display
 * - Metering layer cost validation
 * - Adapter routing decisions
 *
 * Standard tier = self-hosted, lower cost
 * Premium tier = third-party brand-name APIs, higher cost
 */

import type { AdapterCapability } from "./types.js";

export interface RateEntry {
  /** Which capability this rate applies to */
  capability: AdapterCapability;
  /** Pricing tier: standard (self-hosted) or premium (third-party) */
  tier: "standard" | "premium";
  /** Provider name (e.g., "chatterbox-tts", "elevenlabs") */
  provider: string;
  /** Cost per unit (character, token, minute, image, etc.) in USD */
  costPerUnit: number;
  /** What the unit is (e.g., "per-character", "per-token", "per-minute") */
  billingUnit: string;
  /** Margin multiplier */
  margin: number;
  /** Effective user-facing price per unit (costPerUnit * margin) */
  effectivePrice: number;
}

/**
 * The rate table — admin-dashboard reference for pricing comparisons.
 *
 * Each capability has both standard and premium entries. Standard is always
 * cheaper than premium for the same capability (that's the whole point).
 *
 * NOTE: Margin values here are reference defaults for dashboard display.
 * Runtime margins are authoritative via `getMargin()` / `MARGIN_CONFIG_JSON`.
 *
 * NOTE: Text-generation rates are blended (approximate 50/50 input/output).
 * Real costs vary by workload — output-heavy chat costs more than shown here.
 */
export const RATE_TABLE: RateEntry[] = [
  // TTS - Text-to-Speech
  {
    capability: "tts",
    tier: "standard",
    provider: "chatterbox-tts",
    costPerUnit: 0.000002, // Amortized GPU cost
    billingUnit: "per-character",
    margin: 1.2, // 20% — dashboard default; runtime uses getMargin()
    effectivePrice: 0.0000024, // = costPerUnit * margin ($2.40 per 1M chars)
  },
  {
    capability: "tts",
    tier: "premium",
    provider: "elevenlabs",
    costPerUnit: 0.000015, // Third-party wholesale
    billingUnit: "per-character",
    margin: 1.5, // 50% — dashboard default; runtime uses getMargin()
    effectivePrice: 0.0000225, // = costPerUnit * margin ($22.50 per 1M chars)
  },

  // Text Generation
  {
    capability: "text-generation",
    tier: "standard",
    provider: "self-hosted-llm",
    costPerUnit: 0.00000005, // Amortized GPU cost per token (H100), blended in/out
    billingUnit: "per-token",
    margin: 1.2, // 20% — dashboard default; runtime uses getMargin()
    effectivePrice: 0.00000006, // = costPerUnit * margin ($0.06 per 1M tokens)
  },
  {
    capability: "text-generation",
    tier: "premium",
    provider: "openrouter",
    costPerUnit: 0.000001, // Blended per-token rate (variable across models)
    billingUnit: "per-token",
    margin: 1.3, // 30% — dashboard default; runtime uses getMargin()
    effectivePrice: 0.0000013, // = costPerUnit * margin ($1.30 per 1M tokens)
  },

  // Future self-hosted adapters will add more entries here:
  // - transcription: self-hosted-whisper (standard) vs deepgram (premium)
  // - embeddings: self-hosted-embeddings (standard) vs openrouter (premium)
  // - image-generation: self-hosted-sdxl (standard) vs replicate (premium)
];

/**
 * Look up a rate entry by capability and tier.
 *
 * @param capability - The capability to look up
 * @param tier - The pricing tier ("standard" or "premium")
 * @returns The rate entry, or undefined if not found
 */
export function lookupRate(capability: AdapterCapability, tier: "standard" | "premium"): RateEntry | undefined {
  return RATE_TABLE.find((entry) => entry.capability === capability && entry.tier === tier);
}

/**
 * Get all rate entries for a given capability.
 *
 * @param capability - The capability to look up
 * @returns Array of rate entries (both standard and premium if available)
 */
export function getRatesForCapability(capability: AdapterCapability): RateEntry[] {
  return RATE_TABLE.filter((entry) => entry.capability === capability);
}

/**
 * Calculate cost savings from using standard tier vs premium.
 *
 * @param capability - The capability to compare
 * @param units - Number of units (characters, tokens, etc.)
 * @returns Savings in USD, or 0 if either tier is unavailable
 */
export function calculateSavings(capability: AdapterCapability, units: number): number {
  // Validate input - negative or non-finite units should return 0
  if (units <= 0 || !Number.isFinite(units)) return 0;

  const standard = lookupRate(capability, "standard");
  const premium = lookupRate(capability, "premium");

  if (!standard || !premium) return 0;

  const standardCost = standard.effectivePrice * units;
  const premiumCost = premium.effectivePrice * units;

  return Math.max(0, premiumCost - standardCost);
}
