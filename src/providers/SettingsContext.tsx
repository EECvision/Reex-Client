"use client";

import React, { createContext, useContext, useEffect, ReactNode, useCallback, useSyncExternalStore } from 'react';

export type ThemeType = 'light' | 'dark' | 'system';
export type ViewPreferenceType = 'json' | 'raw' | 'pretty';

interface SettingsContextType {
    theme: ThemeType;
    viewPreference: ViewPreferenceType;
    setTheme: (theme: ThemeType) => void;
    toggleTheme: () => void;
    setViewPreference: (pref: ViewPreferenceType) => void;
    unwrapResponseData: boolean;
    setUnwrapResponseData: (val: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const THEME_KEY = 'reex_theme';
const VIEW_PREF_KEY = 'reex_view_preference';
const UNWRAP_DATA_KEY = 'reex_unwrap_data';

// Reactive local storage store helper utilizing useSyncExternalStore
const createLocalStorageStore = <T extends string | boolean>(key: string, defaultValue: T, validator?: (val: unknown) => boolean) => {
    const listeners = new Set<() => void>();
    
    return {
        subscribe(callback: () => void) {
            listeners.add(callback);
            return () => listeners.delete(callback);
        },
        getSnapshot() {
            if (typeof window !== "undefined") {
                const val = localStorage.getItem(key);
                if (val !== null) {
                    let parsed: unknown = val;
                    if (typeof defaultValue === "boolean") {
                        parsed = val === "true";
                    }
                    if (!validator || validator(parsed)) {
                        return parsed as T;
                    }
                }
            }
            return defaultValue;
        },
        getServerSnapshot() {
            return defaultValue;
        },
        set(value: T) {
            if (typeof window !== "undefined") {
                localStorage.setItem(key, String(value));
            }
            listeners.forEach((listener) => listener());
        }
    };
};

const themeStore = createLocalStorageStore<ThemeType>(THEME_KEY, 'light', (val) => ['light', 'dark', 'system'].includes(val as string));
const viewPrefStore = createLocalStorageStore<ViewPreferenceType>(VIEW_PREF_KEY, 'json', (val) => ['json', 'raw', 'pretty'].includes(val as string));
const unwrapStore = createLocalStorageStore<boolean>(UNWRAP_DATA_KEY, false);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const theme = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot, themeStore.getServerSnapshot);
    const viewPreference = useSyncExternalStore(viewPrefStore.subscribe, viewPrefStore.getSnapshot, viewPrefStore.getServerSnapshot);
    const unwrapResponseData = useSyncExternalStore(unwrapStore.subscribe, unwrapStore.getSnapshot, unwrapStore.getServerSnapshot);

    // Apply theme to document HTML tag dynamically
    useEffect(() => {
        const root = document.documentElement;

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
    }, [theme]);

    const setTheme = useCallback((t: ThemeType) => {
        themeStore.set(t);
    }, []);

    const toggleTheme = useCallback(() => {
        const nextTheme = theme === 'system' ? 'light' : (theme === 'light' ? 'dark' : 'light');
        themeStore.set(nextTheme);
    }, [theme]);

    const setViewPreference = useCallback((pref: ViewPreferenceType) => {
        viewPrefStore.set(pref);
    }, []);

    const setUnwrapResponseData = useCallback((val: boolean) => {
        unwrapStore.set(val);
    }, []);

    return (
        <SettingsContext.Provider value={{ theme, viewPreference, unwrapResponseData, setTheme, toggleTheme, setViewPreference, setUnwrapResponseData }}>
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
