import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Assistant } from "./Assistant";
import { ClientStorage } from "@/lib/clientStorage";

// Mock useToast
const mockShowToast = vi.fn();
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    showToast: mockShowToast,
    dismissToast: vi.fn(),
  }),
}));

// Mock ClientStorage
vi.mock("@/lib/clientStorage", () => ({
  ClientStorage: {
    getAssistantMessages: vi.fn().mockResolvedValue([]),
    saveAssistantMessages: vi.fn().mockResolvedValue(undefined),
    clearAssistantMessages: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock ai/react
let mockMessages: Array<{ id: string; role: "user" | "assistant"; content: string }> = [];
const mockSetMessages = vi.fn((msgs) => {
  mockMessages = typeof msgs === "function" ? msgs(mockMessages) : msgs;
});
const mockStop = vi.fn();

vi.mock("ai/react", () => ({
  useChat: () => ({
    messages: mockMessages,
    input: "",
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    isLoading: false,
    append: vi.fn(),
    setMessages: mockSetMessages,
    stop: mockStop,
  }),
}));

describe("Assistant Clear Chat Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMessages = [];
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders clear button as disabled when there are no messages", () => {
    render(<Assistant isOpen={true} onClose={vi.fn()} />);

    const clearButton = screen.getByRole("button", { name: /clear chat history/i }) as HTMLButtonElement;
    expect(clearButton).toBeDefined();
    expect(clearButton.disabled).toBe(true);
  });

  it("renders clear button as enabled when messages exist", () => {
    mockMessages = [
      { id: "1", role: "user", content: "Hello" },
      { id: "2", role: "assistant", content: "Hi there!" },
    ];

    render(<Assistant isOpen={true} onClose={vi.fn()} />);

    const clearButton = screen.getByRole("button", { name: /clear chat history/i }) as HTMLButtonElement;
    expect(clearButton.disabled).toBe(false);
  });

  it("opens confirmation modal when clicking clear button", async () => {
    mockMessages = [{ id: "1", role: "user", content: "Hello" }];

    render(<Assistant isOpen={true} onClose={vi.fn()} />);

    const clearButton = screen.getByRole("button", { name: /clear chat history/i });
    fireEvent.click(clearButton);

    expect(screen.getByText("Clear Chat History")).toBeDefined();
    expect(
      screen.getByText("Are you sure you want to clear your conversation history? This action cannot be undone.")
    ).toBeDefined();
  });

  it("cancelling modal does not clear messages", async () => {
    mockMessages = [{ id: "1", role: "user", content: "Hello" }];

    render(<Assistant isOpen={true} onClose={vi.fn()} />);

    const clearButton = screen.getByRole("button", { name: /clear chat history/i });
    fireEvent.click(clearButton);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByText("Clear Chat History")).toBeNull();
    expect(mockSetMessages).not.toHaveBeenCalledWith([]);
    expect(ClientStorage.clearAssistantMessages).not.toHaveBeenCalled();
  });

  it("confirming clear modal stops stream, clears messages and storage, and shows toast", async () => {
    mockMessages = [{ id: "1", role: "user", content: "Hello" }];

    render(<Assistant isOpen={true} onClose={vi.fn()} />);

    const clearButton = screen.getByRole("button", { name: /clear chat history/i });
    fireEvent.click(clearButton);

    const confirmButton = screen.getByRole("button", { name: "Clear Chat" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockStop).toHaveBeenCalled();
      expect(mockSetMessages).toHaveBeenCalledWith([]);
      expect(ClientStorage.clearAssistantMessages).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith("success", "Chat history cleared");
    });
  });

  it("pressing Escape closes modal first without closing Assistant", async () => {
    mockMessages = [{ id: "1", role: "user", content: "Hello" }];
    const onClose = vi.fn();

    render(<Assistant isOpen={true} onClose={onClose} />);

    const clearButton = screen.getByRole("button", { name: /clear chat history/i });
    fireEvent.click(clearButton);

    expect(screen.getByText("Clear Chat History")).toBeDefined();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByText("Clear Chat History")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("scrolls to top when opened and does not auto-scroll to bottom on initial hydration", async () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    mockMessages = [
      { id: "1", role: "user", content: "First question" },
      { id: "2", role: "assistant", content: "First answer" },
    ];

    const { rerender } = render(<Assistant isOpen={false} onClose={vi.fn()} />);

    // When opened
    rerender(<Assistant isOpen={true} onClose={vi.fn()} />);

    // Wait and verify that on open, it does not scroll to bottom
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });
});
