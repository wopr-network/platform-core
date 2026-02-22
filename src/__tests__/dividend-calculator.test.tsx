import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("DividendCalculator", () => {
  it("renders the math breakdown", async () => {
    const { DividendCalculator } = await import("@/components/pricing/dividend-calculator");
    render(<DividendCalculator />);

    expect(screen.getByText(/100K active users/i)).toBeInTheDocument();
    expect(screen.getByText(/\$20\/month average spend/i)).toBeInTheDocument();
    expect(screen.getByTestId("net-cost")).toBeInTheDocument();
  });

  it("shows the early adopter callout", async () => {
    const { DividendCalculator } = await import("@/components/pricing/dividend-calculator");
    render(<DividendCalculator />);

    expect(screen.getByText(/the earlier you join/i)).toBeInTheDocument();
  });
});
