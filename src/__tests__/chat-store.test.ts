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
  });

  describe("clearChatHistory", () => {
    it("removes saved history", () => {
      saveChatHistory([{ id: "1", role: "user", content: "hello", timestamp: 1000 }]);
      clearChatHistory();
      expect(loadChatHistory()).toEqual([]);
    });
  });
});
