
import React from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import { Lock, Check } from 'lucide-react';
import styles from './LimitReachedModal.module.css';
import { useRouter } from 'next/navigation';

interface LimitReachedModalProps {
    isOpen: boolean;
    onClose: () => void;
    limit: number;
}

export const LimitReachedModal: React.FC<LimitReachedModalProps> = ({
    isOpen,
    onClose,
    limit
}) => {
    const router = useRouter();

    const handleUpgrade = () => {
        router.push('/subscription');
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={null}
            showCloseButton={true}
            size="sm"
        >
            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={styles.iconWrapper}>
                        <Lock size={32} className={styles.icon} />
                    </div>

                    <h2 className={styles.title}>Free Limit Reached</h2>
                    <p className={styles.message}>
                        You have used all <strong>{limit} free imports</strong> available in the Hobby plan.
                    </p>

                    <div className={styles.usageBadge}>
                        <div className={styles.usageDot}></div>
                        <span>{limit}/{limit} imports used</span>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureHeader}>Unlock with Pro:</div>
                        <div className={styles.featureList}>
                            <div className={styles.featureItem}>
                                <div className={styles.checkWrapper}>
                                    <Check size={12} strokeWidth={4} />
                                </div>
                                <span>Unlimited imports</span>
                            </div>
                            <div className={styles.featureItem}>
                                <div className={styles.checkWrapper}>
                                    <Check size={12} strokeWidth={4} />
                                </div>
                                <span>Full Project Mode access</span>
                            </div>
                            <div className={styles.featureItem}>
                                <div className={styles.checkWrapper}>
                                    <Check size={12} strokeWidth={4} />
                                </div>
                                <span>Priority support and updates</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <Button
                            variant="primary"
                            onClick={handleUpgrade}
                            className={styles.upgradeBtn}
                        >
                            Upgrade to Pro
                        </Button>
                        <button
                            onClick={onClose}
                            className={styles.cancelBtn}
                        >
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
