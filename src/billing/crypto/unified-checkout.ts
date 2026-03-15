import { Credit } from "../../credits/credit.js";
import { deriveAddress, deriveP2pkhAddress } from "./btc/address-gen.js";
import type { ICryptoChargeRepository } from "./charge-store.js";
import { deriveDepositAddress } from "./evm/address-gen.js";
import { centsToNative } from "./oracle/convert.js";
import type { IPriceOracle } from "./oracle/types.js";
import type { PaymentMethodRecord } from "./payment-method-store.js";

export const MIN_CHECKOUT_USD = 10;

export interface UnifiedCheckoutDeps {
  chargeStore: Pick<ICryptoChargeRepository, "getNextDerivationIndex" | "createStablecoinCharge">;
  oracle: IPriceOracle;
  evmXpub: string;
  btcXpub?: string;
}

export interface UnifiedCheckoutResult {
  depositAddress: string;
  /** Human-readable amount to send (e.g. "50 USDC", "0.014285 ETH"). */
  displayAmount: string;
  amountUsd: number;
  token: string;
  chain: string;
  referenceId: string;
  /** For volatile assets: price at checkout time (USD cents per unit). */
  priceCents?: number;
}

/**
 * Unified checkout — one entry point for all payment methods.
 *
 * Looks up the method record, routes by type:
 *   - erc20: derives EVM address, computes token amount (1:1 USD for stablecoins)
 *   - native (ETH): derives EVM address, oracle-priced
 *   - native (BTC): derives BTC address, oracle-priced
 *
 * CRITICAL: amountUsd → integer cents via Credit.fromDollars().toCentsRounded().
 */
export async function createUnifiedCheckout(
  deps: UnifiedCheckoutDeps,
  method: PaymentMethodRecord,
  opts: { tenant: string; amountUsd: number },
): Promise<UnifiedCheckoutResult> {
  if (!Number.isFinite(opts.amountUsd) || opts.amountUsd < MIN_CHECKOUT_USD) {
    throw new Error(`Minimum payment amount is $${MIN_CHECKOUT_USD}`);
  }

  const amountUsdCents = Credit.fromDollars(opts.amountUsd).toCentsRounded();

  if (method.type === "erc20") {
    return handleErc20(deps, method, opts.tenant, amountUsdCents, opts.amountUsd);
  }
  if (method.type === "native" && method.chain === "base") {
    return handleNativeEvm(deps, method, opts.tenant, amountUsdCents, opts.amountUsd);
  }
  if (method.type === "native") {
    return handleNativeUtxo(deps, method, opts.tenant, amountUsdCents, opts.amountUsd);
  }

  throw new Error(`Unsupported payment method type: ${method.type}/${method.token}`);
}

async function handleErc20(
  deps: UnifiedCheckoutDeps,
  method: PaymentMethodRecord,
  tenant: string,
  amountUsdCents: number,
  amountUsd: number,
): Promise<UnifiedCheckoutResult> {
  const depositAddress = await deriveAndStore(deps, method, tenant, amountUsdCents);

  return {
    depositAddress,
    displayAmount: `${amountUsd} ${method.token}`,
    amountUsd,
    token: method.token,
    chain: method.chain,
    referenceId: `erc20:${method.chain}:${depositAddress}`,
  };
}

async function handleNativeEvm(
  deps: UnifiedCheckoutDeps,
  method: PaymentMethodRecord,
  tenant: string,
  amountUsdCents: number,
  amountUsd: number,
): Promise<UnifiedCheckoutResult> {
  const { priceCents } = await deps.oracle.getPrice("ETH");
  const expectedWei = centsToNative(amountUsdCents, priceCents, 18);
  const depositAddress = await deriveAndStore(deps, method, tenant, amountUsdCents);

  const divisor = BigInt("1000000000000000000");
  const whole = expectedWei / divisor;
  const frac = (expectedWei % divisor).toString().padStart(18, "0").slice(0, 6);

  return {
    depositAddress,
    displayAmount: `${whole}.${frac} ETH`,
    amountUsd,
    token: "ETH",
    chain: method.chain,
    referenceId: `${method.type}:${method.chain}:${depositAddress}`,
    priceCents,
  };
}

/**
 * Handle native UTXO coins (BTC, LTC, DOGE, BCH, etc.).
 * Uses the xpub from the payment method record (DB-driven).
 * Derives bech32 addresses for BTC/LTC, Base58 P2PKH for DOGE.
 */
async function handleNativeUtxo(
  deps: UnifiedCheckoutDeps,
  method: PaymentMethodRecord,
  tenant: string,
  amountUsdCents: number,
  amountUsd: number,
): Promise<UnifiedCheckoutResult> {
  const xpub = method.xpub ?? deps.btcXpub;
  if (!xpub) throw new Error(`${method.token} payments not configured (no xpub)`);

  const { priceCents } = await deps.oracle.getPrice(method.token);
  const rawAmount = centsToNative(amountUsdCents, priceCents, method.decimals);

  const maxRetries = 3;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const derivationIndex = await deps.chargeStore.getNextDerivationIndex();

    // Derive address by chain type
    let depositAddress: string;
    if (method.chain === "dogecoin") {
      depositAddress = deriveP2pkhAddress(xpub, derivationIndex, "dogecoin");
    } else {
      depositAddress = deriveAddress(xpub, derivationIndex, "mainnet", method.chain as "bitcoin" | "litecoin");
    }

    const referenceId = `${method.token.toLowerCase()}:${depositAddress}`;

    try {
      await deps.chargeStore.createStablecoinCharge({
        referenceId,
        tenantId: tenant,
        amountUsdCents,
        chain: method.chain,
        token: method.token,
        depositAddress,
        derivationIndex,
      });

      const divisor = 10 ** method.decimals;
      const displayAmt = (Number(rawAmount) / divisor).toFixed(method.decimals);
      return {
        depositAddress,
        displayAmount: `${displayAmt} ${method.token}`,
        amountUsd,
        token: method.token,
        chain: method.chain,
        referenceId,
        priceCents,
      };
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const isConflict = code === "23505" || (err instanceof Error && err.message.includes("unique_violation"));
      if (!isConflict || attempt === maxRetries) throw err;
    }
  }

  throw new Error("Failed to claim derivation index after retries");
}

/** Derive an EVM deposit address and store the charge. Retries on unique conflict. */
async function deriveAndStore(
  deps: UnifiedCheckoutDeps,
  method: PaymentMethodRecord,
  tenant: string,
  amountUsdCents: number,
): Promise<string> {
  const maxRetries = 3;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const derivationIndex = await deps.chargeStore.getNextDerivationIndex();
    const depositAddress = deriveDepositAddress(deps.evmXpub, derivationIndex);
    const referenceId = `${method.type}:${method.chain}:${depositAddress}`;

    try {
      await deps.chargeStore.createStablecoinCharge({
        referenceId,
        tenantId: tenant,
        amountUsdCents,
        chain: method.chain,
        token: method.token,
        depositAddress,
        derivationIndex,
      });
      return depositAddress;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const isConflict = code === "23505" || (err instanceof Error && err.message.includes("unique_violation"));
      if (!isConflict || attempt === maxRetries) throw err;
    }
  }
  throw new Error("Failed to claim derivation index after retries");
}
