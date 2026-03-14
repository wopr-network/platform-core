import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockCreateCryptoCheckout, mockIsAllowedRedirectUrl } = vi.hoisted(() => ({
  mockCreateCryptoCheckout: vi.fn(),
  mockIsAllowedRedirectUrl: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  createCryptoCheckout: (...args: unknown[]) => mockCreateCryptoCheckout(...args),
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
  }),
}));

vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>();
  return {
    ...actual,
    Bitcoin: () => <span data-testid="bitcoin-icon" />,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  mockIsAllowedRedirectUrl.mockReset();
  mockCreateCryptoCheckout.mockReset();
});

describe("BuyCryptoCreditPanel", () => {
  it("renders crypto amount buttons ($10, $25, $50, $100)", async () => {
    const { BuyCryptoCreditPanel } = await import("../components/billing/buy-crypto-credits-panel");
    render(<BuyCryptoCreditPanel />);

    expect(screen.getByText("Pay with Crypto")).toBeInTheDocument();
    expect(screen.getByText("$10")).toBeInTheDocument();
    expect(screen.getByText("$25")).toBeInTheDocument();
    expect(screen.getByText("$50")).toBeInTheDocument();
    expect(screen.getByText("$100")).toBeInTheDocument();
  });

  it("Pay button is disabled when no amount selected", async () => {
    const { BuyCryptoCreditPanel } = await import("../components/billing/buy-crypto-credits-panel");
    render(<BuyCryptoCreditPanel />);

    const payBtn = screen.getByRole("button", { name: "Pay with crypto" });
    expect(payBtn).toBeDisabled();
  });

  it("Pay button is enabled after selecting an amount", async () => {
    const user = userEvent.setup();
    const { BuyCryptoCreditPanel } = await import("../components/billing/buy-crypto-credits-panel");
    render(<BuyCryptoCreditPanel />);

    await user.click(screen.getByText("$25"));
    expect(screen.getByRole("button", { name: "Pay with crypto" })).toBeEnabled();
  });

  it("calls createCryptoCheckout with selected amount and redirects", async () => {
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

    await user.click(screen.getByText("$50"));
    await user.click(screen.getByRole("button", { name: "Pay with crypto" }));

    expect(mockCreateCryptoCheckout).toHaveBeenCalledWith(50);
    expect(mockIsAllowedRedirectUrl).toHaveBeenCalledWith("https://btcpay.example.com/i/abc123");
    expect(hrefSetter).toHaveBeenCalledWith("https://btcpay.example.com/i/abc123");
  });

  it("shows error when redirect URL is not allowed", async () => {
    mockCreateCryptoCheckout.mockResolvedValue({
      url: "https://evil.com/steal",
      referenceId: "ref-evil",
    });
    mockIsAllowedRedirectUrl.mockReturnValue(false);

    const user = userEvent.setup();
    const { BuyCryptoCreditPanel } = await import("../components/billing/buy-crypto-credits-panel");
    render(<BuyCryptoCreditPanel />);

    await user.click(screen.getByText("$10"));
    await user.click(screen.getByRole("button", { name: "Pay with crypto" }));

    expect(
      await screen.findByText("Unexpected checkout URL. Please contact support."),
    ).toBeInTheDocument();
  });

  it("shows Opening checkout... while checkout is in progress", async () => {
    mockCreateCryptoCheckout.mockReturnValue(
      new Promise(() => {
        /* intentionally pending */
      }),
    );

    const user = userEvent.setup();
    const { BuyCryptoCreditPanel } = await import("../components/billing/buy-crypto-credits-panel");
    render(<BuyCryptoCreditPanel />);

    await user.click(screen.getByText("$100"));
    await user.click(screen.getByRole("button", { name: "Pay with crypto" }));

    expect(await screen.findByText("Opening checkout...")).toBeInTheDocument();
  });

  it("shows error when crypto checkout API call fails", async () => {
    mockCreateCryptoCheckout.mockRejectedValue(new Error("API down"));

    const user = userEvent.setup();
    const { BuyCryptoCreditPanel } = await import("../components/billing/buy-crypto-credits-panel");
    render(<BuyCryptoCreditPanel />);

    await user.click(screen.getByText("$25"));
    await user.click(screen.getByRole("button", { name: "Pay with crypto" }));

    expect(await screen.findByText("Checkout failed. Please try again.")).toBeInTheDocument();
  });

  it("displays minimum amount note", async () => {
    const { BuyCryptoCreditPanel } = await import("../components/billing/buy-crypto-credits-panel");
    render(<BuyCryptoCreditPanel />);

    expect(screen.getByText(/Minimum \$10/)).toBeInTheDocument();
  });
});
