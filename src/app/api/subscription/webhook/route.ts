import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { addMonths, addYears } from "date-fns";
import { PLAN_IDS } from "@/config/pricing";

export async function POST(req: Request) {
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
    const signature = req.headers.get("verif-hash");

    if (!signature || signature !== secretHash) {
        // This request isn't from Flutterwave; discard
        return new NextResponse(null, { status: 401 });
    }

    const payload = await req.json();
    const { event, data } = payload;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        if (event === "charge.completed" && data.status === "successful") {
            // Logic to handle successful recurrent charge
            // We need to find the user by customer email or customer code
            const email = data.customer.email;

            // Check plan ID from flutterwave data to determine the renewal duration
            const planId = data.plan;
            const isYearly = planId ? String(planId) === String(PLAN_IDS.yearly) : false;
            const isMonthly = planId ? String(planId) === String(PLAN_IDS.monthly) : false;

            if (!isYearly && !isMonthly) {
                console.log("Ignoring webhook for unknown plan ID:", planId);
                return new NextResponse(null, { status: 200 }); // Ignore silently to Flutterwave
            }

            const { data: user, error: fetchError } = await supabase
                .from("users")
                .select("id, current_period_end")
                .eq("email", email)
                .maybeSingle();

            if (fetchError || !user) {
                console.error("Error fetching user for webhook:", fetchError || "User not found");
                return new NextResponse("User Not Found", { status: 404 });
            }

            // DATE LOGIC: Use date-fns to add exact duration
            const baseDate = user.current_period_end && new Date(user.current_period_end) > new Date()
                ? new Date(user.current_period_end)
                : new Date();
            const currentPeriodEnd = isYearly ? addYears(baseDate, 1) : addMonths(baseDate, 1);

            const subscriptionId = data.subscription_id ? String(data.subscription_id) : undefined;
            const updatePayload: any = {
                subscription_status: "active",
                current_period_end: currentPeriodEnd.toISOString(),
            };
            
            if (planId) {
                if (isYearly) updatePayload.subscription_plan = "yearly";
                else if (String(planId) === String(PLAN_IDS.monthly)) updatePayload.subscription_plan = "monthly";
                else updatePayload.subscription_plan = String(planId); // Fallback to raw ID for unknown plans
            }
            if (subscriptionId) {
                updatePayload.subscription_id = subscriptionId;
            }

            const { error } = await supabase
                .from("users")
                .update(updatePayload)
                .eq("id", user.id);

            if (error) {
                console.error("Error updating user subscription from webhook:", error);
                return new NextResponse("Database Error", { status: 500 });
            }

            // Record invoice / payment log for recurring charge idempotently
            const txId = String(data.id || data.tx_ref || `wh_${Date.now()}`);
            const { data: existingTx } = await supabase
                .from("payments")
                .select("id")
                .eq("transaction_id", txId)
                .maybeSingle();

            if (!existingTx) {
                await supabase.from("payments").insert({
                    user_id: user.id,
                    transaction_id: txId,
                    amount: data.amount,
                    currency: data.currency || "USD",
                    status: "success",
                    plan_id: isYearly ? "yearly" : (String(planId) === String(PLAN_IDS.monthly) ? "monthly" : String(planId || ""))
                });
            }

        } else if (event === "subscription.cancelled") {
            const email = data.customer.email;
            const { error } = await supabase
                .from("users")
                .update({
                    subscription_status: "canceled",
                })
                .eq("email", email);

            if (error) {
                console.error("Error cancelling user subscription from webhook:", error);
                return new NextResponse("Database Error", { status: 500 });
            }
        }

        return new NextResponse(null, { status: 200 });
    } catch (error) {
        console.error("Webhook processing error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
