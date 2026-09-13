import { ClientStorage } from "@/lib/clientStorage";
import type {
  Collection,
  RequestItem,
} from "@/components/TestApi/CollectionSidebar";
import type { StandaloneCollection } from "@/types";

export interface HistoryItem {
  id: string;
  name: string;
  updated_at: string;
  content: Record<string, unknown>;
}

// Keep the existing keys and shapes to preserve collections already saved in this browser.
const TEST_KEY = "test_collections";
const STANDALONE_KEY = "standalone_collections";
const HISTORY_KEY = "recent_collections";

export const collectionStorage = {
  getCollections: () => ClientStorage.get<Collection>(TEST_KEY),
  async createCollection(name: string) {
    const collection: Collection = {
      id: crypto.randomUUID(),
      name,
      requests: [],
      isOpen: true,
      auth: { type: "none", token: "" },
    };
    await ClientStorage.add(TEST_KEY, collection);
    return collection;
  },
  deleteCollection: (id: string) =>
    ClientStorage.delete<Collection>(TEST_KEY, id),
  updateCollection: (id: string, updates: Partial<Collection>) =>
    ClientStorage.update<Collection>(TEST_KEY, id, updates),
  async createRequest(collectionId: string, name: string) {
    const request: RequestItem = {
      id: crypto.randomUUID(),
      name,
      method: "GET",
      url: "",
      config: { headers: [], queryParams: [], body: null, auth: null },
    };
    await ClientStorage.update<Collection>(
      TEST_KEY,
      collectionId,
      (collection) => ({
        ...collection,
        requests: [...collection.requests, request],
      }),
    );
    return request;
  },
  updateRequest(
    id: string,
    updates: Partial<RequestItem> & { config?: Record<string, unknown> },
  ) {
    return ClientStorage.mutate<Collection>(TEST_KEY, (collections) => {
      if (
        !collections.some((collection) =>
          collection.requests.some((request) => request.id === id),
        )
      ) {
        throw new Error("The saved request no longer exists.");
      }
      return collections.map((collection) => ({
        ...collection,
        requests: collection.requests.map((request) =>
          request.id === id
            ? {
                ...request,
                ...updates,
                config: {
                  ...(request.config as Record<string, unknown>),
                  ...updates.config,
                },
              }
            : request,
        ),
      }));
    });
  },
  deleteRequest: (collectionId: string, requestId: string) =>
    ClientStorage.update<Collection>(TEST_KEY, collectionId, (collection) => ({
      ...collection,
      requests: collection.requests.filter(
        (request) => request.id !== requestId,
      ),
    })),
  getStandaloneCollections: () =>
    ClientStorage.get<StandaloneCollection>(STANDALONE_KEY),
  async createStandaloneCollection(collection: StandaloneCollection) {
    const saved = { ...collection, id: collection.id || crypto.randomUUID() };
    await ClientStorage.add(STANDALONE_KEY, saved);
    return saved;
  },
  updateStandaloneCollection: (
    id: string,
    updates: Partial<StandaloneCollection>,
  ) => ClientStorage.update<StandaloneCollection>(STANDALONE_KEY, id, updates),
  deleteStandaloneCollection: (id: string) =>
    ClientStorage.delete<StandaloneCollection>(STANDALONE_KEY, id),
  clearStandaloneCollections: () => ClientStorage.clear(STANDALONE_KEY),
  async getHistory() {
    return (await ClientStorage.get<HistoryItem>(HISTORY_KEY)).sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  },
  async addToHistory(name: string, content: Record<string, unknown>) {
    await ClientStorage.mutate<HistoryItem>(HISTORY_KEY, (items) => {
      const existing = items.find((item) => item.name === name);
      const item = {
        id: existing?.id || crypto.randomUUID(),
        name,
        content,
        updated_at: new Date().toISOString(),
      };
      return existing
        ? items.map((old) => (old.id === existing.id ? item : old))
        : [...items, item];
    });
  },
  deleteFromHistory: (id: string) =>
    ClientStorage.delete<HistoryItem>(HISTORY_KEY, id),
};
