import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: user, error } = await supabase
            .from("users")
            .select("subscription_status, subscription_plan, current_period_end, subscription_id, project_import_count")
            .eq("id", session.user.id)
            .maybeSingle();

        if (error) {
            console.error("Error fetching subscription status:", error);
            return NextResponse.json({ error: "Database Error" }, { status: 500 });
        }

        if (!user) {
            return NextResponse.json({
                subscription_status: null,
                subscription_plan: null,
                current_period_end: null,
                subscription_id: null,
                project_import_count: 0
            });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("Internal Server Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
