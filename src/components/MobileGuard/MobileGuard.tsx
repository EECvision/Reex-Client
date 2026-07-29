"use client";

import { useEffect, useState } from "react";
import styles from "./MobileGuard.module.css";

const BREAKPOINT = 1024;

export const MobileGuard = ({ children }: { children: React.ReactNode }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <>
      {children}
      {isMobile && (
        <div className={styles.overlay}>
          <div className={styles.banner}>
            <div className={styles.iconWrap}>
              <svg
                className={styles.icon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <svg
                className={styles.arrowIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <svg
                className={styles.desktopIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>
            <h1 className={styles.title}>Currently Desktop Only</h1>
            <p className={styles.message}>
              Please open Reex API Builder on a desktop or laptop for the best
              experience.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
