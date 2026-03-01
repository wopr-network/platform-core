import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePluginRegistry } from "@/hooks/use-plugin-registry";

describe("usePluginRegistry", () => {
  it("returns all expected plugin categories", () => {
    const { result } = renderHook(() => usePluginRegistry());
    const categoryIds = result.current.categories.map((c) => c.id);
    expect(categoryIds).toEqual(["memory", "voice", "integration", "ui"]);
  });

  it("returns channel plugins (onboarding-only: signal, whatsapp, msteams; discord/slack/telegram are marketplace-sourced)", () => {
    const { result } = renderHook(() => usePluginRegistry());
    const channelIds = result.current.channels.map((c) => c.id);
    expect(channelIds).toContain("signal");
    expect(channelIds).toContain("whatsapp");
    expect(channelIds).toContain("msteams");
  });

  it("returns provider plugins", () => {
    const { result } = renderHook(() => usePluginRegistry());
    const providerIds = result.current.providers.map((p) => p.id);
    expect(providerIds).toContain("anthropic");
    expect(providerIds).toContain("openai");
    expect(providerIds).toContain("kimi");
    expect(providerIds).toContain("opencode");
  });

  it("returns superpowers", () => {
    const { result } = renderHook(() => usePluginRegistry());
    const superpowerIds = result.current.superpowers.map((s) => s.id);
    expect(superpowerIds).toContain("image-gen");
    expect(superpowerIds).toContain("voice");
    expect(superpowerIds).toContain("memory");
    expect(superpowerIds).toContain("search");
  });

  it("returns personalities", () => {
    const { result } = renderHook(() => usePluginRegistry());
    const personalityIds = result.current.personalities.map((p) => p.id);
    expect(personalityIds).toContain("helpful");
    expect(personalityIds).toContain("creative");
    expect(personalityIds).toContain("code");
    expect(personalityIds).toContain("custom");
  });

  it("returns presets", () => {
    const { result } = renderHook(() => usePluginRegistry());
    expect(result.current.presets).toHaveLength(6);
    const presetIds = result.current.presets.map((p) => p.id);
    expect(presetIds).toContain("discord-ai-bot");
    expect(presetIds).toContain("custom");
  });

  it("returns hero and additional models", () => {
    const { result } = renderHook(() => usePluginRegistry());
    expect(result.current.heroModels.length).toBeGreaterThan(0);
    expect(result.current.additionalModels.length).toBeGreaterThan(0);
    expect(result.current.allModels.length).toBe(
      result.current.heroModels.length + result.current.additionalModels.length,
    );
  });

  it("returns BYOK providers", () => {
    const { result } = renderHook(() => usePluginRegistry());
    const byokIds = result.current.byokProviders.map((p) => p.id);
    expect(byokIds).toContain("anthropic");
    expect(byokIds).toContain("openai");
    expect(byokIds).toContain("openrouter");
  });

  it("data shape matches what onboarding expects: channels have configFields", () => {
    const { result } = renderHook(() => usePluginRegistry());
    for (const channel of result.current.channels) {
      expect(channel).toHaveProperty("id");
      expect(channel).toHaveProperty("name");
      expect(channel).toHaveProperty("description");
      expect(channel).toHaveProperty("icon");
      expect(channel).toHaveProperty("color");
      expect(channel).toHaveProperty("capabilities");
      expect(channel).toHaveProperty("configFields");
      expect(Array.isArray(channel.configFields)).toBe(true);
    }
  });

  it("data shape matches what onboarding expects: superpowers have requiresKey", () => {
    const { result } = renderHook(() => usePluginRegistry());
    for (const sp of result.current.superpowers) {
      expect(sp).toHaveProperty("id");
      expect(sp).toHaveProperty("name");
      expect(sp).toHaveProperty("tagline");
      expect(sp).toHaveProperty("requiresKey");
      expect(sp).toHaveProperty("configFields");
    }
  });

  it("provides derived providerOptions as simple {value, label} list", () => {
    const { result } = renderHook(() => usePluginRegistry());
    expect(result.current.providerOptions.length).toBe(result.current.providers.length);
    for (const opt of result.current.providerOptions) {
      expect(opt).toHaveProperty("value");
      expect(opt).toHaveProperty("label");
      expect(typeof opt.value).toBe("string");
      expect(typeof opt.label).toBe("string");
    }
  });

  it("provides derived channelOptions as simple {value, label} list", () => {
    const { result } = renderHook(() => usePluginRegistry());
    expect(result.current.channelOptions.length).toBe(result.current.channels.length);
    for (const opt of result.current.channelOptions) {
      expect(opt).toHaveProperty("value");
      expect(opt).toHaveProperty("label");
    }
  });

  it("provides derived pluginOptions from all categories", () => {
    const { result } = renderHook(() => usePluginRegistry());
    const totalCategoryPlugins = result.current.categories.reduce(
      (sum, cat) => sum + cat.plugins.length,
      0,
    );
    expect(result.current.pluginOptions.length).toBe(totalCategoryPlugins);
  });

  it("exposes helper functions", () => {
    const { result } = renderHook(() => usePluginRegistry());
    expect(typeof result.current.getAllPlugins).toBe("function");
    expect(typeof result.current.getPluginById).toBe("function");
    expect(typeof result.current.collectConfigFields).toBe("function");
    expect(typeof result.current.resolveDependencies).toBe("function");
    expect(typeof result.current.validateField).toBe("function");
  });

  it("getAllPlugins returns combined channels, providers, and category plugins", () => {
    const { result } = renderHook(() => usePluginRegistry());
    const all = result.current.getAllPlugins();
    // signal is an onboarding-only channel in the static list; discord is marketplace-sourced
    expect(all.map((p) => p.id)).toContain("signal");
    expect(all.map((p) => p.id)).toContain("anthropic");
    expect(all.map((p) => p.id)).toContain("semantic-memory");
  });

  it("getPluginById finds plugins from any source", () => {
    const { result } = renderHook(() => usePluginRegistry());
    expect(result.current.getPluginById("signal")?.name).toBe("Signal");
    expect(result.current.getPluginById("anthropic")?.name).toBe("Anthropic");
    expect(result.current.getPluginById("nonexistent")).toBeUndefined();
  });

  it("validateField works through the hook", () => {
    const { result } = renderHook(() => usePluginRegistry());
    const field = {
      key: "test",
      label: "Test Key",
      secret: true,
    };
    expect(result.current.validateField(field, "")).toBe("Test Key is required");
    expect(result.current.validateField(field, "valid")).toBeNull();
  });

  it("returns stable references across re-renders", () => {
    const { result, rerender } = renderHook(() => usePluginRegistry());
    const first = result.current;
    rerender();
    const second = result.current;
    // The memoized registry should be the same object
    expect(first).toBe(second);
  });
});
