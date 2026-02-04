"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Phase 1: Simulated persistence
        const storedUser = localStorage.getItem("reex_user");
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse stored user", e);
                localStorage.removeItem("reex_user");
            }
        }
        setIsLoading(false);
    }, []);

    const login = (email: string) => {
        // Phase 1: Simulate login success immediately
        const mockUser: User = {
            id: "u_" + Date.now(),
            name: email.split("@")[0] || "User",
            email: email,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
        };
        setUser(mockUser);
        localStorage.setItem("reex_user", JSON.stringify(mockUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("reex_user");
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                login,
                logout,
                isLoading
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
