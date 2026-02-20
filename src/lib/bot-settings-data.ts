import { API_BASE_URL } from "./api-config";

// --- Bot Settings types ---

export interface BotIdentity {
  name: string;
  avatar: string;
  personality: string;
}

export interface PersonalityTemplate {
  id: string;
  label: string;
  text: string;
}

export const PERSONALITY_TEMPLATES: PersonalityTemplate[] = [
  {
    id: "professional",
    label: "Professional",
    text: "You are a professional assistant. You communicate clearly, concisely, and formally. You focus on accuracy and efficiency.",
  },
  {
    id: "creative",
    label: "Creative",
    text: "You are a creative companion. You think outside the box, use vivid language, and love brainstorming new ideas. You are enthusiastic and imaginative.",
  },
  {
    id: "casual",
    label: "Casual",
    text: "You are a laid-back, friendly assistant. You keep things simple, use conversational language, and don't take yourself too seriously.",
  },
  {
    id: "custom",
    label: "Custom",
    text: "",
  },
];

export interface BotBrain {
  provider: string;
  model: string;
  mode: "hosted" | "byok";
  costPerMessage: string;
  description: string;
}

export interface BotChannel {
  id: string;
  type: string;
  name: string;
  status: "connected" | "disconnected" | "always-on";
  stats: string;
}

export interface AvailableChannel {
  type: string;
  label: string;
}

export interface ActiveSuperpower {
  id: string;
  name: string;
  icon: string;
  mode: "hosted" | "byok";
  provider: string;
  model: string;
  usageCount: number;
  usageLabel: string;
  spend: number;
}

export interface AvailableSuperpower {
  id: string;
  name: string;
  icon: string;
  description: string;
  pricing: string;
}

export interface InstalledPlugin {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: "active" | "disabled";
  capabilities: string[];
}

export interface DiscoverPlugin {
  id: string;
  name: string;
  description: string;
  icon: string;
  needs: string[];
}

export interface CapabilityUsage {
  capability: string;
  icon: string;
  spend: number;
  percent: number;
}

export interface UsageTrendPoint {
  date: string;
  spend: number;
}

export interface BotUsage {
  totalSpend: number;
  creditBalance: number;
  capabilities: CapabilityUsage[];
  trend: UsageTrendPoint[];
}

export interface BotSettings {
  id: string;
  identity: BotIdentity;
  brain: BotBrain;
  channels: BotChannel[];
  availableChannels: AvailableChannel[];
  activeSuperpowers: ActiveSuperpower[];
  availableSuperpowers: AvailableSuperpower[];
  installedPlugins: InstalledPlugin[];
  discoverPlugins: DiscoverPlugin[];
  usage: BotUsage;
  status: "running" | "stopped" | "archived";
}

// --- Mock data ---

