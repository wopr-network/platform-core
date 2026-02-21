import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  storeTenantKey: vi.fn(),
}));

vi.mock("@/lib/onboarding-store", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/onboarding-store")>("@/lib/onboarding-store");
  return {
    ...actual,
    loadOnboardingState: vi.fn(() => ({
      currentStep: 2,
      providers: [{ id: "openai", name: "OpenAI", key: "", validated: false }],
      channels: [],
      channelsConfigured: [],
      channelConfigs: {},
      plugins: ["memory"],
      instanceName: "",
    })),
    saveOnboardingState: vi.fn(),
  };
});

import { storeTenantKey } from "@/lib/api";

const mockStore = vi.mocked(storeTenantKey);

describe("OnboardKeysPage", () => {
  beforeEach(() => {
    mockStore.mockReset();
  });

  it("calls storeTenantKey on validate instead of using mock timeout", async () => {
    mockStore.mockResolvedValue({
      provider: "openai",
      hasKey: true,
      maskedKey: "sk-...ab",
      createdAt: null,
      updatedAt: null,
    });

    const { default: OnboardKeysPage } = await import("@/app/(onboard)/onboard/keys/page");
    render(<OnboardKeysPage />);

    const input = screen.getByPlaceholderText("sk-proj-...");
    fireEvent.change(input, { target: { value: "sk-real-key-123" } });

    const validateBtn = screen.getByText("Validate");
    fireEvent.click(validateBtn);

    await waitFor(() => {
      expect(mockStore).toHaveBeenCalledWith("openai", "sk-real-key-123");
    });
  });

  it("shows validated state after successful store", async () => {
    mockStore.mockResolvedValue({
      provider: "openai",
      hasKey: true,
      maskedKey: "sk-...ab",
      createdAt: null,
      updatedAt: null,
    });

    const { default: OnboardKeysPage } = await import("@/app/(onboard)/onboard/keys/page");
    render(<OnboardKeysPage />);

    const input = screen.getByPlaceholderText("sk-proj-...");
    fireEvent.change(input, { target: { value: "sk-real-key-123" } });
    fireEvent.click(screen.getByText("Validate"));

    await waitFor(() => {
      expect(screen.getByText("Validated")).toBeInTheDocument();
    });
  });
});
