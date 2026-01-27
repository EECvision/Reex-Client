"use client";

import React from "react";
import styles from "./EmptyState.module.css";
import { Button } from "../ui/Button/Button";
import { BookIcon, BookOpen, Folder, Plus } from "lucide-react";
import Logo from "../Logo/Logo";

interface EmptyStateProps {
  hasEndpoints: boolean;
  onImportClick: () => void;
  onGenerateClick?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  hasEndpoints,
  onImportClick,
  onGenerateClick,
}) => {
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
    <div className={styles.container}>
      {/* Logo & Branding */}
      <div className={styles.header}>
        <Logo size="lg" />
      </div>

      {/* Primary Actions */}
      <div className={styles.actions}>
        <Button
          variant="primary"
          onClick={onImportClick}
          className={styles.primaryBtn}
          leftIcon={
            <Folder size={16} />
          }
        >
          Import Collection
        </Button>

        <div className={styles.secondaryActions}>
          {onGenerateClick && (
            <Button
              variant="secondary"
              onClick={onGenerateClick}
              className={styles.secondaryBtn}
            >
              <Plus size={16} /> Generate Template
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => window.open("https://docs.reexapi.com", "_blank")}
            className={styles.secondaryBtn}
            leftIcon={
              <BookOpen size={16} />
            }
          >
            View Documentation
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
