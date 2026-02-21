import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("@/lib/api-config", () => ({
  API_BASE_URL: "http://localhost:3001/api",
  PLATFORM_BASE_URL: "http://localhost:3001",
}));

vi.mock("@/lib/fetch-utils", () => ({
  handleUnauthorized: vi.fn(() => {
    throw new Error("Unauthorized");
  }),
  UnauthorizedError: class extends Error {
    constructor(msg = "Session expired") {
      super(msg);
      this.name = "UnauthorizedError";
    }
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpcVanilla: {},
}));

import { validateElevenLabsKey } from "@/lib/api";

describe("validateElevenLabsKey", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("does NOT call elevenlabs.io directly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          provider: "elevenlabs",
          hasKey: true,
          maskedKey: null,
          createdAt: null,
          updatedAt: null,
        }),
    });

    await validateElevenLabsKey("test-key");

    for (const call of mockFetch.mock.calls) {
      const url = typeof call[0] === "string" ? call[0] : (call[0]?.toString?.() ?? "");
      expect(url).not.toContain("elevenlabs.io");
    }
  });

  it("routes validation through the platform backend", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          provider: "elevenlabs",
          hasKey: true,
          maskedKey: null,
          createdAt: null,
          updatedAt: null,
        }),
    });

    const result = await validateElevenLabsKey("test-key");
    expect(result.valid).toBe(true);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("localhost:3001/api/"),
      expect.anything(),
    );
  });

  it("returns invalid when backend call fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: () => Promise.resolve({}),
    });

    const result = await validateElevenLabsKey("bad-key");
    expect(result.valid).toBe(false);
    expect(result.message).toBeTruthy();
  });
});
