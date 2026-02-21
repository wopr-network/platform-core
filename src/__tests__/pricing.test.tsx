import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { pricingData } from "../lib/pricing-data";

// Mock fetchPublicPricing to return null (fallback to static data).
// The global fetch stub in setup.ts rejects all requests, so fetchPublicPricing
// would already return null. But we mock the module directly for clarity and
// to allow individual tests to override the return value.
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    fetchPublicPricing: vi.fn().mockResolvedValue(null),
  };
});

// Helper to render async server component
async function renderAsync(component: Promise<React.ReactElement> | React.ReactElement) {
  const resolved = await component;
  return render(resolved);
}

describe("PricingPage", () => {
  it("renders without crashing (fallback mode)", async () => {
    const { PricingPage } = await import("../components/pricing/pricing-page");
    await renderAsync(PricingPage());
    expect(screen.getByText(/you know exactly what you pay/i)).toBeInTheDocument();
  });

  it("shows the bot price ($5/month)", async () => {
    const { PricingPage } = await import("../components/pricing/pricing-page");
    await renderAsync(PricingPage());
    const priceEl = screen.getByTestId("bot-price");
    expect(priceEl).toHaveTextContent("$5");
    expect(priceEl).toHaveTextContent("/month");
  });

  it("shows all capability categories from static fallback", async () => {
    const { PricingPage } = await import("../components/pricing/pricing-page");
    await renderAsync(PricingPage());
    for (const capability of pricingData.capabilities) {
      expect(screen.getByText(capability.category)).toBeInTheDocument();
    }
  });

  it("shows model names from static fallback", async () => {
    const { PricingPage } = await import("../components/pricing/pricing-page");
    await renderAsync(PricingPage());
    for (const capability of pricingData.capabilities) {
      for (const model of capability.models) {
        expect(screen.getByText(model.name)).toBeInTheDocument();
      }
    }
  });

  it("has a CTA link to /signup", async () => {
    const { PricingPage } = await import("../components/pricing/pricing-page");
    await renderAsync(PricingPage());
    const cta = screen.getByRole("link", { name: /get started/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "/signup");
  });

  it("shows the signup credit amount", async () => {
    const { PricingPage } = await import("../components/pricing/pricing-page");
    await renderAsync(PricingPage());
    expect(screen.getByText(/\$5 signup credit/)).toBeInTheDocument();
  });

  it("shows the transparent pricing badge", async () => {
    const { PricingPage } = await import("../components/pricing/pricing-page");
    await renderAsync(PricingPage());
    const badge = screen.getByText("Transparent pricing");
    expect(badge).toHaveAttribute("data-variant", "terminal");
  });

  it("renders with live API data when available", async () => {
    const { fetchPublicPricing } = await import("@/lib/api");
    (fetchPublicPricing as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      rates: {
        llm: [{ name: "Test LLM Model", unit: "1M tokens", price: 5.0 }],
      },
    });

    const { PricingPage } = await import("../components/pricing/pricing-page");
    await renderAsync(PricingPage());
    expect(screen.getByText("Test LLM Model")).toBeInTheDocument();
    expect(screen.getByText("Text Generation")).toBeInTheDocument();
  });
});
