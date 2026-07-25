import React from "react";
import styles from "./DeleteConfirmModal.module.css";
import { Button } from "../ui/Button/Button";
import { Modal } from "../ui/Modal/Modal";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    deleting: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    deleting,
    title = "Delete Collection",
    message = "Are you sure you want to delete this collection? This action cannot be undone and all generated API modules will be removed.",
    confirmText = "Delete",
}) => {

    const footer = (
        <div className={styles.footerButtons}>
            <Button
                onClick={onClose}
                variant="secondary"
                disabled={deleting}
            >
                Cancel
            </Button>
            <Button
                onClick={onConfirm}
                disabled={deleting}
                isLoading={deleting}
                variant="danger"
            >
                {confirmText}
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="md"
            footer={footer}
            showCloseButton={!deleting}
            closeOnOverlayClick={!deleting}
        >
            <div className={styles.content}>
                <div className={styles.warningIconWrapper}>
                    <AlertTriangle className={styles.warningIcon} size={24} />
                </div>
                <p className={styles.message}>{message}</p>
            </div>
        </Modal>
    );
};

export default DeleteConfirmModal;
