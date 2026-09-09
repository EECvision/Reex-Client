import { useAuth } from "@/providers/AuthContext";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Check,
  ChevronsUpDown,
  Code,
  Download,
  ExternalLink,
  Link,
  Loader2,
  Lock,
  Menu,
  MonitorPlay,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  TestTube,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import LoginModal from "../LoginModal/LoginModal";
import { BadgeGroup } from "../ui/BadgeGroup/BadgeGroup";
import { Button } from "../ui/Button/Button";
import { BaseUrlInput } from "./BaseUrlInput";
import styles from "./Navbar.module.css";

interface NavbarProps {
  selectedEndpoint: {
    apiKey: string;
    fnName: string;
  } | null;
  onImportClick: () => void;
  hasCollection: boolean;
  onDeleteClick: () => void;
  onFetchUrl: (url: string) => void;
  onOpenFetchModal?: () => void;
  onOpenPostmanModal?: () => void;
  isFetching: boolean;
  onGenerateClick?: () => void;
  baseURL?: string;
  projectPath?: string;
  collectionName?: string;
  onAuthClick?: () => void;
  isStandaloneMode?: boolean;
  manualStandaloneMode?: boolean;
  onToggleStandaloneMode?: () => void;
  onBaseUrlChange?: (url: string) => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  hasAuthConfigured?: boolean;
  onCodeSandboxClick?: () => void;
  onAssistantClick?: () => void;
  isAssistantOpen?: boolean;
  onSandboxClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({

  onImportClick,
  hasCollection,
  onDeleteClick,
  onFetchUrl,
  onOpenFetchModal,
  onOpenPostmanModal,
  isFetching,
  onGenerateClick,
  baseURL,
  projectPath,

  onAuthClick,
  isStandaloneMode = false,

  onToggleStandaloneMode,
  onBaseUrlChange,

  hasAuthConfigured,
  onCodeSandboxClick,
  onAssistantClick,
  isAssistantOpen,
  onSandboxClick,
}) => {
  const router = useRouter();
  const [url, setUrl] = React.useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("reex_docs_url") || "";
    }
    return "";
  });



  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const syncUrl = useCallback(() => {
    const stored = localStorage.getItem("reex_docs_url");
    if (stored !== null && stored !== url) {
      setUrl(stored);
    }
  }, [url]);

  // Reset mobile states when menu closes
  useEffect(() => {
    if (isMobileMenuOpen) {
      queueMicrotask(() => {
        syncUrl();
      });
    }
  }, [isMobileMenuOpen, syncUrl]);

  // Helper to format project path
  const formatProjectPath = (path?: string) => {
    if (!path) return "No Project";
    // Get last 2 parts of path for brevity
    const parts = path.split(/[\\/]/);
    if (parts.length > 2) {
      return `${parts[parts.length - 1]}`;
    }
    return path;
  };

  const formatUrlDomain = (urlStr: string) => {
    try {
      const parsed = new URL(urlStr);
      return parsed.hostname;
    } catch {
      return "URL";
    }
  };

  // We don't have direct access to isAuthActive here anymore, but could pass it as a prop
  // For now, we'll just show the Auth button clearly

  return (
    <nav className={styles.navbar}>
      <div className={styles.leftSection}>
        {/* Workspace Switcher */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <div
              data-tour="workspace-mode"
              className={styles.workspaceSwitcherTrigger}
              title={isStandaloneMode ? "Preview Mode" : projectPath}
            >
              <div className={styles.workspaceIconWrapper}>
                {isStandaloneMode ? (
                  <MonitorPlay size={16} />
                ) : (
                  <Code size={16} />
                )}
              </div>
              <div className={styles.workspaceTextColumn}>
                <span className={styles.workspaceTitle}>
                  {isStandaloneMode ? "Preview Mode" : "Dev Mode"}
                </span>
                <span className={styles.workspaceSub}>
                  {isStandaloneMode
                    ? "Standard API client"
                    : formatProjectPath(projectPath)}
                </span>
              </div>
              <ChevronsUpDown size={14} className={styles.workspaceChevron} />
            </div>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className={styles.workspaceDropdown}
              sideOffset={8}
              align="start"
            >
              <DropdownMenu.Item
                className={styles.workspaceOption}
                disabled={!projectPath}
                onClick={() => {
                  if (isStandaloneMode && onToggleStandaloneMode)
                    onToggleStandaloneMode();
                }}
              >
                <div className={styles.workspaceOptionIcon}>
                  <Code size={16} />
                </div>
                <div className={styles.workspaceOptionContent}>
                  <span className={styles.workspaceOptionTitle}>Dev Mode</span>
                  <span className={styles.workspaceOptionSub}>
                    {projectPath
                      ? "Connected to local codebase"
                      : "No project connected"}
                  </span>
                </div>
                <div className={styles.workspaceOptionCheck}>
                  {!isStandaloneMode && (
                    <Check size={16} className={styles.checkIcon} />
                  )}
                </div>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                className={styles.workspaceOption}
                onClick={() => {
                  if (!isStandaloneMode && onToggleStandaloneMode)
                    onToggleStandaloneMode();
                }}
              >
                <div className={styles.workspaceOptionIcon}>
                  <MonitorPlay size={16} />
                </div>
                <div className={styles.workspaceOptionContent}>
                  <span className={styles.workspaceOptionTitle}>
                    Preview Mode
                  </span>
                  <span className={styles.workspaceOptionSub}>
                    Standard API client
                  </span>
                </div>
                <div className={styles.workspaceOptionCheck}>
                  {isStandaloneMode && (
                    <Check size={16} className={styles.checkIcon} />
                  )}
                </div>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className={styles.workspaceSeparator} />

              <DropdownMenu.Item
                className={styles.workspaceOption}
                onClick={() =>
                  onSandboxClick ? onSandboxClick() : router.push("/sandbox")
                }
              >
                <div className={styles.workspaceOptionIcon}>
                  <TestTube size={16} />
                </div>
                <div className={styles.workspaceOptionContent}>
                  <span className={styles.workspaceOptionTitle}>
                    API Sandbox
                  </span>
                  <span className={styles.workspaceOptionSub}>
                    Build and test APIs
                  </span>
                </div>
                <div className={styles.workspaceOptionCheck}>
                  <ExternalLink size={14} className={styles.externalIcon} />
                </div>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <div data-tour="base-url">
          {onBaseUrlChange && isStandaloneMode && hasCollection ? (
            <div className={styles.baseUrlInputWrapper}>
              <span className={styles.baseUrlLabel}>BASE</span>
              <BaseUrlInput value={baseURL || ""} onChange={onBaseUrlChange} />
              <Pencil
                size={14}
                color="#9ca3af"
                style={{ marginRight: 8, opacity: 0.8 }}
              />
            </div>
          ) : (
            hasCollection &&
            baseURL && (
              <BadgeGroup label="BASE" value={baseURL || "No Base URL"} />
            )
          )}
        </div>
      </div>

      <div className={styles.rightSection}>
        {onCodeSandboxClick && isStandaloneMode && hasCollection && (
          <Button
            variant="ghost"
            onClick={onCodeSandboxClick}
            leftIcon={<Code size={16} />}
            title="Preview Generated SDK in CodeSandbox"
          >
            Sandbox
          </Button>
        )}

        {onAuthClick && hasCollection && (
          <div data-tour="auth" className={styles.actionGroup}>
            <Button
              variant="ghost"
              onClick={onAuthClick}
              leftIcon={
                <Lock
                  size={16}
                  color={hasAuthConfigured ? "#10b981" : undefined}
                />
              }
              title="Authorization Settings"
            >
              Auth
            </Button>
          </div>
        )}

        {hasCollection && <div className={styles.separator}></div>}

        {/* Add API Dropdown */}
        <DropdownMenu.Root
          onOpenChange={(open) => {
            if (open) syncUrl();
          }}
        >
          <DropdownMenu.Trigger asChild>
            <div data-tour="add-collection">
              <Button
                variant="ghost"
                leftIcon={
                  !isStandaloneMode && hasCollection ? (
                    <RefreshCw size={16} />
                  ) : (
                    <Plus size={16} />
                  )
                }
              >
                {!isStandaloneMode && hasCollection
                  ? "Update Collection"
                  : "Add Collection"}
              </Button>
            </div>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className={styles.dropdownMenu}
              sideOffset={5}
              align="end"
            >
              <DropdownMenu.Item
                className={styles.dropdownItem}
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowLoginModal(true);
                    return;
                  }
                  onImportClick();
                }}
              >
                <Download size={16} />
                Import File
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className={styles.dropdownItem}
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowLoginModal(true);
                    return;
                  }
                  if (url) {
                    onFetchUrl(url);
                  } else if (onOpenFetchModal) {
                    onOpenFetchModal();
                  }
                }}
              >
                {isFetching ? (
                  <Loader2 size={16} className={styles.spin} />
                ) : (
                  <Link size={16} />
                )}
                {url ? `Fetch from ${formatUrlDomain(url)}` : "Fetch from URL"}
              </DropdownMenu.Item>
              {onOpenPostmanModal && (
                <DropdownMenu.Item
                  className={styles.dropdownItem}
                  onClick={() => {
                    if (!isAuthenticated) {
                      setShowLoginModal(true);
                      return;
                    }
                    onOpenPostmanModal();
                  }}
                >
                  <Send size={16} />
                  Import from Postman
                </DropdownMenu.Item>
              )}
              {onGenerateClick && !isStandaloneMode && (
                <DropdownMenu.Item
                  className={styles.dropdownItem}
                  onClick={onGenerateClick}
                >
                  <Code size={16} />
                  Generate Module
                </DropdownMenu.Item>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* {hasCollection && (
          <Button
            variant="ghost"
            onClick={onDeleteClick}
            leftIcon={<Trash2 size={16} />}
            className={styles.deleteBtn}
          >
            Delete
          </Button>
        )} */}

        <div className={styles.separator}></div>

        {onAssistantClick && !isAssistantOpen && (
          <div data-tour="ask-docs">
            <Button
              variant="ghost"
              onClick={onAssistantClick}
              leftIcon={<Sparkles size={16} />}
              title="Ask Docs"
              className={styles.mobileAssistantBtn}
            >
              <span className={styles.hideOnMobile}>Ask Docs</span>
            </Button>
          </div>
        )}

        {/* Mobile Menu Toggle */}
        <Button
          variant="ghost"
          className={styles.mobileMenuBtn}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
        </Button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen &&
        isClient &&
        createPortal(
          <>
            <div
              className={styles.mobileOverlay}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className={styles.mobileMenu}>
              {onAuthClick && hasCollection && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    onAuthClick();
                    setIsMobileMenuOpen(false);
                  }}
                  leftIcon={
                    <Lock
                      size={16}
                      color={hasAuthConfigured ? "#10b981" : undefined}
                    />
                  }
                  style={{ justifyContent: "flex-start", width: "100%" }}
                >
                  Authorization Settings
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowLoginModal(true);
                    return;
                  }
                  if (url) {
                    onFetchUrl(url);
                  } else if (onOpenFetchModal) {
                    onOpenFetchModal();
                  }
                  setIsMobileMenuOpen(false);
                }}
                leftIcon={
                  isFetching ? (
                    <Loader2 size={16} className={styles.spin} />
                  ) : (
                    <Link size={16} />
                  )
                }
                style={{ justifyContent: "flex-start", width: "100%" }}
              >
                {url ? `Fetch from ${formatUrlDomain(url)}` : "Fetch from URL"}
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowLoginModal(true);
                    return;
                  }
                  onImportClick();
                  setIsMobileMenuOpen(false);
                }}
                leftIcon={<Download size={16} />}
                style={{ justifyContent: "flex-start", width: "100%" }}
              >
                Import File
              </Button>

              {onGenerateClick && !isStandaloneMode && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    onGenerateClick();
                    setIsMobileMenuOpen(false);
                  }}
                  leftIcon={<Plus size={16} />}
                  style={{ justifyContent: "flex-start", width: "100%" }}
                >
                  Generate Module
                </Button>
              )}

              {hasCollection && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    onDeleteClick();
                    setIsMobileMenuOpen(false);
                  }}
                  leftIcon={<Trash2 size={16} />}
                  style={{
                    justifyContent: "flex-start",
                    width: "100%",
                    color: "#ef4444",
                  }}
                >
                  Delete Collection
                </Button>
              )}
            </div>
          </>,
          document.body,
        )}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="You need to be signed in to import or update a collection."
      />
    </nav>
  );
};

export default Navbar;
