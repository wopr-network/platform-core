import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StepBilling } from "@/components/onboarding/step-billing";
import { StepChannels } from "@/components/onboarding/step-channels";
import { StepDeploy } from "@/components/onboarding/step-deploy";
import { StepDone } from "@/components/onboarding/step-done";
import { StepKeys } from "@/components/onboarding/step-keys";
import { StepPlugins } from "@/components/onboarding/step-plugins";
import { StepPresets } from "@/components/onboarding/step-presets";
import { StepProviders } from "@/components/onboarding/step-providers";
import { presets } from "@/lib/onboarding-data";

describe("StepPresets", () => {
  it("renders all 6 presets", () => {
    render(<StepPresets presets={presets} onSelect={vi.fn()} />);
    expect(screen.getByText("Discord AI Bot")).toBeInTheDocument();
    expect(screen.getByText("Slack AI Assistant")).toBeInTheDocument();
    expect(screen.getByText("Multi-Channel")).toBeInTheDocument();
    expect(screen.getByText("Voice-Enabled")).toBeInTheDocument();
    expect(screen.getByText("API Only")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("shows key count for non-custom presets", () => {
    render(<StepPresets presets={presets} onSelect={vi.fn()} />);
    // Multiple presets show "2 keys needed" (Discord AI Bot, Slack AI Assistant)
    const keyLabels = screen.getAllByText(/\d+ keys? needed/);
    expect(keyLabels.length).toBeGreaterThan(0);
  });

  it("calls onSelect when a preset is clicked", () => {
    const onSelect = vi.fn();
    render(<StepPresets presets={presets} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Discord AI Bot"));
    expect(onSelect).toHaveBeenCalledWith(presets.find((p) => p.id === "discord-ai-bot"));
  });

  it("renders the getting started heading", () => {
    render(<StepPresets presets={presets} onSelect={vi.fn()} />);
    expect(screen.getByText("Get started with WOPR")).toBeInTheDocument();
  });
});

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

  it("shows Selected label for selected channels", () => {
    render(<StepChannels selected={["discord"]} onToggle={vi.fn()} />);
    expect(screen.getByText("Selected")).toBeInTheDocument();
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

describe("StepProviders", () => {
  it("renders WOPR Hosted hero card", () => {
    render(
      <StepProviders
        selected={[]}
        onToggle={vi.fn()}
        providerMode="hosted"
        onProviderModeChange={vi.fn()}
      />,
    );
    expect(screen.getByText("WOPR Hosted")).toBeInTheDocument();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("renders BYOK section with toggle", () => {
    render(
      <StepProviders
        selected={[]}
        onToggle={vi.fn()}
        providerMode="hosted"
        onProviderModeChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Already have API keys? Bring your own.")).toBeInTheDocument();
  });

  it("shows provider grid when BYOK is expanded", () => {
    render(
      <StepProviders
        selected={[]}
        onToggle={vi.fn()}
        providerMode="byok"
        onProviderModeChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("Kimi")).toBeInTheDocument();
    expect(screen.getByText("OpenCode")).toBeInTheDocument();
  });

  it("shows Selected label for selected providers in BYOK mode", () => {
    render(
      <StepProviders
        selected={["anthropic"]}
        onToggle={vi.fn()}
        providerMode="byok"
        onProviderModeChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Selected")).toBeInTheDocument();
  });

  it("calls onToggle when a provider is clicked in BYOK mode", () => {
    const onToggle = vi.fn();
    render(
      <StepProviders
        selected={[]}
        onToggle={onToggle}
        providerMode="byok"
        onProviderModeChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Anthropic"));
    expect(onToggle).toHaveBeenCalledWith("anthropic");
  });

  it("calls onProviderModeChange when hosted is selected", () => {
    const onModeChange = vi.fn();
    render(
      <StepProviders
        selected={[]}
        onToggle={vi.fn()}
        providerMode="byok"
        onProviderModeChange={onModeChange}
      />,
    );
    fireEvent.click(screen.getByText("WOPR Hosted"));
    expect(onModeChange).toHaveBeenCalledWith("hosted");
  });

  it("shows hosted capabilities", () => {
    render(
      <StepProviders
        selected={[]}
        onToggle={vi.fn()}
        providerMode="hosted"
        onProviderModeChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Text Generation")).toBeInTheDocument();
    expect(screen.getByText("Image Generation")).toBeInTheDocument();
    expect(screen.getByText("Transcription")).toBeInTheDocument();
    expect(screen.getByText("Embeddings")).toBeInTheDocument();
  });
});

describe("StepPlugins", () => {
  it("renders plugin categories", () => {
    render(<StepPlugins selected={[]} onToggle={vi.fn()} />);
    expect(screen.getByText("Memory")).toBeInTheDocument();
    expect(screen.getByText("Voice")).toBeInTheDocument();
    expect(screen.getByText("Integration")).toBeInTheDocument();
    expect(screen.getByText("UI")).toBeInTheDocument();
  });

  it("renders individual plugins", () => {
    render(<StepPlugins selected={[]} onToggle={vi.fn()} />);
    expect(screen.getByText("Semantic Memory Search")).toBeInTheDocument();
    expect(screen.getByText("ElevenLabs TTS")).toBeInTheDocument();
    expect(screen.getByText("Deepgram STT")).toBeInTheDocument();
    expect(screen.getByText("Discord Voice")).toBeInTheDocument();
    expect(screen.getByText("Webhooks")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("Web UI")).toBeInTheDocument();
  });

  it("shows toggle switches for each plugin", () => {
    render(<StepPlugins selected={[]} onToggle={vi.fn()} />);
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThan(0);
  });

  it("calls onToggle when a switch is clicked", () => {
    const onToggle = vi.fn();
    render(<StepPlugins selected={[]} onToggle={onToggle} />);
    const memorySwitch = screen.getByLabelText("Toggle Semantic Memory Search");
    fireEvent.click(memorySwitch);
    expect(onToggle).toHaveBeenCalledWith("semantic-memory");
  });

  it("shows dependency info for plugins with requires", () => {
    render(<StepPlugins selected={[]} onToggle={vi.fn()} />);
    expect(screen.getByText("Requires: discord")).toBeInTheDocument();
  });
});

describe("StepKeys", () => {
  const fields = [
    {
      key: "discord_bot_token",
      label: "Discord Bot Token",
      secret: true,
      placeholder: "Paste your Discord bot token",
      helpText: "Found in the Developer Portal.",
      helpUrl: "https://discord.com/developers",
      validation: { pattern: "^[A-Za-z0-9_.-]+$", message: "Invalid token format" },
    },
    {
      key: "anthropic_api_key",
      label: "Anthropic API Key",
      secret: true,
      placeholder: "sk-ant-...",
      helpText: "Get from Anthropic Console.",
    },
  ];

  it("renders all key fields", () => {
    render(
      <StepKeys
        fields={fields}
        values={{}}
        errors={{}}
        validating={{}}
        onChange={vi.fn()}
        onValidate={vi.fn()}
      />,
    );
    expect(screen.getByText("Discord Bot Token")).toBeInTheDocument();
    expect(screen.getByText("Anthropic API Key")).toBeInTheDocument();
  });

  it("shows trust banner", () => {
    render(
      <StepKeys
        fields={fields}
        values={{}}
        errors={{}}
        validating={{}}
        onChange={vi.fn()}
        onValidate={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/WOPR never proxies, stores centrally, or has access to your keys/),
    ).toBeInTheDocument();
  });

  it("masks secret fields by default", () => {
    render(
      <StepKeys
        fields={fields}
        values={{ discord_bot_token: "secret123" }}
        errors={{}}
        validating={{}}
        onChange={vi.fn()}
        onValidate={vi.fn()}
      />,
    );
    const input = screen.getByLabelText("Discord Bot Token") as HTMLInputElement;
    expect(input.type).toBe("password");
  });

  it("toggles password visibility", () => {
    render(
      <StepKeys
        fields={fields}
        values={{ discord_bot_token: "secret123" }}
        errors={{}}
        validating={{}}
        onChange={vi.fn()}
        onValidate={vi.fn()}
      />,
    );
    const showButtons = screen.getAllByText("Show");
    fireEvent.click(showButtons[0]);
    const input = screen.getByLabelText("Discord Bot Token") as HTMLInputElement;
    expect(input.type).toBe("text");
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(
      <StepKeys
        fields={fields}
        values={{}}
        errors={{}}
        validating={{}}
        onChange={onChange}
        onValidate={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Paste your Discord bot token"), {
      target: { value: "new-token" },
    });
    expect(onChange).toHaveBeenCalledWith("discord_bot_token", "new-token");
  });

  it("displays error messages", () => {
    render(
      <StepKeys
        fields={fields}
        values={{}}
        errors={{ discord_bot_token: "Invalid token format" }}
        validating={{}}
        onChange={vi.fn()}
        onValidate={vi.fn()}
      />,
    );
    expect(screen.getByText("Invalid token format")).toBeInTheDocument();
  });

  it("shows validating state", () => {
    render(
      <StepKeys
        fields={fields}
        values={{ discord_bot_token: "abc" }}
        errors={{}}
        validating={{ discord_bot_token: true }}
        onChange={vi.fn()}
        onValidate={vi.fn()}
      />,
    );
    expect(screen.getByText("validating...")).toBeInTheDocument();
  });

  it("shows valid state when value present and no error", () => {
    render(
      <StepKeys
        fields={fields}
        values={{ discord_bot_token: "valid-token" }}
        errors={{ discord_bot_token: null }}
        validating={{}}
        onChange={vi.fn()}
        onValidate={vi.fn()}
      />,
    );
    expect(screen.getByText("valid")).toBeInTheDocument();
  });

  it("shows help text and link", () => {
    render(
      <StepKeys
        fields={fields}
        values={{}}
        errors={{}}
        validating={{}}
        onChange={vi.fn()}
        onValidate={vi.fn()}
      />,
    );
    expect(screen.getByText(/Found in the Developer Portal/)).toBeInTheDocument();
    expect(screen.getByText("Open portal")).toBeInTheDocument();
  });

  it("shows empty state when no fields", () => {
    render(
      <StepKeys
        fields={[]}
        values={{}}
        errors={{}}
        validating={{}}
        onChange={vi.fn()}
        onValidate={vi.fn()}
      />,
    );
    expect(screen.getByText("No keys required for your current selection.")).toBeInTheDocument();
  });
});

describe("StepBilling", () => {
  it("renders the payment heading", () => {
    render(
      <StepBilling
        billingEmail=""
        cardComplete={false}
        onEmailChange={vi.fn()}
        onCardCompleteChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Payment method")).toBeInTheDocument();
  });

  it("renders billing email input", () => {
    render(
      <StepBilling
        billingEmail="test@example.com"
        cardComplete={false}
        onEmailChange={vi.fn()}
        onCardCompleteChange={vi.fn()}
      />,
    );
    const input = screen.getByLabelText("Billing email") as HTMLInputElement;
    expect(input.value).toBe("test@example.com");
  });

  it("calls onEmailChange when email is typed", () => {
    const onEmailChange = vi.fn();
    render(
      <StepBilling
        billingEmail=""
        cardComplete={false}
        onEmailChange={onEmailChange}
        onCardCompleteChange={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Billing email"), {
      target: { value: "user@test.com" },
    });
    expect(onEmailChange).toHaveBeenCalledWith("user@test.com");
  });

  it("shows no-commitment messaging", () => {
    render(
      <StepBilling
        billingEmail=""
        cardComplete={false}
        onEmailChange={vi.fn()}
        onCardCompleteChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/No minimum, no commitment/)).toBeInTheDocument();
  });

  it("renders stripe placeholder", () => {
    render(
      <StepBilling
        billingEmail=""
        cardComplete={false}
        onEmailChange={vi.fn()}
        onCardCompleteChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("stripe-card-placeholder")).toBeInTheDocument();
  });
});

describe("StepPlugins hosted mode", () => {
  it("shows 'Included with WOPR Hosted' badge for hosted-included plugins", () => {
    render(<StepPlugins selected={[]} onToggle={vi.fn()} providerMode="hosted" />);
    const badges = screen.getAllByText("Included with WOPR Hosted");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("does not show hosted badge in byok mode", () => {
    render(<StepPlugins selected={[]} onToggle={vi.fn()} providerMode="byok" />);
    expect(screen.queryByText("Included with WOPR Hosted")).not.toBeInTheDocument();
  });
});

describe("StepDeploy", () => {
  it("shows launch button when idle", () => {
    render(<StepDeploy status="idle" onDeploy={vi.fn()} />);
    expect(screen.getByText("Deploy Fleet")).toBeInTheDocument();
    expect(screen.getByText("Ready to deploy")).toBeInTheDocument();
  });

  it("opens nuclear launch modal when deploy button clicked", () => {
    render(<StepDeploy status="idle" onDeploy={vi.fn()} />);
    fireEvent.click(screen.getByText("Deploy Fleet"));
    expect(screen.getByTestId("nuclear-launch-modal")).toBeInTheDocument();
  });

  it("shows progress during provisioning", () => {
    render(<StepDeploy status="provisioning" onDeploy={vi.fn()} />);
    expect(screen.getByText("Deploying...")).toBeInTheDocument();
    expect(screen.getByText("PROVISIONING")).toBeInTheDocument();
  });

  it("shows completed and current deploy stages", () => {
    render(<StepDeploy status="configuring" onDeploy={vi.fn()} />);
    expect(screen.getByText("PROVISIONING")).toBeInTheDocument();
    expect(screen.getByText("CONFIGURING")).toBeInTheDocument();
    // Pending stages are not rendered in the streaming terminal
    expect(screen.queryByText("STARTING")).not.toBeInTheDocument();
  });

  it("shows deployed when done", () => {
    render(<StepDeploy status="done" onDeploy={vi.fn()} />);
    expect(screen.getByText("Deployed")).toBeInTheDocument();
  });

  it("shows retry button on error without modal", () => {
    const onDeploy = vi.fn();
    render(<StepDeploy status="error" onDeploy={onDeploy} />);
    fireEvent.click(screen.getByText("Retry Deploy"));
    expect(onDeploy).toHaveBeenCalledOnce();
  });
});

describe("StepDone", () => {
  it("renders completion message", () => {
    render(<StepDone onGoToDashboard={vi.fn()} onCreateAnother={vi.fn()} />);
    expect(screen.getByText("Your WOPR is live!")).toBeInTheDocument();
  });

  it("calls onGoToDashboard when button clicked", () => {
    const onGo = vi.fn();
    render(<StepDone onGoToDashboard={onGo} onCreateAnother={vi.fn()} />);
    fireEvent.click(screen.getByText("Go to Dashboard"));
    expect(onGo).toHaveBeenCalledOnce();
  });

  it("calls onCreateAnother when button clicked", () => {
    const onAnother = vi.fn();
    render(<StepDone onGoToDashboard={vi.fn()} onCreateAnother={onAnother} />);
    fireEvent.click(screen.getByText("Create another WOPR"));
    expect(onAnother).toHaveBeenCalledOnce();
  });
});
