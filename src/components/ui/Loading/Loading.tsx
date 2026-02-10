import React from 'react';
import styles from './Loading.module.css';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
    fullScreen?: boolean;
    className?: string;
    text?: string;
}

export const Loading: React.FC<LoadingProps> = ({ fullScreen = false, className = '', text = 'Loading...' }) => {
    return (
        <div className={`${styles.container} ${fullScreen ? styles.fullScreen : ''} ${className}`}>
            <Loader2 className={styles.spinner} size={24} />
            <span className={styles.text}>{text}</span>
        </div>
    );
};
