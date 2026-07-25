import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Fetch user's subscription ID
        const { data: user, error: fetchError } = await supabase
            .from("users")
            .select("subscription_id")
            .eq("id", session.user.id)
            .single();

        if (fetchError || !user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        if (!user.subscription_id) {
            return NextResponse.json({ 
                success: false, 
                message: "No active subscription ID found. Please contact support to cancel." 
            }, { status: 400 });
        }

        const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
        if (!FLUTTERWAVE_SECRET_KEY) {
            return NextResponse.json({ success: false, message: "Server Configuration Error" }, { status: 500 });
        }

        // Cancel subscription on Flutterwave
        try {
            await axios.put(
                `https://api.flutterwave.com/v3/subscriptions/${user.subscription_id}/cancel`,
                {},
                {
                    headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}` },
                }
            );
        } catch (axiosError: any) {
            console.error("Flutterwave API error on cancel:", axiosError?.response?.data || axiosError.message);
            // If it returns a 404, it might already be cancelled or invalid. We'll proceed to cancel locally 
            // to ensure the user's DB state aligns with their intent to cancel.
        }

        // Update database to mark as canceled
        const { error } = await supabase
            .from("users")
            .update({
                subscription_status: "canceled",
            })
            .eq("id", session.user.id);

        if (error) {
            console.error("Error updating user subscription status to canceled:", error);
            return NextResponse.json({ success: false, message: "Database Error" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Subscription cancelled successfully" });
    } catch (error) {
        console.error("Subscription cancellation error:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
