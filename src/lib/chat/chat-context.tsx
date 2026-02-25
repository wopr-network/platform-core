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
  useEffect(() => {
    function handleToolCall(e: Event) {
      const { tool, args } = (e as CustomEvent).detail;
      if (tool === "chat.expand") chat.expand();
      else if (tool === "chat.collapse") chat.collapse();
      else if (tool === "chat.fullscreen") chat.fullscreen();
      else if (tool === "chat.sendMessage") chat.sendMessage(args.text as string);
      else if (tool === "chat.showTyping") {
        // Typing is handled by SSE stream, but bot can force it
      } else if (tool === "chat.notify") {
        // For v1, expand and show the message
        chat.expand();
      }
    }
    window.addEventListener("wopr-chat-tool-call", handleToolCall);
    return () => window.removeEventListener("wopr-chat-tool-call", handleToolCall);
  }, [chat]);

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
