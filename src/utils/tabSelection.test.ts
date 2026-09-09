import { describe, it, expect } from "vitest";
import {
  TabPointer,
  getTabKey,
  selectEndpoint,
  doubleClickEndpoint,
} from "./tabManagement";

describe("Key-based Tab Selection Logic", () => {
  it("activates the newly added tab by key and marks it pinned", () => {
    const { newPointers, newActiveKey } = selectEndpoint([], {
      apiKey: "cards",
      fnName: "get_listIssuedCards",
    });

    expect(newPointers).toHaveLength(1);
    expect(newPointers[0].fnName).toBe("get_listIssuedCards");
    expect(newPointers[0].isPinned).toBe(true);
    expect(newActiveKey).toBe("cards__get_listIssuedCards");
  });

  it("appends and activates newly selected endpoints without replacing existing ones", () => {
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
    expect(newPointers[2].isPinned).toBe(true);
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
    expect(getTabKey("cards", "get_listIssuedCards")).toBe("cards__get_listIssuedCards");
    expect(getTabKey("col_123__cards", "post_create")).toBe("col_123__cards__post_create");
  });
});
