import { HDKey } from "@scure/bip32";
import { describe, expect, it, vi } from "vitest";
import { createStablecoinCheckout } from "../checkout.js";

function makeTestXpub(): string {
  const seed = new Uint8Array(32);
  seed[0] = 1;
  const master = HDKey.fromMasterSeed(seed);
  return master.derive("m/44'/60'/0'").publicExtendedKey;
}

const TEST_XPUB = makeTestXpub();

describe("createStablecoinCheckout", () => {
  it("derives address and creates charge", async () => {
    const mockChargeStore = {
      getNextDerivationIndex: vi.fn().mockResolvedValue(42),
      createStablecoinCharge: vi.fn().mockResolvedValue(undefined),
    };

    const result = await createStablecoinCheckout(
      { chargeStore: mockChargeStore as never, xpub: TEST_XPUB },
      { tenant: "t1", amountUsd: 10, chain: "base", token: "USDC" },
    );

    expect(result.depositAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(result.amountRaw).toBe("10000000"); // 10 USDC = 10 * 10^6
    expect(result.chain).toBe("base");
    expect(result.token).toBe("USDC");
    expect(mockChargeStore.createStablecoinCharge).toHaveBeenCalledOnce();

    // Verify charge was created with integer cents, not floating point
    const chargeInput = mockChargeStore.createStablecoinCharge.mock.calls[0][0];
    expect(chargeInput.amountUsdCents).toBe(1000); // $10 = 1000 cents
    expect(Number.isInteger(chargeInput.amountUsdCents)).toBe(true);
  });

  it("rejects below minimum", async () => {
    const mockChargeStore = {
      getNextDerivationIndex: vi.fn().mockResolvedValue(0),
      createStablecoinCharge: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      createStablecoinCheckout(
        { chargeStore: mockChargeStore as never, xpub: TEST_XPUB },
        { tenant: "t1", amountUsd: 5, chain: "base", token: "USDC" },
      ),
    ).rejects.toThrow("Minimum");
  });

  it("stores deposit address in lowercase", async () => {
    const mockChargeStore = {
      getNextDerivationIndex: vi.fn().mockResolvedValue(0),
      createStablecoinCharge: vi.fn().mockResolvedValue(undefined),
    };

    await createStablecoinCheckout(
      { chargeStore: mockChargeStore as never, xpub: TEST_XPUB },
      { tenant: "t1", amountUsd: 10, chain: "base", token: "USDC" },
    );

    const chargeInput = mockChargeStore.createStablecoinCharge.mock.calls[0][0];
    expect(chargeInput.depositAddress).toBe(chargeInput.depositAddress.toLowerCase());
  });

  it("converts $25 correctly to raw USDC amount", async () => {
    const mockChargeStore = {
      getNextDerivationIndex: vi.fn().mockResolvedValue(0),
      createStablecoinCharge: vi.fn().mockResolvedValue(undefined),
    };

    const result = await createStablecoinCheckout(
      { chargeStore: mockChargeStore as never, xpub: TEST_XPUB },
      { tenant: "t1", amountUsd: 25, chain: "base", token: "USDC" },
    );

    expect(result.amountRaw).toBe("25000000"); // 25 * 10^6

    const chargeInput = mockChargeStore.createStablecoinCharge.mock.calls[0][0];
    expect(chargeInput.amountUsdCents).toBe(2500);
  });
});
