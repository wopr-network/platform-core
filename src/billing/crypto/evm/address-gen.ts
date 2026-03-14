import { HDKey } from "@scure/bip32";
import { publicKeyToAddress } from "viem/accounts";

/**
 * Derive a deposit address from an xpub at a given BIP-44 index.
 * Path: xpub / 0 / index (external chain / address index).
 * Returns a checksummed Ethereum address. No private keys involved.
 */
export function deriveDepositAddress(xpub: string, index: number): `0x${string}` {
  if (!Number.isInteger(index) || index < 0) throw new Error(`Invalid derivation index: ${index}`);
  const master = HDKey.fromExtendedKey(xpub);
  const child = master.deriveChild(0).deriveChild(index);
  if (!child.publicKey) throw new Error("Failed to derive public key");

  const hexPubKey =
    `0x${Array.from(child.publicKey, (b) => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
  return publicKeyToAddress(hexPubKey);
}

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
