
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { FREE_PROJECT_IMPORT_LIMIT } from "@/lib/constants";

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const isPro = session.user.subscription_status === 'active'; // Minimal check, hook does more

    // Pro users are never blocked
    if (isPro) {
        return NextResponse.json({ success: true, count: 0 });
    }

    // Initialize Supabase admin client to bypass RLS if needed, or just use service role
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch current count directly from DB
    const { data: user, error: fetchError } = await supabase
        .from("users")
        .select("project_import_count")
        .eq("id", userId)
        .single();

    if (fetchError) {
        console.error("Error fetching user count:", fetchError);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const currentCount = user?.project_import_count || 0;

    // 2. Check limit logic
    // We check strictly >= limit because the intention is to allow UP TO 'limit'
    // If limit is 3, valid counts are 0, 1, 2. Import #3 makes count 3. 
    // Before import #4, count is 3, so we block.
    if (currentCount >= FREE_PROJECT_IMPORT_LIMIT) {
        return NextResponse.json({
            error: "Limit Exceeded",
            limit: FREE_PROJECT_IMPORT_LIMIT,
            currentCount
        }, { status: 403 });
    }

    // 3. Increment count
    const { error: updateError } = await supabase.rpc('increment_project_import_count', { user_id: userId });

    // Fallback if RPC doesn't exist (less safe slightly, concurrency unlikely to be issue for single user)
    if (updateError) {
        // Try direct update
        const { error: directError } = await supabase
            .from("users")
            .update({ project_import_count: currentCount + 1 })
            .eq("id", userId);

        if (directError) {
            console.error("Error incrementing user count:", directError);
            return NextResponse.json({ error: "Failed to update count" }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true, count: currentCount + 1 });
}
