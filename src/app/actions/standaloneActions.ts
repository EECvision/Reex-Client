'use server';

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { auth } from '@/auth';
import { verifyProStatus } from '@/lib/verifyProStatus';
import { PRO_STANDALONE_LIMIT } from '@/lib/constants';
import { StandaloneCollection } from '@/types';




const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export async function getStandaloneCollections() {
    const session = await auth();
    if (!session?.user?.id) return [];

    // HYBRID STORAGE CHECK
    const isPro = await verifyProStatus(session.user.id);
    if (!isPro) {
        return [];
    }

    // SUPABASE STORAGE (PRO)
    const { data, error } = await supabase
        .from('standalone_collections')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching standalone collections:', error);
        return [];
    }

    return (data || []).map((item) => {
        let content = item.content;
        // Robustness: Handle double-stringified or string-returned JSON
        if (typeof content === 'string') {
            try {
                content = JSON.parse(content);
            } catch (e) {
                console.error('Failed to parse collection content', e);
                content = {};
            }
        }

        const contentRecord = (content || {}) as Record<string, unknown>;

        return {
            ...contentRecord,
            id: item.id, // Ensure DB ID is used
            // Ensure name is synced if changed outside content
            name: item.name
        };
    });
}

export async function createStandaloneCollection(
    collection: StandaloneCollection | (Record<string, unknown> & { id?: string; name: string })
) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // Extract core fields, store rest in content
    const { id, name, ...content } = collection;

    // Use specific ID if provided (e.g. from generated UUID), otherwise let DB gen
    // But for sync consistency, we usually valid UUID from client

    // HYBRID STORAGE CHECK
    const isPro = await verifyProStatus(session.user.id);
    if (!isPro) {
        return { error: 'Upgrade to Pro' };
    }

    // LIMIT CHECK: Max 20 standalone collections
    const { count } = await supabase
        .from('standalone_collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

    if (count !== null && count >= PRO_STANDALONE_LIMIT) {
        return { error: `Standalone collection limit reached (${PRO_STANDALONE_LIMIT}). Please delete old items.` };
    }

    // SUPABASE STORAGE (PRO)
    const { data, error } = await supabase
        .from('standalone_collections')
        .insert({
            user_id: session.user.id,
            name: name,
            content: { id, name, ...content } as unknown as Database['public']['Tables']['standalone_collections']['Insert']['content'],
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating standalone collection:', error);
        return { error: error.message };
    }

    return { success: true, data };
}

export async function updateStandaloneCollection(
    id: string,
    updates: Partial<StandaloneCollection> | Record<string, unknown>
) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // HYBRID STORAGE CHECK
    const isPro = await verifyProStatus(session.user.id);
    if (!isPro) {
        return { error: 'Upgrade to Pro' };
    }

    // SUPABASE STORAGE (PRO)
    const { data: existing } = await supabase
        .from('standalone_collections')
        .select('content')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single();

    if (!existing) return { error: 'Collection not found' };

    const recordContent = (existing.content as Record<string, unknown>) || {};
    const newContent: Record<string, unknown> = { ...recordContent, ...updates };

    const { error } = await supabase
        .from('standalone_collections')
        .update({
            name: typeof newContent.name === 'string' ? newContent.name : undefined,
            content: newContent as unknown as Database['public']['Tables']['standalone_collections']['Update']['content'],
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', session.user.id);

    if (error) {
        console.error('Error updating standalone collection:', error);
        return { error: error.message };
    }

    return { success: true };
}

export async function deleteStandaloneCollection(id: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // HYBRID STORAGE CHECK
    const isPro = await verifyProStatus(session.user.id);
    if (!isPro) {
        return { success: true };
    }

    const { error } = await supabase
        .from('standalone_collections')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);

    if (error) {
        console.error('Error deleting standalone collection:', error);
        return { error: error.message };
    }

    return { success: true };
}

export async function deleteAllStandaloneCollections() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // HYBRID STORAGE CHECK
    const isPro = await verifyProStatus(session.user.id);
    if (!isPro) {
        return { success: true };
    }

    const { error } = await supabase
        .from('standalone_collections')
        .delete()
        .eq('user_id', session.user.id);

    if (error) {
        console.error('Error deleting all standalone collections:', error);
        return { error: error.message };
    }

    return { success: true };
}
