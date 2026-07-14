
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';
import { useUsers } from '@/app/dashboard/settings/users-context';

const allNavItems = [
    { href: '/dashboard', icon: LayoutGrid, label: 'Tableau de bord', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/orders', icon: Package, label: 'Commandes', roles: ['Admin', 'Soignant'] },
    { href: '/dashboard/agenda', icon: Calendar, label: 'Agenda', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/deliveries', icon: Truck, label: 'Livraisons', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/items', icon: Tags, label: 'Articles', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/stock', icon: Archive, label: 'Stock', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/reports', icon: FileText, label: 'Rapports', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/settings', icon: Settings, label: 'Paramètres', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/help', icon: HelpCircle, label: 'Aide', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
];

export default function BottomNavbar() {
    const pathname = usePathname();
    const { isMobile } = useSidebar();
    const { currentUserProfile } = useUsers();

    const navItems = React.useMemo(() => {
        if (!currentUserProfile?.role) return [];
        return allNavItems.filter(item => item.roles.includes(currentUserProfile.role!));
    }, [currentUserProfile]);

    // Only render on mobile
    if (!isMobile) return null;

    return (
        <nav className="fixed bottom-6 left-6 right-6 h-[72px] rounded-[28px] z-50 md:hidden animate-slide-in-up overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#06B6D4] opacity-95" />
            {/* Glassmorphic overlay */}
            <div className="absolute inset-0 backdrop-blur-xl bg-white/10" />
            {/* Border glow */}
            <div className="absolute inset-0 rounded-[28px] border border-white/30 shadow-[0_8px_32px_rgba(139,92,246,0.4)]" />

            <div className="relative flex items-center justify-around h-full px-3">
                {navItems.map((item, index) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex items-center justify-center group"
                        >
                            <div className={cn(
                                "flex items-center justify-center w-12 h-12 rounded-[18px] transition-all duration-500 ease-out",
                                isActive
                                    ? "bg-gradient-to-br from-white/30 to-white/10 shadow-[0_0_24px_rgba(255,255,255,0.3)] scale-110 -translate-y-2"
                                    : "bg-transparent hover:bg-white/10 scale-100"
                            )}>
                                <Icon className={cn(
                                    "transition-all duration-500",
                                    isActive ? "h-6 w-6 text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.5)]" : "h-5 w-5 text-white/70"
                                )} />

                                {/* Active indicator dot */}
                                {isActive && (
                                    <div className="absolute -bottom-1 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse" />
                                )}
                            </div>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
