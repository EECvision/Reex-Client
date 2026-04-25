"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Editor from "@monaco-editor/react";
import {
  Code2,
  X,
  ChevronRight,
  Copy,
  Check,
  FileCode2,
  Folder,
} from "lucide-react";
import { useSettings } from "@/providers/SettingsContext";
import { api } from "@/services/api";
import styles from "./CodeViewerModal.module.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileEntry {
  path: string; // e.g. src/api-services/definitions/users.ts
  content: string;
}

interface FolderGroup {
  label: string; // Display name
  prefix: string; // path prefix used to group files
  files: FileEntry[];
}

interface CodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  manifest: any;
  isStandaloneMode: boolean;
  projectPath?: string;
  apiServicesDir?: string;
  activeCollectionId?: string;
  activeCollectionName?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_SERVICES_DEFAULT = "src/api-services";

function groupFiles(files: Record<string, string>): FolderGroup[] {
  const groups: Record<string, FileEntry[]> = {
    definitions: [],
    generated: [],
    types: [],
    root: [],
  };

  Object.entries(files).forEach(([path, content]) => {
    if (path.includes("/definitions/"))
      groups.definitions.push({ path, content });
    else if (path.includes("/generated/"))
      groups.generated.push({ path, content });
    else if (path.includes("/types/")) groups.types.push({ path, content });
    else groups.root.push({ path, content });
  });

  // Sort within each group
  Object.values(groups).forEach((g) =>
    g.sort((a, b) => a.path.localeCompare(b.path)),
  );

  return [
    { label: "definitions/", prefix: "definitions", files: groups.definitions },
    { label: "generated/", prefix: "generated", files: groups.generated },
    { label: "types/", prefix: "types", files: groups.types },
    { label: "root", prefix: "root", files: groups.root },
  ].filter((g) => g.files.length > 0);
}

