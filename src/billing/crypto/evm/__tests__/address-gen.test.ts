import { HDKey } from "@scure/bip32";
import { describe, expect, it } from "vitest";
import { deriveDepositAddress, isValidXpub } from "../address-gen.js";

// Generate a test xpub deterministically
function makeTestXpub(): string {
  const seed = new Uint8Array(32);
  seed[0] = 1; // deterministic seed
  const master = HDKey.fromMasterSeed(seed);
  // Derive to m/44'/60'/0' (Ethereum BIP-44 path)
  const account = master.derive("m/44'/60'/0'");
  return account.publicExtendedKey;
}

const TEST_XPUB = makeTestXpub();

describe("deriveDepositAddress", () => {
  it("derives a valid Ethereum address", () => {
    const addr = deriveDepositAddress(TEST_XPUB, 0);
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("derives different addresses for different indices", () => {
    const addr0 = deriveDepositAddress(TEST_XPUB, 0);
    const addr1 = deriveDepositAddress(TEST_XPUB, 1);
    expect(addr0).not.toBe(addr1);
  });

  it("is deterministic — same xpub + index = same address", () => {
    const a = deriveDepositAddress(TEST_XPUB, 42);
    const b = deriveDepositAddress(TEST_XPUB, 42);
    expect(a).toBe(b);
  });

  it("returns checksummed address", () => {
    const addr = deriveDepositAddress(TEST_XPUB, 0);
    // Must be a valid 0x-prefixed address
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/);
    // viem's publicKeyToAddress always returns EIP-55 checksummed
    // Verify it's not all-lowercase (checksummed addresses have mixed case)
    const hexPart = addr.slice(2);
    const hasUpperCase = hexPart !== hexPart.toLowerCase();
    const hasLowerCase = hexPart !== hexPart.toUpperCase();
    // At least one of these should be true for a checksummed address
    // (unless the address happens to be all digits, which is extremely rare)
    expect(hasUpperCase || !hexPart.match(/[a-f]/i)).toBe(true);
    expect(hasLowerCase || !hexPart.match(/[a-f]/i)).toBe(true);
  });
});

describe("isValidXpub", () => {
  it("accepts valid xpub", () => {
    expect(isValidXpub(TEST_XPUB)).toBe(true);
  });

  it("rejects garbage", () => {
    expect(isValidXpub("not-an-xpub")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidXpub("")).toBe(false);
  });
});
