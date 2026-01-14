/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { api } from "../../services/api";
import styles from "./GenerateTemplateModal.module.css";
import { Button } from "../ui/Button/Button";
import { useProject } from "../../providers/ProjectContext";

interface GenerateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onGenerated?: () => void; // Optional callback after successful generation
  onTaskStarted?: (taskId: string) => void;
  targetDir: string; // REQUIRED
}

const GenerateTemplateModal: React.FC<GenerateTemplateModalProps> = ({
  isOpen,
  onClose,
  onGenerated,
  onSuccess,
  onTaskStarted,
  targetDir // REQUIRED
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
      const data = await api.generateTemplate({
        moduleName: moduleName.trim().toLowerCase()
      }, targetDir);

      if (!data.success) {
        throw new Error(data.error || "Failed to generate template");
      }

      // onSuccess(data.message || "Template generation started!"); // REMOVED as per user request

      if (data.taskId && onTaskStarted) {
        onTaskStarted(data.taskId);
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

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Disabled overlay click for now as per previous logic (marked as 'return' in prev code)
    return;
    /*
    if (e.target === e.currentTarget && !generating) {
      handleClose();
    }
    */
  };

  return (
    <>
      <div className={styles.overlay} onClick={handleOverlayClick}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <h2 className={styles.title}>Generate API Template</h2>
            <Button
              onClick={handleClose}
              variant="ghost"
              disabled={generating}
              size="sm"
            >
              ✕
            </Button>
          </div>

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

          <div className={styles.footer}>
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
          </div>
        </div>
      </div>
    </>
  );
};

export default GenerateTemplateModal;
