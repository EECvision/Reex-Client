/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { api } from "../../services/api";
import styles from "./GenerateTemplateModal.module.css";
import { Button } from "../ui/Button/Button";
import { Modal } from "../ui/Modal/Modal";
import { useProject } from "../../providers/ProjectContext";

interface GenerateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onGenerated?: () => void;
  onTaskStarted?: (taskId: string) => void;
  targetDir: string;
  onViewCodeClick?: () => void;
}

const GenerateTemplateModal: React.FC<GenerateTemplateModalProps> = ({
  isOpen,
  onClose,
  onGenerated,
  onSuccess,
  onTaskStarted,
  targetDir,
  onViewCodeClick
}) => {
  const [moduleName, setModuleName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { refreshProject } = useProject();

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!moduleName.trim()) {
      setError("Module name is required");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      // Generate taskId on client to avoid race condition
      const taskId = Date.now().toString();

      // Notify parent immediately so it can start listening BEFORE the request
      if (onTaskStarted) onTaskStarted(taskId);

      const data = await api.generateTemplate({
        moduleName: moduleName.trim().toLowerCase()
      }, targetDir, api.getBridgeUrl(), taskId);

      if (!data.success) {
        throw new Error(data.error || "Failed to generate template");
      }

      // onSuccess(data.message || "Template generation started!"); // REMOVED as per user request

      if (data.taskId && onTaskStarted) {
        // onTaskStarted(data.taskId); // Already called before request
        // Task started: Keep modal open and "generating" state active
        // Do NOT close. Do NOT setGeneratig(false).
        return;
      }

      // Fallback for sync behavior or if no taskId
      await refreshProject(true);

      if (onGenerated) {
        onGenerated();
      }

      // Reset and close (only if sync)
      setModuleName("");
      setError(null);
      setGenerating(false);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to generate template");
      setGenerating(false);
    }
  };

  const handleClose = () => {
    if (!generating) {
      setModuleName("");
      setError(null);
      onClose();
    }
  };

  const footerContent = generating ? (
    <>
      <Button onClick={handleClose} variant="secondary" disabled={generating}>
        Cancel
      </Button>
      <Button onClick={handleGenerate} disabled={generating} isLoading={generating} variant="primary">
        Generate
      </Button>
    </>
  ) : moduleName && !generating ? (
    // After successful generation (generating=false, moduleName still set, no error)
    <>
      {onViewCodeClick && (
        <Button
          onClick={() => { onViewCodeClick(); handleClose(); }}
          variant="secondary"
        >
          View Generated Code →
        </Button>
      )}
      <Button
        onClick={handleClose}
        variant="secondary"
        disabled={generating}
      >
        Cancel
      </Button>
      <Button
        onClick={handleGenerate}
        disabled={generating || !moduleName.trim()}
        isLoading={generating}
        variant="primary"
      >
        Generate
      </Button>
    </>
  ) : (
    <>
      <Button onClick={handleClose} variant="secondary" disabled={generating}>
        Cancel
      </Button>
      <Button
        onClick={handleGenerate}
        disabled={generating || !moduleName.trim()}
        isLoading={generating}
        variant="primary"
      >
        Generate
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generate API Template"
      size="md"
      footer={footerContent}
      closeOnOverlayClick={!generating}
      showCloseButton={!generating}
    >
      <div className={styles.content}>
        <label className={styles.label}>
          Module Name
          <span className={styles.hint}>
            {" "}
            (e.g., users, products, orders)
          </span>
        </label>
        <input
          type="text"
          value={moduleName}
          onChange={(e) => setModuleName(e.target.value)}
          placeholder="Enter module name..."
          className={styles.input}
          disabled={generating}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
        />
        {error && <p className={styles.error}>{error}</p>}
        <p className={styles.description}>
          This will generate a TypeScript module with GET, POST, PUT, and
          DELETE operations.
        </p>
      </div>
    </Modal>
  );
};

export default GenerateTemplateModal;
