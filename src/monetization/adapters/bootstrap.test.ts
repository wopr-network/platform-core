import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapAdapters, bootstrapAdaptersFromEnv } from "./bootstrap.js";

describe("bootstrapAdapters", () => {
  it("creates all adapters when all keys provided", () => {
    const result = bootstrapAdapters({
      textGen: {
        deepseekApiKey: "sk-ds",
        geminiApiKey: "sk-gem",
        minimaxApiKey: "sk-mm",
        kimiApiKey: "sk-kimi",
        openrouterApiKey: "sk-or",
      },
      tts: {
        chatterboxBaseUrl: "http://chatterbox:8000",
        elevenlabsApiKey: "sk-el",
      },
      transcription: {
        deepgramApiKey: "sk-dg",
      },
      embeddings: {
        openrouterApiKey: "sk-or",
      },
    });

    // 5 text-gen + 2 TTS + 1 transcription + 1 embeddings = 9
    expect(result.adapters).toHaveLength(9);
    expect(result.summary.total).toBe(9);
    expect(result.summary.skipped).toBe(0);
  });

  it("allows duplicate provider names across capabilities", () => {
    const result = bootstrapAdapters({
      textGen: { openrouterApiKey: "sk-or" },
      embeddings: { openrouterApiKey: "sk-or" },
    });

    // OpenRouter appears twice — once for text-gen, once for embeddings
    const openrouters = result.adapters.filter((a) => a.name === "openrouter");
    expect(openrouters).toHaveLength(2);
    expect(result.summary.total).toBe(2);
  });

  it("returns correct per-capability counts", () => {
    const result = bootstrapAdapters({
      textGen: { deepseekApiKey: "sk-ds" },
      tts: { chatterboxBaseUrl: "http://chatterbox:8000" },
      transcription: { deepgramApiKey: "sk-dg" },
      embeddings: { openrouterApiKey: "sk-or" },
    });

    expect(result.summary.byCapability).toEqual({
      "text-generation": 1,
      tts: 1,
      transcription: 1,
      embeddings: 1,
    });
  });

  it("tracks skipped providers by capability", () => {
    const result = bootstrapAdapters({
      textGen: { deepseekApiKey: "sk-ds" },
      tts: {},
      transcription: {},
      embeddings: {},
    });

    expect(result.skipped.tts).toEqual(["chatterbox-tts", "elevenlabs"]);
    expect(result.skipped.transcription).toEqual(["deepgram"]);
    expect(result.skipped.embeddings).toEqual(["openrouter"]);
    expect(result.skipped["text-generation"]).toEqual(["gemini", "minimax", "kimi", "openrouter"]);
  });

  it("returns empty result when no config provided", () => {
    const result = bootstrapAdapters({});

    expect(result.adapters).toHaveLength(0);
    expect(result.summary.total).toBe(0);
    expect(result.summary.skipped).toBeGreaterThan(0);
  });

  it("omits capability from skipped when all providers created", () => {
    const result = bootstrapAdapters({
      transcription: { deepgramApiKey: "sk-dg" },
    });

    expect(result.skipped.transcription).toBeUndefined();
  });

  it("handles partial config — only text-gen", () => {
    const result = bootstrapAdapters({
      textGen: { openrouterApiKey: "sk-or" },
    });

    expect(result.summary.byCapability["text-generation"]).toBe(1);
    expect(result.summary.byCapability.tts).toBe(0);
    expect(result.summary.byCapability.transcription).toBe(0);
    expect(result.summary.byCapability.embeddings).toBe(0);
  });

  it("passes per-adapter overrides through", () => {
    const result = bootstrapAdapters({
      textGen: {
        deepseekApiKey: "sk-ds",
        deepseek: { marginMultiplier: 1.5 },
      },
    });

    expect(result.adapters).toHaveLength(1);
    expect(result.adapters[0].name).toBe("deepseek");
  });
});

describe("bootstrapAdaptersFromEnv", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("reads all keys from environment variables", () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "env-ds");
    vi.stubEnv("GEMINI_API_KEY", "env-gem");
    vi.stubEnv("MINIMAX_API_KEY", "env-mm");
    vi.stubEnv("KIMI_API_KEY", "env-kimi");
    vi.stubEnv("OPENROUTER_API_KEY", "env-or");
    vi.stubEnv("CHATTERBOX_BASE_URL", "http://chatterbox:8000");
    vi.stubEnv("ELEVENLABS_API_KEY", "env-el");
    vi.stubEnv("DEEPGRAM_API_KEY", "env-dg");

    const result = bootstrapAdaptersFromEnv();

    // 5 text-gen + 2 TTS + 1 transcription + 1 embeddings = 9
    expect(result.adapters).toHaveLength(9);
    expect(result.summary.total).toBe(9);
  });

  it("returns empty when no env vars set", () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("MINIMAX_API_KEY", "");
    vi.stubEnv("KIMI_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("CHATTERBOX_BASE_URL", "");
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    vi.stubEnv("DEEPGRAM_API_KEY", "");

    const result = bootstrapAdaptersFromEnv();

    expect(result.adapters).toHaveLength(0);
    expect(result.summary.skipped).toBeGreaterThan(0);
  });

  it("accepts per-capability overrides", () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "env-ds");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("MINIMAX_API_KEY", "");
    vi.stubEnv("KIMI_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("CHATTERBOX_BASE_URL", "");
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    vi.stubEnv("DEEPGRAM_API_KEY", "");

    const result = bootstrapAdaptersFromEnv({
      textGen: { deepseek: { marginMultiplier: 2.0 } },
    });

    expect(result.adapters).toHaveLength(1);
    expect(result.adapters[0].name).toBe("deepseek");
  });
});
