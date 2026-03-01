import React from "react";
import styles from "./InvoiceModal.module.css";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Download, CreditCard, Calendar, CheckCircle, XCircle } from "lucide-react";
import { PLAN_IDS } from "@/config/pricing";

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: any;
}

export const InvoiceModal = ({ isOpen, onClose, invoice }: InvoiceModalProps) => {
    if (!invoice) return null;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Invoice Details">
            <div className={styles.container}>
                {/* Header / Status */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <div className={`${styles.statusIcon} ${invoice.status === 'success' ? styles.success : styles.failure}`}>
                            {invoice.status === 'success' ? <CheckCircle size={24} /> : <XCircle size={24} />}
                        </div>
                        <div>
                            <p className={styles.label}>Status</p>
                            <p className={styles.value}>{invoice.status}</p>
                        </div>
                    </div>
                    <div className={styles.amount}>
                        <p className={styles.label}>Amount</p>
                        <p className={styles.amountValue}>{invoice.currency} {invoice.amount}</p>
                    </div>
                </div>

                {/* Details Grid */}
                <div className={styles.detailsGrid}>
                    <div className={styles.detailItem}>
                        <div className={styles.detailLabel}>
                            <Calendar size={14} />
                            <span>Date</span>
                        </div>
                        <p className={styles.detailValue}>{formatDate(invoice.created_at)}</p>
                    </div>
                    <div className={styles.detailItem}>
                        <div className={styles.detailLabel}>
                            <CreditCard size={14} />
                            <span>Transaction ID</span>
                        </div>
                        <p className={`${styles.detailValue} ${styles.detailValueMono}`}>{invoice.transaction_id || invoice.id}</p>
                    </div>
                </div>

                {/* Line Items */}
                <div className={styles.lineItems}>
                    <h4 className={styles.sectionTitle}>Line Items</h4>
                    <div className={styles.lineItem}>
                        <span>{
                            invoice.plan_id === PLAN_IDS.monthly ? "Pro Developer Plan (Monthly)" :
                                invoice.plan_id === PLAN_IDS.yearly ? "Pro Developer Plan (Yearly)" :
                                    invoice.plan_id || "Subscription"
                        }</span>
                        <span>{invoice.currency} {invoice.amount}</span>
                    </div>
                    <div className={styles.total}>
                        <span>Total</span>
                        <span>{invoice.currency} {invoice.amount}</span>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className={styles.footer}>
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                    <Button variant="secondary" onClick={() => window.print()}>
                        <Download size={16} style={{ marginRight: 8 }} /> Print / Save PDF
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
