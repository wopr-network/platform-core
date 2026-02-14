import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type {
  BillingInfo,
  BillingUsage,
  HostedUsageEvent,
  HostedUsageSummary,
  Plan,
  ProviderCost,
  SpendingLimits,
  UsageDataPoint,
} from "@/lib/api";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/billing/plans",
}));

// Mock better-auth/react
vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    useSession: () => ({ data: null, isPending: false, error: null }),
    signIn: { email: vi.fn(), social: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
  }),
}));

const MOCK_PLANS: Plan[] = [
  {
    id: "plan-free",
    tier: "free",
    name: "Free",
    price: 0,
    priceLabel: "$0 / month",
    features: {
      instanceCap: 1,
      channels: "Web chat only",
      plugins: "Community plugins",
      support: "Community support",
      extras: ["1 GB storage", "1,000 API calls/month"],
    },
  },
  {
    id: "plan-pro",
    tier: "pro",
    name: "Pro",
    price: 29,
    priceLabel: "$29 / month",
    recommended: true,
    features: {
      instanceCap: 5,
      channels: "All channels",
      plugins: "Marketplace plugins",
      support: "Priority support",
      extras: ["10 GB storage", "50,000 API calls/month", "Custom system prompts"],
    },
  },
  {
    id: "plan-team",
    tier: "team",
    name: "Team",
    price: 99,
    priceLabel: "$99 / month",
    features: {
      instanceCap: 20,
      channels: "All channels",
      plugins: "Marketplace + private plugins",
      support: "SLA-backed support",
      extras: [
        "50 GB storage",
        "200,000 API calls/month",
        "Org management",
        "Fleet tools",
        "Audit logs",
      ],
    },
  },
  {
    id: "plan-enterprise",
    tier: "enterprise",
    name: "Enterprise",
    price: null,
    priceLabel: "Contact sales",
    features: {
      instanceCap: null,
      channels: "All channels + custom",
      plugins: "All plugins + custom development",
      support: "Dedicated support engineer",
      extras: [
        "Unlimited storage",
        "Unlimited API calls",
        "Self-hosted option",
        "SSO / SAML",
        "Custom SLA",
        "Dedicated infrastructure",
      ],
    },
  },
];

const MOCK_USAGE: BillingUsage = {
  plan: "pro",
  planName: "Pro",
  billingPeriodStart: "2026-02-01T00:00:00Z",
  billingPeriodEnd: "2026-02-28T23:59:59Z",
  instancesRunning: 3,
  instanceCap: 5,
  storageUsedGb: 2.1,
  storageCapGb: 10,
  apiCalls: 12450,
};

const MOCK_PROVIDER_COSTS: ProviderCost[] = [
  { provider: "Anthropic", estimatedCost: 23.4, inputTokens: 580000, outputTokens: 410000 },
  { provider: "OpenAI", estimatedCost: 8.12, inputTokens: 210000, outputTokens: 145000 },
];

const MOCK_HOSTED_USAGE: HostedUsageSummary = {
  periodStart: "2026-02-01T00:00:00Z",
  periodEnd: "2026-02-28T23:59:59Z",
  capabilities: [
    {
      capability: "transcription",
      label: "Transcription",
      units: 42,
      unitLabel: "min",
      cost: 0.25,
    },
    {
      capability: "image_gen",
      label: "Image Generation",
      units: 18,
      unitLabel: "images",
      cost: 0.9,
    },
    {
      capability: "text_gen",
      label: "Text Generation",
      units: 125000,
      unitLabel: "tokens",
      cost: 0.25,
    },
    {
      capability: "embeddings",
      label: "Embeddings",
      units: 500000,
      unitLabel: "tokens",
      cost: 0.05,
    },
  ],
  totalCost: 1.45,
  includedCredit: 50,
  amountDue: 0,
};

const MOCK_HOSTED_EVENTS: HostedUsageEvent[] = [
  {
    id: "evt-1",
    date: "2026-02-10T12:00:00Z",
    capability: "transcription",
    provider: "Whisper",
    units: 10,
    unitLabel: "min",
    cost: 0.06,
  },
  {
    id: "evt-2",
    date: "2026-02-11T14:00:00Z",
    capability: "image_gen",
    provider: "DALL-E",
    units: 5,
    unitLabel: "images",
    cost: 0.25,
  },
];

