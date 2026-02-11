'use server';

import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export async function createIssue(formData: FormData) {
    const session = await auth();

    if (!session || !session.user) {
        return { error: "You must be logged in to report an issue." };
    }

    const subject = formData.get("subject") as string;
    const description = formData.get("description") as string;

    if (!subject || !description) {
        return { error: "Subject and description are required." };
    }

    const { error } = await supabase.from("issues").insert({
        user_id: session.user.id,
        subject,
        description,
        status: 'open',
    });

    if (error) {
        console.error("Error creating issue:", error);
        return { error: "Failed to submit issue. Please try again." };
    }

    revalidatePath("/report-issue");
    return { success: true };
}
