'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // Évite les problèmes d'hydratation
    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="relative w-9 h-9 rounded-full"
                disabled
            >
                <Sun className="h-5 w-5" />
            </Button>
        );
    }

    const isDark = theme === 'dark';

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={cn(
                "relative w-9 h-9 rounded-full transition-all duration-300",
                "hover:scale-110 hover:bg-primary/10",
                "group overflow-hidden"
            )}
        >
            {/* Background glow effect */}
            <div className={cn(
                "absolute inset-0 rounded-full transition-all duration-500",
                isDark ? "bg-violet-500/20" : "bg-amber-500/20",
                "opacity-0 group-hover:opacity-100"
            )} />

            {/* Icons avec animation */}
            <div className="relative">
                <Sun className={cn(
                    "h-5 w-5 transition-all duration-500",
                    "text-amber-500",
                    isDark
                        ? "rotate-90 scale-0 opacity-0"
                        : "rotate-0 scale-100 opacity-100"
                )} />
                <Moon className={cn(
                    "absolute top-0 left-0 h-5 w-5 transition-all duration-500",
                    "text-violet-500",
                    isDark
                        ? "rotate-0 scale-100 opacity-100"
                        : "-rotate-90 scale-0 opacity-0"
                )} />
            </div>

            {/* Pulse effect on hover */}
            <div className={cn(
                "absolute inset-0 rounded-full transition-opacity duration-300",
                isDark ? "bg-violet-500/10" : "bg-amber-500/10",
                "opacity-0 group-hover:opacity-100 animate-ping"
            )} />

            <span className="sr-only">
                {isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
            </span>
        </Button>
    );
}
