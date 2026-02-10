"use client";
import React from 'react';
import { Power, RefreshCw } from 'lucide-react';
import styles from './FloatingStandaloneToggle.module.css';
import { useProject } from '@/providers/ProjectContext';

const FloatingStandaloneToggle = () => {
    const { isStandaloneMode, manualStandaloneMode, toggleStandaloneMode } = useProject();

    if (!isStandaloneMode) {
        // Project Mode -> Show "Switch to Standalone"
        return (
            <button
                onClick={toggleStandaloneMode}
                className={styles.fab}
                title="Switch to Standalone Mode"
            >
                <span className={styles.label}>Standalone</span>
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
