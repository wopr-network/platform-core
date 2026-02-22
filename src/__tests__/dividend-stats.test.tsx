import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    fetchDividendStats: vi.fn().mockResolvedValue(null),
  };
});

describe("DividendStats", () => {
  it("renders fallback values when API returns null", async () => {
    const { DividendStats } = await import("@/components/pricing/dividend-stats");
    render(<DividendStats />);

    expect(screen.getByTestId("pool-amount")).toBeInTheDocument();
    expect(screen.getByTestId("active-users")).toBeInTheDocument();
    expect(screen.getByTestId("projected-dividend")).toBeInTheDocument();
  });

  it("renders live data when API succeeds", async () => {
    const { fetchDividendStats } = await import("@/lib/api");
    (fetchDividendStats as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      poolAmountDollars: 2500.0,
      activeUsers: 8000,
      projectedDailyDividend: 0.31,
    });

    const { DividendStats } = await import("@/components/pricing/dividend-stats");
    render(<DividendStats />);

    expect(screen.getByTestId("pool-amount")).toBeInTheDocument();
    expect(screen.getByTestId("active-users")).toBeInTheDocument();
    expect(screen.getByTestId("projected-dividend")).toBeInTheDocument();
  });
});
