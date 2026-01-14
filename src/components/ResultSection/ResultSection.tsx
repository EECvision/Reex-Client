/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import styles from "./ResultSection.module.css";
import { Button } from "../ui/Button/Button";

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
  return (
    <div className={styles.resultsSection}>
      <h2 className={styles.resultsTitle}>Results</h2>
      {error && (
        <div className={styles.errorBox}>
          <strong className={styles.errorTitle}>✗ Error</strong>
          <pre className={styles.errorText}>{error}</pre>
        </div>
      )}
      {result && (
        <div className={styles.splitView}>
          <div className={styles.resultBox}>
            <div className={styles.resultHeader}>
              <strong className={styles.resultTitle}>✓ Response</strong>
              <Button onClick={onCopy} className={styles.copyButton} variant="secondary" size="sm">
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <pre className={styles.resultContent}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>

          <div className={styles.resultBox}>
            <div className={styles.resultHeader}>
              <strong className={styles.resultTitle}>TypeScript Interface</strong>
              {interfacePreview && (
                <Button
                  onClick={onUpdateInterface}
                  disabled={updatingInterface}
                  isLoading={updatingInterface}
                  variant="primary"
                  size="sm"
                  className={styles.updateButton}
                >
                  Update Interface
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
          <p className={styles.emptyResultsText}>
            Results will appear here after sending a request
          </p>
        </div>
      )}
    </div>
  );
};

export default ResultSection;
