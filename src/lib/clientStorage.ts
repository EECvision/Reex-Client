const DB_NAME = "reex_app_storage";
const DB_VERSION = 1;
const STORE_NAME = "collections";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(
        new Error(
          "Browser storage is unavailable. Enable site storage to save collections.",
        ),
      );
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let blocked = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME))
        request.result.createObjectStore(STORE_NAME);
    };
    request.onblocked = () => {
      blocked = true;
      reject(
        new Error(
          "Close other Reex tabs and try again to unlock browser storage.",
        ),
      );
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      if (blocked) db.close();
      else resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

function readItems<T>(value: unknown): T[] {
  if (value === undefined) return [];
  if (!Array.isArray(value))
    throw new Error(
      "Saved data could not be read. Your existing data has been kept.",
    );
  return value as T[];
}

export interface CachedExecutionResult {
  id: string;
  result?: unknown;
  error?: string;
  executedCurl?: string;
  interfacePreview?: string;
  timestamp?: number;
}

export class ClientStorage {
  static async get<T>(key: string): Promise<T[]> {
    if (typeof window === "undefined") return [];
    const db = await openDB();
    try {
      return await new Promise<T[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const request = tx.objectStore(STORE_NAME).get(key);
        tx.oncomplete = () => {
          try {
            resolve(readItems<T>(request.result));
          } catch (error) {
            reject(error);
          }
        };
        tx.onabort = () =>
          reject(tx.error || new Error("Could not read browser storage."));
      });
    } finally {
      db.close();
    }
  }

  // Read and write in one transaction so overlapping edits cannot overwrite each other.
  // Callbacks must be synchronous to keep the IndexedDB transaction active.
  static async mutate<T>(
    key: string,
    change: (items: T[]) => T[],
  ): Promise<T[]> {
    const db = await openDB();
    try {
      return await new Promise<T[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        let items: T[];
        let changeError: unknown;
        request.onsuccess = () => {
          try {
            items = change(readItems<T>(request.result));
            store.put(items, key);
          } catch (error) {
            changeError = error;
            tx.abort();
          }
        };
        tx.oncomplete = () => resolve(items);
        tx.onabort = () =>
          reject(
            changeError ||
              tx.error ||
              new Error("Could not save to browser storage."),
          );
      });
    } finally {
      db.close();
    }
  }

  static async save<T>(key: string, data: T[]): Promise<void> {
    await this.mutate<T>(key, () => data);
  }

  static add<T>(key: string, item: T): Promise<T[]> {
    return this.mutate<T>(key, (items) => [...items, item]);
  }

  static update<T extends { id: string }>(
    key: string,
    id: string,
    updates: Partial<T> | ((item: T) => T),
  ): Promise<T[]> {
    return this.mutate<T>(key, (items) => {
      if (!items.some((item) => item.id === id))
        throw new Error("The saved item no longer exists.");
      return items.map((item) =>
        item.id === id
          ? typeof updates === "function"
            ? updates(item)
            : { ...item, ...updates }
          : item,
      );
    });
  }

  static delete<T extends { id: string }>(
    key: string,
    id: string,
  ): Promise<T[]> {
    return this.mutate<T>(key, (items) =>
      items.filter((item) => item.id !== id),
    );
  }

  static upsert<T extends { id: string }>(key: string, item: T): Promise<T[]> {
    return this.mutate<T>(key, (items) =>
      items.some((existing) => existing.id === item.id)
        ? items.map((existing) =>
            existing.id === item.id ? { ...existing, ...item } : existing,
          )
        : [...items, item],
    );
  }

  static async clear(key: string): Promise<void> {
    const db = await openDB();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
        tx.onabort = () =>
          reject(tx.error || new Error("Could not clear browser storage."));
      });
    } finally {
      db.close();
    }
  }

  // Caches are optional and bounded independently of collection storage.
  static async getExecutionResult(
    requestId: string,
  ): Promise<CachedExecutionResult | undefined> {
    try {
      return (await this.get<CachedExecutionResult>("request_results")).find(
        (item) => item.id === requestId,
      );
    } catch (error) {
      console.warn("[ClientStorage] Could not read cached response:", error);
    }
  }

  static async saveExecutionResult(
    requestId: string,
    resultData: Omit<CachedExecutionResult, "id" | "timestamp">,
  ): Promise<void> {
    if (typeof window === "undefined") return;
    const save = (limit: number) =>
      this.mutate<CachedExecutionResult>("request_results", (items) =>
        [
          { id: requestId, ...resultData, timestamp: Date.now() },
          ...items.filter((item) => item.id !== requestId),
        ].slice(0, limit),
      );
    try {
      try {
        await save(20);
      } catch (error) {
        if (
          !(error instanceof DOMException) ||
          error.name !== "QuotaExceededError"
        )
          throw error;
        await save(5);
      }
    } catch (error) {
      console.warn("[ClientStorage] Could not cache response:", error);
    }
  }

  static async getAssistantMessages<T>(): Promise<T[]> {
    try {
      return await this.get<T>("assistant_messages");
    } catch (error) {
      console.warn("[ClientStorage] Could not read cached messages:", error);
      return [];
    }
  }

  static async saveAssistantMessages<T>(messages: T[]): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      await this.save("assistant_messages", messages.slice(-20));
    } catch (error) {
      console.warn("[ClientStorage] Could not cache messages:", error);
    }
  }

  static clearAssistantMessages(): Promise<void> {
    return this.clear("assistant_messages");
  }
}
