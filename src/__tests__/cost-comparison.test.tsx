import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StepCostCompare } from "@/components/onboarding/step-cost-compare";
import { buildCostComparison, DIY_COSTS } from "@/lib/cost-comparison-data";

// --- Data module tests ---

describe("buildCostComparison", () => {
  it("returns empty summary when no capabilities selected", () => {
    const result = buildCostComparison([], []);
    expect(result.items).toEqual([]);
    expect(result.accountsRequired).toBe(0);
    expect(result.apiKeysRequired).toBe(0);
  });

  it("includes channel DIY costs", () => {
    const result = buildCostComparison(["discord"], []);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].capabilityId).toBe("discord");
    expect(result.accountsRequired).toBeGreaterThan(0);
  });

  it("includes superpower DIY costs", () => {
    const result = buildCostComparison([], ["voice"]);
    const voiceItem = result.items.find((i) => i.capabilityId === "voice");
    expect(voiceItem).toBeDefined();
    expect(voiceItem?.accounts.length).toBeGreaterThan(0);
  });

  it("accumulates accounts and API keys across selections", () => {
    const result = buildCostComparison(["discord", "slack"], ["voice", "image-gen"]);
    expect(result.items.length).toBe(4);
    expect(result.accountsRequired).toBeGreaterThanOrEqual(4);
    expect(result.apiKeysRequired).toBeGreaterThanOrEqual(4);
  });

  it("deduplicates shared accounts (e.g., Replicate for image-gen + video-gen)", () => {
    const result = buildCostComparison([], ["image-gen", "video-gen"]);
    expect(result.accountsRequired).toBe(1);
  });

  it("returns $5 for WOPR monthly regardless of selections", () => {
    const result = buildCostComparison(["discord"], ["voice", "image-gen"]);
    expect(result.totalWoprMonthly).toBe("$5");
  });

  it("returns $0 for DIY when nothing selected", () => {
    const result = buildCostComparison([], []);
    expect(result.totalDiyMonthly).toBe("$0");
  });
});

describe("DIY_COSTS", () => {
  it("has entries for all known channel IDs", () => {
    for (const id of ["discord", "slack", "telegram"]) {
      expect(DIY_COSTS.find((c) => c.capabilityId === id)).toBeDefined();
    }
  });

  it("has entries for all known superpower IDs", () => {
    for (const id of ["image-gen", "video-gen", "voice", "memory", "search", "text-gen"]) {
      expect(DIY_COSTS.find((c) => c.capabilityId === id)).toBeDefined();
    }
  });
});

// --- Component tests ---

describe("StepCostCompare", () => {
  it("renders the step heading", () => {
    render(<StepCostCompare selectedChannels={[]} selectedSuperpowers={[]} />);
    expect(screen.getByText(/COST COMPARE/)).toBeInTheDocument();
  });

  it("shows the main heading", () => {
    render(<StepCostCompare selectedChannels={[]} selectedSuperpowers={[]} />);
    expect(screen.getByText(/Why not do it yourself/i)).toBeInTheDocument();
  });

  it("shows DIY costs for selected capabilities", () => {
    render(<StepCostCompare selectedChannels={["discord"]} selectedSuperpowers={["voice"]} />);
    expect(screen.getByText(/Discord bot hosting/i)).toBeInTheDocument();
    expect(screen.getByText(/Voice synthesis/i)).toBeInTheDocument();
  });

  it("shows Included for WOPR column", () => {
    render(<StepCostCompare selectedChannels={["discord"]} selectedSuperpowers={[]} />);
    expect(screen.getByText("Included")).toBeInTheDocument();
  });

  it("shows account and API key counts", () => {
    render(
      <StepCostCompare
        selectedChannels={["discord"]}
        selectedSuperpowers={["voice", "image-gen"]}
      />,
    );
    expect(screen.getByText(/provider accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/API keys/i, { selector: "span" })).toBeInTheDocument();
  });

  it("shows empty state when nothing selected", () => {
    render(<StepCostCompare selectedChannels={[]} selectedSuperpowers={[]} />);
    expect(screen.getByText(/Select channels or superpowers/i)).toBeInTheDocument();
    expect(screen.getByText("$5")).toBeInTheDocument();
  });

  it("renders with custom step number and code", () => {
    render(
      <StepCostCompare
        selectedChannels={[]}
        selectedSuperpowers={[]}
        stepNumber="05"
        stepCode="COST COMPARE"
      />,
    );
    expect(screen.getByText(/STEP 05/)).toBeInTheDocument();
    expect(screen.getByText(/COST COMPARE/)).toBeInTheDocument();
  });

  it("shows the footer tagline", () => {
    render(<StepCostCompare selectedChannels={[]} selectedSuperpowers={[]} />);
    expect(
      screen.getByText(/WOPR HANDLES HOSTING, SCALING, AND API KEY MANAGEMENT/),
    ).toBeInTheDocument();
  });
});
