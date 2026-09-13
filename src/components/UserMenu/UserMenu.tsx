"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./UserMenu.module.css";
import { useSettings, type ThemeType } from "@/providers/SettingsContext";
import {
  Settings,
  Sun,
  Moon,
  Monitor,
  Palette,
  Book,
  HelpCircle,
  ChevronsUpDown,
  Compass,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { DOCS_URL } from "@/config/links";
import { useTour } from "../ProductTour";

interface UserMenuProps {
  placement?: "top" | "bottom";
  expanded?: boolean;
}

const themes = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

const UserMenu: React.FC<UserMenuProps> = ({
  placement = "top",
  expanded = false,
}) => {
  const { theme, setTheme } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { startTour } = useTour();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      )
        setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const navigate = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  return (
    <div
      data-tour="user-menu"
      className={[styles.container, expanded && styles.containerExpanded]
        .filter(Boolean)
        .join(" ")}
      ref={containerRef}
    >
      <button
        className={[styles.trigger, expanded && styles.triggerExpanded]
          .filter(Boolean)
          .join(" ")}
        onClick={() => setIsOpen(!isOpen)}
        title="Workspace menu"
        aria-label="Workspace menu"
        aria-expanded={isOpen}
      >
        <Settings size={20} />
        {expanded && (
          <>
            <span className={styles.triggerUserInfo}>
              <span className={styles.triggerUserName}>Workspace</span>
              <span className={styles.triggerUserPlan}>
                Saved in this browser
              </span>
            </span>
            <ChevronsUpDown size={16} />
          </>
        )}
      </button>
      {isOpen && (
        <div
          className={[
            styles.popover,
            placement === "top" ? styles.popoverTop : styles.popoverBottom,
          ].join(" ")}
        >
          <div className={styles.menu}>
            <button
              className={styles.menuItem}
              onClick={() => navigate("/settings")}
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
            <button
              className={styles.menuItem}
              onClick={() => {
                window.open(DOCS_URL, "_blank", "noopener,noreferrer");
                setIsOpen(false);
              }}
            >
              <Book size={16} />
              <span>Docs</span>
            </button>
            <div className={styles.separator} />
            <div className={styles.themeRow}>
              <span className={styles.themeLabel}>
                <Palette size={16} />
                <span>Theme</span>
              </span>
              <div className={styles.themeSwitcher}>
                {themes.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    className={[
                      styles.themeOption,
                      theme === value && styles.themeOptionActive,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setTheme(value as ThemeType)}
                    title={label}
                    aria-label={label}
                    aria-pressed={theme === value}
                  >
                    <Icon size={14} />
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.separator} />
            <button
              className={styles.menuItem}
              onClick={() => navigate("/support")}
            >
              <HelpCircle size={16} />
              <span>Support</span>
            </button>
            <button
              className={styles.menuItem}
              onClick={() => {
                setIsOpen(false);
                startTour(0);
              }}
            >
              <Compass size={16} />
              <span>Product Tour</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
