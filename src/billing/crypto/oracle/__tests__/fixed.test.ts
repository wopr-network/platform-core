import { describe, expect, it } from "vitest";
import { FixedPriceOracle } from "../fixed.js";

describe("FixedPriceOracle", () => {
  it("returns default ETH price", async () => {
    const oracle = new FixedPriceOracle();
    const result = await oracle.getPrice("ETH");
    expect(result.priceCents).toBe(350_000); // $3,500
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it("returns default BTC price", async () => {
    const oracle = new FixedPriceOracle();
    const result = await oracle.getPrice("BTC");
    expect(result.priceCents).toBe(6_500_000); // $65,000
  });

  it("accepts custom prices", async () => {
    const oracle = new FixedPriceOracle({ ETH: 200_000, BTC: 5_000_000 });
    expect((await oracle.getPrice("ETH")).priceCents).toBe(200_000);
    expect((await oracle.getPrice("BTC")).priceCents).toBe(5_000_000);
  });
});
