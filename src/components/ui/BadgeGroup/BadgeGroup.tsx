"use client";

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import styles from './BadgeGroup.module.css';

interface BadgeGroupProps {
    label: React.ReactNode;
    value: string;
    color?: string; // hex color or CSS variable
    title?: string;
    valueClassName?: string;
    style?: React.CSSProperties;
    showCopy?: boolean;
}

export const BadgeGroup: React.FC<BadgeGroupProps> = ({
    label,
    value,
    color = "#6b7280",
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

    const isDefault = !color || color === "#6b7280" || color === "var(--text-secondary, #6b7280)";
    const pillBg = isDefault
        ? "var(--hover-bg, rgba(255, 255, 255, 0.06))"
        : `color-mix(in srgb, ${color} 14%, transparent)`;
    const pillBorder = isDefault
        ? "var(--border-color, rgba(255, 255, 255, 0.1))"
        : `color-mix(in srgb, ${color} 28%, transparent)`;

    return (
        <div
            className={styles.group}
            style={style}
        >
            <div
                className={styles.pill}
                style={{
                    color: color,
                    backgroundColor: pillBg,
                    borderColor: pillBorder,
                }}
            >
                {label}
            </div>
            <div
                className={styles.value}
                title={title || value}
            >
                <span className={`${styles.valueText} ${valueClassName || ''}`}>
                    {value}
                </span>
            </div>
            {showCopy && (
                <button
                    type="button"
                    className={styles.copyButton}
                    onClick={handleCopy}
                    title="Copy to clipboard"
                    aria-label="Copy to clipboard"
                >
                    {copied ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                </button>
            )}
        </div>
    );
};
