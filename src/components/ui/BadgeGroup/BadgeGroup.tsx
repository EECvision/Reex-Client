"use client";

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import styles from './BadgeGroup.module.css';

interface BadgeGroupProps {
    label: React.ReactNode;

    value: string;
    color?: string; // hex color
    title?: string;
    valueClassName?: string;
    style?: React.CSSProperties;
    showCopy?: boolean;
}

export const BadgeGroup: React.FC<BadgeGroupProps> = ({
    label,
    value,
    color = "#6b7280", // default gray
    title,
    valueClassName,
    style,
    showCopy = true
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!value) return;
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    // We calculate background/border colors based on the main color
    // This matches the logic: backgroundColor: `${color}15`


    // Special case for default gray to match exact previous styles if needed,
    // or just rely on the opacity logic.
    // Previous "PROJECT" badge: color: "#6b7280", backgroundColor: "#f3f4f6"
    // Previous "GET" badge: color: "#3b82f6", backgroundColor: "#3b82f615"

    // Let's refine the style generation:
    const isDefault = color === "#6b7280";
    const bgStyle = isDefault ? undefined : `${color}15`; // Use CSS variable for default
    const borderStyle = isDefault ? undefined : `${color}30`; // Use CSS variable for default

    return (
        <div
            className={styles.group}
            style={{
                borderColor: borderStyle,
                ...style
            }}
        >
            <div
                className={styles.label}
                style={{
                    color: color,
                    backgroundColor: bgStyle
                }}
            >
                {label}
            </div>
            <div
                className={styles.value}
                title={title || value}
                style={{
                    borderLeftColor: borderStyle
                }}
            >
                <span className={`${styles.valueText} ${valueClassName || ''}`}>
                    {value}
                </span>
            </div>
            {showCopy && (
                <button
                    className={styles.copyButton}
                    onClick={handleCopy}
                    title="Copy to clipboard"
                    style={{ borderLeftColor: borderStyle }}
                >
                    {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                </button>
            )}
        </div>
    );
};
