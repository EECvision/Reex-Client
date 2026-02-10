'use server';

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { auth } from '@/auth';
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

async function ensureUserExists(user: any) {
    if (!user || !user.id) return;
    try {
        const { data } = await supabase.from('users' as any).select('id').eq('id', user.id).single();
        if (!data) {
            console.log('[Action] Self-healing: Syncing user to DB', user.id);
            await supabase.from('users' as any).upsert({
                id: user.id,
                email: user.email,
                name: user.name || 'User',
                image: user.image
            } as any, { onConflict: 'id' });
        }
    } catch (e) {
        console.warn('[Action] Sync attempt failed:', e);
    }
}

export async function addToHistory(name: string, content: any) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    await ensureUserExists(session.user);



    // HYBRID STORAGE CHECK
    if (!isProUser(session.user)) {
        return { success: true };
    }

    // UPSERT: Rely on Unique Constraint (user_id, name)
    const { error } = await supabase
        .from('recent_collections')
        .upsert({
            user_id: session.user.id,
            name,
            content,
            updated_at: new Date().toISOString()
        } as any, { onConflict: 'user_id, name' });

    if (error) {
        console.error('Error adding to history:', error);
        return { error: error.message };
    }

    return { success: true };
}

export async function getHistory() {
    const session = await auth();
    if (!session?.user?.id) return [];

    // HYBRID STORAGE CHECK
    if (!isProUser(session.user)) {
        return [];
    }

    const { data, error } = await supabase
        .from('recent_collections')
        .select('id, name, updated_at, content')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

    // If error, return empty array gracefully
    if (error) {
        console.error('Error fetching history:', error);
        return [];
    }

    return data || [];
}

export async function deleteFromHistory(id: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // HYBRID STORAGE CHECK
    if (!isProUser(session.user)) {
        return { success: true };
    }

    const { error } = await supabase
        .from('recent_collections')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);

    if (error) {
        console.error('Error deleting history:', error);
        return { error: error.message };
    }

    return { success: true };
}
