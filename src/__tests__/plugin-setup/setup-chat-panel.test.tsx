import { describe, expect, it } from "vitest";
import { platformUIToolDefinitions } from "@/lib/plugin/tool-definitions";

describe("setup tool definitions", () => {
  it("includes setup.begin tool", () => {
    const tool = platformUIToolDefinitions.find((t) => t.name === "setup.begin");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema).toHaveProperty("required");
  });

  it("includes setup.ask tool", () => {
    const tool = platformUIToolDefinitions.find((t) => t.name === "setup.ask");
    expect(tool).toBeDefined();
  });

  it("includes setup.validateKey tool", () => {
    const tool = platformUIToolDefinitions.find((t) => t.name === "setup.validateKey");
    expect(tool).toBeDefined();
  });

  it("includes setup.saveConfig tool", () => {
    const tool = platformUIToolDefinitions.find((t) => t.name === "setup.saveConfig");
    expect(tool).toBeDefined();
  });

  it("includes setup.complete tool", () => {
    const tool = platformUIToolDefinitions.find((t) => t.name === "setup.complete");
    expect(tool).toBeDefined();
  });

  it("includes setup.rollback tool", () => {
    const tool = platformUIToolDefinitions.find((t) => t.name === "setup.rollback");
    expect(tool).toBeDefined();
  });
});
