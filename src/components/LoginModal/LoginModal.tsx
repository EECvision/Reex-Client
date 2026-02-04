"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./LoginModal.module.css";
import { Button } from "../ui/Button/Button";
import { useAuth } from "@/providers/AuthContext";
import Logo from "../Logo/Logo";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    message?: string;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, message }) => {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !mounted) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email.trim()) {
            login(email);
            onClose();
        }
    };

    const modalContent = (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                        <Logo size="lg" />
                    </div>
                    <h2 className={styles.title}>Sign in to Reex</h2>
                    <p className={styles.subtitle}>
                        {message || "Please sign in to continue using Reex API Builder."}
                    </p>
                </div>

                <form className={styles.content} onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Email Address</label>
                        <input
                            type="email"
                            placeholder="you@example.com"
                            className={styles.input}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>

                    <div className={styles.actions}>
                        <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" style={{ flex: 1 }}>
                            Sign In
                        </Button>
                    </div>
                </form>

                <div className={styles.footer}>
                    This is a simulated login for Phase 1.
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default LoginModal;
