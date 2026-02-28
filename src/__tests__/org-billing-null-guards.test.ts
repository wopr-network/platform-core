import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpcVanilla: {
    org: {
      orgBillingBalance: { query: vi.fn() },
      orgMemberUsage: { query: vi.fn() },
      orgBillingInfo: { query: vi.fn() },
      orgTopupCheckout: { mutate: vi.fn() },
    },
  },
}));

describe("org-billing-api null guards", () => {
  it("getOrgCreditBalance handles empty response", async () => {
    const { trpcVanilla } = await import("@/lib/trpc");
    const org = (trpcVanilla as any).org;
    org.orgBillingBalance.query.mockResolvedValue({});

    const { getOrgCreditBalance } = await import("@/lib/org-billing-api");
    const result = await getOrgCreditBalance("org-1");
    expect(result.balance).toBe(0);
    expect(result.dailyBurn).toBe(0);
    expect(result.runway).toBeNull();
  });

  it("getOrgMemberUsage handles missing members array", async () => {
    const { trpcVanilla } = await import("@/lib/trpc");
    const org = (trpcVanilla as any).org;
    org.orgMemberUsage.query.mockResolvedValue({ orgId: "o", periodStart: "2026-01-01" });

    const { getOrgMemberUsage } = await import("@/lib/org-billing-api");
    const result = await getOrgMemberUsage("org-1");
    expect(result.members).toEqual([]);
  });

  it("getOrgBillingInfo handles empty response", async () => {
    const { trpcVanilla } = await import("@/lib/trpc");
    const org = (trpcVanilla as any).org;
    org.orgBillingInfo.query.mockResolvedValue({});

    const { getOrgBillingInfo } = await import("@/lib/org-billing-api");
    const result = await getOrgBillingInfo("org-1");
    expect(result.paymentMethods).toEqual([]);
    expect(result.invoices).toEqual([]);
  });
});