function shortName(path: string): string {
  return path.split("/").pop() || path;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CodeViewerModal: React.FC<CodeViewerModalProps> = ({
  isOpen,
  onClose,
  manifest,
  isStandaloneMode,
  projectPath,
  apiServicesDir = API_SERVICES_DEFAULT,
  activeCollectionId,
  activeCollectionName,
}) => {
  const { theme } = useSettings();
  const [files, setFiles] = useState<Record<string, string>>({});
  const [groups, setGroups] = useState<FolderGroup[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["definitions", "generated", "types", "root"]),
  );
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch generated preview whenever manifest changes (and modal is open)
  const fetchPreview = useCallback(async () => {
    if (!manifest || Object.keys(manifest).length === 0) return;
    setLoading(true);
    try {
      let displayManifest = manifest;
      if (isStandaloneMode && activeCollectionId) {
        displayManifest = {};
        for (const [key, value] of Object.entries(manifest)) {
          if (key.startsWith(`col_${activeCollectionId}__`)) {
            displayManifest[key] = value;
          }
        }
      }

      const res = await fetch("/api/generate-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifest: displayManifest, apiServicesDir }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      let allFiles: Record<string, string> = { ...data.files };

      // In bridge/project mode: overlay actual on-disk type files (user may have saved
      // real interfaces via ResultSection → they would differ from the `unknown` stubs).
      if (!isStandaloneMode && projectPath) {
        const bridgeUrl = api.getBridgeUrl();
        const typeFilePaths = Object.keys(data.files).filter((p) =>
          p.includes("/types/"),
        );
        const diskReads = await Promise.allSettled(
          typeFilePaths.map((p) =>
            api.readFile(
              p.replace(`${apiServicesDir}/`, `${apiServicesDir}/`),
              bridgeUrl,
            ),
          ),
        );
        diskReads.forEach((result, idx) => {
          if (result.status === "fulfilled" && result.value?.success) {
            allFiles[typeFilePaths[idx]] = result.value.content;
          }
        });
      }

      const grouped = groupFiles(allFiles);
      setFiles(allFiles);
      setGroups(grouped);

      // Auto-select first definition file on initial load
      setSelectedPath((prev) => {
        if (prev && allFiles[prev]) return prev; // Keep current selection if still valid
        const firstDef = grouped.find((g) => g.prefix === "definitions")
          ?.files[0];
        return firstDef?.path ?? grouped[0]?.files[0]?.path ?? null;
      });
    } catch (err) {
      console.error("[CodeViewer] Preview fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [manifest, isStandaloneMode, projectPath, apiServicesDir, activeCollectionId]);

  useEffect(() => {
    if (isOpen) {
      fetchPreview();
    }
  }, [isOpen, fetchPreview]);

  // --- Resizing Logic ---
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const isResizing = useRef(false);
  const resizeStartPos = useRef(0);
  const resizeStartWidth = useRef(0);

  const startResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      resizeStartPos.current = e.clientX;
      resizeStartWidth.current = sidebarWidth;
      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResizing);
      document.body.style.cursor = "col-resize";
    },
    [sidebarWidth],
  );

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
      const delta = e.clientX - resizeStartPos.current;
      let newWidth = resizeStartWidth.current + delta;
      if (newWidth < 150) newWidth = 150;
      if (newWidth > 500) newWidth = 500;
      setSidebarWidth(newWidth);
    }
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener("mousemove", resize);
    document.removeEventListener("mouseup", stopResizing);
    document.body.style.cursor = "";
  }, [resize]);

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);
  // -----------------------

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const toggleFolder = (prefix: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(prefix)) next.delete(prefix);
      else next.add(prefix);
      return next;
    });
  };

  const handleCopy = () => {
    if (!selectedPath || !files[selectedPath]) return;
    navigator.clipboard.writeText(files[selectedPath]).then(() => {
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isOpen) return null;

  const selectedContent = selectedPath ? (files[selectedPath] ?? "") : "";
  const hasContent = Object.keys(files).length > 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Code2 size={16} className={styles.headerIcon} />
            <span className={styles.headerTitle}>
              Code Viewer {activeCollectionName ? `— ${activeCollectionName}` : ""}
            </span>
            <span className={styles.headerBadge}>READ ONLY</span>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.closeBtn} onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* File tree sidebar */}
          <div className={styles.sidebar} style={{ width: sidebarWidth }}>
            <div
              className={`${styles.resizer} ${isResizing.current ? styles.resizerActive : ""}`}
              onMouseDown={startResizing}
            />
            <div className={styles.sidebarContent}>
              {loading ? (
                <div
                  className={styles.loadingState}
                  style={{ marginTop: "2rem" }}
                >
                  <div className={styles.spinner} />
                </div>
              ) : !hasContent ? (
                <div className={styles.emptyState} style={{ marginTop: "2rem" }}>
                  <Folder size={28} className={styles.emptyIcon} />
                  <span>No files yet</span>
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.prefix} className={styles.sidebarSection}>
                    <button
                      className={styles.sidebarFolderBtn}
                      onClick={() => toggleFolder(group.prefix)}
                    >
                      <ChevronRight
                        size={12}
                        className={`${styles.chevron} ${expandedFolders.has(group.prefix) ? styles.chevronOpen : ""}`}
                      />
                      {group.label}
                    </button>

                    {expandedFolders.has(group.prefix) && (
                      <div className={styles.sidebarFiles}>
                        {group.files.map((file) => (
                          <button
                            key={file.path}
                            className={`${styles.sidebarFile} ${selectedPath === file.path ? styles.sidebarFileActive : ""}`}
                            onClick={() => setSelectedPath(file.path)}
                            title={file.path}
                          >
                            <FileCode2 size={12} className={styles.fileIcon} />
                            <span className={styles.fileName}>
                              {shortName(file.path)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Editor panel */}
          <div className={styles.editorArea}>
            {/* Editor sub-header: file path + copy button */}
            <div className={styles.editorHeader}>
              <span className={styles.filePath}>
                {selectedPath ?? "Select a file"}
              </span>
              {selectedPath && (
                <button
                  className={`${styles.copyBtn} ${copied ? styles.copyBtnSuccess : ""}`}
                  onClick={handleCopy}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              )}
            </div>

            {/* Monaco */}
            <div className={styles.editorWrapper}>
              {loading ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner} />
                  <span>Generating preview...</span>
                </div>
              ) : !selectedPath ? (
                <div className={styles.emptyState}>
                  <Code2 size={32} className={styles.emptyIcon} />
                  <span>Select a file from the sidebar</span>
                </div>
              ) : (
                <Editor
                  height="100%"
                  defaultLanguage="typescript"
                  value={selectedContent}
                  theme={theme === "dark" ? "vs-dark" : "light"}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: "on",
                    folding: true,
                    renderLineHighlight: "none",
                    cursorStyle: "line",
                    cursorBlinking: "solid",
                    scrollbar: {
                      vertical: "auto",
                      horizontal: "auto",
                      verticalScrollbarSize: 8,
                      horizontalScrollbarSize: 8,
                    },
                    padding: { top: 12, bottom: 12 },
                    overviewRulerBorder: false,
                    overviewRulerLanes: 0,
                    lineDecorationsWidth: 8,
                    domReadOnly: true,
                  }}
                  loading={
                    <div className={styles.loadingState}>
                      <div className={styles.spinner} />
                    </div>
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeViewerModal;
