import React from "react";
import styles from "./Toast.module.css";
import { Button } from "../ui/Button/Button";
import { XIcon } from "lucide-react";

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

interface ToastProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError
            }`}
        >
          <div className={styles.toastIcon}>
            {toast.type === "success" ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
          </div>
          <span className={styles.toastMessage}>{toast.message}</span>
          <Button
            onClick={() => onDismiss(toast.id)}
            variant="ghost"
            size="sm"
            className={styles.toastClose}
          >
            <XIcon size={16} />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
