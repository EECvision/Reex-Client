"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  Bug,
  MessageSquare,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Terminal,
  ChevronDown,
  Info,
  Search,
  X,
  Download,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  FolderGit2,
} from "lucide-react";
import { ISSUES_URL, REPOSITORY_URL, DOCS_URL } from "@/config/links";
import { useSettings } from "@/providers/SettingsContext";
import styles from "./support.module.css";

const noopSubscribe = () => () => {};

const getUserAgentSnapshot = () =>
  typeof navigator !== "undefined" ? navigator.userAgent : "";
const getServerUserAgentSnapshot = () => "";

const getPlatformSnapshot = () =>
  typeof navigator !== "undefined"
    ? // @ts-expect-error userAgentData may exist on modern browsers
      navigator.userAgentData?.platform || navigator.platform || "Unknown"
    : "Unknown";
const getServerPlatformSnapshot = () => "Unknown";

const subscribeOnline = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};
const getOnlineSnapshot = () =>
  typeof navigator !== "undefined" ? navigator.onLine : true;
const getServerOnlineSnapshot = () => true;

interface FaqItem {
  id: string;
  category: "cors" | "storage" | "sdk" | "shortcuts" | "troubleshoot";
  question: string;
  keywords: string[];
  answer: React.ReactNode;
}

