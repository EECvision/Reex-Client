"use client";

import React, { useState } from "react";
import GenerateTemplateModal from "../GenerateTemplateModal/GenerateTemplateModal";
import styles from "./EmptyState.module.css";
import { Button } from "../ui/Button/Button";

interface EmptyStateProps {
  hasEndpoints: boolean;
  onImportClick: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  hasEndpoints,
  onImportClick,
}) => {
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  if (hasEndpoints) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📋</div>
        <h2 className={styles.emptyTitle}>No endpoint selected</h2>
        <p className={styles.emptyText}>
          Select an endpoint from the sidebar to start testing
        </p>
      </div>
    );
  }

  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIconLarge}></div>
      <h2 className={styles.emptyTitle}>Get Started</h2>
      <p className={styles.emptyDescription}>
        Import your API collection or generate modules using the CLI to begin
        testing your endpoints
      </p>

      <div className={styles.optionsContainer}>
        <div className={styles.optionCard}>
          <div className={styles.optionIcon}>📦</div>
          <h3 className={styles.optionTitle}>Import Collection</h3>
          <p className={styles.optionDescription}>
            Upload a Postman collection JSON file to automatically generate API
            modules
          </p>
          <Button onClick={onImportClick} variant="primary">
            Import Collection
          </Button>
        </div>

        <div className={styles.divider}>
          <span className={styles.dividerText}>OR</span>
        </div>

        <div className={styles.optionCard}>
          <div className={styles.optionIcon}>⚡</div>
          <h3 className={styles.optionTitle}>Generate Template</h3>
          <p className={styles.optionDescription}>
            Create a new API module template with CRUD operations for quick
            prototyping
          </p>
          <Button
            onClick={() => setShowGenerateModal(true)}
            variant="primary"
          >
            Generate Template
          </Button>
        </div>
      </div>

      <div className={styles.helpSection}>
        <p className={styles.helpText}>
          Need help?{" "}
          <a
            href="#"
            className={styles.helpLink}
            onClick={(e) => e.preventDefault()}
          >
            View Documentation
          </a>
        </p>
      </div>

      <GenerateTemplateModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onSuccess={(message) => {
          // Ideally we would trigger a refresh here but for now just close
          console.log(message);
          setShowGenerateModal(false);
        }}
      />
    </div>
  );
};

export default EmptyState;
