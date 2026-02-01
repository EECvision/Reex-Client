/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import styles from "./ResultSection.module.css";
import { Button } from "../ui/Button/Button";
import { useSettings, ViewPreferenceType } from "@/providers/SettingsContext";
import { FileJson, FileText, Code } from "lucide-react";

const VIEW_OPTIONS: { value: ViewPreferenceType; label: string; icon: React.ReactNode }[] = [
  { value: "json", label: "JSON", icon: <FileJson size={14} /> },
  { value: "raw", label: "Raw", icon: <FileText size={14} /> },
  { value: "pretty", label: "Pretty", icon: <Code size={14} /> },
];

interface ResultSectionProps {
  error: string | null;
  result: any;
  copied: boolean;
  onCopy: () => void;
  interfacePreview: string | null;
  onUpdateInterface: () => void;
  updatingInterface: boolean;
}

const ResultSection: React.FC<ResultSectionProps> = ({
  error,
  result,
  copied,
  onCopy,
  interfacePreview,
  onUpdateInterface,
  updatingInterface,
}) => {
  const { viewPreference, setViewPreference } = useSettings();

  const formatResult = (data: any): string => {
    switch (viewPreference) {
      case "raw":
        return typeof data === "string" ? data : JSON.stringify(data);
      case "pretty":
        return JSON.stringify(data, null, 4);
      case "json":
      default:
        return JSON.stringify(data, null, 2);
    }
  };

  return (
    <div className={styles.resultsSection}>
      <div className={styles.responseHeader}>
        <h2 className={styles.resultsTitle}>
          <svg className={styles.titleIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Response
        </h2>

        {/* Format Toggle */}
        <div className={styles.formatToggle}>
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`${styles.formatButton} ${viewPreference === option.value ? styles.formatButtonActive : ""}`}
              onClick={() => setViewPreference(option.value)}
              title={option.label}
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <strong className={styles.errorTitle}>
            <svg className={styles.errorIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            Request Failed
          </strong>
          <pre className={styles.errorText}>{error}</pre>
        </div>
      )}

      {result && (
        <div className={styles.splitView}>
          <div className={styles.resultBox}>
            <div className={styles.resultHeader}>
              <strong className={styles.resultTitle}>
                <svg className={styles.successIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                JSON Response
              </strong>
              <Button onClick={onCopy} className={styles.copyButton} variant="secondary" size="sm">
                {copied ? "✓ Copied" : "Copy"}
              </Button>
            </div>
            <pre className={styles.resultContent}>
              {formatResult(result)}
            </pre>
          </div>

          <div className={styles.resultBox}>
            <div className={styles.resultHeader}>
              <strong className={styles.resultTitle}>
                <svg className={styles.codeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                TypeScript Interface
              </strong>
              {interfacePreview && (
                <Button
                  onClick={onUpdateInterface}
                  disabled={updatingInterface}
                  isLoading={updatingInterface}
                  variant="primary"
                  size="sm"
                  className={styles.updateButton}
                >
                  Save Interface
                </Button>
              )}
            </div>
            <pre className={styles.resultContent}>
              {interfacePreview || "Generating preview..."}
            </pre>
          </div>
        </div>
      )}

      {!error && !result && (
        <div className={styles.emptyResults}>
          <svg className={styles.emptyResultsIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          <p className={styles.emptyResultsText}>
            Results will appear here after sending a request
          </p>
        </div>
      )}
    </div>
  );
};

export default ResultSection;

