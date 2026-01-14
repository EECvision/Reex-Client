import React, { useRef, useEffect } from "react";
import styles from "./Navbar.module.css";
import { Button } from "../ui/Button/Button";
import { ChevronDown, Download, Plus, Trash2, FileText, Loader2 } from "lucide-react";

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
  computedUrl?: string;
  method?: string;
  projectPath?: string; // New prop
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
  computedUrl,
  method,
  projectPath,
}) => {
  const [url, setUrl] = React.useState(() => localStorage.getItem("docs_url") || "");
  const [isFetchOpen, setIsFetchOpen] = React.useState(false);
  const [error, setError] = React.useState("");
  const fetchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("docs_url", url);
  }, [url]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fetchContainerRef.current && !fetchContainerRef.current.contains(event.target as Node)) {
        setIsFetchOpen(false);
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

  const getMethodColor = (m?: string) => {
    if (m === "BASE") return "#6b7280";
    switch (m?.toUpperCase()) {
      case "GET": return "#3b82f6";
      case "POST": return "#10b981";
      case "PUT": return "#f59e0b";
      case "DELETE": return "#ef4444";
      case "PATCH": return "#8b5cf6";
      default: return "#6b7280";
    }
  };

  const methodColor = getMethodColor(method);

  // Helper to format project path
  const formatProjectPath = (path?: string) => {
    if (!path) return "No Project";
    // Get last 2 parts of path for brevity
    const parts = path.split(/[\\/]/);
    if (parts.length > 2) {
      return `.../${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
    }
    return path;
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.leftSection}>
        {selectedEndpoint ? (
          <>
            <div className={styles.methodBadge} style={{ color: methodColor, backgroundColor: `${methodColor}15`, borderColor: `${methodColor}30` }}>
              {method}
            </div>
            <div className={styles.urlDisplay}>
              <span className={styles.urlText}>{computedUrl}</span>
            </div>
          </>
        ) : (
          <>
            {/* Show Project Path if no endpoint selected */}
            <div className={styles.methodBadge} style={{ color: "#6b7280", backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" }}>
              PROJECT
            </div>
            <div className={styles.urlDisplay} title={projectPath}>
              <span className={styles.urlText} style={{ marginRight: '1rem', fontWeight: 600 }}>
                {formatProjectPath(projectPath)}
              </span>
            </div>

            {hasCollection && ( // Only show BASE URL if collection exists
              <>
                <div className={styles.methodBadge} style={{ color: "#6b7280", backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" }}>
                  BASE
                </div>
                <div className={styles.urlDisplay}>
                  <span className={styles.urlText} style={{ color: "#6b7280" }}>{baseURL || "No Base URL"}</span>
                </div>
              </>
            )}

            {!hasCollection && (
              <div className={styles.urlDisplay}>
                <span className={styles.urlText} style={{ color: "#9ca3af", fontStyle: 'italic' }}>No Base URL</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className={styles.rightSection}>
        {/* Fetch Action */}
        <div className={styles.actionGroup} ref={fetchContainerRef}>
          <Button
            variant="ghost"
            onClick={() => setIsFetchOpen(!isFetchOpen)}
            leftIcon={isFetching ? <Loader2 size={16} className={styles.spin} /> : <FileText size={16} />}
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
                className={styles.popoverFetchBtn} // Keep class if needed for width/overrides
              >
                Fetch
              </Button>
            </div>
          )}
        </div>

        <div className={styles.separator}></div>

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
