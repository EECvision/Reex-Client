import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCollectionManagement } from "./useCollectionManagement";

describe("Collection deletion result", () => {
  it("reports a failed save without dismissing the dialog or approving tab cleanup", async () => {
    const removeCollection = vi
      .fn()
      .mockRejectedValue(new Error("Storage is unavailable"));
    const showToast = vi.fn();
    const { result } = renderHook(() =>
      useCollectionManagement({
        projectPath: "",
        isStandaloneMode: true,
        removeCollection,
        showToast,
        refreshProject: vi.fn(),
        registerTaskId: vi.fn(),
      }),
    );
    act(() => result.current.openDeleteModal("keep"));
    let deleted: boolean | undefined;
    await act(async () => {
      deleted = await result.current.handleDeleteCollection();
    });
    expect(deleted).toBe(false);
    expect(removeCollection).toHaveBeenCalledWith("keep");
    expect(result.current.showDeleteModal).toBe(true);
    expect(result.current.collectionToDelete).toBe("keep");
    expect(result.current.deleting).toBe(false);
    expect(showToast).toHaveBeenCalledWith("error", "Storage is unavailable");
  });

  it("approves tab cleanup only after the collection save commits", async () => {
    let commit!: () => void;
    const removeCollection = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          commit = resolve;
        }),
    );
    const { result } = renderHook(() =>
      useCollectionManagement({
        projectPath: "",
        isStandaloneMode: true,
        removeCollection,
        showToast: vi.fn(),
        refreshProject: vi.fn(),
        registerTaskId: vi.fn(),
      }),
    );
    act(() => result.current.openDeleteModal("remove"));
    let deletion!: Promise<boolean>;
    act(() => {
      deletion = result.current.handleDeleteCollection();
    });
    expect(result.current.deleting).toBe(true);
    expect(result.current.showDeleteModal).toBe(true);
    await act(async () => {
      commit();
      expect(await deletion).toBe(true);
    });
    expect(result.current.showDeleteModal).toBe(false);
    expect(result.current.collectionToDelete).toBeNull();
    expect(result.current.deleting).toBe(false);
  });
});
