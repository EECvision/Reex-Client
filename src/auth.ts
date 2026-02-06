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
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
            }
            return session;
        }
    }
});
