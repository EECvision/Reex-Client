import { describe, it, expect } from "vitest";
import { TOUR_STEPS } from "./tourSteps";

describe("ProductTour Steps Configuration", () => {
  it("should define valid tour steps", () => {
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(11);
  });

  it("should ensure every step has unique id, title, and target selector", () => {
    const ids = new Set<string>();
    const targets = new Set<string>();

    TOUR_STEPS.forEach((step) => {
      expect(step.id).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.description).toBeTruthy();
      expect(step.target).toBeTruthy();
      expect(["top", "bottom", "left", "right", "center"]).toContain(step.placement);

      expect(ids.has(step.id)).toBe(false);
      expect(targets.has(step.target)).toBe(false);

      ids.add(step.id);
      targets.add(step.target);
    });
  });

  it("should contain the required highlighted features including files-section and setup-guide", () => {
    const requiredStepIds = [
      "workspace-mode",
      "base-url",
      "auth",
      "add-collection",
      "ask-docs",
      "method-filter",
      "files-section",
      "collection-menu",
      "workspace-area",
      "user-menu",
      "setup-guide",
    ];

    const actualStepIds = TOUR_STEPS.map((s) => s.id);
    requiredStepIds.forEach((id) => {
      expect(actualStepIds).toContain(id);
    });
  });
});
