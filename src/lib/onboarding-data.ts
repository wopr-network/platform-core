// --- Personalities ---

export interface Personality {
  id: string;
  name: string;
  description: string;
}

export const personalities: Personality[] = [
  { id: "helpful", name: "Helpful assistant", description: "Friendly and informative." },
  { id: "creative", name: "Creative collaborator", description: "Imaginative and playful." },
  { id: "code", name: "Code companion", description: "Technical and precise." },
  { id: "custom", name: "Custom", description: "Describe your own personality." },
];

// --- Superpowers ---

export interface Superpower {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  /** Whether this superpower needs an API key under BYOK mode */
  requiresKey: boolean;
  configFields: OnboardingConfigField[];
}

export const superpowers: Superpower[] = [
  {
    id: "image-gen",
    name: "ImageGen",
    tagline: "/imagine anything",
    description: "Generate images from text descriptions.",
    icon: "Image",
    color: "#F59E0B",
    requiresKey: true,
    configFields: [
      {
        key: "openai_api_key",
        label: "OpenAI API Key",
        secret: true,
        placeholder: "sk-...",
        helpUrl: "https://platform.openai.com/api-keys",
        helpText: "Used for DALL-E image generation.",
        validation: { pattern: "^sk-", message: "Must start with sk-" },
      },
    ],
  },
  {
    id: "voice",
    name: "Voice",
    tagline: "Talk out loud",
    description: "Speech-to-text and text-to-speech.",
    icon: "Mic",
    color: "#8B5CF6",
    requiresKey: true,
    configFields: [
      {
        key: "elevenlabs_api_key",
        label: "ElevenLabs API Key",
        secret: true,
        placeholder: "Paste your ElevenLabs API key",
        helpUrl: "https://elevenlabs.io/",
        helpText: "Used for text-to-speech synthesis.",
      },
    ],
  },
  {
    id: "memory",
    name: "Memory",
    tagline: "Remembers everything",
    description: "Long-term memory with semantic search across conversations.",
    icon: "Brain",
    color: "#10B981",
    requiresKey: false,
    configFields: [],
  },
  {
    id: "search",
    name: "Search",
    tagline: "Web + docs",
    description: "Search the web and documents for real-time information.",
    icon: "Search",
    color: "#3B82F6",
    requiresKey: true,
    configFields: [
      {
        key: "serper_api_key",
        label: "Serper API Key",
        secret: true,
        placeholder: "Paste your Serper API key",
        helpUrl: "https://serper.dev/",
        helpText: "Used for web search. Free tier available.",
      },
    ],
  },
];

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

// --- Model catalog ---

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  providerId: string;
  description: string;
  costPerMessage: string;
  hero: boolean;
  recommended: boolean;
  category: "reasoning" | "general" | "fast" | "code" | "vision" | "open-source";
}

export const heroModels: ModelOption[] = [
  {
    id: "anthropic/claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    provider: "Anthropic",
    providerId: "anthropic",
    description: "Best at reasoning, coding, and conversation",
    costPerMessage: "~$0.01/msg",
    hero: true,
    recommended: true,
    category: "reasoning",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    providerId: "openai",
    description: "Great all-rounder, fast and reliable",
    costPerMessage: "~$0.005/msg",
    hero: true,
    recommended: false,
    category: "general",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    provider: "Meta",
    providerId: "meta",
    description: "Open source and fast, good for simple tasks",
    costPerMessage: "~$0.001/msg",
    hero: true,
    recommended: false,
    category: "open-source",
  },
];

