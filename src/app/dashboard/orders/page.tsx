'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, ChevronRight, Edit, Sparkles, Package, Calendar, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useOrders } from './orders-context';
import type { Order } from '@/lib/types';
import { useItems } from '../settings/items-context';
import { useWards } from '../settings/wards-context';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useUsers } from '../settings/users-context';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function OrdersListPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { orders, isLoading: isOrdersLoading } = useOrders();
    const { items: diapers, isLoading: isItemsLoading } = useItems();
    const { wards, isLoading: isWardsLoading } = useWards();
    const isMobile = useIsMobile();
    const { currentUserProfile } = useUsers();

    const [inProgressOrder, setInProgressOrder] = React.useState<boolean>(false);

    React.useEffect(() => {
        const checkSavedOrder = () => {
            const savedOrder = localStorage.getItem('inProgressOrder');
            setInProgressOrder(!!savedOrder);
        };

        checkSavedOrder();

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'inProgressOrder') {
                checkSavedOrder();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('focus', checkSavedOrder);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('focus', checkSavedOrder);
        };
    }, []);


    const isLoading = isOrdersLoading || isItemsLoading || isWardsLoading;
    const canCreateOrder = currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Soignant';
    const selectedDate = searchParams.get('date');

    const filteredOrders = React.useMemo(() => {
        if (!orders) return [];
        if (!selectedDate) return orders;
        return orders.filter(order => format(new Date(order.date), 'yyyy-MM-dd') === selectedDate);
    }, [orders, selectedDate]);


    const orderData = React.useMemo(() => {
        if (isLoading || !wards) return [];
        return filteredOrders.map(order => {
            const totalItems = order.wardOrders.reduce((total, wardOrder) => {
                return total + wardOrder.items.reduce((sum, item) => {
                    const diaper = diapers.find(d => d.id === item.diaperId);
                    if (item.unit === 'cartons' && diaper) {
                        return sum + (item.quantity * diaper.piecesPerCarton);
                    }
                    return sum + item.quantity;
                }, 0);
            }, 0);

            const involvedWards = order.wardOrders.map(wo => wards.find(w => w.id === wo.wardId)?.name).filter(Boolean);

            return {
                ...order,
                wardNames: involvedWards.join(', '),
                totalItems,
            };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [filteredOrders, diapers, wards, isLoading]);

    const handleRowClick = (orderId: string) => {
        router.push(`/dashboard/orders/${orderId}`);
    };

    const handleResumeOrder = () => {
        router.push('/dashboard/orders/new');
    }

    const getStatusVariant = (status: Order['status']) => {
        switch (status) {
            case 'distributed': return 'success';
            case 'confirmed': return 'default';
            case 'draft': return 'secondary';
            default: return 'secondary';
        }
    }

    const getStatusLabel = (status: Order['status']) => {
        switch (status) {
            case 'fulfilled': return 'Traitée';
            case 'distributed': return 'Distribuée';
            case 'confirmed': return 'Confirmée';
            case 'draft': return 'Brouillon';
            default: return status;
        }
    }

    const getStatusColor = (status: Order['status']) => {
        switch (status) {
            case 'distributed': return 'from-emerald-500 to-green-500';
            case 'confirmed': return 'from-cyan-500 to-blue-500';
            case 'draft': return 'from-slate-400 to-slate-500';
            default: return 'from-slate-400 to-slate-500';
        }
    }

    const renderInProgressOrderCard = () => (
        <Card className="relative overflow-hidden border-0 glass cursor-pointer hover-lift shadow-modern-lg animate-scale-in group" onClick={handleResumeOrder}>
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 via-green-400/15 to-emerald-500/20" />

            {/* Animated border */}
            <div className="absolute inset-0 rounded-[calc(var(--radius)-4px)] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 rounded-[calc(var(--radius)-4px)] p-[2px]">
                    <div className="w-full h-full bg-card rounded-[calc(var(--radius)-6px)]" />
                </div>
            </div>

            <CardHeader className="relative z-10">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg">
                            <Edit className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent">
                            Commande en cours
                        </CardTitle>
                    </div>
                    <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 animate-pulse shadow-lg">
                        En cours
                    </Badge>
                </div>
                <CardDescription className="text-muted-foreground mt-2">
                    Vous avez une commande non terminée. Cliquez ici pour la reprendre.
                </CardDescription>
            </CardHeader>
        </Card>
    );


    const renderDesktopView = () => (
        <Card className="overflow-hidden border-0 glass-strong shadow-modern-lg">
            <div className="overflow-x-auto custom-scrollbar">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-border/50 hover:bg-transparent">
                            <TableHead className="font-bold text-foreground">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    Date
                                </div>
                            </TableHead>
                            <TableHead className="font-bold text-foreground">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-secondary" />
                                    Étages / Cantous
                                </div>
                            </TableHead>
                            <TableHead className="font-bold text-foreground">
                                <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-accent" />
                                    Total (pièces)
                                </div>
                            </TableHead>
                            <TableHead className="font-bold text-foreground">Statut</TableHead>
                            <TableHead className="text-right font-bold text-foreground"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {inProgressOrder && (
                            <TableRow className="bg-gradient-to-r from-emerald-50/50 via-green-50/30 to-emerald-50/50 dark:from-emerald-950/20 dark:via-green-950/10 dark:to-emerald-950/20 hover:from-emerald-100/60 hover:via-green-100/40 hover:to-emerald-100/60 dark:hover:from-emerald-900/30 dark:hover:via-green-900/20 dark:hover:to-emerald-900/30 cursor-pointer transition-all animate-scale-in border-b border-emerald-200/50 dark:border-emerald-800/30" onClick={handleResumeOrder}>
                                <TableCell colSpan={5}>
                                    <div className="flex items-center justify-between font-semibold p-2">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 shadow-md">
                                                <Edit className="h-4 w-4 text-white" />
                                            </div>
                                            <span className="bg-gradient-to-r from-emerald-700 to-green-700 dark:from-emerald-300 dark:to-green-300 bg-clip-text text-transparent">
                                                Vous avez une commande en cours de rédaction...
                                            </span>
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/30">
                                            <Edit className="mr-2 h-4 w-4" /> Reprendre
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        {orderData.map((order, index) => (
                            <TableRow
                                key={order.id}
                                className="cursor-pointer hover:bg-muted/50 transition-all duration-300 animate-fade-in group border-b border-border/30"
                                style={{ animationDelay: `${index * 50}ms` }}
                                onClick={() => handleRowClick(order.id)}
                            >
                                <TableCell className="whitespace-nowrap font-semibold">{new Date(order.date).toLocaleDateString('fr-FR')}</TableCell>
                                <TableCell className="whitespace-nowrap text-muted-foreground">{order.wardNames}</TableCell>
                                <TableCell className="whitespace-nowrap">
                                    <span className="font-bold text-lg bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                        {order.totalItems}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <Badge className={cn(
                                        "bg-gradient-to-r border-0 text-white shadow-md",
                                        getStatusColor(order.status)
                                    )}>
                                        {getStatusLabel(order.status)}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );

    const renderMobileView = () => (
        <div className="space-y-4">
            {inProgressOrder && renderInProgressOrderCard()}
            {orderData.map((order, index) => (
                <Card
                    key={order.id}
                    className="cursor-pointer border-0 glass-strong hover-lift shadow-modern transition-all duration-500 animate-fade-in-scale group overflow-hidden relative"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => handleRowClick(order.id)}
                >
                    {/* Gradient on hover */}
                    <div className={cn(
                        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br",
                        order.status === 'distributed' ? "from-emerald-400/10 to-green-400/10" :
                            order.status === 'confirmed' ? "from-cyan-400/10 to-blue-400/10" :
                                "from-slate-400/10 to-slate-500/10"
                    )} />

                    <CardHeader className="relative z-10">
                        <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <CardDescription className="text-sm font-medium">
                                        {new Date(order.date).toLocaleDateString('fr-FR')}
                                    </CardDescription>
                                </div>
                                <CardTitle className="text-base font-bold break-words">
                                    {order.wardNames}
                                </CardTitle>
                            </div>
                            <Badge className={cn(
                                "bg-gradient-to-r border-0 text-white shadow-md shrink-0",
                                getStatusColor(order.status)
                            )}>
                                {getStatusLabel(order.status)}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="flex justify-between items-center pt-3 border-t border-border/30">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Package className="h-4 w-4" />
                                <p className="text-sm">Total</p>
                            </div>
                            <p className="text-2xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                {order.totalItems}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-screen gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-primary border-r-secondary animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">Chargement des commandes...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header avec effet gradient */}
            <div className="space-y-3 relative">
                <div className="absolute -top-8 -left-8 w-72 h-72 bg-cyan/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -top-4 right-12 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative">
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                            <Package className="h-10 w-10 text-primary" />
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                                <span className="bg-gradient-to-r from-primary via-cyan-500 to-blue-500 bg-clip-text text-transparent animate-gradient">
                                    {selectedDate ? `Commandes du ${format(new Date(selectedDate), 'dd/MM/yyyy')}` : 'Commandes'}
                                </span>
                            </h1>
                        </div>
                        <p className="text-base text-muted-foreground flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-cyan-500 animate-pulse" />
                            Consultez et gérez toutes les demandes de distribution
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full sm:w-auto">
                        {selectedDate && (
                            <Button
                                variant="outline"
                                onClick={() => router.push('/dashboard/orders')}
                                className="w-full sm:w-auto justify-center glass border-border/50 hover:border-primary/50"
                            >
                                Voir toutes les commandes
                            </Button>
                        )}
                        {canCreateOrder && <Link href="/dashboard/orders/new" className="w-full sm:w-auto">
                            <Button size="lg" className="w-full sm:w-auto justify-center bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg hover:shadow-xl transition-all duration-300">
                                <PlusCircle className="mr-2 h-5 w-5" />
                                Créer une Commande
                            </Button>
                        </Link>}
                    </div>
                </div>
            </div>

            {(isMobile ?? true) ? renderMobileView() : renderDesktopView()}
        </div>
    );
}
