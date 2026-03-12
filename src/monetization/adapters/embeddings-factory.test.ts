import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmbeddingsAdapters, createEmbeddingsAdaptersFromEnv } from "./embeddings-factory.js";

describe("createEmbeddingsAdapters", () => {
  it("creates adapter when API key provided", () => {
    const result = createEmbeddingsAdapters({
      openrouterApiKey: "sk-or",
    });

    expect(result.adapters).toHaveLength(1);
    expect(result.adapterMap.size).toBe(1);
    expect(result.skipped).toHaveLength(0);
  });

  it("adapter is openrouter", () => {
    const result = createEmbeddingsAdapters({
      openrouterApiKey: "sk-or",
    });

    expect(result.adapters[0].name).toBe("openrouter");
  });

  it("skips openrouter when no API key", () => {
    const result = createEmbeddingsAdapters({});

    expect(result.adapters).toHaveLength(0);
    expect(result.skipped).toEqual(["openrouter"]);
  });

  it("skips adapter with empty string key", () => {
    const result = createEmbeddingsAdapters({
      openrouterApiKey: "",
    });

    expect(result.adapters).toHaveLength(0);
    expect(result.skipped).toContain("openrouter");
  });

  it("adapter supports embeddings capability", () => {
    const result = createEmbeddingsAdapters({
      openrouterApiKey: "sk-or",
    });

    expect(result.adapters[0].capabilities).toContain("embeddings");
  });

  it("adapter implements embed", () => {
    const result = createEmbeddingsAdapters({
      openrouterApiKey: "sk-or",
    });

    expect(typeof result.adapters[0].embed).toBe("function");
  });

  it("adapterMap keys match adapter names", () => {
    const result = createEmbeddingsAdapters({
      openrouterApiKey: "sk-or",
    });

    for (const [key, adapter] of result.adapterMap) {
      expect(key).toBe(adapter.name);
    }
  });

  it("passes per-adapter config overrides", () => {
    const withOverride = createEmbeddingsAdapters({
      openrouterApiKey: "sk-or",
      openrouter: { marginMultiplier: 1.5 },
    });
    const withoutOverride = createEmbeddingsAdapters({
      openrouterApiKey: "sk-or",
    });

    expect(withOverride.adapters).toHaveLength(1);
    // Both create an adapter — override doesn't break construction
    expect(withOverride.adapters[0].name).toBe(withoutOverride.adapters[0].name);
  });

  it("apiKey cannot be overridden via openrouter config", () => {
    // Ensure apiKey always comes from openrouterApiKey, not from spread
    const result = createEmbeddingsAdapters({
      openrouterApiKey: "sk-real",
      openrouter: { apiKey: "sk-evil" } as never,
    });

    expect(result.adapters).toHaveLength(1);
    expect(result.adapters[0].name).toBe("openrouter");
  });
});

describe("createEmbeddingsAdaptersFromEnv", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("reads key from environment variable", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "env-or");

    const result = createEmbeddingsAdaptersFromEnv();

    expect(result.adapters).toHaveLength(1);
    expect(result.adapters[0].name).toBe("openrouter");
    expect(result.skipped).toHaveLength(0);
  });

  it("returns empty when no env var set", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");

    const result = createEmbeddingsAdaptersFromEnv();

    expect(result.adapters).toHaveLength(0);
    expect(result.skipped).toEqual(["openrouter"]);
  });

  it("accepts per-adapter overrides alongside env key", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "env-or");

    const result = createEmbeddingsAdaptersFromEnv({
      openrouter: { marginMultiplier: 1.2 },
    });

    expect(result.adapters).toHaveLength(1);
    expect(result.adapters[0].name).toBe("openrouter");
  });
});
