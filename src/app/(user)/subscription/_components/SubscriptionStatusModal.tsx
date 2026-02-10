
import React, { useEffect } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import { CheckCircle2, XCircle } from 'lucide-react';
import styles from './SubscriptionStatusModal.module.css';
import confetti from 'canvas-confetti';

interface SubscriptionStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    status: 'success' | 'error';
    title: string;
    message: string;
}

export const SubscriptionStatusModal: React.FC<SubscriptionStatusModalProps> = ({
    isOpen,
    onClose,
    status,
    title,
    message
}) => {
    useEffect(() => {
        if (isOpen && status === 'success') {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

            const randomInRange = (min: number, max: number) => {
                return Math.random() * (max - min) + min;
            }

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);

                // since particles fall down, start a bit higher than random
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [isOpen, status]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={null} // Custom header
            showCloseButton={false}
            size="sm"
        >
            <div className={styles.container}>
                <div className={styles.iconWrapper}>
                    {status === 'success' ? (
                        <CheckCircle2 size={48} className={styles.successIcon} />
                    ) : (
                        <XCircle size={48} className={styles.errorIcon} />
                    )}
                </div>

                <h2 className={styles.title}>{title}</h2>
                <p className={styles.message}>{message}</p>

                <Button
                    variant={status === 'success' ? 'primary' : 'secondary'}
                    onClick={onClose}
                    className={styles.button}
                >
                    {status === 'success' ? 'Continue' : 'Close'}
                </Button>
            </div>
        </Modal>
    );
};
