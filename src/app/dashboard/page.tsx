'use client';

import * as React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Archive,
  FileText,
  Hourglass,
  ListPlus,
  Package,
  Sparkles,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { DashboardCharts } from '@/components/ui/charts/dashboard-charts';
import { useFirebase } from '@/firebase';
import { useItems } from './settings/items-context';
import { useOrders } from './orders/orders-context';
import { useStock } from './stock/stock-context';
import { useUsers } from './settings/users-context';

const allShortcuts = [
  {
    href: '/dashboard/orders/new',
    icon: ListPlus,
    title: 'Nouvelle commande',
    description: 'Créer une liste de distribution',
    roles: ['Admin', 'Soignant'],
    iconClass: 'bg-orange-500',
  },
  {
    href: '/dashboard/deliveries/new',
    icon: Truck,
    title: 'Nouvelle livraison',
    description: 'Enregistrer une entrée de stock',
    roles: ['Admin', 'Soignant', 'Agent Logistique'],
    iconClass: 'bg-sky-500',
  },
  {
    href: '/dashboard/stock',
    icon: Archive,
    title: 'Gestion du stock',
    description: 'Voir les niveaux de stock actuels',
    roles: ['Admin', 'Agent Logistique', 'Soignant'],
    iconClass: 'bg-emerald-500',
  },
  {
    href: '/dashboard/reports',
    icon: FileText,
    title: 'Rapports',
    description: 'Exporter les statistiques',
    roles: ['Admin', 'Soignant', 'Agent Logistique'],
    iconClass: 'bg-violet-600',
  },
];

function ShortcutCard({ shortcut }: { shortcut: (typeof allShortcuts)[number] }) {
  const Icon = shortcut.icon;

  return (
    <Link href={shortcut.href} className="group min-w-0">
      <Card className="h-full min-h-[190px] overflow-hidden border shadow-sm transition-shadow duration-200 hover:shadow-md sm:min-h-[220px]">
        <CardContent className="flex h-full min-w-0 flex-col gap-3 p-4 sm:gap-4 sm:p-6">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm sm:h-14 sm:w-14 ${shortcut.iconClass}`}
          >
            <Icon aria-hidden="true" className="h-6 w-6 text-white sm:h-7 sm:w-7" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="break-words text-base font-bold leading-5 text-foreground sm:text-lg sm:leading-6">
              {shortcut.title}
            </CardTitle>
            <CardDescription className="break-words text-sm leading-5 text-muted-foreground">
              {shortcut.description}
            </CardDescription>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

type KpiCardProps = {
  href: string;
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  iconClass: string;
  trend?: boolean;
  alert?: boolean;
};

function KpiCard({ href, title, value, description, icon: Icon, iconClass, trend, alert }: KpiCardProps) {
  return (
    <Link href={href} className="group min-w-0">
      <Card className="h-full min-w-0 overflow-hidden border shadow-sm transition-shadow duration-200 hover:shadow-md">
        <CardContent className="min-w-0 p-5 sm:p-6">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
            <CardTitle className="min-w-0 break-words text-sm font-semibold uppercase leading-5 text-muted-foreground">
              {title}
            </CardTitle>
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg shadow-sm ${iconClass}`}>
              <Icon aria-hidden="true" className="h-5 w-5 text-white" strokeWidth={2.25} />
            </div>
          </div>
          <div className="mt-4 flex items-end gap-2">
            <div className="text-5xl font-black leading-none text-foreground">{value}</div>
            {trend && <TrendingUp aria-hidden="true" className="mb-1 h-5 w-5 shrink-0 text-sky-500" />}
            {alert && value > 0 && <AlertTriangle aria-hidden="true" className="mb-1 h-5 w-5 shrink-0 text-rose-500" />}
          </div>
          <p className="mt-3 break-words text-sm leading-5 text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function DashboardPageContent() {
  const { user, isUserLoading } = useFirebase();
  const { currentUserProfile, isCurrentUserProfileLoading, users: allUsers } = useUsers();
  const { orders, isLoading: isOrdersLoading } = useOrders();
  const { stock, isLoading: isStockLoading } = useStock();
  const { items, isLoading: isItemsLoading } = useItems();

  const isLoading = isUserLoading || isCurrentUserProfileLoading || isOrdersLoading || isStockLoading || isItemsLoading;

  const userShortcuts = React.useMemo(() => {
    if (!currentUserProfile?.role) return [];
    return allShortcuts.filter(shortcut => shortcut.roles.includes(currentUserProfile.role));
  }, [currentUserProfile]);

  const kpiData = React.useMemo(() => {
    if (isLoading) return { ordersToPrepare: 0, lowStockItems: 0, pendingUsers: 0 };

    const ordersToPrepare = orders.filter(order => order.status === 'confirmed').length;
    const lowStockItems = items.filter(item => {
      if (!item.isActive) return false;
      const stockItem = stock.find(stockEntry => stockEntry.diaperId === item.id);
      return (stockItem?.quantity || 0) < item.lowStockThreshold;
    }).length;
    const pendingUsers = allUsers.filter(existingUser => !existingUser.isActive).length;

    return { ordersToPrepare, lowStockItems, pendingUsers };
  }, [allUsers, isLoading, items, orders, stock]);

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-transparent border-r-secondary border-t-primary" />
          <Sparkles className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-pulse text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Chargement de vos données...</p>
      </div>
    );
  }

  const isAdmin = currentUserProfile?.role === 'Admin';
  const canPrepareOrders = currentUserProfile?.role === 'Agent Logistique' || isAdmin;

  return (
    <div className="flex min-w-0 flex-col gap-7 pb-12 sm:gap-8">
      <div className="min-w-0 space-y-2 sm:space-y-3">
        <h1 className="break-words text-3xl font-bold leading-tight md:text-5xl">
          Bonjour, <span className="text-primary">{currentUserProfile?.displayName || user?.displayName || 'Utilisateur'}</span>
        </h1>
        <p className="flex min-w-0 items-start gap-2 text-sm leading-5 text-muted-foreground sm:text-base">
          <Sparkles aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 break-words">Bienvenue sur votre tableau de bord</span>
        </p>
      </div>

      <section className="min-w-0 space-y-4 sm:space-y-5">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="shrink-0 text-xl font-bold leading-tight text-foreground sm:text-2xl md:text-3xl">Actions rapides</h2>
          <div className="h-0.5 min-w-6 flex-1 rounded-full bg-primary" />
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {userShortcuts.map(shortcut => <ShortcutCard key={shortcut.href} shortcut={shortcut} />)}
        </div>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {canPrepareOrders && (
          <KpiCard
            href="/dashboard/orders"
            title="Commandes à préparer"
            value={kpiData.ordersToPrepare}
            description="Commandes en attente de distribution"
            icon={Package}
            iconClass="bg-sky-500"
            trend
          />
        )}
        <KpiCard
          href="/dashboard/stock?filter=low"
          title="Articles en stock bas"
          value={kpiData.lowStockItems}
          description="Articles ayant atteint leur seuil critique"
          icon={AlertTriangle}
          iconClass="bg-rose-500"
          alert
        />
        {isAdmin && (
          <KpiCard
            href="/dashboard/settings"
            title="Utilisateurs en attente"
            value={kpiData.pendingUsers}
            description="Comptes attendant une activation"
            icon={Hourglass}
            iconClass="bg-violet-600"
          />
        )}
      </section>

      {(isAdmin || currentUserProfile?.role === 'Agent Logistique') && (
        <DashboardCharts orders={orders} stock={stock} items={items} />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardPageContent />;
}
