import { createSupabaseClient } from '@/utils/supabase/client';
import { Database } from '@/types/supabase';
import { Collection, RequestItem } from '@/components/TestApi/CollectionSidebar';

const supabase = createSupabaseClient();

export const collectionService = {
    async getCollections(): Promise<Collection[]> {
        const { data: collections, error } = await supabase
            .from('api_collections')
            .select(`
                *,
                requests:api_requests(*)
            `)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching collections:', error);
            throw error;
        }

        // Transform to frontend model
        return (collections || []).map((col: any) => ({
            id: col.id,
            name: col.name,
            auth: col.auth,
            // Sort requests by specific order or creation time
            requests: (col.requests || [])
                .sort((a: any, b: any) => (a.sort_order - b.sort_order) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((req: any) => ({
                    id: req.id,
                    name: req.name,
                    method: req.method,
                    url: req.url,
                    config: {
                        headers: req.headers,
                        params: req.params,
                        body: req.body,
                        auth: req.auth
                    }
                })),
            isOpen: false // Default UI state
        }));
    },

    async createCollection(name: string, userId: string): Promise<Collection> {
        const { data, error } = await supabase
            .from('api_collections')
            .insert({
                name,
                user_id: userId,
                auth: {}
            } as any)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            requests: [],
            isOpen: true
        };
    },

    async deleteCollection(id: string): Promise<void> {
        const { error } = await supabase
            .from('api_collections')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async createRequest(collectionId: string, request: Partial<RequestItem>): Promise<RequestItem> {
        const { data, error } = await supabase
            .from('api_requests')
            .insert({
                collection_id: collectionId,
                name: request.name || 'New Request',
                method: request.method || 'GET',
                url: request.url || '',
                headers: request.config?.headers || [],
                params: request.config?.params || [],
                body: request.config?.body || null,
                auth: request.config?.auth || null
            } as any)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            method: data.method,
            url: data.url,
            config: {
                headers: data.headers,
                params: data.params,
                body: data.body,
                auth: data.auth
            }
        };
    },

    async updateRequest(id: string, updates: Partial<RequestItem>): Promise<void> {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.method) dbUpdates.method = updates.method;
        if (updates.url !== undefined) dbUpdates.url = updates.url;

        if (updates.config) {
            if (updates.config.headers) dbUpdates.headers = updates.config.headers;
            if (updates.config.params) dbUpdates.params = updates.config.params;
            if (updates.config.body) dbUpdates.body = updates.config.body;
            if (updates.config.auth) dbUpdates.auth = updates.config.auth;
        }

        const { error } = await supabase
            .from('api_requests')
            .update(dbUpdates as any)
            .eq('id', id);

        if (error) throw error;
    },

    async deleteRequest(id: string): Promise<void> {
        const { error } = await supabase
            .from('api_requests')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
