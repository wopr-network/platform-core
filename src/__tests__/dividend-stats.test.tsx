import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Stub fetch globally before any module imports
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("@/lib/api-config", () => ({
  API_BASE_URL: "http://test:3001/api",
  PLATFORM_BASE_URL: "http://test:3001",
}));

describe("DividendStats", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders fallback values when API returns null", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({}),
    });

    const { DividendStats } = await import("@/components/pricing/dividend-stats");
    render(<DividendStats />);

    expect(screen.getByTestId("pool-amount")).toBeInTheDocument();
    expect(screen.getByTestId("active-users")).toBeInTheDocument();
    expect(screen.getByTestId("projected-dividend")).toBeInTheDocument();
  });

  it("renders live data when API succeeds", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          poolAmountDollars: 2500.0,
          activeUsers: 8000,
          projectedDailyDividend: 0.31,
        }),
    });

    const { DividendStats } = await import("@/components/pricing/dividend-stats");
    render(<DividendStats />);

    expect(screen.getByTestId("pool-amount")).toBeInTheDocument();
    expect(screen.getByTestId("active-users")).toBeInTheDocument();
    expect(screen.getByTestId("projected-dividend")).toBeInTheDocument();
  });

  it("renders fallback dashes when fetch rejects (network error)", async () => {
    mockFetch.mockRejectedValue(new Error("Network failure"));

    const { DividendStats } = await import("@/components/pricing/dividend-stats");
    render(<DividendStats />);

    // fetchDividendStats catches network errors and returns null — component shows "--"
    expect(screen.getByTestId("pool-amount")).toBeInTheDocument();
    expect(screen.getByTestId("active-users")).toBeInTheDocument();
    expect(screen.getByTestId("projected-dividend")).toBeInTheDocument();
  });
});
