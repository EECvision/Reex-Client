"use client";

import React, { useEffect, useRef, useState } from "react";
import { useChat, Message } from "ai/react";
import { X, ArrowUp, Sparkles, ExternalLink, MessageSquare, HelpCircle, Trash2 } from "lucide-react";
import styles from "./Assistant.module.css";
import { AssistantMessage } from "./AssistantMessage";
import { ClientStorage } from "@/lib/clientStorage";

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

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
    setMessages,

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

  // Hydrate stored messages from IndexedDB on mount
  useEffect(() => {
    ClientStorage.getAssistantMessages<Message>().then((saved) => {
      if (saved && saved.length > 0) {
        setMessages(saved);
      }
    });
  }, [setMessages]);

  // Save messages to IndexedDB (FIFO cap 20) whenever messages change
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      ClientStorage.saveAssistantMessages(messages);
    }
  }, [messages, isLoading]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current && activeTab === "chat") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, activeTab]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
    setMessages([]);
    await ClientStorage.clearAssistantMessages();
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
              Ask Docs
            </div>
            <div className={styles.headerActions}>
              <a
                href="https://reex-api-builder.toolshq.app/docs"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.docsLink}
              >
                Docs <ExternalLink size={14} />
              </a>
              {messages.length > 0 && (
                <button
                  className={styles.closeButton}
                  onClick={handleClearHistory}
                  title="Clear chat history"
                  aria-label="Clear chat history"
                >
                  <Trash2 size={16} />
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

          <div className={styles.body}>
            {activeTab === "faq" ? (
              <div className={styles.faqSection}>
                <div className={styles.faqHeader}>
                  <h3 className={styles.faqTitle}>Frequently Asked Questions</h3>
                  <p className={styles.faqSubtitle}>
                    Click any question below to ask the AI assistant.
                  </p>
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
    </>
  );
};


