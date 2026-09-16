import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConnectProjectModal } from "./ConnectProjectModal";

const mockShowToast = vi.fn();
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

describe("ConnectProjectModal", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("does not render when isOpen is false", () => {
    render(<ConnectProjectModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText("Connect Local Project")).toBeNull();
  });

  it("renders instructions and commands when isOpen is true", () => {
    render(<ConnectProjectModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("Connect Local Project")).toBeDefined();
    expect(screen.getByText("install -g reex-cli")).toBeDefined();
    expect(screen.getByText("start")).toBeDefined();
    expect(screen.getByText("reex-proxy")).toBeDefined();
    expect(screen.getByText("Testing Localhost APIs?")).toBeDefined();
  });

  it("calls onClose when clicking close button or Got it button", () => {
    const handleClose = vi.fn();
    render(<ConnectProjectModal isOpen={true} onClose={handleClose} />);

    fireEvent.click(screen.getByTitle("Close modal"));
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Got it"));
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it("copies command to clipboard without showing notification", () => {
    render(<ConnectProjectModal isOpen={true} onClose={vi.fn()} />);

    const copyButtons = screen.getAllByTitle("Copy command");
    expect(copyButtons.length).toBe(3);

    fireEvent.click(copyButtons[0]);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "npm install -g reex-cli"
    );
  });
});
