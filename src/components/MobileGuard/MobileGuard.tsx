"use client";

import { useEffect, useState } from "react";
import Logo from "../Logo/Logo";
import styles from "./MobileGuard.module.css";

const BREAKPOINT = 981;

export function checkIsMobileScreen(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent || "";
  const isMobileUA =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
      ua,
    ) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const screenWidth = window.screen?.width ?? 0;
  const screenHeight = window.screen?.height ?? 0;
  const minPhysicalDim = Math.min(screenWidth, screenHeight);

  // Exclude resized desktop screens:
  // On desktop, physical screen dimensions (window.screen.width/height) reflect the monitor resolution
  // (e.g. 1080p, 1440p, 4k), regardless of how narrow the browser window is resized.
  // Genuine mobile devices have a small physical display dimension.
  if (!isMobileUA && minPhysicalDim > 820) {
    return false;
  }

  const isCoarseTouch =
    window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const isMobileDevice = isMobileUA || (isCoarseTouch && minPhysicalDim <= 820);

  return isMobileDevice && window.innerWidth < BREAKPOINT;
}

export const MobileGuard = ({ children }: { children: React.ReactNode }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkIsMobileScreen());
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return (
    <>
      {children}
      {isMobile && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-guard-title"
        >
          <div className={styles.card}>
            <div className={styles.logoWrap}>
              <Logo horizontal />
            </div>

            <h1 id="mobile-guard-title" className={styles.title}>
              Open Reex on a desktop for the best developer experience.
            </h1>
          </div>
        </div>
      )}
    </>
  );
};
