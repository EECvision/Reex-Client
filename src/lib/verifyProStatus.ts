import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { isSubscriptionActive } from "@/lib/subscription";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export async function verifyProStatus(userId: string): Promise<boolean> {
    if (!userId) return false;

    try {
        const { data: user, error } = await supabase
            .from("users" as any)
            .select("subscription_status, current_period_end")
            .eq("id", userId)
            .single();

        if (error || !user) {
            return false;
        }

        const userData = user as any;
        const isActive = isSubscriptionActive(userData.subscription_status, userData.current_period_end);

        return isActive;
    } catch (error) {
        console.error("Error verifying pro status:", error);
        return false;
    }
}
