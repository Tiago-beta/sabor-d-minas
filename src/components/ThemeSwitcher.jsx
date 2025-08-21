import React from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';

export default function ThemeSwitcher({ theme, setTheme }) {
    const effectiveTheme = theme === 'system'
        ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;

    const toggleTheme = () => {
        setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="text-[var(--foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]"
        >
            {effectiveTheme === 'dark' ? (
                <Sun className="w-5 h-5" />
            ) : (
                <Moon className="w-5 h-5" />
            )}
        </Button>
    );
}