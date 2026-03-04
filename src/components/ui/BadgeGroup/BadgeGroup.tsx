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
    const LabelStyle = {
        color: color,
        backgroundColor: `${color}15`, // ~8% opacity if hex
        // If color is simple hex like #e5e7eb it might not work well with 15 appended if it's not #RRGGBB format
        // safely assuming standardized colors or standard hex for now.
        // For the gray defaults in Navbar: color: "#6b7280", backgroundColor: "#f3f4f6"
        // Let's allow overriding or just use the logic if color provided.
        // Actually, Navbar uses specific grays. Let's stick to the user's pattern:
        // dynamic colors usually pass a hex.
        // If color is gray/default, we might want specific shades.
    };

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
