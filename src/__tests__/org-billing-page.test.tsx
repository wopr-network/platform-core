import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/billing/credits",
}));

vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    useSession: () => ({ data: null, isPending: false, error: null }),
    signIn: { email: vi.fn(), social: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/lib/org-billing-api", () => ({
  getOrgCreditBalance: vi.fn().mockResolvedValue({ balance: 50, dailyBurn: 1, runway: 50 }),
  getOrgMemberUsage: vi.fn().mockResolvedValue({
    orgId: "org-1",
    periodStart: "2026-02-01T00:00:00.000Z",
    members: [
      {
        memberId: "m1",
        name: "Alice",
        email: "alice@test.com",
        creditsConsumed: 12.5,
        lastActiveAt: "2026-02-24T10:00:00Z",
      },
      {
        memberId: "m2",
        name: "Bob",
        email: "bob@test.com",
        creditsConsumed: 7.3,
        lastActiveAt: null,
      },
    ],
  }),
  getOrgBillingInfo: vi.fn().mockResolvedValue({ paymentMethods: [], invoices: [] }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getCreditOptions: vi.fn().mockResolvedValue([]),
  };
});

import { OrgBillingPage } from "@/components/billing/org-billing-page";

describe("OrgBillingPage", () => {
  it("renders org credit balance heading", async () => {
    render(<OrgBillingPage orgId="org-1" orgName="Test Org" isAdmin={true} />);
    expect(await screen.findByText("Org Credits")).toBeInTheDocument();
  });

  it("shows org context banner", async () => {
    render(<OrgBillingPage orgId="org-1" orgName="Test Org" isAdmin={true} />);
    expect(await screen.findByText("Test Org")).toBeInTheDocument();
  });

  it("shows per-member usage table for admins", async () => {
    render(<OrgBillingPage orgId="org-1" orgName="Test Org" isAdmin={true} />);
    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(await screen.findByText("Bob")).toBeInTheDocument();
  });

  it("hides per-member usage for non-admins", async () => {
    render(<OrgBillingPage orgId="org-1" orgName="Test Org" isAdmin={false} />);
    expect(await screen.findByText("Org Credits")).toBeInTheDocument();
    const memberTable = screen.queryByText("Per-Member Usage");
    expect(memberTable).not.toBeInTheDocument();
  });

  it("shows org payment methods card", async () => {
    render(<OrgBillingPage orgId="org-1" orgName="Test Org" isAdmin={true} />);
    expect(await screen.findByText("Org Payment Methods")).toBeInTheDocument();
  });

  it("hides buy credits panel for non-admins", async () => {
    render(<OrgBillingPage orgId="org-1" orgName="Test Org" isAdmin={false} />);
    expect(await screen.findByText("Org Credits")).toBeInTheDocument();
    const buyCredits = screen.queryByText("Buy Credits");
    expect(buyCredits).not.toBeInTheDocument();
  });
});
