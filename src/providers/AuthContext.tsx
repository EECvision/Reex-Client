"use client";

import React, { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { useSession, signIn, signOut } from "next-auth/react";

interface AuthContextType {
    user: any;
    isAuthenticated: boolean;
    login: (provider: string) => void;
    logout: () => void;
    isLoading: boolean;
}

// Re-export hook for backward compatibility with existing components
// that expect useAuth()
export const useAuth = () => {
    const { data: session, status } = useSession();

    return {
        user: session?.user || null,
        isAuthenticated: status === "authenticated",
        isLoading: status === "loading",
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
