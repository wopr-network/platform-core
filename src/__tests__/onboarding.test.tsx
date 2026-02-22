import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AI_PROVIDERS,
  clearOnboardingState,
  ENHANCEMENT_PLUGINS,
  loadOnboardingState,
  ONBOARDING_STEPS,
  saveOnboardingState,
} from "@/lib/onboarding-store";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/onboard",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const key of Object.keys(store)) delete store[key];
  },
  length: 0,
  key: () => null,
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
});

describe("onboarding-store", () => {
  it("provides 5 AI providers", () => {
    expect(AI_PROVIDERS).toHaveLength(5);
    expect(AI_PROVIDERS.map((p) => p.id)).toEqual([
      "anthropic",
      "openai",
      "google",
      "xai",
      "local",
    ]);
  });

  it("marks Anthropic as recommended", () => {
    const anthropic = AI_PROVIDERS.find((p) => p.id === "anthropic");
    expect(anthropic?.recommended).toBe(true);
  });

  it("provides 6 enhancement plugins", () => {
    expect(ENHANCEMENT_PLUGINS).toHaveLength(6);
  });

  it("marks Memory as recommended", () => {
    const memory = ENHANCEMENT_PLUGINS.find((p) => p.id === "memory");
    expect(memory?.recommended).toBe(true);
  });

  it("defines 7 onboarding steps", () => {
    expect(ONBOARDING_STEPS).toHaveLength(7);
    expect(ONBOARDING_STEPS[0].path).toBe("/onboard");
    expect(ONBOARDING_STEPS[6].path).toBe("/onboard/review");
  });

  it("loads default state when nothing is stored", () => {
    const state = loadOnboardingState();
    expect(state.currentStep).toBe(0);
    expect(state.providers).toHaveLength(0);
    expect(state.channels).toHaveLength(0);
    expect(state.plugins).toEqual(["memory"]);
  });

  it("persists and loads state", () => {
    saveOnboardingState({
      currentStep: 3,
      providers: [{ id: "anthropic", name: "Anthropic", key: "sk-ant-test", validated: true }],
      channels: ["discord"],
      channelsConfigured: ["discord"],
      channelConfigs: {},
      plugins: ["memory", "voice"],
      instanceName: "test-instance",
    });

    const loaded = loadOnboardingState();
    expect(loaded.currentStep).toBe(3);
    expect(loaded.providers).toHaveLength(1);
    expect(loaded.providers[0].key).toBe("sk-ant-test");
    expect(loaded.channels).toEqual(["discord"]);
    expect(loaded.plugins).toEqual(["memory", "voice"]);
  });

  it("clears state", () => {
    saveOnboardingState({
      currentStep: 5,
      providers: [],
      channels: [],
      channelsConfigured: [],
      channelConfigs: {},
      plugins: [],
      instanceName: "",
    });

    clearOnboardingState();
    const loaded = loadOnboardingState();
    expect(loaded.currentStep).toBe(0);
  });
});

describe("Welcome page", () => {
  it("renders hero and CTA", async () => {
    const { default: Page } = await import("@/app/(onboard)/onboard/page");
    render(<Page />);

    expect(screen.getByText(/Let's set up your WOPR/)).toBeInTheDocument();
    expect(screen.getByText("Get Started")).toBeInTheDocument();
    expect(screen.getByText(/Your keys are encrypted and stored securely/)).toBeInTheDocument();
  });

  it("shows 3 value propositions", async () => {
    const { default: Page } = await import("@/app/(onboard)/onboard/page");
    render(<Page />);

    expect(screen.getByText("Bring your own API keys")).toBeInTheDocument();
    expect(screen.getByText("Connect your channels")).toBeInTheDocument();
    expect(screen.getByText("Deploy in minutes")).toBeInTheDocument();
  });
});

describe("Provider page", () => {
  it("renders all 5 providers", async () => {
    const { default: Page } = await import("@/app/(onboard)/onboard/provider/page");
    render(<Page />);

    expect(screen.getByText("Anthropic")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("xAI")).toBeInTheDocument();
    expect(screen.getByText("Local")).toBeInTheDocument();
  });

  it("shows Recommended badge for Anthropic", async () => {
    const { default: Page } = await import("@/app/(onboard)/onboard/provider/page");
    render(<Page />);

    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("toggles selection on click", async () => {
    const { default: Page } = await import("@/app/(onboard)/onboard/provider/page");
    render(<Page />);

    fireEvent.click(screen.getByText("Anthropic"));
    expect(screen.getByText("Selected")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Anthropic"));
    expect(screen.queryByText("Selected")).not.toBeInTheDocument();
  });
});

describe("Plugins page", () => {
  it("renders all 6 plugins", async () => {
    const { default: Page } = await import("@/app/(onboard)/onboard/plugins/page");
    render(<Page />);

    expect(screen.getByText("Memory")).toBeInTheDocument();
    expect(screen.getByText("Web Search")).toBeInTheDocument();
    expect(screen.getByText("Image Generation")).toBeInTheDocument();
    expect(screen.getByText("Voice")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("Browser")).toBeInTheDocument();
  });

  it("has Memory pre-selected", async () => {
    const { default: Page } = await import("@/app/(onboard)/onboard/plugins/page");
    render(<Page />);

    const toggle = screen.getByLabelText("Toggle Memory");
    expect(toggle).toHaveAttribute("data-state", "checked");
  });

  it("shows Needs API Key badge for plugins requiring keys", async () => {
    const { default: Page } = await import("@/app/(onboard)/onboard/plugins/page");
    render(<Page />);

    const badges = screen.getAllByText("Needs API Key");
    expect(badges.length).toBeGreaterThan(0);
  });
});

describe("Channels page", () => {
  it("renders channel cards from manifests", async () => {
    const { default: Page } = await import("@/app/(onboard)/onboard/channels/page");
    render(<Page />);

    expect(screen.getByText("Discord")).toBeInTheDocument();
    expect(screen.getByText("Slack")).toBeInTheDocument();
    expect(screen.getByText("Telegram")).toBeInTheDocument();
  });

  it("shows Skip for now option", async () => {
    const { default: Page } = await import("@/app/(onboard)/onboard/channels/page");
    render(<Page />);

    expect(screen.getByText("Skip for now")).toBeInTheDocument();
  });
});

describe("Review page", () => {
  it("renders summary sections", async () => {
    saveOnboardingState({
      currentStep: 6,
      providers: [{ id: "anthropic", name: "Anthropic", key: "sk-ant-test", validated: true }],
      channels: ["discord"],
      channelsConfigured: ["discord"],
      channelConfigs: {},
      plugins: ["memory"],
      instanceName: "test-wopr",
    });

    const { default: Page } = await import("@/app/(onboard)/onboard/review/page");
    render(<Page />);

    expect(screen.getByText("Review & Deploy")).toBeInTheDocument();
    expect(screen.getByText("AI Providers")).toBeInTheDocument();
    expect(screen.getByText("Channels")).toBeInTheDocument();
    expect(screen.getByText("Plugins")).toBeInTheDocument();
    expect(screen.getByText("Deploy")).toBeInTheDocument();
  });

  it("shows instance name input", async () => {
    saveOnboardingState({
      currentStep: 6,
      providers: [],
      channels: [],
      channelsConfigured: [],
      channelConfigs: {},
      plugins: [],
      instanceName: "my-instance",
    });

    const { default: Page } = await import("@/app/(onboard)/onboard/review/page");
    render(<Page />);

    const input = screen.getByLabelText("Instance Name") as HTMLInputElement;
    expect(input.value).toBe("my-instance");
  });
});
