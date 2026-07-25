"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./UserMenu.module.css";
import { useAuth } from "@/providers/AuthContext";
import { useSettings } from "@/providers/SettingsContext";
import { User, LogOut, LogIn, Settings, CreditCard, LayoutDashboard, Sun, Moon, Monitor, Palette, Book, MessageSquareWarning, ChevronsUpDown } from "lucide-react";
import LoginModal from "../LoginModal/LoginModal";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/useSubscription";

interface UserMenuProps {
    placement?: 'top' | 'bottom';
    expanded?: boolean;
}

const UserMenu: React.FC<UserMenuProps> = ({ placement = 'top', expanded = false }) => {
    const { user: authUser, isAuthenticated, logout } = useAuth();
    const { isPro: isSubscribed, user: subUser } = useSubscription();
    const user = subUser?.id ? subUser : authUser;
    const { theme, setTheme } = useSettings();
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
        <div className={`${styles.container} ${expanded ? styles.containerExpanded : ''}`} ref={containerRef}>
            <button
                className={`${styles.trigger} ${expanded ? styles.triggerExpanded : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title={isAuthenticated ? (user?.name || user?.email || "User") : "Sign In"}
            >
                <div className={`${styles.avatarWrapper} ${isSubscribed ? styles.subscribed : ""}`}>
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
                </div>
                {expanded && (
                    <>
                        {isAuthenticated && user ? (
                            <>
                                <div className={styles.triggerUserInfo}>
                                    <span className={styles.triggerUserName}>{user.name || user.email?.split('@')[0] || "User"}</span>
                                    <span className={styles.triggerUserPlan}>{isSubscribed ? "Pro" : "Free"}</span>
                                </div>
                                {!isSubscribed ? (
                                    <div 
                                        className={styles.upgradeBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsOpen(false);
                                            handleNavigate('/subscription');
                                        }}
                                    >
                                        Upgrade
                                    </div>
                                ) : (
                                    <ChevronsUpDown size={16} className={styles.triggerChevron} />
                                )}
                            </>
                        ) : (
                            <>
                                <div className={styles.triggerUserInfo}>
                                    <span className={styles.triggerUserName}>Guest</span>
                                    <span className={styles.triggerUserPlan}>Sign in</span>
                                </div>
                                <ChevronsUpDown size={16} className={styles.triggerChevron} />
                            </>
                        )}
                    </>
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
                                <button className={styles.menuItem} onClick={() => handleNavigate('/docs')}>
                                    <Book size={14} />
                                    <span>Docs</span>
                                </button>
                                <button className={styles.menuItem} onClick={() => handleNavigate('/subscription')}>
                                    <CreditCard size={14} />
                                    <span>Subscription</span>
                                </button>
                                <div className={styles.separator} />
                                <button className={styles.menuItem} onClick={() => handleNavigate('/settings')}>
                                    <Settings size={14} />
                                    <span>Settings</span>
                                </button>
                                <div className={styles.themeRow}>
                                    <span className={styles.themeLabel}>
                                        <Palette size={14} />
                                        <span>Theme</span>
                                    </span>
                                    <div className={styles.themeSwitcher}>
                                        <button
                                            className={`${styles.themeOption} ${theme === 'system' ? styles.themeOptionActive : ''}`}
                                            onClick={() => setTheme('system')}
                                            title="System"
                                        >
                                            <Monitor size={14} />
                                        </button>
                                        <button
                                            className={`${styles.themeOption} ${theme === 'light' ? styles.themeOptionActive : ''}`}
                                            onClick={() => setTheme('light')}
                                            title="Light"
                                        >
                                            <Sun size={14} />
                                        </button>
                                        <button
                                            className={`${styles.themeOption} ${theme === 'dark' ? styles.themeOptionActive : ''}`}
                                            onClick={() => setTheme('dark')}
                                            title="Dark"
                                        >
                                            <Moon size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className={styles.separator} />
                                <button className={styles.menuItem} onClick={() => handleNavigate('/report-issue')}>
                                    <MessageSquareWarning size={14} />
                                    <span>Report Issue</span>
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
                                <button className={styles.menuItem} onClick={() => handleNavigate('/docs')}>
                                    <Book size={14} />
                                    <span>Docs</span>
                                </button>
                                <div className={styles.separator} />
                                <div className={styles.themeRow}>
                                    <span className={styles.themeLabel}>
                                        <Palette size={14} />
                                        <span>Theme</span>
                                    </span>
                                    <div className={styles.themeSwitcher}>
                                        <button
                                            className={`${styles.themeOption} ${theme === 'system' ? styles.themeOptionActive : ''}`}
                                            onClick={() => setTheme('system')}
                                            title="System"
                                        >
                                            <Monitor size={14} />
                                        </button>
                                        <button
                                            className={`${styles.themeOption} ${theme === 'light' ? styles.themeOptionActive : ''}`}
                                            onClick={() => setTheme('light')}
                                            title="Light"
                                        >
                                            <Sun size={14} />
                                        </button>
                                        <button
                                            className={`${styles.themeOption} ${theme === 'dark' ? styles.themeOptionActive : ''}`}
                                            onClick={() => setTheme('dark')}
                                            title="Dark"
                                        >
                                            <Moon size={14} />
                                        </button>
                                    </div>
                                </div>
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
