import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
// import { SupabaseAdapter } from "@auth/supabase-adapter"
import { CustomSupabaseAdapter } from "./lib/supabase-adapter"
import { authConfig } from "./auth.config"

export const { auth, handlers, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Google({
            allowDangerousEmailAccountLinking: true,
        }),
        GitHub({
            allowDangerousEmailAccountLinking: true,
        })
    ],
    adapter: CustomSupabaseAdapter({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    }),
    callbacks: {
        async jwt({ token, user, trigger }) {
            if (user) {
                token.id = user.id;
                token.subscription_status = user.subscription_status;
                token.subscription_plan = user.subscription_plan;
                token.subscription_id = user.subscription_id;
                token.customer_code = user.customer_code;
                token.current_period_end = user.current_period_end;
                token.project_import_count = user.project_import_count || 0;
            }

            if (trigger === "update" && token.id) {
                // Fetch latest user data from Supabase
                try {
                    const { createClient } = await import("@supabase/supabase-js");
                    const supabase = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.SUPABASE_SERVICE_ROLE_KEY!
                    );

                    const { data: refreshedUser } = await supabase
                        .from("users")
                        .select("*")
                        .eq("id", token.id)
                        .single();

                    if (refreshedUser) {
                        token.subscription_status = refreshedUser.subscription_status;
                        token.subscription_plan = refreshedUser.subscription_plan;
                        token.subscription_id = refreshedUser.subscription_id;
                        token.customer_code = refreshedUser.customer_code;
                        token.current_period_end = refreshedUser.current_period_end;
                        token.project_import_count = refreshedUser.project_import_count || 0;
                    }
                } catch (error) {
                    console.error("Error refreshing session:", error);
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.subscription_status = token.subscription_status as string;
                session.user.subscription_plan = token.subscription_plan as string;
                session.user.subscription_id = token.subscription_id as string;
                session.user.customer_code = token.customer_code as string;
                session.user.current_period_end = token.current_period_end as string;
                session.user.project_import_count = (token.project_import_count as number) || 0;
            }
            return session;
        }
    }
});
