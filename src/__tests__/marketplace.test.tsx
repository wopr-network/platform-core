import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginManifest } from "../lib/marketplace-data";
import {
  ALL_CATEGORIES,
  formatInstallCount,
  getHostedAdaptersForCapabilities,
  HOSTED_ADAPTERS,
  hasHostedOption,
} from "../lib/marketplace-data";

// vi.hoisted runs before module imports so TEST_PLUGINS is available in vi.mock factories
const { TEST_PLUGINS } = vi.hoisted(() => {
  // biome-ignore lint/suspicious/noExplicitAny: type not available at hoist time
  const TEST_PLUGINS: any[] = [
    {
      id: "discord",
      name: "Discord",
      description:
        "Connect your WOPR instance to Discord servers. Supports text channels, threads, DMs, and slash commands.",
      version: "3.2.0",
      author: "WOPR Team",
      icon: "MessageCircle",
      color: "#5865F2",
      category: "channel",
      tags: ["channel", "chat", "community"],
      capabilities: ["channel"],
      requires: [],
      install: [],
      configSchema: [
        {
          key: "botToken",
          label: "Bot Token",
          type: "string",
          required: true,
          secret: true,
          setupFlow: "paste",
          placeholder: "Paste your Discord bot token",
          description: "Found under Bot > Token in the Developer Portal.",
          validation: { pattern: "^[A-Za-z0-9_.-]+$", message: "Invalid token format" },
        },
        {
          key: "guildId",
          label: "Server ID",
          type: "string",
          required: true,
          placeholder: "e.g. 123456789012345678",
          description: "Right-click server name > Copy Server ID.",
          validation: { pattern: "^\\d{17,20}$", message: "Must be a numeric server ID" },
        },
      ],
      setup: [
        {
          id: "create-bot",
          title: "Create a Discord Bot",
          description: "Create a bot.",
          fields: [],
        },
        {
          id: "paste-token",
          title: "Enter Bot Token",
          description: "Paste the token.",
          fields: [
            {
              key: "botToken",
              label: "Bot Token",
              type: "string",
              required: true,
              secret: true,
              setupFlow: "paste",
              placeholder: "Paste your Discord bot token",
              description: "Found under Bot > Token.",
              validation: { pattern: "^[A-Za-z0-9_.-]+$", message: "Invalid token format" },
            },
          ],
        },
        { id: "done", title: "Connection Complete", description: "Ready.", fields: [] },
      ],
      connectionTest: { label: "Test Bot Connection", endpoint: "/api/channels/discord/test" },
      installCount: 12400,
      changelog: [
        { version: "3.2.0", date: "2026-02-10", notes: "Added thread support and slash commands." },
      ],
      marketplaceTab: "channel",
    },
    {
      id: "slack",
      name: "Slack",
      description: "Connect your WOPR instance to Slack workspaces.",
      version: "2.1.0",
      author: "WOPR Team",
      icon: "Hash",
      color: "#4A154B",
      category: "channel",
      tags: ["channel", "chat"],
      capabilities: ["channel"],
      requires: [],
      install: [],
      configSchema: [],
      setup: [{ id: "done", title: "Ready", description: "Ready.", fields: [] }],
      connectionTest: { label: "Test Slack Connection", endpoint: "/api/channels/slack/test" },
      installCount: 8200,
      changelog: [],
      marketplaceTab: "channel",
    },
    {
      id: "telegram",
      name: "Telegram",
      description: "Connect your WOPR instance to Telegram.",
      version: "1.5.0",
      author: "WOPR Team",
      icon: "Send",
      color: "#0088CC",
      category: "channel",
      tags: ["channel"],
      capabilities: ["channel"],
      requires: [],
      install: [],
      configSchema: [],
      setup: [{ id: "done", title: "Ready", description: "Ready.", fields: [] }],
      connectionTest: {
        label: "Test Telegram Connection",
        endpoint: "/api/channels/telegram/test",
      },
      installCount: 5100,
      changelog: [],
      marketplaceTab: "channel",
    },
    {
      id: "semantic-memory",
      name: "Semantic Memory",
      description: "Long-term memory with vector search.",
      version: "1.4.0",
      author: "WOPR Team",
      icon: "Database",
      color: "#8B5CF6",
      category: "memory",
      tags: ["memory", "vectors"],
      capabilities: ["memory", "embeddings"],
      requires: [],
      install: [],
      configSchema: [],
      setup: [{ id: "done", title: "Memory Ready", description: "Ready.", fields: [] }],
      installCount: 9800,
      changelog: [],
      marketplaceTab: "superpower",
      superpowerHeadline: "A Bot That Never Forgets",
      superpowerTagline: "Your bot remembers every conversation.",
      superpowerOutcomes: ["Recalls context from months ago"],
    },
    {
      id: "meeting-transcriber",
      name: "Meeting Transcriber",
      description: "Transcribe voice meetings automatically.",
      version: "1.0.0",
      author: "WOPR Team",
      icon: "Mic",
      color: "#F59E0B",
      category: "voice",
      tags: ["voice", "transcription"],
      capabilities: ["stt", "llm"],
      requires: [{ id: "discord", label: "Discord (for voice channels)" }],
      install: ["discord"],
      configSchema: [],
      setup: [{ id: "done", title: "Ready", description: "Ready.", fields: [] }],
      installCount: 3200,
      changelog: [],
      marketplaceTab: "superpower",
      superpowerHeadline: "Fire Your Secretary",
      superpowerTagline: "Your bot takes meeting notes.",
      superpowerOutcomes: ["Auto-transcribed meetings"],
    },
    {
      id: "webhooks",
      name: "Webhooks",
      description: "Send and receive webhooks.",
      version: "1.1.0",
      author: "WOPR Team",
      icon: "Webhook",
      color: "#F59E0B",
      category: "webhook",
      tags: ["webhook"],
      capabilities: ["webhook"],
      requires: [],
      install: [],
      configSchema: [
        {
          key: "secret",
          label: "Webhook Secret",
          type: "string",
          required: false,
          secret: true,
          placeholder: "Optional",
        },
      ],
      setup: [
        { id: "configure", title: "Configure Webhooks", description: "Set up.", fields: [] },
        { id: "done", title: "Webhooks Ready", description: "Ready.", fields: [] },
      ],
      installCount: 7100,
      changelog: [],
      marketplaceTab: "utility",
    },
    {
      id: "deepgram-stt",
      name: "Deepgram STT",
      description: "Speech-to-text powered by Deepgram.",
      version: "1.0.0",
      author: "WOPR Team",
      icon: "Mic",
      color: "#6366F1",
      category: "voice",
      tags: ["stt", "voice"],
      capabilities: ["stt"],
      requires: [],
      install: [],
      configSchema: [],
      setup: [{ id: "done", title: "Ready", description: "Ready.", fields: [] }],
      installCount: 4500,
      changelog: [],
      marketplaceTab: "capability",
    },
  ];
  return { TEST_PLUGINS };
});

