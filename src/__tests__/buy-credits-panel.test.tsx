import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockGetCreditOptions, mockCreateCreditCheckout } = vi.hoisted(() => ({
  mockGetCreditOptions: vi.fn(),
  mockCreateCreditCheckout: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  getCreditOptions: (...args: unknown[]) => mockGetCreditOptions(...args),
  createCreditCheckout: (...args: unknown[]) => mockCreateCreditCheckout(...args),
}));

vi.mock("framer-motion", () => ({
  motion: {
    button: ({
      children,
      className,
      onClick,
      type,
    }: React.PropsWithChildren<{
      className?: string;
      onClick?: () => void;
      type?: string;
    }>) => (
      <button type={(type as "button") ?? "button"} className={className} onClick={onClick}>
        {children}
      </button>
    ),
    div: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => <div>{children}</div>,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/billing/credits",
}));

vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    useSession: () => ({ data: null, isPending: false, error: null }),
  }),
}));

const MOCK_TIERS = [
  { priceId: "price_5", label: "$5", amountCents: 500, creditCents: 500, bonusPercent: 0 },
  { priceId: "price_20", label: "$20", amountCents: 2000, creditCents: 2200, bonusPercent: 10 },
  { priceId: "price_50", label: "$50", amountCents: 5000, creditCents: 6000, bonusPercent: 20 },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BuyCreditsPanel", () => {
  it("shows loading skeletons while fetching credit options", async () => {
    // Never resolve so we stay in loading state
    mockGetCreditOptions.mockReturnValue(
      new Promise(() => {
        /* intentionally pending */
      }),
    );
    const { BuyCreditsPanel } = await import("../components/billing/buy-credits-panel");
    render(<BuyCreditsPanel />);

    expect(screen.getByText("Buy Credits")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(1);
  });

  it("renders credit tiers with correct labels after loading", async () => {
    mockGetCreditOptions.mockResolvedValue(MOCK_TIERS);
    const { BuyCreditsPanel } = await import("../components/billing/buy-credits-panel");
    render(<BuyCreditsPanel />);

    expect(await screen.findByText("$5")).toBeInTheDocument();
    expect(screen.getByText("$20")).toBeInTheDocument();
    expect(screen.getByText("$50")).toBeInTheDocument();
  });

  it("renders bonus badge for tiers with bonusPercent > 0", async () => {
    mockGetCreditOptions.mockResolvedValue(MOCK_TIERS);
    const { BuyCreditsPanel } = await import("../components/billing/buy-credits-panel");
    render(<BuyCreditsPanel />);

    expect(await screen.findByText("+10%")).toBeInTheDocument();
    expect(screen.getByText("+20%")).toBeInTheDocument();
    // $5 tier has 0% bonus — no badge
    expect(screen.queryByText("+0%")).not.toBeInTheDocument();
  });

  it("shows unavailable message when no credit options returned", async () => {
    mockGetCreditOptions.mockResolvedValue([]);
    const { BuyCreditsPanel } = await import("../components/billing/buy-credits-panel");
    render(<BuyCreditsPanel />);

    expect(
      await screen.findByText("Credit purchases are not available at this time."),
    ).toBeInTheDocument();
  });

  it("shows unavailable message when getCreditOptions fails", async () => {
    // When getCreditOptions rejects, tiers stays empty, so the "unavailable" branch renders.
    // The error message set in state is only visible in the main branch (when tiers.length > 0),
    // so on fetch failure the user sees the empty-tiers fallback.
    mockGetCreditOptions.mockRejectedValue(new Error("Network error"));
    const { BuyCreditsPanel } = await import("../components/billing/buy-credits-panel");
    render(<BuyCreditsPanel />);

    expect(
      await screen.findByText("Credit purchases are not available at this time."),
    ).toBeInTheDocument();
  });

  it("Buy button is disabled when no tier is selected", async () => {
    mockGetCreditOptions.mockResolvedValue(MOCK_TIERS);
    const { BuyCreditsPanel } = await import("../components/billing/buy-credits-panel");
    render(<BuyCreditsPanel />);

    const buyBtn = await screen.findByRole("button", { name: "Buy credits" });
    expect(buyBtn).toBeDisabled();
  });

  it("Buy button is enabled after selecting a tier", async () => {
    mockGetCreditOptions.mockResolvedValue(MOCK_TIERS);
    const user = userEvent.setup();
    const { BuyCreditsPanel } = await import("../components/billing/buy-credits-panel");
    render(<BuyCreditsPanel />);

    const tierBtn = await screen.findByText("$20");
    await user.click(tierBtn);

    const buyBtn = screen.getByRole("button", { name: "Buy credits" });
    expect(buyBtn).toBeEnabled();
  });

  it("calls createCreditCheckout with selected priceId on Buy click", async () => {
    mockGetCreditOptions.mockResolvedValue(MOCK_TIERS);
    // Mock location.href setter
    const hrefSetter = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, href: "" },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window.location, "href", {
      set: hrefSetter,
      configurable: true,
    });

    mockCreateCreditCheckout.mockResolvedValue({
      checkoutUrl: "https://checkout.stripe.com/session123",
    });

    const user = userEvent.setup();
    const { BuyCreditsPanel } = await import("../components/billing/buy-credits-panel");
    render(<BuyCreditsPanel />);

    const tierBtn = await screen.findByText("$20");
    await user.click(tierBtn);

    const buyBtn = screen.getByRole("button", { name: "Buy credits" });
    await user.click(buyBtn);

    expect(mockCreateCreditCheckout).toHaveBeenCalledWith("price_20");
    expect(hrefSetter).toHaveBeenCalledWith("https://checkout.stripe.com/session123");
  });

  it("shows Redirecting... while checkout is in progress", async () => {
    mockGetCreditOptions.mockResolvedValue(MOCK_TIERS);
    // Never resolve so we stay in loading state
    mockCreateCreditCheckout.mockReturnValue(
      new Promise(() => {
        /* intentionally pending */
      }),
    );

    const user = userEvent.setup();
    const { BuyCreditsPanel } = await import("../components/billing/buy-credits-panel");
    render(<BuyCreditsPanel />);

    const tierBtn = await screen.findByText("$5");
    await user.click(tierBtn);

    const buyBtn = screen.getByRole("button", { name: "Buy credits" });
    await user.click(buyBtn);

    expect(await screen.findByText("Redirecting...")).toBeInTheDocument();
  });

  it("shows error when checkout fails", async () => {
    mockGetCreditOptions.mockResolvedValue(MOCK_TIERS);
    mockCreateCreditCheckout.mockRejectedValue(new Error("Stripe error"));

    const user = userEvent.setup();
    const { BuyCreditsPanel } = await import("../components/billing/buy-credits-panel");
    render(<BuyCreditsPanel />);

    const tierBtn = await screen.findByText("$5");
    await user.click(tierBtn);

    const buyBtn = screen.getByRole("button", { name: "Buy credits" });
    await user.click(buyBtn);

    expect(await screen.findByText("Checkout failed. Please try again.")).toBeInTheDocument();
  });
});
