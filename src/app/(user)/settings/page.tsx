"use client";

import React, { useState } from "react";
import styles from "./settings.module.css";
import { Button } from "@/components/ui/Button/Button";
import { useAuth } from "@/providers/AuthContext";
import { useSettings } from "@/providers/SettingsContext";
import { Trash2, Monitor } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useSettings();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'account' | 'billing' | 'integrations'>('account');

    const handleSignOut = () => {
        logout();
        router.push("/");
    };

    return (
        <main className={styles.container}>
            <h1 className={styles.pageTitle}>Settings</h1>

            <div className={styles.layout}>
                {/* Left Sidebar */}
                <aside className={styles.sidebar}>
                    <button
                        className={`${styles.navItem} ${activeTab === 'account' ? styles.active : ''}`}
                        onClick={() => setActiveTab('account')}
                    >
                        Account
                    </button>
                    <button className={`${styles.navItem} ${activeTab === 'billing' ? styles.active : ''}`} onClick={() => setActiveTab('billing')}>Billing</button>
                    {/* <button
                        className={`${styles.navItem} ${activeTab === 'theme' ? styles.active : ''}`}
                        onClick={() => setActiveTab('theme')}
                    >
                        Theme
                    </button> */}
                    {/* <button className={`${styles.navItem} ${activeTab === 'integrations' ? styles.active : ''}`} onClick={() => setActiveTab('integrations')}>Integrations</button> */}
                </aside>

                {/* Right Content */}
                <div className={styles.content}>


                    {activeTab === 'account' && user && (
                        <>
                            <div className={styles.card}>
                                <div className={styles.cardContent}>
                                    <h2 className={styles.cardTitle}>Display Name</h2>
                                    <p className={styles.cardDescription}>
                                        This is your visible name within ReexAPI. It will be displayed on your dashboard and invoices.
                                    </p>
                                    <input
                                        type="text"
                                        defaultValue={user.name || ""}
                                        className={styles.input}
                                        placeholder="e.g. Acme Corp"
                                    />
                                </div>
                                <div className={styles.cardFooter}>
                                    <span className={styles.footerText}>Please use 32 characters at maximum.</span>
                                    <Button variant="primary" size="sm">Save</Button>
                                </div>
                            </div>

                            <div className={styles.card}>
                                <div className={styles.cardContent}>
                                    <h2 className={styles.cardTitle}>Email Address</h2>
                                    <p className={styles.cardDescription}>
                                        The email address you use to log in.
                                    </p>
                                    <input
                                        type="email"
                                        defaultValue={user.email || ""}
                                        className={styles.input}
                                        disabled
                                    />
                                </div>
                                <div className={styles.cardFooter}>
                                    <span className={styles.footerText}>Contact support to change email.</span>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'billing' && (
                        <>
                            <div className={styles.card}>
                                <div className={styles.cardContent}>
                                    <h2 className={styles.cardTitle}>Current Plan</h2>
                                    <p className={styles.cardDescription}>
                                        You are currently on the <strong>Free Plan</strong>. Upgrade to unlock more features.
                                    </p>
                                </div>
                                <div className={styles.cardFooter}>
                                    <span className={styles.footerText}>You are not charged for this plan.</span>
                                    <Button variant="primary" size="sm" onClick={() => router.push('/subscription')}>Upgrade Plan</Button>
                                </div>
                            </div>
                            <div className={styles.card}>
                                <div className={styles.cardContent}>
                                    <h2 className={styles.cardTitle}>Invoices</h2>
                                    <p className={styles.cardDescription}>
                                        View and download your past invoices.
                                    </p>
                                    <div className={styles.emptyState}>
                                        No invoices found.
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'integrations' && (
                        <>
                            <div className={styles.card}>
                                <div className={styles.cardContent}>
                                    <h2 className={styles.cardTitle}>Connected Accounts</h2>
                                    <p className={styles.cardDescription}>
                                        Connect external accounts to enable seamless integrations.
                                    </p>

                                    <div className={styles.integrationList}>
                                        <div className={styles.integrationRow}>
                                            <div className={styles.integrationContent}>
                                                <div className={styles.integrationIcon}>GH</div>
                                                <div>
                                                    <div className={styles.integrationName}>GitHub</div>
                                                    <div className={styles.integrationDesc}>Connect to import repositories</div>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm">Connect</Button>
                                        </div>

                                        <div className={styles.integrationRow}>
                                            <div className={styles.integrationContent}>
                                                <div className={styles.integrationIcon}>▲</div>
                                                <div>
                                                    <div className={styles.integrationName}>Vercel</div>
                                                    <div className={styles.integrationDesc}>Deploy directly from ReexAPI</div>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm">Connect</Button>
                                        </div>
                                    </div>

                                </div>
                                <div className={styles.cardFooter}>
                                    <span className={styles.footerText}>More integrations coming soon.</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}
