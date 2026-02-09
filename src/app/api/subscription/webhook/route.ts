import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { addMonths } from "date-fns";

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
            // DATE LOGIC: Use date-fns to add exactly 1 month
            const currentPeriodEnd = addMonths(new Date(), 1);

            const { error } = await supabase
                .from("users")
                .update({
                    subscription_status: "active",
                    current_period_end: currentPeriodEnd.toISOString(),
                })
                .eq("email", email);

            if (error) {
                console.error("Error updating user subscription from webhook:", error);
                return new NextResponse("Database Error", { status: 500 });
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
