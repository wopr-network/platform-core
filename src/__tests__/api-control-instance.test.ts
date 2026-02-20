import { afterEach, describe, expect, it, vi } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({}),
});
vi.stubGlobal("fetch", mockFetch);

// Mock api-config
vi.mock("@/lib/api-config", () => ({
  API_BASE_URL: "https://api.test/api",
  PLATFORM_BASE_URL: "https://api.test",
}));

describe("controlInstance HTTP behavior", () => {
  afterEach(() => {
    mockFetch.mockClear();
  });

  it("sends DELETE /fleet/bots/:id for destroy action", async () => {
    const { controlInstance } = await import("@/lib/api");
    await controlInstance("bot-123", "destroy");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test/fleet/bots/bot-123",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("sends POST /fleet/bots/:id/start for start action", async () => {
    const { controlInstance } = await import("@/lib/api");
    await controlInstance("bot-123", "start");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test/fleet/bots/bot-123/start",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends POST /fleet/bots/:id/stop for stop action", async () => {
    const { controlInstance } = await import("@/lib/api");
    await controlInstance("bot-123", "stop");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test/fleet/bots/bot-123/stop",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends POST /fleet/bots/:id/restart for restart action", async () => {
    const { controlInstance } = await import("@/lib/api");
    await controlInstance("bot-123", "restart");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test/fleet/bots/bot-123/restart",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
