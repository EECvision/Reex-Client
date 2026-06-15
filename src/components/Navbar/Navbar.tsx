import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Navbar.module.css";
import { Button } from "../ui/Button/Button";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Download, Plus, Trash2, FileText, Loader2, Folder, Lock, X, Pencil, Menu, PanelLeft, Code, Link } from "lucide-react";
import { BadgeGroup } from "../ui/BadgeGroup/BadgeGroup";
import UserMenu from "../UserMenu/UserMenu";
import { BaseUrlInput } from "./BaseUrlInput";

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
  isFetching: boolean;
  onGenerateClick?: () => void;
  baseURL?: string;
  projectPath?: string;
  collectionName?: string;
  onAuthClick?: () => void;
  isStandaloneMode?: boolean;
  onBaseUrlChange?: (url: string) => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  hasAuthConfigured?: boolean;
  onCodeSandboxClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  selectedEndpoint,
  onImportClick,
  hasCollection,
  onDeleteClick,
  onFetchUrl,
  onOpenFetchModal,
  isFetching,
  onGenerateClick,
  baseURL,
  projectPath,
  collectionName,
  onAuthClick,
  isStandaloneMode = false,
  onBaseUrlChange,
  onToggleSidebar,
  isSidebarOpen,
  hasAuthConfigured,
  onCodeSandboxClick
}) => {
  const [url, setUrl] = React.useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("docs_url") || "";
    }
    return "";
  });
  
  const [isMobileAuthOpen, setIsMobileAuthOpen] = React.useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Reset mobile states when menu closes
  useEffect(() => {
    if (!isMobileMenuOpen) {
      setIsMobileAuthOpen(false);
    } else {
      syncUrl();
    }
  }, [isMobileMenuOpen]);

  const syncUrl = () => {
    const stored = localStorage.getItem("docs_url");
    if (stored !== null && stored !== url) {
      setUrl(stored);
    }
  };

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
        {onToggleSidebar && hasCollection && (
          <Button
            variant="ghost"
            className={styles.sidebarToggle}
            onClick={onToggleSidebar}
          >
            <PanelLeft size={16} />
          </Button>
        )}

        {/* Project Context - Unique Design */}
        {isStandaloneMode ? (
          <div className={styles.projectContainer} title="Not connected to a project">
            <Folder size={18} className={styles.projectIcon} strokeWidth={2} />
            <span style={{ color: '#f59e0b' }}>Preview</span>
          </div>
        ) : (
          <div className={styles.projectContainer} title={projectPath}>
            <Folder size={18} className={styles.projectIcon} strokeWidth={2} />
            <span>{formatProjectPath(projectPath)}</span>
          </div>
        )}

        {onBaseUrlChange && isStandaloneMode && hasCollection ? (
          <div className={styles.baseUrlInputWrapper}>
            <span className={styles.baseUrlLabel}>BASE</span>
            <BaseUrlInput
              value={baseURL || ""}
              onChange={onBaseUrlChange}
            />
            <Pencil size={14} color="#9ca3af" style={{ marginRight: 8, opacity: 0.8 }} />
          </div>
        ) : (
          hasCollection && baseURL && (
            <BadgeGroup
              label="BASE"
              value={baseURL || "No Base URL"}
            />
          )
        )}
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
          <div className={styles.actionGroup}>
            <Button
              variant="ghost"
              onClick={onAuthClick}
              leftIcon={<Lock size={16} color={hasAuthConfigured ? "#10b981" : undefined} />}
              title="Authorization Settings"
            >
              Auth
            </Button>
          </div>
        )}

        {hasCollection && <div className={styles.separator}></div>}

        {/* Add API Dropdown */}
        <DropdownMenu.Root onOpenChange={(open) => { if (open) syncUrl(); }}>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" leftIcon={<Plus size={16} />}>
              Add Collection
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className={styles.dropdownMenu} sideOffset={5} align="end">
              <DropdownMenu.Item className={styles.dropdownItem} onClick={onImportClick}>
                <Download size={16} />
                Import File
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className={styles.dropdownItem}
                onClick={() => {
                  if (url) {
                    onFetchUrl(url);
                  } else if (onOpenFetchModal) {
                    onOpenFetchModal();
                  }
                }}
              >
                {isFetching ? <Loader2 size={16} className={styles.spin} /> : <Link size={16} />}
                {url ? `Fetch from ${formatUrlDomain(url)}` : 'Fetch from URL'}
              </DropdownMenu.Item>
              {onGenerateClick && !isStandaloneMode && (
                <DropdownMenu.Item className={styles.dropdownItem} onClick={onGenerateClick}>
                  <Code size={16} />
                  Generate Template
                </DropdownMenu.Item>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {
          hasCollection && (
            <Button
              variant="ghost"
              onClick={onDeleteClick}
              leftIcon={<Trash2 size={16} />}
              className={styles.deleteBtn}
            >
              Delete
            </Button>
          )
        }

        <div className={styles.separator} />

        <UserMenu placement="bottom" />

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
      {isMobileMenuOpen && mounted && createPortal(
        <>
          <div className={styles.mobileOverlay} onClick={() => setIsMobileMenuOpen(false)} />
          <div className={styles.mobileMenu}>
            {onAuthClick && hasCollection && (
              <Button
                variant="ghost"
                onClick={() => { onAuthClick(); setIsMobileMenuOpen(false); }}
                leftIcon={<Lock size={16} color={hasAuthConfigured ? "#10b981" : undefined} />}
                style={{ justifyContent: 'flex-start', width: '100%' }}
              >
                Authorization Settings
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => {
                if (url) {
                  onFetchUrl(url);
                } else if (onOpenFetchModal) {
                  onOpenFetchModal();
                }
                setIsMobileMenuOpen(false);
              }}
              leftIcon={isFetching ? <Loader2 size={16} className={styles.spin} /> : <Link size={16} />}
              style={{ justifyContent: 'flex-start', width: '100%' }}
            >
              {url ? `Fetch from ${formatUrlDomain(url)}` : 'Fetch from URL'}
            </Button>

            <Button
              variant="ghost"
              onClick={() => { onImportClick(); setIsMobileMenuOpen(false); }}
              leftIcon={<Download size={16} />}
              style={{ justifyContent: 'flex-start', width: '100%' }}
            >
              Import File
            </Button>

            {onGenerateClick && !isStandaloneMode && (
              <Button
                variant="ghost"
                onClick={() => { onGenerateClick(); setIsMobileMenuOpen(false); }}
                leftIcon={<Plus size={16} />}
                style={{ justifyContent: 'flex-start', width: '100%' }}
              >
                Generate Template
              </Button>
            )}

            {hasCollection && (
              <Button
                variant="ghost"
                onClick={() => { onDeleteClick(); setIsMobileMenuOpen(false); }}
                leftIcon={<Trash2 size={16} />}
                style={{ justifyContent: 'flex-start', width: '100%', color: '#ef4444' }}
              >
                Delete Collection
              </Button>
            )}
          </div>
        </>,
        document.body
      )
      }
    </nav >
  );
};

export default Navbar;
