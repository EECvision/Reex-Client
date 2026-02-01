"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./SidebarSettings.module.css";
import { useSettings, ViewPreferenceType } from "@/providers/SettingsContext";
import { User, Sun, Moon, FileText, Code, FileJson, ChevronUp } from "lucide-react";

const VIEW_OPTIONS: { value: ViewPreferenceType; label: string; icon: React.ReactNode }[] = [
    { value: "json", label: "JSON", icon: <FileJson size={14} /> },
    { value: "raw", label: "Raw", icon: <FileText size={14} /> },
    { value: "pretty", label: "Pretty Print", icon: <Code size={14} /> },
];

const SidebarSettings: React.FC = () => {
    const { theme, viewPreference, toggleTheme, setViewPreference } = useSettings();
    const [showViewMenu, setShowViewMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowViewMenu(false);
            }
        };

        if (showViewMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showViewMenu]);

    const currentViewOption = VIEW_OPTIONS.find((opt) => opt.value === viewPreference);

    return (
        <div className={styles.settingsBar}>
            {/* Profile Button */}
            <button
                className={styles.settingsButton}
                title="Profile Settings"
                onClick={() => {
                    // Future: Open profile modal
                    console.log("Profile clicked");
                }}
            >
                <User size={18} />
            </button>

            {/* Theme Toggle */}
            <button
                className={styles.settingsButton}
                title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                onClick={toggleTheme}
            >
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* View Preferences */}
            <div className={styles.viewPrefWrapper} ref={menuRef}>
                <button
                    className={`${styles.settingsButton} ${showViewMenu ? styles.active : ""}`}
                    title="View Preferences"
                    onClick={() => setShowViewMenu(!showViewMenu)}
                >
                    {currentViewOption?.icon || <FileJson size={18} />}
                    <ChevronUp size={12} className={`${styles.chevron} ${showViewMenu ? styles.open : ""}`} />
                </button>

                {showViewMenu && (
                    <div className={styles.viewMenu}>
                        <div className={styles.menuHeader}>Response Format</div>
                        {VIEW_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                className={`${styles.menuItem} ${viewPreference === option.value ? styles.menuItemActive : ""}`}
                                onClick={() => {
                                    setViewPreference(option.value);
                                    setShowViewMenu(false);
                                }}
                            >
                                <span className={styles.menuIcon}>{option.icon}</span>
                                <span>{option.label}</span>
                                {viewPreference === option.value && (
                                    <span className={styles.checkmark}>✓</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SidebarSettings;
