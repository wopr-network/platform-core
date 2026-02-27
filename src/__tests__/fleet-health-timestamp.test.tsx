import { render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  getFleetHealth: vi.fn().mockResolvedValue([
    {
      id: "bot-1",
      name: "my-bot",
      status: "running",
      health: "healthy",
      uptime: 3600,
      pluginCount: 2,
      sessionCount: 1,
      provider: "docker",
    },
  ]),
  getImageStatus: vi.fn().mockResolvedValue({
    currentDigest: "sha256:aaa",
    latestDigest: "sha256:aaa",
    updateAvailable: false,
  }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { variants, initial, animate, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

vi.mock("@/hooks/use-image-status", () => ({
  useImageStatus: vi.fn().mockReturnValue({ updateAvailable: false }),
}));

import { FleetHealth } from "@/components/observability/fleet-health";

describe("FleetHealth timestamp", () => {
  it("shows 'Updated just now' after data loads", async () => {
    render(<FleetHealth />);

    await waitFor(() => {
      expect(screen.getByText("my-bot")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Updated just now/)).toBeInTheDocument();
    });
  });

  it("does not show timestamp during initial loading", () => {
    render(<FleetHealth />);
    expect(screen.queryByText(/Updated/)).not.toBeInTheDocument();
  });
});