export const additionalModels: ModelOption[] = [
  {
    id: "anthropic/claude-opus-4-20250514",
    name: "Claude Opus 4",
    provider: "Anthropic",
    providerId: "anthropic",
    description: "Most capable, deep reasoning",
    costPerMessage: "~$0.08/msg",
    hero: false,
    recommended: false,
    category: "reasoning",
  },
  {
    id: "anthropic/claude-haiku-4-20250514",
    name: "Claude Haiku 4",
    provider: "Anthropic",
    providerId: "anthropic",
    description: "Fast and affordable",
    costPerMessage: "~$0.001/msg",
    hero: false,
    recommended: false,
    category: "fast",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    providerId: "openai",
    description: "Lightweight and fast",
    costPerMessage: "~$0.001/msg",
    hero: false,
    recommended: false,
    category: "fast",
  },
  {
    id: "openai/o3",
    name: "o3",
    provider: "OpenAI",
    providerId: "openai",
    description: "Advanced reasoning model",
    costPerMessage: "~$0.04/msg",
    hero: false,
    recommended: false,
    category: "reasoning",
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    providerId: "google",
    description: "Multimodal with long context",
    costPerMessage: "~$0.01/msg",
    hero: false,
    recommended: false,
    category: "vision",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    providerId: "google",
    description: "Fast and cost-effective",
    costPerMessage: "~$0.002/msg",
    hero: false,
    recommended: false,
    category: "fast",
  },
  {
    id: "mistralai/mistral-large",
    name: "Mistral Large",
    provider: "Mistral",
    providerId: "mistral",
    description: "Strong multilingual model",
    costPerMessage: "~$0.008/msg",
    hero: false,
    recommended: false,
    category: "general",
  },
  {
    id: "mistralai/mistral-small",
    name: "Mistral Small",
    provider: "Mistral",
    providerId: "mistral",
    description: "Efficient and affordable",
    costPerMessage: "~$0.001/msg",
    hero: false,
    recommended: false,
    category: "fast",
  },
  {
    id: "cohere/command-r-plus",
    name: "Command R+",
    provider: "Cohere",
    providerId: "cohere",
    description: "Retrieval-augmented generation specialist",
    costPerMessage: "~$0.005/msg",
    hero: false,
    recommended: false,
    category: "general",
  },
  {
    id: "deepseek/deepseek-chat-v3",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    providerId: "deepseek",
    description: "Strong reasoning at low cost",
    costPerMessage: "~$0.002/msg",
    hero: false,
    recommended: false,
    category: "reasoning",
  },
  {
    id: "meta-llama/llama-3.1-8b-instruct",
    name: "Llama 3.1 8B",
    provider: "Meta",
    providerId: "meta",
    description: "Small and very fast",
    costPerMessage: "~$0.0002/msg",
    hero: false,
    recommended: false,
    category: "fast",
  },
  {
    id: "qwen/qwen-2.5-72b-instruct",
    name: "Qwen 2.5 72B",
    provider: "Qwen",
    providerId: "qwen",
    description: "Multilingual powerhouse",
    costPerMessage: "~$0.003/msg",
    hero: false,
    recommended: false,
    category: "general",
  },
];

export const allModels: ModelOption[] = [...heroModels, ...additionalModels];

export const MODEL_COUNT = "200+";

// --- BYOK Providers ---

export interface ByokProvider {
  id: string;
  name: string;
  description: string;
  models: string;
  color: string;
}

export const byokProviders: ByokProvider[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models directly",
    models: "Claude Opus, Sonnet, Haiku",
    color: "#D4A574",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4, o1, GPT-4o directly",
    models: "GPT-4o, o1, o3",
    color: "#10A37F",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "200+ models, one key",
    models: "All providers",
    color: "#6366F1",
  },
  {
    id: "google",
    name: "Google AI",
    description: "Gemini models directly",
    models: "Gemini 2.5 Pro, Flash",
    color: "#4285F4",
  },
  {
    id: "mistral",
    name: "Mistral",
    description: "Mistral models directly",
    models: "Large, Small, Codestral",
    color: "#FF7000",
  },
  {
    id: "groq",
    name: "Groq",
    description: "Ultra-fast inference",
    models: "Llama, Mixtral",
    color: "#F55036",
  },
  {
    id: "together",
    name: "Together",
    description: "Open-source model hosting",
    models: "Llama, Qwen, Mistral",
    color: "#0066FF",
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
