import React from "react";
import styles from "./TestApiNavbar.module.css";
import { Button } from "../ui/Button/Button";
import { Plus, TestTube, Lock, Pencil, BookOpen } from "lucide-react";
import { BaseUrlInput } from "../Navbar/BaseUrlInput";
import { Collection } from "../TestApi/CollectionSidebar";

interface TestApiNavbarProps {
  onAddCollection: () => void;
  activeCollection?: Collection | null;
  onBaseUrlChange?: (url: string) => void;
  onAuthClick?: () => void;
  onAskDocsClick?: () => void;
  isAssistantOpen?: boolean;
}

export default function TestApiNavbar({
  onAddCollection,
  activeCollection,
  onBaseUrlChange,
  onAuthClick,
  onAskDocsClick,
  isAssistantOpen,
}: TestApiNavbarProps) {
  const hasAuthConfigured =
    activeCollection?.auth && activeCollection.auth.type !== "none";

  return (
    <nav className={styles.navbar}>
      <div className={styles.leftSection}>
        <div className={styles.workspaceSwitcherTrigger} title="API Sandbox">
          <div className={styles.workspaceIconWrapper}>
            <TestTube size={16} />
          </div>
          <div className={styles.workspaceTextColumn}>
            <span className={styles.workspaceTitle}>API Sandbox</span>
            <span className={styles.workspaceSub}>Build and test APIs</span>
          </div>
        </div>

        {activeCollection && (
          <div className={styles.baseUrlInputWrapper}>
            <span className={styles.baseUrlLabel}>BASE</span>
            <BaseUrlInput
              value={activeCollection?.base_url || ""}
              onChange={onBaseUrlChange || (() => {})}
            />
            <Pencil
              size={14}
              color="#9ca3af"
              style={{ marginRight: 8, opacity: 0.8 }}
            />
          </div>
        )}
      </div>

      <div className={styles.rightSection}>
        <div className={styles.actionGroup}>
          <Button
            variant="ghost"
            leftIcon={
              <Lock
                size={16}
                color={hasAuthConfigured ? "#10b981" : undefined}
              />
            }
            onClick={onAuthClick}
            disabled={!onAuthClick}
            title="Authorization Settings"
          >
            Auth
          </Button>
        </div>

        <div className={styles.separator}></div>

        <Button
          variant="ghost"
          onClick={onAddCollection}
          leftIcon={<Plus size={16} />}
        >
          Add Collection
        </Button>

        {onAskDocsClick && !isAssistantOpen && (
          <>
            <div className={styles.separator}></div>

            <Button
              variant="ghost"
              onClick={onAskDocsClick}
              leftIcon={<BookOpen size={16} />}
              title="Docs"
              className={styles.mobileAssistantBtn}
            >
              <span className={styles.hideOnMobile}>Docs</span>
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
