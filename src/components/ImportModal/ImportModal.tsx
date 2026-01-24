import React, { useState, useRef, DragEvent, useEffect } from "react";
import { api } from "../../services/api";
import styles from "./ImportModal.module.css";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "../ui/Button/Button";
import DiffModal, { FunctionDiff } from "./DiffModal";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File | null;
  onSuccess: (message: string) => void;
  onUpdateStarted?: (taskId: string) => void;
  isEmptyWorkspace?: boolean;
  targetDir: string;
  taskComplete?: boolean;
  progressMessage?: string;
  resumeTaskId?: string | null;
}

type CollectionType = "openapi" | "postman" | "unknown";
type Step = "upload" | "analyzing" | "review" | "updating" | "success";

interface DiffResult {
  module: string;
  status: "new" | "modified" | "deleted" | "unchanged" | "disabled";
  functions?: FunctionDiff[];
}

// ...

const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  initialFile,
  onUpdateStarted,
  isEmptyWorkspace = false,
  targetDir,
  taskComplete = false,
  progressMessage,
  resumeTaskId,
  onSuccess // Added missing prop
}) => {
  const [step, setStep] = useState<Step>("upload");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [collectionType, setCollectionType] =
    useState<CollectionType>("unknown");
  const [diffs, setDiffs] = useState<DiffResult[]>([]);

  // Selected modules (full module updates)
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set()
  );

  // Selected functions per module: Map<moduleName, Set<functionName>>
  const [selectedFunctions, setSelectedFunctions] = useState<
    Map<string, Set<string>>
  >(new Map());

  // Expanded modules in UI
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set()
  );

  // Diff Modal State
  const [diffFunction, setDiffFunction] = useState<FunctionDiff | null>(null);

  // Initialize from props
  useEffect(() => {
    if (initialFile) {
      setSelectedFile(initialFile);
      detectCollectionType(initialFile).then(type => setCollectionType(type));
    }
  }, [initialFile]);

  // Resume effect
  useEffect(() => {
    if (resumeTaskId && step === 'upload') {
      setStep('updating');
    }
  }, [resumeTaskId]);

  useEffect(() => {
    if (taskComplete && step === "updating") {
      setStep("success");
    }
  }, [taskComplete, step]);

  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setStep("upload");
    setSelectedFile(null);
    setCollectionType("unknown");
    setDiffs([]);
    setSelectedModules(new Set());
    setSelectedFunctions(new Map());
    setExpandedModules(new Set());
  };

  const handleClose = () => {
    if (step === "analyzing" || step === "updating") return;
    resetState();
    onClose();
  };

  const detectCollectionType = async (file: File): Promise<CollectionType> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          if (content.openapi || content.swagger) {
            resolve("openapi");
            return;
          }
          if (content.info && content.item) {
            resolve("postman");
            return;
          }
          resolve("unknown");
        } catch {
          resolve("unknown");
        }
      };
      reader.readAsText(file);
    });
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/json") {
        setSelectedFile(file);
        const type = await detectCollectionType(file);
        setCollectionType(type);
      } else {
        alert("Please upload a JSON file");
      }
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const type = await detectCollectionType(file);
      setCollectionType(type);
    }
  };

  const startAnalysis = async () => {
    if (!selectedFile) return;
    setStep("analyzing");

    try {
      const res = await api.analyzeCollection(selectedFile, selectedFile.name, targetDir);

      const data = res; // IPC returns the data structure directly

      if (!res.success) throw new Error(res.error || "Analysis failed");

      setDiffs(data.data);

      // Auto-select all functions (including unchanged) to prevent overwrites
      // Modules are only selected if they have changes
      const newModules = new Set<string>();
      const newFunctions = new Map<string, Set<string>>();

      data.data.forEach((d: DiffResult) => {
        // Select ALL modules by default (including unchanged) to prevent overwrites
        newModules.add(d.module);

        // Select ALL functions (including unchanged) by default to preserve existing code
        if (d.functions && d.functions.length > 0) {
          const funcs = new Set<string>();
          d.functions.forEach((f) => {
            // Select all non-deleted functions (including disabled/locked ones)
            if (f.status !== "deleted") funcs.add(f.name);
          });
          if (funcs.size > 0 && d.status !== "disabled") {
            newFunctions.set(d.module, funcs);
          }
        }
      });

      // Filter out disabled modules from initial selection
      data.data.forEach((d: DiffResult) => {
        if (d.status === "disabled") newModules.delete(d.module);
      });

      setSelectedModules(newModules);
      setSelectedFunctions(newFunctions);

      setStep("review");
    } catch (err) {
      console.error(err);
      alert(`Analysis failed: ${(err as Error).message}`);
      setStep("upload");
    }
  };

  const handleUpdate = async () => {
    if (!selectedFile) return;
    setStep("updating");

    try {
      // ... same preparation logic
      const functionMapObj: Record<string, string[]> = {};
      selectedFunctions.forEach((value, key) => {
        if (value.size > 0) {
          functionMapObj[key] = Array.from(value);
        }
      });

      const deletedModules = diffs
        .filter(
          (d) =>
            d.status !== "new" &&
            !selectedModules.has(d.module) &&
            d.status !== "disabled"
        )
        .map((d) => d.module);

      const payload = {
        file: selectedFile,
        fileName: selectedFile.name,
        modules: Array.from(selectedModules),
        deletedModules,
        functions: functionMapObj,
      };

      const taskId = Date.now().toString();
      if (onUpdateStarted) {
        onUpdateStarted(taskId);
      }

      // Request operations payload instead of server-side sync
      // We pass 'returnOperations' = true via formData implicitly in api.updateCollection if we modify it, 
      // or we just handle the new response structure which contains 'operations'.

      const res = await api.updateCollection(payload, targetDir, api.getBridgeUrl(), taskId);

      if (!res.success) {
        throw new Error(res.error || "Sync failed");
      }

      // Operations are now handled automatically by api.ts (handleOperationResponse)
      // The bridge watcher will catch the file updates and trigger a project reload.

      setStep("success");
      if (onSuccess) onSuccess("Collection updated successfully!");

    } catch (err) {
      console.error(err);
      alert(`Sync failed: ${(err as Error).message}`);
      setStep("review");
    }
  };
  // ...

  const toggleModule = (moduleName: string, diff?: DiffResult) => {
    const isSelected = selectedModules.has(moduleName);

    // Prevent selecting disabled modules
    if (diff?.status === "disabled") return;

    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (isSelected) next.delete(moduleName);
      else next.add(moduleName);
      return next;
    });

    // Also toggle all functions if they exist
    if (diff?.functions) {
      setSelectedFunctions((prev) => {
        const next = new Map(prev);
        if (isSelected) {
          // Deselecting module -> deselect all functions
          next.delete(moduleName);
        } else {
          // Selecting module -> select all non-deleted functions (including unchanged/disabled)
          const funcs = new Set<string>();
          diff.functions?.forEach((f) => {
            if (f.status !== "deleted") funcs.add(f.name);
          });
          next.set(moduleName, funcs);
        }
        return next;
      });
    }
  };

  const toggleFunction = (moduleName: string, functionName: string) => {
    setSelectedFunctions((prev) => {
      const next = new Map(prev);
      // Create a NEW Set from the existing one (or empty)
      const currentSet = new Set(prev.get(moduleName) || []);

      if (currentSet.has(functionName)) {
        currentSet.delete(functionName);
      } else {
        currentSet.add(functionName);
      }

      if (currentSet.size === 0) {
        next.delete(moduleName);
        // Deselect module if no functions selected to prevent full update
        setSelectedModules((prevMod) => {
          const nextMod = new Set(prevMod);
          nextMod.delete(moduleName);
          return nextMod;
        });
      } else {
        next.set(moduleName, currentSet);
        // Ensure module is selected if we select a function
        setSelectedModules((prevMod) => {
          const nextMod = new Set(prevMod);
          nextMod.add(moduleName);
          return nextMod;
        });
      }
      return next;
    });
  };

  const toggleExpand = (moduleName: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleName)) next.delete(moduleName);
      else next.add(moduleName);
      return next;
    });
  };

  // --- Render Helpers ---

  const renderBadge = (type: CollectionType) => {
    let className = styles.badgeUnsupported;
    if (type === "openapi") className = styles.badgeOpenApi;
    if (type === "postman") className = styles.badgePostman;

    return (
      <span className={`${styles.badge} ${className}`}>
        {type === "unknown"
          ? "Unsupported"
          : type === "openapi"
            ? "OpenAPI"
            : "Postman"}
      </span>
    );
  };

  const renderStatusBadge = (status: string, onClick?: () => void) => {
    let className = styles.statusUnchanged;
    let label = status.charAt(0).toUpperCase() + status.slice(1);
    const isClickable = !!onClick;

    if (status === "new") {
      className = styles.statusNew;
      label = "New";
    }
    if (status === "modified") {
      className = styles.statusModified;
      label = "Modified";
    }
    if (status === "deleted") {
      className = styles.statusDeleted;
      label = "Deleted";
    }
    if (status === "disabled") {
      className = styles.statusDisabled;
      label = "Locked";
    }

    return (
      <span
        onClick={(e) => {
          if (isClickable) {
            e.stopPropagation();
            onClick();
          }
        }}
        className={`${styles.statusBadge} ${className}`}
        style={isClickable ? { cursor: "pointer" } : undefined}
      >
        {label}
      </span>
    );
  };

  /* 
   * Diff Modal has been extracted to DiffModal.tsx 
   */

  return (
    <>
      <div
        className={styles.overlay}
      // onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2 className={styles.title}>
              {step === "upload" && "Import API Collection"}
              {step === "analyzing" && "Analyzing Collection..."}
              {step === "review" && "Review Changes"}
              {step === "updating" && "Updating Collection..."}
            </h2>
            <Button
              onClick={handleClose}
              className={styles.closeButton}
              disabled={step === "analyzing" || step === "updating"}
              variant="ghost"
              size="sm"
            >
              ✕
            </Button>
          </div>

          <div className={styles.body}>
            {step === "upload" && (
              <div
                className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ""
                  } ${selectedFile ? styles.dropZoneSelected : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/json"
                  className={styles.input}
                  onChange={handleChange}
                />

                {selectedFile ? (
                  <div
                    className={styles.fileInfo}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setCollectionType("unknown");
                    }}
                  >
                    <div className={styles.fileDetails}>
                      <span className={styles.fileName}>
                        {selectedFile.name}
                      </span>
                      {renderBadge(collectionType)}
                    </div>
                    <span className={styles.fileSize}>
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </span>
                  </div>
                ) : (
                  <div className={styles.placeholder}>
                    <p>
                      Drag & Drop your JSON file here or <span>Browse</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === "analyzing" && (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>
                  {isEmptyWorkspace
                    ? "Processing new collection..."
                    : "Comparing with existing API definitions..."}
                </p>
              </div>
            )}

            {step === "review" && (
              <div className={styles.reviewList}>
                <div className={styles.reviewHeader}>
                  <span>
                    Select modules to update{" "}
                    <span className={styles.headerCount}>{diffs.length}</span>
                  </span>
                  <div className={styles.filterActions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newSet = new Set<string>();
                        const newFuncs = new Map<string, Set<string>>();
                        diffs.forEach((d) => {
                          if (d.status !== "disabled") {
                            newSet.add(d.module);
                            if (d.functions) {
                              const fSet = new Set<string>();
                              // Include all non-deleted functions (including disabled)
                              d.functions.forEach(
                                (f) =>
                                  f.status !== "deleted" && fSet.add(f.name)
                              );
                              newFuncs.set(d.module, fSet);
                            }
                          }
                        });
                        setSelectedModules(newSet);
                        setSelectedFunctions(newFuncs);
                      }}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedModules(new Set());
                        setSelectedFunctions(new Map());
                      }}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>
                <div className={styles.moduleGrid}>
                  {diffs.map((diff) => (
                    <div key={diff.module} className={styles.moduleWrapper}>
                      <div
                        className={`${styles.moduleItem} ${selectedModules.has(diff.module)
                          ? styles.selected
                          : ""
                          }`}
                      >
                        <div
                          className={styles.moduleMainRow}
                          onClick={() => toggleExpand(diff.module)}
                        >
                          <div className={styles.moduleCheckboxWrapper} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedModules.has(diff.module)}
                              onChange={() => toggleModule(diff.module, diff)}
                              disabled={diff.status === "disabled"}
                              className={styles.checkbox}
                            />
                          </div>

                          <div
                            className={styles.chevronWrapper}
                          >
                            {expandedModules.has(diff.module) ? (
                              <ChevronDown size={18} className={styles.chevronIcon} />
                            ) : (
                              <ChevronRight size={18} className={styles.chevronIcon} />
                            )}
                          </div>

                          <div className={styles.moduleName} title={diff.module}>
                            <span className={styles.truncateText}>{diff.module}</span>
                            {diff.functions && diff.functions.length > 0 && (
                              <span className={styles.functionCountBadge}>
                                {diff.functions.length}
                              </span>
                            )}
                          </div>

                          {renderStatusBadge(diff.status)}
                        </div>
                      </div>

                      {expandedModules.has(diff.module) && diff.functions && (
                        <div className={styles.functionList}>
                          {diff.functions.map((f) => (
                            <label key={f.name} className={styles.functionItem}>
                              <input
                                type="checkbox"
                                checked={
                                  selectedFunctions
                                    .get(diff.module)
                                    ?.has(f.name) || false
                                }
                                onChange={() =>
                                  toggleFunction(diff.module, f.name)
                                }
                                disabled={f.status === "disabled"}
                              />
                              <span className={styles.functionName} title={f.name}>
                                {f.name}
                              </span>
                              {renderStatusBadge(f.status)}
                              {f.status === "modified" && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDiffFunction(f);
                                  }}
                                  className={styles.viewChangesBtn}
                                >
                                  View Changes
                                </Button>
                              )}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === "updating" && (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>{progressMessage || "Applying changes..."}</p>
              </div>
            )}

            {step === "success" && (
              <div className={styles.loadingState}>
                <p className={styles.successText}>✨ Collection Updated Successfully!</p>
              </div>
            )}
          </div>

          <div className={styles.footer}>
            {step === "upload" && (
              <Button
                onClick={startAnalysis}
                disabled={!selectedFile || collectionType === "unknown"}
                variant="primary"
              >
                Analyze Changes
              </Button>
            )}

            {step === "review" && (
              <div className={styles.footerActions}>
                <Button
                  onClick={() => setStep("upload")}
                  variant="secondary"
                >
                  Back
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={selectedModules.size === 0}
                  variant="primary"
                >
                  Update Selected
                </Button>
              </div>
            )}

            {step === "success" && (
              <Button onClick={handleClose} variant="primary">
                Done
              </Button>
            )}
          </div>
        </div>
      </div>

      <DiffModal diff={diffFunction} onClose={() => setDiffFunction(null)} />
    </>
  );
};

export default ImportModal;
