"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/api-config";
import { clearChatHistory, getSessionId, loadChatHistory, saveChatHistory } from "./chat-store";
import type { ChatEvent, ChatMessage, ChatMode } from "./types";

interface UseChatReturn {
  messages: ChatMessage[];
  mode: ChatMode;
  isConnected: boolean;
  isTyping: boolean;
  hasUnread: boolean;
  sessionId: string;
  sendMessage: (text: string) => void;
  addEventMarker: (text: string) => void;
  expand: () => void;
  collapse: () => void;
  fullscreen: () => void;
  clearHistory: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatHistory());
  const [mode, setMode] = useState<ChatMode>("collapsed");
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const sessionId = useRef(getSessionId());
  const eventSourceRef = useRef<EventSource | null>(null);
  const pendingBotMsgRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);

  // Persist messages on change
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const connectSSE = useCallback(() => {
    if (typeof window === "undefined") return;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${API_BASE_URL}/chat/stream?sessionId=${encodeURIComponent(sessionId.current)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      reconnectDelayRef.current = 1000;
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ChatEvent;

        if (data.type === "text") {
          setIsTyping(true);
          if (pendingBotMsgRef.current === null) {
            pendingBotMsgRef.current = crypto.randomUUID();
          }
          const msgId = pendingBotMsgRef.current;
          setMessages((prev) => {
            const existing = prev.find((m) => m.id === msgId);
            if (existing) {
              return prev.map((m) =>
                m.id === msgId ? { ...m, content: m.content + data.delta } : m,
              );
            }
            return [
              ...prev,
              { id: msgId, role: "bot" as const, content: data.delta, timestamp: Date.now() },
            ];
          });
        } else if (data.type === "tool_call") {
          // Dispatch tool call as CustomEvent for WebMCP bridge
          window.dispatchEvent(
            new CustomEvent("wopr-chat-tool-call", {
              detail: { tool: data.tool, args: data.args },
            }),
          );
        } else if (data.type === "done") {
          setIsTyping(false);
          pendingBotMsgRef.current = null;
          setHasUnread(true);
        } else if (data.type === "error") {
          setIsTyping(false);
          pendingBotMsgRef.current = null;
          addMessage({
            id: crypto.randomUUID(),
            role: "bot",
            content: `Error: ${data.message}`,
            timestamp: Date.now(),
          });
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      eventSourceRef.current = null;

      // Reconnect with exponential backoff
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(delay * 2, 10000);
      reconnectTimeoutRef.current = setTimeout(connectSSE, delay);
    };
  }, [addMessage]);

  // Connect on mount
  useEffect(() => {
    connectSSE();
    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectSSE]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };
      addMessage(userMsg);
      setIsTyping(true);

      // POST to chat API
      fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId.current, message: trimmed }),
      }).catch(() => {
        setIsTyping(false);
      });
    },
    [addMessage],
  );

  const addEventMarker = useCallback(
    (text: string) => {
      addMessage({
        id: crypto.randomUUID(),
        role: "event",
        content: text,
        timestamp: Date.now(),
      });
    },
    [addMessage],
  );

  const expand = useCallback(() => {
    setMode("expanded");
    setHasUnread(false);
  }, []);

  const collapse = useCallback(() => {
    setMode("collapsed");
  }, []);

  const fullscreen = useCallback(() => {
    setMode("fullscreen");
    setHasUnread(false);
  }, []);

  const clearHistoryFn = useCallback(() => {
    setMessages([]);
    clearChatHistory();
  }, []);

  return {
    messages,
    mode,
    isConnected,
    isTyping,
    hasUnread,
    sessionId: sessionId.current,
    sendMessage,
    addEventMarker,
    expand,
    collapse,
    fullscreen,
    clearHistory: clearHistoryFn,
  };
}
