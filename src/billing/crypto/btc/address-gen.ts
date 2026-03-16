import { ripemd160 } from "@noble/hashes/legacy.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bech32 } from "@scure/base";
import { HDKey } from "@scure/bip32";

/** Supported UTXO chains for bech32 address derivation. */
export type UtxoChain = "bitcoin" | "litecoin";

/** Supported network types. */
export type UtxoNetwork = "mainnet" | "testnet" | "regtest";

/** Bech32 HRP (human-readable part) by chain and network. */
const BECH32_PREFIX = {
  bitcoin: { mainnet: "bc", testnet: "tb", regtest: "bcrt" },
  litecoin: { mainnet: "ltc", testnet: "tltc", regtest: "rltc" },
} as const;

function getBech32Prefix(chain: UtxoChain, network: UtxoNetwork): string {
  return BECH32_PREFIX[chain][network];
}

/**
 * Derive a native segwit (bech32) deposit address from an xpub at a given index.
 * Works for BTC (bc1q...) and LTC (ltc1q...) — same HASH160 + bech32 encoding.
 * Path: xpub / 0 / index (external chain).
 * No private keys involved.
 */
export function deriveAddress(
  xpub: string,
  index: number,
  network: UtxoNetwork = "mainnet",
  chain: UtxoChain = "bitcoin",
): string {
  if (!Number.isInteger(index) || index < 0) throw new Error(`Invalid derivation index: ${index}`);

  const master = HDKey.fromExtendedKey(xpub);
  const child = master.deriveChild(0).deriveChild(index);
  if (!child.publicKey) throw new Error("Failed to derive public key");

  const hash160 = ripemd160(sha256(child.publicKey));
  const prefix = getBech32Prefix(chain, network);
  const words = bech32.toWords(hash160);
  return bech32.encode(prefix, [0, ...words]);
}

/** Derive the treasury address (internal chain, index 0). */
export function deriveTreasury(xpub: string, network: UtxoNetwork = "mainnet", chain: UtxoChain = "bitcoin"): string {
  const master = HDKey.fromExtendedKey(xpub);
  const child = master.deriveChild(1).deriveChild(0); // internal chain
  if (!child.publicKey) throw new Error("Failed to derive public key");

  const hash160 = ripemd160(sha256(child.publicKey));
  const prefix = getBech32Prefix(chain, network);
  const words = bech32.toWords(hash160);
  return bech32.encode(prefix, [0, ...words]);
}

/** P2PKH version bytes for Base58Check encoding (chains without bech32). */
const P2PKH_VERSION: Record<string, Record<string, number>> = {
  dogecoin: { mainnet: 0x1e, testnet: 0x71 },
};

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58encode(data: Uint8Array): string {
  let num = 0n;
  for (const byte of data) num = num * 256n + BigInt(byte);
  let encoded = "";
  while (num > 0n) {
    encoded = BASE58_ALPHABET[Number(num % 58n)] + encoded;
    num = num / 58n;
  }
  for (const byte of data) {
    if (byte !== 0) break;
    encoded = `1${encoded}`;
  }
  return encoded;
}

/**
 * Derive a P2PKH (Base58Check) address for chains without bech32 (e.g., DOGE → D...).
 */
export function deriveP2pkhAddress(
  xpub: string,
  index: number,
  chain: string,
  network: "mainnet" | "testnet" = "mainnet",
): string {
  if (!Number.isInteger(index) || index < 0) throw new Error(`Invalid derivation index: ${index}`);
  const version = P2PKH_VERSION[chain]?.[network];
  if (version === undefined) throw new Error(`No P2PKH version for chain=${chain} network=${network}`);

  const master = HDKey.fromExtendedKey(xpub);
  const child = master.deriveChild(0).deriveChild(index);
  if (!child.publicKey) throw new Error("Failed to derive public key");

  const hash160 = ripemd160(sha256(child.publicKey));
  const payload = new Uint8Array(21);
  payload[0] = version;
  payload.set(hash160, 1);
  const checksum = sha256(sha256(payload));
  const full = new Uint8Array(25);
  full.set(payload);
  full.set(checksum.slice(0, 4), 21);
  return base58encode(full);
}

/** @deprecated Use `deriveAddress` instead. */
export const deriveBtcAddress = deriveAddress;

/** @deprecated Use `deriveTreasury` instead. */
export const deriveBtcTreasury = deriveTreasury;

/** Validate that a string is an xpub (not xprv). */
export function isValidXpub(key: string): boolean {
  if (!key.startsWith("xpub")) return false;
  try {
    HDKey.fromExtendedKey(key);
    return true;
  } catch {
    return false;
  }
}
