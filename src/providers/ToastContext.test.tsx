import React, { StrictMode } from "react";
import { act, cleanup, fireEvent, renderHook, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./ToastContext";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <StrictMode>
    <ToastProvider>{children}</ToastProvider>
  </StrictMode>
);

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Date, "now").mockReturnValue(1789339228342);
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("keeps simultaneous notifications distinct when dismissing and adding toasts", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  const { result } = renderHook(() => useToast(), { wrapper });

  act(() => {
    result.current.showToast("success", "First notification");
    result.current.showToast("error", "Second notification");
  });

  expect(screen.queryByText("First notification")).not.toBeNull();
  expect(screen.queryByText("Second notification")).not.toBeNull();
  fireEvent.click(within(screen.getByText("First notification").parentElement!).getByRole("button"));
  expect(screen.queryByText("First notification")).toBeNull();
  expect(screen.queryByText("Second notification")).not.toBeNull();

  act(() => result.current.showToast("success", "Third notification"));
  fireEvent.click(within(screen.getByText("Second notification").parentElement!).getByRole("button"));
  expect(screen.queryByText("Second notification")).toBeNull();
  expect(screen.queryByText("Third notification")).not.toBeNull();
  expect(consoleError).not.toHaveBeenCalled();
});

it("expires each toast after its own five seconds even when the clock repeats", () => {
  const { result } = renderHook(() => useToast(), { wrapper });

  act(() => result.current.showToast("success", "Earlier notification"));
  act(() => vi.advanceTimersByTime(1000));
  act(() => result.current.showToast("success", "Later notification"));
  act(() => vi.advanceTimersByTime(4000));

  expect(screen.queryByText("Earlier notification")).toBeNull();
  expect(screen.queryByText("Later notification")).not.toBeNull();

  act(() => vi.advanceTimersByTime(1000));
  expect(screen.queryByText("Later notification")).toBeNull();
});
