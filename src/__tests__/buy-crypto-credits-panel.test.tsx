import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockCreateCryptoCheckout, mockIsAllowedRedirectUrl, mockGetSupportedPaymentMethods } =
  vi.hoisted(() => ({
    mockCreateCryptoCheckout: vi.fn(),
    mockIsAllowedRedirectUrl: vi.fn(),
    mockGetSupportedPaymentMethods: vi.fn(),
  }));

vi.mock("@/lib/api", () => ({
  createCryptoCheckout: (...args: unknown[]) => mockCreateCryptoCheckout(...args),
  createEthCheckout: vi.fn(),
  createStablecoinCheckout: vi.fn(),
  getSupportedPaymentMethods: (...args: unknown[]) => mockGetSupportedPaymentMethods(...args),
}));

vi.mock("@/lib/validate-redirect-url", () => ({
  isAllowedRedirectUrl: (...args: unknown[]) => mockIsAllowedRedirectUrl(...args),
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
    signIn: { email: vi.fn(), social: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
  }),
}));

vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>();
  return {
    ...actual,
    Bitcoin: () => <span data-testid="bitcoin-icon" />,
  };
});

const MOCK_USDC_METHOD = {
  id: "usdc:base",
  type: "stablecoin",
  label: "USDC on Base",
  token: "USDC",
  chain: "base",
};
const MOCK_BTC_METHOD = {
  id: "btc:btcpay",
  type: "btc",
  label: "BTC",
  token: "BTC",
  chain: "bitcoin",
};

afterEach(() => {
  vi.restoreAllMocks();
  mockIsAllowedRedirectUrl.mockReset();
  mockCreateCryptoCheckout.mockReset();
  mockGetSupportedPaymentMethods.mockReset();
});

