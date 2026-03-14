import { ripemd160 } from "@noble/hashes/legacy.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bech32 } from "@scure/base";
import { HDKey } from "@scure/bip32";

/**
 * Derive a native segwit (bech32, bc1q...) BTC address from an xpub at a given index.
 * Path: xpub / 0 / index (external chain).
 * No private keys involved.
 */
export function deriveBtcAddress(
  xpub: string,
  index: number,
  network: "mainnet" | "testnet" | "regtest" = "mainnet",
): string {
  if (!Number.isInteger(index) || index < 0) throw new Error(`Invalid derivation index: ${index}`);

  const master = HDKey.fromExtendedKey(xpub);
  const child = master.deriveChild(0).deriveChild(index);
  if (!child.publicKey) throw new Error("Failed to derive public key");

  // HASH160 = RIPEMD160(SHA256(compressedPubKey))
  const hash160 = ripemd160(sha256(child.publicKey));

  // Bech32 encode: witness version 0 + 20-byte hash
  const prefix = network === "mainnet" ? "bc" : "tb";
  const words = bech32.toWords(hash160);
  return bech32.encode(prefix, [0, ...words]);
}

/** Derive the BTC treasury address (internal chain, index 0). */
export function deriveBtcTreasury(xpub: string, network: "mainnet" | "testnet" | "regtest" = "mainnet"): string {
  const master = HDKey.fromExtendedKey(xpub);
  const child = master.deriveChild(1).deriveChild(0); // internal chain
  if (!child.publicKey) throw new Error("Failed to derive public key");

  const hash160 = ripemd160(sha256(child.publicKey));
  const prefix = network === "mainnet" ? "bc" : "tb";
  const words = bech32.toWords(hash160);
  return bech32.encode(prefix, [0, ...words]);
}