const MOCK_SPENDING_LIMITS: SpendingLimits = {
  global: { alertAt: 100, hardCap: 200 },
  perCapability: {
    transcription: { alertAt: null, hardCap: null },
    image_gen: { alertAt: 10, hardCap: 50 },
    text_gen: { alertAt: null, hardCap: null },
    embeddings: { alertAt: null, hardCap: null },
  },
};

function generateUsageHistory(days: number): UsageDataPoint[] {
  const now = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    return {
      date: d.toISOString().split("T")[0],
      apiCalls: Math.floor(Math.random() * 800) + 200,
      instances: Math.floor(Math.random() * 3) + 1,
    };
  });
}

const MOCK_BILLING_INFO: BillingInfo = {
  email: "billing@acme.com",
  paymentMethods: [
    {
      id: "pm-1",
      brand: "Visa",
      last4: "4242",
      expiryMonth: 12,
      expiryYear: 2027,
      isDefault: true,
    },
  ],
  invoices: [
    {
      id: "inv-003",
      date: "2026-02-01T00:00:00Z",
      amount: 29,
      status: "pending",
      downloadUrl: "#",
    },
    {
      id: "inv-002",
      date: "2026-01-01T00:00:00Z",
      amount: 29,
      status: "paid",
      downloadUrl: "#",
    },
    {
      id: "inv-001",
      date: "2025-12-01T00:00:00Z",
      amount: 29,
      status: "paid",
      downloadUrl: "#",
    },
  ],
};

// Mock @/lib/api with BYOK mode by default (for backward compat with existing tests)
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getPlans: vi.fn().mockResolvedValue(MOCK_PLANS),
    getCurrentPlan: vi.fn().mockResolvedValue("pro" as const),
    changePlan: vi.fn().mockResolvedValue(undefined),
    getBillingUsage: vi.fn().mockResolvedValue(MOCK_USAGE),
    getProviderCosts: vi.fn().mockResolvedValue(MOCK_PROVIDER_COSTS),
    getUsageHistory: vi.fn().mockResolvedValue(generateUsageHistory(30)),
    getBillingInfo: vi.fn().mockResolvedValue(MOCK_BILLING_INFO),
    updateBillingEmail: vi.fn().mockResolvedValue(undefined),
    removePaymentMethod: vi.fn().mockResolvedValue(undefined),
    getInferenceMode: vi.fn().mockResolvedValue("byok"),
    getHostedUsageSummary: vi.fn().mockResolvedValue(MOCK_HOSTED_USAGE),
    getHostedUsageEvents: vi.fn().mockResolvedValue(MOCK_HOSTED_EVENTS),
    getSpendingLimits: vi.fn().mockResolvedValue(MOCK_SPENDING_LIMITS),
    updateSpendingLimits: vi.fn().mockResolvedValue(undefined),
  };
});