// --- Mock next/navigation for page components ---
const mockPush = vi.fn();
const mockParams: { plugin?: string } = {};
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/marketplace",
  useParams: () => mockParams,
  useSearchParams: () => ({ get: () => null }),
}));

// --- Mock next/link ---
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: { children: React.ReactNode; href: string } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// --- Mock marketplace-data API functions ---
vi.mock("../lib/marketplace-data", async () => {
  const actual = await vi.importActual("../lib/marketplace-data");
  return {
    ...actual,
    listMarketplacePlugins: vi.fn().mockResolvedValue(TEST_PLUGINS),
    getMarketplacePlugin: vi.fn().mockImplementation(async (id: string) => {
      return TEST_PLUGINS.find((p) => p.id === id) ?? null;
    }),
    getPluginContent: vi.fn().mockResolvedValue(null),
  };
});

function findManifest(id: string) {
  const m = TEST_PLUGINS.find((p) => p.id === id);
  if (!m) throw new Error(`Manifest ${id} not found in TEST_PLUGINS`);
  return m;
}

function closestButton(el: HTMLElement): HTMLElement {
  const btn = el.closest("button");
  if (!btn) throw new Error("No parent button found");
  return btn;
}

// --- Data layer tests ---
describe("marketplace-data", () => {
  describe("formatInstallCount", () => {
    it("formats thousands with k suffix", () => {
      expect(formatInstallCount(12400)).toBe("12.4k");
      expect(formatInstallCount(8200)).toBe("8.2k");
      expect(formatInstallCount(1000)).toBe("1.0k");
    });

    it("returns plain number for counts under 1000", () => {
      expect(formatInstallCount(500)).toBe("500");
      expect(formatInstallCount(0)).toBe("0");
    });
  });

  describe("hasHostedOption", () => {
    it("returns true when capabilities match hosted adapters", () => {
      expect(hasHostedOption(["llm"])).toBe(true);
      expect(hasHostedOption(["tts"])).toBe(true);
      expect(hasHostedOption(["stt"])).toBe(true);
      expect(hasHostedOption(["embeddings"])).toBe(true);
      expect(hasHostedOption(["image-gen"])).toBe(true);
    });

    it("returns false when no capabilities match", () => {
      expect(hasHostedOption(["channel"])).toBe(false);
      expect(hasHostedOption(["webhook"])).toBe(false);
      expect(hasHostedOption(["ui"])).toBe(false);
      expect(hasHostedOption([])).toBe(false);
    });

    it("returns true if any capability matches", () => {
      expect(hasHostedOption(["channel", "llm"])).toBe(true);
      expect(hasHostedOption(["stt", "webhook"])).toBe(true);
    });
  });

  describe("getHostedAdaptersForCapabilities", () => {
    it("returns matching hosted adapters", () => {
      const adapters = getHostedAdaptersForCapabilities(["stt", "llm"]);
      expect(adapters).toHaveLength(2);
      expect(adapters.map((a) => a.capability)).toContain("llm");
      expect(adapters.map((a) => a.capability)).toContain("stt");
    });

    it("returns empty array when no match", () => {
      expect(getHostedAdaptersForCapabilities(["channel"])).toHaveLength(0);
    });
  });

  describe("HOSTED_ADAPTERS", () => {
    it("has entries for key hosted capabilities", () => {
      const caps = HOSTED_ADAPTERS.map((a) => a.capability);
      expect(caps).toContain("llm");
      expect(caps).toContain("tts");
      expect(caps).toContain("stt");
      expect(caps).toContain("embeddings");
      expect(caps).toContain("image-gen");
    });
  });

  describe("ALL_CATEGORIES", () => {
    it("includes standard plugin categories", () => {
      const ids = ALL_CATEGORIES.map((c) => c.id);
      expect(ids).toContain("channel");
      expect(ids).toContain("voice");
      expect(ids).toContain("memory");
      expect(ids).toContain("integration");
      expect(ids).toContain("webhook");
    });
  });
});

