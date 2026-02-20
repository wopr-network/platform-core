import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PERSONALITY_TEMPLATES } from "@/lib/bot-settings-data";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard/bots/bot-001/settings",
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

// Mock bot-settings-data API functions
vi.mock("@/lib/bot-settings-data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bot-settings-data")>();
  return {
    ...actual,
    getBotSettings: vi.fn().mockResolvedValue(actual.MOCK_BOT_SETTINGS),
    updateBotIdentity: vi.fn().mockResolvedValue(actual.MOCK_BOT_SETTINGS.identity),
    activateSuperpower: vi.fn().mockResolvedValue({ success: true }),
    controlBot: vi.fn().mockResolvedValue(undefined),
  };
});

describe("BotSettingsClient", () => {
  it("renders loading state initially", async () => {
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    expect(screen.getByText("Loading bot settings...")).toBeInTheDocument();
  });

  it("renders bot name and status after loading", async () => {
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    expect(await screen.findByText("Jarvis")).toBeInTheDocument();
  });

  it("renders all 7 tab triggers", async () => {
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    expect(screen.getByRole("tab", { name: "Identity" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Brain" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Channels" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Superpowers" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Plugins" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Usage" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Danger Zone" })).toBeInTheDocument();
  });

  it("renders back to fleet link", async () => {
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    const backLink = screen.getByRole("link", { name: /Back to Fleet/ });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/dashboard");
  });
});

describe("Identity tab", () => {
  it("renders identity form fields", async () => {
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Personality")).toBeInTheDocument();
  });

  it("renders personality template buttons", async () => {
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    for (const template of PERSONALITY_TEMPLATES) {
      expect(screen.getByRole("button", { name: template.label })).toBeInTheDocument();
    }
  });

  it("renders save changes button", async () => {
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });
});

describe("Brain tab", () => {
  it("renders current model and provider mode", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Brain" }));

    expect(screen.getByText("Current Model")).toBeInTheDocument();
    expect(screen.getByText(/Claude Sonnet 4/)).toBeInTheDocument();
    expect(screen.getByText("Provider Mode")).toBeInTheDocument();
  });

  it("renders WOPR Hosted and BYOK options", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Brain" }));

    expect(screen.getByText("WOPR Hosted")).toBeInTheDocument();
    expect(screen.getByText("Bring Your Own Key")).toBeInTheDocument();
  });
});

describe("Channels tab", () => {
  it("renders connected channels", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Channels" }));

    expect(screen.getByText("Discord")).toBeInTheDocument();
    expect(screen.getByText("Web UI")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Always On")).toBeInTheDocument();
  });

  it("renders add channel buttons", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Channels" }));

    expect(screen.getByRole("button", { name: "+ Add Slack" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Add Telegram" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Add WhatsApp" })).toBeInTheDocument();
  });

  it("renders free channels messaging", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Channels" }));

    expect(
      screen.getByText("Your WOPR works everywhere you do. All channels are free."),
    ).toBeInTheDocument();
  });
});

describe("Superpowers tab", () => {
  it("renders active superpowers with usage stats", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Superpowers" }));

    expect(screen.getByText("ImageGen")).toBeInTheDocument();
    expect(screen.getByText(/47 images this week/)).toBeInTheDocument();
    expect(screen.getByText(/\$2\.35/)).toBeInTheDocument();

    expect(screen.getByText("Voice (STT+TTS)")).toBeInTheDocument();
    expect(screen.getByText("Memory")).toBeInTheDocument();
  });

  it("renders available superpowers with pricing", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Superpowers" }));

    expect(screen.getByText("VideoGen")).toBeInTheDocument();
    expect(screen.getByText("~$0.50/vid")).toBeInTheDocument();
    expect(screen.getByText("Phone Calls")).toBeInTheDocument();
    expect(screen.getByText("~$0.10/min")).toBeInTheDocument();
    expect(screen.getByText("SMS")).toBeInTheDocument();
    expect(screen.getByText("Web Search")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
  });

  it("renders add buttons for available superpowers", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Superpowers" }));

    const addButtons = screen.getAllByRole("button", { name: "+ Add" });
    expect(addButtons.length).toBe(5); // 5 available superpowers
  });

  it("renders 'Your WOPR can do more' section", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Superpowers" }));

    expect(screen.getByText("Your WOPR can do more")).toBeInTheDocument();
    expect(screen.getByText("One click to activate. Uses your credits.")).toBeInTheDocument();
  });

  it("calls activateSuperpower on add button click", async () => {
    const user = userEvent.setup();
    const { activateSuperpower } = await import("@/lib/bot-settings-data");
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Superpowers" }));

    const addButtons = screen.getAllByRole("button", { name: "+ Add" });
    await user.click(addButtons[0]);

    expect(activateSuperpower).toHaveBeenCalledWith("bot-001", "video-gen");
  });
});

describe("Plugins tab", () => {
  it("renders installed plugins", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Plugins" }));

    expect(screen.getByText("Meeting Transcriber")).toBeInTheDocument();
    expect(screen.getByText("Art Director")).toBeInTheDocument();
  });

  it("renders plugin capabilities", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Plugins" }));

    expect(screen.getByText("Uses: Voice (STT), Memory")).toBeInTheDocument();
    expect(screen.getByText("Uses: ImageGen")).toBeInTheDocument();
  });

  it("renders discover plugins section", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Plugins" }));

    expect(screen.getByText("Discover Plugins")).toBeInTheDocument();
    expect(screen.getByText("Analytics Pro")).toBeInTheDocument();
    expect(screen.getByText("Music Bot")).toBeInTheDocument();
    expect(screen.getByText("Scheduler")).toBeInTheDocument();
  });

  it("renders needs badges on discover plugins", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Plugins" }));

    const hostedBadges = screen.getAllByText("Needs: Hosted");
    expect(hostedBadges.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Needs: Voice")).toBeInTheDocument();
  });

  it("renders browse all plugins link", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Plugins" }));

    const browseLink = screen.getByRole("link", { name: "Browse all plugins" });
    expect(browseLink).toHaveAttribute("href", "/marketplace");
  });
});

