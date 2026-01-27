import React from 'react';
import styles from '../ImportModal.module.css';

interface LoadingStateProps {
    message: string;
    isSuccess?: boolean;
}

const LoadingState: React.FC<LoadingStateProps> = ({ message, isSuccess = false }) => {
    if (isSuccess) {
        return (
            <div className={styles.loadingState}>
                <p className={styles.successText}>✨ {message}</p>
            </div>
        );
    }

    return (
        <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>{message}</p>
        </div>
    );
};

export default LoadingState;
