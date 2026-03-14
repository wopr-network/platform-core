import { describe, expect, it } from "vitest";
import { centsToNative, nativeToCents } from "../convert.js";

describe("centsToNative", () => {
  it("converts $50 to ETH wei at $3,500", () => {
    // 5000 cents × 10^18 / 350000 cents = 14285714285714285n wei
    const wei = centsToNative(5000, 350_000, 18);
    expect(wei).toBe(14_285_714_285_714_285n);
  });

  it("converts $50 to BTC sats at $65,000", () => {
    // 5000 cents × 10^8 / 6500000 cents = 76923n sats
    const sats = centsToNative(5000, 6_500_000, 8);
    expect(sats).toBe(76_923n);
  });

  it("converts $100 to ETH wei at $2,000", () => {
    // 10000 cents × 10^18 / 200000 cents = 50000000000000000n wei (0.05 ETH)
    const wei = centsToNative(10_000, 200_000, 18);
    expect(wei).toBe(50_000_000_000_000_000n);
  });

  it("rejects non-integer amountCents", () => {
    expect(() => centsToNative(50.5, 350_000, 18)).toThrow("positive integer");
  });

  it("rejects zero amountCents", () => {
    expect(() => centsToNative(0, 350_000, 18)).toThrow("positive integer");
  });

  it("rejects zero priceCents", () => {
    expect(() => centsToNative(5000, 0, 18)).toThrow("positive integer");
  });

  it("rejects negative decimals", () => {
    expect(() => centsToNative(5000, 350_000, -1)).toThrow("non-negative integer");
  });
});

describe("nativeToCents", () => {
  it("converts ETH wei back to cents at $3,500", () => {
    // 14285714285714285n wei × 350000 / 10^18 = 4999 cents (truncated)
    const cents = nativeToCents(14_285_714_285_714_285n, 350_000, 18);
    expect(cents).toBe(4999); // truncation from integer division
  });

  it("converts BTC sats back to cents at $65,000", () => {
    // 76923n sats × 6500000 / 10^8 = 4999 cents (truncated)
    const cents = nativeToCents(76_923n, 6_500_000, 8);
    expect(cents).toBe(4999);
  });

  it("exact round-trip for clean division", () => {
    // 0.05 ETH at $2,000 = $100
    const cents = nativeToCents(50_000_000_000_000_000n, 200_000, 18);
    expect(cents).toBe(10_000); // $100.00
  });

  it("rejects negative rawAmount", () => {
    expect(() => nativeToCents(-1n, 350_000, 18)).toThrow("non-negative");
  });
});
