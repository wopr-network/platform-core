export type SetupFlowType = "paste" | "oauth" | "qr" | "interactive";

export interface ConfigField {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "select";
  required: boolean;
  secret?: boolean;
  setupFlow?: SetupFlowType;
  placeholder?: string;
  description?: string;
  options?: { label: string; value: string }[];
  validation?: {
    pattern?: string;
    message?: string;
  };
  /** For setupFlow "oauth": the provider identifier used to request the OAuth URL from the backend. */
  oauthProvider?: string;
}

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  fields: ConfigField[];
  instruction?: string;
  externalUrl?: string;
}

export interface ChannelManifest {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  setup: SetupStep[];
  connectionTest?: {
    label: string;
    endpoint: string;
  };
}

export const channelManifests: ChannelManifest[] = [
  {
    id: "discord",
    name: "Discord",
    description: "Connect your Discord server with a bot application.",
    icon: "MessageCircle",
    color: "#5865F2",
    connectionTest: {
      label: "Test Bot Connection",
      endpoint: "/api/channels/discord/test",
    },
    setup: [
      {
        id: "create-bot",
        title: "Create a Discord Bot",
        description: "Create a bot application in the Discord Developer Portal.",
        instruction:
          "Go to the Discord Developer Portal, create a new application, and navigate to the Bot section to create a bot user.",
        externalUrl: "https://discord.com/developers/applications",
        fields: [],
      },
      {
        id: "paste-token",
        title: "Enter Bot Token",
        description: "Copy the bot token from the Developer Portal and paste it here.",
        fields: [
          {
            key: "botToken",
            label: "Bot Token",
            type: "string",
            required: true,
            secret: true,
            setupFlow: "paste",
            placeholder: "Paste your Discord bot token",
            description: "Found under Bot > Token in the Developer Portal.",
            validation: {
              pattern: "^[A-Za-z0-9_.-]+$",
              message: "Invalid token format",
            },
          },
        ],
      },
      {
        id: "select-guild",
        title: "Select Server",
        description: "Choose which Discord server the bot should operate in.",
        fields: [
          {
            key: "guildId",
            label: "Server",
            type: "select",
            required: true,
            setupFlow: "interactive",
            description: "Select the server where the bot has been invited.",
            options: [
              { label: "WOPR HQ", value: "1234567890" },
              { label: "Test Server", value: "0987654321" },
              { label: "Community", value: "1122334455" },
            ],
          },
        ],
      },
      {
        id: "done",
        title: "Connection Complete",
        description: "Your Discord bot is configured and ready to use.",
        fields: [],
      },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    description: "Connect your Slack workspace with an app integration.",
    icon: "Hash",
    color: "#4A154B",
    connectionTest: {
      label: "Test Slack Connection",
      endpoint: "/api/channels/slack/test",
    },
    setup: [
      {
        id: "install-app",
        title: "Install Slack App",
        description: "Create and install a Slack app in your workspace.",
        instruction:
          "Go to the Slack API portal, create a new app, and install it to your workspace.",
        externalUrl: "https://api.slack.com/apps",
        fields: [],
      },
      {
        id: "oauth",
        title: "Authorize with OAuth",
        description: "Authorize WOPR to access your Slack workspace.",
        fields: [
          {
            key: "oauthToken",
            label: "OAuth Token",
            type: "string",
            required: true,
            secret: true,
            setupFlow: "oauth",
            oauthProvider: "slack",
            placeholder: "Click Authorize to connect",
            description: "This will open a Slack OAuth window.",
          },
        ],
      },
      {
        id: "select-channels",
        title: "Select Channels",
        description: "Choose which channels WOPR should monitor.",
        fields: [
          {
            key: "channels",
            label: "Channels",
            type: "select",
            required: true,
            setupFlow: "interactive",
            description: "Select one or more channels.",
            options: [
              { label: "#general", value: "C01GENERAL" },
              { label: "#engineering", value: "C02ENGINEER" },
              { label: "#alerts", value: "C03ALERTS" },
            ],
          },
          {
            key: "signingSecret",
            label: "Signing Secret",
            type: "string",
            required: true,
            secret: true,
            setupFlow: "paste",
            placeholder: "Paste your Slack signing secret",
            description: "Found under Basic Information > App Credentials.",
          },
        ],
      },
      {
        id: "done",
        title: "Connection Complete",
        description: "Your Slack workspace is connected and ready to use.",
        fields: [],
      },
    ],
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Connect a Telegram bot created via BotFather.",
    icon: "Send",
    color: "#0088CC",
    connectionTest: {
      label: "Test Telegram Connection",
      endpoint: "/api/channels/telegram/test",
    },
    setup: [
      {
        id: "create-bot",
        title: "Create a Telegram Bot",
        description: "Use BotFather to create a new Telegram bot.",
        instruction:
          "Open Telegram, search for @BotFather, send /newbot, and follow the prompts to create your bot.",
        externalUrl: "https://t.me/BotFather",
        fields: [],
      },
      {
        id: "paste-token",
        title: "Enter Bot Token",
        description: "Paste the token that BotFather gave you.",
        fields: [
          {
            key: "botToken",
            label: "Bot Token",
            type: "string",
            required: true,
            secret: true,
            setupFlow: "paste",
            placeholder: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
            description: "The HTTP API token from BotFather.",
            validation: {
              pattern: "^[0-9]+:[A-Za-z0-9_-]+$",
              message: "Invalid Telegram bot token format",
            },
          },
        ],
      },
      {
        id: "done",
        title: "Connection Complete",
        description: "Your Telegram bot is configured and ready to use.",
        fields: [],
      },
    ],
  },
];

export function getManifest(pluginId: string): ChannelManifest | undefined {
  return channelManifests.find((m) => m.id === pluginId);
}
