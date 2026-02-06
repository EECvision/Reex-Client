"use client";

import React, { useState } from "react";
import styles from "./docs.module.css";
import { useAuth } from "@/providers/AuthContext";
import { Book, FileText, Code, Terminal } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";

export default function DocsPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'getting-started' | 'api-reference' | 'guides'>('getting-started');

    if (!user) return null;

    return (
        <main className={styles.container}>
            <h1 className={styles.pageTitle}>Documentation</h1>

            <div className={styles.layout}>
                {/* Left Sidebar */}
                <aside className={styles.sidebar}>
                    <button
                        className={`${styles.navItem} ${activeTab === 'getting-started' ? styles.active : ''}`}
                        onClick={() => setActiveTab('getting-started')}
                    >
                        Getting Started
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'api-reference' ? styles.active : ''}`}
                        onClick={() => setActiveTab('api-reference')}
                    >
                        API Reference
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'guides' ? styles.active : ''}`}
                        onClick={() => setActiveTab('guides')}
                    >
                        Guides
                    </button>
                </aside>

                {/* Right Content */}
                <div className={styles.content}>
                    {activeTab === 'getting-started' && (
                        <div className={styles.card}>
                            <div className={styles.cardContent}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                    <Book size={24} color="var(--primary-color)" />
                                    <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>Introduction to ReexAPI</h2>
                                </div>
                                <p className={styles.cardDescription}>
                                    Learn the basics of how to import collections, test endpoints, and generate code snippets.
                                </p>

                            </div>
                        </div>
                    )}

                    {activeTab === 'api-reference' && (
                        <div className={styles.card}>
                            <div className={styles.cardContent}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                    <Code size={24} color="var(--primary-color)" />
                                    <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>API Endpoints</h2>
                                </div>
                                <p className={styles.cardDescription}>
                                    Detailed reference documentation for all available API endpoints, parameters, and responses.
                                </p>

                            </div>
                        </div>
                    )}

                    {activeTab === 'guides' && (
                        <>
                            <div className={styles.card}>
                                <div className={styles.cardContent}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                        <Terminal size={24} color="var(--primary-color)" />
                                        <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>CLI Usage</h2>
                                    </div>
                                    <p className={styles.cardDescription}>
                                        Master the command line interface to automate your API workflows.
                                    </p>

                                </div>
                            </div>
                            <div className={styles.card}>
                                <div className={styles.cardContent}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                        <FileText size={24} color="var(--primary-color)" />
                                        <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>Best Practices</h2>
                                    </div>
                                    <p className={styles.cardDescription}>
                                        Tips and tricks for organizing your collections and workspaces efficiently.
                                    </p>

                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}
