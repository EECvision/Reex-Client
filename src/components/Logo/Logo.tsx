import React from 'react';
import styles from './Logo.module.css';

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', showText = true }) => {
    return (
        <div className={`${styles.brand} ${styles[size]} ${className}`}>
            <div className={styles.logoIcon}>
                <div className={styles.logoInner}></div>
            </div>
            {showText && <span className={styles.brandName}>Reex<span className={styles.brandAccent}>API</span></span>}
        </div>
    );
};

export default Logo;
