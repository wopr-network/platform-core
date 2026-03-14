import { HDKey } from "@scure/bip32";
import { describe, expect, it } from "vitest";
import { deriveBtcAddress, deriveBtcTreasury } from "../address-gen.js";

function makeTestXpub(): string {
  const seed = new Uint8Array(32);
  seed[0] = 1;
  const master = HDKey.fromMasterSeed(seed);
  return master.derive("m/44'/0'/0'").publicExtendedKey;
}

const TEST_XPUB = makeTestXpub();

describe("deriveBtcAddress", () => {
  it("derives a valid bech32 address", () => {
    const addr = deriveBtcAddress(TEST_XPUB, 0);
    expect(addr).toMatch(/^bc1q[a-z0-9]+$/);
  });

  it("derives different addresses for different indices", () => {
    const a = deriveBtcAddress(TEST_XPUB, 0);
    const b = deriveBtcAddress(TEST_XPUB, 1);
    expect(a).not.toBe(b);
  });

  it("is deterministic", () => {
    const a = deriveBtcAddress(TEST_XPUB, 42);
    const b = deriveBtcAddress(TEST_XPUB, 42);
    expect(a).toBe(b);
  });

  it("uses tb prefix for testnet/regtest", () => {
    const addr = deriveBtcAddress(TEST_XPUB, 0, "testnet");
    expect(addr).toMatch(/^tb1q[a-z0-9]+$/);
  });

  it("rejects negative index", () => {
    expect(() => deriveBtcAddress(TEST_XPUB, -1)).toThrow("Invalid");
  });
});

describe("deriveBtcTreasury", () => {
  it("derives a valid bech32 address", () => {
    const addr = deriveBtcTreasury(TEST_XPUB);
    expect(addr).toMatch(/^bc1q[a-z0-9]+$/);
  });

  it("differs from deposit address at index 0", () => {
    const deposit = deriveBtcAddress(TEST_XPUB, 0);
    const treasury = deriveBtcTreasury(TEST_XPUB);
    expect(deposit).not.toBe(treasury);
  });
});
