import type { IPriceOracle, PriceAsset, PriceResult } from "./types.js";

/**
 * Fixed-price oracle for testing and local dev (Anvil, regtest).
 * Returns hardcoded prices — no RPC calls.
 */
export class FixedPriceOracle implements IPriceOracle {
  private readonly prices: Record<string, number>;

  constructor(prices: Partial<Record<PriceAsset, number>> = {}) {
    this.prices = {
      ETH: 350_000, // $3,500
      BTC: 6_500_000, // $65,000
      ...prices,
    };
  }

  async getPrice(asset: PriceAsset): Promise<PriceResult> {
    const priceCents = this.prices[asset];
    if (priceCents === undefined) throw new Error(`No fixed price for ${asset}`);
    return { priceCents, updatedAt: new Date() };
  }
}
