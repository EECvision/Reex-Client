import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: invoices, error } = await supabase
            .from("payments")
            .select("*")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching invoices:", error);
            return new NextResponse("Database Error", { status: 500 });
        }

        return NextResponse.json(invoices);
    } catch (error) {
        console.error("Internal Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
