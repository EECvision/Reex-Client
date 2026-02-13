"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export type ThemeType = 'light' | 'dark' | 'system';
export type ViewPreferenceType = 'json' | 'raw' | 'pretty';

interface SettingsContextType {
    theme: ThemeType;
    viewPreference: ViewPreferenceType;
    setTheme: (theme: ThemeType) => void;
    toggleTheme: () => void;
    setViewPreference: (pref: ViewPreferenceType) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const THEME_KEY = 'reex_theme';
const VIEW_PREF_KEY = 'reex_view_preference';

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<ThemeType>('dark');
    const [viewPreference, setViewPreferenceState] = useState<ViewPreferenceType>('json');
    const [mounted, setMounted] = useState(false);

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem(THEME_KEY) as ThemeType;
        const savedViewPref = localStorage.getItem(VIEW_PREF_KEY) as ViewPreferenceType;

        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
            setTheme(savedTheme);
        }
        if (savedViewPref && ['json', 'raw', 'pretty'].includes(savedViewPref)) {
            setViewPreferenceState(savedViewPref);
        }
        setMounted(true);
    }, []);

    // Apply theme to document
    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;
        localStorage.setItem(THEME_KEY, theme);

        const applyTheme = (t: ThemeType) => {
            if (t === 'system') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                root.setAttribute('data-theme', systemTheme);
            } else {
                root.setAttribute('data-theme', t);
            }
        };

        applyTheme(theme);

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme('system');
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme, mounted]);

    // Persist view preference
    useEffect(() => {
        if (mounted) {
            localStorage.setItem(VIEW_PREF_KEY, viewPreference);
        }
    }, [viewPreference, mounted]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            if (prev === 'system') return 'light';
            return prev === 'light' ? 'dark' : 'light';
        });
    }, []);

    const setViewPreference = useCallback((pref: ViewPreferenceType) => {
        setViewPreferenceState(pref);
    }, []);

    return (
        <SettingsContext.Provider value={{ theme, viewPreference, setTheme, toggleTheme, setViewPreference }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
