import { Credit } from "../../../credits/credit.js";
import type { ICryptoChargeRepository } from "../charge-store.js";
import { deriveDepositAddress } from "./address-gen.js";
import { getTokenConfig, tokenAmountFromCents } from "./config.js";
import type { StablecoinCheckoutOpts } from "./types.js";

export const MIN_STABLECOIN_USD = 10;

export interface StablecoinCheckoutDeps {
  chargeStore: Pick<ICryptoChargeRepository, "getNextDerivationIndex" | "createStablecoinCharge">;
  xpub: string;
}

export interface StablecoinCheckoutResult {
  depositAddress: string;
  amountRaw: string;
  amountUsd: number;
  chain: string;
  token: string;
  referenceId: string;
}

/**
 * Create a stablecoin checkout — derive a unique deposit address, store the charge.
 *
 * CRITICAL: amountUsd is converted to integer cents via Credit.fromDollars().toCentsRounded().
 * The charge store holds USD cents (integer). Credit.fromCents() handles the
 * cents → nanodollars conversion when crediting the ledger in the settler.
 */
export async function createStablecoinCheckout(
  deps: StablecoinCheckoutDeps,
  opts: StablecoinCheckoutOpts,
): Promise<StablecoinCheckoutResult> {
  if (opts.amountUsd < MIN_STABLECOIN_USD) {
    throw new Error(`Minimum payment amount is $${MIN_STABLECOIN_USD}`);
  }

  const tokenCfg = getTokenConfig(opts.token, opts.chain);

  // Convert dollars to integer cents via Credit (no floating point in billing path).
  const amountUsdCents = Credit.fromDollars(opts.amountUsd).toCentsRounded();
  const rawAmount = tokenAmountFromCents(amountUsdCents, tokenCfg.decimals);

  const derivationIndex = await deps.chargeStore.getNextDerivationIndex();
  const depositAddress = deriveDepositAddress(deps.xpub, derivationIndex);

  const referenceId = `sc:${opts.chain}:${opts.token.toLowerCase()}:${depositAddress.toLowerCase()}`;

  await deps.chargeStore.createStablecoinCharge({
    referenceId,
    tenantId: opts.tenant,
    amountUsdCents,
    chain: opts.chain,
    token: opts.token,
    depositAddress: depositAddress.toLowerCase(),
    derivationIndex,
  });

  return {
    depositAddress,
    amountRaw: rawAmount.toString(),
    amountUsd: opts.amountUsd,
    chain: opts.chain,
    token: opts.token,
    referenceId,
  };
}
