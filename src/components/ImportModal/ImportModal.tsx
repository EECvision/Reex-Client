import React, { useState, useEffect } from "react";
import styles from "./ImportModal.module.css";
import { useAuth } from "@/providers/AuthContext";
import { Button } from "../ui/Button/Button";
import { api } from "@/services/api";
import { Loader2, Globe, History as HistoryIcon, AlertCircle } from "lucide-react";
import DiffModal, { FunctionDiff } from "./DiffModal";
import { Modal } from "../ui/Modal/Modal";
import { DiffResult } from "./importTypes";

// Components
import DropZone from "./components/DropZone";
import LoadingState from "./components/LoadingState";
import ReviewList from "./components/ReviewList";

// Hooks
import { useFileHandler } from "./hooks/useFileHandler";
import { useDiffSelection } from "./hooks/useDiffSelection";
import { useImportActions } from "./hooks/useImportActions";
import { useSubscription } from "@/hooks/useSubscription";
import LoginModal from "../LoginModal/LoginModal";
import { LimitReachedModal } from "./components/LimitReachedModal";
import { FREE_PROJECT_IMPORT_LIMIT } from "@/lib/constants";

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
  clientMappings?: Record<string, string>;
  onError: (message: string) => void;
  isStandaloneMode?: boolean;
  onManifestUpdate?: (manifest: any) => void;
  onConfigUpdate?: (config: any) => void;
  addCollection?: (collection: any) => void;
  addCollectionToHistory?: (name: string, content: any) => Promise<void>;
  onOpenHistory?: () => void;
  hasHistory?: boolean;
}


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
  onSuccess,
  clientMappings,
  onError,
  isStandaloneMode = false,
  onManifestUpdate,
  onConfigUpdate,
  addCollection,
  addCollectionToHistory,
  onOpenHistory,
  hasHistory = false
}) => {
  // Auth Check
  // We use useSubscription here to get the real-time project_import_count
  const { user, isPro } = useSubscription();
  const { isAuthenticated, login } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // URL Fetch State
  const [fetchUrl, setFetchUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("docs_url") || "";
    }
    return "";
  });
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Persist URL to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("docs_url", fetchUrl);
    }
  }, [fetchUrl]);

  // State for Diffs
  const [diffs, setDiffs] = useState<DiffResult[]>([]);

  // Diff Modal State
  const [diffFunction, setDiffFunction] = useState<FunctionDiff | null>(null);

  // Hooks
  const {
    dragActive,
    selectedFile,
    collectionType,
    inputRef,
    handleDrag,
    handleDrop,
    handleChange,
    resetFile,
    setFile // Exposed process logic
  } = useFileHandler(undefined, onError);

  const {
    selectedModules,
    selectedFunctions,
    expandedModules,
    toggleModule,
    toggleFunction,
    toggleExpand,
    resetSelection,
    selectAll,
    deselectAll,
    setSelectedModules,
    setSelectedFunctions,
    forceOverwriteFunctions,
    toggleForceOverwrite
  } = useDiffSelection();

  const {
    step,
    setStep,
    startAnalysis,
    handleUpdate
  } = useImportActions({
    selectedFile,
    targetDir,
    onUpdateStarted,
    onSuccess,
    onError: (msg) => {
      if (msg.includes("Free limit reached") || msg.includes("Limit Exceeded")) {
        setShowLimitModal(true);
      } else {
        onError(msg);
      }
    },
    setDiffs,
    setSelectedModules,
    setSelectedFunctions,
    forceOverwriteFunctions,
    isStandaloneMode,
    onManifestUpdate,
    onConfigUpdate,
    addCollection,
    addCollectionToHistory
  });

  // Effect: Initialize from props
  useEffect(() => {
    if (initialFile) {
      setFile(initialFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  // Effect: Resume
  useEffect(() => {
    if (resumeTaskId && step === 'upload') {
      setStep('updating');
    }
  }, [resumeTaskId, step, setStep]);

  // Effect: Sync from localStorage when modal opens
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem("docs_url");
      if (stored && stored !== fetchUrl) {
        setFetchUrl(stored);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Effect: Task Complete
  useEffect(() => {
    if (taskComplete && step === "updating") {
      setStep("success");
    }
  }, [taskComplete, step, setStep]);

  const validateFetchUrl = (val: string) => {
    if (!val.trim()) return 'URL is required';
    const lowerVal = val.toLowerCase();
    if (
      !lowerVal.endsWith('.json') &&
      !lowerVal.endsWith('.postman') &&
      !lowerVal.endsWith('.openapi') &&
      !lowerVal.endsWith('.yaml') &&
      !lowerVal.endsWith('.yml')
    ) {
      return 'URL must end with .json, .yaml, .yml, .postman or .openapi';
    }
    return '';
  };

  const handleFetchFromUrl = async () => {
    const validationError = validateFetchUrl(fetchUrl);
    if (validationError) {
      setFetchError(validationError);
      return;
    }
    setFetchError('');
    setIsFetchingUrl(true);
    try {
      const data = await api.fetchUrl(fetchUrl);
      if (data.error) throw new Error(data.error);

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const filename = fetchUrl.split('/').pop() || 'imported-collection.json';
      const lowerFilename = filename.toLowerCase();
      let finalName = filename;
      if (
        !lowerFilename.endsWith('.json') &&
        !lowerFilename.endsWith('.postman') &&
        !lowerFilename.endsWith('.openapi') &&
        !lowerFilename.endsWith('.yaml') &&
        !lowerFilename.endsWith('.yml')
      ) {
        finalName = `${filename}.json`;
      }

      const file = new File([blob], finalName, { type: 'application/json' });
      setFile(file);
    } catch (err: any) {
      setFetchError(err.message || 'Failed to fetch URL');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleReset = () => {
    setStep("upload");
    resetFile();
    setDiffs([]);
    resetSelection();
    setFetchUrl('');
    setFetchError('');
  };

  const handleModalClose = () => {
    if (step === "analyzing" || step === "updating") return;
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  const footerContent = (
    <>
      {step === "upload" && (
        <Button
          onClick={() => startAnalysis(clientMappings)}
          disabled={!selectedFile || collectionType === "unknown" || isFetchingUrl}
          variant="primary"
        >
          Analyze Changes
        </Button>
      )}

      {step === "review" && (
        <div className={styles.footerActions}>
          <Button
            onClick={() => {
              setStep("upload");
              setDiffs([]); // Clear diffs when going back? logic choice.
            }}
            variant="secondary"
          >
            Back
          </Button>
          <Button
            onClick={() => {
              if (isStandaloneMode && !isAuthenticated) {
                setShowLoginModal(true);
                return;
              }
              handleUpdate(diffs, selectedModules, selectedFunctions)
            }}
            disabled={selectedModules.size === 0}
            variant="primary"
          >
            Update Selected
          </Button>
        </div>
      )}

      {step === "success" && (
        <Button onClick={handleModalClose} variant="primary">
          Done
        </Button>
      )}
    </>
  );

  const getTitle = () => {
    let baseTitle = "Import API Collection";
    if (step === "analyzing") baseTitle = "Analyzing Collection...";
    if (step === "review") baseTitle = "Review Changes";
    if (step === "updating") baseTitle = "Updating Collection...";

    // Add Usage Badge for Hobby Users in Project Mode
    if (!isStandaloneMode && !isPro && user?.project_import_count !== undefined) {
      return (
        <div className={styles.headerTitleWrapper}>
          {baseTitle}
          <span className={styles.usageBadge}>
            {user.project_import_count}/{FREE_PROJECT_IMPORT_LIMIT} Free Imports
          </span>
        </div>
      );
    }

    return baseTitle;
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        title={getTitle()}
        size="lg"
        footer={step !== "analyzing" && step !== "updating" ? footerContent : undefined}
        showCloseButton={step !== "analyzing" && step !== "updating"}
        closeOnOverlayClick={step !== "analyzing" && step !== "updating"}
      >
        <div className={styles.body}>
          {step === "upload" && (
            <>
              <DropZone
                dragActive={dragActive}
                selectedFile={selectedFile}
                collectionType={collectionType}
                inputRef={inputRef as React.RefObject<HTMLInputElement>}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onChange={handleChange}
                onClearFile={resetFile}
              />

              {/* URL Import Section */}
              <div className={styles.urlSection}>
                <div className={styles.urlDivider}>
                  <span>or import from URL</span>
                </div>
                <div className={styles.urlInputRow}>
                  <div className={styles.urlInputWrapper}>
                    <Globe size={18} className={styles.urlIcon} />
                    <input
                      type="text"
                      placeholder="https://example.com/api-docs.json"
                      className={`${styles.urlInput} ${fetchError ? styles.urlInputError : ''}`}
                      value={fetchUrl}
                      onChange={(e) => {
                        setFetchUrl(e.target.value);
                        if (fetchError) setFetchError('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleFetchFromUrl()}
                      disabled={isFetchingUrl}
                    />
                  </div>
                  <Button
                    onClick={handleFetchFromUrl}
                    disabled={!fetchUrl.trim() || isFetchingUrl}
                    variant="primary"
                    className={styles.urlFetchBtn}
                  >
                    {isFetchingUrl ? (
                      <><Loader2 size={16} className={styles.spin} /> Fetching...</>
                    ) : (
                      'Fetch'
                    )}
                  </Button>
                </div>
                {fetchError && (
                  <div className={styles.urlError}>
                    <AlertCircle size={14} />
                    {fetchError}
                  </div>
                )}
              </div>

              {onOpenHistory && hasHistory && (
                <div className={styles.historyActions}>
                  <Button
                    variant="ghost"
                    className={styles.historyBtn}
                    onClick={onOpenHistory}
                    leftIcon={<HistoryIcon size={16} />}
                  >
                    Import from recent collection
                  </Button>
                </div>
              )}
            </>
          )}

          {step === "analyzing" && (
            <LoadingState
              message={isEmptyWorkspace ? "Processing new collection..." : "Comparing with existing API definitions..."}
            />
          )}

          {step === "review" && (
            <ReviewList
              diffs={diffs}
              selectedModules={selectedModules}
              selectedFunctions={selectedFunctions}
              expandedModules={expandedModules}
              onSelectAll={() => selectAll(diffs)}
              onDeselectAll={deselectAll}
              onToggleModule={toggleModule}
              onToggleFunction={toggleFunction}
              onToggleExpand={toggleExpand}
              onViewChanges={setDiffFunction}
              forceOverwriteFunctions={forceOverwriteFunctions}
              onToggleForceOverwrite={toggleForceOverwrite}
            />
          )}

          {step === "updating" && (
            <LoadingState
              message={progressMessage || "Applying changes..."}
            />
          )}

          {step === "success" && (
            <LoadingState
              message="Collection Updated Successfully!"
              isSuccess
            />
          )}
        </div>
      </Modal>

      <DiffModal diff={diffFunction} onClose={() => setDiffFunction(null)} />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="You need to be signed in to update cloud collections."
      />

      <LimitReachedModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limit={FREE_PROJECT_IMPORT_LIMIT}
      />
    </>
  );
};

export default ImportModal;
