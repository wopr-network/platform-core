import { fireEvent, render, screen } from "@testing-library/react";
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

// ---- Step 3: Connect ----

describe("StepConnect", () => {
  it("renders channel connection fields for selected channels", () => {
    render(
      <StepConnect
        selectedChannels={["discord"]}
        channelKeyValues={{}}
        channelKeyErrors={{}}
        onChannelKeyChange={vi.fn()}
        onValidateChannelKey={vi.fn()}
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
        onChannelKeyChange={vi.fn()}
        onValidateChannelKey={vi.fn()}
      />,
    );
    expect(screen.getByText("No channels selected. Go back to add one.")).toBeInTheDocument();
  });

  it("calls onChannelKeyChange when typing", () => {
    const onChange = vi.fn();
    render(
      <StepConnect
        selectedChannels={["telegram"]}
        channelKeyValues={{}}
        channelKeyErrors={{}}
        onChannelKeyChange={onChange}
        onValidateChannelKey={vi.fn()}
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
        onChannelKeyChange={vi.fn()}
        onValidateChannelKey={vi.fn()}
      />,
    );
    expect(screen.getByText("Invalid token format")).toBeInTheDocument();
  });
});

// ---- Step 4: Superpowers ----

describe("StepSuperpowers", () => {
  it("renders all superpowers", () => {
    render(<StepSuperpowers selected={[]} onToggle={vi.fn()} />);
    expect(screen.getByText("ImageGen")).toBeInTheDocument();
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
    expect(switches).toHaveLength(4);
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
        creditBalance="$5.00"
        byokKeyValues={{}}
        byokKeyErrors={{}}
        onByokKeyChange={vi.fn()}
        onValidateByokKey={vi.fn()}
      />,
    );
    expect(screen.getByText("OpenAI API Key")).toBeInTheDocument();
  });

  it("lists required keys for selected superpowers", () => {
    render(
      <StepPowerSource
        selectedSuperpowers={["image-gen", "voice"]}
        providerMode="byok"
        onProviderModeChange={vi.fn()}
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
        creditBalance="$5.00"
        byokKeyValues={{}}
        byokKeyErrors={{}}
        onByokKeyChange={vi.fn()}
        onValidateByokKey={vi.fn()}
      />,
    );
    expect(screen.queryByText("OpenAI API Key")).not.toBeInTheDocument();
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
