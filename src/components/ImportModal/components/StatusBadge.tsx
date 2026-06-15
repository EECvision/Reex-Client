import React from 'react';
import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
    status: string;
    onClick?: () => void;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, onClick }) => {
    let className = styles.statusUnchanged;
    let label = status.charAt(0).toUpperCase() + status.slice(1);
    const isClickable = !!onClick;

    if (status === "new") {
        className = styles.statusNew;
        label = "New";
    }
    if (status === "modified") {
        className = styles.statusModified;
        label = "Modified";
    }
    if (status === "deleted") {
        className = styles.statusDeleted;
        label = "Not Found";
    }
    if (status === "disabled") {
        className = styles.statusDisabled;
        label = "Locked";
    }
    if (status === "remove") {
        className = styles.statusRemove;
        label = "Remove";
    }

    return (
        <span
            onClick={(e) => {
                if (isClickable) {
                    e.stopPropagation();
                    onClick();
                }
            }}
            className={`${styles.statusBadge} ${className}`}
            style={isClickable ? { cursor: "pointer" } : undefined}
        >
            {label}
        </span>
    );
};

export default StatusBadge;
