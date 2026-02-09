"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./LoginModal.module.css";
import { Button } from "../ui/Button/Button";
import { useAuth } from "@/providers/AuthContext";
import Logo from "../Logo/Logo";
import { Github } from "lucide-react";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    message?: string;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, message }) => {
    const { login } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !mounted) return null;

    const handleGoogleLogin = () => {
        login("google");
        onClose();
    };

    const handleGithubLogin = () => {
        login("github");
        onClose();
    };

    const modalContent = (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
                        <Logo icon />
                    </div>
                    <h2 className={styles.title}>Sign in to Reex API Builder</h2>
                    <p className={styles.subtitle}>
                        {message || "Please sign in to continue using Reex API Builder."}
                    </p>
                </div>

                <div className={styles.content}>
                    <Button
                        variant="ghost"
                        onClick={handleGoogleLogin}
                        style={{ width: '100%', marginBottom: 12, justifyContent: 'center', border: '1px solid var(--border-color)' }}
                    >
                        <svg className="w-5 h-5 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" style={{ width: 18, height: 18, marginRight: 8 }}>
                            <path fillRule="evenodd" d="M12.037 21.998a10.313 10.313 0 0 1-7.168-3.049 9.888 9.888 0 0 1-2.868-7.118 9.947 9.947 0 0 1 3.064-6.949A10.37 10.37 0 0 1 12.212 2h.176a9.935 9.935 0 0 1 6.614 2.564l-2.757 2.643a5.47 5.47 0 0 0-3.857-1.387A6.022 6.022 0 0 0 7.166 11.85a6.018 6.018 0 0 0 6.169 6.018c4.109 0 5.404-2.503 5.545-3.669h-5.545v-3.419h9.382c.1.997.108 1.956.108 2.227 0 4.671-2.868 9.043-10.788 8.991Z" clipRule="evenodd" />
                        </svg>
                        Continue with Google
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={handleGithubLogin}
                        style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--border-color)' }}
                    >
                        <Github size={18} style={{ marginRight: 8 }} />
                        Continue with GitHub
                    </Button>
                </div>

                <div className={styles.footer} style={{ textAlign: 'center', marginTop: 16 }}>
                    <Button variant="ghost" onClick={onClose} size="sm">
                        Cancel
                    </Button>
                </div>

            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default LoginModal;
