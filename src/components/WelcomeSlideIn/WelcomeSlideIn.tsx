"use client";

import React, { useState, useEffect, useCallback } from 'react';
import styles from './WelcomeSlideIn.module.css';
import { Terminal, Globe, Copy, CheckCircle2, X, Sparkles, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export default function WelcomeSlideIn() {
    const { showToast } = useToast();
    const [copiedProxy, setCopiedProxy] = useState(false);
    const [copiedCliInstall, setCopiedCliInstall] = useState(false);
    const [copiedCliStart, setCopiedCliStart] = useState(false);
    const [mountState, setMountState] = useState<'loading' | 'show-slide' | 'show-fab'>('loading');

    useEffect(() => {
        const dismissed = localStorage.getItem('reex_welcome_slide_dismissed');
        queueMicrotask(() => {
            if (!dismissed) {
                setMountState('show-slide');
                localStorage.setItem('reex_welcome_slide_dismissed', 'true');
            } else {
                setMountState('show-fab');
            }
        });
    }, []);

    const handleDismiss = useCallback(() => {
        setMountState('show-fab');
        localStorage.setItem('reex_welcome_slide_dismissed', 'true');
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && mountState === 'show-slide') {
                handleDismiss();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mountState, handleDismiss]);

    const handleCopy = (text: string, setCopied: React.Dispatch<React.SetStateAction<boolean>>) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        showToast('success', 'Command copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };



    const handleRestore = () => {
        setMountState('show-slide');
    };

    if (mountState === 'loading') return null;

    if (mountState === 'show-fab') {
        return (
            <button className={styles.fab} onClick={handleRestore} title="Setup Instructions">
                <Terminal size={16} />
            </button>
        );
    }

    return (
        <div className={styles.slideIn}>
            <div className={styles.header}>
                <div className={styles.titleWrapper}>
                    <Sparkles size={16} color="#3b82f6" />
                    <h3 className={styles.title}>Developer Tools</h3>
                </div>
                <button className={styles.closeBtn} onClick={handleDismiss} title="Dismiss">
                    <X size={16} />
                </button>
            </div>
            
            <div className={styles.content}>
                {/* Localhost section */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionHeaderLeft}>
                            <Globe size={14} color="#64748b" />
                            <h4 className={styles.sectionTitle}>Test Localhost APIs</h4>
                        </div>
                    </div>
                    <div className={styles.codeBox}>
                        <div className={styles.codeLines}>
                            <span className={styles.codeLine}>npx reex-proxy</span>
                        </div>
                        <button 
                            className={styles.copyBtn} 
                            onClick={() => handleCopy('npx reex-proxy', setCopiedProxy)}
                            title="Copy command"
                        >
                            {copiedProxy ? <CheckCircle2 size={14} color="#10b981" /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                {/* CLI section */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionHeaderLeft}>
                            <Terminal size={14} color="#64748b" />
                            <h4 className={styles.sectionTitle}>Generate APIs to Local Project</h4>
                        </div>
                        <a
                            href="https://www.npmjs.com/package/reex-cli"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.npmLink}
                            title="View reex-cli on npm"
                        >
                            <span>npm</span>
                            <ExternalLink size={11} />
                        </a>
                    </div>
                    <div className={styles.stepGroup}>
                        <div className={styles.stepLabel}>
                            1. Install globally:
                        </div>
                        <div className={styles.codeBox}>
                            <div className={styles.codeLines}>
                                <span className={styles.codeLine}>npm install -g reex-cli</span>
                            </div>
                            <button 
                                className={styles.copyBtn} 
                                onClick={() => handleCopy('npm install -g reex-cli', setCopiedCliInstall)}
                                title="Copy command"
                            >
                                {copiedCliInstall ? <CheckCircle2 size={14} color="#10b981" /> : <Copy size={14} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <div className={styles.stepLabel}>
                            2. Run in project directory:
                        </div>
                        <div className={styles.codeBox}>
                            <div className={styles.codeLines}>
                                <span className={styles.codeLine}>reex start</span>
                            </div>
                            <button 
                                className={styles.copyBtn} 
                                onClick={() => handleCopy('reex start', setCopiedCliStart)}
                                title="Copy command"
                            >
                                {copiedCliStart ? <CheckCircle2 size={14} color="#10b981" /> : <Copy size={14} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
