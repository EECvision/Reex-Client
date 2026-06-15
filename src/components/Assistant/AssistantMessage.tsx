import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';
import styles from './Assistant.module.css';

interface AssistantMessageProps {
  role: 'user' | 'assistant' | 'system' | 'data';
  content: string;
}

export const AssistantMessage: React.FC<AssistantMessageProps> = ({ role, content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (role === 'user') {
    return (
      <div className={`${styles.messageWrapper} ${styles.messageUser}`}>
        {content}
      </div>
    );
  }

  if (role === 'assistant') {
    return (
      <div className={`${styles.messageWrapper} ${styles.messageAssistant}`}>
        <button 
          className={styles.copyButton} 
          onClick={handleCopy}
          title="Copy message"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <div className={styles.messageAssistantContent}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return null;
};
