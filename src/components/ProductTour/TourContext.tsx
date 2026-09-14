"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { TOUR_STEPS, TourStep } from "./tourSteps";

interface TourContextType {
  isOpen: boolean;
  currentStepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;
  startTour: (stepIndex?: number) => void;
  startTourAfterImport: () => void;
  closeTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
}

const TourContext = createContext<TourContextType | null>(null);

const TOUR_STORAGE_KEY = "reex_tour_completed";

export const TourProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const totalSteps = TOUR_STEPS.length;
  const currentStep = isOpen && currentStepIndex < totalSteps ? TOUR_STEPS[currentStepIndex] : null;

  const startTour = useCallback((stepIndex = 0) => {
    setCurrentStepIndex(Math.min(Math.max(0, stepIndex), TOUR_STEPS.length - 1));
    setIsOpen(true);
  }, []);

  const closeTour = useCallback(() => {
    setIsOpen(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, "true");
      } catch {
        // Handle private browsing or storage errors gracefully
      }
    }
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      if (prev >= TOUR_STEPS.length - 1) {
        closeTour();
        return prev;
      }
      return prev + 1;
    });
  }, [closeTour]);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < TOUR_STEPS.length) {
      setCurrentStepIndex(index);
    }
  }, []);

  const startTourAfterImport = useCallback(() => {
    if (typeof window === "undefined") return;
    // On small screens, keep the tour available through the workspace menu.
    if (window.matchMedia("(max-width: 980px)").matches) return;

    try {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!completed) {
        startTour(0);
      }
    } catch {
      // Storage unavailable
    }
  }, [startTour]);

  // Global keyboard shortcuts while tour is active
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextStep();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, nextStep, prevStep]);

  return (
    <TourContext.Provider
      value={{
        isOpen,
        currentStepIndex,
        currentStep,
        totalSteps,
        startTour,
        startTourAfterImport,
        closeTour,
        nextStep,
        prevStep,
        goToStep,
      }}
    >
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    return {
      isOpen: false,
      currentStepIndex: 0,
      currentStep: null,
      totalSteps: 0,
      startTour: () => {},
      startTourAfterImport: () => {},
      closeTour: () => {},
      nextStep: () => {},
      prevStep: () => {},
      goToStep: () => {},
    };
  }
  return context;
};
