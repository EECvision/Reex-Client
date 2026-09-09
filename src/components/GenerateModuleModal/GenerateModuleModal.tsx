"use client";

import React, { useState } from "react";
import { api } from "../../services/api";
import styles from "./GenerateModuleModal.module.css";
import { Button } from "../ui/Button/Button";
import { Modal } from "../ui/Modal/Modal";
import { useProject } from "../../providers/ProjectContext";

interface GenerateModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onGenerated?: () => void; // Optional callback after successful generation
  onTaskStarted?: (taskId: string) => void;
  targetDir: string; // REQUIRED
}

const GenerateModuleModal: React.FC<GenerateModuleModalProps> = ({
  isOpen,
  onClose,
  onGenerated,

  onTaskStarted,
  targetDir, // REQUIRED
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

      const data = await api.generateTemplate(
        {
          moduleName: moduleName.trim().toLowerCase(),
        },
        targetDir,
        api.getBridgeUrl(),
        taskId,
      );

      if (!data.success) {
        throw new Error(data.error || "Failed to generate module");
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || "Failed to generate module");
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

  const footerContent = (
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
      title="Generate New Module"
      size="md"
      footer={footerContent}
      closeOnOverlayClick={!generating}
      showCloseButton={!generating}
    >
      <div className={styles.content}>
        <label className={styles.label}>
          Module Name
          <span className={styles.hint}> (e.g., users, products, orders)</span>
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
          This will generate a TypeScript module with GET, POST, PUT, and DELETE
          operations.
        </p>
      </div>
    </Modal>
  );
};

export default GenerateModuleModal;
