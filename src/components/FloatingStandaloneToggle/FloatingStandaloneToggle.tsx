"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import { Power, RefreshCw } from 'lucide-react';
import styles from './FloatingStandaloneToggle.module.css';
import { useProject } from '@/providers/ProjectContext';

const FloatingStandaloneToggle = () => {
    const pathname = usePathname();
    const { isStandaloneMode, manualStandaloneMode, toggleStandaloneMode } = useProject();

    // Only show on workspace (root)
    if (pathname !== '/') {
        return null;
    }

    if (!isStandaloneMode) {
        // Project Mode -> Show "Switch to Standalone"
        return (
            <button
                onClick={toggleStandaloneMode}
                className={styles.fab}
                title="Switch to Preview"
            >
                <span className={styles.label}>Preview</span>
                <Power size={16} style={{ flexShrink: 0 }} />
            </button>
        );
    }

    if (manualStandaloneMode) {
        // Manual Standalone -> Show "Reconnect"
        return (
            <button
                onClick={toggleStandaloneMode}
                className={`${styles.fab} ${styles.active}`}
                title="Reconnect to Project"
            >
                <span className={styles.label}>Reconnect</span>
                <RefreshCw size={16} style={{ flexShrink: 0 }} />
            </button>
        );
    }

    // Auto Standalone - Hide to avoid clutter
    return null;
};

export default FloatingStandaloneToggle;