describe("Usage tab", () => {
  it("renders usage summary", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Usage" }));

    expect(screen.getByText(/\$4\.00/)).toBeInTheDocument();
    expect(screen.getByText(/\$7\.42/)).toBeInTheDocument();
  });

  it("renders per-capability breakdown", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Usage" }));

    expect(screen.getByText("By Capability")).toBeInTheDocument();
    // Capability names appear in the breakdown
    const usageSection = screen.getByText("By Capability").closest("[data-slot='card']");
    expect(usageSection).toBeInTheDocument();
  });

  it("renders trend chart", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Usage" }));

    expect(screen.getByText("Trend")).toBeInTheDocument();
    expect(screen.getByText("Daily spend over the last 14 days")).toBeInTheDocument();
  });
});

describe("Danger Zone tab", () => {
  it("renders danger zone heading", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Danger Zone" }));

    expect(screen.getByRole("heading", { name: "Danger Zone" })).toBeInTheDocument();
  });

  it("renders stop, archive, and delete buttons", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Danger Zone" }));

    expect(screen.getByRole("button", { name: "Stop Jarvis" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive Jarvis" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Jarvis" })).toBeInTheDocument();
  });

  it("opens confirmation dialog on stop click", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Danger Zone" }));
    await user.click(screen.getByRole("button", { name: "Stop Jarvis" }));

    expect(screen.getByText("Stop Jarvis?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop bot" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("opens delete dialog with name confirmation requirement", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Danger Zone" }));
    await user.click(screen.getByRole("button", { name: "Delete Jarvis" }));

    expect(screen.getByText("Delete Jarvis permanently?")).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type "Jarvis" to confirm')).toBeInTheDocument();

    // Delete button should be disabled until name is typed
    const deleteBtn = screen.getByRole("button", { name: "Delete permanently" });
    expect(deleteBtn).toBeDisabled();
  });

  it("enables delete button when name matches", async () => {
    const user = userEvent.setup();
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Danger Zone" }));
    await user.click(screen.getByRole("button", { name: "Delete Jarvis" }));

    const input = screen.getByPlaceholderText('Type "Jarvis" to confirm');
    await user.type(input, "Jarvis");

    const deleteBtn = screen.getByRole("button", { name: "Delete permanently" });
    expect(deleteBtn).not.toBeDisabled();
  });

  it("calls controlBot on stop confirmation", async () => {
    const user = userEvent.setup();
    const { controlBot } = await import("@/lib/bot-settings-data");
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Danger Zone" }));
    await user.click(screen.getByRole("button", { name: "Stop Jarvis" }));
    await user.click(screen.getByRole("button", { name: "Stop bot" }));

    expect(controlBot).toHaveBeenCalledWith("bot-001", "stop");
  });
});

describe("Error handling", () => {
  it("shows error when getBotSettings fails", async () => {
    const { getBotSettings } = await import("@/lib/bot-settings-data");
    vi.mocked(getBotSettings).mockRejectedValueOnce(
      new Error("API error: 500 Internal Server Error"),
    );
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    expect(await screen.findByText("API error: 500 Internal Server Error")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to Dashboard/ })).toBeInTheDocument();
  });

  it("shows error when updateBotIdentity fails", async () => {
    const user = userEvent.setup();
    const { updateBotIdentity } = await import("@/lib/bot-settings-data");
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    vi.mocked(updateBotIdentity).mockRejectedValueOnce(new Error("Save failed"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText(/Failed to save/)).toBeInTheDocument();
  });

  it("does not show Saved! when save fails", async () => {
    const user = userEvent.setup();
    const { updateBotIdentity } = await import("@/lib/bot-settings-data");
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    vi.mocked(updateBotIdentity).mockRejectedValueOnce(new Error("Save failed"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await screen.findByText(/Failed to save/);
    expect(screen.queryByText("Saved!")).not.toBeInTheDocument();
  });

  it("shows error when activateSuperpower fails", async () => {
    const user = userEvent.setup();
    const { activateSuperpower } = await import("@/lib/bot-settings-data");
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Superpowers" }));
    vi.mocked(activateSuperpower).mockRejectedValueOnce(new Error("Activation failed"));
    const addButtons = screen.getAllByRole("button", { name: "+ Add" });
    await user.click(addButtons[0]);

    expect(await screen.findByText(/Failed to activate/)).toBeInTheDocument();
  });

  it("shows error when controlBot fails", async () => {
    const user = userEvent.setup();
    const { controlBot } = await import("@/lib/bot-settings-data");
    const { BotSettingsClient } = await import("../components/bot-settings/bot-settings-client");
    render(<BotSettingsClient botId="bot-001" />);
    await screen.findByText("Jarvis");

    await user.click(screen.getByRole("tab", { name: "Danger Zone" }));
    vi.mocked(controlBot).mockRejectedValueOnce(new Error("Control failed"));
    await user.click(screen.getByRole("button", { name: "Stop Jarvis" }));
    await user.click(screen.getByRole("button", { name: "Stop bot" }));

    expect(await screen.findByText(/Failed to stop bot/)).toBeInTheDocument();
  });
});
