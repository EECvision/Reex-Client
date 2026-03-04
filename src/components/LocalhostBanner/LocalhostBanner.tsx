import React, { useState } from 'react';
import { AlertTriangle, Copy, Check } from 'lucide-react';
import styles from './LocalhostBanner.module.css';

interface LocalhostBannerProps {
    className?: string;
}

const COMMAND = 'npx reex-proxy';

const LocalhostBanner: React.FC<LocalhostBannerProps> = ({ className }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(COMMAND);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`${styles.localhostBanner} ${className || ''}`}>
            <AlertTriangle size={16} className={styles.localhostBannerIcon} />
            <div>
                <span>To test localhost endpoints, run </span>
                <code className={styles.localhostCode}>
                    {COMMAND}
                    <button
                        className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
                        onClick={handleCopy}
                        title={copied ? 'Copied!' : 'Copy command'}
                        aria-label="Copy npx reex-proxy command"
                    >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                </code>
                <span> in your terminal first.</span>
            </div>
        </div>
    );
};

export default LocalhostBanner;
