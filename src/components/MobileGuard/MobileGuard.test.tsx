import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkIsMobileScreen, MobileGuard } from "./MobileGuard";

vi.mock("../Logo/Logo", () => ({
  default: ({ horizontal }: { horizontal?: boolean }) => (
    <div data-testid="reex-logo" data-horizontal={horizontal ? "true" : "false"}>
      Logo
    </div>
  ),
}));

describe("MobileGuard", () => {
  const originalUserAgent = navigator.userAgent;
  const originalPlatform = navigator.platform;
  const originalMaxTouchPoints = navigator.maxTouchPoints;

  beforeEach(() => {
    // Default to a 1080p desktop setup
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1280,
    });
    Object.defineProperty(window, "screen", {
      writable: true,
      configurable: true,
      value: { width: 1920, height: 1080 },
    });
    Object.defineProperty(navigator, "userAgent", {
      writable: true,
      configurable: true,
      value:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    });
    Object.defineProperty(navigator, "platform", {
      writable: true,
      configurable: true,
      value: "Win32",
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      writable: true,
      configurable: true,
      value: 0,
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(navigator, "userAgent", {
      writable: true,
      configurable: true,
      value: originalUserAgent,
    });
    Object.defineProperty(navigator, "platform", {
      writable: true,
      configurable: true,
      value: originalPlatform,
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      writable: true,
      configurable: true,
      value: originalMaxTouchPoints,
    });
  });

  it("does not render the overlay on desktop screens, even when resized below breakpoint", () => {
    // Desktop window resized to 480px width
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 480,
    });

    expect(checkIsMobileScreen()).toBe(false);

    render(
      <MobileGuard>
        <div data-testid="app-content">Reex Workspace</div>
      </MobileGuard>,
    );

    expect(screen.getByTestId("app-content")).toBeDefined();
    expect(
      screen.queryByText(
        "Open Reex on a desktop for the best developer experience.",
      ),
    ).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not render the overlay on touchscreen laptops when resized", () => {
    // Touchscreen laptop (e.g. Surface) resized to 500px width
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      writable: true,
      configurable: true,
      value: 10,
    });

    expect(checkIsMobileScreen()).toBe(false);

    render(
      <MobileGuard>
        <div data-testid="app-content">Reex Workspace</div>
      </MobileGuard>,
    );

    expect(
      screen.queryByText(
        "Open Reex on a desktop for the best developer experience.",
      ),
    ).toBeNull();
  });

  it("renders the overlay on genuine mobile devices when screen width is below breakpoint", () => {
    // iPhone 14
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 390,
    });
    Object.defineProperty(window, "screen", {
      writable: true,
      configurable: true,
      value: { width: 390, height: 844 },
    });
    Object.defineProperty(navigator, "userAgent", {
      writable: true,
      configurable: true,
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });

    expect(checkIsMobileScreen()).toBe(true);

    render(
      <MobileGuard>
        <div data-testid="app-content">Reex Workspace</div>
      </MobileGuard>,
    );

    expect(screen.getByTestId("app-content")).toBeDefined();
    const overlay = screen.getByRole("dialog");
    expect(overlay).toBeDefined();

    // Verify exact grammatically correct text
    expect(
      screen.getByRole("heading", {
        name: "Open Reex on a desktop for the best developer experience.",
      }),
    ).toBeDefined();

    // Verify Reex Logo
    expect(screen.getByTestId("reex-logo")).toBeDefined();
    expect(
      screen.getByTestId("reex-logo").getAttribute("data-horizontal"),
    ).toBe("true");
  });

  it("does not render the overlay on mobile devices if the width exceeds the breakpoint", () => {
    // Mobile device in landscape or large tablet width
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(navigator, "userAgent", {
      writable: true,
      configurable: true,
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });

    expect(checkIsMobileScreen()).toBe(false);

    render(
      <MobileGuard>
        <div data-testid="app-content">Reex Workspace</div>
      </MobileGuard>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
