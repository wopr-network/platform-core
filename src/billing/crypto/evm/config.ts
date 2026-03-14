import type { ChainConfig, EvmChain, StablecoinToken, TokenConfig } from "./types.js";

const CHAINS: Record<EvmChain, ChainConfig> = {
  base: {
    chain: "base",
    rpcUrl: process.env.EVM_RPC_BASE ?? "http://op-geth:8545",
    confirmations: 1,
    blockTimeMs: 2000,
    chainId: 8453,
  },
};

const TOKENS: Record<`${StablecoinToken}:${EvmChain}`, TokenConfig> = {
  "USDC:base": {
    token: "USDC",
    chain: "base",
    contractAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
  },
};

export function getChainConfig(chain: EvmChain): ChainConfig {
  const cfg = CHAINS[chain];
  if (!cfg) throw new Error(`Unsupported chain: ${chain}`);
  return cfg;
}

export function getTokenConfig(token: StablecoinToken, chain: EvmChain): TokenConfig {
  const key = `${token}:${chain}` as const;
  const cfg = TOKENS[key];
  if (!cfg) throw new Error(`Unsupported token ${token} on ${chain}`);
  return cfg;
}

/**
 * Convert USD cents (integer) to token raw amount (BigInt).
 * Stablecoins are 1:1 USD. Integer math only.
 */
export function tokenAmountFromCents(cents: number, decimals: number): bigint {
  if (!Number.isInteger(cents)) throw new Error("cents must be an integer");
  return (BigInt(cents) * 10n ** BigInt(decimals)) / 100n;
}

/**
 * Convert token raw amount (BigInt) to USD cents (integer).
 * Truncates fractional cents.
 */
export function centsFromTokenAmount(rawAmount: bigint, decimals: number): number {
  return Number((rawAmount * 100n) / 10n ** BigInt(decimals));
}
