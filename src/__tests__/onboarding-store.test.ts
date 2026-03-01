import { beforeEach, describe, expect, it } from "vitest";
import type { OnboardingState } from "@/lib/onboarding-store";
import {
  AI_PROVIDERS,
  clearOnboardingState,
  ENHANCEMENT_PLUGINS,
  isOnboardingComplete,
  loadOnboardingState,
  markOnboardingComplete,
  saveOnboardingState,
} from "@/lib/onboarding-store";

describe("onboarding-store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("loadOnboardingState", () => {
    it("returns correct defaults when nothing is saved", () => {
      const state = loadOnboardingState();
      expect(state.currentStep).toBe(0);
      expect(state.providers).toEqual([]);
      expect(state.channels).toEqual([]);
      expect(state.channelsConfigured).toEqual([]);
      expect(state.channelConfigs).toEqual({});
      expect(state.plugins).toEqual(["memory"]);
      expect(state.instanceName).toBe("");
    });

    it("returns a fresh object each call (no shared reference)", () => {
      const a = loadOnboardingState();
      const b = loadOnboardingState();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });

    it("merges saved state over defaults", () => {
      localStorage.setItem(
        "wopr-onboarding",
        JSON.stringify({ currentStep: 3, instanceName: "my-bot" }),
      );
      const state = loadOnboardingState();
      expect(state.currentStep).toBe(3);
      expect(state.instanceName).toBe("my-bot");
      // Defaults still present for unsaved fields
      expect(state.plugins).toEqual(["memory"]);
      expect(state.providers).toEqual([]);
    });

    it("returns defaults when localStorage contains invalid JSON", () => {
      localStorage.setItem("wopr-onboarding", "not-json!!!");
      const state = loadOnboardingState();
      expect(state.currentStep).toBe(0);
      expect(state.plugins).toEqual(["memory"]);
    });
  });

  describe("saveOnboardingState", () => {
    it("persists state to localStorage", () => {
      const state: OnboardingState = {
        currentStep: 2,
        providers: [{ id: "anthropic", name: "Anthropic", key: "sk-ant-xxx", validated: true }],
        channels: ["discord"],
        channelsConfigured: ["discord"],
        channelConfigs: { discord: { token: "abc" } },
        plugins: ["memory", "voice"],
        instanceName: "test-bot",
      };
      saveOnboardingState(state);
      const raw = localStorage.getItem("wopr-onboarding");
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw ?? "null")).toEqual(state);
    });

    it("round-trips through load", () => {
      const state: OnboardingState = {
        currentStep: 4,
        providers: [],
        channels: ["slack"],
        channelsConfigured: [],
        channelConfigs: {},
        plugins: ["memory"],
        instanceName: "round-trip-bot",
      };
      saveOnboardingState(state);
      const loaded = loadOnboardingState();
      expect(loaded).toEqual(state);
    });
  });

  describe("clearOnboardingState", () => {
    it("removes saved state from localStorage", () => {
      saveOnboardingState({
        currentStep: 1,
        providers: [],
        channels: [],
        channelsConfigured: [],
        channelConfigs: {},
        plugins: ["memory"],
        instanceName: "",
      });
      expect(localStorage.getItem("wopr-onboarding")).not.toBeNull();
      clearOnboardingState();
      expect(localStorage.getItem("wopr-onboarding")).toBeNull();
    });

    it("load returns defaults after clear", () => {
      saveOnboardingState({
        currentStep: 5,
        providers: [],
        channels: ["telegram"],
        channelsConfigured: [],
        channelConfigs: {},
        plugins: ["memory", "web-search"],
        instanceName: "cleared-bot",
      });
      clearOnboardingState();
      const state = loadOnboardingState();
      expect(state.currentStep).toBe(0);
      expect(state.channels).toEqual([]);
      expect(state.instanceName).toBe("");
    });

    it("does not throw when nothing is saved", () => {
      expect(() => clearOnboardingState()).not.toThrow();
    });
  });

  describe("isOnboardingComplete", () => {
    it("returns false when not marked complete", () => {
      expect(isOnboardingComplete()).toBe(false);
    });

    it("returns true after markOnboardingComplete", () => {
      markOnboardingComplete();
      expect(isOnboardingComplete()).toBe(true);
    });

    it("returns false for non-'1' values", () => {
      localStorage.setItem("wopr-onboarding-complete", "yes");
      expect(isOnboardingComplete()).toBe(false);
    });
  });

  describe("markOnboardingComplete", () => {
    it("sets the completion flag in localStorage", () => {
      markOnboardingComplete();
      expect(localStorage.getItem("wopr-onboarding-complete")).toBe("1");
    });

    it("is idempotent", () => {
      markOnboardingComplete();
      markOnboardingComplete();
      expect(localStorage.getItem("wopr-onboarding-complete")).toBe("1");
    });
  });

  describe("completion flag is independent of onboarding state", () => {
    it("clearing state does not affect completion flag", () => {
      markOnboardingComplete();
      clearOnboardingState();
      expect(isOnboardingComplete()).toBe(true);
    });

    it("saving state does not affect completion flag", () => {
      markOnboardingComplete();
      saveOnboardingState({
        currentStep: 0,
        providers: [],
        channels: [],
        channelsConfigured: [],
        channelConfigs: {},
        plugins: ["memory"],
        instanceName: "",
      });
      expect(isOnboardingComplete()).toBe(true);
    });
  });

  describe("AI_PROVIDERS", () => {
    it("contains 5 providers", () => {
      expect(AI_PROVIDERS).toHaveLength(5);
    });

    it("includes anthropic, openai, google, xai, local", () => {
      const ids = AI_PROVIDERS.map((p) => p.id);
      expect(ids).toEqual(["anthropic", "openai", "google", "xai", "local"]);
    });

    it("anthropic is marked as recommended", () => {
      const anthropic = AI_PROVIDERS.find((p) => p.id === "anthropic");
      expect(anthropic?.recommended).toBe(true);
    });
  });

  describe("ENHANCEMENT_PLUGINS", () => {
    it("contains 6 plugins", () => {
      expect(ENHANCEMENT_PLUGINS).toHaveLength(6);
    });

    it("memory is recommended and does not require a key", () => {
      const memory = ENHANCEMENT_PLUGINS.find((p) => p.id === "memory");
      expect(memory?.recommended).toBe(true);
      expect(memory?.requiresKey).toBe(false);
    });

    it("web-search requires a key", () => {
      const webSearch = ENHANCEMENT_PLUGINS.find((p) => p.id === "web-search");
      expect(webSearch?.requiresKey).toBe(true);
    });
  });
});
