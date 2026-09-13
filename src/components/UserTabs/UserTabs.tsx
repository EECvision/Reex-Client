"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./UserTabs.module.css";

export default function UserTabs() {
    const pathname = usePathname();

    const tabs = [
        { name: "Workspace", path: "/" },
        { name: "Settings", path: "/settings" },
    ];

    const isActive = (path: string) => path === '/' ? pathname === '/' : pathname?.startsWith(path);

    return (
        <div className={styles.container}>
            <div className={styles.tabs}>
                {tabs.map((tab) => (
                    <Link
                        key={tab.path}
                        href={tab.path}
                        className={`${styles.tab} ${isActive(tab.path) ? styles.active : ''}`}
                    >
                        {tab.name}
                    </Link>
                ))}
            </div>
        </div>
    );
}
