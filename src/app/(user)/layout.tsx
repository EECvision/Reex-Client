import React from "react";
import UserNavbar from "@/components/UserNavbar/UserNavbar";
import styles from "./layout.module.css";
import { UIProvider } from "@/providers/UIContext";

export default function UserLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <UIProvider>
            <div className={styles.container}>
                <UserNavbar />
                <div className={styles.contentWrapper}>
                    {children}
                </div>
            </div>
        </UIProvider>
    );
}
