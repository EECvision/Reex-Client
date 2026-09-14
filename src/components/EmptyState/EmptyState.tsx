"use client";

import React from "react";
import styles from "./EmptyState.module.css";
import { Button } from "../ui/Button/Button";
import { BookOpen, Folder, Plus } from "lucide-react";
import Logo from "../Logo/Logo";

import { HistoryItem, useProject } from "../../providers/ProjectContext";
import RecentCollectionsList from "./RecentCollectionsList";
import { DOCS_URL } from "@/config/links";
import WelcomeCard from "../WelcomeCard/WelcomeCard";

interface EmptyStateProps {
  hasEndpoints: boolean;
  onImportClick: () => void;
  onGenerateClick?: () => void;
  recentCollections?: HistoryItem[];
  onHistoryClick?: (item: HistoryItem) => void;
  onHistoryDelete?: (id: string) => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  hasEndpoints,
  onImportClick,
  onGenerateClick,
  recentCollections,
  onHistoryClick,
  onHistoryDelete,
}) => {
  const { isStandaloneMode } = useProject();

  const handleAction = (action: () => void) => {
    action();
  };

  const hasRecentCollections =
    recentCollections && recentCollections.length > 0;

  if (hasEndpoints) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M15 15l6 6m-11-4a7 7 0 110-14 7 7 0 010 14z" />
          </svg>
        </div>
        <h2 className={styles.emptyTitle}>Select an Endpoint</h2>
        <p className={styles.emptyText}>
          Choose an endpoint from the sidebar to start testing your API
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.wrapper}>
        <div className={styles.container}>
          {!hasRecentCollections && isStandaloneMode ? (
            <WelcomeCard onImportClick={() => handleAction(onImportClick)} />
          ) : (
            <>
              {/* Logo & Branding */}
              <div className={styles.header}>
                <Logo horizontal />
              </div>

              {/* Primary Actions */}
              <div className={styles.actions}>
                <Button
                  variant="primary"
                  onClick={() => handleAction(onImportClick)}
                  className={styles.primaryBtn}
                  leftIcon={<Folder size={18} />}
                >
                  Import Collection
                </Button>

                <div className={styles.secondaryActions}>
                  {onGenerateClick && (
                    <Button
                      variant="secondary"
                      onClick={() => handleAction(onGenerateClick)}
                      className={styles.secondaryBtn}
                    >
                      <Plus size={16} />
                      <span>New Template</span>
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => window.location.assign(DOCS_URL)}
                    className={styles.secondaryBtn}
                  >
                    <BookOpen size={16} />
                    <span>Documentation</span>
                  </Button>
                </div>
              </div>

              {/* Recent History */}
              {recentCollections &&
                recentCollections.length > 0 &&
                onHistoryClick && (
                  <RecentCollectionsList
                    items={recentCollections}
                    onItemClick={(item) => {
                      onHistoryClick(item);
                    }}
                    onDelete={onHistoryDelete}
                  />
                )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default EmptyState;
