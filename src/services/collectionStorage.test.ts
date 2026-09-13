import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { ClientStorage } from "@/lib/clientStorage";
import { collectionStorage as storage } from "./collectionStorage";
import type { StandaloneCollection } from "@/types";

const standalone = (index: number): StandaloneCollection => ({
  id: "standalone-" + index,
  name: "Collection " + index,
  manifest: {},
  modules: {},
  config: { baseURL: "https://example.test" },
});

beforeEach(() => vi.stubGlobal("indexedDB", new IDBFactory()));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("browser collection persistence", () => {
  it("stores more than 20 collections, requests, standalone collections, and history entries", async () => {
    const collections = await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        storage.createCollection("Test " + i),
      ),
    );
    await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        storage.createRequest(collections[0].id, "Request " + i),
      ),
    );
    await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        storage.createStandaloneCollection(standalone(i)),
      ),
    );
    await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        storage.addToHistory("History " + i, { index: i }),
      ),
    );
    expect(await storage.getCollections()).toHaveLength(25);
    expect((await storage.getCollections())[0].requests).toHaveLength(25);
    expect(await storage.getStandaloneCollections()).toHaveLength(25);
    expect(await storage.getHistory()).toHaveLength(25);
  });

  it("preserves API auth and merges overlapping edits without losing saved requests", async () => {
    const collection = await storage.createCollection("API");
    const request = await storage.createRequest(collection.id, "Get items");
    await Promise.all([
      storage.updateCollection(collection.id, {
        name: "Renamed",
        base_url: "https://example.test",
      }),
      storage.updateCollection(collection.id, {
        auth: {
          type: "bearer",
          token: "test-token",
          customHeaders: { "X-Test": "yes" },
        },
      }),
      storage.updateRequest(request.id, {
        method: "POST",
        config: { body: { name: "sample" } },
      }),
      storage.updateRequest(request.id, {
        url: "/items",
        config: { headers: [{ key: "Accept", value: "application/json" }] },
      }),
    ]);
    const [saved] = await storage.getCollections();
    expect(saved).toMatchObject({
      name: "Renamed",
      base_url: "https://example.test",
      auth: { token: "test-token" },
    });
    expect(saved.requests[0]).toMatchObject({
      method: "POST",
      url: "/items",
      config: {
        body: { name: "sample" },
        headers: [{ key: "Accept", value: "application/json" }],
      },
    });
    await storage.deleteRequest(collection.id, request.id);
    expect((await storage.getCollections())[0].requests).toEqual([]);
    await storage.deleteCollection(collection.id);
    expect(await storage.getCollections()).toEqual([]);
  });

  it("reads existing storage keys and updates standalone data without losing its auth", async () => {
    const collection = standalone(1);
    collection.config.auth = {
      token: "existing-token",
      customHeaders: { "X-Test": "yes" },
    };
    await ClientStorage.save("standalone_collections", [collection]);
    await storage.updateStandaloneCollection(collection.id, {
      name: "Updated",
    });
    expect(await storage.getStandaloneCollections()).toEqual([
      { ...collection, name: "Updated" },
    ]);
    await storage.deleteStandaloneCollection(collection.id);
    expect(await storage.getStandaloneCollections()).toEqual([]);
  });

  it("updates history by name while preserving its ID", async () => {
    await storage.addToHistory("API", { version: 1 });
    const [original] = await storage.getHistory();
    await storage.addToHistory("API", { version: 2 });
    expect(await storage.getHistory()).toEqual([
      expect.objectContaining({ id: original.id, content: { version: 2 } }),
    ]);
    await storage.deleteFromHistory(original.id);
    expect(await storage.getHistory()).toEqual([]);
  });

  it("never deletes collections or old history when a history save runs out of space", async () => {
    const collection = await storage.createCollection("Keep test collection");
    await storage.createStandaloneCollection(standalone(1));
    await storage.addToHistory("Keep history", { version: 1 });
    const put = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(() => {
        throw new DOMException("Storage is full", "QuotaExceededError");
      });
    await expect(storage.addToHistory("New history", {})).rejects.toMatchObject(
      { name: "QuotaExceededError" },
    );
    put.mockRestore();
    expect(await storage.getCollections()).toEqual([collection]);
    expect(await storage.getStandaloneCollections()).toEqual([standalone(1)]);
    expect(await storage.getHistory()).toHaveLength(1);
    expect((await storage.getHistory())[0].name).toBe("Keep history");
  });

  it("rejects an aborted transaction even after the write request succeeds", async () => {
    const originalPut = IDBObjectStore.prototype.put;
    const put = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(function (this: IDBObjectStore, ...args) {
        const request = originalPut.apply(this, args);
        request.addEventListener("success", () => this.transaction.abort());
        return request;
      });
    await expect(storage.createCollection("Aborted")).rejects.toThrow();
    put.mockRestore();
    expect(await storage.getCollections()).toEqual([]);
  });

  it("reports unavailable storage and missing collections instead of claiming to save", async () => {
    await expect(storage.createRequest("missing", "Request")).rejects.toThrow(
      "no longer exists",
    );
    vi.stubGlobal("indexedDB", undefined);
    await expect(storage.createCollection("Unavailable")).rejects.toThrow(
      "storage is unavailable",
    );
    await expect(storage.getCollections()).rejects.toThrow(
      "storage is unavailable",
    );
  });
});
