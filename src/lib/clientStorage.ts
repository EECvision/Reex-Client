const DB_NAME = 'reex_app_storage';
const DB_VERSION = 1;
const STORE_NAME = 'collections';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject(new Error('IndexedDB not available'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export class ClientStorage {
    static async get<T>(key: string): Promise<T[]> {
        if (typeof window === 'undefined') return [];
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`[ClientStorage] Error reading key "${key}":`, error);
            return [];
        }
    }

    static async save<T>(key: string, data: T[]): Promise<void> {
        if (typeof window === 'undefined') return;
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(data, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    static async add<T>(key: string, item: T): Promise<T[]> {
        const items = await this.get<T>(key);
        const newItems = [...items, item];
        await this.save(key, newItems);
        return newItems;
    }

    static async update<T extends { id: string }>(key: string, id: string, updates: Partial<T>): Promise<T[]> {
        const items = await this.get<T>(key);
        const newItems = items.map(item => item.id === id ? { ...item, ...updates } : item);
        await this.save(key, newItems);
        return newItems;
    }

    static async delete<T extends { id: string }>(key: string, id: string): Promise<T[]> {
        const items = await this.get<T>(key);
        const newItems = items.filter(item => item.id !== id);
        await this.save(key, newItems);
        return newItems;
    }

    static async upsert<T extends { id: string }>(key: string, item: T): Promise<T[]> {
        const items = await this.get<T>(key);
        const index = items.findIndex(i => i.id === item.id);

        let newItems;
        if (index > -1) {
            newItems = [...items];
            newItems[index] = { ...newItems[index], ...item };
        } else {
            newItems = [...items, item];
        }

        await this.save(key, newItems);
        return newItems;
    }

    static async clear(key: string): Promise<void> {
        if (typeof window === 'undefined') return;
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const request = store.delete(key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`[ClientStorage] Error clearing key "${key}":`, error);
        }
    }

    /**
     * Save with staged quota-exceeded recovery.
     * If the save fails due to quota, progressively clears other keys to free space.
     * @param key - The key to save data under
     * @param data - The data to save
     * @param evictionOrder - Keys to clear in order if quota is exceeded (excluding the target key)
     * @returns true if saved successfully, false if all eviction attempts failed
     */
    static async saveWithRetry<T>(key: string, data: T[], evictionOrder: string[]): Promise<boolean> {
        // Attempt 1: Try saving directly
        try {
            await this.save(key, data);
            return true;
        } catch (e) {
            console.warn(`[ClientStorage] Save failed for "${key}", starting eviction...`);
        }

        // Staged eviction: clear keys one by one and retry after each
        for (const evictKey of evictionOrder) {
            try {
                console.warn(`[ClientStorage] Evicting "${evictKey}" to free space...`);
                await this.clear(evictKey);
                await this.save(key, data);
                console.log(`[ClientStorage] ✅ Saved "${key}" after evicting "${evictKey}"`);
                return true;
            } catch (e) {
                console.warn(`[ClientStorage] Still failed after evicting "${evictKey}"`);
            }
        }

        console.error(`[ClientStorage] ❌ Cannot save "${key}" — item may exceed total IndexedDB capacity.`);
        return false;
    }
}
