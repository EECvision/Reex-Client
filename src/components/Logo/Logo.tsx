import React from 'react';
import styles from './Logo.module.css';

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
    return (
        <div className={`${styles.brand} ${styles[size]} ${className}`}>
            <div className={styles.logoIcon}>
                <div className={styles.logoInner}></div>
            </div>
            <span className={styles.brandName}>Reex<span className={styles.brandAccent}>API</span></span>
        </div>
    );
};

export default Logo;
