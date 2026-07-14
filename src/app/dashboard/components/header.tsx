
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, LayoutGrid, Package, Archive, FileText, Tags, Truck, HelpCircle, Bell, Calendar } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import CommandPalette from '@/app/dashboard/components/command-palette';
import { useUsers } from '@/app/dashboard/settings/users-context';
import { Badge } from '@/components/ui/badge';
import { usePathname } from 'next/navigation';
import { AVATARS } from '@/components/avatars';
import Image from 'next/image';
import NotificationBell from './notification-bell';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { PushNotificationToggle } from '@/components/ui/push-notification-toggle';
import { cn } from '@/lib/utils';
import { PremiumIcon } from '@/components/ui/premium-icon';
import { MobileMenu } from './mobile-menu';
import { OnlineStatusBadge } from '@/components/ui/online-status';

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

export default function Header() {
  const { auth } = useFirebase();
  const router = useRouter();
  const { currentUserProfile } = useUsers();
  const pathname = usePathname();


  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  const getInitials = (name?: string | null) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
  };

  const navItems = React.useMemo(() => {
    if (!currentUserProfile?.role) return [];
    return allNavItems.filter(item => item.roles.includes(currentUserProfile.role!));
  }, [currentUserProfile]);

  const SelectedAvatar = currentUserProfile?.avatarId ? AVATARS[currentUserProfile.avatarId] : null;


  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center h-16 px-4 border-b bg-background md:px-8 transition-all duration-200 shadow-sm">
      <div className="flex items-center gap-8">
        {/* Logo & Mobile Menu Trigger */}
        <div className="flex items-center gap-4">
          <MobileMenu />
          <Link href="/dashboard" className="flex items-center gap-2 transition-transform hover:scale-105">
            <Image src="/splash.png" alt="Lista Logo" width={32} height={32} className="drop-shadow-sm" />
            <span className="hidden md:block text-xl font-bold text-foreground">
              Lista
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-accent/50",
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <PremiumIcon
                  icon={Icon}
                  variant={isActive ? 'primary' : 'secondary'}
                  size="sm"
                  glass={!isActive}
                  className={cn(isActive ? "" : "opacity-80 group-hover:opacity-100")}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center w-full justify-end gap-2 sm:gap-4">
        <OnlineStatusBadge />
        <CommandPalette />
        <PushNotificationToggle />
        <ThemeToggle />
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="overflow-hidden rounded-full w-9 h-9"
            >
              <Avatar className="w-9 h-9">
                {SelectedAvatar ? (
                  <SelectedAvatar />
                ) : (
                  <AvatarFallback>{getInitials(currentUserProfile?.displayName)}</AvatarFallback>
                )}
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="font-semibold">{currentUserProfile?.displayName}</div>
              <div className="font-normal text-muted-foreground text-sm">{currentUserProfile?.email}</div>
              {currentUserProfile?.role && <Badge variant="secondary" className="mt-2">{currentUserProfile?.role}</Badge>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/help')}>
              <HelpCircle className="mr-2 h-4 w-4" />
              Aide
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
