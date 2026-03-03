"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, apiFetchRaw } from "@/lib/api";
import type { ChatMessage } from "@/lib/chat/types";

interface PluginSetupState {
  isOpen: boolean;
  pluginId: string | null;
  pluginName: string | null;
  messages: ChatMessage[];
  isConnected: boolean;
  isTyping: boolean;
  isComplete: boolean;
}

export interface UsePluginSetupChatReturn {
  state: PluginSetupState;
  openSetup: (pluginId: string, pluginName: string, botId: string) => void;
  closeSetup: () => void;
  sendMessage: (text: string) => void;
}

const initialState: PluginSetupState = {
  isOpen: false,
  pluginId: null,
  pluginName: null,
  messages: [],
  isConnected: false,
  isTyping: false,
  isComplete: false,
};

type SseEvent =
  | { type: "text"; delta: string }
  | { type: "tool_call"; tool: string; args: Record<string, unknown> }
  | { type: "typing" };

export function usePluginSetupChat(
  onComplete?: (pluginId: string) => void,
): UsePluginSetupChatReturn {
  const [state, setState] = useState<PluginSetupState>(initialState);
  const abortRef = useRef<AbortController | null>(null);
  const botIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const openSetup = useCallback(
    (pluginId: string, pluginName: string, botId: string) => {
      abortRef.current?.abort();

      botIdRef.current = botId;
      setState({
        isOpen: true,
        pluginId,
        pluginName,
        messages: [],
        isConnected: false,
        isTyping: false,
        isComplete: false,
      });

      const controller = new AbortController();
      abortRef.current = controller;

      const sessionId = crypto.randomUUID();
      sessionIdRef.current = sessionId;

      const params = new URLSearchParams({ pluginId, botId, sessionId });

      apiFetchRaw(`/chat/setup?${params.toString()}`, { signal: controller.signal })
        .then(async (res) => {
          if (!res.body) {
            setState((s) => ({ ...s, isConnected: false }));
            return;
          }
          setState((s) => ({ ...s, isConnected: true }));
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              setState((s) => ({ ...s, isTyping: false }));
              break;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const raw = line.slice(5).trimStart();
              if (!raw || raw === "[DONE]") continue;

              try {
                const event = JSON.parse(raw) as SseEvent;

                if (event.type === "text") {
                  setState((s) => {
                    const last = s.messages[s.messages.length - 1];
                    if (last?.role === "bot") {
                      const updated = [...s.messages];
                      updated[updated.length - 1] = {
                        ...last,
                        content: last.content + event.delta,
                      };
                      return { ...s, messages: updated, isTyping: false };
                    }
                    return {
                      ...s,
                      isTyping: false,
                      messages: [
                        ...s.messages,
                        {
                          id: crypto.randomUUID(),
                          role: "bot" as const,
                          content: event.delta,
                          timestamp: Date.now(),
                        },
                      ],
                    };
                  });
                } else if (event.type === "tool_call" && event.tool === "setup.complete") {
                  setState((s) => ({ ...s, isComplete: true }));
                  onComplete?.(pluginId);
                } else if (event.type === "tool_call" && event.tool === "setup.rollback") {
                  const reason =
                    typeof event.args?.reason === "string" ? event.args.reason : "Setup failed";
                  setState((s) => ({
                    ...s,
                    messages: [
                      ...s.messages,
                      {
                        id: crypto.randomUUID(),
                        role: "event" as const,
                        content: reason,
                        timestamp: Date.now(),
                      },
                    ],
                  }));
                } else if (event.type === "typing") {
                  setState((s) => ({ ...s, isTyping: true }));
                }
              } catch {
                // Ignore malformed SSE lines
              }
            }
          }
        })
        .catch(() => {
          // AbortError is expected on close — ignore
          setState((s) => ({ ...s, isTyping: false }));
        });
    },
    [onComplete],
  );

  const closeSetup = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    botIdRef.current = null;
    setState(initialState);
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      const currentPluginId = state.pluginId;
      const currentBotId = botIdRef.current;
      if (!currentPluginId || !currentBotId) return;

      setState((s) => ({
        ...s,
        messages: [
          ...s.messages,
          {
            id: crypto.randomUUID(),
            role: "user" as const,
            content: text,
            timestamp: Date.now(),
          },
        ],
      }));

      apiFetch<void>("/chat/setup/message", {
        method: "POST",
        body: JSON.stringify({
          pluginId: currentPluginId,
          botId: currentBotId,
          sessionId: sessionIdRef.current,
          text,
        }),
      }).catch(() => {
        // Message send failure — bot will not respond, user can retry
      });
    },
    [state.pluginId],
  );

  return { state, openSetup, closeSetup, sendMessage };
}
