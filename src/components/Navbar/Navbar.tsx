import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Navbar.module.css";
import { Button } from "../ui/Button/Button";
import { ChevronDown, Download, Plus, Trash2, FileText, Loader2, Folder, Lock, X, Pencil, Menu } from "lucide-react";
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
  isFetching: boolean;
  onGenerateClick?: () => void;
  baseURL?: string;
  projectPath?: string;
  collectionName?: string;
  authToken?: string;
  onAuthTokenChange?: (token: string) => void;
  isStandaloneMode?: boolean;
  onBaseUrlChange?: (url: string) => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({
  selectedEndpoint,
  onImportClick,
  hasCollection,
  onDeleteClick,
  onFetchUrl,
  isFetching,
  onGenerateClick,
  baseURL,
  projectPath,
  collectionName,
  authToken,
  onAuthTokenChange,
  isStandaloneMode = false,
  onBaseUrlChange,
  onToggleSidebar,
  isSidebarOpen
}) => {
  const [url, setUrl] = React.useState(() => localStorage.getItem("docs_url") || "");
  const [isFetchOpen, setIsFetchOpen] = React.useState(false);
  const [isAuthOpen, setIsAuthOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [error, setError] = React.useState("");
  const fetchContainerRef = useRef<HTMLDivElement>(null);
  const authContainerRef = useRef<HTMLDivElement>(null);

  const [isMobileAuthOpen, setIsMobileAuthOpen] = React.useState(false);
  const [isMobileFetchOpen, setIsMobileFetchOpen] = React.useState(false);

  const [draftToken, setDraftToken] = React.useState(authToken || "");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Sync draft token when dropdown opens or prop changes
  useEffect(() => {
    if (isAuthOpen) {
      setDraftToken(authToken || "");
    }
  }, [isAuthOpen, authToken]);

  useEffect(() => {
    localStorage.setItem("docs_url", url);
  }, [url]);

  // Reset mobile states when menu closes
  useEffect(() => {
    if (!isMobileMenuOpen) {
      setIsMobileAuthOpen(false);
      setIsMobileFetchOpen(false);
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fetchContainerRef.current && !fetchContainerRef.current.contains(event.target as Node)) {
        setIsFetchOpen(false);
      }
      if (authContainerRef.current && !authContainerRef.current.contains(event.target as Node)) {
        setIsAuthOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const validateUrl = (val: string) => {
    if (!val.trim()) return "URL is required";
    if (!val.toLowerCase().endsWith(".json")) return "URL must end with .json";
    return "";
  };

  const handleFetch = () => {
    const validationError = validateUrl(url);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    if (url.trim()) {
      onFetchUrl(url);
      setIsFetchOpen(false);
      setIsMobileMenuOpen(false);
    }
  };

  const handleInputCheck = (val: string) => {
    setUrl(val);
    if (error) setError("");
  }

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

  return (
    <nav className={styles.navbar}>
      <div className={styles.leftSection}>
        {onToggleSidebar && (
          <Button
            variant="ghost"
            className={styles.sidebarToggle}
            onClick={onToggleSidebar}
          >
            <Menu size={16} />
          </Button>
        )}

        {/* Project Context - Unique Design */}
        {isStandaloneMode ? (
          <div className={styles.projectContainer} title="Not connected to a project">
            <Folder size={18} className={styles.projectIcon} strokeWidth={2} />
            <span style={{ color: '#f59e0b' }}>Standalone Mode</span>
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
        {/* Auth Action */}
        {onAuthTokenChange && hasCollection && (
          <div className={styles.actionGroup} ref={authContainerRef}>
            <Button
              variant="ghost"
              onClick={() => setIsAuthOpen(!isAuthOpen)}
              leftIcon={<Lock size={16} color={authToken ? "#10b981" : undefined} />}
              title={authToken ? "" : "Set Auth Token"}
            >
              Auth
            </Button>

            {isAuthOpen && (
              <div className={styles.fetchPopover} style={{ width: '300px' }}>
                <div className={styles.popoverHeader}>AUTHORIZATION (BEARER)</div>
                <div className={styles.popoverInputWrapper} style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Enter token from auth/signin"
                    className={styles.popoverInput}
                    value={draftToken}
                    onChange={(e) => setDraftToken(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button
                  onClick={() => {
                    if (authToken && draftToken === authToken) {
                      // Clear / Logout matches current state
                      onAuthTokenChange("");
                      setDraftToken("");
                      setIsAuthOpen(false);
                    } else {
                      // Authorize (Save)
                      if (!draftToken.trim()) return; // Double check
                      onAuthTokenChange(draftToken);
                      setIsAuthOpen(false);
                    }
                  }}
                  variant={authToken && draftToken === authToken ? "danger" : "primary"}
                  disabled={!authToken && !draftToken.trim() || (!!authToken && draftToken !== authToken && !draftToken.trim())}
                  style={{ marginTop: '0px', width: '100%' }}
                >
                  {authToken && draftToken === authToken ? "Clear" : "Authorize"}
                </Button>
              </div>
            )}
          </div>
        )}

        {hasCollection && <div className={styles.separator}></div>}

        {/* Fetch Action */}
        <div className={styles.actionGroup} ref={fetchContainerRef}>
          <Button
            variant="ghost"
            onClick={() => setIsFetchOpen(!isFetchOpen)}
            leftIcon={isFetching ? <Loader2 size={16} className={styles.spin} /> : <FileText size={16} color={url ? "#10b981" : undefined} />}
            rightIcon={<ChevronDown size={16} />}
          >
            Fetch
          </Button>

          {isFetchOpen && (
            <div className={styles.fetchPopover}>
              <div className={styles.popoverHeader}>SAVED DOCS URL</div>
              <div className={styles.popoverInputWrapper}>
                <input
                  type="text"
                  placeholder="Enter docs URL..."
                  className={`${styles.popoverInput} ${error ? styles.inputError : ''}`}
                  value={url}
                  onChange={(e) => handleInputCheck(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                  autoFocus
                />
              </div>
              {error && <div className={styles.errorMessage}>{error}</div>}

              <Button
                onClick={handleFetch}
                disabled={!url || isFetching}
                isLoading={isFetching}
                variant="primary"
                className={styles.popoverFetchBtn}
              >
                Fetch
              </Button>
            </div>
          )}
        </div>

        <Button variant="ghost" onClick={onImportClick} leftIcon={<Download size={16} />}>
          Import
        </Button>

        {/* Generate button - only show when connected to bridge */}
        {
          onGenerateClick && !isStandaloneMode && (
            <Button variant="ghost" onClick={onGenerateClick} leftIcon={<Plus size={16} />}>
              Generate
            </Button>
          )
        }

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
            {onAuthTokenChange && hasCollection && (
              <Button
                variant="ghost"
                onClick={() => { setIsMobileAuthOpen(!isMobileAuthOpen); }}
                leftIcon={<Lock size={16} color={authToken ? "#10b981" : undefined} />}
                style={{ justifyContent: 'flex-start', width: '100%' }}
              >
                Authorization
              </Button>
            )}

            {isMobileAuthOpen && (
              <div className={styles.mobileSubMenu}>
                <div className={styles.popoverHeader}>AUTHORIZATION</div>
                <div className={styles.popoverInputWrapper}>
                  <input
                    type="text"
                    placeholder="Enter token..."
                    className={styles.popoverInput}
                    value={draftToken}
                    onChange={(e) => setDraftToken(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => {
                    if (authToken && draftToken === authToken) {
                      onAuthTokenChange?.("");
                      setDraftToken("");
                      setIsAuthOpen(false);
                    } else {
                      if (!draftToken.trim()) return;
                      onAuthTokenChange?.(draftToken);
                      setIsMobileAuthOpen(false);
                      setIsMobileMenuOpen(false);
                    }
                  }}
                  variant={authToken && draftToken === authToken ? "danger" : "primary"}
                  disabled={!authToken && !draftToken.trim() || (!!authToken && draftToken !== authToken && !draftToken.trim())}
                  style={{ width: '100%' }}
                >
                  {authToken && draftToken === authToken ? "Clear" : "Authorize"}
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              onClick={() => { setIsMobileFetchOpen(!isMobileFetchOpen); }}
              leftIcon={<FileText size={16} color={url ? "#10b981" : undefined} />}
              style={{ justifyContent: 'flex-start', width: '100%' }}
            >
              Fetch Docs
            </Button>

            {isMobileFetchOpen && (
              <div className={styles.mobileSubMenu}>
                <div className={styles.popoverHeader}>DOCS URL</div>
                <input
                  type="text"
                  placeholder="Enter docs URL..."
                  className={`${styles.popoverInput} ${error ? styles.inputError : ''}`}
                  value={url}
                  onChange={(e) => handleInputCheck(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                />
                {error && <div className={styles.errorMessage}>{error}</div>}
                <Button
                  onClick={() => {
                    handleFetch();
                    if (url.trim()) setIsMobileFetchOpen(false);
                  }}
                  disabled={!url || isFetching}
                  isLoading={isFetching}
                  variant="primary"
                  style={{ width: '100%' }}
                >
                  Fetch
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              onClick={() => { onImportClick(); setIsMobileMenuOpen(false); }}
              leftIcon={<Download size={16} />}
              style={{ justifyContent: 'flex-start', width: '100%' }}
            >
              Import
            </Button>

            {onGenerateClick && !isStandaloneMode && (
              <Button
                variant="ghost"
                onClick={() => { onGenerateClick(); setIsMobileMenuOpen(false); }}
                leftIcon={<Plus size={16} />}
                style={{ justifyContent: 'flex-start', width: '100%' }}
              >
                Generate
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
