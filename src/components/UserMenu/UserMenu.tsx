"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./UserMenu.module.css";
import { useAuth } from "@/providers/AuthContext";
import { useSettings } from "@/providers/SettingsContext";
import { User, LogOut, LogIn, Settings, CreditCard, LayoutDashboard, Sun, Moon } from "lucide-react";
import LoginModal from "../LoginModal/LoginModal";
import { useRouter } from "next/navigation";

interface UserMenuProps {
    placement?: 'top' | 'bottom';
}

const UserMenu: React.FC<UserMenuProps> = ({ placement = 'top' }) => {
    const { user, isAuthenticated, logout } = useAuth();
    const { theme, toggleTheme } = useSettings();
    const [isOpen, setIsOpen] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSignOut = () => {
        logout();
        setIsOpen(false);
        router.push("/");
    };

    const handleNavigate = (path: string) => {
        router.push(path);
        setIsOpen(false);
    };

    const popoverClass = `${styles.popover} ${placement === 'top' ? styles.popoverTop : styles.popoverBottom}`;

    return (
        <div className={styles.container} ref={containerRef}>
            <button
                className={styles.trigger}
                onClick={() => setIsOpen(!isOpen)}
                title={isAuthenticated ? (user?.name || user?.email || "User") : "Sign In"}
            >
                {isAuthenticated && user ? (
                    user.image ? (
                        <img
                            src={user.image}
                            alt={user.name || "User"}
                            className={styles.avatarImg}
                        />
                    ) : (
                        <div className={styles.avatar}>
                            <User size={18} />
                        </div>
                    )
                ) : (
                    <div className={styles.avatarPlaceholder}>
                        <User size={18} />
                    </div>
                )}
            </button>

            {isOpen && (
                <div className={popoverClass}>
                    {isAuthenticated && user ? (
                        <>
                            <div className={styles.header}>
                                <span className={styles.userName}>{user.name}</span>
                                <span className={styles.userEmail}>{user.email}</span>
                            </div>
                            <div className={styles.menu}>
                                <button className={styles.menuItem} onClick={() => handleNavigate('/dashboard')}>
                                    <LayoutDashboard size={14} />
                                    <span>Dashboard</span>
                                </button>
                                <button className={styles.menuItem} onClick={() => handleNavigate('/subscription')}>
                                    <CreditCard size={14} />
                                    <span>Subscription</span>
                                </button>
                                <button className={styles.menuItem} onClick={() => handleNavigate('/settings')}>
                                    <Settings size={14} />
                                    <span>Settings</span>
                                </button>
                                <button className={styles.menuItem} onClick={toggleTheme}>
                                    {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                                </button>
                                <div className={styles.separator} />
                                <button
                                    className={`${styles.menuItem} ${styles.menuItemDanger}`}
                                    onClick={handleSignOut}
                                >
                                    <LogOut size={14} />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={styles.header}>
                                <span className={styles.userName}>Guest User</span>
                                <span className={styles.userEmail}>Not signed in</span>
                            </div>
                            <div className={styles.menu}>
                                <button className={styles.menuItem} onClick={toggleTheme}>
                                    {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                                </button>
                                <div className={styles.separator} />
                                <button
                                    className={styles.menuItem}
                                    onClick={() => {
                                        setIsOpen(false);
                                        setShowLogin(true);
                                    }}
                                >
                                    <LogIn size={14} />
                                    <span>Sign In</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            <LoginModal
                isOpen={showLogin}
                onClose={() => setShowLogin(false)}
            />
        </div>
    );
};

export default UserMenu;
