"use client";

import React, { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  Terminal,
  Copy,
  CheckCircle2,
  X,
  ExternalLink,
  Globe,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import styles from "./ConnectProjectModal.module.css";

interface ConnectProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectProjectModal: React.FC<ConnectProjectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedCliInstall, setCopiedCliInstall] = useState(false);
  const [copiedCliStart, setCopiedCliStart] = useState(false);
  const [copiedProxy, setCopiedProxy] = useState(false);

  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const handleCopy = (
    text: string,
    setCopied: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen || !isClient) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-project-title"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleWrapper}>
            <div className={styles.iconWrapper}>
              <Terminal size={16} />
            </div>
            <h3 id="connect-project-title" className={styles.title}>
              Connect Local Project
            </h3>
            <a
              href="https://www.npmjs.com/package/reex-cli"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.npmBadge}
              title="View reex-cli on npm"
            >
              <span>npm</span>
              <ExternalLink size={10} />
            </a>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            title="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <p className={styles.description}>
            Dev Mode connects Reex directly to your local project codebase,
            automatically generating TypeScript clients, types, and hooks in
            real time.
          </p>

          <div className={styles.section}>
            {/* Step 1 */}
            <div className={styles.step}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>1</span>
                <span className={styles.stepLabel}>Install Reex CLI globally</span>
              </div>
              <div className={styles.codeBox}>
                <div className={styles.codeLines}>
                  <span className={styles.codePrompt}>$</span>
                  <span className={styles.codeCmd}>npm</span>
                  <span className={styles.codeArg}>install -g reex-cli</span>
                </div>
                <button
                  className={styles.copyBtn}
                  onClick={() =>
                    handleCopy("npm install -g reex-cli", setCopiedCliInstall)
                  }
                  title="Copy command"
                >
                  {copiedCliInstall ? (
                    <CheckCircle2 size={14} color="#4ade80" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className={styles.step}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>2</span>
                <span className={styles.stepLabel}>
                  Run in your project root directory
                </span>
              </div>
              <div className={styles.codeBox}>
                <div className={styles.codeLines}>
                  <span className={styles.codePrompt}>$</span>
                  <span className={styles.codeCmd}>reex</span>
                  <span className={styles.codeArg}>start</span>
                </div>
                <button
                  className={styles.copyBtn}
                  onClick={() => handleCopy("reex start", setCopiedCliStart)}
                  title="Copy command"
                >
                  {copiedCliStart ? (
                    <CheckCircle2 size={14} color="#4ade80" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Info callout */}
          <div className={styles.infoBox}>
            <Sparkles size={16} className={styles.infoIcon} />
            <span>
              Once <strong>reex start</strong> is running in your terminal, Reex
              will automatically detect your codebase and switch into Dev Mode.
            </span>
          </div>

          {/* Localhost proxy section */}
          <div className={styles.proxySection}>
            <div className={styles.proxyHeader}>
              <Globe size={14} color="#38bdf8" />
              <span>Testing Localhost APIs?</span>
            </div>
            <div className={styles.codeBox}>
              <div className={styles.codeLines}>
                <span className={styles.codePrompt}>$</span>
                <span className={styles.codeCmd}>npx</span>
                <span className={styles.codeArg}>reex-proxy</span>
              </div>
              <button
                className={styles.copyBtn}
                onClick={() => handleCopy("npx reex-proxy", setCopiedProxy)}
                title="Copy command"
              >
                {copiedProxy ? (
                  <CheckCircle2 size={14} color="#4ade80" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Button variant="primary" onClick={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConnectProjectModal;
