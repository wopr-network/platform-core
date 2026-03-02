import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResourcesTab } from "@/components/bot-settings/resources-tab";

vi.mock("@/lib/bot-settings-data", () => ({
  getResourceTier: vi.fn().mockResolvedValue({ tier: "standard" }),
  setResourceTier: vi.fn().mockResolvedValue({ tier: "pro", dailyCostCents: 10 }),
}));

describe("ResourcesTab", () => {
  it("shows loading state initially", () => {
    render(<ResourcesTab botId="bot-1" />);
    expect(screen.getByText("Loading resource info...")).toBeInTheDocument();
  });

  it("renders all four tier cards after loading", async () => {
    render(<ResourcesTab botId="bot-1" />);
    await waitFor(() => {
      expect(screen.getByText("Standard")).toBeInTheDocument();
    });
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Power")).toBeInTheDocument();
    expect(screen.getByText("Beast")).toBeInTheDocument();
  });

  it("displays RAM values for each tier", async () => {
    render(<ResourcesTab botId="bot-1" />);
    await waitFor(() => {
      expect(screen.getByText("2 GB RAM")).toBeInTheDocument();
    });
    expect(screen.getByText("4 GB RAM")).toBeInTheDocument();
    expect(screen.getByText("8 GB RAM")).toBeInTheDocument();
    expect(screen.getByText("16 GB RAM")).toBeInTheDocument();
  });

  it("displays CPU values for each tier", async () => {
    render(<ResourcesTab botId="bot-1" />);
    await waitFor(() => {
      expect(screen.getByText("2 vCPU")).toBeInTheDocument();
    });
    expect(screen.getByText("4 vCPU")).toBeInTheDocument();
    expect(screen.getByText("6 vCPU")).toBeInTheDocument();
    expect(screen.getByText("8 vCPU")).toBeInTheDocument();
  });

  it("marks the current tier with a Current badge", async () => {
    render(<ResourcesTab botId="bot-1" />);
    await waitFor(() => {
      expect(screen.getByText("Current")).toBeInTheDocument();
    });
  });

  it("shows Included for the standard tier cost", async () => {
    render(<ResourcesTab botId="bot-1" />);
    await waitFor(() => {
      expect(screen.getByText("Included")).toBeInTheDocument();
    });
  });

  it("shows daily credit costs for paid tiers", async () => {
    render(<ResourcesTab botId="bot-1" />);
    await waitFor(() => {
      expect(screen.getByText(/\+10 credits\/day/)).toBeInTheDocument();
    });
    expect(screen.getByText(/\+27 credits\/day/)).toBeInTheDocument();
    expect(screen.getByText(/\+50 credits\/day/)).toBeInTheDocument();
  });

  it("shows Upgrade buttons for non-current tiers", async () => {
    render(<ResourcesTab botId="bot-1" />);
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Upgrade" })).toHaveLength(3);
    });
  });
});
