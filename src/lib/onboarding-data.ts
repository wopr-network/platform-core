export interface PluginOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  capabilities: string[];
  requires?: string[];
  configFields: OnboardingConfigField[];
}

export interface OnboardingConfigField {
  key: string;
  label: string;
  secret: boolean;
  placeholder?: string;
  helpUrl?: string;
  helpText?: string;
  validation?: {
    pattern: string;
    message: string;
  };
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  channels: string[];
  providers: string[];
  plugins: string[];
  keyCount: number;
}

// --- Channels ---

export const channelPlugins: PluginOption[] = [
  {
    id: "discord",
    name: "Discord",
    description: "Connect a Discord bot to your server.",
    icon: "MessageCircle",
    color: "#5865F2",
    capabilities: ["channel"],
    configFields: [
      {
        key: "discord_bot_token",
        label: "Discord Bot Token",
        secret: true,
        placeholder: "Paste your Discord bot token",
        helpUrl: "https://discord.com/developers/applications",
        helpText: "Create an app in the Discord Developer Portal, then copy the bot token.",
        validation: { pattern: "^[A-Za-z0-9_.-]+$", message: "Invalid token format" },
      },
      {
        key: "discord_guild_id",
        label: "Discord Server ID",
        secret: false,
        placeholder: "e.g. 123456789012345678",
        helpText: "Right-click your server name and select Copy Server ID.",
        validation: { pattern: "^\\d{17,20}$", message: "Must be a numeric server ID" },
      },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    description: "Connect a Slack app to your workspace.",
    icon: "Hash",
    color: "#4A154B",
    capabilities: ["channel"],
    configFields: [
      {
        key: "slack_bot_token",
        label: "Slack Bot Token",
        secret: true,
        placeholder: "xoxb-...",
        helpUrl: "https://api.slack.com/apps",
        helpText: "Create a Slack app, add Bot Token Scopes, then install to workspace.",
        validation: { pattern: "^xoxb-", message: "Must start with xoxb-" },
      },
      {
        key: "slack_signing_secret",
        label: "Slack Signing Secret",
        secret: true,
        placeholder: "Paste your signing secret",
        helpText: "Found under Basic Information > App Credentials.",
      },
    ],
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Connect a Telegram bot via BotFather.",
    icon: "Send",
    color: "#0088CC",
    capabilities: ["channel"],
    configFields: [
      {
        key: "telegram_bot_token",
        label: "Telegram Bot Token",
        secret: true,
        placeholder: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
        helpUrl: "https://t.me/BotFather",
        helpText: "Message @BotFather on Telegram with /newbot to get a token.",
        validation: { pattern: "^[0-9]+:[A-Za-z0-9_-]+$", message: "Invalid Telegram token" },
      },
    ],
  },
  {
    id: "signal",
    name: "Signal",
    description: "Connect a Signal bot for secure messaging.",
    icon: "Shield",
    color: "#3A76F0",
    capabilities: ["channel"],
    configFields: [
      {
        key: "signal_phone",
        label: "Signal Phone Number",
        secret: false,
        placeholder: "+1234567890",
        helpText: "The phone number linked to your Signal account.",
        validation: { pattern: "^\\+\\d{7,15}$", message: "Must be E.164 format" },
      },
    ],
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Connect via WhatsApp Business API.",
    icon: "Phone",
    color: "#25D366",
    capabilities: ["channel"],
    configFields: [
      {
        key: "whatsapp_token",
        label: "WhatsApp API Token",
        secret: true,
        placeholder: "Paste your WhatsApp Business API token",
        helpUrl: "https://developers.facebook.com/",
        helpText: "Set up a WhatsApp Business account in Meta Developer Portal.",
      },
    ],
  },
  {
    id: "msteams",
    name: "MS Teams",
    description: "Connect a Microsoft Teams bot.",
    icon: "Users",
    color: "#6264A7",
    capabilities: ["channel"],
    configFields: [
      {
        key: "msteams_app_id",
        label: "Teams App ID",
        secret: false,
        placeholder: "Paste your Teams app ID",
        helpUrl: "https://dev.teams.microsoft.com/",
        helpText: "Register a bot in the Teams Developer Portal.",
      },
      {
        key: "msteams_app_password",
        label: "Teams App Password",
        secret: true,
        placeholder: "Paste your app password",
      },
    ],
  },
];

// --- Providers ---

export const providerPlugins: PluginOption[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models for reasoning and conversation.",
    icon: "Brain",
    color: "#D4A574",
    capabilities: ["provider"],
    configFields: [
      {
        key: "anthropic_api_key",
        label: "Anthropic API Key",
        secret: true,
        placeholder: "sk-ant-...",
        helpUrl: "https://console.anthropic.com/settings/keys",
        helpText: "Get an API key from the Anthropic Console.",
        validation: { pattern: "^sk-ant-", message: "Must start with sk-ant-" },
      },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT models for text and image generation.",
    icon: "Sparkles",
    color: "#10A37F",
    capabilities: ["provider"],
    configFields: [
      {
        key: "openai_api_key",
        label: "OpenAI API Key",
        secret: true,
        placeholder: "sk-...",
        helpUrl: "https://platform.openai.com/api-keys",
        helpText: "Get an API key from the OpenAI dashboard.",
        validation: { pattern: "^sk-", message: "Must start with sk-" },
      },
    ],
  },
  {
    id: "kimi",
    name: "Kimi",
    description: "Moonshot AI models for long-context tasks.",
    icon: "Moon",
    color: "#6C5CE7",
    capabilities: ["provider"],
    configFields: [
      {
        key: "kimi_api_key",
        label: "Kimi API Key",
        secret: true,
        placeholder: "Paste your Kimi API key",
        helpUrl: "https://platform.moonshot.cn/",
        helpText: "Get an API key from the Moonshot Platform.",
      },
    ],
  },
  {
    id: "opencode",
    name: "OpenCode",
    description: "Open-source compatible inference endpoint.",
    icon: "Code",
    color: "#FF6B6B",
    capabilities: ["provider"],
    configFields: [
      {
        key: "opencode_endpoint",
        label: "OpenCode Endpoint URL",
        secret: false,
        placeholder: "https://your-endpoint.example.com/v1",
        helpText: "Your OpenAI-compatible inference endpoint.",
      },
      {
        key: "opencode_api_key",
        label: "OpenCode API Key",
        secret: true,
        placeholder: "Paste your API key",
      },
    ],
  },
];

// --- Optional Plugins ---

export interface PluginCategory {
  id: string;
  name: string;
  plugins: PluginOption[];
}

export const pluginCategories: PluginCategory[] = [
  {
    id: "memory",
    name: "Memory",
    plugins: [
      {
        id: "semantic-memory",
        name: "Semantic Memory Search",
        description: "Long-term memory with vector search across conversations.",
        icon: "Database",
        color: "#8B5CF6",
        capabilities: ["memory"],
        configFields: [],
      },
    ],
  },
  {
    id: "voice",
    name: "Voice",
    plugins: [
      {
        id: "elevenlabs-tts",
        name: "ElevenLabs TTS",
        description: "High-quality text-to-speech synthesis.",
        icon: "Volume2",
        color: "#000000",
        capabilities: ["voice", "tts"],
        configFields: [
          {
            key: "elevenlabs_api_key",
            label: "ElevenLabs API Key",
            secret: true,
            placeholder: "Paste your ElevenLabs API key",
            helpUrl: "https://elevenlabs.io/",
            helpText: "Get an API key from ElevenLabs.",
          },
        ],
      },
      {
        id: "deepgram-stt",
        name: "Deepgram STT",
        description: "Fast, accurate speech-to-text transcription.",
        icon: "Mic",
        color: "#13EF93",
        capabilities: ["voice", "stt"],
        configFields: [
          {
            key: "deepgram_api_key",
            label: "Deepgram API Key",
            secret: true,
            placeholder: "Paste your Deepgram API key",
            helpUrl: "https://console.deepgram.com/",
            helpText: "Get an API key from Deepgram Console.",
          },
        ],
      },
      {
        id: "openai-tts",
        name: "OpenAI TTS",
        description: "Text-to-speech via OpenAI.",
        icon: "Volume2",
        color: "#10A37F",
        capabilities: ["voice", "tts"],
        requires: ["openai"],
        configFields: [],
      },
      {
        id: "discord-voice",
        name: "Discord Voice",
        description: "Join Discord voice channels for live conversation.",
        icon: "Headphones",
        color: "#5865F2",
        capabilities: ["voice", "channel-voice"],
        requires: ["discord"],
        configFields: [],
      },
    ],
  },
  {
    id: "integration",
    name: "Integration",
    plugins: [
      {
        id: "webhooks",
        name: "Webhooks",
        description: "Send and receive webhooks for external integrations.",
        icon: "Webhook",
        color: "#F59E0B",
        capabilities: ["integration"],
        configFields: [],
      },
      {
        id: "github",
        name: "GitHub",
        description: "GitHub integration for code review and issue tracking.",
        icon: "GitBranch",
        color: "#24292E",
        capabilities: ["integration"],
        configFields: [
          {
            key: "github_token",
            label: "GitHub Personal Access Token",
            secret: true,
            placeholder: "ghp_...",
            helpUrl: "https://github.com/settings/tokens",
            helpText: "Create a fine-grained personal access token on GitHub.",
            validation: { pattern: "^gh[ps]_", message: "Must start with ghp_ or ghs_" },
          },
        ],
      },
    ],
  },
  {
    id: "ui",
    name: "UI",
    plugins: [
      {
        id: "web-ui",
        name: "Web UI",
        description: "Browser-based chat interface for your WOPR.",
        icon: "Globe",
        color: "#3B82F6",
        capabilities: ["ui"],
        configFields: [],
      },
    ],
  },
];

// --- Presets ---

export const presets: Preset[] = [
  {
    id: "discord-ai-bot",
    name: "Discord AI Bot",
    description: "A Discord bot powered by Claude with memory.",
    channels: ["discord"],
    providers: ["anthropic"],
    plugins: ["semantic-memory"],
    keyCount: 2,
  },
  {
    id: "slack-ai-assistant",
    name: "Slack AI Assistant",
    description: "A Slack app powered by Claude with memory.",
    channels: ["slack"],
    providers: ["anthropic"],
    plugins: ["semantic-memory"],
    keyCount: 2,
  },
  {
    id: "multi-channel",
    name: "Multi-Channel",
    description: "Discord, Slack, and Telegram with Claude.",
    channels: ["discord", "slack", "telegram"],
    providers: ["anthropic"],
    plugins: ["semantic-memory"],
    keyCount: 4,
  },
  {
    id: "voice-enabled",
    name: "Voice-Enabled",
    description: "Discord bot with voice chat via ElevenLabs and Deepgram.",
    channels: ["discord"],
    providers: ["anthropic"],
    plugins: ["semantic-memory", "elevenlabs-tts", "deepgram-stt", "discord-voice"],
    keyCount: 4,
  },
  {
    id: "api-only",
    name: "API Only",
    description: "OpenAI-compatible API endpoint, no channels.",
    channels: [],
    providers: ["opencode"],
    plugins: [],
    keyCount: 1,
  },
  {
    id: "custom",
    name: "Custom",
    description: "Full wizard: pick channels, providers, and plugins.",
    channels: [],
    providers: [],
    plugins: [],
    keyCount: 0,
  },
];

// --- Helpers ---

export function getAllPlugins(): PluginOption[] {
  return [...channelPlugins, ...providerPlugins, ...pluginCategories.flatMap((c) => c.plugins)];
}

export function getPluginById(id: string): PluginOption | undefined {
  return getAllPlugins().find((p) => p.id === id);
}

export function collectConfigFields(
  selectedChannels: string[],
  selectedProviders: string[],
  selectedPlugins: string[],
): OnboardingConfigField[] {
  const allIds = [...selectedChannels, ...selectedProviders, ...selectedPlugins];
  const allPlugins = getAllPlugins();
  const fields: OnboardingConfigField[] = [];
  const seen = new Set<string>();

  for (const id of allIds) {
    const plugin = allPlugins.find((p) => p.id === id);
    if (!plugin) continue;
    for (const field of plugin.configFields) {
      if (!seen.has(field.key)) {
        seen.add(field.key);
        fields.push(field);
      }
    }
  }

  return fields;
}

export function resolveDependencies(
  selectedChannels: string[],
  selectedProviders: string[],
  selectedPlugins: string[],
): string[] {
  const allSelected = new Set([...selectedChannels, ...selectedProviders, ...selectedPlugins]);
  const allPlugins = getAllPlugins();
  const resolved = new Set(selectedPlugins);

  for (const pluginId of resolved) {
    const plugin = allPlugins.find((p) => p.id === pluginId);
    if (!plugin?.requires) continue;
    for (const dep of plugin.requires) {
      if (!allSelected.has(dep)) {
        // Dependency not in channels/providers, add as plugin
        resolved.add(dep);
      }
    }
  }

  return [...resolved];
}

export function validateField(field: OnboardingConfigField, value: string): string | null {
  if (!value.trim()) {
    return `${field.label} is required`;
  }
  if (field.validation) {
    try {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        return field.validation.message;
      }
    } catch {
      return field.validation.message;
    }
  }
  return null;
}
