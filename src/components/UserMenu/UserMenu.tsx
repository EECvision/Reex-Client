"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./UserMenu.module.css";
import { useAuth } from "@/providers/AuthContext";
import { User, LogOut, LogIn, Settings, CreditCard, LayoutDashboard } from "lucide-react";
import LoginModal from "../LoginModal/LoginModal";

const UserMenu: React.FC = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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
    };

    return (
        <div className={styles.container} ref={containerRef}>
            <button
                className={styles.trigger}
                onClick={() => setIsOpen(!isOpen)}
                title={isAuthenticated ? user?.name : "Sign In"}
            >
                {isAuthenticated && user ? (
                    <div className={styles.avatar}>
                        {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className={styles.avatarImg} />
                        ) : (
                            user.name.charAt(0).toUpperCase()
                        )}
                    </div>
                ) : (
                    <User size={18} />
                )}
            </button>

            {isOpen && (
                <div className={styles.popover}>
                    {isAuthenticated && user ? (
                        <>
                            <div className={styles.header}>
                                <span className={styles.userName}>{user.name}</span>
                                <span className={styles.userEmail}>{user.email}</span>
                            </div>
                            <div className={styles.menu}>
                                <button className={styles.menuItem}>
                                    <LayoutDashboard size={14} />
                                    <span>Dashboard</span>
                                </button>
                                <button className={styles.menuItem}>
                                    <CreditCard size={14} />
                                    <span>Subscription</span>
                                </button>
                                <button className={styles.menuItem}>
                                    <Settings size={14} />
                                    <span>Settings</span>
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
