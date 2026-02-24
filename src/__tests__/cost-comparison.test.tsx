import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StepCostCompare } from "@/components/onboarding/step-cost-compare";
import { buildCostComparison, DIY_COSTS } from "@/lib/cost-comparison-data";
import type { DiyCostData } from "@/lib/onboarding-data";
import { channelPlugins, superpowers } from "@/lib/onboarding-data";

type WithDiyCost<T> = T & { diyCostData: DiyCostData };

// Derive stable test IDs from the registries so tests don't need to hardcode strings
const channelsWithCost = channelPlugins.filter(
  (c): c is WithDiyCost<typeof c> => c.diyCostData != null,
);
const superpowersWithCost = superpowers.filter(
  (s): s is WithDiyCost<typeof s> => s.diyCostData != null,
);
const firstChannelWithCost = channelsWithCost[0];
const firstSuperpowerWithCost = superpowersWithCost[0];
const sharedAccountSuperpowers = superpowersWithCost.filter(
  (s) => s.diyCostData.accounts[0] === "Replicate",
);

// --- Data module tests ---

describe("buildCostComparison", () => {
  it("returns empty summary when no capabilities selected", () => {
    const result = buildCostComparison([], []);
    expect(result.items).toEqual([]);
    expect(result.accountsRequired).toBe(0);
    expect(result.apiKeysRequired).toBe(0);
  });

  it("includes channel DIY costs", () => {
    const result = buildCostComparison([firstChannelWithCost.id], []);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].capabilityId).toBe(firstChannelWithCost.id);
    expect(result.accountsRequired).toBeGreaterThan(0);
  });

  it("includes superpower DIY costs", () => {
    const result = buildCostComparison([], [firstSuperpowerWithCost.id]);
    const item = result.items.find((i) => i.capabilityId === firstSuperpowerWithCost.id);
    expect(item).toBeDefined();
    expect(item?.accounts.length).toBeGreaterThan(0);
  });

  it("accumulates accounts and API keys across selections", () => {
    const channels = channelsWithCost.slice(0, 2);
    const powers = superpowersWithCost.slice(0, 2);
    const result = buildCostComparison(
      channels.map((c) => c.id),
      powers.map((s) => s.id),
    );
    expect(result.items.length).toBe(4);
    expect(result.accountsRequired).toBeGreaterThanOrEqual(2);
    expect(result.apiKeysRequired).toBeGreaterThanOrEqual(2);
  });

  it("deduplicates shared accounts across superpowers", () => {
    if (sharedAccountSuperpowers.length < 2) return;
    const ids = sharedAccountSuperpowers.map((s) => s.id);
    const result = buildCostComparison([], ids);
    // All share the same "Replicate" account so accountsRequired should equal 1
    expect(result.accountsRequired).toBe(1);
  });

  it("returns $5 for WOPR monthly regardless of selections", () => {
    const result = buildCostComparison([firstChannelWithCost.id], [firstSuperpowerWithCost.id]);
    expect(result.totalWoprMonthly).toBe("$5");
  });

  it("returns $0 for DIY when nothing selected", () => {
    const result = buildCostComparison([], []);
    expect(result.totalDiyMonthly).toBe("$0");
  });
});

describe("DIY_COSTS", () => {
  it("has entries for channel IDs derived from channelPlugins registry", () => {
    const channelIds = channelPlugins
      .map((c) => c.id)
      .filter((id) => DIY_COSTS.some((d) => d.capabilityId === id));
    expect(channelIds.length).toBeGreaterThan(0);
    for (const id of channelIds) {
      expect(DIY_COSTS.find((c) => c.capabilityId === id)).toBeDefined();
    }
  });

  it("has entries for superpower IDs derived from superpowers registry", () => {
    const superpowerIds = superpowers
      .map((s) => s.id)
      .filter((id) => DIY_COSTS.some((d) => d.capabilityId === id));
    expect(superpowerIds.length).toBeGreaterThan(0);
    for (const id of superpowerIds) {
      expect(DIY_COSTS.find((c) => c.capabilityId === id)).toBeDefined();
    }
  });

  it("contains only IDs that exist in channelPlugins or superpowers registries", () => {
    const registryIds = new Set([
      ...channelPlugins.map((c) => c.id),
      ...superpowers.map((s) => s.id),
    ]);
    for (const item of DIY_COSTS) {
      expect(registryIds.has(item.capabilityId)).toBe(true);
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
    const channel = channelsWithCost.find((c) => c.id === "discord");
    const power = superpowersWithCost.find((s) => s.id === "voice");
    if (!channel || !power) return;
    render(<StepCostCompare selectedChannels={[channel.id]} selectedSuperpowers={[power.id]} />);
    expect(screen.getByText(new RegExp(channel.diyCostData.diyLabel, "i"))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(power.diyCostData.diyLabel, "i"))).toBeInTheDocument();
  });

  it("shows Included for WOPR column", () => {
    render(
      <StepCostCompare selectedChannels={[firstChannelWithCost.id]} selectedSuperpowers={[]} />,
    );
    expect(screen.getByText("Included")).toBeInTheDocument();
  });

  it("shows account and API key counts", () => {
    const powers = superpowersWithCost.slice(0, 2);
    render(
      <StepCostCompare
        selectedChannels={[firstChannelWithCost.id]}
        selectedSuperpowers={powers.map((s) => s.id)}
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
