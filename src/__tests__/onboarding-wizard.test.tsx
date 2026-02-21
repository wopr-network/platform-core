import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StepChannels } from "@/components/onboarding/step-channels";
import { StepConnect } from "@/components/onboarding/step-connect";
import { StepLaunch } from "@/components/onboarding/step-launch";
import { StepName } from "@/components/onboarding/step-name";
import { StepPowerSource } from "@/components/onboarding/step-power-source";
import { StepSuperpowers } from "@/components/onboarding/step-superpowers";

// ---- Step 1: Name ----

describe("StepName", () => {
  it("renders heading and name input", () => {
    render(
      <StepName
        name=""
        personalityId="helpful"
        customPersonality=""
        onNameChange={vi.fn()}
        onPersonalityChange={vi.fn()}
        onCustomPersonalityChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Name your WOPR Bot")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("renders all personality options", () => {
    render(
      <StepName
        name=""
        personalityId="helpful"
        customPersonality=""
        onNameChange={vi.fn()}
        onPersonalityChange={vi.fn()}
        onCustomPersonalityChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Helpful assistant")).toBeInTheDocument();
    expect(screen.getByText("Creative collaborator")).toBeInTheDocument();
    expect(screen.getByText("Code companion")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("calls onNameChange when typing", () => {
    const onNameChange = vi.fn();
    render(
      <StepName
        name=""
        personalityId="helpful"
        customPersonality=""
        onNameChange={onNameChange}
        onPersonalityChange={vi.fn()}
        onCustomPersonalityChange={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "jarvis" } });
    expect(onNameChange).toHaveBeenCalledWith("jarvis");
  });

  it("calls onPersonalityChange when a personality is clicked", () => {
    const onPersonalityChange = vi.fn();
    render(
      <StepName
        name=""
        personalityId="helpful"
        customPersonality=""
        onNameChange={vi.fn()}
        onPersonalityChange={onPersonalityChange}
        onCustomPersonalityChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Creative collaborator"));
    expect(onPersonalityChange).toHaveBeenCalledWith("creative");
  });

  it("shows custom personality input when custom selected", () => {
    render(
      <StepName
        name=""
        personalityId="custom"
        customPersonality=""
        onNameChange={vi.fn()}
        onPersonalityChange={vi.fn()}
        onCustomPersonalityChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Describe your personality")).toBeInTheDocument();
  });

  it("hides custom input when non-custom personality selected", () => {
    render(
      <StepName
        name=""
        personalityId="helpful"
        customPersonality=""
        onNameChange={vi.fn()}
        onPersonalityChange={vi.fn()}
        onCustomPersonalityChange={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText("Describe your personality")).not.toBeInTheDocument();
  });
});

// ---- Step 2: Channels ----

describe("StepChannels", () => {
  it("renders all channel options", () => {
    render(<StepChannels selected={[]} onToggle={vi.fn()} />);
    expect(screen.getByText("Discord")).toBeInTheDocument();
    expect(screen.getByText("Slack")).toBeInTheDocument();
    expect(screen.getByText("Telegram")).toBeInTheDocument();
    expect(screen.getByText("Signal")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("MS Teams")).toBeInTheDocument();
  });

  it("shows checkmark for selected channels", () => {
    render(<StepChannels selected={["discord"]} onToggle={vi.fn()} />);
    // The selected channel card has a checkmark SVG with a check path
    const cards = document.querySelectorAll(".bg-terminal\\/20");
    expect(cards.length).toBeGreaterThan(0);
  });

  it("calls onToggle when a channel is clicked", () => {
    const onToggle = vi.fn();
    render(<StepChannels selected={[]} onToggle={onToggle} />);
    fireEvent.click(screen.getByText("Discord"));
    expect(onToggle).toHaveBeenCalledWith("discord");
  });

  it("renders the heading", () => {
    render(<StepChannels selected={[]} onToggle={vi.fn()} />);
    expect(screen.getByText("Pick your channels")).toBeInTheDocument();
  });
});

// ---- Step 3: Connect ----

describe("StepConnect", () => {
  it("renders channel connection fields for selected channels", () => {
    render(
      <StepConnect
        selectedChannels={["discord"]}
        channelKeyValues={{}}
        channelKeyErrors={{}}
        channelValidationStatus={{}}
        onChannelKeyChange={vi.fn()}
        onValidateChannelKey={vi.fn()}
        onVerifyChannel={vi.fn()}
      />,
    );
    expect(screen.getByText("Connect your channels")).toBeInTheDocument();
    expect(screen.getByText("Discord")).toBeInTheDocument();
    expect(screen.getByLabelText("Discord Bot Token")).toBeInTheDocument();
    expect(screen.getByLabelText("Discord Server ID")).toBeInTheDocument();
  });

  it("shows empty state when no channels selected", () => {
    render(
      <StepConnect
        selectedChannels={[]}
        channelKeyValues={{}}
        channelKeyErrors={{}}
        channelValidationStatus={{}}
        onChannelKeyChange={vi.fn()}
        onValidateChannelKey={vi.fn()}
        onVerifyChannel={vi.fn()}
      />,
    );
    expect(screen.getByText(/NO CHANNELS DESIGNATED/)).toBeInTheDocument();
  });

  it("calls onChannelKeyChange when typing", () => {
    const onChange = vi.fn();
    render(
      <StepConnect
        selectedChannels={["telegram"]}
        channelKeyValues={{}}
        channelKeyErrors={{}}
        channelValidationStatus={{}}
        onChannelKeyChange={onChange}
        onValidateChannelKey={vi.fn()}
        onVerifyChannel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Telegram Bot Token"), {
      target: { value: "123:abc" },
    });
    expect(onChange).toHaveBeenCalledWith("telegram_bot_token", "123:abc");
  });

  it("displays error messages", () => {
    render(
      <StepConnect
        selectedChannels={["discord"]}
        channelKeyValues={{}}
        channelKeyErrors={{ discord_bot_token: "Invalid token format" }}
        channelValidationStatus={{}}
        onChannelKeyChange={vi.fn()}
        onValidateChannelKey={vi.fn()}
        onVerifyChannel={vi.fn()}
      />,
    );
    expect(screen.getByText("Invalid token format")).toBeInTheDocument();
  });

  it("renders Verify button for each channel", () => {
    render(
      <StepConnect
        selectedChannels={["discord"]}
        channelKeyValues={{
          discord_bot_token: "test-token",
          discord_guild_id: "12345678901234567",
        }}
        channelKeyErrors={{}}
        channelValidationStatus={{}}
        onChannelKeyChange={vi.fn()}
        onValidateChannelKey={vi.fn()}
        onVerifyChannel={vi.fn()}
        stepNumber="03"
        stepCode="CONNECT"
      />,
    );
    expect(screen.getByRole("button", { name: /verify/i })).toBeInTheDocument();
  });

  it("shows validating state on Verify button", () => {
    render(
      <StepConnect
        selectedChannels={["discord"]}
        channelKeyValues={{
          discord_bot_token: "test-token",
          discord_guild_id: "12345678901234567",
        }}
        channelKeyErrors={{}}
        channelValidationStatus={{ discord: "validating" }}
        onChannelKeyChange={vi.fn()}
        onValidateChannelKey={vi.fn()}
        onVerifyChannel={vi.fn()}
        stepNumber="03"
        stepCode="CONNECT"
      />,
    );
    expect(screen.getByRole("button", { name: /verifying/i })).toBeDisabled();
  });

  it("shows verified status when channel is valid", () => {
    render(
      <StepConnect
        selectedChannels={["discord"]}
        channelKeyValues={{
          discord_bot_token: "test-token",
          discord_guild_id: "12345678901234567",
        }}
        channelKeyErrors={{}}
        channelValidationStatus={{ discord: "valid" }}
        onChannelKeyChange={vi.fn()}
        onValidateChannelKey={vi.fn()}
        onVerifyChannel={vi.fn()}
        stepNumber="03"
        stepCode="CONNECT"
      />,
    );
    expect(screen.getByText("VERIFIED")).toBeInTheDocument();
  });

  it("shows error status when channel is invalid", () => {
    render(
      <StepConnect
        selectedChannels={["discord"]}
        channelKeyValues={{ discord_bot_token: "bad-token", discord_guild_id: "12345678901234567" }}
        channelKeyErrors={{}}
        channelValidationStatus={{ discord: "invalid" }}
        channelValidationErrors={{ discord: "Invalid Discord bot token" }}
        onChannelKeyChange={vi.fn()}
        onValidateChannelKey={vi.fn()}
        onVerifyChannel={vi.fn()}
        stepNumber="03"
        stepCode="CONNECT"
      />,
    );
    expect(screen.getByText("Invalid Discord bot token")).toBeInTheDocument();
  });

  it("calls onVerifyChannel when Verify button is clicked", () => {
    const onVerify = vi.fn();
    render(
      <StepConnect
        selectedChannels={["discord"]}
        channelKeyValues={{
          discord_bot_token: "test-token",
          discord_guild_id: "12345678901234567",
        }}
        channelKeyErrors={{}}
        channelValidationStatus={{}}
        onChannelKeyChange={vi.fn()}
        onValidateChannelKey={vi.fn()}
        onVerifyChannel={onVerify}
        stepNumber="03"
        stepCode="CONNECT"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));
    expect(onVerify).toHaveBeenCalledWith("discord");
  });
});

// ---- Step 4: Superpowers ----

describe("StepSuperpowers", () => {
  it("renders all superpowers", () => {
    render(<StepSuperpowers selected={[]} onToggle={vi.fn()} />);
    expect(screen.getByText("ImageGen")).toBeInTheDocument();
    expect(screen.getByText("VideoGen")).toBeInTheDocument();
    expect(screen.getByText("Voice")).toBeInTheDocument();
    expect(screen.getByText("Memory")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
  });

  it("renders the heading", () => {
    render(<StepSuperpowers selected={[]} onToggle={vi.fn()} />);
    expect(screen.getByText("Give your WOPR Bot superpowers")).toBeInTheDocument();
  });

  it("shows toggle switches", () => {
    render(<StepSuperpowers selected={[]} onToggle={vi.fn()} />);
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(6);
  });

  it("calls onToggle when a switch is clicked", () => {
    const onToggle = vi.fn();
    render(<StepSuperpowers selected={[]} onToggle={onToggle} />);
    fireEvent.click(screen.getByLabelText("Toggle Memory"));
    expect(onToggle).toHaveBeenCalledWith("memory");
  });

  it("shows taglines", () => {
    render(<StepSuperpowers selected={[]} onToggle={vi.fn()} />);
    expect(screen.getByText("/imagine anything")).toBeInTheDocument();
    expect(screen.getByText("/video in any channel")).toBeInTheDocument();
    expect(screen.getByText("Talk out loud")).toBeInTheDocument();
    expect(screen.getByText("Remembers everything")).toBeInTheDocument();
    expect(screen.getByText("Web + docs")).toBeInTheDocument();
  });
});

// ---- Step 5: Power Source ----

describe("StepPowerSource", () => {
  it("renders hosted and BYOK options", () => {
    render(
      <StepPowerSource
        selectedSuperpowers={["image-gen"]}
        providerMode="hosted"
        onProviderModeChange={vi.fn()}
        byokAiProvider="openrouter"
        onByokAiProviderChange={vi.fn()}
        creditBalance="$5.00"
        byokKeyValues={{}}
        byokKeyErrors={{}}
        onByokKeyChange={vi.fn()}
        onValidateByokKey={vi.fn()}
      />,
    );
    expect(screen.getByText("WOPR Hosted")).toBeInTheDocument();
    expect(screen.getByText("Your Keys")).toBeInTheDocument();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("shows credit balance in hosted card", () => {
    render(
      <StepPowerSource
        selectedSuperpowers={["image-gen"]}
        providerMode="hosted"
        onProviderModeChange={vi.fn()}
        byokAiProvider="openrouter"
        onByokAiProviderChange={vi.fn()}
        creditBalance="$5.00"
        byokKeyValues={{}}
        byokKeyErrors={{}}
        onByokKeyChange={vi.fn()}
        onValidateByokKey={vi.fn()}
      />,
    );
    expect(screen.getByText("You have $5.00 credit")).toBeInTheDocument();
  });

  it("calls onProviderModeChange when hosted is clicked", () => {
    const onModeChange = vi.fn();
    render(
      <StepPowerSource
        selectedSuperpowers={["image-gen"]}
        providerMode="byok"
        onProviderModeChange={onModeChange}
        byokAiProvider="openrouter"
        onByokAiProviderChange={vi.fn()}
        creditBalance="$5.00"
        byokKeyValues={{}}
        byokKeyErrors={{}}
        onByokKeyChange={vi.fn()}
        onValidateByokKey={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("WOPR Hosted"));
    expect(onModeChange).toHaveBeenCalledWith("hosted");
  });

  it("shows BYOK key fields when byok mode selected", () => {
    render(
      <StepPowerSource
        selectedSuperpowers={["image-gen"]}
        providerMode="byok"
        onProviderModeChange={vi.fn()}
        byokAiProvider="openrouter"
        onByokAiProviderChange={vi.fn()}
        creditBalance="$5.00"
        byokKeyValues={{}}
        byokKeyErrors={{}}
        onByokKeyChange={vi.fn()}
        onValidateByokKey={vi.fn()}
      />,
    );
    expect(screen.getByText("Replicate API Token")).toBeInTheDocument();
  });

  it("lists required keys for selected superpowers", () => {
    render(
      <StepPowerSource
        selectedSuperpowers={["image-gen", "voice"]}
        providerMode="byok"
        onProviderModeChange={vi.fn()}
        byokAiProvider="openrouter"
        onByokAiProviderChange={vi.fn()}
        creditBalance="$5.00"
        byokKeyValues={{}}
        byokKeyErrors={{}}
        onByokKeyChange={vi.fn()}
        onValidateByokKey={vi.fn()}
      />,
    );
    expect(screen.getByText("ImageGen")).toBeInTheDocument();
    expect(screen.getByText("Voice")).toBeInTheDocument();
  });

  it("hides BYOK key fields when hosted mode selected", () => {
    render(
      <StepPowerSource
        selectedSuperpowers={["image-gen"]}
        providerMode="hosted"
        onProviderModeChange={vi.fn()}
        byokAiProvider="openrouter"
        onByokAiProviderChange={vi.fn()}
        creditBalance="$5.00"
        byokKeyValues={{}}
        byokKeyErrors={{}}
        onByokKeyChange={vi.fn()}
        onValidateByokKey={vi.fn()}
      />,
    );
    expect(screen.queryByText("Replicate API Token")).not.toBeInTheDocument();
  });

  it("shows AI provider toggle when AI-key superpowers selected in BYOK mode", () => {
    render(
      <StepPowerSource
        selectedSuperpowers={["memory", "search"]}
        providerMode="byok"
        onProviderModeChange={vi.fn()}
        byokAiProvider="openrouter"
        onByokAiProviderChange={vi.fn()}
        creditBalance="$5.00"
        byokKeyValues={{}}
        byokKeyErrors={{}}
        onByokKeyChange={vi.fn()}
        onValidateByokKey={vi.fn()}
      />,
    );
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("OpenRouter")).toBeInTheDocument();
    expect(screen.getByText("Choose your AI provider")).toBeInTheDocument();
  });

  it("shows OpenRouter key field when openrouter provider selected", () => {
    render(
      <StepPowerSource
        selectedSuperpowers={["memory"]}
        providerMode="byok"
        onProviderModeChange={vi.fn()}
        byokAiProvider="openrouter"
        onByokAiProviderChange={vi.fn()}
        creditBalance="$5.00"
        byokKeyValues={{}}
        byokKeyErrors={{}}
        onByokKeyChange={vi.fn()}
        onValidateByokKey={vi.fn()}
      />,
    );
    expect(screen.getByText("OpenRouter API Key")).toBeInTheDocument();
  });

  it("shows OpenAI key field when openai provider selected", () => {
    render(
      <StepPowerSource
        selectedSuperpowers={["memory"]}
        providerMode="byok"
        onProviderModeChange={vi.fn()}
        byokAiProvider="openai"
        onByokAiProviderChange={vi.fn()}
        creditBalance="$5.00"
        byokKeyValues={{}}
        byokKeyErrors={{}}
        onByokKeyChange={vi.fn()}
        onValidateByokKey={vi.fn()}
      />,
    );
    expect(screen.getByText("OpenAI API Key")).toBeInTheDocument();
  });

  it("calls onByokAiProviderChange when provider card is clicked", () => {
    const onProviderChange = vi.fn();
    render(
      <StepPowerSource
        selectedSuperpowers={["memory"]}
        providerMode="byok"
        onProviderModeChange={vi.fn()}
        byokAiProvider="openrouter"
        onByokAiProviderChange={onProviderChange}
        creditBalance="$5.00"
        byokKeyValues={{}}
        byokKeyErrors={{}}
        onByokKeyChange={vi.fn()}
        onValidateByokKey={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("OpenAI"));
    expect(onProviderChange).toHaveBeenCalledWith("openai");
  });

  it("shows capability unlock confirmation when AI key is valid", () => {
    render(
      <StepPowerSource
        selectedSuperpowers={["memory", "search", "text-gen"]}
        providerMode="byok"
        onProviderModeChange={vi.fn()}
        byokAiProvider="openrouter"
        onByokAiProviderChange={vi.fn()}
        creditBalance="$5.00"
        byokKeyValues={{ openrouter_api_key: "sk-or-test123" }}
        byokKeyErrors={{}}
        onByokKeyChange={vi.fn()}
        onValidateByokKey={vi.fn()}
      />,
    );
    expect(screen.getByText("Key validated -- capabilities unlocked:")).toBeInTheDocument();
    expect(screen.getByText("Embeddings for long-term recall")).toBeInTheDocument();
    expect(screen.getByText("Web and document search")).toBeInTheDocument();
    expect(screen.getByText("200+ AI models via OpenRouter")).toBeInTheDocument();
  });

  it("does not show capability unlock when AI key has error", () => {
    render(
      <StepPowerSource
        selectedSuperpowers={["memory"]}
        providerMode="byok"
        onProviderModeChange={vi.fn()}
        byokAiProvider="openrouter"
        onByokAiProviderChange={vi.fn()}
        creditBalance="$5.00"
        byokKeyValues={{ openrouter_api_key: "invalid" }}
        byokKeyErrors={{ openrouter_api_key: "Must start with sk-or-" }}
        onByokKeyChange={vi.fn()}
        onValidateByokKey={vi.fn()}
      />,
    );
    expect(screen.queryByText("Key validated -- capabilities unlocked:")).not.toBeInTheDocument();
  });

  it("shows Switch to Hosted escape hatch in BYOK mode", () => {
    render(
      <StepPowerSource
        selectedSuperpowers={["memory"]}
        providerMode="byok"
        onProviderModeChange={vi.fn()}
        byokAiProvider="openrouter"
        onByokAiProviderChange={vi.fn()}
        creditBalance="$5.00"
        byokKeyValues={{}}
        byokKeyErrors={{}}
        onByokKeyChange={vi.fn()}
        onValidateByokKey={vi.fn()}
      />,
    );
    expect(screen.getByText("Switch to Hosted")).toBeInTheDocument();
  });

  it("calls onProviderModeChange when Switch to Hosted is clicked", () => {
    const onModeChange = vi.fn();
    render(
      <StepPowerSource
        selectedSuperpowers={["memory"]}
        providerMode="byok"
        onProviderModeChange={onModeChange}
        byokAiProvider="openrouter"
        onByokAiProviderChange={vi.fn()}
        creditBalance="$5.00"
        byokKeyValues={{}}
        byokKeyErrors={{}}
        onByokKeyChange={vi.fn()}
        onValidateByokKey={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Switch to Hosted"));
    expect(onModeChange).toHaveBeenCalledWith("hosted");
  });

  it("does not show AI provider toggle when only non-AI superpowers selected", () => {
    render(
      <StepPowerSource
        selectedSuperpowers={["voice"]}
        providerMode="byok"
        onProviderModeChange={vi.fn()}
        byokAiProvider="openrouter"
        onByokAiProviderChange={vi.fn()}
        creditBalance="$5.00"
        byokKeyValues={{}}
        byokKeyErrors={{}}
        onByokKeyChange={vi.fn()}
        onValidateByokKey={vi.fn()}
      />,
    );
    expect(screen.queryByText("Choose your AI provider")).not.toBeInTheDocument();
    expect(screen.getByText("ElevenLabs API Key")).toBeInTheDocument();
  });

  it("shows both AI provider toggle and non-AI keys for mixed superpowers", () => {
    render(
      <StepPowerSource
        selectedSuperpowers={["memory", "voice"]}
        providerMode="byok"
        onProviderModeChange={vi.fn()}
        byokAiProvider="openrouter"
        onByokAiProviderChange={vi.fn()}
        creditBalance="$5.00"
        byokKeyValues={{}}
        byokKeyErrors={{}}
        onByokKeyChange={vi.fn()}
        onValidateByokKey={vi.fn()}
      />,
    );
    expect(screen.getByText("Choose your AI provider")).toBeInTheDocument();
    expect(screen.getByText("OpenRouter API Key")).toBeInTheDocument();
    expect(screen.getByText("ElevenLabs API Key")).toBeInTheDocument();
  });
});

// ---- Step 6: Launch ----

describe("StepLaunch", () => {
  it("shows launch button when idle", () => {
    render(
      <StepLaunch
        woprName="jarvis"
        selectedChannels={["discord"]}
        selectedSuperpowers={["memory"]}
        providerMode="hosted"
        creditBalance="$5.00"
        deployStatus="idle"
        onDeploy={vi.fn()}
        onGoToDashboard={vi.fn()}
      />,
    );
    expect(screen.getByText("Launch WOPR Bot")).toBeInTheDocument();
    expect(screen.getByText("Ready to launch")).toBeInTheDocument();
  });

  it("opens nuclear launch modal when launch button clicked", () => {
    render(
      <StepLaunch
        woprName="jarvis"
        selectedChannels={["discord"]}
        selectedSuperpowers={[]}
        providerMode="hosted"
        creditBalance="$5.00"
        deployStatus="idle"
        onDeploy={vi.fn()}
        onGoToDashboard={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Launch WOPR Bot"));
    expect(screen.getByTestId("nuclear-launch-modal")).toBeInTheDocument();
  });

  it("shows progress during deployment", () => {
    render(
      <StepLaunch
        woprName="jarvis"
        selectedChannels={["discord"]}
        selectedSuperpowers={[]}
        providerMode="hosted"
        creditBalance="$5.00"
        deployStatus="provisioning"
        onDeploy={vi.fn()}
        onGoToDashboard={vi.fn()}
      />,
    );
    expect(screen.getByText("Launching...")).toBeInTheDocument();
    expect(screen.getByText("PROVISIONING")).toBeInTheDocument();
  });

  it("shows success screen when done", () => {
    render(
      <StepLaunch
        woprName="jarvis"
        selectedChannels={["discord"]}
        selectedSuperpowers={["memory"]}
        providerMode="hosted"
        creditBalance="$5.00"
        deployStatus="done"
        onDeploy={vi.fn()}
        onGoToDashboard={vi.fn()}
      />,
    );
    expect(screen.getByText("Your WOPR Bot is live!")).toBeInTheDocument();
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });

  it("shows retry button on error", () => {
    const onDeploy = vi.fn();
    render(
      <StepLaunch
        woprName="jarvis"
        selectedChannels={[]}
        selectedSuperpowers={[]}
        providerMode="hosted"
        creditBalance="$5.00"
        deployStatus="error"
        onDeploy={onDeploy}
        onGoToDashboard={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Retry Launch"));
    expect(onDeploy).toHaveBeenCalledOnce();
  });
});

// ---- Wizard Integration ----

// Mock dependencies for OnboardingWizard
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    useSession: () => ({ data: null, isPending: false, error: null }),
  }),
}));

vi.mock("@/lib/api", () => ({
  getCreditBalance: vi.fn().mockResolvedValue({ balance: 5.0, dailyBurn: 0.33, runway: 15 }),
  listInstances: vi.fn().mockResolvedValue([]),
  testChannelConnection: vi.fn().mockResolvedValue({ success: true }),
}));

describe("OnboardingWizard integration", () => {
  it("renders progress bar with MISSION BRIEFING and percentage", async () => {
    const { OnboardingWizard } = await import("@/components/onboarding/wizard");
    render(<OnboardingWizard />);

    expect(screen.getByText("MISSION BRIEFING")).toBeInTheDocument();
    // Progress percentage appears as [17%] for step 1 of 6 (power-source skipped, billing shown for hosted mode)
    expect(screen.getByText(/\[17%\]/)).toBeInTheDocument();
  });

  it("shows step tick marks for all steps", async () => {
    const { OnboardingWizard } = await import("@/components/onboarding/wizard");
    render(<OnboardingWizard />);

    // Check tick marks by uppercase labels (5 steps when no superpowers selected, 6 when superpowers need keys)
    expect(screen.getByText("NAME")).toBeInTheDocument();
    expect(screen.getByText("CHANNELS")).toBeInTheDocument();
    expect(screen.getByText("CONNECT")).toBeInTheDocument();
    expect(screen.getByText("SUPERPOWERS")).toBeInTheDocument();
    expect(screen.getByText("LAUNCH")).toBeInTheDocument();
  });

  it("Back button disabled on first step (name)", async () => {
    const { OnboardingWizard } = await import("@/components/onboarding/wizard");
    render(<OnboardingWizard />);

    const backBtn = screen.getByRole("button", { name: "Back" });
    expect(backBtn).toBeDisabled();
  });

  it("Continue button advances from name to channels step", async () => {
    const { OnboardingWizard } = await import("@/components/onboarding/wizard");
    render(<OnboardingWizard />);

    // Fill in name
    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "jarvis" } });

    // Click Continue
    const continueBtn = screen.getByRole("button", { name: "Continue" });
    fireEvent.click(continueBtn);

    // Should now show channels step heading
    await waitFor(() => {
      expect(screen.getByText("Pick your channels")).toBeInTheDocument();
    });
  });

  it("Continue button disabled when canAdvance returns false (empty name)", async () => {
    const { OnboardingWizard } = await import("@/components/onboarding/wizard");
    render(<OnboardingWizard />);

    const continueBtn = screen.getByRole("button", { name: "Continue" });
    expect(continueBtn).toBeDisabled();
  });

  it("Full flow: continues through multiple steps when valid data entered", async () => {
    const { OnboardingWizard } = await import("@/components/onboarding/wizard");
    render(<OnboardingWizard />);

    // Step 1: Name - can advance when name is filled
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "jarvis" } });
    expect(screen.getByRole("button", { name: "Continue" })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2: Channels - heading should show
    await waitFor(() => {
      expect(screen.getByText("Pick your channels")).toBeInTheDocument();
    });

    // Verify we can see we're on step 2 (33% progress for 2/6 steps)
    expect(screen.getByText(/\[33%\]/)).toBeInTheDocument();
  });

  it("Progress percentage increases as steps advance", async () => {
    const { OnboardingWizard } = await import("@/components/onboarding/wizard");
    render(<OnboardingWizard />);

    // Step 1: 17% (1/6 steps since power-source skipped, billing shown for hosted mode)
    expect(screen.getByText(/\[17%\]/)).toBeInTheDocument();

    // Advance to step 2
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "jarvis" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2: 33% (2/6)
    await waitFor(() => {
      expect(screen.getByText(/\[33%\]/)).toBeInTheDocument();
    });
  });

  it("Back/Continue buttons control navigation between steps", async () => {
    const { OnboardingWizard } = await import("@/components/onboarding/wizard");
    render(<OnboardingWizard />);

    // On step 1, back is disabled
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();

    // Advance to step 2
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "jarvis" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("Pick your channels")).toBeInTheDocument();
    });

    // On step 2, back is enabled
    expect(screen.getByRole("button", { name: "Back" })).not.toBeDisabled();

    // Click back to return to step 1
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    await waitFor(() => {
      expect(screen.getByText("Name your WOPR Bot")).toBeInTheDocument();
    });
  });

  it("handles getCreditBalance API error gracefully", async () => {
    const { getCreditBalance } = await import("@/lib/api");
    vi.mocked(getCreditBalance).mockRejectedValueOnce(new Error("API failure"));

    const { OnboardingWizard } = await import("@/components/onboarding/wizard");
    render(<OnboardingWizard />);

    // Wizard should still render despite API error
    await waitFor(() => {
      expect(screen.getByText("MISSION BRIEFING")).toBeInTheDocument();
    });

    expect(screen.getByText("Name your WOPR Bot")).toBeInTheDocument();
  });
});
