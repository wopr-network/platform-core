import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-capability-meta", () => ({
  useCapabilityMeta: () => ({
    meta: [
      {
        capability: "transcription",
        label: "Transcription",
        description: "Powered by Whisper.",
        pricing: "$0.006/min",
        hostedProvider: "Whisper",
        icon: "mic",
        sortOrder: 0,
      },
    ],
    loading: false,
    error: false,
    getMeta: (cap: string) =>
      cap === "transcription"
        ? {
            capability: "transcription",
            label: "Transcription",
            description: "Powered by Whisper.",
            pricing: "$0.006/min",
            hostedProvider: "Whisper",
            icon: "mic",
            sortOrder: 0,
          }
        : {
            capability: cap,
            label: cap.replace(/[-_]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
            description: "",
            pricing: "",
            hostedProvider: "",
            icon: "sparkles",
            sortOrder: 999,
          },
  }),
}));

import { CapabilityLabel, CapabilityPricing } from "@/components/capability/CapabilityResolver";

describe("CapabilityResolver components", () => {
  it("CapabilityLabel renders label for known capability", () => {
    render(<CapabilityLabel capability="transcription" />);
    expect(screen.getByText("Transcription")).toBeInTheDocument();
  });

  it("CapabilityLabel renders auto-formatted label for unknown capability", () => {
    render(<CapabilityLabel capability="brand-new-cap" />);
    expect(screen.getByText("Brand New Cap")).toBeInTheDocument();
  });

  it("CapabilityPricing renders pricing badge for known capability", () => {
    render(<CapabilityPricing capability="transcription" />);
    expect(screen.getByText("$0.006/min")).toBeInTheDocument();
  });

  it("CapabilityPricing renders nothing for unknown capability with no pricing", () => {
    const { container } = render(<CapabilityPricing capability="unknown-thing" />);
    expect(container.textContent).toBe("");
  });
});
