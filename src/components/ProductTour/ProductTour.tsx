"use client";

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useSyncExternalStore,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import styles from "./ProductTour.module.css";
import { useTour } from "./TourContext";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  MonitorPlay,
  Globe,
  Lock,
  PlusCircle,
  Sparkles,
  Filter,
  FolderTree,
  MoreVertical,
  TestTube2,
  User,
  Terminal,
} from "lucide-react";

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

const getStepIcon = (id: string) => {
  switch (id) {
    case "workspace-mode":
      return <MonitorPlay size={18} />;
    case "base-url":
      return <Globe size={18} />;
    case "auth":
      return <Lock size={18} />;
    case "add-collection":
      return <PlusCircle size={18} />;
    case "ask-docs":
      return <Sparkles size={18} />;
    case "method-filter":
      return <Filter size={18} />;
    case "files-section":
      return <FolderTree size={18} />;
    case "collection-menu":
      return <MoreVertical size={18} />;
    case "workspace-area":
      return <TestTube2 size={18} />;
    case "user-menu":
      return <User size={18} />;
    case "setup-guide":
      return <Terminal size={18} />;
    default:
      return <Sparkles size={18} />;
  }
};

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const ProductTour: React.FC = () => {
  const {
    isOpen,
    currentStep,
    currentStepIndex,
    totalSteps,
    closeTour,
    nextStep,
    prevStep,
    goToStep,
  } = useTour();

  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  const [popoverSize, setPopoverSize] = useState({
    width: 420,
    height: 240,
  });
  const popoverRef = useRef<HTMLDivElement>(null);

  const updateTargetPosition = useCallback(() => {
    if (typeof window === "undefined" || !currentStep) return;

    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    if (popoverRef.current) {
      const rect = popoverRef.current.getBoundingClientRect();
      if (rect.height > 0) {
        setPopoverSize({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    }

    const el = document.querySelector(currentStep.target);
    if (el) {
      // Scroll into view if needed
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });

      const rect = el.getBoundingClientRect();
      const padding = 6;
      setTargetRect({
        top: Math.max(0, rect.top - padding),
        left: Math.max(0, rect.left - padding),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        right: rect.right + padding,
        bottom: rect.bottom + padding,
      });
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  // Synchronously measure exact popover size before browser paint
  useIsomorphicLayoutEffect(() => {
    if (!isOpen || !currentStep) return;

    const measure = () => {
      if (popoverRef.current) {
        const rect = popoverRef.current.getBoundingClientRect();
        if (
          rect.height > 0 &&
          (Math.abs(rect.height - popoverSize.height) > 1 ||
            Math.abs(rect.width - popoverSize.width) > 1)
        ) {
          setPopoverSize({
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }
    };

    measure();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && popoverRef.current) {
      ro = new ResizeObserver(measure);
      ro.observe(popoverRef.current);
    }

    return () => {
      if (ro) ro.disconnect();
    };
  }, [isOpen, currentStep, popoverSize.height, popoverSize.width]);

  useEffect(() => {
    if (!isOpen || !currentStep) return;

    // Schedule position calculation on next animation frame and after transitions settle
    const rafId = requestAnimationFrame(updateTargetPosition);
    const timer = setTimeout(updateTargetPosition, 50);

    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition, true);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition, true);
    };
  }, [isOpen, currentStep, updateTargetPosition]);

  if (!isClient || !isOpen || !currentStep) return null;

  // Calculate Popover Coordinates using dynamically measured height/width
  const popoverWidth = Math.min(popoverSize.width, windowSize.width - 32);
  const popoverHeight = popoverSize.height;
  const margin = 14;
  const screenMargin = 16;

  let popoverTop = 0;
  let popoverLeft = 0;
  const isCentered = !targetRect || currentStep.placement === "center";

  if (targetRect && !isCentered) {
    switch (currentStep.placement) {
      case "bottom":
        popoverTop = targetRect.bottom + margin;
        popoverLeft = targetRect.left + targetRect.width / 2 - popoverWidth / 2;
        break;
      case "top":
        popoverTop = targetRect.top - popoverHeight - margin;
        popoverLeft = targetRect.left + targetRect.width / 2 - popoverWidth / 2;
        break;
      case "right":
        popoverTop = targetRect.top + targetRect.height / 2 - popoverHeight / 2;
        popoverLeft = targetRect.right + margin;
        break;
      case "left":
        popoverTop = targetRect.top + targetRect.height / 2 - popoverHeight / 2;
        popoverLeft = targetRect.left - popoverWidth - margin;
        break;
    }

    // Strict boundary constraints within viewport — guarantees card is never cut off
    popoverLeft = Math.max(
      screenMargin,
      Math.min(windowSize.width - popoverWidth - screenMargin, popoverLeft)
    );
    popoverTop = Math.max(
      screenMargin,
      Math.min(windowSize.height - popoverHeight - screenMargin, popoverTop)
    );
  } else {
    popoverTop = Math.max(screenMargin, (windowSize.height - popoverHeight) / 2);
    popoverLeft = Math.max(screenMargin, (windowSize.width - popoverWidth) / 2);
  }

  // SVG Mask Cutout Path
  const { width: W, height: H } = windowSize;
  const r = 8; // Border radius for cutout
  let svgPath = `M 0 0 H ${W} V ${H} H 0 Z`;

  if (targetRect) {
    const { left: x, top: y, width: w, height: h } = targetRect;
    // Counter-clockwise rounded rect cutout
    svgPath += ` M ${x + r} ${y} h ${Math.max(0, w - 2 * r)} a ${r} ${r} 0 0 1 ${r} ${r} v ${Math.max(
      0,
      h - 2 * r
    )} a ${r} ${r} 0 0 1 -${r} ${r} h -${Math.max(0, w - 2 * r)} a ${r} ${r} 0 0 1 -${r} -${r} v -${Math.max(
      0,
      h - 2 * r
    )} a ${r} ${r} 0 0 1 ${r} -${r} Z`;
  }

  const isLastStep = currentStepIndex === totalSteps - 1;

  return createPortal(
    <div className={styles.overlay} onClick={(e) => e.stopPropagation()}>
      {/* SVG Spotlight Mask */}
      <svg className={styles.svgMask} preserveAspectRatio="none">
        <path className={styles.maskBackground} d={svgPath} fillRule="evenodd" />
      </svg>

      {/* Target Focus Ring */}
      {targetRect && (
        <div
          className={styles.spotlightRing}
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}

      {/* Floating Explainer Card */}
      <div
        ref={popoverRef}
        className={styles.popover}
        style={{
          top: popoverTop,
          left: popoverLeft,
        }}
      >
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <div className={styles.iconBox}>
              {getStepIcon(currentStep.id)}
            </div>
            <h3 className={styles.title}>{currentStep.title}</h3>
          </div>
          <button
            className={styles.closeButton}
            onClick={closeTour}
            title="Close tour"
            aria-label="Close tour"
          >
            <X size={16} />
          </button>
        </div>

        <p className={styles.description}>{currentStep.description}</p>

        <div className={styles.footer}>
          {/* Progress Dots */}
          <div className={styles.progressDots}>
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`${styles.dot} ${idx === currentStepIndex ? styles.dotActive : ""}`}
                onClick={() => goToStep(idx)}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className={styles.actions}>
            <button className={styles.skipButton} onClick={closeTour}>
              Skip
            </button>
            {currentStepIndex > 0 && (
              <button
                className={styles.navButton}
                onClick={prevStep}
                title="Previous step (←)"
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}
            <button
              className={styles.primaryButton}
              onClick={nextStep}
              title={isLastStep ? "Finish guide" : "Next step (→)"}
            >
              {isLastStep ? (
                <>
                  Got It <Check size={14} />
                </>
              ) : (
                <>
                  Next <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
