'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

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
    const [theme, setTheme] = useState<Theme>('light');
    const [layoutMode, setLayoutMode] = useState<LayoutMode>('standard');
    const [primaryColor, setPrimaryColorState] = useState<string>('#6366f1');

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as Theme;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        const savedLayout = localStorage.getItem('layoutMode') as LayoutMode;
        if (savedLayout) {
            setLayoutMode(savedLayout);
            document.documentElement.setAttribute('data-layout', savedLayout);
        }

        const savedColor = localStorage.getItem('primaryColor');
        if (savedColor) {
            setPrimaryColor(savedColor);
        }
    }, []);

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