describe("Plans page", () => {
  it("renders plans heading", async () => {
    const { default: PlansPage } = await import("../app/(dashboard)/billing/plans/page");
    render(<PlansPage />);

    // Initially shows skeleton loading state
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    expect(await screen.findByText("Plans")).toBeInTheDocument();
  });

  it("renders all four plan tiers", async () => {
    const { default: PlansPage } = await import("../app/(dashboard)/billing/plans/page");
    render(<PlansPage />);

    expect(await screen.findByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
  });

  it("shows plan pricing", async () => {
    const { default: PlansPage } = await import("../app/(dashboard)/billing/plans/page");
    render(<PlansPage />);

    expect(await screen.findByText("$0 / month")).toBeInTheDocument();
    expect(screen.getAllByText("$29 / month").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("$99 / month")).toBeInTheDocument();
    // Enterprise shows "Contact sales" as price label and as a link
    expect(screen.getAllByText("Contact sales").length).toBeGreaterThanOrEqual(1);
  });

  it("highlights the current plan", async () => {
    const { default: PlansPage } = await import("../app/(dashboard)/billing/plans/page");
    render(<PlansPage />);

    expect(await screen.findByText("Current")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Current plan" })).toBeDisabled();
  });

  it("shows BYOK callout", async () => {
    const { default: PlansPage } = await import("../app/(dashboard)/billing/plans/page");
    render(<PlansPage />);

    expect(await screen.findByText("Bring Your Own Keys")).toBeInTheDocument();
    // BYOK message appears in both full and compact callouts
    expect(screen.getAllByText(/WOPR never touches your inference/).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("shows instance caps for each plan", async () => {
    const { default: PlansPage } = await import("../app/(dashboard)/billing/plans/page");
    render(<PlansPage />);

    await screen.findByText("Free");
    // Instance caps shown in feature rows
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("Unlimited")).toBeInTheDocument();
  });

  it("shows contact sales for enterprise", async () => {
    const { default: PlansPage } = await import("../app/(dashboard)/billing/plans/page");
    render(<PlansPage />);

    const contactLink = await screen.findByRole("link", { name: "Contact sales" });
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute("href", "mailto:sales@wopr.bot");
  });
});

describe("Usage page", () => {
  it("renders usage heading and billing period", async () => {
    const { default: UsagePage } = await import("../app/(dashboard)/billing/usage/page");
    render(<UsagePage />);

    // Initially shows skeleton loading state
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    expect(await screen.findByText("Usage")).toBeInTheDocument();
    expect(screen.getByText(/Pro plan/)).toBeInTheDocument();
  });

  it("renders platform usage metrics", async () => {
    const { default: UsagePage } = await import("../app/(dashboard)/billing/usage/page");
    render(<UsagePage />);

    expect(await screen.findByText("Platform Usage")).toBeInTheDocument();
    expect(screen.getByText("Instances")).toBeInTheDocument();
    expect(screen.getByText("Storage")).toBeInTheDocument();
    expect(screen.getByText("API calls")).toBeInTheDocument();
  });

  it("renders usage values", async () => {
    const { default: UsagePage } = await import("../app/(dashboard)/billing/usage/page");
    render(<UsagePage />);

    expect(await screen.findByText("3 of 5")).toBeInTheDocument();
    expect(screen.getByText("2.1 of 10.0 GB")).toBeInTheDocument();
    expect(screen.getByText("12,450 this month")).toBeInTheDocument();
  });

  it("renders BYOK cost tracker toggle", async () => {
    const { default: UsagePage } = await import("../app/(dashboard)/billing/usage/page");
    render(<UsagePage />);

    expect(await screen.findByText("BYOK Cost Tracker")).toBeInTheDocument();
    expect(screen.getByLabelText("Off")).toBeInTheDocument();
  });

  it("shows provider costs when cost tracker is enabled", async () => {
    const user = userEvent.setup();
    const { default: UsagePage } = await import("../app/(dashboard)/billing/usage/page");
    render(<UsagePage />);

    const toggle = await screen.findByRole("switch", { name: /off/i });
    await user.click(toggle);

    expect(await screen.findByText("Anthropic")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("~$23.40")).toBeInTheDocument();
    expect(screen.getByText("~$8.12")).toBeInTheDocument();
    expect(screen.getByText(/WOPR does not charge for inference/)).toBeInTheDocument();
  });

  it("renders usage over time chart", async () => {
    const { default: UsagePage } = await import("../app/(dashboard)/billing/usage/page");
    render(<UsagePage />);

    expect(await screen.findByText("Usage Over Time")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Usage bar chart" })).toBeInTheDocument();
  });
});

describe("Payment page", () => {
  it("renders payment heading", async () => {
    const { default: PaymentPage } = await import("../app/(dashboard)/billing/payment/page");
    render(<PaymentPage />);

    // Initially shows skeleton loading state
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    expect(await screen.findByText("Payment")).toBeInTheDocument();
  });

  it("renders payment methods", async () => {
    const { default: PaymentPage } = await import("../app/(dashboard)/billing/payment/page");
    render(<PaymentPage />);

    expect(await screen.findByText("Payment Methods")).toBeInTheDocument();
    expect(screen.getByText(/4242/)).toBeInTheDocument();
    expect(screen.getByText("Visa")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("renders add payment method button", async () => {
    const { default: PaymentPage } = await import("../app/(dashboard)/billing/payment/page");
    render(<PaymentPage />);

    expect(await screen.findByRole("button", { name: "Add payment method" })).toBeInTheDocument();
  });

  it("renders billing email form", async () => {
    const { default: PaymentPage } = await import("../app/(dashboard)/billing/payment/page");
    render(<PaymentPage />);

    expect(await screen.findByText("Billing Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save email" })).toBeInTheDocument();
  });

  it("renders billing history", async () => {
    const { default: PaymentPage } = await import("../app/(dashboard)/billing/payment/page");
    render(<PaymentPage />);

    expect(await screen.findByText("Billing History")).toBeInTheDocument();
    // Multiple invoices with the same amount
    expect(screen.getAllByText("$29.00").length).toBe(3);
    expect(screen.getAllByText("paid").length).toBe(2);
  });

  it("renders download links for invoices", async () => {
    const { default: PaymentPage } = await import("../app/(dashboard)/billing/payment/page");
    render(<PaymentPage />);

    const downloadLinks = await screen.findAllByRole("link", { name: "Download" });
    expect(downloadLinks.length).toBe(3);
  });

  it("renders BYOK messaging", async () => {
    const { default: PaymentPage } = await import("../app/(dashboard)/billing/payment/page");
    render(<PaymentPage />);

    expect(await screen.findByText(/WOPR never touches your inference/)).toBeInTheDocument();
  });

  it("renders remove button for payment methods", async () => {
    const { default: PaymentPage } = await import("../app/(dashboard)/billing/payment/page");
    render(<PaymentPage />);

    expect(await screen.findByRole("button", { name: "Remove" })).toBeInTheDocument();
  });
});

describe("Billing layout", () => {
  it("renders billing navigation links", async () => {
    const { default: BillingLayout } = await import("../app/(dashboard)/billing/layout");
    render(
      <BillingLayout>
        <div>child content</div>
      </BillingLayout>,
    );

    expect(screen.getByText("Plans")).toBeInTheDocument();
    expect(screen.getByText("Usage")).toBeInTheDocument();
    expect(screen.getByText("Payment")).toBeInTheDocument();
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("shows Hosted Usage nav for hosted users", async () => {
    const api = await import("@/lib/api");
    vi.mocked(api.getInferenceMode).mockResolvedValue("hosted");

    const { default: BillingLayout } = await import("../app/(dashboard)/billing/layout");
    render(
      <BillingLayout>
        <div>child content</div>
      </BillingLayout>,
    );

    expect(await screen.findByText("Hosted Usage")).toBeInTheDocument();

    // Reset for other tests
    vi.mocked(api.getInferenceMode).mockResolvedValue("byok");
  });
});

describe("Hosted usage detail page", () => {
  it("renders hosted usage heading", async () => {
    const { default: HostedPage } = await import("../app/(dashboard)/billing/usage/hosted/page");
    render(<HostedPage />);

    expect(screen.getByText("Loading hosted usage...")).toBeInTheDocument();
    expect(await screen.findByText("Hosted Usage Detail")).toBeInTheDocument();
  });

  it("renders usage events table", async () => {
    const { default: HostedPage } = await import("../app/(dashboard)/billing/usage/hosted/page");
    render(<HostedPage />);

    expect(await screen.findByText("Usage Events")).toBeInTheDocument();
    expect(screen.getByText("Whisper")).toBeInTheDocument();
    expect(screen.getByText("DALL-E")).toBeInTheDocument();
    expect(screen.getByText("$0.06")).toBeInTheDocument();
    expect(screen.getByText("$0.25")).toBeInTheDocument();
  });

  it("renders export CSV button", async () => {
    const { default: HostedPage } = await import("../app/(dashboard)/billing/usage/hosted/page");
    render(<HostedPage />);

    expect(await screen.findByRole("button", { name: "Export CSV" })).toBeInTheDocument();
  });

  it("renders capability filter", async () => {
    const { default: HostedPage } = await import("../app/(dashboard)/billing/usage/hosted/page");
    render(<HostedPage />);

    expect(await screen.findByLabelText("Filter by capability")).toBeInTheDocument();
  });

  it("shows total cost in description", async () => {
    const { default: HostedPage } = await import("../app/(dashboard)/billing/usage/hosted/page");
    render(<HostedPage />);

    expect(await screen.findByText(/2 events/)).toBeInTheDocument();
    expect(screen.getByText(/Total: \$0\.31/)).toBeInTheDocument();
  });
});
