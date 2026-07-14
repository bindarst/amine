
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
} from 'lucide-react';
import { useFirebase } from '@/firebase';
import * as React from 'react';
import { useUsers } from './settings/users-context';
import { useOrders } from './orders/orders-context';
import { useStock } from './stock/stock-context';
import { useItems } from './settings/items-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const allShortcuts = [
  {
    href: "/dashboard/orders/new",
    icon: ListPlus,
    title: "Nouvelle Commande",
    description: "Créer une liste de distribution.",
    roles: ['Admin', 'Soignant'],
    color: "bg-amber-100/50 dark:bg-amber-900/20",
    iconColor: "text-amber-600 dark:text-amber-400"
  },
  {
    href: "/dashboard/deliveries/new",
    icon: Truck,
    title: "Nouvelle Livraison",
    description: "Enregistrer une entrée de stock.",
    roles: ['Admin', 'Soignant', 'Agent Logistique'],
    color: "bg-sky-100/50 dark:bg-sky-900/20",
    iconColor: "text-sky-600 dark:text-sky-400"
  },
  {
    href: "/dashboard/stock",
    icon: Archive,
    title: "Gestion du Stock",
    description: "Voir les niveaux de stock actuels.",
    roles: ['Admin', 'Agent Logistique', 'Soignant'],
    color: "bg-lime-100/50 dark:bg-lime-900/20",
    iconColor: "text-lime-600 dark:text-lime-400"
  },
  {
    href: "/dashboard/reports",
    icon: FileText,
    title: "Rapports",
    description: "Exporter les statistiques.",
    roles: ['Admin', 'Soignant', 'Agent Logistique'],
    color: "bg-violet-100/50 dark:bg-violet-900/20",
    iconColor: "text-violet-600 dark:text-violet-400"
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
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Bonjour, {currentUserProfile?.displayName || user?.displayName || 'Utilisateur'}!
        </h1>
        <p className="text-sm text-muted-foreground">Bienvenue sur votre tableau de bord</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(currentUserProfile?.role === 'Agent Logistique' || currentUserProfile?.role === 'Admin') && (
          <Link href="/dashboard/orders" className="group">
            <Card className="h-full bg-white dark:bg-card border-l-4 border-l-cyan-400 border-t-0 border-r-0 border-b-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(6,182,212,0.15)] transition-all duration-300 rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-cyan-600 dark:text-cyan-400">Commandes à Préparer</CardTitle>
                <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/30">
                  <Package className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-foreground mb-1">{kpiData.ordersToPrepare}</div>
                <p className="text-xs text-muted-foreground">Commandes en attente de distribution.</p>
              </CardContent>
            </Card>
          </Link>
        )}

        <Link href="/dashboard/stock?filter=low" className="group">
          <Card className="h-full bg-white dark:bg-card border-l-4 border-l-red-400 border-t-0 border-r-0 border-b-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(239,68,68,0.15)] transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Articles en Stock Bas</CardTitle>
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground mb-1">{kpiData.lowStockItems}</div>
              <p className="text-xs text-muted-foreground">Articles ayant atteint leur seuil critique.</p>
            </CardContent>
          </Card>
        </Link>

        {currentUserProfile?.role === 'Admin' && (
          <Link href="/dashboard/settings" className="group">
            <Card className="h-full bg-white dark:bg-card border-l-4 border-l-blue-400 border-t-0 border-r-0 border-b-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(59,130,246,0.15)] transition-all duration-300 rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">Utilisateurs en Attente</CardTitle>
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30">
                  <Hourglass className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-foreground mb-1">{kpiData.pendingUsers}</div>
                <p className="text-xs text-muted-foreground">Comptes attendant une activation.</p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Actions rapides */}
      <div className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">Actions rapides</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {userShortcuts.map((shortcut, index) => {
            const Icon = shortcut.icon;

            // Define pastel colors matching the reference image
            const colors = {
              "Nouvelle Commande": {
                bg: "bg-amber-50/80 dark:bg-amber-950/20",
                iconBg: "bg-amber-100 dark:bg-amber-900/30",
                iconColor: "text-amber-600 dark:text-amber-400",
                border: "border-amber-100 dark:border-amber-900/20"
              },
              "Nouvelle Livraison": {
                bg: "bg-sky-50/80 dark:bg-sky-950/20",
                iconBg: "bg-sky-100 dark:bg-sky-900/30",
                iconColor: "text-sky-600 dark:text-sky-400",
                border: "border-sky-100 dark:border-sky-900/20"
              },
              "Gestion du Stock": {
                bg: "bg-lime-50/80 dark:bg-lime-950/20",
                iconBg: "bg-lime-100 dark:bg-lime-900/30",
                iconColor: "text-lime-600 dark:text-lime-400",
                border: "border-lime-100 dark:border-lime-900/20"
              },
              "Rapports": {
                bg: "bg-violet-50/80 dark:bg-violet-950/20",
                iconBg: "bg-violet-100 dark:bg-violet-900/30",
                iconColor: "text-violet-600 dark:text-violet-400",
                border: "border-violet-100 dark:border-violet-900/20"
              }
            };

            const color = colors[shortcut.title as keyof typeof colors];

            return (
              <Link key={shortcut.href} href={shortcut.href} className="group">
                <Card
                  className={cn(
                    "h-full hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all duration-300 rounded-2xl overflow-hidden border",
                    color.bg,
                    color.border
                  )}
                >
                  <CardContent className="p-6 flex flex-col gap-3">
                    <div className={cn(
                      "p-3 rounded-xl w-fit transition-all duration-300 group-hover:scale-110",
                      color.iconBg
                    )}>
                      <Icon className={cn("h-6 w-6", color.iconColor)} />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-base font-semibold text-foreground group-hover:text-foreground/80 transition-colors">
                        {shortcut.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        {shortcut.description}
                      </CardDescription>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardPageContent />
  );
}
