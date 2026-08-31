"use client";

import React, { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { useSession, signIn, signOut } from "next-auth/react";
import { isSubscriptionActive } from "@/lib/subscription";



// Re-export hook for backward compatibility with existing components
// that expect useAuth()
export const useAuth = () => {
    const { data: session, status } = useSession();

    // Check for "active" status and "Pro" plan (or others if you have more)
    // Adjust based on your exact subscription schema
    const isPro = isSubscriptionActive(session?.user?.subscription_status, session?.user?.current_period_end);

    return {
        user: session?.user || null,
        isAuthenticated: status === "authenticated",
        isLoading: status === "loading",
        isPro,
        login: (provider: string) => signIn(provider),
        logout: () => signOut(),
    };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <SessionProvider>
            {children}
        </SessionProvider>
    );
};