// --- Component tests ---
describe("MarketplacePage", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockParams.plugin = undefined;
  });

  it("renders marketplace page with heading and plugin cards", async () => {
    const { default: MarketplacePage } = await import("../app/(dashboard)/marketplace/page");
    render(<MarketplacePage />);

    // Initially shows skeleton loading state
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();

    // After loading, shows heading and featured section
    expect(await screen.findByText("Browse Superpowers")).toBeInTheDocument();
    expect(await screen.findByText("Featured Superpowers")).toBeInTheDocument();
  });

  it("filters plugins by search term", async () => {
    const user = userEvent.setup();
    const { default: MarketplacePage } = await import("../app/(dashboard)/marketplace/page");
    render(<MarketplacePage />);

    await screen.findByText("Browse Superpowers");

    const searchInput = screen.getByPlaceholderText("Search superpowers...");
    await user.type(searchInput, "nonexistentterm12345");

    // No results in the grid
    expect(screen.getByText(/No results for/)).toBeInTheDocument();
  });

  it("filters plugins by tab", async () => {
    const user = userEvent.setup();
    const { default: MarketplacePage } = await import("../app/(dashboard)/marketplace/page");
    render(<MarketplacePage />);

    await screen.findByText("Browse Superpowers");

    // Click "Channels" tab
    const channelsButton = closestButton(screen.getByText("Channels"));
    await user.click(channelsButton);

    // Should show channel plugins in the grid
    expect(screen.getByText("Discord")).toBeInTheDocument();
    expect(screen.getByText("Slack")).toBeInTheDocument();

    // Should not show non-channel plugins like webhooks in the grid
    expect(screen.queryByText("Webhooks")).not.toBeInTheDocument();
  });

  it("shows WOPR Hosted Available badge for eligible plugins", async () => {
    const user = userEvent.setup();
    const { default: MarketplacePage } = await import("../app/(dashboard)/marketplace/page");
    render(<MarketplacePage />);

    await screen.findByText("Browse Superpowers");

    // Switch to Capabilities tab — Deepgram STT has 'stt' capability which matches a hosted adapter
    const capabilitiesButton = closestButton(screen.getByText("Capabilities"));
    await user.click(capabilitiesButton);

    // PluginCard shows "WOPR Hosted" badge for eligible plugins
    const hostedBadges = screen.getAllByText("WOPR Hosted");
    expect(hostedBadges.length).toBeGreaterThan(0);
  });

  it("shows empty state when no plugins match search", async () => {
    const user = userEvent.setup();
    const { default: MarketplacePage } = await import("../app/(dashboard)/marketplace/page");
    render(<MarketplacePage />);

    await screen.findByText("Browse Superpowers");

    const searchInput = screen.getByPlaceholderText("Search superpowers...");
    await user.type(searchInput, "nonexistentplugin12345");

    expect(screen.getByText(/No results for/)).toBeInTheDocument();
  });
});

