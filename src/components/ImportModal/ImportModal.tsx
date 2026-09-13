import React, { useState, useEffect, useRef } from "react";
import styles from "./ImportModal.module.css";
import { Button } from "../ui/Button/Button";
import { api } from "@/services/api";
import { Loader2, Globe, History as HistoryIcon, AlertCircle, Lock, Eye, EyeOff } from "lucide-react";
import DiffModal, { FunctionDiff } from "./DiffModal";
import { Modal } from "../ui/Modal/Modal";
import { DiffResult } from "./importTypes";
import { EndpointInfo, ProjectConfig } from "@/types";
import { StandaloneCollection } from "@/providers/ProjectContext";
import { SAMPLE_COLLECTION_URL } from "@/constants";

// Components
import DropZone from "./components/DropZone";
import LoadingState from "./components/LoadingState";
import ReviewList from "./components/ReviewList";

// Hooks
import { useFileHandler } from "./hooks/useFileHandler";
import { useDiffSelection } from "./hooks/useDiffSelection";
import { useImportActions } from "./hooks/useImportActions";

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
  onManifestUpdate?: (manifest: Record<string, Record<string, EndpointInfo>> | null) => void;
  onConfigUpdate?: (config: ProjectConfig | null) => void;
  addCollection?: (collection: StandaloneCollection) => Promise<void>;
  updateCollection?: (id: string, updates: Partial<StandaloneCollection>) => Promise<void>;
  addCollectionToHistory?: (name: string, content: Record<string, unknown>) => Promise<void>;
  targetCollectionId?: string;
  collections?: StandaloneCollection[];
  onOpenHistory?: () => void;
  hasHistory?: boolean;
  autoAnalyze?: boolean;
  initialTab?: 'file' | 'url' | 'postman';
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
  updateCollection,
  targetCollectionId,
  collections,
  addCollectionToHistory,
  onOpenHistory,
  hasHistory = false,
  autoAnalyze = false,
  initialTab = 'file'
}) => {
  // Find existing collection if updating
  const existingCollection = targetCollectionId && collections ? collections.find(c => c.id === targetCollectionId) : undefined;

  // Tab state
  const [activeTab, setActiveTab] = useState<'file' | 'url' | 'postman'>(initialTab);

  // URL Fetch State
  const [fetchUrl, setFetchUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("reex_docs_url") || "";
    }
    return "";
  });
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isFetchingSample, setIsFetchingSample] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const fetchTriggeredRef = useRef(false);

  // Persist URL to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("reex_docs_url", fetchUrl);
    }
  }, [fetchUrl]);

  // Postman Fetch State
  const [postmanUrl, setPostmanUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("reex_postman_url") || "";
    }
    return "";
  });
  const [postmanApiKey, setPostmanApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("reex_postman_api_key") || "";
    }
    return "";
  });
  const [showPostmanApiKey, setShowPostmanApiKey] = useState(false);
  const [isFetchingPostman, setIsFetchingPostman] = useState(false);
  const [postmanError, setPostmanError] = useState('');

  // Persist Postman state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("reex_postman_url", postmanUrl);
    }
  }, [postmanUrl]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("reex_postman_api_key", postmanApiKey);
    }
  }, [postmanApiKey]);

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
    setFile
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
    toggleForceOverwrite,
    removedModules,
    removedFunctions,
    setRemovedModules,
    setRemovedFunctions,
    toggleRemoveModule,
    toggleRemoveFunction
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
    onError,
    setDiffs,
    setSelectedModules,
    setRemovedModules,
    setSelectedFunctions,
    setRemovedFunctions,
    forceOverwriteFunctions,
    isStandaloneMode,
    onManifestUpdate,
    onConfigUpdate,
    addCollection,
    updateCollection,
    existingCollection,
    addCollectionToHistory
  });

  // Track processed initialFile to prevent re-processing on re-renders
  const processedInitialFileRef = useRef<File | null>(null);

  // Effect: Initialize from props
  useEffect(() => {
    if (initialFile) {
      if (initialFile !== processedInitialFileRef.current) {
        processedInitialFileRef.current = initialFile;
        if (autoAnalyze) {
          fetchTriggeredRef.current = true;
        }
        setFile(initialFile);
      }
    } else {
      processedInitialFileRef.current = null;
    }
  }, [initialFile, autoAnalyze, setFile]);

  // Effect: Resume
  useEffect(() => {
    if (resumeTaskId && step === 'upload') {
      setStep('updating');
    }
  }, [resumeTaskId, step, setStep]);

  // Effect: Sync from localStorage when modal opens
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem("reex_docs_url");
      if (stored && stored !== fetchUrl) {
        setFetchUrl(stored);
      }
    }
  }, [isOpen, fetchUrl]);

  // Effect: Auto-analyze after URL fetch
  useEffect(() => {
    if (fetchTriggeredRef.current && selectedFile && collectionType !== "unknown" && step === "upload") {
      fetchTriggeredRef.current = false;
      startAnalysis(clientMappings);
    }
  }, [selectedFile, collectionType, startAnalysis, clientMappings, step]);

  // Effect: Task Complete
  useEffect(() => {
    if (taskComplete && step === "updating") {
      setStep("success");
    }
  }, [taskComplete, step, setStep]);

  const validateFetchUrl = (val: string) => {
    if (!val.trim()) {
      return 'URL is required';
    }

    try {
      new URL(val);
    } catch {
      return 'Please enter a valid URL';
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
      fetchTriggeredRef.current = true;
      setFile(file);
      // Switch to file tab so user can see the selected file
      setActiveTab('file');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setFetchError(errorMessage || 'Failed to fetch URL');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleFetchSampleCollection = async () => {
    setIsFetchingSample(true);
    try {
      let data = await api.fetchUrl(SAMPLE_COLLECTION_URL);
      if (data?.error) {
        try {
          const directRes = await fetch(SAMPLE_COLLECTION_URL);
          if (directRes.ok) {
            data = await directRes.json();
          } else {
            throw new Error(data.error);
          }
        } catch {
          throw new Error(data.error);
        }
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const file = new File([blob], 'sample-collection.json', { type: 'application/json' });
      fetchTriggeredRef.current = true;
      setFile(file);
      setActiveTab('file');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      onError(errorMessage || 'Failed to fetch sample collection');
    } finally {
      setIsFetchingSample(false);
    }
  };

  const renderHistoryOrSampleAction = () => {
    if (onOpenHistory && hasHistory) {
      return (
        <div className={styles.historyActions}>
          <Button
            variant="ghost"
            className={styles.historyBtn}
            onClick={onOpenHistory}
            leftIcon={<HistoryIcon size={14} />}
          >
            Import from recent collection
          </Button>
        </div>
      );
    }

    return (
      <div className={styles.historyActions}>
        <Button
          variant="ghost"
          className={styles.historyBtn}
          onClick={handleFetchSampleCollection}
          isLoading={isFetchingSample}
        >
          {isFetchingSample ? "Importing sample..." : "Import sample collection"}
        </Button>
      </div>
    );
  };

  const handleFetchFromPostman = async () => {
    if (!postmanUrl.trim() || !postmanApiKey.trim()) {
      setPostmanError('API Key and Collection URL/ID are required');
      return;
    }
    setPostmanError('');
    setIsFetchingPostman(true);
    try {
      const response = await fetch('/api/postman/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: postmanApiKey, urlOrId: postmanUrl }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch Postman collection');

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const file = new File([blob], 'postman-collection.json', { type: 'application/json' });
      fetchTriggeredRef.current = true;
      setFile(file);
      setActiveTab('file');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setPostmanError(errorMessage || 'Failed to fetch from Postman');
    } finally {
      setIsFetchingPostman(false);
    }
  };

  const handleReset = () => {
    setStep("upload");
    resetFile();
    setDiffs([]);
    resetSelection();
    setFetchUrl('');
    setFetchError('');
    setActiveTab('file');
    fetchTriggeredRef.current = false;
    processedInitialFileRef.current = null;
  };

  const handleModalClose = () => {
    if (step === "analyzing" || step === "updating") return;
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  const footerCTA = (
    <>
      {step === "upload" && (
        <Button
          onClick={() => startAnalysis(clientMappings)}
          disabled={!selectedFile || collectionType === "unknown" || isFetchingUrl}
          variant="primary"
          className={styles.analyzeBtn}
        >
          Analyze Changes
        </Button>
      )}

      {step === "review" && (() => {
          const addCount = diffs.filter(d => d.status === "new" && selectedModules.has(d.module)).length;
          const updateCount = diffs.filter(d => (d.status === "modified" || d.status === "unchanged") && selectedModules.has(d.module) && !removedModules.has(d.module)).length;
          const removeCount = removedModules.size;
          const segments: string[] = [];
          if (addCount > 0) segments.push(`Add ${addCount}`);
          if (updateCount > 0) segments.push(`Update ${updateCount}`);
          if (removeCount > 0) segments.push(`Remove ${removeCount}`);
          const buttonLabel = segments.length > 0 ? segments.join(' · ') : 'Update Selected';

          return (
            <div className={styles.footerActions}>
              <Button
                onClick={() => {
                  setStep("upload");
                  setDiffs([]);
                }}
                variant="secondary"
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  handleUpdate(diffs, selectedModules, selectedFunctions, removedModules, removedFunctions)
                }}
                disabled={selectedModules.size === 0 && removedModules.size === 0}
                variant="primary"
              >
                {buttonLabel}
              </Button>
            </div>
          );
        })()}

      {step === "success" && (
        <Button onClick={handleModalClose} variant="primary">Done</Button>
      )}
    </>
  );

  const getTitle = () => {
    if (step === "analyzing") return "Analyzing Collection...";
    if (step === "review") return "Review Changes";
    if (step === "updating") return "Updating Collection...";
    return "Import API Collection";
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        title={
          <div className={styles.headerTitleWrapper}>
            <span>{getTitle()}</span>

          </div>
        }
        size="lg"
        footer={step !== "analyzing" && step !== "updating" ? (
          <div className={styles.footerBar}>
            <div className={styles.footerRight}>
              {footerCTA}
            </div>
          </div>
        ) : undefined}
        showCloseButton={step !== "analyzing" && step !== "updating"}
        closeOnOverlayClick={false}
      >
        <div className={styles.body}>
          {step === "upload" && (
            <>
              {/* Tab Bar */}
              <div className={styles.tabBar}>
                <button
                  className={`${styles.tab} ${activeTab === 'file' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('file')}
                >
                  Upload File
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'url' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('url')}
                >
                  From URL
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'postman' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('postman')}
                >
                  Postman
                </button>
              </div>

              {activeTab === 'file' ? (
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

                  {renderHistoryOrSampleAction()}
                </>
              ) : activeTab === 'url' ? (
                /* URL Tab */
                <div className={styles.urlTab}>
                  <div className={styles.urlInputRow}>
                    <div className={styles.urlInputWrapper}>
                      <Globe size={16} className={styles.urlIcon} />
                      <input
                        type="text"
                        placeholder="https://api.example.com/docs.json"
                        className={`${styles.urlInput} ${fetchError ? styles.urlInputError : ''}`}
                        value={fetchUrl}
                        onChange={(e) => {
                          setFetchUrl(e.target.value);
                          if (fetchError) setFetchError('');
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleFetchFromUrl()}
                        disabled={isFetchingUrl}
                        autoFocus
                      />
                    </div>
                    <Button
                      onClick={handleFetchFromUrl}
                      disabled={!fetchUrl.trim() || isFetchingUrl}
                      variant="primary"
                      className={styles.urlFetchBtn}
                    >
                      {isFetchingUrl ? (
                        <><Loader2 size={15} className={styles.spin} /> Fetching...</>
                      ) : 'Fetch'}
                    </Button>
                  </div>
                  {fetchError && (
                    <div className={styles.urlError}>
                      <AlertCircle size={13} />
                      {fetchError}
                    </div>
                  )}

                  {renderHistoryOrSampleAction()}
                </div>
              ) : (
                /* Postman Tab */
                <div className={styles.urlTab}>
                  <div className={styles.postmanInputGroup}>
                    <label className={styles.postmanLabel}>Postman API Key</label>
                    <div className={styles.urlInputRow}>
                      <div className={styles.urlInputWrapper}>
                        <Lock size={16} className={styles.urlIcon} />
                        <input
                          type={showPostmanApiKey ? "text" : "password"}
                          placeholder="PMAK-..."
                          className={`${styles.urlInput} ${styles.urlInputPassword}`}
                          value={postmanApiKey}
                          onChange={(e) => {
                            setPostmanApiKey(e.target.value);
                            if (postmanError) setPostmanError('');
                          }}
                          disabled={isFetchingPostman}
                        />
                        <button
                          type="button"
                          className={styles.togglePasswordBtn}
                          onClick={() => setShowPostmanApiKey(!showPostmanApiKey)}
                          title={showPostmanApiKey ? "Hide API Key" : "Show API Key"}
                        >
                          {showPostmanApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <p className={styles.postmanHelperText}>
                      Get your API key from <a href="https://postman.co/settings/me/api-keys" target="_blank" rel="noopener noreferrer">Postman Account Settings</a>.
                    </p>
                  </div>

                  <div className={styles.postmanInputGroup}>
                    <label className={styles.postmanLabel}>Collection URL or ID</label>
                    <div className={styles.urlInputRow}>
                      <div className={styles.urlInputWrapper}>
                        <Globe size={16} className={styles.urlIcon} />
                        <input
                          type="text"
                          placeholder="https://futurecity-7743.postman.co/workspace/..."
                          className={`${styles.urlInput} ${postmanError ? styles.urlInputError : ''}`}
                          value={postmanUrl}
                          onChange={(e) => {
                            setPostmanUrl(e.target.value);
                            if (postmanError) setPostmanError('');
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && handleFetchFromPostman()}
                          disabled={isFetchingPostman}
                        />
                      </div>
                      <Button
                        onClick={handleFetchFromPostman}
                        disabled={!postmanUrl.trim() || !postmanApiKey.trim() || isFetchingPostman}
                        variant="primary"
                        className={styles.urlFetchBtn}
                      >
                        {isFetchingPostman ? (
                          <><Loader2 size={15} className={styles.spin} /> Fetching...</>
                        ) : 'Import'}
                      </Button>
                    </div>
                  </div>

                  {postmanError && (
                    <div className={styles.urlError}>
                      <AlertCircle size={13} />
                      {postmanError}
                    </div>
                  )}

                  {renderHistoryOrSampleAction()}
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
              removedModules={removedModules}
              removedFunctions={removedFunctions}
              onToggleRemoveModule={toggleRemoveModule}
              onToggleRemoveFunction={toggleRemoveFunction}
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
    </>
  );
};

export default ImportModal;
