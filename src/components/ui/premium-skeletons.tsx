'use client';

import { motion } from 'framer-motion';
import { Skeleton } from './skeleton';

// Skeleton pour une carte complète
export function CardSkeleton() {
    return (
        <div className="p-6 space-y-4 border rounded-2xl glass-strong">
            <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
            </div>
        </div>
    );
}

// Skeleton pour la liste
export function ListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-4 p-4 border rounded-xl"
                >
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-10 w-24" />
                </motion.div>
            ))}
        </div>
    );
}

// Skeleton pour le tableau
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={`header-${i}`} className="h-4 flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <motion.div
                    key={rowIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: rowIndex * 0.05 }}
                    className="flex gap-4 p-4"
                >
                    {Array.from({ length: cols }).map((_, colIndex) => (
                        <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4 flex-1" />
                    ))}
                </motion.div>
            ))}
        </div>
    );
}

// Skeleton pour stats/KPI
export function StatSkeleton() {
    return (
        <div className="p-6 border rounded-2xl glass-strong space-y-3">
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
        </div>
    );
}

// Skeleton pour le dashboard
export function DashboardSkeleton() {
    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="space-y-3">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-5 w-96" />
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <StatSkeleton key={i} />
                ))}
            </div>

            {/* Cards */}
            <div className="grid gap-6 md:grid-cols-2">
                <CardSkeleton />
                <CardSkeleton />
            </div>
        </div>
    );
}
