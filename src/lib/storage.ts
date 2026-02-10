import fs from 'fs/promises';
import path from 'path';
import { User } from 'next-auth';

const DATA_DIR = path.join(process.cwd(), '.data');

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

export function isProUser(user: User | undefined): boolean {
    if (!user) return false;

    // Check for active status and valid period
    const isActive = user.subscription_status === 'active';
    const isValidPeriod = user.current_period_end
        ? new Date(user.current_period_end) > new Date()
        : false;

    return isActive && isValidPeriod;
}

// Generic Local Storage Helpers
export const LocalStorage = {
    async get<T>(filename: string): Promise<T[]> {
        await ensureDataDir();
        const filePath = path.join(DATA_DIR, filename);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data) as T[];
        } catch (error) {
            // If file doesn't exist or error, return empty array
            return [];
        }
    },

    async save<T>(filename: string, data: T[]): Promise<void> {
        await ensureDataDir();
        const filePath = path.join(DATA_DIR, filename);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    },

    // Specific helpers for our data types could go here if needed, 
    // but generic get/save is flexible enough for now.

    async findById<T extends { id: string }>(filename: string, id: string): Promise<T | undefined> {
        const items = await this.get<T>(filename);
        return items.find(item => item.id === id);
    },

    async create<T extends { id: string }>(filename: string, item: T): Promise<T> {
        const items = await this.get<T>(filename);
        // Remove existing if any (upsert behavior) or just push? 
        // Let's assume create implies new. But for safety check unique ID? 
        // For simplicity, just append.
        items.push(item);
        await this.save(filename, items);
        return item;
    },

    async update<T extends { id: string }>(filename: string, id: string, updates: Partial<T>): Promise<T | null> {
        const items = await this.get<T>(filename);
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;

        items[index] = { ...items[index], ...updates };
        await this.save(filename, items);
        return items[index];
    },

    async delete<T extends { id: string }>(filename: string, id: string): Promise<boolean> {
        const items = await this.get<T>(filename);
        const initialLength = items.length;
        const filtered = items.filter(item => item.id !== id);

        if (filtered.length === initialLength) return false;

        await this.save(filename, filtered);
        return true;
    },

    // Upsert for history
    async upsert<T extends { id?: string, user_id?: string, name?: string }>(
        filename: string,
        item: T,
        matchFn: (existing: T) => boolean
    ): Promise<void> {
        const items = await this.get<T>(filename);
        const index = items.findIndex(matchFn);

        if (index !== -1) {
            // Preserve existing ID, only update other fields
            // The incoming 'item' often has a freshly generated ID which we should ignore on update
            const { id, ...updates } = item as any;
            items[index] = { ...items[index], ...updates };
        } else {
            items.push(item);
        }
        await this.save(filename, items);
    }
};
