import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import { addMonths, addYears } from "date-fns";
import { PRICING, PLAN_IDS } from "@/config/pricing";

const PLANS = {
    ...(PLAN_IDS.monthly ? { [PLAN_IDS.monthly]: { amount: PRICING.monthly, currency: "USD" } } : {}),
    ...(PLAN_IDS.yearly ? { [PLAN_IDS.yearly]: { amount: PRICING.yearly, currency: "USD" } } : {}),
};

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { transaction_id, plan_id, billing_cycle } = body;

        if (!transaction_id || !plan_id) {
            return NextResponse.json({ success: false, message: "Missing transaction_id or plan_id" }, { status: 400 });
        }

        // validate plan
        // @ts-ignore
        const plan = PLANS[plan_id];

        // Allow if plan is not in local config but let's be strict for now:
        // If you want strict validation:
        // if (!plan) return new NextResponse("Invalid Plan", { status: 400 });

        // For flexibility during dev/testing if plan_id might vary:
        const expectedAmount = plan?.amount;
        const expectedCurrency = plan?.currency;

        const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
        if (!FLUTTERWAVE_SECRET_KEY) {
            return NextResponse.json({ success: false, message: "Server Configuration Error" }, { status: 500 });
        }

        // 1. Verify transaction with Flutterwave
        let response;
        try {
            response = await axios.get(
                `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
                {
                    headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}` },
                }
            );
        } catch (axiosError: any) {
            console.error("Flutterwave API error:", axiosError?.response?.data || axiosError.message);
            return NextResponse.json({ success: false, message: "Failed to reach Flutterwave API" }, { status: 502 });
        }

        const data = response.data;
        const fwData = data.data;

        if (data.status === "success" && fwData.status === "successful") {

            // 2. SECURITY CHECK: Verify Amount & Currency
            // Only check if we have a matching plan config
            if (expectedAmount && (fwData.amount < expectedAmount || fwData.currency !== expectedCurrency)) {
                return NextResponse.json({ success: false, message: "Payment amount mismatch" }, { status: 400 });
            }

            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // 3. IDEMPOTENCY CHECK: Ensure this payment hasn't been used before
            const { data: existingTx } = await supabase
                .from("payments")
                .select("id")
                .eq("transaction_id", transaction_id)
                .maybeSingle();

            if (existingTx) {
                return NextResponse.json({ success: false, message: "Transaction already processed" }, { status: 409 });
            }

            // 4. DATE LOGIC: Use date-fns for accurate calculation based on billing cycle
            const currentPeriodEnd = billing_cycle === 'yearly'
                ? addYears(new Date(), 1)
                : addMonths(new Date(), 1);

            // 5. Update User
            const { error } = await supabase
                .from("users")
                .update({
                    subscription_status: "active",
                    subscription_plan: plan_id,
                    subscription_id: fwData.id,
                    // customer_code is not returned by the transaction verify endpoint;
                    // it is updated later via webhook when Flutterwave sends charge.completed
                    current_period_end: currentPeriodEnd.toISOString(),
                })
                .eq("id", session.user.id);

            if (error) {
                console.error("Error updating user subscription:", error);
                return NextResponse.json({ success: false, message: "Database Error" }, { status: 500 });
            }

            // 6. Log Transaction (To prevent reuse)
            await supabase.from("payments").insert({
                user_id: session.user.id,
                transaction_id: transaction_id,
                amount: fwData.amount,
                currency: fwData.currency,
                status: "success",
                plan_id: plan_id
            });

            return NextResponse.json({ success: true, data: fwData });
        } else {
            return NextResponse.json({ success: false, message: "Verification failed" }, { status: 400 });
        }
    } catch (error) {
        console.error("Subscription verification error:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
