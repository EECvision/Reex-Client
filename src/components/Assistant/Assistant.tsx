"use client";

import { DOCS_URL } from "@/config/links";
import { useToast } from "@/hooks/useToast";
import { ClientStorage } from "@/lib/clientStorage";
import { Message, useChat } from "ai/react";
import {
  ArrowUp,
  ExternalLink,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import DeleteConfirmModal from "../DeleteConfirmModal/DeleteConfirmModal";
import styles from "./Assistant.module.css";
import { AssistantMessage } from "./AssistantMessage";

interface AssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTED_QUESTIONS = [
  "What is Reex API Builder?",
  "How do I initialize Reex in a React or Next.js project?",
  "How do I setup authentication for my API endpoints?",
  "How do I setup custom headers or request interceptors?",
  "How do I sync changes between the UI and my code?",
  "How do I configure notifications for API requests?",
  "How does Reex format backend API errors and trigger notifications?",
  "Can I customize generated TypeScript types without losing them?",
  "How do I add or remove an API module using CLI?",
  "How do I use generated React Query hooks in my components?",
];

export const Assistant: React.FC<AssistantProps> = ({ isOpen, onClose }) => {
  const [chatError, setChatError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "faq">("chat");
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { showToast } = useToast();

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
    setMessages,
    stop,
  } = useChat({
    api: "/api/assistant",
    onResponse: async (response) => {
      if (!response.ok) {
        try {
          const data = await response.clone().json();
          setChatError(data.error || `Error: ${response.status}`);
        } catch {
          setChatError(`Error: ${response.statusText || response.status}`);
        }
      } else {
        setChatError(null);
      }
    },
    onError: (err) => {
      setChatError(err.message || "Something went wrong. Please try again.");
    },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const isHydratedRef = useRef(false);
  const prevMessagesCountRef = useRef(0);

  // Hydrate stored messages from IndexedDB on mount
  useEffect(() => {
    ClientStorage.getAssistantMessages<Message>().then((saved) => {
      if (saved && saved.length > 0) {
        setMessages(saved);
        prevMessagesCountRef.current = saved.length;
      }
      setTimeout(() => {
        isHydratedRef.current = true;
      }, 50);
    });
  }, [setMessages]);

  // Save messages to IndexedDB (FIFO cap 20) whenever messages change
  useEffect(() => {
    if (messages.length > 0 && !isLoading && !isClearing) {
      ClientStorage.saveAssistantMessages(messages);
    }
  }, [messages, isLoading, isClearing]);

  // Always scroll to top when opening the chat
  useEffect(() => {
    if (isOpen) {
      const resetScrollToTop = () => {
        if (chatBodyRef.current) {
          chatBodyRef.current.scrollTop = 0;
        }
      };

      resetScrollToTop();
      const raf = requestAnimationFrame(resetScrollToTop);
      const t1 = setTimeout(resetScrollToTop, 50);
      const t2 = setTimeout(resetScrollToTop, 300);

      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isOpen]);

  // Scroll to top when switching to chat tab
  useEffect(() => {
    if (isOpen && activeTab === "chat" && !isLoading) {
      if (chatBodyRef.current) {
        chatBodyRef.current.scrollTop = 0;
      }
    }
  }, [isOpen, activeTab, isLoading]);

  // Auto-scroll to bottom only when new messages are added or AI is streaming
  useEffect(() => {
    if (!isHydratedRef.current) {
      return;
    }

    const hasNewMessages = messages.length > prevMessagesCountRef.current;
    prevMessagesCountRef.current = messages.length;

    if ((hasNewMessages || isLoading) && activeTab === "chat" && isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, activeTab, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (showClearModal) {
          setShowClearModal(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, showClearModal]);

  const handleSuggestionClick = (question: string) => {
    if (chatError) setChatError(null);
    append({ role: "user", content: question });
    setActiveTab("chat");
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setActiveTab("chat");
    handleSubmit(e);
  };

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      stop();
      setMessages([]);
      setChatError(null);
      prevMessagesCountRef.current = 0;
      if (chatBodyRef.current) {
        chatBodyRef.current.scrollTop = 0;
      }
      await ClientStorage.clearAssistantMessages();
      showToast("success", "Chat history cleared");
      setShowClearModal(false);
    } catch (error) {
      console.error("Failed to clear chat history:", error);
      showToast("error", "Failed to clear chat history. Please try again.");
    } finally {
      setIsClearing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Only submit if input is not empty
      if (input.trim() || !isLoading) {
        // Create a synthetic form event
        const formEvent = new Event("submit", {
          cancelable: true,
          bubbles: true,
        }) as unknown as React.FormEvent<HTMLFormElement>;
        handleFormSubmit(formEvent);
      }
    }
  };

  return (
    <>
      <div
        className={`${styles.mobileOverlay} ${isOpen ? styles.mobileOverlayOpen : ""}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <div
        className={`${styles.assistantContainer} ${isOpen ? styles.isOpen : ""}`}
      >
        <div className={styles.panel}>
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <Sparkles size={16} color="var(--primary-color, #0070f3)" />
              Ask AI
            </div>
            <div className={styles.headerActions}>
              <a
                href={DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.docsLink}
              >
                Docs <ExternalLink size={14} />
              </a>
              {activeTab === "chat" && (
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={() => setShowClearModal(true)}
                  disabled={messages.length === 0 || isClearing}
                  title={
                    messages.length === 0
                      ? "No messages to clear"
                      : "Clear chat history"
                  }
                  aria-label="Clear chat history"
                >
                  <Trash2 size={14} />
                  <span>Clear</span>
                </button>
              )}
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Close Assistant"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className={styles.tabNav}>
            <button
              type="button"
              className={`${styles.tabButton} ${activeTab === "chat" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              <MessageSquare size={14} />
              <span>Chat</span>
            </button>
            <button
              type="button"
              className={`${styles.tabButton} ${activeTab === "faq" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("faq")}
            >
              <HelpCircle size={14} />
              <span>FAQ</span>
            </button>
          </div>

          <div className={styles.body} ref={chatBodyRef}>
            {activeTab === "faq" ? (
              <div className={styles.suggestions}>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    className={styles.suggestionCard}
                    onClick={() => handleSuggestionClick(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <>
                <div className={styles.disclaimer}>
                  Responses are generated using AI and may contain mistakes.
                </div>
                <div className={styles.suggestions}>
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      className={styles.suggestionCard}
                      onClick={() => handleSuggestionClick(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {messages.map((message) => (
                  <AssistantMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                  />
                ))}
                {isLoading &&
                  messages[messages.length - 1]?.role === "user" && (
                    <div
                      className={`${styles.messageWrapper} ${styles.messageAssistant}`}
                    >
                      <div className={styles.typingIndicator}>
                        <div className={styles.dot}></div>
                        <div className={styles.dot}></div>
                        <div className={styles.dot}></div>
                      </div>
                    </div>
                  )}
              </>
            )}

            {chatError && (
              <div
                className={`${styles.messageWrapper} ${styles.messageAssistant}`}
                style={{ marginTop: "auto" }}
              >
                <div className={styles.errorMessage}>⚠️ {chatError}</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.footer}>
            <form className={styles.inputForm} onSubmit={handleFormSubmit}>
              <textarea
                className={styles.input}
                value={input}
                onChange={(e) => {
                  if (chatError) setChatError(null);
                  handleInputChange(e);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                disabled={isLoading}
                rows={1}
                style={{
                  minHeight: "44px",
                  maxHeight: "150px",
                  resize: "none",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
                }}
              />
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
              >
                <ArrowUp size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
      <DeleteConfirmModal
        isOpen={showClearModal}
        onClose={() => {
          if (!isClearing) setShowClearModal(false);
        }}
        onConfirm={handleClearHistory}
        deleting={isClearing}
        title="Clear Chat History"
        message="Are you sure you want to clear your conversation history? This action cannot be undone."
        confirmText="Clear Chat"
      />
    </>
  );
};
