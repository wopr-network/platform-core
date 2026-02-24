import { render, screen, waitFor } from "@testing-library/react";
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
    latestDigest: "sha256:bbb",
    updateAvailable: true,
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

import { FleetHealth } from "@/components/observability/fleet-health";

describe("FleetHealth update indicator", () => {
  it("shows UPD indicator on card when update is available", async () => {
    render(<FleetHealth />);

    await waitFor(() => {
      expect(screen.getByText("my-bot")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("UPD")).toBeInTheDocument();
    });
  });
});
