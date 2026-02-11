"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface UIContextType {
    isSidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    toggleSidebar: () => void;
    hasSidebar: boolean;
    setHasSidebar: (has: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [hasSidebar, setHasSidebar] = useState(false);

    const toggleSidebar = useCallback(() => {
        setSidebarOpen(prev => !prev);
    }, []);

    return (
        <UIContext.Provider value={{
            isSidebarOpen,
            setSidebarOpen,
            toggleSidebar,
            hasSidebar,
            setHasSidebar
        }}>
            {children}
        </UIContext.Provider>
    );
}

export function useUI() {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
}
