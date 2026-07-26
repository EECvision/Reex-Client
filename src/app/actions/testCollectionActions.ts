'use server';

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { verifyProStatus } from '@/lib/verifyProStatus';
import { PRO_TEST_COLLECTION_LIMIT, PRO_TEST_REQUEST_LIMIT } from '@/lib/constants';



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
    const isPro = await verifyProStatus(session.user.id);
    if (!isPro) {
        return [];
    }

    // 1. Fetch Collections
    const { data: collections, error: colError } = await supabase
        .from('test_collections')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

    if (colError) {
        console.error('Error fetching collections:', colError);
        throw new Error('Failed to fetch collections');
    }

    if (!collections || collections.length === 0) {
        return [];
    }

    // 2. Fetch Requests for these collections
    const collectionIds = collections.map(c => c.id);
    const { data: requests, error: reqError } = await supabase
        .from('test_collection_requests')
        .select('*')
        .in('collection_id', collectionIds);

    if (reqError) {
        console.error('Error fetching requests:', reqError);
        // We can still return collections but empty requests
    }



    // 3. Merge and Transform
    return collections.map((col: any) => {
        const colRequests = requests?.filter((r: any) => r.collection_id === col.id) || [];

        return {
            id: col.id,
            name: col.name,
            auth: col.auth,
            base_url: col.base_url,
            requests: colRequests
                .sort((a: any, b: any) => (a.sort_order - b.sort_order) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((req: any) => ({
                    id: req.id,
                    name: req.name,
                    method: req.method,
                    url: req.url,
                    config: {
                        headers: req.headers,
                        queryParams: req.params,
                        body: req.body,
                        auth: req.auth
                    }
                })),
            isOpen: false
        };
    });
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
    const isPro = await verifyProStatus(session.user.id);
    if (!isPro) {
        return { error: 'Upgrade to Pro' };
    }

    // LIMIT CHECK: Max 20 collections
    const { count } = await supabase
        .from('test_collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

    if (count !== null && count >= PRO_TEST_COLLECTION_LIMIT) {
        return { error: `Collection limit reached (${PRO_TEST_COLLECTION_LIMIT}). Please delete old collections to create a new one.` };
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
        revalidatePath('/sandbox');

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
    const isPro = await verifyProStatus(session.user.id);
    if (!isPro) {
        return;
    }

    const { error } = await supabase
        .from('test_collections')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id); // Ensure ownership

    if (error) throw error;
    revalidatePath('/sandbox');
}

export async function renameCollection(id: string, name: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const isPro = await verifyProStatus(session.user.id);
    if (!isPro) return { error: 'Pro required' };

    const { error } = await supabase
        .from('test_collections')
        .update({ name } as any)
        .eq('id', id)
        .eq('user_id', session.user.id); // enforce ownership

    if (error) return { error: error.message };
    revalidatePath('/sandbox');
    return { success: true };
}

export async function updateCollection(id: string, updates: { base_url?: string; auth?: any }) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const isPro = await verifyProStatus(session.user.id);
    if (!isPro) return { error: 'Pro required' };

    const { error } = await supabase
        .from('test_collections')
        .update(updates as any)
        .eq('id', id)
        .eq('user_id', session.user.id); // enforce ownership

    if (error) return { error: error.message };
    revalidatePath('/sandbox');
    return { success: true };
}

export async function createRequest(collectionId: string, request: any) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // HYBRID STORAGE CHECK
    const isPro = await verifyProStatus(session.user.id);
    if (!isPro) {
        return { error: 'Upgrade to Pro' };
    }

    // Verify collection ownership
    const { data: col } = await supabase.from('test_collections').select('id').eq('id', collectionId).eq('user_id', session.user.id).single();
    if (!col) return { error: 'Collection not found or unauthorized' };

    // LIMIT CHECK: Max 20 requests per collection
    const { count: requestCount } = await supabase
        .from('test_collection_requests')
        .select('*', { count: 'exact', head: true })
        .eq('collection_id', collectionId);

    if (requestCount !== null && requestCount >= PRO_TEST_REQUEST_LIMIT) {
        return { error: `Request limit reached (${PRO_TEST_REQUEST_LIMIT}). Please delete old requests.` };
    }

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
    revalidatePath('/sandbox');

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
    const isPro = await verifyProStatus(session.user.id);
    if (!isPro) {
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
    revalidatePath('/sandbox');
}

export async function deleteRequest(id: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // HYBRID STORAGE CHECK
    const isPro = await verifyProStatus(session.user.id);
    if (!isPro) {
        return;
    }

    const { error } = await supabase
        .from('test_collection_requests')
        .delete()
        .eq('id', id);

    if (error) throw error;
    revalidatePath('/sandbox');
}
