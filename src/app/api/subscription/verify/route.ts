import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import { addMonths, addYears } from "date-fns";
import { PRICING, PLAN_IDS } from "@/config/pricing";



export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { transaction_id, plan_id } = body;

        if (!transaction_id || !plan_id) {
            return NextResponse.json({ success: false, message: "Missing transaction_id or plan_id" }, { status: 400 });
        }



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
        } catch (axiosError: unknown) {
            const errorMessage = axiosError instanceof Error ? axiosError.message : String(axiosError);
            const axiosErrorData = axiosError && typeof axiosError === 'object' && 'response' in axiosError ? (axiosError as Record<string, Record<string, unknown>>).response?.data : undefined;
                console.error("Flutterwave API error:", axiosErrorData || errorMessage);
                return NextResponse.json({ success: false, message: "Failed to reach Flutterwave API" }, { status: 502 });
            }

        const data = response.data;
        const fwData = data.data;

        if (data.status === "success" && fwData.status === "successful") {

            const fwPlanId = fwData.payment_plan || (fwData.plan ? (typeof fwData.plan === 'object' ? fwData.plan.id : fwData.plan) : null);
            const isYearlyPlan = String(fwPlanId) === String(PLAN_IDS.yearly);
            const isMonthlyPlan = String(fwPlanId) === String(PLAN_IDS.monthly);

            if (!isYearlyPlan && !isMonthlyPlan) {
                return NextResponse.json({ success: false, message: "Invalid subscription plan on transaction" }, { status: 400 });
            }

            const trueBillingCycle = isYearlyPlan ? 'yearly' : 'monthly';
            const expectedAmount = isYearlyPlan ? PRICING.yearly : PRICING.monthly;

            // 2. SECURITY CHECK: Verify Amount & Currency
            if (fwData.amount < expectedAmount || fwData.currency !== "USD") {
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
            const baseDate = session.user.current_period_end && new Date(session.user.current_period_end as string) > new Date()
                ? new Date(session.user.current_period_end as string)
                : new Date();

            const currentPeriodEnd = trueBillingCycle === 'yearly'
                ? addYears(baseDate, 1)
                : addMonths(baseDate, 1);

            const updatePayload: Record<string, string> = {
                subscription_status: 'active',
                current_period_end: currentPeriodEnd.toISOString(),
                subscription_plan: trueBillingCycle
            };

            // Only update subscription_id if Flutterwave provides the real one here, 
            // otherwise the webhook will update it.
            if (fwData.subscription_id) {
                updatePayload.subscription_id = String(fwData.subscription_id);
            }

            // 5. Update User
            const { error } = await supabase
                .from("users")
                .update(updatePayload)
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
                plan_id: trueBillingCycle
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
