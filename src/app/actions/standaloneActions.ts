'use server';

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { auth } from '@/auth';
import { verifyProStatus } from '@/lib/verifyProStatus';
import { PRO_STANDALONE_LIMIT } from '@/lib/constants';




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
        .from('standalone_collections' as any)
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching standalone collections:', error);
        return [];
    }

    return (data || []).map((item: any) => {
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

        return {
            ...content,
            id: item.id, // Ensure DB ID is used
            // Ensure name is synced if changed outside content
            name: item.name
        };
    });
}

export async function createStandaloneCollection(collection: any) {
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
        .from('standalone_collections' as any)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

    if (count !== null && count >= PRO_STANDALONE_LIMIT) {
        return { error: `Standalone collection limit reached (${PRO_STANDALONE_LIMIT}). Please delete old items.` };
    }

    // SUPABASE STORAGE (PRO)
    const { data, error } = await supabase
        .from('standalone_collections' as any)
        .insert({
            user_id: session.user.id,
            name: name,
            content: { id, name, ...content },
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

export async function updateStandaloneCollection(id: string, updates: any) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // Fetch existing validation?
    // For now direct update

    // We need to fetch current content to merge updates if we are just patching?
    // Or we simply blindly update content.
    // The ProjectContext passes partial updates. We probably need to be careful.
    // Let's first fetch the existing item to merge content properly server-side
    // OR, ProjectContext should pass the FULL object.

    // Simplest strategy: Caller passes FULL content or we handle merge.
    // Current ProjectContext logic: setCollections(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    // So the client has the full state. It can pass the full new state.
    // But updateCollection in Context takes Partial.

    // Let's implement a SMART update.

    // HYBRID STORAGE CHECK
    const isPro = await verifyProStatus(session.user.id);
    if (!isPro) {
        return { error: 'Upgrade to Pro' };
    }

    // SUPABASE STORAGE (PRO)
    const { data: existing } = await supabase
        .from('standalone_collections' as any)
        .select('content')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single();

    if (!existing) return { error: 'Collection not found' };

    const record = existing as any; // Cast to avoid TS error on content access
    const newContent = { ...record.content, ...updates };

    const { error } = await supabase
        .from('standalone_collections' as any)
        .update({
            name: newContent.name, // Update top-level name too
            content: newContent,
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
        .from('standalone_collections' as any)
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
        .from('standalone_collections' as any)
        .delete()
        .eq('user_id', session.user.id);

    if (error) {
        console.error('Error deleting all standalone collections:', error);
        return { error: error.message };
    }

    return { success: true };
}
