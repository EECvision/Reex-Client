import React, { useRef, useEffect } from "react";
import styles from "./Navbar.module.css";
import { Button } from "../ui/Button/Button";
import { ChevronDown, Download, Plus, Trash2, FileText, Loader2, Folder, Lock, X } from "lucide-react";
import { BadgeGroup } from "../ui/BadgeGroup/BadgeGroup";

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
  authToken?: string;
  onAuthTokenChange?: (token: string) => void;
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
  authToken,
  onAuthTokenChange
}) => {
  const [url, setUrl] = React.useState(() => localStorage.getItem("docs_url") || "");
  const [isFetchOpen, setIsFetchOpen] = React.useState(false);
  const [isAuthOpen, setIsAuthOpen] = React.useState(false);
  const [error, setError] = React.useState("");
  const fetchContainerRef = useRef<HTMLDivElement>(null);
  const authContainerRef = useRef<HTMLDivElement>(null);
  const [draftToken, setDraftToken] = React.useState(authToken || "");

  // Sync draft token when dropdown opens or prop changes
  useEffect(() => {
    if (isAuthOpen) {
      setDraftToken(authToken || "");
    }
  }, [isAuthOpen, authToken]);

  useEffect(() => {
    localStorage.setItem("docs_url", url);
  }, [url]);

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
        {/* Project Context - Unique Design */}
        <div className={styles.projectContainer} title={projectPath}>
          <Folder size={18} className={styles.projectIcon} strokeWidth={2} />
          <span>{formatProjectPath(projectPath)}</span>
        </div>

        {hasCollection && baseURL && (
          <BadgeGroup
            label="BASE"
            value={baseURL || "No Base URL"}
          />
        )}
      </div>

      <div className={styles.rightSection}>
        {/* Auth Action */}
        {onAuthTokenChange && (
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

        <div className={styles.separator}></div>

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

        {
          onGenerateClick && (
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
      </div >
    </nav >
  );
};

export default Navbar;
