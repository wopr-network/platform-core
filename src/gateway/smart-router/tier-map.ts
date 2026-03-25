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

/** Resolve which tier a complexity score falls into. Tiers must be sorted by maxScore ascending. */
export function resolveTier(score: number, tiers: TierConfig[]): TierResult {
  for (let i = 0; i < tiers.length; i++) {
    if (score <= tiers[i].maxScore) {
      return { model: tiers[i].model, label: tiers[i].label, score, tierIndex: i };
    }
  }
  const last = tiers[tiers.length - 1];
  return { model: last.model, label: last.label, score, tierIndex: tiers.length - 1 };
}
