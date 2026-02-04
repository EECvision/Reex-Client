"use client";

import React from "react";
import styles from "./SidebarSettings.module.css";
import { useSettings } from "@/providers/SettingsContext";
import { Sun, Moon } from "lucide-react";
import UserMenu from "../UserMenu/UserMenu";

const SidebarSettings: React.FC = () => {
    const { theme, toggleTheme } = useSettings();

    return (
        <div className={styles.settingsBar}>
            {/* User Menu */}
            <UserMenu />

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

