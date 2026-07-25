"use client";

import React, { useState } from "react";
import styles from "./settings.module.css";
import { Button } from "@/components/ui/Button/Button";
import { useAuth } from "@/providers/AuthContext";
import { useSettings } from "@/providers/SettingsContext";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/useSubscription";
import { InvoiceModal } from "@/components/InvoiceModal/InvoiceModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal/DeleteConfirmModal";
import { FileText, Eye, Loader2 } from "lucide-react";
import { PLAN_IDS } from "@/config/pricing";

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useSettings();
    const { isPro, user: subscriptionUser } = useSubscription();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'account' | 'billing' | 'integrations'>('account');

    // Invoice State
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    // Cancel Subscription State
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isReactivating, setIsReactivating] = useState(false);

    const handleReactivateSubscription = async () => {
        setIsReactivating(true);
        try {
            const res = await fetch('/api/subscription/reactivate', {
                method: 'POST'
            });
            if (res.ok) {
                window.location.reload();
            } else {
                console.error("Failed to reactivate subscription");
            }
        } catch (error) {
            console.error("Error reactivating subscription:", error);
        } finally {
            setIsReactivating(false);
        }
    };

    const handleCancelSubscription = async () => {
        setIsCancelling(true);
        try {
            const res = await fetch('/api/subscription/cancel', {
                method: 'POST'
            });
            if (res.ok) {
                setIsCancelModalOpen(false);
                window.location.reload();
            } else {
                console.error("Failed to cancel subscription");
            }
        } catch (error) {
            console.error("Error cancelling subscription:", error);
        } finally {
            setIsCancelling(false);
        }
    };

    React.useEffect(() => {
        if (activeTab === 'billing') {
            fetchInvoices();
        }
    }, [activeTab]);

    const fetchInvoices = async () => {
        setIsLoadingInvoices(true);
        try {
            const res = await fetch('/api/subscription/invoices');
            if (res.ok) {
                const data = await res.json();
                setInvoices(data);
            }
        } catch (error) {
            console.error("Failed to fetch invoices", error);
        } finally {
            setIsLoadingInvoices(false);
        }
    };

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
                    {/* ... other code ... */}
                </aside>

                {/* Right Content */}
                <div className={styles.content}>
                    {activeTab === 'account' && user && (
                        /* ... existing account code ... */
                        <>
                            <div className={styles.card}>
                                <div className={styles.cardContent}>
                                    <h2 className={styles.cardTitle}>Display Name</h2>
                                    <p className={styles.cardDescription}>
                                        This is your visible name within Reex API Builder. It will be displayed on your dashboard and invoices.
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
                                        {isPro ? (
                                            <>You are currently on the <strong>Pro Developer</strong> plan. Enjoy unlimited access.</>
                                        ) : (
                                            <>You are currently on the <strong>Free Plan</strong>. Upgrade to unlock more features.</>
                                        )}
                                    </p>
                                </div>
                                <div className={styles.cardFooter}>
                                    <span className={styles.footerText}>
                                        {isPro && subscriptionUser?.current_period_end
                                            ? `Your next billing date is ${new Date(subscriptionUser.current_period_end).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}.`
                                            : "You are not charged for this plan."}
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {isPro ? (
                                            <>
                                                {subscriptionUser?.subscription_status !== 'canceled' ? (
                                                    <>
                                                        <Button variant="danger" size="sm" onClick={() => setIsCancelModalOpen(true)}>Cancel</Button>
                                                        <Button variant="secondary" size="sm" disabled>Active</Button>
                                                    </>
                                                ) : (
                                                    <Button variant="secondary" size="sm" onClick={handleReactivateSubscription} isLoading={isReactivating} disabled={isReactivating}>Reactivate Subscription</Button>
                                                )}
                                            </>
                                        ) : (
                                            <Button variant="primary" size="sm" onClick={() => router.push('/subscription')}>Upgrade Plan</Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.card}>
                                <div className={styles.cardContent}>
                                    <h2 className={styles.cardTitle}>Invoices</h2>
                                    <p className={styles.cardDescription}>
                                        View and download your past invoices.
                                    </p>

                                    {isLoadingInvoices ? (
                                        <div className={styles.loadingState}>
                                            <Loader2 size={24} className={styles.loadingIcon} />
                                            <span className={styles.loadingText}>Loading invoices...</span>
                                        </div>
                                    ) : invoices.length > 0 ? (
                                        <div className={styles.invoiceList}>
                                            {invoices.map((invoice) => (
                                                <div key={invoice.id} className={styles.invoiceItem}>
                                                    <div className={styles.invoiceInfo}>
                                                        <div className={styles.invoiceIcon}>
                                                            <FileText size={16} />
                                                        </div>
                                                        <div className={styles.invoiceMeta}>
                                                            <p className={styles.invoiceTitle}>
                                                                {invoice.plan_id === 'monthly' ? "Pro Plan (Monthly)" :
                                                                    invoice.plan_id === 'yearly' ? "Pro Plan (Yearly)" :
                                                                        "Subscription"}
                                                            </p>
                                                            <p className={styles.invoiceDate}>
                                                                {new Date(invoice.created_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={styles.invoiceActions}>
                                                        <span className={styles.invoiceAmount}>{invoice.currency} {invoice.amount}</span>
                                                        <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(invoice)}>
                                                            <Eye size={16} className="mr-2" /> View
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={styles.emptyState}>
                                            No invoices found.
                                        </div>
                                    )}
                                </div>
                            </div>
                            <InvoiceModal
                                isOpen={!!selectedInvoice}
                                onClose={() => setSelectedInvoice(null)}
                                invoice={selectedInvoice}
                            />
                            <DeleteConfirmModal
                                isOpen={isCancelModalOpen}
                                onClose={() => setIsCancelModalOpen(false)}
                                onConfirm={handleCancelSubscription}
                                deleting={isCancelling}
                                title="Cancel Subscription"
                                message="Are you sure you want to cancel your subscription? You will retain access until the end of your current billing period."
                                confirmText="Cancel"
                            />
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
                                                    <div className={styles.integrationDesc}>Deploy directly from Reex API Builder</div>
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
