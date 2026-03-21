import { afterEach, describe, expect, it, vi } from "vitest";

const {
  mockOrgBillingBalanceQuery,
  mockOrgMemberUsageQuery,
  mockOrgBillingInfoQuery,
  mockOrgTopupCheckoutMutate,
  mockOrgSetDefaultPaymentMethodMutate,
} = vi.hoisted(() => ({
  mockOrgBillingBalanceQuery: vi.fn(),
  mockOrgMemberUsageQuery: vi.fn(),
  mockOrgBillingInfoQuery: vi.fn(),
  mockOrgTopupCheckoutMutate: vi.fn(),
  mockOrgSetDefaultPaymentMethodMutate: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpcVanilla: {
    org: {
      orgBillingBalance: { query: mockOrgBillingBalanceQuery },
      orgMemberUsage: { query: mockOrgMemberUsageQuery },
      orgBillingInfo: { query: mockOrgBillingInfoQuery },
      orgTopupCheckout: { mutate: mockOrgTopupCheckoutMutate },
      orgSetDefaultPaymentMethod: { mutate: mockOrgSetDefaultPaymentMethodMutate },
    },
  },
  trpc: {},
}));

import {
  createOrgTopupCheckout,
  getOrgBillingInfo,
  getOrgCreditBalance,
  getOrgMemberUsage,
  setOrgDefaultPaymentMethod,
} from "@/lib/org-billing-api";

describe("getOrgCreditBalance", () => {
  afterEach(() => vi.clearAllMocks());

  it("converts cents to dollars and returns balance", async () => {
    mockOrgBillingBalanceQuery.mockResolvedValue({
      balanceCents: 5000,
      dailyBurnCents: 200,
      runwayDays: 25,
    });

    const result = await getOrgCreditBalance("org-1");
    expect(result).toEqual({
      balance: 50,
      dailyBurn: 2,
      runway: 25,
    });
    expect(mockOrgBillingBalanceQuery).toHaveBeenCalledWith({ orgId: "org-1" });
  });

  it("defaults to zero balance when response fields are null", async () => {
    mockOrgBillingBalanceQuery.mockResolvedValue({
      balanceCents: null,
      dailyBurnCents: null,
      runwayDays: null,
    });

    const result = await getOrgCreditBalance("org-1");
    expect(result).toEqual({
      balance: 0,
      dailyBurn: 0,
      runway: null,
    });
  });

  it("defaults to zero balance when response fields are undefined", async () => {
    mockOrgBillingBalanceQuery.mockResolvedValue({});

    const result = await getOrgCreditBalance("org-1");
    expect(result).toEqual({
      balance: 0,
      dailyBurn: 0,
      runway: null,
    });
  });

  it("propagates tRPC errors", async () => {
    mockOrgBillingBalanceQuery.mockRejectedValue(new Error("Forbidden"));
    await expect(getOrgCreditBalance("org-1")).rejects.toThrow("Forbidden");
  });
});

describe("getOrgMemberUsage", () => {
  afterEach(() => vi.clearAllMocks());

  it("transforms member usage with cents-to-dollars conversion", async () => {
    mockOrgMemberUsageQuery.mockResolvedValue({
      orgId: "org-1",
      periodStart: "2026-03-01",
      members: [
        {
          memberId: "m-1",
          name: "Alice",
          email: "alice@test.com",
          creditsConsumedCents: 1500,
          lastActiveAt: "2026-03-02T10:00:00Z",
        },
        {
          memberId: "m-2",
          name: "Bob",
          email: "bob@test.com",
          creditsConsumedCents: 300,
          lastActiveAt: null,
        },
      ],
    });

    const result = await getOrgMemberUsage("org-1");
    expect(result).toEqual({
      orgId: "org-1",
      periodStart: "2026-03-01",
      members: [
        {
          memberId: "m-1",
          name: "Alice",
          email: "alice@test.com",
          creditsConsumed: 15,
          lastActiveAt: "2026-03-02T10:00:00Z",
        },
        {
          memberId: "m-2",
          name: "Bob",
          email: "bob@test.com",
          creditsConsumed: 3,
          lastActiveAt: null,
        },
      ],
    });
    expect(mockOrgMemberUsageQuery).toHaveBeenCalledWith({ orgId: "org-1" });
  });

  it("defaults member fields when properties are missing", async () => {
    mockOrgMemberUsageQuery.mockResolvedValue({
      orgId: "org-1",
      periodStart: "2026-03-01",
      members: [{}],
    });

    const result = await getOrgMemberUsage("org-1");
    expect(result.members[0]).toEqual({
      memberId: "",
      name: "",
      email: "",
      creditsConsumed: 0,
      lastActiveAt: null,
    });
  });

  it("handles null members array", async () => {
    mockOrgMemberUsageQuery.mockResolvedValue({
      orgId: "org-1",
      periodStart: "2026-03-01",
      members: null,
    });

    const result = await getOrgMemberUsage("org-1");
    expect(result.members).toEqual([]);
  });

  it("falls back orgId and periodStart when missing from response", async () => {
    mockOrgMemberUsageQuery.mockResolvedValue({
      members: [],
    });

    const result = await getOrgMemberUsage("org-1");
    expect(result.orgId).toBe("org-1");
    expect(result.periodStart).toBe("");
  });

  it("propagates tRPC errors", async () => {
    mockOrgMemberUsageQuery.mockRejectedValue(new Error("Server error"));
    await expect(getOrgMemberUsage("org-1")).rejects.toThrow("Server error");
  });
});

