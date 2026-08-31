"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./UserNavbar.module.css";
import Logo from "../Logo/Logo";
import UserMenu from "../UserMenu/UserMenu";
import { Button } from "../ui/Button/Button";
import { ArrowLeft, PanelLeft } from "lucide-react";
import { useUI } from "@/providers/UIContext";



export default function UserNavbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { toggleSidebar, hasSidebar } = useUI();

    if (pathname?.startsWith('/sandbox')) {
        return null;
    }



    return (
        <nav className={styles.navbar}>
            <div className={styles.left}>
                {hasSidebar && (
                    <button className={styles.sidebarToggle} onClick={toggleSidebar}>
                        <PanelLeft size={20} />
                    </button>
                )}
                <Link href="/" className={styles.brand}>
                    <Logo />
                </Link>
            </div>

            <div className={styles.right}>
                {!pathname?.startsWith('/sandbox') && (
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/')}
                        >
                            <ArrowLeft size={16} style={{ marginRight: 6 }} />
                            Workspace
                        </Button>
                        <div style={{ width: 1, height: 24, background: 'var(--border-color)' }} />
                    </>
                )}
                <UserMenu placement="bottom" />
            </div>
        </nav>
    );
}
