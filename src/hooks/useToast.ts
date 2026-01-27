
import { useState, useCallback } from "react";
import { ToastItem } from "@/types";

export const useToast = () => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((type: "success" | "error", message: string) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, type, message }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 5000);
    }, []);

    const dismissToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return { toasts, showToast, dismissToast };
};
