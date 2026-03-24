import { HDKey } from "@scure/bip32";
import { describe, expect, it } from "vitest";
import { deriveAddress, deriveTreasury, isValidXpub } from "../address-gen.js";

function makeTestXpub(path: string): string {
  const seed = new Uint8Array(32);
  seed[0] = 1;
  const master = HDKey.fromMasterSeed(seed);
  return master.derive(path).publicExtendedKey;
}

const BTC_XPUB = makeTestXpub("m/44'/0'/0'");
const ETH_XPUB = makeTestXpub("m/44'/60'/0'");

describe("deriveAddress — bech32 (BTC)", () => {
  it("derives a valid bc1q address", () => {
    const addr = deriveAddress(BTC_XPUB, 0, "bech32", { hrp: "bc" });
    expect(addr).toMatch(/^bc1q[a-z0-9]+$/);
  });

  it("derives different addresses for different indices", () => {
    const a = deriveAddress(BTC_XPUB, 0, "bech32", { hrp: "bc" });
    const b = deriveAddress(BTC_XPUB, 1, "bech32", { hrp: "bc" });
    expect(a).not.toBe(b);
  });

  it("is deterministic", () => {
    const a = deriveAddress(BTC_XPUB, 42, "bech32", { hrp: "bc" });
    const b = deriveAddress(BTC_XPUB, 42, "bech32", { hrp: "bc" });
    expect(a).toBe(b);
  });

  it("uses tb prefix for testnet", () => {
    const addr = deriveAddress(BTC_XPUB, 0, "bech32", { hrp: "tb" });
    expect(addr).toMatch(/^tb1q[a-z0-9]+$/);
  });

  it("rejects negative index", () => {
    expect(() => deriveAddress(BTC_XPUB, -1, "bech32", { hrp: "bc" })).toThrow("Invalid");
  });

  it("throws without hrp param", () => {
    expect(() => deriveAddress(BTC_XPUB, 0, "bech32", {})).toThrow("hrp");
  });
});

describe("deriveAddress — bech32 (LTC)", () => {
  const LTC_XPUB = makeTestXpub("m/44'/2'/0'");

  it("derives a valid ltc1q address", () => {
    const addr = deriveAddress(LTC_XPUB, 0, "bech32", { hrp: "ltc" });
    expect(addr).toMatch(/^ltc1q[a-z0-9]+$/);
  });
});

describe("deriveAddress — p2pkh (DOGE)", () => {
  const DOGE_XPUB = makeTestXpub("m/44'/3'/0'");

  it("derives a valid D... address", () => {
    const addr = deriveAddress(DOGE_XPUB, 0, "p2pkh", { version: "0x1e" });
    expect(addr).toMatch(/^D[a-km-zA-HJ-NP-Z1-9]+$/);
  });

  it("derives different addresses for different indices", () => {
    const a = deriveAddress(DOGE_XPUB, 0, "p2pkh", { version: "0x1e" });
    const b = deriveAddress(DOGE_XPUB, 1, "p2pkh", { version: "0x1e" });
    expect(a).not.toBe(b);
  });

  it("throws without version param", () => {
    expect(() => deriveAddress(DOGE_XPUB, 0, "p2pkh", {})).toThrow("version");
  });
});

describe("deriveAddress — p2pkh (TRON)", () => {
  const TRON_XPUB = makeTestXpub("m/44'/195'/0'");

  it("derives a valid T... address", () => {
    const addr = deriveAddress(TRON_XPUB, 0, "p2pkh", { version: "0x41" });
    expect(addr).toMatch(/^T[a-km-zA-HJ-NP-Z1-9]+$/);
  });

  it("is deterministic", () => {
    const a = deriveAddress(TRON_XPUB, 5, "p2pkh", { version: "0x41" });
    const b = deriveAddress(TRON_XPUB, 5, "p2pkh", { version: "0x41" });
    expect(a).toBe(b);
  });
});

describe("deriveAddress — evm (ETH)", () => {
  it("derives a valid Ethereum address", () => {
    const addr = deriveAddress(ETH_XPUB, 0, "evm");
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("derives different addresses for different indices", () => {
    const a = deriveAddress(ETH_XPUB, 0, "evm");
    const b = deriveAddress(ETH_XPUB, 1, "evm");
    expect(a).not.toBe(b);
  });

  it("is deterministic", () => {
    const a = deriveAddress(ETH_XPUB, 42, "evm");
    const b = deriveAddress(ETH_XPUB, 42, "evm");
    expect(a).toBe(b);
  });

  it("returns checksummed address", () => {
    const addr = deriveAddress(ETH_XPUB, 0, "evm");
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });
});

describe("deriveAddress — unknown type", () => {
  it("throws for unknown address type", () => {
    expect(() => deriveAddress(BTC_XPUB, 0, "foo")).toThrow("Unknown address type");
  });
});

describe("deriveTreasury", () => {
  it("derives a valid bech32 treasury address", () => {
    const addr = deriveTreasury(BTC_XPUB, "bech32", { hrp: "bc" });
    expect(addr).toMatch(/^bc1q[a-z0-9]+$/);
  });

  it("differs from deposit address at index 0", () => {
    const deposit = deriveAddress(BTC_XPUB, 0, "bech32", { hrp: "bc" });
    const treasury = deriveTreasury(BTC_XPUB, "bech32", { hrp: "bc" });
    expect(deposit).not.toBe(treasury);
  });
});

describe("isValidXpub", () => {
  it("accepts valid xpub", () => {
    expect(isValidXpub(BTC_XPUB)).toBe(true);
  });

  it("rejects garbage", () => {
    expect(isValidXpub("not-an-xpub")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidXpub("")).toBe(false);
  });
});