describe("BuyCryptoCreditPanel", () => {
  it("renders crypto amount buttons ($10, $25, $50, $100)", async () => {
    mockGetSupportedPaymentMethods.mockResolvedValue([MOCK_USDC_METHOD, MOCK_BTC_METHOD]);
    const { BuyCryptoCreditPanel } = await import("../components/billing/buy-crypto-credits-panel");
    render(<BuyCryptoCreditPanel />);

    expect(screen.getByText("Pay with Crypto")).toBeInTheDocument();
    expect(screen.getByText("$10")).toBeInTheDocument();
    expect(screen.getByText("$25")).toBeInTheDocument();
    expect(screen.getByText("$50")).toBeInTheDocument();
    expect(screen.getByText("$100")).toBeInTheDocument();
  });

  it("Pay button is disabled when no amount selected", async () => {
    mockGetSupportedPaymentMethods.mockResolvedValue([MOCK_USDC_METHOD, MOCK_BTC_METHOD]);
    const { BuyCryptoCreditPanel } = await import("../components/billing/buy-crypto-credits-panel");
    render(<BuyCryptoCreditPanel />);

    // Wait for methods to load
    await waitFor(() => {
      expect(screen.getByText("Stablecoin")).toBeInTheDocument();
    });

    const payBtn = screen.getByRole("button", { name: "Pay with USDC" });
    expect(payBtn).toBeDisabled();
  });

  it("Pay button is enabled after selecting an amount", async () => {
    mockGetSupportedPaymentMethods.mockResolvedValue([MOCK_USDC_METHOD, MOCK_BTC_METHOD]);
    const user = userEvent.setup();
    const { BuyCryptoCreditPanel } = await import("../components/billing/buy-crypto-credits-panel");
    render(<BuyCryptoCreditPanel />);

    await waitFor(() => {
      expect(screen.getByText("Stablecoin")).toBeInTheDocument();
    });

    await user.click(screen.getByText("$25"));
    expect(screen.getByRole("button", { name: "Pay with USDC" })).toBeEnabled();
  });

  it("calls createCryptoCheckout with selected amount and redirects", async () => {
    mockGetSupportedPaymentMethods.mockResolvedValue([MOCK_USDC_METHOD, MOCK_BTC_METHOD]);
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

    mockCreateCryptoCheckout.mockResolvedValue({
      url: "https://btcpay.example.com/i/abc123",
      referenceId: "ref-abc123",
    });
    mockIsAllowedRedirectUrl.mockReturnValue(true);

    const user = userEvent.setup();
    const { BuyCryptoCreditPanel } = await import("../components/billing/buy-crypto-credits-panel");
    render(<BuyCryptoCreditPanel />);

    await waitFor(() => {
      expect(screen.getByText("BTC")).toBeInTheDocument();
    });

    // Switch to BTC tab
    await user.click(screen.getByText("BTC"));
    await user.click(screen.getByText("$50"));
    await user.click(screen.getByRole("button", { name: "Pay with BTC" }));

    expect(mockCreateCryptoCheckout).toHaveBeenCalledWith(50);
    expect(mockIsAllowedRedirectUrl).toHaveBeenCalledWith("https://btcpay.example.com/i/abc123");
    expect(hrefSetter).toHaveBeenCalledWith("https://btcpay.example.com/i/abc123");
  });

  it("shows error when redirect URL is not allowed", async () => {
    mockGetSupportedPaymentMethods.mockResolvedValue([MOCK_USDC_METHOD, MOCK_BTC_METHOD]);
    mockCreateCryptoCheckout.mockResolvedValue({
      url: "https://evil.com/steal",
      referenceId: "ref-evil",
    });
    mockIsAllowedRedirectUrl.mockReturnValue(false);

    const user = userEvent.setup();
    const { BuyCryptoCreditPanel } = await import("../components/billing/buy-crypto-credits-panel");
    render(<BuyCryptoCreditPanel />);

    await waitFor(() => {
      expect(screen.getByText("BTC")).toBeInTheDocument();
    });

    await user.click(screen.getByText("BTC"));
    await user.click(screen.getByText("$10"));
    await user.click(screen.getByRole("button", { name: "Pay with BTC" }));

    expect(
      await screen.findByText("Unexpected checkout URL. Please contact support."),
    ).toBeInTheDocument();
  });

  it("shows Creating checkout... while checkout is in progress", async () => {
    mockGetSupportedPaymentMethods.mockResolvedValue([MOCK_USDC_METHOD, MOCK_BTC_METHOD]);
    mockCreateCryptoCheckout.mockReturnValue(
      new Promise(() => {
        /* intentionally pending */
      }),
    );

    const user = userEvent.setup();
    const { BuyCryptoCreditPanel } = await import("../components/billing/buy-crypto-credits-panel");
    render(<BuyCryptoCreditPanel />);

    await waitFor(() => {
      expect(screen.getByText("BTC")).toBeInTheDocument();
    });

    await user.click(screen.getByText("BTC"));
    await user.click(screen.getByText("$100"));
    await user.click(screen.getByRole("button", { name: "Pay with BTC" }));

    expect(await screen.findByText("Creating checkout...")).toBeInTheDocument();
  });

  it("shows error when crypto checkout API call fails", async () => {
    mockGetSupportedPaymentMethods.mockResolvedValue([MOCK_USDC_METHOD, MOCK_BTC_METHOD]);
    mockCreateCryptoCheckout.mockRejectedValue(new Error("API down"));

    const user = userEvent.setup();
    const { BuyCryptoCreditPanel } = await import("../components/billing/buy-crypto-credits-panel");
    render(<BuyCryptoCreditPanel />);

    await waitFor(() => {
      expect(screen.getByText("BTC")).toBeInTheDocument();
    });

    await user.click(screen.getByText("BTC"));
    await user.click(screen.getByText("$25"));
    await user.click(screen.getByRole("button", { name: "Pay with BTC" }));

    expect(await screen.findByText("Checkout failed. Please try again.")).toBeInTheDocument();
  });
});
