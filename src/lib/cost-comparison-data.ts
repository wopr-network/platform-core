export interface DiyCostItem {
  capabilityId: string;
  diyLabel: string;
  diyCostPerMonth: string;
  diyCostNumeric: number; // cents, for summing
  accounts: string[];
  apiKeys: string[];
  hardware: string | null;
}

export interface CostComparisonSummary {
  items: DiyCostItem[];
  totalDiyMonthly: string;
  totalWoprMonthly: string;
  accountsRequired: number;
  apiKeysRequired: number;
}

export const DIY_COSTS: DiyCostItem[] = [
  // Channels
  {
    capabilityId: "discord",
    diyLabel: "Discord bot hosting",
    diyCostPerMonth: "$5-20/mo",
    diyCostNumeric: 1200,
    accounts: ["Discord Developer Portal"],
    apiKeys: ["Discord Bot Token"],
    hardware: "VPS or cloud server",
  },
  {
    capabilityId: "slack",
    diyLabel: "Slack app hosting",
    diyCostPerMonth: "$5-20/mo",
    diyCostNumeric: 1200,
    accounts: ["Slack API Portal"],
    apiKeys: ["Slack Bot Token", "Slack Signing Secret"],
    hardware: "VPS or cloud server",
  },
  {
    capabilityId: "telegram",
    diyLabel: "Telegram bot hosting",
    diyCostPerMonth: "$5-20/mo",
    diyCostNumeric: 1200,
    accounts: ["Telegram BotFather"],
    apiKeys: ["Telegram Bot Token"],
    hardware: "VPS or cloud server",
  },
  {
    capabilityId: "signal",
    diyLabel: "Signal bot hosting",
    diyCostPerMonth: "$10-30/mo",
    diyCostNumeric: 2000,
    accounts: ["Signal account"],
    apiKeys: ["Signal phone number"],
    hardware: "Dedicated server (always-on)",
  },
  {
    capabilityId: "whatsapp",
    diyLabel: "WhatsApp Business API",
    diyCostPerMonth: "$15-50/mo",
    diyCostNumeric: 3000,
    accounts: ["Meta Developer Portal", "WhatsApp Business"],
    apiKeys: ["WhatsApp API Token"],
    hardware: null,
  },
  {
    capabilityId: "msteams",
    diyLabel: "MS Teams bot hosting",
    diyCostPerMonth: "$10-30/mo",
    diyCostNumeric: 2000,
    accounts: ["Microsoft Azure", "Teams Developer Portal"],
    apiKeys: ["Teams App ID", "Teams App Password"],
    hardware: null,
  },
  // Superpowers
  {
    capabilityId: "image-gen",
    diyLabel: "Image generation API",
    diyCostPerMonth: "$10-50/mo",
    diyCostNumeric: 3000,
    accounts: ["Replicate"],
    apiKeys: ["Replicate API Token"],
    hardware: null,
  },
  {
    capabilityId: "video-gen",
    diyLabel: "Video generation API",
    diyCostPerMonth: "$20-100/mo",
    diyCostNumeric: 6000,
    accounts: ["Replicate"],
    apiKeys: ["Replicate API Token"],
    hardware: null,
  },
  {
    capabilityId: "voice",
    diyLabel: "Voice synthesis API",
    diyCostPerMonth: "$5-30/mo",
    diyCostNumeric: 1500,
    accounts: ["ElevenLabs"],
    apiKeys: ["ElevenLabs API Key"],
    hardware: null,
  },
  {
    capabilityId: "memory",
    diyLabel: "Vector DB + embeddings",
    diyCostPerMonth: "$10-40/mo",
    diyCostNumeric: 2500,
    accounts: ["OpenAI or OpenRouter"],
    apiKeys: ["OpenAI/OpenRouter API Key"],
    hardware: "Vector database (Pinecone, Qdrant, etc.)",
  },
  {
    capabilityId: "search",
    diyLabel: "Web search API",
    diyCostPerMonth: "$5-20/mo",
    diyCostNumeric: 1200,
    accounts: ["OpenAI or OpenRouter"],
    apiKeys: ["OpenAI/OpenRouter API Key"],
    hardware: null,
  },
  {
    capabilityId: "text-gen",
    diyLabel: "LLM inference API",
    diyCostPerMonth: "$20-200/mo",
    diyCostNumeric: 10000,
    accounts: ["OpenAI or OpenRouter"],
    apiKeys: ["OpenAI/OpenRouter API Key"],
    hardware: null,
  },
];

export function buildCostComparison(
  selectedChannels: string[],
  selectedSuperpowers: string[],
): CostComparisonSummary {
  const selectedIds = new Set([...selectedChannels, ...selectedSuperpowers]);
  const items = DIY_COSTS.filter((c) => selectedIds.has(c.capabilityId));

  const allAccounts = new Set<string>();
  const allApiKeys = new Set<string>();
  let totalDiyCents = 0;

  for (const item of items) {
    for (const acc of item.accounts) allAccounts.add(acc);
    for (const key of item.apiKeys) allApiKeys.add(key);
    totalDiyCents += item.diyCostNumeric;
  }

  const totalDiy = totalDiyCents / 100;

  return {
    items,
    totalDiyMonthly: totalDiy > 0 ? `$${totalDiy}+` : "$0",
    totalWoprMonthly: "$5",
    accountsRequired: allAccounts.size,
    apiKeysRequired: allApiKeys.size,
  };
}