describe("PluginDetailPage", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders plugin detail page with manifest info", async () => {
    mockParams.plugin = "discord";
    const { default: PluginDetailPage } = await import(
      "../app/(dashboard)/marketplace/[plugin]/page"
    );
    render(<PluginDetailPage />);

    // Wait for loading
    expect(await screen.findByText("Discord")).toBeInTheDocument();
    expect(screen.getByText("v3.2.0")).toBeInTheDocument();
    expect(screen.getByText("Give my bot this superpower")).toBeInTheDocument();
    expect(screen.getByText(/12\.4k installs/)).toBeInTheDocument();
  });

  it("shows not found for invalid plugin id", async () => {
    mockParams.plugin = "nonexistent-plugin";
    const { default: PluginDetailPage } = await import(
      "../app/(dashboard)/marketplace/[plugin]/page"
    );
    render(<PluginDetailPage />);

    expect(await screen.findByText("Plugin not found.")).toBeInTheDocument();
  });

  it("shows hosted adapter info for eligible plugins", async () => {
    mockParams.plugin = "semantic-memory";
    const { default: PluginDetailPage } = await import(
      "../app/(dashboard)/marketplace/[plugin]/page"
    );
    render(<PluginDetailPage />);

    await screen.findByText("A Bot That Never Forgets");
    expect(screen.getByText("WOPR Hosted")).toBeInTheDocument();
    expect(screen.getByText("WOPR Hosted Options")).toBeInTheDocument();
    expect(screen.getByText("WOPR Hosted Embeddings")).toBeInTheDocument();
  });

  it("shows requirements for plugins with dependencies", async () => {
    mockParams.plugin = "meeting-transcriber";
    const { default: PluginDetailPage } = await import(
      "../app/(dashboard)/marketplace/[plugin]/page"
    );
    render(<PluginDetailPage />);

    await screen.findByText("Fire Your Secretary");
    expect(screen.getByText("Discord (for voice channels)")).toBeInTheDocument();
  });

  it("opens install wizard when Install button is clicked", async () => {
    const user = userEvent.setup();
    mockParams.plugin = "webhooks";
    const { default: PluginDetailPage } = await import(
      "../app/(dashboard)/marketplace/[plugin]/page"
    );
    render(<PluginDetailPage />);

    await screen.findByText("Webhooks");
    const installButton = screen.getByText("Give my bot this superpower");
    await user.click(installButton);

    // Should now show install wizard
    expect(screen.getByText("Install Webhooks")).toBeInTheDocument();
  });

  it("shows changelog entries", async () => {
    mockParams.plugin = "discord";
    const { default: PluginDetailPage } = await import(
      "../app/(dashboard)/marketplace/[plugin]/page"
    );
    render(<PluginDetailPage />);

    await screen.findByText("Discord");

    // Click changelog tab
    const user = userEvent.setup();
    await user.click(screen.getByText("Changelog"));

    expect(screen.getByText("Added thread support and slash commands.")).toBeInTheDocument();
    // v3.2.0 appears in the changelog entry badge (overview tab version footer is hidden)
    expect(screen.getAllByText("v3.2.0").length).toBeGreaterThanOrEqual(1);
  });

  it("shows configuration schema", async () => {
    mockParams.plugin = "discord";
    const { default: PluginDetailPage } = await import(
      "../app/(dashboard)/marketplace/[plugin]/page"
    );
    render(<PluginDetailPage />);

    await screen.findByText("Discord");

    const user = userEvent.setup();
    await user.click(screen.getByText("Configuration"));

    expect(screen.getByText("Bot Token")).toBeInTheDocument();
    expect(screen.getByText("Server ID")).toBeInTheDocument();
  });
});