export const MOCK_BOT_SETTINGS: BotSettings = {
  id: "bot-001",
  identity: {
    name: "Jarvis",
    avatar: "robot",
    personality:
      'You are Jarvis, a helpful AI assistant. You are witty, concise, and slightly sarcastic. You help with coding, research, and creative tasks. You call your owner "sir."',
  },
  brain: {
    provider: "Anthropic",
    model: "Claude Sonnet 4",
    mode: "hosted",
    costPerMessage: "~$0.01/message",
    description: "Excellent at reasoning and code",
  },
  channels: [
    {
      id: "ch-1",
      type: "Discord",
      name: "My Server",
      status: "connected",
      stats: "3 channels, 142 messages today",
    },
    {
      id: "ch-2",
      type: "Web UI",
      name: "chat.wopr.bot/jarvis",
      status: "always-on",
      stats: "12 sessions today",
    },
  ],
  availableChannels: [
    { type: "Slack", label: "Slack" },
    { type: "Telegram", label: "Telegram" },
    { type: "WhatsApp", label: "WhatsApp" },
  ],
  activeSuperpowers: [
    {
      id: "image-gen",
      name: "ImageGen",
      icon: "image",
      mode: "hosted",
      provider: "Replicate",
      model: "SDXL",
      usageCount: 47,
      usageLabel: "images this week",
      spend: 2.35,
    },
    {
      id: "voice",
      name: "Voice (STT+TTS)",
      icon: "mic",
      mode: "hosted",
      provider: "Deepgram + ElevenLabs",
      model: "STT + TTS",
      usageCount: 34,
      usageLabel: "min this week",
      spend: 1.2,
    },
    {
      id: "memory",
      name: "Memory",
      icon: "brain",
      mode: "hosted",
      provider: "OpenAI",
      model: "ada-002",
      usageCount: 2847,
      usageLabel: "memories stored",
      spend: 0.45,
    },
  ],
  availableSuperpowers: [
    {
      id: "video-gen",
      name: "VideoGen",
      icon: "video",
      description: "Generate videos from text in any channel",
      pricing: "~$0.50/vid",
    },
    {
      id: "phone",
      name: "Phone Calls",
      icon: "phone",
      description: "Your WOPR answers the phone and calls people",
      pricing: "~$0.10/min",
    },
    {
      id: "sms",
      name: "SMS",
      icon: "message-square",
      description: "Your WOPR sends and receives texts",
      pricing: "~$0.02/msg",
    },
    {
      id: "search",
      name: "Web Search",
      icon: "search",
      description: "Web + doc search in any channel",
      pricing: "~$0.01/search",
    },
    {
      id: "analytics",
      name: "Analytics",
      icon: "bar-chart",
      description: "Usage insights and reports",
      pricing: "Free",
    },
  ],
  installedPlugins: [
    {
      id: "meeting-transcriber",
      name: "Meeting Transcriber",
      description: "Transcribes voice calls to searchable notes",
      icon: "file-text",
      status: "active",
      capabilities: ["Voice (STT)", "Memory"],
    },
    {
      id: "art-director",
      name: "Art Director",
      description: "Style-consistent image generation with presets",
      icon: "palette",
      status: "active",
      capabilities: ["ImageGen"],
    },
  ],
  discoverPlugins: [
    {
      id: "analytics-pro",
      name: "Analytics Pro",
      description: "Deep usage analytics & reports",
      icon: "bar-chart",
      needs: ["Hosted"],
    },
    {
      id: "music-bot",
      name: "Music Bot",
      description: "Play music in voice channels",
      icon: "music",
      needs: ["Voice", "Hosted"],
    },
    {
      id: "scheduler",
      name: "Scheduler",
      description: "Schedule messages & reminders",
      icon: "calendar",
      needs: [],
    },
  ],
  usage: {
    totalSpend: 4.0,
    creditBalance: 7.42,
    capabilities: [
      { capability: "ImageGen", icon: "image", spend: 2.35, percent: 59 },
      { capability: "Voice", icon: "mic", spend: 1.2, percent: 30 },
      { capability: "Memory", icon: "brain", spend: 0.45, percent: 11 },
    ],
    trend: [
      { date: "Feb 1", spend: 0.5 },
      { date: "Feb 3", spend: 0.8 },
      { date: "Feb 5", spend: 0.3 },
      { date: "Feb 7", spend: 1.2 },
      { date: "Feb 9", spend: 0.6 },
      { date: "Feb 11", spend: 0.4 },
      { date: "Feb 13", spend: 0.2 },
    ],
  },
  status: "running",
};

// --- API functions ---

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function getBotSettings(botId: string): Promise<BotSettings> {
  return apiFetch<BotSettings>(`/fleet/bots/${botId}/settings`);
}

export async function updateBotIdentity(
  botId: string,
  identity: BotIdentity,
): Promise<BotIdentity> {
  return apiFetch<BotIdentity>(`/fleet/bots/${botId}/identity`, {
    method: "PUT",
    body: JSON.stringify(identity),
  });
}

export async function activateSuperpower(
  botId: string,
  superpowerId: string,
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(
    `/fleet/bots/${botId}/capabilities/${superpowerId}/activate`,
    { method: "POST" },
  );
}

export async function controlBot(
  botId: string,
  action: "stop" | "archive" | "delete",
): Promise<void> {
  if (action === "delete") {
    await apiFetch(`/fleet/bots/${botId}`, { method: "DELETE" });
  } else {
    await apiFetch(`/fleet/bots/${botId}/${action}`, { method: "POST" });
  }
}