describe("getOrgBillingInfo", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns payment methods and invoices", async () => {
    const paymentMethods = [{ id: "pm-1", brand: "visa", last4: "4242" }];
    const invoices = [{ id: "inv-1", amount: 5000, status: "paid" }];
    mockOrgBillingInfoQuery.mockResolvedValue({ paymentMethods, invoices });

    const result = await getOrgBillingInfo("org-1");
    expect(result).toEqual({ paymentMethods, invoices });
    expect(mockOrgBillingInfoQuery).toHaveBeenCalledWith({ orgId: "org-1" });
  });

  it("defaults to empty arrays when fields are null", async () => {
    mockOrgBillingInfoQuery.mockResolvedValue({
      paymentMethods: null,
      invoices: null,
    });

    const result = await getOrgBillingInfo("org-1");
    expect(result).toEqual({ paymentMethods: [], invoices: [] });
  });

  it("defaults to empty arrays when fields are undefined", async () => {
    mockOrgBillingInfoQuery.mockResolvedValue({});

    const result = await getOrgBillingInfo("org-1");
    expect(result).toEqual({ paymentMethods: [], invoices: [] });
  });

  it("propagates tRPC errors", async () => {
    mockOrgBillingInfoQuery.mockRejectedValue(new Error("Not found"));
    await expect(getOrgBillingInfo("org-1")).rejects.toThrow("Not found");
  });
});

describe("createOrgTopupCheckout", () => {
  afterEach(() => vi.clearAllMocks());

  it("passes all parameters to tRPC mutate", async () => {
    const checkoutUrl = "https://checkout.stripe.com/session-123";
    mockOrgTopupCheckoutMutate.mockResolvedValue(checkoutUrl);

    const result = await createOrgTopupCheckout(
      "org-1",
      "price-abc",
      "https://app.example.com/billing?success=true",
      "https://app.example.com/billing?canceled=true",
    );
    expect(result).toBe(checkoutUrl);
    expect(mockOrgTopupCheckoutMutate).toHaveBeenCalledWith({
      orgId: "org-1",
      priceId: "price-abc",
      successUrl: "https://app.example.com/billing?success=true",
      cancelUrl: "https://app.example.com/billing?canceled=true",
    });
  });

  it("propagates tRPC errors", async () => {
    mockOrgTopupCheckoutMutate.mockRejectedValue(new Error("Invalid price"));
    await expect(
      createOrgTopupCheckout("org-1", "bad-price", "http://s", "http://c"),
    ).rejects.toThrow("Invalid price");
  });
});

describe("setOrgDefaultPaymentMethod", () => {
  afterEach(() => vi.clearAllMocks());

  it("calls tRPC mutate with orgId and paymentMethodId", async () => {
    mockOrgSetDefaultPaymentMethodMutate.mockResolvedValue(undefined);

    await setOrgDefaultPaymentMethod("org-1", "pm-2");
    expect(mockOrgSetDefaultPaymentMethodMutate).toHaveBeenCalledWith({
      orgId: "org-1",
      paymentMethodId: "pm-2",
    });
  });

  it("propagates tRPC errors", async () => {
    mockOrgSetDefaultPaymentMethodMutate.mockRejectedValue(new Error("Forbidden"));
    await expect(setOrgDefaultPaymentMethod("org-1", "pm-2")).rejects.toThrow("Forbidden");
  });
});
