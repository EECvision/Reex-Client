"use client";

import React from "react";
import styles from "./SidebarSettings.module.css";
import { useSettings } from "@/providers/SettingsContext";
import UserMenu from "../UserMenu/UserMenu";

const SidebarSettings: React.FC = () => {
    const { theme, toggleTheme } = useSettings();

    return (
        <div className={styles.settingsBar}>
            {/* User Menu */}
            <UserMenu />


        </div>
    );
};

export default SidebarSettings;

