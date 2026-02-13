import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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

describe("Plans page", () => {
  it("renders plans heading", async () => {
    const { default: PlansPage } = await import("../app/(dashboard)/billing/plans/page");
    render(<PlansPage />);

    expect(screen.getByText("Loading plans...")).toBeInTheDocument();
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
    expect(contactLink).toHaveAttribute("href", "mailto:sales@wopr.network");
  });
});

describe("Usage page", () => {
  it("renders usage heading and billing period", async () => {
    const { default: UsagePage } = await import("../app/(dashboard)/billing/usage/page");
    render(<UsagePage />);

    expect(screen.getByText("Loading usage...")).toBeInTheDocument();
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

    const toggle = await screen.findByRole("switch");
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

    expect(screen.getByText("Loading payment info...")).toBeInTheDocument();
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
});
