import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatMessage as ChatMessageType, ChatMode } from "@/lib/chat/types";

// ChatPanel uses scrollIntoView for auto-scroll; jsdom doesn't implement it
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

const mockContext: {
  messages: ChatMessageType[];
  mode: ChatMode;
  isConnected: boolean;
  isTyping: boolean;
  hasUnread: boolean;
  sessionId: string;
  expand: ReturnType<typeof vi.fn>;
  collapse: ReturnType<typeof vi.fn>;
  fullscreen: ReturnType<typeof vi.fn>;
  sendMessage: ReturnType<typeof vi.fn>;
  addEventMarker: ReturnType<typeof vi.fn>;
  showTyping: ReturnType<typeof vi.fn>;
  notify: ReturnType<typeof vi.fn>;
} = {
  messages: [],
  mode: "collapsed",
  isConnected: true,
  isTyping: false,
  hasUnread: false,
  sessionId: "test-session",
  expand: vi.fn(),
  collapse: vi.fn(),
  fullscreen: vi.fn(),
  sendMessage: vi.fn(),
  addEventMarker: vi.fn(),
  showTyping: vi.fn(),
  notify: vi.fn(),
};

vi.mock("@/lib/chat/chat-context", () => ({
  useChatContext: () => mockContext,
}));

// Import AFTER mock is defined
import { ChatWidget } from "@/components/chat/chat-widget";

describe("ChatWidget", () => {
  beforeEach(() => {
    mockContext.messages = [];
    mockContext.mode = "collapsed";
    mockContext.isConnected = true;
    mockContext.isTyping = false;
    mockContext.hasUnread = false;
    mockContext.sessionId = "test-session";
    mockContext.expand.mockReset();
    mockContext.collapse.mockReset();
    mockContext.fullscreen.mockReset();
    mockContext.sendMessage.mockReset();
    mockContext.addEventMarker.mockReset();
    mockContext.showTyping.mockReset();
    mockContext.notify.mockReset();
  });

  it("shows ambient dot in collapsed mode", () => {
    mockContext.mode = "collapsed";
    render(<ChatWidget />);
    expect(screen.getByTestId("chat-ambient-dot")).toBeInTheDocument();
  });

  it("shows chat panel in expanded mode", () => {
    mockContext.mode = "expanded";
    render(<ChatWidget />);
    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("chat-ambient-dot")).not.toBeInTheDocument();
  });

  it("shows fullscreen panel in fullscreen mode", () => {
    mockContext.mode = "fullscreen";
    render(<ChatWidget />);
    expect(screen.getByTestId("chat-fullscreen")).toBeInTheDocument();
  });

  it("calls expand when ambient dot is clicked", async () => {
    const user = userEvent.setup();
    mockContext.mode = "collapsed";
    mockContext.expand.mockClear();
    render(<ChatWidget />);

    await user.click(screen.getByTestId("chat-ambient-dot"));
    expect(mockContext.expand).toHaveBeenCalledOnce();
  });

  it("calls collapse when close button is clicked in expanded mode", async () => {
    const user = userEvent.setup();
    mockContext.mode = "expanded";
    mockContext.collapse.mockClear();
    render(<ChatWidget />);

    await user.click(screen.getByLabelText("Close chat"));
    expect(mockContext.collapse).toHaveBeenCalledOnce();
  });

  it("passes hasUnread to ambient dot", () => {
    mockContext.hasUnread = true;
    render(<ChatWidget />);
    expect(screen.getByTestId("chat-unread-pulse")).toBeInTheDocument();
  });
});
