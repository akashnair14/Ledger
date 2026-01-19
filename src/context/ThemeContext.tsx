'use client';

import React, { createContext, useContext, useState } from 'react';

type Theme = 'light' | 'dark';
type LayoutMode = 'standard' | 'focus';

interface ThemeContextType {
    theme: Theme;
    layoutMode: LayoutMode;
    primaryColor: string;
    toggleTheme: () => void;
    toggleLayoutMode: () => void;
    setPrimaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window === 'undefined') return 'light';
        const saved = localStorage.getItem('theme') as Theme;
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
            return saved;
        }
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
            return 'dark';
        }
        return 'light';
    });

    const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
        if (typeof window === 'undefined') return 'standard';
        const saved = localStorage.getItem('layoutMode') as LayoutMode;
        if (saved) {
            document.documentElement.setAttribute('data-layout', saved);
            return saved;
        }
        return 'standard';
    });

    const [primaryColor, setPrimaryColorState] = useState<string>(() => {
        if (typeof window === 'undefined') return '#6366f1';
        const saved = localStorage.getItem('primaryColor');
        if (saved) {
            document.documentElement.style.setProperty('--primary', saved);
            document.documentElement.style.setProperty('--primary-light', `${saved}25`);
            return saved;
        }
        return '#6366f1';
    });

    const setPrimaryColor = (color: string) => {
        setPrimaryColorState(color);
        localStorage.setItem('primaryColor', color);
        document.documentElement.style.setProperty('--primary', color);
        document.documentElement.style.setProperty('--primary-light', `${color}25`);
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    const toggleLayoutMode = () => {
        const newMode = layoutMode === 'standard' ? 'focus' : 'standard';
        setLayoutMode(newMode);
        localStorage.setItem('layoutMode', newMode);
        document.documentElement.setAttribute('data-layout', newMode);
    };

    return (
        <ThemeContext.Provider value={{ theme, layoutMode, primaryColor, toggleTheme, toggleLayoutMode, setPrimaryColor }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};
