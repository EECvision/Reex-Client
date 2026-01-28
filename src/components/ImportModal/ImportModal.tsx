import React, { useState, useEffect } from "react";
import styles from "./ImportModal.module.css";
import { Button } from "../ui/Button/Button";
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
  clientMappings
}) => {
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
  } = useFileHandler();

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
    setDiffs,
    setSelectedModules,
    setSelectedFunctions,
    forceOverwriteFunctions
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

  // Effect: Task Complete
  useEffect(() => {
    if (taskComplete && step === "updating") {
      setStep("success");
    }
  }, [taskComplete, step, setStep]);

  const handleReset = () => {
    setStep("upload");
    resetFile();
    setDiffs([]);
    resetSelection();
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
          disabled={!selectedFile || collectionType === "unknown"}
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
            onClick={() => handleUpdate(diffs, selectedModules, selectedFunctions)}
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
    if (step === "upload") return "Import API Collection";
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
        title={getTitle()}
        size="lg"
        footer={step !== "analyzing" && step !== "updating" ? footerContent : undefined}
        showCloseButton={step !== "analyzing" && step !== "updating"}
        closeOnOverlayClick={step !== "analyzing" && step !== "updating"}
      >
        <div className={styles.body}>
          {step === "upload" && (
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
    </>
  );
};

export default ImportModal;
