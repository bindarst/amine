'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ListPlus,
  Package,
  Loader2,
  Truck,
  Archive,
  FileText,
  AlertTriangle,
  Hourglass,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useFirebase } from '@/firebase';
import * as React from 'react';
import { useUsers } from './settings/users-context';
import { useOrders } from './orders/orders-context';
import { useStock } from './stock/stock-context';
import { useItems } from './settings/items-context';
import { cn } from '@/lib/utils';
import { DashboardCharts } from '@/components/ui/charts/dashboard-charts';

const allShortcuts = [
  {
    href: "/dashboard/orders/new",
    icon: ListPlus,
    title: "Nouvelle Commande",
    description: "Créer une liste de distribution",
    roles: ['Admin', 'Soignant'],
    gradient: "from-amber-400 via-orange-400 to-amber-500",
    glowColor: "rgba(251, 191, 36, 0.4)"
  },
  {
    href: "/dashboard/deliveries/new",
    icon: Truck,
    title: "Nouvelle Livraison",
    description: "Enregistrer une entrée de stock",
    roles: ['Admin', 'Soignant', 'Agent Logistique'],
    gradient: "from-cyan-400 via-blue-400 to-cyan-500",
    glowColor: "rgba(6, 182, 212, 0.4)"
  },
  {
    href: "/dashboard/stock",
    icon: Archive,
    title: "Gestion du Stock",
    description: "Voir les niveaux de stock actuels",
    roles: ['Admin', 'Agent Logistique', 'Soignant'],
    gradient: "from-emerald-400 via-green-400 to-emerald-500",
    glowColor: "rgba(52, 211, 153, 0.4)"
  },
  {
    href: "/dashboard/reports",
    icon: FileText,
    title: "Rapports",
    description: "Exporter les statistiques",
    roles: ['Admin', 'Soignant', 'Agent Logistique'],
    gradient: "from-violet-400 via-purple-400 to-violet-500",
    glowColor: "rgba(167, 139, 250, 0.4)"
  },
];

