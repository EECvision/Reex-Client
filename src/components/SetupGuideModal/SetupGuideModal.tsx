"use client";

import React, { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import styles from "./SetupGuideModal.module.css";
import {
  Terminal,
  Copy,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lightbulb,
} from "lucide-react";
import MonacoJsonEditor from "../MonacoJsonEditor/MonacoJsonEditor";
import {
  AuthStrategy,
  consumeCodeMap,
  providerCodeMap,
  nextAuthRouteCodeString,
} from "./consumeCodeString";

const STRATEGIES: { id: AuthStrategy; label: string }[] = [
  { id: "jwt", label: "JWT (Token)" },
  { id: "cookie", label: "Cookie Based" },
  { id: "next-auth", label: "NextAuth.js" },
];

export default function SetupGuideModal() {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [mountState, setMountState] = useState<
    "loading" | "show-modal" | "show-fab"
  >("loading");

  // Strategy state
  const [selectedStrategy, setSelectedStrategy] = useState<AuthStrategy>("jwt");

  // Copy states
  const [copiedProvider, setCopiedProvider] = useState(false);
  const [copiedConsume, setCopiedConsume] = useState(false);
  const [copiedNextAuthRoute, setCopiedNextAuthRoute] = useState(false);

  // Collapse state
  const [showConsumeCode, setShowConsumeCode] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("reex_setup_guide_dismissed");
    queueMicrotask(() => {
      if (!dismissed) {
        setMountState("show-modal");
        sessionStorage.setItem("reex_setup_guide_dismissed", "true");
      } else {
        setMountState("show-fab");
      }
    });
  }, []);

  const handleDismiss = useCallback(() => {
    setMountState("show-fab");
    sessionStorage.setItem("reex_setup_guide_dismissed", "true");
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mountState === "show-modal") {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mountState, handleDismiss]);

  const handleCopy = (
    text: string,
    setCopied: React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };



  const handleRestore = () => {
    setMountState("show-modal");
  };

  if (!isClient || mountState === "loading") return null;

  if (mountState === "show-fab") {
    return createPortal(
      <button
        data-tour="setup-guide"
        className={styles.fab}
        onClick={handleRestore}
        title="Setup Instructions"
      >
        <Terminal size={16} />
      </button>,
      document.body,
    );
  }

  const modalContent = (
    <div className={styles.overlay} onClick={handleDismiss}>
      <div data-tour="setup-guide" className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleWrapper}>
            <h3 className={styles.title}>Project Setup Guide</h3>
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
              Import your OpenAPI specification or Postman collection using the
              import collection button. Once imported, Reex automatically
              scaffolds and syncs ready-to-use API clients, TypeScript types,
              and React Query hooks directly into your project&apos;s{" "}
              <code>api-services/</code> directory.
            </p>
            <div className={styles.proTip}>
              <div className={styles.proTipTitle}>
                <Lightbulb size={14} /> Pro Tip
              </div>
              <p className={styles.proTipText}>
                For the best experience, we recommend setting up Prettier in
                your project if not already set. Reex formats generated code
                using your project&apos;s existing configuration.
              </p>
            </div>
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
              Open <code>api-services/api.config.ts</code> in your project and
              update the base URL and authentication configuration to match your
              backend based on the selected authentication strategy. You can
              also toggle <code>unwrapResponseData</code> and API logging.
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
              a successful response, click the &quot;Save Interface&quot; button to
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
              Easily consume your API across your application using generated
              hooks or the core API object.
              <ul className={styles.hooksList}>
                <li>
                  <strong>Generated Queries:</strong> Fully-typed React Query
                  hooks are automatically generated for your endpoints in{" "}
                  <code>api-services/generated/</code>. Use them directly in
                  your components for effortless data fetching and caching.
                </li>
                <li>
                  <strong>Outside React:</strong> Import the <code>api</code>{" "}
                  object from <code>api-services/definitions/index.ts</code> to
                  make requests in utility files, server actions, or vanilla
                  JavaScript.
                </li>
                <li>
                  <strong>Core Reex Hooks:</strong> Import{" "}
                  <code>useAuthSession</code>, <code>useHeaders</code>, and{" "}
                  <code>useNotification</code> from{" "}
                  <code>api-services/hooks/</code> to manage auth state, global
                  headers, and toast alerts.
                </li>
              </ul>
            </div>

            <div className={styles.proTip}>
              <div className={styles.proTipTitle}>
                <Lightbulb size={14} /> Pro Tip
              </div>
              <p className={styles.proTipText}>
                A default toast notification component is scaffolded at{" "}
                <code>api-services/custom/notification/AppNotification/</code>.
                Customize it to match your brand.
              </p>
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

                {selectedStrategy === "next-auth" ? (
                  <>
                    <div className={styles.monacoWrapper}>
                      <div className={styles.monacoHeader}>
                        <span className={styles.monacoFilename}>
                          App.tsx (Client Consumption)
                        </span>
                        <button
                          className={styles.copyBtnFloat}
                          onClick={() =>
                            handleCopy(
                              consumeCodeMap[selectedStrategy],
                              setCopiedConsume,
                            )
                          }
                          title="Copy client code"
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
                          height={280}
                          readOnly
                        />
                      </div>
                    </div>

                    <div className={styles.monacoWrapper}>
                      <div className={styles.monacoHeader}>
                        <span className={styles.monacoFilename}>
                          app/api/auth/[...nextauth]/route.ts (Server Route)
                        </span>
                        <button
                          className={styles.copyBtnFloat}
                          onClick={() =>
                            handleCopy(
                              nextAuthRouteCodeString,
                              setCopiedNextAuthRoute,
                            )
                          }
                          title="Copy route handler code"
                        >
                          {copiedNextAuthRoute ? (
                            <CheckCircle2 size={14} color="#10b981" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                      <div className={styles.monacoContainer}>
                        <MonacoJsonEditor
                          value={nextAuthRouteCodeString}
                          language="typescript"
                          height={280}
                          readOnly
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={styles.monacoWrapper}>
                    <div className={styles.monacoHeader}>
                      <span className={styles.monacoFilename}>App.tsx</span>
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
                )}
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
