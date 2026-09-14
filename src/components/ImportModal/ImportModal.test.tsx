import React, { StrictMode, useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import { ProductTour, TourProvider, useTour } from "../ProductTour";
import ImportModal from "./ImportModal";

const collectionFile = new File(
  [JSON.stringify({ openapi: "3.0.0", info: { title: "Example" }, paths: {} })],
  "collection.json",
  { type: "application/json" },
);

function Workspace({
  isStandaloneMode = true,
  addCollection = vi.fn().mockResolvedValue(undefined),
  onError = vi.fn(),
}: Partial<React.ComponentProps<typeof ImportModal>>) {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const { startTour } = useTour();

  return (
    <>
      <button onClick={() => setIsImportOpen(true)}>Import collection</button>
      <button onClick={() => startTour()}>Replay tour</button>
      {isImportOpen && (
        <ImportModal
          isOpen
          onClose={() => setIsImportOpen(false)}
          initialFile={collectionFile}
          autoAnalyze
          targetDir="/project"
          isStandaloneMode={isStandaloneMode}
          addCollection={addCollection}
          onSuccess={vi.fn()}
          onError={onError}
        />
      )}
      <ProductTour />
    </>
  );
}

function renderWorkspace(props: React.ComponentProps<typeof Workspace> = {}) {
  return render(
    <StrictMode>
      <TourProvider>
        <Workspace {...props} />
      </TourProvider>
    </StrictMode>,
  );
}

function expectTourClosed() {
  expect(screen.queryByRole("button", { name: "Close tour" })).toBeNull();
}

async function reviewImport() {
  fireEvent.click(screen.getByRole("button", { name: "Import collection" }));
  const importButton = await screen.findByRole("button", { name: "Add 1" });
  expectTourClosed();
  return importButton;
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  vi.spyOn(api, "analyzeCollection").mockResolvedValue({
    success: true,
    data: {
      collectionName: "Example",
      diffs: [{
        module: "users",
        status: "new",
        functions: [{ name: "get_users", status: "new" }],
      }],
    },
  });
  vi.spyOn(api, "fetchProjectDefinitions").mockResolvedValue({});
  vi.spyOn(api, "updateCollection").mockResolvedValue({ success: true });
  vi.spyOn(api, "syncProjectClients").mockResolvedValue({ success: true });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("keeps the tour closed on first arrival, even after the old startup delay", () => {
  vi.useFakeTimers();
  renderWorkspace();

  act(() => vi.advanceTimersByTime(1000));

  expectTourClosed();
  expect(localStorage.getItem("reex_tour_completed")).toBeNull();
});

it.each([true, false])(
  "starts after a successful import is dismissed and respects skipping (standalone: %s)",
  async (isStandaloneMode) => {
    renderWorkspace({ isStandaloneMode });
    fireEvent.click(await reviewImport());
    const done = await screen.findByRole("button", { name: "Done" });
    expectTourClosed();

    fireEvent.click(done);

    expect(screen.queryByRole("heading", { name: "Import API Collection" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Workspace Mode" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(localStorage.getItem("reex_tour_completed")).toBe("true");

    fireEvent.click(await reviewImport());
    fireEvent.click(await screen.findByRole("button", { name: "Done" }));
    expectTourClosed();

    fireEvent.click(screen.getByRole("button", { name: "Replay tour" }));
    expect(screen.getByRole("heading", { name: "Workspace Mode" })).toBeTruthy();
  },
);

it("does not start the tour when an import is canceled before saving", async () => {
  renderWorkspace();
  await reviewImport();

  fireEvent.click(screen.getByTitle("Close"));

  expectTourClosed();
  expect(localStorage.getItem("reex_tour_completed")).toBeNull();
});

it("keeps the tour closed while saving and after a failed import", async () => {
  let rejectSave!: (error: Error) => void;
  const save = new Promise<void>((_, reject) => { rejectSave = reject; });
  const onError = vi.fn();
  vi.spyOn(console, "error").mockImplementation(() => {});
  renderWorkspace({ addCollection: vi.fn(() => save), onError });
  fireEvent.click(await reviewImport());
  expect(screen.getByText("Applying changes...")).toBeTruthy();
  expectTourClosed();

  await act(async () => rejectSave(new Error("Storage is full")));

  expect(onError).toHaveBeenCalledWith("Import failed: Storage is full");
  fireEvent.click(screen.getByTitle("Close"));
  expectTourClosed();
  expect(localStorage.getItem("reex_tour_completed")).toBeNull();
});
