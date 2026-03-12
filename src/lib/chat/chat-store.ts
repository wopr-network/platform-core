import { z } from "zod";
import { storageKey } from "../brand-config";
import type { ChatMessage } from "./types";

const HISTORY_KEY = storageKey("chat-history");
const SESSION_KEY = storageKey("chat-session");

const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "bot", "event"]),
  content: z.string(),
  timestamp: z.number(),
});

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    // localStorage blocked (private browsing) — use ephemeral session ID
    return crypto.randomUUID();
  }
}

export function loadChatHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : [];
    return arr.flatMap((item) => {
      const result = ChatMessageSchema.safeParse(item);
      return result.success ? [result.data] : [];
    });
  } catch {
    // ignore — malformed JSON
  }
  return [];
}

export function saveChatHistory(messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
  } catch {
    // ignore
  }
}

export function clearChatHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}
