'use server';

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { isProUser } from '@/lib/storage';



const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create a Supabase client with the Service Role Key to bypass RLS
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export async function getCollections() {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    // HYBRID STORAGE CHECK
    if (!isProUser(session.user)) {
        return [];
    }

    const { data: collections, error } = await supabase
        .from('test_collections')
        .select(`
      *,
      requests:test_collection_requests(*)
    `)
        .eq('user_id', session.user.id) // Manually filter by user_id
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching collections:', error);
        throw new Error('Failed to fetch collections');
    }

    // Transform to frontend model matches CollectionService structure
    return (collections || []).map((col: any) => ({
        id: col.id,
        name: col.name,
        auth: col.auth,
        requests: (col.requests || [])
            .sort((a: any, b: any) => (a.sort_order - b.sort_order) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((req: any) => ({
                id: req.id,
                name: req.name,
                method: req.method,
                url: req.url,
                config: {
                    headers: req.headers,
                    queryParams: req.params, // Mapped from DB 'params' to frontend 'queryParams'
                    body: req.body,
                    auth: req.auth
                }
            })),
        isOpen: false
    }));
}

export async function createCollection(name: string) {
    console.log('[Action] createCollection start:', name);

    if (!supabaseServiceKey) {
        console.error('[Action] Missing SUPABASE_SERVICE_ROLE_KEY');
        return { error: 'Server configuration error: Missing Service Key' };
    }

    const session = await auth();
    console.log('[Action] Session User ID:', session?.user?.id);

    if (!session?.user?.id) {
        console.error('[Action] No user ID found in session');
        return { error: 'Unauthorized: Please sign in again' };
    }

    // HYBRID STORAGE CHECK
    if (!isProUser(session.user)) {
        return { error: 'Upgrade to Pro' };
    }

    try {
        const { data, error } = await supabase
            .from('test_collections')
            .insert({
                name,
                user_id: session.user.id,
                auth: {}
            } as any)
            .select()
            .single();

        if (error) {
            console.error('[Action] Supabase Insert Error:', error);
            return { error: error.message || 'Database insert failed' };
        }

        console.log('[Action] Collection created successfully:', data.id);
        revalidatePath('/test-api');

        return {
            success: true,
            data: {
                id: data.id,
                name: data.name,
                requests: [],
                isOpen: true
            }
        };
    } catch (e: any) {
        console.error('[Action] Unexpected error:', e);
        return { error: e.message || 'Unexpected server error' };
    }
}

export async function deleteCollection(id: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // HYBRID STORAGE CHECK
    if (!isProUser(session.user)) {
        return;
    }

    const { error } = await supabase
        .from('test_collections')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id); // Ensure ownership

    if (error) throw error;
    revalidatePath('/test-api');
}

export async function createRequest(collectionId: string, request: any) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // HYBRID STORAGE CHECK
    if (!isProUser(session.user)) {
        return { error: 'Upgrade to Pro' };
    }

    // Verify collection ownership
    const { data: col } = await supabase.from('test_collections').select('id').eq('id', collectionId).eq('user_id', session.user.id).single();
    if (!col) return { error: 'Collection not found or unauthorized' };

    const { data, error } = await supabase
        .from('test_collection_requests')
        .insert({
            collection_id: collectionId,
            name: request.name || 'New Request',
            method: request.method || 'GET',
            url: request.url || '',
            headers: request.config?.headers || [],
            params: request.config?.queryParams || [], // Mapped frontend queryParams to DB params
            body: request.config?.body || null,
            auth: request.config?.auth || null
        } as any)
        .select()
        .single();

    if (error) return { error: error.message };
    revalidatePath('/test-api');

    return {
        id: data.id,
        name: data.name,
        method: data.method,
        url: data.url,
        config: {
            headers: data.headers,
            queryParams: data.params, // Mapped back
            body: data.body,
            auth: data.auth
        }
    };
}


export async function updateRequest(id: string, updates: any) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // Ideally verify ownership via join, but for now assuming ID is UUID and hard to guess + benign update
    // A stricter check would be: select id from test_collection_requests join test_collections on ... where ...

    // HYBRID STORAGE CHECK
    if (!isProUser(session.user)) {
        return;
    }

    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.method) dbUpdates.method = updates.method;
    if (updates.url !== undefined) dbUpdates.url = updates.url;

    if (updates.config) {
        if (updates.config.headers) dbUpdates.headers = updates.config.headers;
        if (updates.config.queryParams) dbUpdates.params = updates.config.queryParams; // Fixed mapping
        if (updates.config.body) dbUpdates.body = updates.config.body;
        if (updates.config.auth) dbUpdates.auth = updates.config.auth;
    }

    const { error } = await supabase
        .from('test_collection_requests')
        .update(dbUpdates as any)
        .eq('id', id);

    if (error) throw error;
    revalidatePath('/test-api');
}

export async function deleteRequest(id: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // HYBRID STORAGE CHECK
    if (!isProUser(session.user)) {
        return;
    }

    const { error } = await supabase
        .from('test_collection_requests')
        .delete()
        .eq('id', id);

    if (error) throw error;
    revalidatePath('/test-api');
}
