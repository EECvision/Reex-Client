import { describe, it, expect } from "vitest";
import {
  TabPointer,
  getTabKey,
  normalizeTabPointers,
  selectEndpoint,
  doubleClickEndpoint,
} from "./tabManagement";

describe("Key-based Tab Selection Logic", () => {
  it("opens and activates an unpinned preview by default", () => {
    const { newPointers, newActiveKey } = selectEndpoint([], {
      apiKey: "cards",
      fnName: "get_listIssuedCards",
    });

    expect(newPointers).toHaveLength(1);
    expect(newPointers[0].fnName).toBe("get_listIssuedCards");
    expect(newPointers[0].isPinned).toBe(false);
    expect(newActiveKey).toBe("cards__get_listIssuedCards");
  });

  it("appends and activates a preview without replacing pinned tabs", () => {
    const currentPointers: TabPointer[] = [
      { apiKey: "cards", fnName: "get_listIssuedCards", isPinned: true },
      { apiKey: "cards", fnName: "post_createCard", isPinned: true },
    ];

    const { newPointers, newActiveKey } = selectEndpoint(currentPointers, {
      apiKey: "cards",
      fnName: "post_sendCardCancellationOtp",
    });

    expect(newPointers).toHaveLength(3);
    expect(newPointers[0].fnName).toBe("get_listIssuedCards");
    expect(newPointers[1].fnName).toBe("post_createCard");
    expect(newPointers[2].fnName).toBe("post_sendCardCancellationOtp");
    expect(newPointers[2].isPinned).toBe(false);
    expect(newActiveKey).toBe("cards__post_sendCardCancellationOtp");
  });

  it("switches activeKey to the existing tab without creating duplicate", () => {
    const currentPointers: TabPointer[] = [
      { apiKey: "cards", fnName: "get_listIssuedCards", isPinned: true },
      { apiKey: "cards", fnName: "post_createCard", isPinned: true },
    ];

    const { newPointers, newActiveKey } = selectEndpoint(currentPointers, {
      apiKey: "cards",
      fnName: "get_listIssuedCards",
    });

    expect(newPointers).toHaveLength(2);
    expect(newActiveKey).toBe("cards__get_listIssuedCards");
  });

  it("pins and activates an endpoint on double click", () => {
    const currentPointers: TabPointer[] = [
      { apiKey: "cards", fnName: "get_listIssuedCards", isPinned: false },
    ];

    const { newPointers, newActiveKey } = doubleClickEndpoint(currentPointers, {
      apiKey: "cards",
      fnName: "get_listIssuedCards",
    });

    expect(newPointers[0].isPinned).toBe(true);
    expect(newActiveKey).toBe("cards__get_listIssuedCards");
  });

  it("computes tab keys deterministically", () => {
    expect(getTabKey("cards", "get_listIssuedCards")).toBe(
      "cards__get_listIssuedCards",
    );
    expect(getTabKey("col_123__cards", "post_create")).toBe(
      "col_123__cards__post_create",
    );
  });
});

describe("Restoring saved tabs", () => {
  it("keeps valid pointers and restores older tabs containing an endpoint", () => {
    expect(
      normalizeTabPointers([
        { apiKey: "col_keep__items", fnName: "get_items", isPinned: false },
        {
          endpoint: {
            apiKey: "col_old__items",
            fnName: "post_item",
            url: "/items",
          },
          isPinned: true,
        },
        { apiKey: "items", fnName: "get_items" },
      ]),
    ).toEqual([
      { apiKey: "col_keep__items", fnName: "get_items", isPinned: false },
      { apiKey: "col_old__items", fnName: "post_item", isPinned: true },
      { apiKey: "items", fnName: "get_items", isPinned: true },
    ]);
  });

  it("discards incomplete records so collection deletion can safely filter tabs", () => {
    const pointers = normalizeTabPointers([
      null,
      42,
      "tab",
      {},
      { isPinned: true },
      { apiKey: 123, fnName: "get_items" },
      { apiKey: "items", fnName: null },
      { apiKey: "", fnName: "get_items" },
      { apiKey: "items", fnName: "" },
      { endpoint: { apiKey: "items" } },
      { apiKey: "col_remove__items", fnName: "get_items", isPinned: true },
      { apiKey: "col_keep__items", fnName: "get_items", isPinned: true },
    ]);
    expect(
      pointers.filter((pointer) => !pointer.apiKey.startsWith("col_remove__")),
    ).toEqual([
      { apiKey: "col_keep__items", fnName: "get_items", isPinned: true },
    ]);
  });

  it.each([null, undefined, {}, "not an array", 123])(
    "ignores non-array storage: %j",
    (value) => {
      expect(normalizeTabPointers(value)).toEqual([]);
    },
  );
});

describe("Preview tab behavior", () => {
  const first = { apiKey: "items", fnName: "get_first" };
  const second = { apiKey: "items", fnName: "get_second" };

  it("opens an unpinned preview and replaces it when another endpoint is selected", () => {
    const opened = selectEndpoint([], first, false);
    expect(opened.newPointers).toEqual([{ ...first, isPinned: false }]);
    const next = selectEndpoint(opened.newPointers, second, false);
    expect(next.newPointers).toEqual([{ ...second, isPinned: false }]);
    expect(next.newActiveKey).toBe("items__get_second");
    expect(opened.newPointers).toEqual([{ ...first, isPinned: false }]);
  });

  it("preserves pinned tabs and reuses the preview's position", () => {
    const current = [
      { apiKey: "items", fnName: "get_pinned", isPinned: true },
      { ...first, isPinned: false },
      { apiKey: "items", fnName: "get_last", isPinned: true },
    ];
    const next = selectEndpoint(current, second, false);
    expect(next.newPointers).toEqual([
      current[0],
      { ...second, isPinned: false },
      current[2],
    ]);
    expect(selectEndpoint(current, current[0], false).newPointers).toBe(
      current,
    );
    expect(selectEndpoint(current, first, false).newPointers).toBe(current);
  });

  it("keeps a preview after double-clicking to pin it", () => {
    const preview = selectEndpoint([], first, false);
    const pinned = doubleClickEndpoint(preview.newPointers, first);
    const next = selectEndpoint(pinned.newPointers, second, false);
    expect(next.newPointers).toEqual([
      { ...first, isPinned: true },
      { ...second, isPinned: false },
    ]);
  });

  it("applies automatic pinning to new tabs without changing existing previews", () => {
    const current = [{ ...first, isPinned: false }];
    expect(selectEndpoint(current, second, true).newPointers).toEqual([
      ...current,
      { ...second, isPinned: true },
    ]);
  });
});
