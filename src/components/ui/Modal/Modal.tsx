import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';
import { Button } from '../Button/Button';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showCloseButton?: boolean;
    className?: string; // For the modal container
    overlayClassName?: string; // For the overlay
    closeOnOverlayClick?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    showCloseButton = true,
    className = '',
    overlayClassName = '',
    closeOnOverlayClick = true
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (isOpen && e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen || !mounted) return null;

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
            onClose();
        }
    };

    const modalContent = (
        <div className={`${styles.overlay} ${overlayClassName}`} onClick={handleOverlayClick}>
            <div className={`${styles.modal} ${styles[size]} ${className}`}>
                {title && (
                    <div className={styles.header}>
                        <h2 className={styles.title}>{title}</h2>
                        {showCloseButton && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                className={styles.closeButton}
                                title="Close"
                            >
                                <X size={18} />
                            </Button>
                        )}
                    </div>
                )}

                {/* If no title but close button is requested, render a standalone close button */}
                {!title && showCloseButton && (
                    <div className={styles.absoluteClose}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className={styles.closeButton}
                            title="Close"
                        >
                            <X size={18} />
                        </Button>
                    </div>
                )}

                <div className={styles.body}>
                    {children}
                </div>

                {footer && (
                    <div className={styles.footer}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
