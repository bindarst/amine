'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useItems } from '../../settings/items-context';
import { Loader2, ArrowLeft, Image as ImageIcon, TrendingUp, Users, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrders } from '../../orders/orders-context';
import { useWards } from '../../settings/wards-context';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';
import { startOfWeek, format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { useDeliveries } from '../../deliveries/deliveries-context';
import { useNotifications } from '../../notifications-context';
import { useUsers } from '../../settings/users-context';
import ItemMovementHistory from './item-movement-history';

function CustomTooltip({ active, payload, label }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background border border-border p-2 rounded-md shadow-lg">
                <p className="font-bold">{label}</p>
                <p className="text-sm text-primary">{`Total: ${payload[0].value.toLocaleString('fr-FR')} pièces`}</p>
            </div>
        );
    }
    return null;
}

export default function ItemDetailsContent({ itemId }: { itemId: string }) {
    const router = useRouter();
    const { items, isLoading: isItemsLoading } = useItems();
    const { orders, isLoading: isOrdersLoading } = useOrders();
    const { wards, isLoading: isWardsLoading } = useWards();
    const { deliveries, isLoading: isDeliveriesLoading } = useDeliveries();
    const { notifications, isLoading: isNotificationsLoading } = useNotifications();
    const { users, isLoading: isUsersLoading } = useUsers();


    const [item, setItem] = React.useState<any>(null);

    React.useEffect(() => {
        if (!isItemsLoading && items.length > 0) {
            const foundItem = items.find(i => i.id === itemId);
            setItem(foundItem);
        }
    }, [itemId, items, isItemsLoading]);

    const itemStats = React.useMemo(() => {
        if (!item || !orders || !wards) return null;

        const stats = {
            totalConsumption: 0,
            consumptionByWard: [] as { name: string; total: number }[],
            consumptionOverTime: [] as { date: string; total: number }[]
        };

        const consumptionByWardMap = new Map<string, number>();
        const consumptionOverTimeMap = new Map<string, number>();
        let weekCount = new Set<string>();

        orders.forEach(order => {
            const orderDate = new Date(order.date);
            const weekStart = format(startOfWeek(orderDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

            order.wardOrders.forEach(wardOrder => {
                wardOrder.items.forEach(orderItem => {
                    if (orderItem.diaperId === itemId) {
                        const quantityInPieces = orderItem.unit === 'cartons' && item.piecesPerCarton > 0
                            ? orderItem.quantity * item.piecesPerCarton
                            : orderItem.quantity;

                        stats.totalConsumption += quantityInPieces;

                        const ward = wards.find(w => w.id === wardOrder.wardId);
                        if (ward) {
                            const currentTotal = consumptionByWardMap.get(ward.name) || 0;
                            consumptionByWardMap.set(ward.name, currentTotal + quantityInPieces);
                        }

                        const currentWeekTotal = consumptionOverTimeMap.get(weekStart) || 0;
                        consumptionOverTimeMap.set(weekStart, currentWeekTotal + quantityInPieces);
                        weekCount.add(weekStart);
                    }
                });
            });
        });

        stats.consumptionByWard = Array.from(consumptionByWardMap, ([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total);

        stats.consumptionOverTime = Array.from(consumptionOverTimeMap, ([date, total]) => ({ date, total }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const mostConsumingWard = stats.consumptionByWard[0] ? stats.consumptionByWard[0].name : 'N/A';
        const averageWeeklyConsumption = weekCount.size > 0 ? Math.round(stats.totalConsumption / weekCount.size) : 0;

        return { ...stats, mostConsumingWard, averageWeeklyConsumption };

    }, [item, orders, wards, itemId]);

    const isLoading = isItemsLoading || isOrdersLoading || isWardsLoading || isDeliveriesLoading || isNotificationsLoading || isUsersLoading;

    if (isLoading || !item) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="mb-6">
                <Button variant="outline" onClick={() => router.push('/dashboard/items')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour à la liste des articles
                </Button>
            </div>

            <Card className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-1/3 relative aspect-square">
                        {item.imageUrl ? (
                            <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                sizes="(max-width: 768px) 100vw, 33vw"
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                <ImageIcon className="h-24 w-24 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 p-6 md:p-8">
                        <CardHeader className="p-0">
                            <div className="flex items-start justify-between gap-2">
                                <CardTitle className="text-3xl font-bold">{item.name}</CardTitle>
                                <Badge variant={item.isActive ? 'success' : 'secondary'}>
                                    {item.isActive ? 'Actif' : 'Inactif'}
                                </Badge>
                            </div>
                            <CardDescription className="pt-2 text-lg">{item.code}</CardDescription>
                        </CardHeader>
                        <Separator className="my-6" />
                        <CardContent className="p-0 space-y-6">
                            {item.description && (
                                <div>
                                    <h3 className="font-semibold text-base">Description</h3>
                                    <p className="text-muted-foreground text-sm mt-1 whitespace-pre-wrap">{item.description}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">Pièces par carton</h4>
                                    <p className="text-xl font-semibold">{item.piecesPerCarton}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">Unité par défaut</h4>
                                    <p className="text-xl font-semibold capitalize">{item.defaultUnit}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">Seuil de stock bas</h4>
                                    <p className="text-xl font-semibold">{item.lowStockThreshold}</p>
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <h4 className="text-sm font-medium text-muted-foreground">Couleur</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="h-6 w-6 rounded-md border" style={{ backgroundColor: item.hexColor }} />
                                        <span className="font-mono text-sm">{item.hexColor}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </div>
                </div>
            </Card>

            {itemStats && (
                <div className="space-y-8">
                    <h2 className="text-2xl font-bold tracking-tight">Analyses de Consommation</h2>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Consommation Totale</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{itemStats.totalConsumption.toLocaleString('fr-FR')}</div>
                                <p className="text-xs text-muted-foreground">pièces commandées au total</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Conso. Moy./Semaine</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{itemStats.averageWeeklyConsumption.toLocaleString('fr-FR')}</div>
                                <p className="text-xs text-muted-foreground">pièces par semaine en moyenne</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Top Consommateur</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold truncate">{itemStats.mostConsumingWard}</div>
                                <p className="text-xs text-muted-foreground">Étage/cantou le plus demandeur</p>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="grid md:grid-cols-5 gap-8">
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Consommation par Étage</CardTitle>
                                <CardDescription>Répartition des pièces commandées par étage.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={itemStats.consumptionByWard} layout="vertical" margin={{ left: 10, right: 30 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} interval={0} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))' }} />
                                            <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="md:col-span-3">
                            <CardHeader>
                                <CardTitle>Historique de Consommation</CardTitle>
                                <CardDescription>Évolution des commandes au fil du temps (par semaine).</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={itemStats.consumptionOverTime} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="date"
                                                tickFormatter={(str) => `S${format(new Date(str), 'ww')}`}
                                                tick={{ fontSize: 12 }}
                                            />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            <ItemMovementHistory
                itemId={itemId}
                orders={orders}
                deliveries={deliveries}
                notifications={notifications}
                items={items}
                users={users}
            />

        </div>
    )
}
