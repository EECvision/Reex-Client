import React from 'react';
import styles from './BadgeGroup.module.css';

interface BadgeGroupProps {
    label: React.ReactNode;

    value: string;
    color?: string; // hex color
    title?: string;
    valueClassName?: string;
    style?: React.CSSProperties;
}

export const BadgeGroup: React.FC<BadgeGroupProps> = ({
    label,
    value,
    color = "#6b7280", // default gray
    title,
    valueClassName,
    style
}) => {
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
    const bgStyle = isDefault ? "#f3f4f6" : `${color}15`;
    const borderStyle = isDefault ? "#e5e7eb" : `${color}30`;

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
            <div className={styles.value} title={title}>
                <span className={`${styles.valueText} ${valueClassName || ''}`}>
                    {value}
                </span>
            </div>
        </div>
    );
};
