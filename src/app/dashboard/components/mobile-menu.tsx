'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUsers } from '@/app/dashboard/settings/users-context';
import {
    LayoutGrid,
    Package,
    Calendar,
    Truck,
    Tags,
    Archive,
    FileText,
    Settings,
    HelpCircle,
    LogOut,
    ShoppingCart,
    Menu
} from 'lucide-react';
import { useFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

const allNavItems = [
    { href: '/dashboard', icon: LayoutGrid, label: 'Tableau de bord', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/orders', icon: ShoppingCart, label: 'Commandes', roles: ['Admin', 'Soignant'] },
    { href: '/dashboard/agenda', icon: Calendar, label: 'Agenda', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/deliveries', icon: Truck, label: 'Livraisons', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/items', icon: Tags, label: 'Articles', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/stock', icon: Archive, label: 'Stock', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/reports', icon: FileText, label: 'Rapports', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/settings', icon: Settings, label: 'Paramètres', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { href: '/dashboard/help', icon: HelpCircle, label: 'Aide', roles: ['Admin', 'Soignant', 'Agent Logistique'] },
];

export function MobileMenu() {
    const [open, setOpen] = React.useState(false);
    const pathname = usePathname();
    const { currentUserProfile } = useUsers();
    const { auth } = useFirebase();
    const router = useRouter();

    const navItems = React.useMemo(() => {
        if (!currentUserProfile?.role) return [];
        return allNavItems.filter(item => item.roles.includes(currentUserProfile.role!));
    }, [currentUserProfile]);

    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
            router.push('/login');
        }
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Ouvrir le menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 border-r bg-background shadow-xl">
                <SheetHeader className="p-6 text-left border-b">
                    <SheetTitle className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-950">
                            L
                        </span>
                        <span className="text-xl font-bold text-foreground">
                            Lista
                        </span>
                    </SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-8rem)] pb-10">
                    <div className="flex flex-col gap-2 p-4">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                >
                                    <span
                                        className={cn(
                                            "group flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-150",
                                            isActive
                                                ? "bg-muted text-foreground font-semibold"
                                                : "text-foreground/80 hover:bg-accent hover:text-foreground"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "mr-3 flex h-8 w-8 items-center justify-center rounded-md border transition-colors duration-150",
                                                isActive
                                                    ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
                                                    : "border-border bg-background text-muted-foreground group-hover:text-foreground"
                                            )}
                                        >
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </ScrollArea>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        Déconnexion
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
