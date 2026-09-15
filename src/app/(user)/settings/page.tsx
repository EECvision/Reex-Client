"use client";

import React, { useState, useEffect } from "react";
import styles from "./settings.module.css";
import {
  useSettings,
  type ThemeType,
  type ViewPreferenceType,
} from "@/providers/SettingsContext";
import { collectionStorage } from "@/services/collectionStorage";
import {
  Moon,
  Sun,
  Monitor,
  Code2,
  FileText,
  Sparkles,
  Check,
  Pin,
  Eye,
  Database,
  ShieldCheck,
  Layers,
  Keyboard,
} from "lucide-react";

type FilterTab = "all" | "appearance" | "response" | "tabs" | "storage" | "shortcuts";

export default function SettingsPage() {
  const {
    pinTabsByDefault,
    setPinTabsByDefault,
    theme,
    setTheme,
    viewPreference,
    setViewPreference,
    unwrapResponseData,
    setUnwrapResponseData,
  } = useSettings();

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [storageInfo, setStorageInfo] = useState<{
    usedBytes: number;
    totalBytes: number;
    collectionCount: number;
  }>({
    usedBytes: 0,
    totalBytes: 0,
    collectionCount: 0,
  });

  const refreshStorage = () => {
    if (typeof window === "undefined") return;

    Promise.all([
      navigator.storage && navigator.storage.estimate
        ? navigator.storage.estimate()
        : Promise.resolve(null),
      collectionStorage.getCollections().catch(() => []),
    ])
      .then(([estimate, collections]) => {
        setStorageInfo({
          usedBytes: estimate?.usage || 0,
          totalBytes: estimate?.quota || 0,
          collectionCount: collections?.length || 0,
        });
      })
      .catch((err) => {
        console.warn("[Settings] Storage estimate failed:", err);
      });
  };

  useEffect(() => {
    refreshStorage();
  }, []);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };



  const themesList: {
    id: ThemeType;
    label: string;
    desc: string;
    icon: typeof Moon;
    windowClass: string;
  }[] = [
    {
      id: "dark",
      label: "Dark Theme",
      desc: "Sleek dark interface designed for low light and contrast",
      icon: Moon,
      windowClass: styles.windowDark,
    },
    {
      id: "light",
      label: "Light Theme",
      desc: "Clean, bright palette with high readability in well-lit spaces",
      icon: Sun,
      windowClass: styles.windowLight,
    },
    {
      id: "system",
      label: "System Preference",
      desc: "Automatically matches your operating system theme",
      icon: Monitor,
      windowClass: styles.windowSystem,
    },
  ];

  const responseModes: {
    id: ViewPreferenceType;
    label: string;
    desc: string;
    icon: typeof Code2;
  }[] = [
    {
      id: "json",
      label: "JSON Tree",
      desc: "Syntax-highlighted interactive JSON object inspector",
      icon: Code2,
    },
    {
      id: "raw",
      label: "Raw Text",
      desc: "Unformatted string payload, ideal for raw outputs and logs",
      icon: FileText,
    },
    {
      id: "pretty",
      label: "Pretty Print",
      desc: "Indented, human-readable clean monospace formatting",
      icon: Sparkles,
    },
  ];

  const quotaPercent =
    storageInfo.totalBytes > 0
      ? Math.min(
          100,
          Math.max(1, (storageInfo.usedBytes / storageInfo.totalBytes) * 100)
        )
      : 1;

  const shouldShow = (tab: FilterTab) => activeTab === "all" || activeTab === tab;

  return (
    <main className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Workspace Settings</h1>
        <p className={styles.pageSubtitle}>
          Configure your interface appearance, response viewer, workspace tab
          behavior, and local browser storage.
        </p>
      </header>

      {/* Filter Tabs */}
      <nav className={styles.filterBar} aria-label="Settings Categories">
        <button
          className={`${styles.filterBtn} ${activeTab === "all" ? styles.filterBtnActive : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All Settings
        </button>
        <button
          className={`${styles.filterBtn} ${activeTab === "appearance" ? styles.filterBtnActive : ""}`}
          onClick={() => setActiveTab("appearance")}
        >
          <Moon size={14} />
          <span>Appearance</span>
        </button>
        <button
          className={`${styles.filterBtn} ${activeTab === "response" ? styles.filterBtnActive : ""}`}
          onClick={() => setActiveTab("response")}
        >
          <Code2 size={14} />
          <span>Response & Editor</span>
        </button>
        <button
          className={`${styles.filterBtn} ${activeTab === "tabs" ? styles.filterBtnActive : ""}`}
          onClick={() => setActiveTab("tabs")}
        >
          <Layers size={14} />
          <span>Tabs & Workflow</span>
        </button>
        <button
          className={`${styles.filterBtn} ${activeTab === "storage" ? styles.filterBtnActive : ""}`}
          onClick={() => setActiveTab("storage")}
        >
          <Database size={14} />
          <span>Storage & Privacy</span>
        </button>
        <button
          className={`${styles.filterBtn} ${activeTab === "shortcuts" ? styles.filterBtnActive : ""}`}
          onClick={() => setActiveTab("shortcuts")}
        >
          <Keyboard size={14} />
          <span>Shortcuts</span>
        </button>
      </nav>

      <div className={styles.sectionsStack}>
        {/* Appearance Section */}
        {shouldShow("appearance") && (
          <section className={styles.settingSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderLeft}>
                <Moon className={styles.sectionIcon} size={20} />
                <div>
                  <h2 className={styles.sectionTitle}>Appearance</h2>
                  <p className={styles.sectionDescription}>
                    Customize the visual theme and contrast mode for your workspace.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.sectionBody}>
              <div className={styles.themeGrid}>
                {themesList.map((t) => {
                  const Icon = t.icon;
                  const isActive = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`${styles.themeCard} ${isActive ? styles.themeCardActive : ""}`}
                      onClick={() => setTheme(t.id)}
                      aria-pressed={isActive}
                    >
                      <div className={`${styles.themePreviewWindow} ${t.windowClass}`}>
                        <div className={styles.previewHeader}>
                          <span className={styles.previewDot} />
                          <span className={styles.previewDot} />
                          <span className={styles.previewDot} />
                        </div>
                        <div className={styles.previewBody}>
                          <div className={styles.previewSidebar} />
                          <div className={styles.previewContent}>
                            <div className={styles.previewLine} />
                            <div className={`${styles.previewLine} ${styles.previewLineShort}`} />
                            <div className={styles.previewLine} />
                          </div>
                        </div>
                      </div>

                      <div className={styles.themeCardMeta}>
                        <div className={styles.themeCardTitleRow}>
                          <Icon size={16} />
                          <span>{t.label}</span>
                        </div>
                        {isActive && (
                          <span className={styles.activeCheckPill}>
                            <Check size={12} /> Active
                          </span>
                        )}
                      </div>
                      <p className={styles.themeCardDescription}>{t.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Response & Editor Section */}
        {shouldShow("response") && (
          <section className={styles.settingSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderLeft}>
                <Code2 className={styles.sectionIcon} size={20} />
                <div>
                  <h2 className={styles.sectionTitle}>Response & Editor</h2>
                  <p className={styles.sectionDescription}>
                    Configure how API responses and payload inspection views are formatted.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.sectionBody}>
              <div className={styles.optionsRow}>
                {responseModes.map((mode) => {
                  const Icon = mode.icon;
                  const isActive = viewPreference === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ""}`}
                      onClick={() => setViewPreference(mode.id)}
                      aria-pressed={isActive}
                    >
                      <div className={styles.optionCardHeader}>
                        <span className={styles.optionCardTitle}>
                          <Icon size={16} />
                          <span>{mode.label}</span>
                        </span>
                        {isActive && (
                          <span className={styles.activeCheckPill}>
                            <Check size={12} /> Active
                          </span>
                        )}
                      </div>
                      <p className={styles.optionCardDesc}>{mode.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* Unwrap Data Toggle Card */}
              <div className={styles.toggleCard}>
                <div className={styles.toggleRow}>
                  <div className={styles.toggleInfo}>
                    <span className={styles.toggleLabel}>
                      Unwrap Response Data Field
                    </span>
                    <p className={styles.toggleDesc}>
                      Automatically extract the payload when endpoints wrap response bodies in a top-level &quot;data&quot; envelope.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={unwrapResponseData}
                    className={`${styles.switchButton} ${unwrapResponseData ? styles.switchButtonActive : ""}`}
                    onClick={() => setUnwrapResponseData(!unwrapResponseData)}
                  >
                    <span className={styles.switchThumb} />
                  </button>
                </div>

                {/* Live Comparison Preview Box */}
                <div className={styles.unwrapPreviewBox}>
                  <div className={styles.previewLabelRow}>
                    <span className={styles.previewHintText}>Live Output Preview:</span>
                    <span
                      className={`${styles.previewStatusBadge} ${
                        unwrapResponseData
                          ? styles.previewStatusBadgeOn
                          : styles.previewStatusBadgeOff
                      }`}
                    >
                      {unwrapResponseData ? "Unwrapped (Direct Payload)" : "Enveloped (Standard)"}
                    </span>
                  </div>
                  <pre className={styles.codeSnippet}>
                    {unwrapResponseData
                      ? '{\n  "users": [\n    { "id": 1, "name": "Alice" }\n  ]\n}'
                      : '{\n  "status": 200,\n  "data": {\n    "users": [\n      { "id": 1, "name": "Alice" }\n    ]\n  }\n}'}
                  </pre>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tab Behavior Section */}
        {shouldShow("tabs") && (
          <section className={styles.settingSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderLeft}>
                <Layers className={styles.sectionIcon} size={20} />
                <div>
                  <h2 className={styles.sectionTitle}>Tab & Navigation Workflow</h2>
                  <p className={styles.sectionDescription}>
                    Control how endpoints and query editors are handled in the tab bar.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.sectionBody}>
              <div className={styles.tabsGrid}>
                {/* Preview Mode */}
                <button
                  type="button"
                  className={`${styles.tabCard} ${!pinTabsByDefault ? styles.tabCardActive : ""}`}
                  onClick={() => setPinTabsByDefault(false)}
                  aria-pressed={!pinTabsByDefault}
                >
                  <div className={styles.tabCardHeader}>
                    <span className={styles.tabCardTitle}>
                      <Eye size={16} />
                      <span>Preview Mode (Recommended)</span>
                    </span>
                    {!pinTabsByDefault && (
                      <span className={styles.activeCheckPill}>
                        <Check size={12} /> Active
                      </span>
                    )}
                  </div>
                  <p className={styles.tabCardDesc}>
                    Reuses a single unpinned tab as you browse endpoints in the sidebar. Keeps your tab bar tidy without accumulating unused tabs.
                  </p>
                  <span className={styles.tabShortcutTag}>
                    Double-click or Ctrl+S to pin
                  </span>
                </button>

                {/* Pin Tabs by Default */}
                <button
                  type="button"
                  className={`${styles.tabCard} ${pinTabsByDefault ? styles.tabCardActive : ""}`}
                  onClick={() => setPinTabsByDefault(true)}
                  aria-pressed={pinTabsByDefault}
                >
                  <div className={styles.tabCardHeader}>
                    <span className={styles.tabCardTitle}>
                      <Pin size={16} />
                      <span>Pin Tabs by Default</span>
                    </span>
                    {pinTabsByDefault && (
                      <span className={styles.activeCheckPill}>
                        <Check size={12} /> Active
                      </span>
                    )}
                  </div>
                  <p className={styles.tabCardDesc}>
                    Every endpoint you select opens in its own permanent tab. Request parameters and states remain preserved across tab switches.
                  </p>
                  <span className={styles.tabShortcutTag}>
                    Every click opens permanent tab
                  </span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Storage & Privacy Section */}
        {shouldShow("storage") && (
          <section className={styles.settingSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderLeft}>
                <Database className={styles.sectionIcon} size={20} />
                <div>
                  <h2 className={styles.sectionTitle}>Browser Storage & Privacy</h2>
                  <p className={styles.sectionDescription}>
                    Monitor local database quota, export workspace backups, and manage local data.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.sectionBody}>
              {/* Privacy Banner */}
              <div className={styles.privacyBanner}>
                <ShieldCheck className={styles.privacyBannerIcon} size={20} />
                <p className={styles.privacyBannerText}>
                  <strong>100% Offline & Private:</strong> Your saved collections, request history, and workspace preferences stay exclusively in this browser&apos;s IndexedDB and localStorage. No credentials or requests are ever transferred to external cloud databases.
                </p>
              </div>

              {/* Diagnostic Metrics Grid */}
              <div className={styles.storageStatsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Database Status</span>
                  <span className={styles.statValue}>Connected</span>
                  <span className={styles.statSubtext}>IndexedDB (reex_app_storage)</span>
                </div>

                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Estimated Usage</span>
                  <span className={styles.statValue}>
                    {formatBytes(storageInfo.usedBytes)}
                  </span>
                  <span className={styles.statSubtext}>
                    of ~{formatBytes(storageInfo.totalBytes || 1024 * 1024 * 1024 * 50)}
                  </span>
                </div>

                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Sandbox Collections</span>
                  <span className={styles.statValue}>{storageInfo.collectionCount}</span>
                  <span className={styles.statSubtext}>Saved in API Sandbox</span>
                </div>

                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Sync Mode</span>
                  <span className={styles.statValue}>Local Reactive</span>
                  <span className={styles.statSubtext}>useSyncExternalStore</span>
                </div>
              </div>

              {/* Quota Progress Bar */}
              <div className={styles.quotaSection}>
                <div className={styles.quotaLabelRow}>
                  <span>Browser Storage Quota</span>
                  <span>{formatBytes(storageInfo.usedBytes)} used</span>
                </div>
                <div className={styles.quotaProgressBar}>
                  <div
                    className={styles.quotaProgressFill}
                    style={{ width: `${quotaPercent}%` }}
                  />
                </div>
              </div>


            </div>
          </section>
        )}

        {/* Keyboard Shortcuts Section */}
        {shouldShow("shortcuts") && (
          <section className={styles.settingSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderLeft}>
                <Keyboard className={styles.sectionIcon} size={20} />
                <div>
                  <h2 className={styles.sectionTitle}>Workspace Keyboard Shortcuts</h2>
                  <p className={styles.sectionDescription}>
                    Quick key bindings to speed up your API testing and navigation workflow.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.sectionBody}>
              <div className={styles.shortcutsGrid}>
                <div className={styles.shortcutItem}>
                  <span className={styles.shortcutLabel}>Pin / Unpin Active Tab</span>
                  <div className={styles.keyGroup}>
                    <kbd className={styles.kbd}>Ctrl</kbd>
                    <span className={styles.keyPlus}>+</span>
                    <kbd className={styles.kbd}>S</kbd>
                  </div>
                </div>

                <div className={styles.shortcutItem}>
                  <span className={styles.shortcutLabel}>Send API Request</span>
                  <div className={styles.keyGroup}>
                    <kbd className={styles.kbd}>Ctrl</kbd>
                    <span className={styles.keyPlus}>+</span>
                    <kbd className={styles.kbd}>Enter</kbd>
                  </div>
                </div>

                <div className={styles.shortcutItem}>
                  <span className={styles.shortcutLabel}>Dismiss Side Modals / Menus</span>
                  <div className={styles.keyGroup}>
                    <kbd className={styles.kbd}>Esc</kbd>
                  </div>
                </div>

                <div className={styles.shortcutItem}>
                  <span className={styles.shortcutLabel}>Permanent Tab Creation</span>
                  <div className={styles.keyGroup}>
                    <kbd className={styles.kbd}>Double Click Tab</kbd>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