export default function SupportPage() {
  const { theme } = useSettings();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openFaq, setOpenFaq] = useState<string | null>("faq-cors");
  const [copiedDiag, setCopiedDiag] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [copiedIssueAlert, setCopiedIssueAlert] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<{
    usedMb: string;
    quotaMb: string;
  } | null>(null);
  const [proxyStatus, setProxyStatus] = useState<
    "idle" | "checking" | "connected" | "offline"
  >("idle");
  const [faqFeedback, setFaqFeedback] = useState<
    Record<string, "yes" | "no">
  >({});

  // Client-side browser properties via useSyncExternalStore
  const userAgent = useSyncExternalStore(
    noopSubscribe,
    getUserAgentSnapshot,
    getServerUserAgentSnapshot
  );
  const platform = useSyncExternalStore(
    noopSubscribe,
    getPlatformSnapshot,
    getServerPlatformSnapshot
  );
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerOnlineSnapshot
  );

  // Detect storage estimate and keyboard shortcuts
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Estimate storage if API available
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage
          .estimate()
          .then((estimate) => {
            if (estimate.usage !== undefined && estimate.quota !== undefined) {
              const usedMb = (estimate.usage / (1024 * 1024)).toFixed(1);
              const quotaMb = (estimate.quota / (1024 * 1024)).toFixed(0);
              setStorageEstimate({ usedMb, quotaMb });
            }
          })
          .catch(() => {});
      }

      // Keyboard shortcut to focus search: '/'
      const handleKeyDown = (e: KeyboardEvent) => {
        if (
          e.key === "/" &&
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA"
        ) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      };

      window.addEventListener("keydown", handleKeyDown);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, []);

  // Copy command helper
  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(cmd);
    setTimeout(() => {
      setCopiedCommand((prev) => (prev === cmd ? null : prev));
    }, 2000);
  };

  // Build markdown diagnostic string
  const getDiagnosticsMarkdown = () => {
    return [
      "### Reex System Diagnostics",
      `- **Application:** Reex API Studio (v0.1.0)`,
      `- **Active Theme:** ${theme}`,
      `- **Network Status:** ${isOnline ? "Online" : "Offline"}`,
      `- **Local Proxy Status:** ${proxyStatus}`,
      `- **Storage Engine:** Browser IndexedDB + localStorage`,
      `- **Storage Quota:** ${
        storageEstimate
          ? `${storageEstimate.usedMb} MB used / ~${storageEstimate.quotaMb} MB available`
          : "Available"
      }`,
      `- **Platform:** ${platform || "Unknown"}`,
      `- **User Agent:** ${userAgent || "Browser Client"}`,
      `- **Timestamp:** ${new Date().toISOString()}`,
    ].join("\n");
  };

  // Copy diagnostics button
  const handleCopyDiagnostics = () => {
    const diag = getDiagnosticsMarkdown();
    navigator.clipboard.writeText(diag);
    setCopiedDiag(true);
    setTimeout(() => setCopiedDiag(false), 2200);
  };

  // Download diagnostic JSON
  const handleDownloadDiagnostics = () => {
    const data = {
      app: "Reex API Studio",
      version: "0.1.0",
      theme,
      isOnline,
      proxyStatus,
      platform,
      storage: storageEstimate,
      userAgent,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reex-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy diagnostics and open GitHub Issue
  const handleCopyAndOpenIssue = () => {
    const diag = getDiagnosticsMarkdown();
    navigator.clipboard.writeText(diag);
    setCopiedIssueAlert(true);
    setTimeout(() => setCopiedIssueAlert(false), 3000);
    window.open(`${ISSUES_URL}/new/choose`, "_blank", "noopener,noreferrer");
  };

  // Check local proxy connectivity
  const handleCheckProxy = async () => {
    setProxyStatus("checking");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      // Attempt to ping localhost:3001 with no-cors
      await fetch("http://localhost:3001", {
        mode: "no-cors",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setProxyStatus("connected");
    } catch {
      setProxyStatus("offline");
    }
  };

  // FAQ Feedback
  const handleFaqFeedback = (faqId: string, value: "yes" | "no") => {
    setFaqFeedback((prev) => ({ ...prev, [faqId]: value }));
  };

  // FAQ List
  const faqs: FaqItem[] = useMemo(
    () => [
      {
        id: "faq-cors",
        category: "cors",
        question: "Why do localhost API requests fail with Network or CORS errors?",
        keywords: ["cors", "network", "localhost", "proxy", "headers", "origin", "blocked"],
        answer: (
          <div className={styles.faqAnswerContent}>
            <p>
              Web browsers enforce strict Cross-Origin Resource Sharing (CORS) security rules
              that prevent web applications from sending requests to localhost endpoints
              unless the target server explicitly returns permissive CORS headers (such as <code>Access-Control-Allow-Origin: *</code>).
            </p>
            <p>
              To bypass this seamlessly without altering your backend code or security configuration,
              Reex includes a zero-config local proxy bridge:
            </p>
            <div className={styles.inlineCodeBox}>
              <code>npx reex-proxy</code>
              <button
                className={styles.copyBtn}
                onClick={() => handleCopyCommand("npx reex-proxy")}
                title="Copy command"
                type="button"
              >
                {copiedCommand === "npx reex-proxy" ? (
                  <Check size={14} color="#4ade80" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
            <p className={styles.faqTip}>
              Once started, the proxy runs locally on port 3001 and forwards studio requests directly to your services with full header and body fidelity.
            </p>
          </div>
        ),
      },
      {
        id: "faq-storage",
        category: "storage",
        question: "Where are my collections, environments, and API keys stored?",
        keywords: ["storage", "privacy", "cloud", "indexeddb", "security", "token", "keys", "local"],
        answer: (
          <div className={styles.faqAnswerContent}>
            <p>
              <strong>Your API data never leaves your computer.</strong> Reex operates on a strict local-first architecture with zero remote databases:
            </p>
            <ul className={styles.bulletList}>
              <li>
                <strong>Collections & Endpoints:</strong> Persisted in your browser&apos;s isolated <code>IndexedDB</code> database on your machine.
              </li>
              <li>
                <strong>Workspace Preferences & Theme:</strong> Kept in your browser&apos;s <code>localStorage</code>.
              </li>
              <li>
                <strong>Zero Telemetry on Payloads:</strong> Headers, authorization keys, request bodies, and responses are never sent to any external server.
              </li>
            </ul>
            <p className={styles.faqTip}>
              You retain 100% control and ownership of your API specifications and secrets.
            </p>
          </div>
        ),
      },
      {
        id: "faq-sdk",
        category: "sdk",
        question: "How do I generate TypeScript SDKs and definitions from my endpoints?",
        keywords: ["sdk", "typescript", "cli", "generate", "types", "models", "client"],
        answer: (
          <div className={styles.faqAnswerContent}>
            <p>
              Reex allows you to generate end-to-end type-safe TypeScript interfaces, request bodies,
              response schemas, and typed fetch helpers directly from your collections into your codebase.
            </p>
            <div className={styles.inlineCodeBox}>
              <code>npm install -g reex-cli</code>
              <button
                className={styles.copyBtn}
                onClick={() => handleCopyCommand("npm install -g reex-cli")}
                title="Copy command"
                type="button"
              >
                {copiedCommand === "npm install -g reex-cli" ? (
                  <Check size={14} color="#4ade80" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
            <p>
              Navigate to your project directory and run <code>reex start</code>. Any modifications you make
              in the studio will immediately sync and regenerate your TypeScript client definitions.
            </p>
          </div>
        ),
      },
      {
        id: "faq-pna",
        category: "cors",
        question: "What is Private Network Access (PNA) and why does Chrome prompt for local permissions?",
        keywords: ["pna", "private network access", "chrome", "permission", "127.0.0.1", "localhost"],
        answer: (
          <div className={styles.faqAnswerContent}>
            <p>
              Modern Chromium-based browsers (Chrome, Edge, Brave) enforce Private Network Access (PNA) security
              when a website hosted on a public domain attempts to communicate with your private loopback IP (<code>localhost</code> or <code>127.0.0.1</code>).
            </p>
            <p>
              If prompted, click <strong>Allow</strong> to grant permission for Reex Studio to dispatch requests to your local servers. If you decline, requests will fail with a connection error until permissions are reset in site settings.
            </p>
          </div>
        ),
      },
      {
        id: "faq-shortcuts",
        category: "shortcuts",
        question: "What keyboard shortcuts are available in Reex Studio?",
        keywords: ["shortcuts", "hotkeys", "keyboard", "save", "pin", "send", "palette"],
        answer: (
          <div className={styles.faqAnswerContent}>
            <p>Accelerate your workflow with these built-in keyboard shortcuts:</p>
            <div className={styles.shortcutsTable}>
              <div className={styles.shortcutRow}>
                <span className={styles.shortcutDesc}>Send API Request</span>
                <span className={styles.shortcutKeys}>
                  <kbd>Ctrl</kbd> + <kbd>Enter</kbd>
                </span>
              </div>
              <div className={styles.shortcutRow}>
                <span className={styles.shortcutDesc}>Pin Active Tab / Save Endpoint</span>
                <span className={styles.shortcutKeys}>
                  <kbd>Ctrl</kbd> + <kbd>S</kbd>
                </span>
              </div>
              <div className={styles.shortcutRow}>
                <span className={styles.shortcutDesc}>Close Current Tab</span>
                <span className={styles.shortcutKeys}>
                  <kbd>Ctrl</kbd> + <kbd>W</kbd>
                </span>
              </div>
              <div className={styles.shortcutRow}>
                <span className={styles.shortcutDesc}>Focus Support Search</span>
                <span className={styles.shortcutKeys}>
                  <kbd>/</kbd>
                </span>
              </div>
            </div>
            <p className={styles.faqTip}>On macOS, replace <code>Ctrl</code> with <code>Cmd (⌘)</code>.</p>
          </div>
        ),
      },
      {
        id: "faq-import-export",
        category: "troubleshoot",
        question: "How do I import collections from Postman, cURL, or OpenAPI?",
        keywords: ["import", "export", "postman", "openapi", "swagger", "curl", "backup"],
        answer: (
          <div className={styles.faqAnswerContent}>
            <p>
              Reex supports importing existing API specifications so you can transition friction-free:
            </p>
            <ul className={styles.bulletList}>
              <li>
                <strong>Postman Collections (v2.1):</strong> Click the <em>Import</em> button in the workspace sidebar and drag-and-drop your Postman export JSON.
              </li>
              <li>
                <strong>Raw cURL Commands:</strong> Paste any valid <code>curl &quot;https://...&quot;</code> directly into the URL bar and Reex will parse method, headers, query parameters, and body automatically.
              </li>
              <li>
                <strong>OpenAPI / Swagger:</strong> Import JSON or YAML schemas to generate complete folder structures.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "faq-reset",
        category: "storage",
        question: "How do I back up or clear my workspace data?",
        keywords: ["reset", "clear", "backup", "restore", "delete", "export"],
        answer: (
          <div className={styles.faqAnswerContent}>
            <p>
              You can export collections anytime into a portable JSON format through the sidebar collection options menu.
            </p>
            <p>
              If you wish to wipe local data and reset Reex Studio to a pristine state, clear your browser site data for this domain via your browser Developer Tools (<code>Application &gt; Storage &gt; Clear site data</code>), or visit the Workspace Settings.
            </p>
          </div>
        ),
      },
    ],
    [copiedCommand]
  );

  // Filtered FAQs based on category & search query
  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      // Category filter
      if (selectedCategory !== "all" && faq.category !== selectedCategory) {
        return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      const matchQuestion = faq.question.toLowerCase().includes(query);
      const matchKeywords = faq.keywords.some((kw) => kw.toLowerCase().includes(query));
      return matchQuestion || matchKeywords;
    });
  }, [faqs, selectedCategory, searchQuery]);

  const toggleFaq = (id: string) => {
    setOpenFaq((prev) => (prev === id ? null : id));
  };

  const categories = [
    { id: "all", label: "All Topics", count: faqs.length },
    {
      id: "cors",
      label: "CORS & Proxy",
      count: faqs.filter((f) => f.category === "cors").length,
    },
    {
      id: "storage",
      label: "Storage & Privacy",
      count: faqs.filter((f) => f.category === "storage").length,
    },
    {
      id: "sdk",
      label: "SDK & CLI",
      count: faqs.filter((f) => f.category === "sdk").length,
    },
    {
      id: "shortcuts",
      label: "Shortcuts",
      count: faqs.filter((f) => f.category === "shortcuts").length,
    },
    {
      id: "troubleshoot",
      label: "Troubleshooting",
      count: faqs.filter((f) => f.category === "troubleshoot").length,
    },
  ];

  return (
    <main className={styles.container}>
      {/* Hero Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>How can we help you?</h1>
        <p className={styles.subtitle}>
          Search troubleshooting solutions, test your local proxy connection, or connect with the Reex community.
        </p>

        {/* Live Search Bar */}
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            ref={searchInputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search FAQs, error codes, CLI commands, shortcuts... (Press '/' to focus)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button
              type="button"
              className={styles.searchClearBtn}
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          ) : (
            <kbd className={styles.searchKeyHint}>/</kbd>
          )}
        </div>
      </header>

      {/* Support Channels Grid */}
      <section className={styles.channelGrid}>
        {/* Channel 1: Bug Reports */}
        <div className={styles.channelCard}>
          <div className={`${styles.channelIconWrapper} ${styles.iconRed}`}>
            <Bug size={22} />
          </div>
          <h2 className={styles.channelTitle}>Report a Bug</h2>
          <p className={styles.channelDesc}>
            Found an issue or unexpected response? File a report on GitHub with your reproduction steps.
          </p>
          <div className={styles.channelActionStack}>
            <button
              type="button"
              className={styles.channelPrimaryAction}
              onClick={handleCopyAndOpenIssue}
              title="Copies your system diagnostics and opens GitHub issues"
            >
              <span>{copiedIssueAlert ? "Copied! Opening..." : "Copy Info & Open Issue"}</span>
              <ExternalLink size={14} />
            </button>
            <a
              href={`${ISSUES_URL}/new/choose`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.channelSubAction}
            >
              Browse Open Issues
            </a>
          </div>
        </div>

        {/* Channel 2: Discussions */}
        <div className={styles.channelCard}>
          <div className={`${styles.channelIconWrapper} ${styles.iconCyan}`}>
            <MessageSquare size={22} />
          </div>
          <h2 className={styles.channelTitle}>Feature Requests</h2>
          <p className={styles.channelDesc}>
            Share ideas for new SDK generators, UI workflows, or integrations directly with the team.
          </p>
          <div className={styles.channelActionStack}>
            <a
              href={`${REPOSITORY_URL}/discussions`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.channelPrimaryAction}
            >
              <span>Join GitHub Discussions</span>
              <ExternalLink size={14} />
            </a>
            <a
              href={`${REPOSITORY_URL}/discussions/categories/ideas`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.channelSubAction}
            >
              Browse Proposals
            </a>
          </div>
        </div>

        {/* Channel 3: Documentation */}
        <div className={styles.channelCard}>
          <div className={`${styles.channelIconWrapper} ${styles.iconGreen}`}>
            <BookOpen size={22} />
          </div>
          <h2 className={styles.channelTitle}>Documentation</h2>
          <p className={styles.channelDesc}>
            Learn how to configure proxies, generate clients, manage environments, and customize settings.
          </p>
          <div className={styles.channelActionStack}>
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.channelPrimaryAction}
            >
              <span>Browse Docs Portal</span>
              <ExternalLink size={14} />
            </a>
            <span className={styles.channelNote}>Always up to date</span>
          </div>
        </div>

        {/* Channel 4: Repository & Changelog */}
        <div className={styles.channelCard}>
          <div className={`${styles.channelIconWrapper} ${styles.iconPurple}`}>
            <FolderGit2 size={22} />
          </div>
          <h2 className={styles.channelTitle}>Source & Releases</h2>
          <p className={styles.channelDesc}>
            Inspect source code, track version release notes, or star the project on GitHub.
          </p>
          <div className={styles.channelActionStack}>
            <a
              href={REPOSITORY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.channelPrimaryAction}
            >
              <span>View Repository</span>
              <ExternalLink size={14} />
            </a>
            <a
              href={`${REPOSITORY_URL}/releases`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.channelSubAction}
            >
              View Release Notes
            </a>
          </div>
        </div>
      </section>

      {/* Developer CLI & Localhost Toolbox */}
      <section className={styles.toolboxSection}>
        <div className={styles.toolboxHeader}>
          <div className={styles.toolboxTitleGroup}>
            <Terminal size={18} className={styles.toolboxIcon} />
            <h2 className={styles.toolboxHeading}>Developer CLI &amp; Proxy Toolbox</h2>
          </div>
          <span className={styles.toolboxSubtitle}>
            Essential commands for local API debugging and SDK compilation
          </span>
        </div>

        <div className={styles.toolboxGrid}>
          {/* Card 1: Proxy */}
          <div className={styles.toolboxCard}>
            <div className={styles.toolboxCardTop}>
              <span className={styles.toolboxBadge}>CORS Bridge</span>
              <span className={styles.toolboxPort}>Port 3001</span>
            </div>
            <h3 className={styles.toolboxCardTitle}>Reex Local Proxy CLI</h3>
            <p className={styles.toolboxCardDesc}>
              Bypasses browser CORS restrictions for local API endpoints without needing backend configuration changes.
            </p>
            <div className={styles.commandBar}>
              <code>npx reex-proxy</code>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => handleCopyCommand("npx reex-proxy")}
                title="Copy command"
              >
                {copiedCommand === "npx reex-proxy" ? (
                  <Check size={14} color="#4ade80" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </div>

          {/* Card 2: SDK Generator */}
          <div className={styles.toolboxCard}>
            <div className={styles.toolboxCardTop}>
              <span className={styles.toolboxBadgeBlue}>TypeScript SDK</span>
              <span className={styles.toolboxPort}>CLI</span>
            </div>
            <h3 className={styles.toolboxCardTitle}>Reex Code Generator</h3>
            <p className={styles.toolboxCardDesc}>
              Generates strongly-typed TypeScript clients and models from your workspace collections automatically.
            </p>
            <div className={styles.commandBar}>
              <code>npm install -g reex-cli</code>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => handleCopyCommand("npm install -g reex-cli")}
                title="Copy command"
              >
                {copiedCommand === "npm install -g reex-cli" ? (
                  <Check size={14} color="#4ade80" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </div>

          {/* Card 3: Interactive Proxy Health Check */}
          <div className={`${styles.toolboxCard} ${styles.healthCheckCard}`}>
            <div className={styles.toolboxCardTop}>
              <span className={styles.toolboxBadge}>Diagnostics</span>
              <span
                className={`${styles.healthIndicator} ${
                  proxyStatus === "connected"
                    ? styles.indicatorConnected
                    : proxyStatus === "offline"
                    ? styles.indicatorOffline
                    : ""
                }`}
              >
                {proxyStatus === "connected" && "Online"}
                {proxyStatus === "offline" && "Not Running"}
                {proxyStatus === "checking" && "Pinging..."}
                {proxyStatus === "idle" && "Ready to Test"}
              </span>
            </div>
            <h3 className={styles.toolboxCardTitle}>Test Local Proxy Status</h3>
            <p className={styles.toolboxCardDesc}>
              Verify if <code>reex-proxy</code> is active and accessible on <code>http://localhost:3001</code>.
            </p>
            <button
              type="button"
              className={styles.healthCheckBtn}
              onClick={handleCheckProxy}
              disabled={proxyStatus === "checking"}
            >
              <RefreshCw
                size={14}
                className={proxyStatus === "checking" ? styles.spinning : ""}
              />
              <span>
                {proxyStatus === "checking"
                  ? "Checking localhost:3001..."
                  : "Ping Local Proxy"}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <HelpCircle size={18} className={styles.sectionHeaderIcon} />
          <h2 className={styles.sectionHeading}>Frequently Asked Questions</h2>
          <span className={styles.faqCountBadge}>
            Showing {filteredFaqs.length} of {faqs.length}
          </span>
        </div>

        {/* Category Pills */}
        <div className={styles.categoryPills}>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                className={`${styles.categoryPill} ${
                  isActive ? styles.categoryPillActive : ""
                }`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span>{cat.label}</span>
                <span className={styles.categoryPillCount}>{cat.count}</span>
              </button>
            );
          })}
        </div>

        {/* FAQ List or Empty State */}
        {filteredFaqs.length === 0 ? (
          <div className={styles.emptyFaqState}>
            <Search size={32} className={styles.emptySearchIcon} />
            <h3 className={styles.emptyHeading}>No results found</h3>
            <p className={styles.emptyText}>
              No articles match &ldquo;{searchQuery}&rdquo;. Try another term or clear the filter.
            </p>
            <button
              type="button"
              className={styles.emptyResetBtn}
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
            >
              Reset Search &amp; Filters
            </button>
          </div>
        ) : (
          <div className={styles.faqList}>
            {filteredFaqs.map((faq) => {
              const isOpen = openFaq === faq.id;
              const feedback = faqFeedback[faq.id];
              return (
                <details
                  key={faq.id}
                  open={isOpen}
                  className={`${styles.faqCard} ${
                    isOpen ? styles.faqCardOpen : ""
                  }`}
                >
                  <summary
                    className={styles.faqQuestion}
                    onClick={(event) => {
                      event.preventDefault();
                      toggleFaq(faq.id);
                    }}
                  >
                    <span className={styles.faqQuestionText}>
                      {faq.question}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`${styles.faqChevron} ${
                        isOpen ? styles.faqChevronRotated : ""
                      }`}
                    />
                  </summary>

                    <div className={styles.faqAnswer}>
                      {faq.answer}

                      {/* Helpful Feedback row */}
                      <div className={styles.faqFeedbackRow}>
                        <span className={styles.faqFeedbackLabel}>
                          Was this helpful?
                        </span>
                        <button
                          type="button"
                          className={`${styles.feedbackBtn} ${
                            feedback === "yes" ? styles.feedbackBtnActive : ""
                          }`}
                          onClick={() => handleFaqFeedback(faq.id, "yes")}
                          title="Yes, this was helpful"
                        >
                          <ThumbsUp size={13} />
                          <span>Yes</span>
                        </button>
                        <button
                          type="button"
                          className={`${styles.feedbackBtn} ${
                            feedback === "no" ? styles.feedbackBtnActive : ""
                          }`}
                          onClick={() => handleFaqFeedback(faq.id, "no")}
                          title="No, this was not helpful"
                        >
                          <ThumbsDown size={13} />
                          <span>No</span>
                        </button>
                        {feedback && (
                          <span className={styles.feedbackThankYou}>
                            Thanks for your feedback!
                          </span>
                        )}
                      </div>
                    </div>
                </details>
              );
            })}
          </div>
        )}
      </section>

      {/* Reporting Checklist & Diagnostics */}
      <div className={styles.bottomGrid}>
        {/* Guidelines */}
        <section className={styles.guideCard}>
          <div className={styles.guideCardHeader}>
            <ShieldCheck size={18} className={styles.guideIcon} />
            <h3 className={styles.guideTitle}>Tips for Faster Support</h3>
          </div>
          <ul className={styles.checklist}>
            <li>
              <CheckCircle2 size={16} className={styles.checkIcon} />
              <div>
                <strong>Include reproduction steps:</strong> Explain what you clicked or sent, expected behavior, and actual result.
              </div>
            </li>
            <li>
              <CheckCircle2 size={16} className={styles.checkIcon} />
              <div>
                <strong>Sanitize sensitive tokens:</strong> Strip private API keys, bearer tokens, or company secrets from cURL or logs.
              </div>
            </li>
            <li>
              <CheckCircle2 size={16} className={styles.checkIcon} />
              <div>
                <strong>Provide system diagnostics:</strong> Copy the diagnostic report from the panel on the right.
              </div>
            </li>
            <li>
              <CheckCircle2 size={16} className={styles.checkIcon} />
              <div>
                <strong>Check existing GitHub issues:</strong> Your issue may already have an active fix or workaround.
              </div>
            </li>
          </ul>
        </section>

        {/* Diagnostics Box */}
        <section className={styles.diagCard}>
          <div className={styles.diagHeader}>
            <div className={styles.diagHeaderLeft}>
              <Info size={18} className={styles.diagIcon} />
              <h3 className={styles.diagTitle}>System Diagnostics</h3>
            </div>
            <div className={styles.diagHeaderActions}>
              <button
                type="button"
                className={styles.diagCopyBtn}
                onClick={handleCopyDiagnostics}
                title="Copy markdown diagnostics to clipboard"
              >
                {copiedDiag ? (
                  <>
                    <Check size={13} color="#4ade80" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy Info</span>
                  </>
                )}
              </button>
              <button
                type="button"
                className={styles.diagDownloadBtn}
                onClick={handleDownloadDiagnostics}
                title="Download full JSON diagnostics report"
              >
                <Download size={13} />
                <span>JSON</span>
              </button>
            </div>
          </div>

          <div className={styles.diagBody}>
            <div className={styles.diagRow}>
              <span className={styles.diagLabel}>Studio Version:</span>
              <span className={styles.diagValue}>v0.1.0</span>
            </div>
            <div className={styles.diagRow}>
              <span className={styles.diagLabel}>Active Theme:</span>
              <span className={styles.diagValue}>{theme}</span>
            </div>
            <div className={styles.diagRow}>
              <span className={styles.diagLabel}>Network Status:</span>
              <span className={styles.diagValue}>
                {isOnline ? (
                  <span className={styles.onlineBadge}>
                    <span className={styles.statusDotGreen} /> Online
                  </span>
                ) : (
                  <span className={styles.offlineBadge}>
                    <span className={styles.statusDotRed} /> Offline
                  </span>
                )}
              </span>
            </div>
            <div className={styles.diagRow}>
              <span className={styles.diagLabel}>Storage Quota:</span>
              <span className={styles.diagValue}>
                {storageEstimate
                  ? `${storageEstimate.usedMb} MB used (~${storageEstimate.quotaMb} MB max)`
                  : "IndexedDB + LocalStorage"}
              </span>
            </div>
            <div className={styles.diagRow}>
              <span className={styles.diagLabel}>Platform:</span>
              <span className={styles.diagValue}>{platform || "Browser"}</span>
            </div>
            <div className={styles.diagRow}>
              <span className={styles.diagLabel}>Browser Agent:</span>
              <span className={styles.diagValueTruncated} title={userAgent}>
                {userAgent || "Browser Client"}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