describe("InstallWizard", () => {
  const mockBots = [
    { id: "00000000-0000-4000-8000-000000000001", name: "My Bot", state: "running" },
  ];

  beforeEach(() => {
    // Mock fetch for listBots so the wizard doesn't hang on network calls
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ bots: mockBots }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders wizard with cancel and continue buttons", async () => {
    const { InstallWizard } = await import("../components/marketplace/install-wizard");
    const plugin = findManifest("webhooks");

    render(<InstallWizard plugin={plugin} onComplete={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText("Install Webhooks")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Continue")).toBeInTheDocument();
  });

  it("shows bot selector as first phase", async () => {
    const { InstallWizard } = await import("../components/marketplace/install-wizard");
    const plugin = findManifest("webhooks");

    render(<InstallWizard plugin={plugin} onComplete={vi.fn()} onCancel={vi.fn()} />);

    // First phase is bot-select
    expect(screen.getByText("Select which bot to install this plugin on")).toBeInTheDocument();
  });

  it("shows provider selector for plugins with hosted capabilities", async () => {
    const { InstallWizard } = await import("../components/marketplace/install-wizard");
    // meeting-transcriber has stt and llm capabilities
    const plugin = findManifest("meeting-transcriber");

    render(<InstallWizard plugin={plugin} onComplete={vi.fn()} onCancel={vi.fn()} />);

    // First phase is bot-select — wait for bots to load and select one
    const user = userEvent.setup();
    expect(
      await screen.findByText("Select which bot to install this plugin on"),
    ).toBeInTheDocument();

    // Wait for bots to load
    const botButton = await screen.findByText("My Bot");
    await user.click(botButton);

    // Advance past bot-select
    await user.click(screen.getByText("Continue"));

    // Next phase is requirements
    expect(screen.getByText("Check plugin requirements")).toBeInTheDocument();

    // Advance past requirements
    await user.click(screen.getByText("Continue"));

    // Should now show provider selector
    expect(screen.getByText("Choose provider for each capability")).toBeInTheDocument();
    expect(screen.getByText("WOPR Hosted LLM")).toBeInTheDocument();
    expect(screen.getByText("WOPR Hosted STT")).toBeInTheDocument();
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const { InstallWizard } = await import("../components/marketplace/install-wizard");
    const plugin = findManifest("webhooks");
    const onCancel = vi.fn();

    render(<InstallWizard plugin={plugin} onComplete={vi.fn()} onCancel={onCancel} />);

    const user = userEvent.setup();
    await user.click(screen.getByText("Cancel"));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe("PluginCard", () => {
  it("renders plugin info with link to detail page", async () => {
    const { PluginCard } = await import("../components/marketplace/plugin-card");
    const plugin = TEST_PLUGINS[0]; // discord

    render(<PluginCard plugin={plugin} />);

    expect(screen.getByText("Discord")).toBeInTheDocument();
    expect(screen.getByText("v3.2.0")).toBeInTheDocument();
    expect(screen.getByText("12.4k installs")).toBeInTheDocument();
    expect(screen.getByText("WOPR Team")).toBeInTheDocument();

    // Should have a link to the detail page
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/marketplace/discord");
  });

  it("shows WOPR Hosted badge for eligible plugins", async () => {
    const { PluginCard } = await import("../components/marketplace/plugin-card");
    // semantic-memory has embeddings capability
    const plugin = findManifest("semantic-memory");

    render(<PluginCard plugin={plugin} />);

    // Cards show shortened "WOPR Hosted" badge text
    expect(screen.getByText("WOPR Hosted")).toBeInTheDocument();
  });

  it("does not show WOPR Hosted badge for plugins without hosted capabilities", async () => {
    const { PluginCard } = await import("../components/marketplace/plugin-card");
    // discord only has 'channel' capability, no hosted adapter for that
    const plugin = findManifest("discord");

    render(<PluginCard plugin={plugin} />);

    expect(screen.queryByText("WOPR Hosted")).not.toBeInTheDocument();
  });
});

describe("CategoryFilter", () => {
  it("renders All button and category buttons with counts", async () => {
    const { CategoryFilter } = await import("../components/marketplace/category-filter");
    const counts = { channel: 2, voice: 3, memory: 1 };

    render(<CategoryFilter selected={null} onSelect={vi.fn()} counts={counts} />);

    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Channel")).toBeInTheDocument();
    expect(screen.getByText("Voice")).toBeInTheDocument();
    expect(screen.getByText("Memory")).toBeInTheDocument();
  });

  it("calls onSelect with category when clicked", async () => {
    const { CategoryFilter } = await import("../components/marketplace/category-filter");
    const onSelect = vi.fn();
    const counts = { channel: 2, voice: 3 };

    render(<CategoryFilter selected={null} onSelect={onSelect} counts={counts} />);

    const user = userEvent.setup();
    await user.click(closestButton(screen.getByText("Voice")));

    expect(onSelect).toHaveBeenCalledWith("voice");
  });

  it("calls onSelect with null when All is clicked", async () => {
    const { CategoryFilter } = await import("../components/marketplace/category-filter");
    const onSelect = vi.fn();
    const counts = { channel: 2 };

    render(<CategoryFilter selected="channel" onSelect={onSelect} counts={counts} />);

    const user = userEvent.setup();
    await user.click(closestButton(screen.getByText("All")));

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("hides categories with zero plugins", async () => {
    const { CategoryFilter } = await import("../components/marketplace/category-filter");
    const counts = { channel: 2 };

    render(<CategoryFilter selected={null} onSelect={vi.fn()} counts={counts} />);

    // Only Channel and All should be visible
    expect(screen.getByText("Channel")).toBeInTheDocument();
    expect(screen.queryByText("Voice")).not.toBeInTheDocument();
    expect(screen.queryByText("Memory")).not.toBeInTheDocument();
  });
});
