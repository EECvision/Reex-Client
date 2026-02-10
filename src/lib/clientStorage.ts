export class ClientStorage {
    static get<T>(key: string): T[] {
        if (typeof window === 'undefined') return [];
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : [];
        } catch (error) {
            console.error(`Error reading from localStorage key "${key}":`, error);
            return [];
        }
    }

    static save<T>(key: string, data: T[]): void {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Error writing to localStorage key "${key}":`, error);
        }
    }

    static add<T>(key: string, item: T): T[] {
        const items = this.get<T>(key);
        const newItems = [...items, item];
        this.save(key, newItems);
        return newItems;
    }

    static update<T extends { id: string }>(key: string, id: string, updates: Partial<T>): T[] {
        const items = this.get<T>(key);
        const newItems = items.map(item => item.id === id ? { ...item, ...updates } : item);
        this.save(key, newItems);
        return newItems;
    }

    static delete<T extends { id: string }>(key: string, id: string): T[] {
        const items = this.get<T>(key);
        const newItems = items.filter(item => item.id !== id);
        this.save(key, newItems);
        return newItems;
    }

    // Specialized helper for upserting based on ID
    static upsert<T extends { id: string }>(key: string, item: T): T[] {
        const items = this.get<T>(key);
        const index = items.findIndex(i => i.id === item.id);

        let newItems;
        if (index > -1) {
            newItems = [...items];
            newItems[index] = { ...newItems[index], ...item };
        } else {
            newItems = [...items, item];
        }

        this.save(key, newItems);
        return newItems;
    }
}
