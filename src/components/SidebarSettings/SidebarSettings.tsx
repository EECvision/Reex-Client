"use client";

import React from "react";
import styles from "./SidebarSettings.module.css";

import UserMenu from "../UserMenu/UserMenu";

const SidebarSettings: React.FC = () => {


    return (
        <div className={styles.settingsBar}>
            {/* User Menu */}
            <UserMenu />


        </div>
    );
};

export default SidebarSettings;

