"use client";

import { createContext, type ReactNode, useContext, useEffect } from "react";
import type { ChatActions, ChatMessage, ChatMode } from "./types";
import { useChat } from "./use-chat";

interface ChatContextValue extends ChatActions {
  messages: ChatMessage[];
  mode: ChatMode;
  isConnected: boolean;
  isTyping: boolean;
  hasUnread: boolean;
  sessionId: string;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const chat = useChat();

  // Listen for WebMCP tool call events from the SSE stream
  const { expand, collapse, fullscreen, sendMessage, showTyping, notify } = chat;
  useEffect(() => {
    function handleToolCall(e: Event) {
      const { tool, args } = (e as CustomEvent).detail;
      if (tool === "chat.expand") expand();
      else if (tool === "chat.collapse") collapse();
      else if (tool === "chat.fullscreen") fullscreen();
      else if (tool === "chat.sendMessage") sendMessage(args.text as string);
      else if (tool === "chat.showTyping") {
        showTyping();
      } else if (tool === "chat.notify") {
        notify(args.text as string);
      }
    }
    window.addEventListener("wopr-chat-tool-call", handleToolCall);
    return () => window.removeEventListener("wopr-chat-tool-call", handleToolCall);
  }, [expand, collapse, fullscreen, sendMessage, showTyping, notify]);

  return (
    <ChatContext.Provider
      value={{
        messages: chat.messages,
        mode: chat.mode,
        isConnected: chat.isConnected,
        isTyping: chat.isTyping,
        hasUnread: chat.hasUnread,
        sessionId: chat.sessionId,
        expand: chat.expand,
        collapse: chat.collapse,
        fullscreen: chat.fullscreen,
        sendMessage: chat.sendMessage,
        addEventMarker: chat.addEventMarker,
        showTyping: chat.showTyping,
        notify: chat.notify,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}
