'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedLogoProps {
    className?: string;
    size?: number;
    animate?: boolean;
}

export function AnimatedLogo({ className, size = 40, animate = true }: AnimatedLogoProps) {
    return (
        <div className={cn("relative inline-flex items-center gap-2", className)}>
            {/* Logo Icon avec animation */}
            <svg
                width={size}
                height={size}
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={cn(animate && "animate-logo-icon")}
            >
                {/* Gradient Definitions */}
                <defs>
                    <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="50%" stopColor="#7C3AED" />
                        <stop offset="100%" stopColor="#6366F1" />
                    </linearGradient>

                    <linearGradient id="logo-gradient-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#818CF8" stopOpacity="0.3" />
                    </linearGradient>

                    {/* Filtres pour effets */}
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Fond cercle avec glow */}
                <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="url(#logo-gradient-glow)"
                    opacity="0.2"
                    className={cn(animate && "animate-pulse-slow")}
                />

                {/* Icône principale - Liste stylisée */}
                <g filter="url(#glow)">
                    {/* Élément 1 */}
                    <rect
                        x="25"
                        y="30"
                        width="50"
                        height="8"
                        rx="4"
                        fill="url(#logo-gradient)"
                        className={cn(animate && "animate-slide-in-1")}
                    />

                    {/* Élément 2 */}
                    <rect
                        x="25"
                        y="46"
                        width="50"
                        height="8"
                        rx="4"
                        fill="url(#logo-gradient)"
                        className={cn(animate && "animate-slide-in-2")}
                    />

                    {/* Élément 3 */}
                    <rect
                        x="25"
                        y="62"
                        width="50"
                        height="8"
                        rx="4"
                        fill="url(#logo-gradient)"
                        className={cn(animate && "animate-slide-in-3")}
                    />

                    {/* Checkmarks animés */}
                    <path
                        d="M 20 34 L 23 37 L 28 32"
                        stroke="#8B5CF6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        className={cn(animate && "animate-check-1")}
                    />

                    <path
                        d="M 20 50 L 23 53 L 28 48"
                        stroke="#7C3AED"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        className={cn(animate && "animate-check-2")}
                    />

                    <path
                        d="M 20 66 L 23 69 L 28 64"
                        stroke="#6366F1"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        className={cn(animate && "animate-check-3")}
                    />
                </g>

                {/* Cercle externe décoratif */}
                <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="url(#logo-gradient)"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    className={cn(animate && "animate-rotate-slow")}
                />
            </svg>

            {/* Texte "Lista" avec gradient animé */}
            <span className={cn(
                "text-2xl font-bold bg-gradient-to-r from-violet-500 via-purple-600 to-primary bg-clip-text text-transparent",
                animate && "animate-gradient bg-[length:200%_auto]"
            )}>
                Lista
            </span>

            {/* Animations CSS */}
            <style jsx>{`
        @keyframes logo-icon {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.1); }
        }

        @keyframes slide-in-1 {
          0% { transform: translateX(-20px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }

        @keyframes slide-in-2 {
          0% { transform: translateX(-20px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }

        @keyframes slide-in-3 {
          0% { transform: translateX(-20px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }

        @keyframes check-1 {
          0% { stroke-dasharray: 0, 100; }
          100% { stroke-dasharray: 100, 0; }
        }

        @keyframes check-2 {
          0% { stroke-dasharray: 0, 100; }
          100% { stroke-dasharray: 100, 0; }
        }

        @keyframes check-3 {
          0% { stroke-dasharray: 0, 100; }
          100% { stroke-dasharray: 100, 0; }
        }

        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes gradient-animation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animate-logo-icon {
          animation: logo-icon 3s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animate-slide-in-1 {
          animation: slide-in-1 0.6s ease-out;
        }

        .animate-slide-in-2 {
          animation: slide-in-2 0.6s ease-out 0.1s;
          animation-fill-mode: both;
        }

        .animate-slide-in-3 {
          animation: slide-in-3 0.6s ease-out 0.2s;
          animation-fill-mode: both;
        }

        .animate-check-1 {
          animation: check-1 0.6s ease-out 0.3s;
          animation-fill-mode: both;
        }

        .animate-check-2 {
          animation: check-2 0.6s ease-out 0.4s;
          animation-fill-mode: both;
        }

        .animate-check-3 {
          animation: check-3 0.6s ease-out 0.5s;
          animation-fill-mode: both;
        }

        .animate-rotate-slow {
          animation: rotate-slow 20s linear infinite;
          transform-origin: center;
        }

        .animate-gradient {
          animation: gradient-animation 3s ease infinite;
        }
      `}</style>
        </div>
    );
}
