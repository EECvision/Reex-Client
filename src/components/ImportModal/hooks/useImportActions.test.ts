import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { api } from "@/services/api";
import { useImportActions } from "./useImportActions";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function props() {
  return {
    selectedFile: new File(["{}"], "collection.json", {
      type: "application/json",
    }),
    targetDir: "/project",
    setDiffs: vi.fn(),
    setSelectedModules: vi.fn(),
    setRemovedModules: vi.fn(),
    setSelectedFunctions: vi.fn(),
    setRemovedFunctions: vi.fn(),
    forceOverwriteFunctions: new Set<string>(),
    onError: vi.fn(),
  };
}

it("allows repeated project imports without a session or import-count request", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  vi.spyOn(api, "fetchProjectDefinitions").mockResolvedValue({});
  const update = vi
    .spyOn(api, "updateCollection")
    .mockResolvedValue({ success: true });
  vi.spyOn(api, "syncProjectClients").mockResolvedValue({ success: true });
  const options = props();
  const { result } = renderHook(() => useImportActions(options));
  for (let i = 0; i < 12; i++) {
    await act(async () => {
      await result.current.handleUpdate(
        [],
        new Set(),
        new Map(),
        new Set(),
        new Map(),
      );
    });
    expect(result.current.step).toBe("success");
  }
  expect(update).toHaveBeenCalledTimes(12);
  expect(options.onError).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it("keeps the import in progress until local persistence commits and reports failed saves", async () => {
  let rejectSave!: (error: Error) => void;
  const save = new Promise<void>((_, reject) => {
    rejectSave = reject;
  });
  const options = {
    ...props(),
    isStandaloneMode: true,
    addCollection: vi.fn(() => save),
    onSuccess: vi.fn(),
  };
  vi.spyOn(console, "error").mockImplementation(() => {});
  const { result } = renderHook(() => useImportActions(options));
  let operation!: Promise<void>;
  act(() => {
    operation = result.current.handleUpdate(
      [],
      new Set(),
      new Map(),
      new Set(),
      new Map(),
    );
  });
  expect(result.current.step).toBe("updating");
  expect(options.onSuccess).not.toHaveBeenCalled();
  await act(async () => {
    rejectSave(new Error("Storage is full"));
    await operation;
  });
  expect(result.current.step).toBe("review");
  expect(options.onError).toHaveBeenCalledWith(
    "Import failed: Storage is full",
  );
  expect(options.onSuccess).not.toHaveBeenCalled();
});
