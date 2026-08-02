"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./SetupGuideModal.module.css";
import {
  Terminal,
  Copy,
  CheckCircle2,
  X,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import MonacoJsonEditor from "../MonacoJsonEditor/MonacoJsonEditor";
import {
  AuthStrategy,
  consumeCodeMap,
  providerCodeMap,
} from "./consumeCodeString";

const STRATEGIES: { id: AuthStrategy; label: string }[] = [
  { id: "localstorage", label: "localStorage (Token)" },
  { id: "cookie", label: "Cookie Based" },
  { id: "next-auth", label: "NextAuth.js" },
];

export default function SetupGuideModal() {
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [mountState, setMountState] = useState<
    "loading" | "show-modal" | "show-fab"
  >("loading");

  // Strategy state
  const [selectedStrategy, setSelectedStrategy] =
    useState<AuthStrategy>("localstorage");

  // Copy states
  const [copiedProvider, setCopiedProvider] = useState(false);
  const [copiedConsume, setCopiedConsume] = useState(false);

  // Collapse state
  const [showConsumeCode, setShowConsumeCode] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      const dismissed = localStorage.getItem("reex_setup_guide_dismissed");
      if (!dismissed) {
        setMountState("show-modal");
      } else {
        setMountState("show-fab");
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      setMounted(false);
    };
  }, []);

  const handleCopy = (
    text: string,
    setCopied: React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDismiss = () => {
    setMountState("show-fab");
    localStorage.setItem("reex_setup_guide_dismissed", "true");
  };

  const handleRestore = () => {
    setMountState("show-modal");
  };

  if (!mounted || mountState === "loading") return null;

  if (mountState === "show-fab") {
    return createPortal(
      <button
        className={styles.fab}
        onClick={handleRestore}
        title="Setup Instructions"
      >
        <Terminal size={20} />
      </button>,
      document.body,
    );
  }

  const modalContent = (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleWrapper}>
            <h3 className={styles.title}>Project Setup Guide</h3>
          </div>
          <button
            className={styles.closeBtn}
            onClick={handleDismiss}
            title="Dismiss"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Step 1 */}
          <div className={styles.step}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>1</div>
              <h4 className={styles.stepTitle}>Import your API Collection</h4>
            </div>
            <p className={styles.stepDescription}>
              Import your OpenAPI specification or Postman collection using the button in the navbar.
              Once imported, Reex automatically scaffolds and syncs ready-to-use API clients, TypeScript types,
              and React Query hooks directly into your project's <code>api-services/</code> directory.
            </p>
          </div>

          {/* Step 2 */}
          <div className={styles.step}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>2</div>
              <h4 className={styles.stepTitle}>Wrap App with ReexProvider</h4>
            </div>
            <p className={styles.stepDescription}>
              Provide the API context by wrapping your application layout
              component (e.g. <code>AppLayout.tsx</code>). Select your
              authentication strategy below:
            </p>
            <div className={styles.strategyTabs}>
              {STRATEGIES.map((s) => (
                <button
                  key={s.id}
                  className={`${styles.strategyTab} ${
                    selectedStrategy === s.id ? styles.strategyTabActive : ""
                  }`}
                  onClick={() => setSelectedStrategy(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className={styles.monacoWrapper}>
              <div className={styles.monacoHeader}>
                <span className={styles.monacoFilename}>
                  {selectedStrategy === "next-auth"
                    ? "RootLayout.tsx"
                    : "AppLayout.tsx"}
                </span>
                <button
                  className={styles.copyBtnFloat}
                  onClick={() =>
                    handleCopy(
                      providerCodeMap[selectedStrategy],
                      setCopiedProvider,
                    )
                  }
                  title="Copy code"
                >
                  {copiedProvider ? (
                    <CheckCircle2 size={14} color="#10b981" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
              <div className={styles.monacoContainer}>
                <MonacoJsonEditor
                  value={providerCodeMap[selectedStrategy]}
                  language="typescript"
                  height={150}
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className={styles.step}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>3</div>
              <h4 className={styles.stepTitle}>Configure API Settings</h4>
            </div>
            <p className={styles.stepDescription}>
              Open <code>api-services/api.config.ts</code> in your project to
              update your base URL, authentication endpoints, and token
              extraction logic to match your backend. You can also toggle{" "}
              <code>unwrapResponseData</code> and API logging here.
            </p>
          </div>

          {/* Step 4 */}
          <div className={styles.step}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>4</div>
              <h4 className={styles.stepTitle}>Test & Save Interfaces</h4>
            </div>
            <p className={styles.stepDescription}>
              Start testing your requests directly in the Reex UI. Once you get
              a successful response, click the "Save Interface" button to
              generate accurate TypeScript types into your project.
            </p>
          </div>

          {/* Step 5 */}
          <div className={styles.step}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>5</div>
              <h4 className={styles.stepTitle}>Consume APIs in your Code</h4>
            </div>
            <div className={styles.stepDescription}>
              Use your generated query mutations and the core Reex hooks to
              manage authentication, headers, tokens, and notifications.
              <ul className={styles.hooksList}>
                <li>
                  <code>useTokens</code>: Manage auth tokens (localStorage strategy).
                </li>
                <li>
                  <code>useHeaders</code>: Set custom headers (like version or
                  client ID) for all requests.
                </li>
                <li>
                  <code>useNotification</code>: Fire toast notifications across
                  the app.
                </li>
                <li>
                  <code>useAuthState</code> & <code>useClearSession</code>:
                  Check auth state or securely clear session, cancel pending requests & purge query cache.
                </li>
              </ul>
            </div>

            <div
              className={styles.collapseToggle}
              onClick={() => setShowConsumeCode(!showConsumeCode)}
            >
              <span className={styles.collapseText}>
                {showConsumeCode
                  ? "Hide comprehensive code example"
                  : "View comprehensive code example"}
              </span>
              {showConsumeCode ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </div>

            {showConsumeCode && (
              <>
                <div className={styles.strategyTabs}>
                  {STRATEGIES.map((s) => (
                    <button
                      key={s.id}
                      className={`${styles.strategyTab} ${
                        selectedStrategy === s.id
                          ? styles.strategyTabActive
                          : ""
                      }`}
                      onClick={() => setSelectedStrategy(s.id)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className={styles.monacoWrapper}>
                  <div className={styles.monacoHeader}>
                    <span className={styles.monacoFilename}>
                      {selectedStrategy === "next-auth"
                        ? "App.tsx (NextAuth)"
                        : "App.tsx"}
                    </span>
                    <button
                      className={styles.copyBtnFloat}
                      onClick={() =>
                        handleCopy(
                          consumeCodeMap[selectedStrategy],
                          setCopiedConsume,
                        )
                      }
                      title="Copy code"
                    >
                      {copiedConsume ? (
                        <CheckCircle2 size={14} color="#10b981" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                  <div className={styles.monacoContainer}>
                    <MonacoJsonEditor
                      value={consumeCodeMap[selectedStrategy]}
                      language="typescript"
                      height={350}
                      readOnly
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <span className={styles.helpText}>Need help getting started?</span>
          <span
            style={{ fontSize: 12, color: "var(--text-secondary, #64748b)" }}
          >
            Ask Docs AI or{" "}
            <a
              href="https://reex-api-builder.toolshq.app/support"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.helpLink}
              style={{ fontSize: 12 }}
            >
              Contact support.
            </a>
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
