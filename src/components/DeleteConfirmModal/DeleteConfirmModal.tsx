import React from "react";
import styles from "./DeleteConfirmModal.module.css";
import { Button } from "../ui/Button/Button";

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    deleting: boolean;
    title?: string;
    message?: string;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    deleting,
    title = "Delete Collection",
    message = "Are you sure you want to delete this collection? This action cannot be undone and all generated API modules will be removed.",
}) => {
    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        return;
        if (e.target === e.currentTarget && !deleting) {
            onClose();
        }
    };

    const handleConfirm = async () => {
        await onConfirm();
    };

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{title}</h2>
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        disabled={deleting}
                        size="sm"
                    >
                        ✕
                    </Button>
                </div>

                <div className={styles.content}>
                    <div className={styles.warningIconWrapper}>
                        <svg
                            className={styles.warningIcon}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </div>
                    <p className={styles.message}>{message}</p>
                </div>

                <div className={styles.footer}>
                    <Button
                        onClick={onClose}
                        variant="secondary"
                        disabled={deleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={deleting}
                        isLoading={deleting}
                        variant="danger"
                    >
                        Delete
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmModal;
