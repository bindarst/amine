
'use client';

import * as React from 'react';
import { Loader2, LayoutGrid, Package, Archive, FileText, Tags, Settings, Truck, HelpCircle, Calendar } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { signOut, User } from 'firebase/auth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar, SidebarProvider, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader } from '@/components/ui/sidebar';
import { useUsers } from '@/app/dashboard/settings/users-context';
import BottomNavbar from '@/app/dashboard/components/bottom-navbar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, LogOut } from 'lucide-react';
import Header from '@/app/dashboard/components/header';
import { Button } from '@/components/ui/button';
import { getDoc, doc } from 'firebase/firestore';
import Image from 'next/image';

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

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { auth, user, isUserLoading, firestore } = useFirebase();
  const router = useRouter();
  const pathname = usePathname();

  const { currentUserProfile, isCurrentUserProfileLoading } = useUsers();
  
  const [isProfileComplete, setIsProfileComplete] = React.useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = React.useState(true);


  const navItems = React.useMemo(() => {
    if (!currentUserProfile?.role) return [];
    return allNavItems.filter(item => item.roles.includes(currentUserProfile.role!));
  }, [currentUserProfile]);

  React.useEffect(() => {
    async function checkUserProfile(user: User) {
      if (!firestore) return;
      const userDocRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists() && userDoc.data().displayName && userDoc.data().avatarId) {
        setIsProfileComplete(true);
      } else {
        setIsProfileComplete(false);
      }
      setIsCheckingProfile(false);
    }

    if (!isUserLoading) {
      if (!user) {
        router.push('/login');
      } else {
        checkUserProfile(user);
      }
    }
  }, [user, isUserLoading, router, firestore]);

   React.useEffect(() => {
    if (!isCheckingProfile && !isProfileComplete) {
      router.push('/login/complete-profile');
    }
  }, [isCheckingProfile, isProfileComplete, router]);


  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  if (isUserLoading || isCurrentUserProfileLoading || isCheckingProfile || !isProfileComplete || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUserProfile?.isActive || !currentUserProfile?.role) {
    return (
        <div className="flex flex-col justify-center items-center h-screen text-center p-4">
            <Alert className="max-w-md">
                <Info className="h-4 w-4" />
                <AlertTitle>Compte en attente d'activation</AlertTitle>
                <AlertDescription>
                    Votre compte a bien été créé, mais il doit être activé par un administrateur avant que vous puissiez accéder à l'application. Veuillez patienter ou contacter un administrateur.
                </AlertDescription>
            </Alert>
            <Button onClick={handleLogout} className="mt-6">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
            </Button>
        </div>
    );
  }
  
  return (
    <SidebarProvider>
      <div className="flex flex-col md:flex-row min-h-screen bg-background/95 relative">
        <div className="fixed inset-0 gradient-mesh opacity-50 pointer-events-none -z-0" />
        <Sidebar className="hidden md:flex md:flex-col glass border-r relative z-10" collapsible="icon">
           <SidebarHeader>
              <div className="flex items-center justify-center gap-2 p-2 h-16 border-b border-border/50 transition-all duration-300">
                 <Link href="/dashboard" className="flex flex-col items-center gap-1 group-data-[collapsible=icon]:hidden transition-transform hover:scale-105">
                    <Image src="/splash.png" alt="Lista Logo" width={100} height={100} className="drop-shadow-sm" />
                 </Link>
                 <Link href="/dashboard" className="hidden group-data-[collapsible=icon]:flex items-center justify-center transition-transform hover:scale-110">
                     <Image src="/splash.png" alt="Lista Logo" width={32} height={32} className="drop-shadow-sm" />
                 </Link>
              </div>
            </SidebarHeader>
           <SidebarMenu>
            {navItems.map((item, index) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.href} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label} className="group/item relative">
                        <Link href={item.href} className="relative">
                            <Icon className="transition-transform group-hover/item:scale-110" />
                            <span className="transition-all">{item.label}</span>
                            {isActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full animate-scale-in" />
                            )}
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </Sidebar>

        <div className="flex-1 flex flex-col relative z-10">
          <Header />
          <main className="flex-1 overflow-auto md:p-6 lg:p-8 pt-20 sm:pt-24 lg:pt-28 pb-24 md:pb-8">
            <div className="p-4 sm:p-0">
              {children}
            </div>
          </main>
        </div>
        <BottomNavbar />
      </div>
    </SidebarProvider>
  );
}
