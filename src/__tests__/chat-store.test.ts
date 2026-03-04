import { beforeEach, describe, expect, it } from "vitest";
import {
  clearChatHistory,
  getSessionId,
  loadChatHistory,
  saveChatHistory,
} from "@/lib/chat/chat-store";
import type { ChatMessage } from "@/lib/chat/types";

describe("chat-store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getSessionId", () => {
    it("generates a session ID on first call", () => {
      const id = getSessionId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(10);
    });

    it("returns the same session ID on subsequent calls", () => {
      const id1 = getSessionId();
      const id2 = getSessionId();
      expect(id1).toBe(id2);
    });
  });

  describe("loadChatHistory / saveChatHistory", () => {
    it("returns empty array when no history saved", () => {
      expect(loadChatHistory()).toEqual([]);
    });

    it("round-trips messages through localStorage", () => {
      const messages: ChatMessage[] = [
        { id: "1", role: "user", content: "hello", timestamp: 1000 },
        { id: "2", role: "bot", content: "hi there", timestamp: 1001 },
      ];
      saveChatHistory(messages);
      expect(loadChatHistory()).toEqual(messages);
    });

    it("returns empty array when localStorage contains invalid JSON shape", () => {
      localStorage.setItem("wopr-chat-history", JSON.stringify([{ bad: "data" }]));
      expect(loadChatHistory()).toEqual([]);
    });

    it("returns empty array when localStorage contains non-array JSON", () => {
      localStorage.setItem("wopr-chat-history", JSON.stringify({ id: "1", role: "user" }));
      expect(loadChatHistory()).toEqual([]);
    });

    it("returns empty array when a message has an invalid role", () => {
      localStorage.setItem(
        "wopr-chat-history",
        JSON.stringify([{ id: "1", role: "admin", content: "hi", timestamp: 1000 }]),
      );
      expect(loadChatHistory()).toEqual([]);
    });

    it("returns empty array when a message is missing required fields", () => {
      localStorage.setItem("wopr-chat-history", JSON.stringify([{ id: "1", role: "user" }]));
      expect(loadChatHistory()).toEqual([]);
    });

    it("strips extra fields from valid messages", () => {
      localStorage.setItem(
        "wopr-chat-history",
        JSON.stringify([
          { id: "1", role: "user", content: "hi", timestamp: 1000, xss: "<script>" },
        ]),
      );
      const result = loadChatHistory();
      expect(result).toEqual([{ id: "1", role: "user", content: "hi", timestamp: 1000 }]);
      expect((result[0] as unknown as Record<string, unknown>).xss).toBeUndefined();
    });
  });

  describe("clearChatHistory", () => {
    it("removes saved history", () => {
      saveChatHistory([{ id: "1", role: "user", content: "hello", timestamp: 1000 }]);
      clearChatHistory();
      expect(loadChatHistory()).toEqual([]);
    });
  });
});
