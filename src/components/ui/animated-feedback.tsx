'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedFeedbackProps {
    type: 'success' | 'error' | 'warning' | 'loading';
    message?: string;
    show?: boolean;
}

export function AnimatedFeedback({ type, message, show = true }: AnimatedFeedbackProps) {
    const config = {
        success: {
            icon: CheckCircle2,
            color: 'text-green-500',
            bg: 'bg-green-500/10',
            border: 'border-green-500/30',
        },
        error: {
            icon: XCircle,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/30',
        },
        warning: {
            icon: AlertCircle,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/30',
        },
        loading: {
            icon: Loader2,
            color: 'text-primary',
            bg: 'bg-primary/10',
            border: 'border-primary/30',
        },
    };

    const { icon: Icon, color, bg, border } = config[type];

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    transition={{
                        duration: 0.3,
                        ease: [0.22, 1, 0.36, 1],
                    }}
                    className={cn(
                        "flex items-center gap-3 p-4 rounded-2xl border-2",
                        "backdrop-blur-sm",
                        bg,
                        border
                    )}
                >
                    <motion.div
                        initial={{ rotate: 0, scale: 0 }}
                        animate={{
                            rotate: type === 'loading' ? 360 : 0,
                            scale: 1
                        }}
                        transition={{
                            duration: type === 'loading' ? 1 : 0.4,
                            repeat: type === 'loading' ? Infinity : 0,
                            ease: type === 'loading' ? 'linear' : [0.22, 1, 0.36, 1],
                        }}
                    >
                        <Icon className={cn("h-6 w-6", color)} />
                    </motion.div>

                    {message && (
                        <motion.p
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="font-medium text-sm"
                        >
                            {message}
                        </motion.p>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Success checkmark animation with particles
export function SuccessAnimation({ show = true, size = 100 }: { show?: boolean; size?: number }) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative flex items-center justify-center"
                    style={{ width: size, height: size }}
                >
                    {/* Circle background */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0 rounded-full bg-green-500/20"
                    />

                    {/* Checkmark */}
                    <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                            delay: 0.2,
                            duration: 0.5,
                            ease: [0.22, 1, 0.36, 1]
                        }}
                    >
                        <CheckCircle2 className="h-16 w-16 text-green-500" />
                    </motion.div>

                    {/* Particles */}
                    {Array.from({ length: 6 }).map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0, x: 0, y: 0 }}
                            animate={{
                                scale: [0, 1, 0],
                                x: Math.cos((i * Math.PI * 2) / 6) * 40,
                                y: Math.sin((i * Math.PI * 2) / 6) * 40,
                            }}
                            transition={{
                                delay: 0.3,
                                duration: 0.6,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            className="absolute w-2 h-2 rounded-full bg-green-500"
                        />
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Loading spinner premium
export function LoadingSpinner({ size = 40, className }: { size?: number; className?: string }) {
    return (
        <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
            {/* Outer ring */}
            <motion.div
                className="absolute inset-0 rounded-full border-4 border-primary/30"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                }}
                style={{
                    borderTopColor: 'hsl(var(--primary))',
                }}
            />

            {/* Inner pulse */}
            <motion.div
                className="absolute inset-2 rounded-full bg-primary/20"
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
        </div>
    );
}
