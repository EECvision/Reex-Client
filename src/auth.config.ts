import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: '/', // Intercepted by our Modal, but failsafe to root
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
            const isOnSettings = nextUrl.pathname.startsWith('/settings');
            const isOnSubscription = nextUrl.pathname.startsWith('/subscription');

            if (isOnDashboard || isOnSettings || isOnSubscription) {
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
            }
            return true;
        },
    },
    providers: [], // Configured in auth.ts
    session: {
        strategy: "jwt"
    }
} satisfies NextAuthConfig
