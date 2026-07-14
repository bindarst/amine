'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

type PremiumIconVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger' | 'purple' | 'pink' | 'orange';
type PremiumIconSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface PremiumIconProps extends React.HTMLAttributes<HTMLDivElement> {
    icon: LucideIcon;
    variant?: PremiumIconVariant;
    size?: PremiumIconSize;
    glass?: boolean;
    glow?: boolean;
}

const variants = {
    primary: 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-950 dark:border-slate-100',
    secondary: 'bg-muted text-muted-foreground border-border',
    accent: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
    purple: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    pink: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    orange: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
};

const sizes = {
    sm: 'p-1.5 rounded-lg',
    md: 'p-2.5 rounded-xl',
    lg: 'p-3.5 rounded-2xl',
    xl: 'p-4 rounded-2xl',
    '2xl': 'p-5 rounded-3xl',
};

const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
    '2xl': 'h-10 w-10',
};

export function PremiumIcon({
    icon: Icon,
    variant = 'primary',
    size = 'md',
    glass = false,
    glow = false,
    className,
    ...props
}: PremiumIconProps) {
    return (
        <div
            className={cn(
                'relative flex items-center justify-center border transition-colors duration-150',
                sizes[size],
                glass
                    ? 'bg-background text-muted-foreground border-border'
                    : variants[variant],
                glow && !glass && 'shadow-sm',
                className
            )}
            {...props}
        >
            <Icon className={cn(iconSizes[size], 'relative z-10')} />
        </div>
    );
}
