import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ModelSelection } from "@/lib/api";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/settings/brain",
}));

// Mock better-auth/react
vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    useSession: () => ({ data: null, isPending: false, error: null }),
    signIn: { email: vi.fn(), social: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
  }),
}));

const MOCK_MODEL_SELECTION: ModelSelection = {
  modelId: "anthropic/claude-sonnet-4-20250514",
  providerId: "anthropic",
  mode: "hosted",
};

// Mock @/lib/api
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getModelSelection: vi.fn().mockResolvedValue(MOCK_MODEL_SELECTION),
    updateModelSelection: vi.fn().mockResolvedValue(MOCK_MODEL_SELECTION),
  };
});

describe("StepModelSelect (onboarding)", () => {
  it("renders hero model cards", async () => {
    const { StepModelSelect } = await import("../components/onboarding/step-model-select");
    const onSelect = vi.fn();
    render(
      <StepModelSelect
        selectedModel="anthropic/claude-sonnet-4-20250514"
        onSelectModel={onSelect}
      />,
    );

    expect(screen.getByText("Pick a brain for your WOPR")).toBeInTheDocument();
    expect(screen.getByText("Claude Sonnet 4")).toBeInTheDocument();
    expect(screen.getByText("GPT-4o")).toBeInTheDocument();
    expect(screen.getByText("Llama 3.3 70B")).toBeInTheDocument();
  });

  it("shows recommended badge on Claude", async () => {
    const { StepModelSelect } = await import("../components/onboarding/step-model-select");
    render(<StepModelSelect selectedModel={null} onSelectModel={vi.fn()} />);

    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("shows cost estimates on hero cards", async () => {
    const { StepModelSelect } = await import("../components/onboarding/step-model-select");
    render(<StepModelSelect selectedModel={null} onSelectModel={vi.fn()} />);

    expect(screen.getByText("~$0.01/msg")).toBeInTheDocument();
    expect(screen.getByText("~$0.005/msg")).toBeInTheDocument();
    expect(screen.getByText("~$0.001/msg")).toBeInTheDocument();
  });

  it("calls onSelectModel when a card is clicked", async () => {
    const { StepModelSelect } = await import("../components/onboarding/step-model-select");
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<StepModelSelect selectedModel={null} onSelectModel={onSelect} />);

    await user.click(screen.getByText("GPT-4o"));
    expect(onSelect).toHaveBeenCalledWith("openai/gpt-4o");
  });

  it("shows more models when toggle is clicked", async () => {
    const { StepModelSelect } = await import("../components/onboarding/step-model-select");
    const user = userEvent.setup();
    render(<StepModelSelect selectedModel={null} onSelectModel={vi.fn()} />);

    // Additional models should not be visible initially
    expect(screen.queryByText("Claude Opus 4")).not.toBeInTheDocument();

    // Click more models toggle
    await user.click(screen.getByTestId("more-models-toggle"));

    // Now additional models should be visible
    expect(screen.getByText("Claude Opus 4")).toBeInTheDocument();
    expect(screen.getByText("Gemini 2.5 Pro")).toBeInTheDocument();
    expect(screen.getByText("DeepSeek V3")).toBeInTheDocument();
  });

  it("displays 200+ models text", async () => {
    const { StepModelSelect } = await import("../components/onboarding/step-model-select");
    render(<StepModelSelect selectedModel={null} onSelectModel={vi.fn()} />);

    expect(screen.getByText(/200\+ models available/)).toBeInTheDocument();
  });
});

describe("Brain settings page", () => {
  it("renders brain heading", async () => {
    const { default: BrainPage } = await import("../app/(dashboard)/settings/brain/page");
    render(<BrainPage />);

    expect(screen.getByText("Loading model settings...")).toBeInTheDocument();
    expect(await screen.findByText("Brain")).toBeInTheDocument();
  });

  it("renders current model info", async () => {
    const { default: BrainPage } = await import("../app/(dashboard)/settings/brain/page");
    render(<BrainPage />);

    expect(await screen.findByText("Current Model")).toBeInTheDocument();
    const modelNames = screen.getAllByText("Claude Sonnet 4");
    expect(modelNames.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Hosted")).toBeInTheDocument();
  });

  it("renders hero model cards in settings", async () => {
    const { default: BrainPage } = await import("../app/(dashboard)/settings/brain/page");
    render(<BrainPage />);

    expect(await screen.findByText("GPT-4o")).toBeInTheDocument();
    expect(screen.getByText("Llama 3.3 70B")).toBeInTheDocument();
  });

  it("renders BYOK view when toggled", async () => {
    const { default: BrainPage } = await import("../app/(dashboard)/settings/brain/page");
    const user = userEvent.setup();
    render(<BrainPage />);

    await screen.findByText("Brain");

    await user.click(screen.getByRole("button", { name: "Bring Your Own Key" }));

    // "Anthropic" appears in both the current model card and the BYOK provider list
    const anthropicElements = screen.getAllByText("Anthropic");
    expect(anthropicElements).toHaveLength(2);
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("OpenRouter")).toBeInTheDocument();
  });

  it("shows more models section in settings", async () => {
    const { default: BrainPage } = await import("../app/(dashboard)/settings/brain/page");
    const user = userEvent.setup();
    render(<BrainPage />);

    await screen.findByText("Brain");
    await user.click(screen.getByTestId("more-models-toggle"));

    expect(screen.getByText("Claude Opus 4")).toBeInTheDocument();
    expect(screen.getByText("Mistral Large")).toBeInTheDocument();
  });

  it("renders view mode toggle buttons", async () => {
    const { default: BrainPage } = await import("../app/(dashboard)/settings/brain/page");
    render(<BrainPage />);

    await screen.findByText("Brain");
    expect(screen.getByRole("button", { name: "Pick a model (Hosted)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bring Your Own Key" })).toBeInTheDocument();
  });
});

describe("Settings layout with Brain nav", () => {
  it("renders Brain navigation link", async () => {
    const { default: SettingsLayout } = await import("../app/(dashboard)/settings/layout");
    render(
      <SettingsLayout>
        <div>child</div>
      </SettingsLayout>,
    );

    expect(screen.getByText("Brain")).toBeInTheDocument();
  });
});
