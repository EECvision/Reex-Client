import React from 'react';
import { Info } from 'lucide-react';
import styles from './LocalhostBanner.module.css';

interface LocalhostBannerProps {
    className?: string;
}

const LocalhostBanner: React.FC<LocalhostBannerProps> = ({ className }) => {
    return (
        <div className={`${styles.localhostBanner} ${className || ''}`}>
            <Info size={16} className={styles.localhostBannerIcon} />
            <div>
                <span>To test localhost endpoints, run </span>
                <code className={styles.localhostCode}>npx reex-proxy</code>
                <span> in your terminal first.</span>
            </div>
        </div>
    );
};

export default LocalhostBanner;
