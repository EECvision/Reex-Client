import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

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
        const isActive = userData.subscription_status === 'active';
        const isValidPeriod = userData.current_period_end
            ? new Date(userData.current_period_end) > new Date()
            : false;

        return isActive && isValidPeriod;
    } catch (error) {
        console.error("Error verifying pro status:", error);
        return false;
    }
}
