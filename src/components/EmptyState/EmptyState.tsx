"use client";

import React from "react";
import styles from "./EmptyState.module.css";
import { Button } from "../ui/Button/Button";
import { BookOpen, Folder, Plus } from "lucide-react";
import Logo from "../Logo/Logo";

import { HistoryItem, useProject } from "../../providers/ProjectContext";
import RecentCollectionsList from "./RecentCollectionsList";
import { useAuth } from "@/providers/AuthContext";
import { useState } from "react";
import { useRouter } from "next/navigation";
import LoginModal from "../LoginModal/LoginModal";

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
  onHistoryDelete
}) => {
  const { isStandaloneMode } = useProject();
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const router = useRouter();

  // Helper to check auth before action
  const handleAction = (action: () => void) => {
    if (isStandaloneMode && !isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    action();
  };

  if (hasEndpoints) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
                onClick={() => router.push('/docs')}
                className={styles.secondaryBtn}
              >
                <BookOpen size={16} />
                <span>Documentation</span>
              </Button>
            </div>
          </div>

          {/* Recent History */}
          {recentCollections && recentCollections.length > 0 && onHistoryClick && (
            <RecentCollectionsList
              items={recentCollections}
              onItemClick={(item) => {
                onHistoryClick(item);
              }}
              onDelete={onHistoryDelete}
            />
          )}
        </div>

        <div className={styles.footerCredits}>
          {/* <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Built by <a href="https://github.com/EECvision" target="_blank" rel="noopener noreferrer" className={styles.devLink}>EECvision</a>
          </div> */}
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            Powered by <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>ToolsHQ</span>
          </div>
        </div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="You need to be signed in to perform this action."
      />
    </>
  );
};

export default EmptyState;
