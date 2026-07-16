'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useChat } from 'ai/react';
import { X, ArrowUp, Sparkles, ExternalLink } from 'lucide-react';
import styles from './Assistant.module.css';
import { AssistantMessage } from './AssistantMessage';

interface AssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTED_QUESTIONS = [
  'How do I import a collection?',
  'What auth strategies are available?',
  'How does two-way sync work?',
];

export const Assistant: React.FC<AssistantProps> = ({ isOpen, onClose }) => {
  const [chatError, setChatError] = useState<string | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, append, error } = useChat({
    api: '/api/assistant',
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
      setChatError(err.message || 'Something went wrong. Please try again.');
    },
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSuggestionClick = (question: string) => {
    if (chatError) setChatError(null);
    append({ role: 'user', content: question });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Only submit if input is not empty
      if (input.trim() || !isLoading) {
         // Create a synthetic form event
         const formEvent = new Event('submit', { cancelable: true, bubbles: true }) as unknown as React.FormEvent<HTMLFormElement>;
         handleSubmit(formEvent);
      }
    }
  };

  return (
    <>
      <div 
        className={`${styles.mobileOverlay} ${isOpen ? styles.mobileOverlayOpen : ''}`} 
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <div className={`${styles.assistantContainer} ${isOpen ? styles.isOpen : ''}`}>
        <div className={styles.panel}>
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <Sparkles size={20} color="var(--primary-color, #0070f3)" />
              Ask Assistant
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
              <button className={styles.closeButton} onClick={onClose} aria-label="Close Assistant">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className={styles.body}>
            {messages.length === 0 ? (
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
                    role={message.role as any} 
                    content={message.content} 
                  />
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className={`${styles.messageWrapper} ${styles.messageAssistant}`}>
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
              <div className={`${styles.messageWrapper} ${styles.messageAssistant}`} style={{ marginTop: 'auto' }}>
                <div className={styles.errorMessage}>
                  ⚠️ {chatError}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.footer}>
            <form className={styles.inputForm} onSubmit={handleSubmit}>
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
                style={{ minHeight: '44px', maxHeight: '150px', resize: 'none' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
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
