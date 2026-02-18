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
  customHeaders?: Record<string, string>;
  onCustomHeadersChange?: (headers: Record<string, string>) => void;
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
  customHeaders = {},
  onCustomHeadersChange,
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
  // Local state for headers: array of { id, key, value } for easy editing
  const [draftHeaders, setDraftHeaders] = React.useState<{ id: string, key: string, value: string }[]>([]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Sync draft token and headers when dropdown opens or props change
  useEffect(() => {
    if (isAuthOpen) {
      setDraftToken(authToken || "");
      // Convert customHeaders object to array
      const headersArray = Object.entries(customHeaders).map(([key, value], index) => ({
        id: `header-${index}-${Date.now()}`,
        key,
        value
      }));
      if (headersArray.length === 0) {
        // ensure always one empty row? No, let user add.
        // Actually, maybe cleaner start empty.
      }
      setDraftHeaders(headersArray);
    }
  }, [isAuthOpen, authToken, customHeaders]);

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
    const lowerVal = val.toLowerCase();
    if (!lowerVal.endsWith(".json") && !lowerVal.endsWith(".postman") && !lowerVal.endsWith(".openapi") && !lowerVal.endsWith(".yaml") && !lowerVal.endsWith(".yml")) {
      return "URL must end with .json, .yaml, .yml, .postman or .openapi";
    }
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

  const handleHeaderChange = (id: string, field: 'key' | 'value', text: string) => {
    setDraftHeaders(prev => prev.map(h => h.id === id ? { ...h, [field]: text } : h));
  };

  const addHeader = () => {
    setDraftHeaders(prev => [...prev, { id: `new-${Date.now()}`, key: "", value: "" }]);
  };

  const removeHeader = (id: string) => {
    setDraftHeaders(prev => prev.filter(h => h.id !== id));
  };

  const handleAuthorize = () => {
    // 1. Token
    if (authToken && draftToken === authToken && draftHeaders.length === 0 && Object.keys(customHeaders).length === 0) {
      // Clear (if same token and no headers... logic is tricky)
      // Actually "Authorize" implies saving current state.
      // "Clear" button handles clearing. This is "Authorize" (Save).
    }

    if (onAuthTokenChange) onAuthTokenChange(draftToken);

    // 2. Headers
    if (onCustomHeadersChange) {
      const headersObj: Record<string, string> = {};
      draftHeaders.forEach(h => {
        if (h.key.trim()) {
          headersObj[h.key.trim()] = h.value;
        }
      });
      onCustomHeadersChange(headersObj);
    }

    setIsAuthOpen(false);
  };

  const handleClearAuth = () => {
    if (onAuthTokenChange) onAuthTokenChange("");
    if (onCustomHeadersChange) onCustomHeadersChange({});
    setDraftToken("");
    setDraftHeaders([]);
    setIsAuthOpen(false);
  };

  const hasChanges = () => {
    // Check token
    if (draftToken !== (authToken || "")) return true;

    // Check headers
    // Simple check: convert both to stringified entries logic or similar
    // Or just check if draftHeaders differs from customHeaders
    const currentHeaders = customHeaders || {};
    // Filter out empty keys from draft
    const validDrafts = draftHeaders.filter(h => h.key.trim());
    if (validDrafts.length !== Object.keys(currentHeaders).length) return true;

    for (const h of validDrafts) {
      if (currentHeaders[h.key.trim()] !== h.value) return true;
    }
    return false;
  };

  const isAuthActive = !!authToken || (customHeaders && Object.keys(customHeaders).length > 0);

  return (
    <nav className={styles.navbar}>
      <div className={styles.leftSection}>
        {onToggleSidebar && hasCollection && (
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
              leftIcon={<Lock size={16} color={isAuthActive ? "#10b981" : undefined} />}
              title={isAuthActive ? "" : "Set Auth Token & Headers"}
            >
              Auth
            </Button>

            {isAuthOpen && (
              <div className={styles.fetchPopover} style={{ width: '380px' }}>
                <div className={styles.popoverHeader}>AUTHORIZATION (BEARER)</div>
                <div className={styles.popoverInputWrapper}>
                  <input
                    type="text"
                    placeholder="Enter token from auth/signin"
                    className={styles.popoverInput}
                    value={draftToken}
                    onChange={(e) => setDraftToken(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className={styles.popoverHeader} style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>CUSTOM HEADERS</span>
                  <Button variant="ghost" size="sm" onClick={addHeader} style={{ height: '24px', padding: '0 8px', fontSize: '12px' }}>
                    <Plus size={12} style={{ marginRight: 4 }} /> Add
                  </Button>
                </div>

                {draftHeaders.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {draftHeaders.map((header) => (
                      <div key={header.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Key"
                          className={styles.popoverInput}
                          style={{ flex: 1, minWidth: 0 }}
                          value={header.key}
                          onChange={(e) => handleHeaderChange(header.id, 'key', e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          className={styles.popoverInput}
                          style={{ flex: 1, minWidth: 0 }}
                          value={header.value}
                          onChange={(e) => handleHeaderChange(header.id, 'value', e.target.value)}
                        />
                        <button
                          onClick={() => removeHeader(header.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#ef4444', display: 'flex', alignItems: 'center' }}
                          title="Remove Header"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic', marginBottom: '16px', textAlign: 'center' }}>
                    No custom headers added
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  {isAuthActive && (
                    <Button
                      onClick={handleClearAuth}
                      variant="danger"
                      style={{ flex: 1 }}
                    >
                      Clear All
                    </Button>
                  )}
                  <Button
                    onClick={handleAuthorize}
                    variant="primary"
                    disabled={!hasChanges() && !draftToken.trim() && draftHeaders.length === 0}
                    style={{ flex: 1 }}
                  >
                    {isAuthActive && !hasChanges() ? "Close" : "Save Changes"}
                  </Button>
                </div>
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
