"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./UserNavbar.module.css";
import Logo from "../Logo/Logo";
import UserMenu from "../UserMenu/UserMenu";
import { Button } from "../ui/Button/Button";
import { ArrowLeft, Menu } from "lucide-react";
import { useUI } from "@/providers/UIContext";

interface UserNavbarProps {
}

export default function UserNavbar({ }: UserNavbarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { toggleSidebar, hasSidebar } = useUI();

    const isActive = (path: string) => pathname?.startsWith(path);

    return (
        <nav className={styles.navbar}>
            <div className={styles.left}>
                {hasSidebar && (
                    <button className={styles.sidebarToggle} onClick={toggleSidebar}>
                        <Menu size={20} />
                    </button>
                )}
                <Link href="/" className={styles.brand}>
                    <Logo />
                </Link>
            </div>

            <div className={styles.right}>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/')}
                >
                    <ArrowLeft size={16} style={{ marginRight: 6 }} />
                    Workspace
                </Button>
                <div style={{ width: 1, height: 24, background: 'var(--border-color)' }} />
                <UserMenu placement="bottom" />
            </div>
        </nav>
    );
}