function DashboardPageContent() {
  const { user, isUserLoading } = useFirebase();
  const { currentUserProfile, isCurrentUserProfileLoading, users: allUsers } = useUsers();
  const { orders, isLoading: isOrdersLoading } = useOrders();
  const { stock, isLoading: isStockLoading } = useStock();
  const { items, isLoading: isItemsLoading } = useItems();

  const isLoading = isUserLoading || isCurrentUserProfileLoading || isOrdersLoading || isStockLoading || isItemsLoading;

  const userShortcuts = React.useMemo(() => {
    if (!currentUserProfile?.role) return [];
    return allShortcuts.filter(shortcut => shortcut.roles.includes(currentUserProfile.role!));
  }, [currentUserProfile]);

  // KPIs Calculation
  const kpiData = React.useMemo(() => {
    if (isLoading) return { ordersToPrepare: 0, lowStockItems: 0, pendingUsers: 0 };

    const ordersToPrepare = orders.filter(o => o.status === 'confirmed').length;

    const lowStockItems = items.filter(item => {
      if (!item.isActive) return false;
      const stockItem = stock.find(s => s.diaperId === item.id);
      const quantity = stockItem?.quantity || 0;
      return quantity < item.lowStockThreshold;
    }).length;

    const pendingUsers = allUsers.filter(u => !u.isActive).length;

    return { ordersToPrepare, lowStockItems, pendingUsers };

  }, [isLoading, orders, items, stock, allUsers]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-primary border-r-secondary animate-spin" />
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Chargement de vos données...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-12">
      {/* Header avec effet gradient */}
      <div className="space-y-3 relative">
        <div className="absolute -top-8 -left-8 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -top-4 right-12 w-64 h-64 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight relative">
          <span className="text-foreground">
            Bonjour, <span className="text-primary">{currentUserProfile?.displayName || user?.displayName || 'Utilisateur'}</span>
          </span>
        </h1>
        <p className="text-base text-muted-foreground relative flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          Bienvenue sur votre tableau de bord
        </p>
      </div>



      {/* Actions rapides - Design premium (Déplacé en haut) */}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Actions rapides</h2>
          <div className="h-[3px] flex-1 bg-gradient-to-r from-primary via-transparent to-transparent rounded-full" />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {userShortcuts.map((shortcut, index) => {
            const Icon = shortcut.icon;

            return (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Card className="h-full relative overflow-hidden border-0 glass-strong hover-lift shadow-modern transition-all duration-500 animate-fade-in-scale">
                  {/* Gradient background on hover */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-all duration-500",
                    shortcut.gradient
                  )}
                    style={{
                      filter: 'blur(60px)',
                      transform: 'scale(1.5)',
                    }}
                  />

                  {/* Content */}
                  <CardContent className="p-7 flex flex-col gap-4 relative z-10">
                    {/* Icon avec gradient */}
                    <div className="relative w-fit">
                      <div className={cn(
                        "absolute inset-0 bg-gradient-to-br opacity-20 rounded-2xl blur-xl group-hover:opacity-40 transition-opacity duration-500",
                        shortcut.gradient
                      )} />
                      <div className={cn(
                        "relative p-4 rounded-2xl bg-gradient-to-br shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500",
                        shortcut.gradient
                      )}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                    </div>

                    {/* Texte */}
                    <div className="space-y-1.5">
                      <CardTitle className="text-lg font-bold text-foreground group-hover:text-foreground transition-colors">
                        {shortcut.title}
                      </CardTitle>
                      <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                        {shortcut.description}
                      </CardDescription>
                    </div>

                    {/* Arrow indicator */}
                    <div className="mt-auto pt-2 flex items-center gap-2 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-0 group-hover:translate-x-1">
                      <span>Accéder</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* KPI Cards - Design premium avec glassmorphism */}
      <div className="grid grid-cols-2 gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(currentUserProfile?.role === 'Agent Logistique' || currentUserProfile?.role === 'Admin') && (
          <Link href="/dashboard/orders" className="group">
            <Card className="h-full relative overflow-hidden border-0 glass hover-lift hover-glow shadow-modern-lg transition-all duration-500">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-blue-400/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Animated border */}
              <div className="absolute inset-0 rounded-[calc(var(--radius)-4px)] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500 rounded-[calc(var(--radius)-4px)] p-[2px]">
                  <div className="w-full h-full bg-card rounded-[calc(var(--radius)-6px)]" />
                </div>
              </div>

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Commandes à Préparer
                </CardTitle>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <Package className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex items-baseline gap-2">
                  <div className="text-5xl font-black bg-gradient-to-br from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
                    {kpiData.ordersToPrepare}
                  </div>
                  <TrendingUp className="h-5 w-5 text-cyan-500 mb-2" />
                </div>
                <p className="text-sm text-muted-foreground mt-2">Commandes en attente de distribution</p>
              </CardContent>
            </Card>
          </Link>
        )}

        <Link href="/dashboard/stock?filter=low" className="group">
          <Card className="h-full relative overflow-hidden border-0 glass hover-lift hover-glow shadow-modern-lg transition-all duration-500">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-rose-400/10 via-red-400/10 to-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Animated border */}
            <div className="absolute inset-0 rounded-[calc(var(--radius)-4px)] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-400 via-red-400 to-rose-500 rounded-[calc(var(--radius)-4px)] p-[2px]">
                <div className="w-full h-full bg-card rounded-[calc(var(--radius)-6px)]" />
              </div>
            </div>

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Articles en Stock Bas
              </CardTitle>
              <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-400 to-red-500 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 animate-pulse-glow">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="flex items-baseline gap-2">
                <div className="text-5xl font-black bg-gradient-to-br from-rose-600 to-red-600 dark:from-rose-400 dark:to-red-400 bg-clip-text text-transparent">
                  {kpiData.lowStockItems}
                </div>
                {kpiData.lowStockItems > 0 && (
                  <AlertTriangle className="h-5 w-5 text-rose-500 mb-2 animate-pulse" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Articles ayant atteint leur seuil critique</p>
            </CardContent>
          </Card>
        </Link>

        {currentUserProfile?.role === 'Admin' && (
          <Link href="/dashboard/settings" className="group">
            <Card className="h-full relative overflow-hidden border-0 glass hover-lift hover-glow shadow-modern-lg transition-all duration-500">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-400/10 via-purple-400/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Animated border */}
              <div className="absolute inset-0 rounded-[calc(var(--radius)-4px)] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-400 via-purple-400 to-violet-500 rounded-[calc(var(--radius)-4px)] p-[2px]">
                  <div className="w-full h-full bg-card rounded-[calc(var(--radius)-6px)]" />
                </div>
              </div>

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Utilisateurs en Attente
                </CardTitle>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <Hourglass className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex items-baseline gap-2">
                  <div className="text-5xl font-black bg-gradient-to-br from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                    {kpiData.pendingUsers}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Comptes attendant une activation</p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Charts Section - Visible seulement pour Admin et Agent Logistique */}
      {(currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Agent Logistique') && (
        <DashboardCharts orders={orders} stock={stock} items={items} />
      )}

    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardPageContent />
  );
}
