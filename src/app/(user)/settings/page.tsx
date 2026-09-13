"use client";

import styles from "./settings.module.css";
import {
  useSettings,
  type ThemeType,
  type ViewPreferenceType,
} from "@/providers/SettingsContext";

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
  return (
    <main className={styles.container}>
      <h1 className={styles.pageTitle}>Workspace settings</h1>
      <div className={styles.content}>
        <section className={styles.card}>
          <div className={styles.cardContent}>
            <h2 className={styles.cardTitle}>
              <label htmlFor="workspace-theme">Appearance</label>
            </h2>
            <p className={styles.cardDescription}>
              Choose the theme for this browser.
            </p>
            <select
              id="workspace-theme"
              className={styles.input}
              value={theme}
              onChange={(event) => setTheme(event.target.value as ThemeType)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
        </section>
        <section className={styles.card}>
          <div className={styles.cardContent}>
            <h2 className={styles.cardTitle}>
              <label htmlFor="response-view">Default response view</label>
            </h2>
            <p className={styles.cardDescription}>
              Choose how API responses are displayed.
            </p>
            <select
              id="response-view"
              className={styles.input}
              value={viewPreference}
              onChange={(event) =>
                setViewPreference(event.target.value as ViewPreferenceType)
              }
            >
              <option value="json">JSON</option>
              <option value="raw">Raw</option>
              <option value="pretty">Pretty</option>
            </select>
          </div>
          <div className={styles.cardFooter}>
            <label>
              <input
                type="checkbox"
                checked={unwrapResponseData}
                onChange={(event) =>
                  setUnwrapResponseData(event.target.checked)
                }
              />{" "}
              Unwrap the response data field
            </label>
          </div>
        </section>
        <section className={styles.card}>
          <div className={styles.cardContent}>
            <h2 className={styles.cardTitle}>
              <label htmlFor="tab-behavior">Tab behavior</label>
            </h2>
            <p id="tab-behavior-description" className={styles.cardDescription}>
              Preview mode reuses one unpinned tab when you open another
              endpoint. Double-click an endpoint or its tab, or press Ctrl+S
              (Cmd+S on Mac), to pin it and keep it open. This setting applies
              to newly opened tabs.
            </p>
            <select
              id="tab-behavior"
              aria-describedby="tab-behavior-description"
              className={styles.input}
              value={pinTabsByDefault ? "pinned" : "preview"}
              onChange={(event) =>
                setPinTabsByDefault(event.target.value === "pinned")
              }
            >
              <option value="pinned">Pin tabs by default</option>
              <option value="preview">Preview tabs until pinned</option>
            </select>
          </div>
        </section>
        <section className={styles.card}>
          <div className={styles.cardContent}>
            <h2 className={styles.cardTitle}>Local storage</h2>
            <p className={styles.cardDescription}>
              Collections, saved requests, and history stay in this browser.
              Clearing this site&apos;s browser data removes them. Your
              preferences save automatically.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
