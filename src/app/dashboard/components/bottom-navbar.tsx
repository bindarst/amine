'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Archive,
    LayoutGrid,
    Settings,
    Package,
    Tags,
    Truck,
    HelpCircle,
    FileText,
    Calendar,
    Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUsers } from '@/app/dashboard/settings/users-context';

const allNavItems = [
    { href: '/dashboard', icon: Home, label: 'Accueil', shortLabel: 'Accueil', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/orders', icon: Package, label: 'Commandes', shortLabel: 'Cmd', roles: ['Admin', 'Soignant'] },
    { href: '/dashboard/agenda', icon: Calendar, label: 'Agenda', shortLabel: 'Agenda', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/deliveries', icon: Truck, label: 'Livraisons', shortLabel: 'Livr.', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/items', icon: Tags, label: 'Articles', shortLabel: 'Art.', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/stock', icon: Archive, label: 'Stock', shortLabel: 'Stock', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/reports', icon: FileText, label: 'Rapports', shortLabel: 'Rapp.', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/settings', icon: Settings, label: 'Paramètres', shortLabel: 'Config', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/help', icon: HelpCircle, label: 'Aide', shortLabel: 'Aide', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
];

export default function BottomNavbar() {
    const pathname = usePathname();
    const { currentUserProfile } = useUsers();
    const navRef = React.useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = React.useState(true);
    const lastScrollYRef = React.useRef(0);
    const idleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const navItems = React.useMemo(() => {
        if (!currentUserProfile?.role) return [];
        return allNavItems.filter(item => item.roles.includes(currentUserProfile.role!));
    }, [currentUserProfile]);

    React.useEffect(() => {
        const clearIdleTimer = () => {
            if (idleTimerRef.current) {
                window.clearTimeout(idleTimerRef.current);
            }
        };

        const scheduleHide = () => {
            clearIdleTimer();
            if (window.scrollY > 80) {
                idleTimerRef.current = window.setTimeout(() => setIsVisible(false), 2200);
            }
        };

        const handleScroll = () => {
            const currentY = window.scrollY;
            const previousY = lastScrollYRef.current;

            if (currentY <= 40 || currentY < previousY - 8) {
                setIsVisible(true);
                scheduleHide();
            } else if (currentY > previousY + 8) {
                setIsVisible(false);
            }

            lastScrollYRef.current = currentY;
        };

        const handleInteraction = () => {
            setIsVisible(true);
            scheduleHide();
        };

        lastScrollYRef.current = window.scrollY;
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('touchstart', handleInteraction, { passive: true });
        window.addEventListener('mousemove', handleInteraction);
        window.addEventListener('focusin', handleInteraction);
        scheduleHide();

        return () => {
            clearIdleTimer();
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('touchstart', handleInteraction);
            window.removeEventListener('mousemove', handleInteraction);
            window.removeEventListener('focusin', handleInteraction);
        };
    }, []);

    return (
        <nav
            className={cn(
                "fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe transition-transform duration-200 ease-out will-change-transform",
                isVisible ? "translate-y-0" : "translate-y-[115%]"
            )}
        >
            {/* Container with safe area padding */}
            <div className="mx-2 mb-2">
                {/* Main navbar container */}
                <div className="relative rounded-xl overflow-hidden border border-border bg-background shadow-lg">

                    {/* Navigation items */}
                    <div
                        ref={navRef}
                        className="relative flex items-stretch overflow-x-auto no-scrollbar"
                    >
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "relative flex flex-col items-center justify-center py-2 px-3 min-w-[60px] flex-1",
                                        "transition-colors duration-150 active:scale-95",
                                        isActive ? "text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    {/* Active indicator pill */}
                                    {isActive && (
                                        <div className="absolute inset-x-2 top-1 bottom-1 rounded-xl bg-primary/10 dark:bg-primary/15 animate-scale-in" />
                                    )}

                                    {/* Icon */}
                                    <div className="relative z-10">
                                        <Icon
                                            className={cn(
                                            "transition-colors duration-150",
                                                isActive
                                                    ? "w-5 h-5 text-primary"
                                                    : "w-5 h-5 text-muted-foreground"
                                            )}
                                            strokeWidth={isActive ? 2.5 : 2}
                                        />

                                        {/* Active dot indicator */}
                                        {isActive && (
                                            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                        )}
                                    </div>

                                    {/* Label - always visible */}
                                    <span
                                        className={cn(
                                            "relative z-10 text-[10px] font-medium mt-1 transition-colors duration-200 truncate max-w-full",
                                            isActive
                                                ? "text-primary font-semibold"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        {item.shortLabel}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Custom scrollbar hiding */}
            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .pb-safe {
                    padding-bottom: env(safe-area-inset-bottom, 0px);
                }
            `}</style>
        </nav>
    );
}
