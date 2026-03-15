/** Assets with Chainlink price feeds. */
export type PriceAsset = string;

/** Result from a price oracle query. */
export interface PriceResult {
  /** USD cents per 1 unit of asset (integer). */
  priceCents: number;
  /** When the price was last updated on-chain. */
  updatedAt: Date;
}

/** Read-only price oracle. */
export interface IPriceOracle {
  getPrice(asset: PriceAsset): Promise<PriceResult>;
}
