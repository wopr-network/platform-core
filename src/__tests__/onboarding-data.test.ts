import { describe, expect, it } from "vitest";
import {
  channelPlugins,
  collectConfigFields,
  getAllPlugins,
  getPluginById,
  pluginCategories,
  presets,
  providerPlugins,
  resolveDependencies,
  validateField,
} from "@/lib/onboarding-data";

describe("onboarding-data", () => {
  describe("channelPlugins", () => {
    it("includes Discord, Slack, Telegram, Signal, WhatsApp, MS Teams", () => {
      const ids = channelPlugins.map((p) => p.id);
      expect(ids).toContain("discord");
      expect(ids).toContain("slack");
      expect(ids).toContain("telegram");
      expect(ids).toContain("signal");
      expect(ids).toContain("whatsapp");
      expect(ids).toContain("msteams");
    });

    it("all channels have capabilities including 'channel'", () => {
      for (const ch of channelPlugins) {
        expect(ch.capabilities).toContain("channel");
      }
    });

    it("Discord has bot token and guild ID config fields", () => {
      const discord = channelPlugins.find((p) => p.id === "discord");
      expect(discord).toBeDefined();
      const keys = discord?.configFields.map((f) => f.key);
      expect(keys).toContain("discord_bot_token");
      expect(keys).toContain("discord_guild_id");
    });

    it("Discord bot token is marked as secret", () => {
      const discord = channelPlugins.find((p) => p.id === "discord");
      const tokenField = discord?.configFields.find((f) => f.key === "discord_bot_token");
      expect(tokenField?.secret).toBe(true);
    });
  });

  describe("providerPlugins", () => {
    it("includes Anthropic, OpenAI, Kimi, OpenCode", () => {
      const ids = providerPlugins.map((p) => p.id);
      expect(ids).toContain("anthropic");
      expect(ids).toContain("openai");
      expect(ids).toContain("kimi");
      expect(ids).toContain("opencode");
    });

    it("all providers have capabilities including 'provider'", () => {
      for (const p of providerPlugins) {
        expect(p.capabilities).toContain("provider");
      }
    });

    it("Anthropic key validation requires sk-ant- prefix", () => {
      const anthropic = providerPlugins.find((p) => p.id === "anthropic");
      const keyField = anthropic?.configFields[0];
      expect(keyField).toBeDefined();
      expect(keyField?.validation?.pattern).toBe("^sk-ant-");
    });
  });

  describe("pluginCategories", () => {
    it("has memory, voice, integration, and ui categories", () => {
      const ids = pluginCategories.map((c) => c.id);
      expect(ids).toEqual(["memory", "voice", "integration", "ui"]);
    });

    it("voice category includes ElevenLabs TTS and Deepgram STT", () => {
      const voice = pluginCategories.find((c) => c.id === "voice");
      const ids = voice?.plugins.map((p) => p.id);
      expect(ids).toContain("elevenlabs-tts");
      expect(ids).toContain("deepgram-stt");
    });

    it("discord-voice requires discord", () => {
      const voice = pluginCategories.find((c) => c.id === "voice");
      const discordVoice = voice?.plugins.find((p) => p.id === "discord-voice");
      expect(discordVoice?.requires).toContain("discord");
    });
  });

  describe("presets", () => {
    it("has 6 presets", () => {
      expect(presets).toHaveLength(6);
    });

    it("discord-ai-bot preset selects discord + anthropic + memory", () => {
      const preset = presets.find((p) => p.id === "discord-ai-bot");
      expect(preset).toBeDefined();
      expect(preset?.channels).toEqual(["discord"]);
      expect(preset?.providers).toEqual(["anthropic"]);
      expect(preset?.plugins).toEqual(["semantic-memory"]);
      expect(preset?.keyCount).toBe(2);
    });

    it("custom preset has empty selections", () => {
      const custom = presets.find((p) => p.id === "custom");
      expect(custom).toBeDefined();
      expect(custom?.channels).toEqual([]);
      expect(custom?.providers).toEqual([]);
      expect(custom?.plugins).toEqual([]);
    });

    it("voice-enabled preset includes voice plugins", () => {
      const preset = presets.find((p) => p.id === "voice-enabled");
      expect(preset?.plugins).toContain("elevenlabs-tts");
      expect(preset?.plugins).toContain("deepgram-stt");
      expect(preset?.plugins).toContain("discord-voice");
    });
  });

  describe("getAllPlugins", () => {
    it("returns all plugins from all categories", () => {
      const all = getAllPlugins();
      expect(all.length).toBeGreaterThan(10);
      // Should include channels, providers, and optional plugins
      expect(all.find((p) => p.id === "discord")).toBeDefined();
      expect(all.find((p) => p.id === "anthropic")).toBeDefined();
      expect(all.find((p) => p.id === "semantic-memory")).toBeDefined();
    });
  });

  describe("getPluginById", () => {
    it("returns a plugin by id", () => {
      const discord = getPluginById("discord");
      expect(discord).toBeDefined();
      expect(discord?.name).toBe("Discord");
    });

    it("returns undefined for unknown id", () => {
      expect(getPluginById("nonexistent")).toBeUndefined();
    });
  });

  describe("collectConfigFields", () => {
    it("collects fields from selected channels, providers, and plugins", () => {
      const fields = collectConfigFields(["discord"], ["anthropic"], ["elevenlabs-tts"]);
      const keys = fields.map((f) => f.key);
      expect(keys).toContain("discord_bot_token");
      expect(keys).toContain("discord_guild_id");
      expect(keys).toContain("anthropic_api_key");
      expect(keys).toContain("elevenlabs_api_key");
    });

    it("deduplicates fields by key", () => {
      const fields = collectConfigFields(["discord", "discord"], ["anthropic"], []);
      const tokenFields = fields.filter((f) => f.key === "discord_bot_token");
      expect(tokenFields).toHaveLength(1);
    });

    it("returns empty array for no selections", () => {
      const fields = collectConfigFields([], [], []);
      expect(fields).toHaveLength(0);
    });

    it("handles plugins with no config fields", () => {
      const fields = collectConfigFields([], [], ["semantic-memory"]);
      expect(fields).toHaveLength(0);
    });
  });

  describe("resolveDependencies", () => {
    it("returns selected plugins when no dependencies needed", () => {
      const resolved = resolveDependencies(["discord"], ["anthropic"], ["semantic-memory"]);
      expect(resolved).toContain("semantic-memory");
    });

    it("does not duplicate existing channel/provider when resolving requires", () => {
      // discord-voice requires discord, but discord is already in channels
      const resolved = resolveDependencies(["discord"], ["anthropic"], ["discord-voice"]);
      expect(resolved).toContain("discord-voice");
      // discord should NOT be added as a plugin since it is already a channel
      const discordCount = resolved.filter((id) => id === "discord").length;
      expect(discordCount).toBe(0);
    });

    it("adds dependency as plugin if not in channels or providers", () => {
      // discord-voice requires discord, but discord is NOT selected
      const resolved = resolveDependencies([], ["anthropic"], ["discord-voice"]);
      expect(resolved).toContain("discord-voice");
      expect(resolved).toContain("discord");
    });
  });

  describe("validateField", () => {
    it("returns error for empty value", () => {
      const field = {
        key: "test",
        label: "Test Key",
        secret: true,
      };
      expect(validateField(field, "")).toBe("Test Key is required");
      expect(validateField(field, "   ")).toBe("Test Key is required");
    });

    it("returns null for valid value without pattern", () => {
      const field = {
        key: "test",
        label: "Test Key",
        secret: true,
      };
      expect(validateField(field, "some-value")).toBeNull();
    });

    it("validates against pattern", () => {
      const field = {
        key: "anthropic_api_key",
        label: "Anthropic API Key",
        secret: true,
        validation: { pattern: "^sk-ant-", message: "Must start with sk-ant-" },
      };
      expect(validateField(field, "sk-ant-abc123")).toBeNull();
      expect(validateField(field, "sk-wrong")).toBe("Must start with sk-ant-");
    });

    it("returns validation message for invalid pattern", () => {
      const field = {
        key: "telegram_bot_token",
        label: "Telegram Bot Token",
        secret: true,
        validation: { pattern: "^[0-9]+:[A-Za-z0-9_-]+$", message: "Invalid Telegram token" },
      };
      expect(validateField(field, "123:ABC_def")).toBeNull();
      expect(validateField(field, "invalid token!")).toBe("Invalid Telegram token");
    });
  });
});
