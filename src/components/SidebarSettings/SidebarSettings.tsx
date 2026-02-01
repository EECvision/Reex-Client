"use client";

import React from "react";
import styles from "./SidebarSettings.module.css";
import { useSettings } from "@/providers/SettingsContext";
import { User, Sun, Moon } from "lucide-react";

const SidebarSettings: React.FC = () => {
    const { theme, toggleTheme } = useSettings();

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
        </div>
    );
};

export default SidebarSettings;

