'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Order, Delivery } from '@/lib/types';
import { TrendingUp, TrendingDown, Package, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

type TrendChartsProps = {
    orders: Order[];
    deliveries: Delivery[];
};

function CustomTooltip({ active, payload, label }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card border border-border p-3 rounded-xl shadow-lg backdrop-blur-sm">
                <p className="font-semibold text-sm mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-sm flex items-center gap-2" style={{ color: entry.color }}>
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        {entry.name}: <span className="font-bold">{entry.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
}

export default function TrendCharts({ orders, deliveries }: TrendChartsProps) {
    const chartData = React.useMemo(() => {
        // Get last 30 days
        const days = 30;
        const data: { date: string; commandes: number; livraisons: number; dateObj: Date }[] = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = startOfDay(subDays(new Date(), i));
            data.push({
                date: format(date, 'dd MMM', { locale: fr }),
                commandes: 0,
                livraisons: 0,
                dateObj: date
            });
        }

        // Count orders per day
        orders.forEach(order => {
            const orderDate = startOfDay(new Date(order.date));
            const dayData = data.find(d => d.dateObj.getTime() === orderDate.getTime());
            if (dayData) {
                dayData.commandes++;
            }
        });

        // Count deliveries per day
        deliveries.forEach(delivery => {
            const deliveryDate = startOfDay(new Date(delivery.date));
            const dayData = data.find(d => d.dateObj.getTime() === deliveryDate.getTime());
            if (dayData) {
                dayData.livraisons++;
            }
        });

        // Remove dateObj for rendering
        return data.map(({ dateObj, ...rest }) => rest);
    }, [orders, deliveries]);

    const stats = React.useMemo(() => {
        const last30Days = subDays(new Date(), 30);
        const last60Days = subDays(new Date(), 60);

        const recentOrders = orders.filter(o => new Date(o.date) >= last30Days).length;
        const previousOrders = orders.filter(o => {
            const date = new Date(o.date);
            return date >= last60Days && date < last30Days;
        }).length;

        const recentDeliveries = deliveries.filter(d => new Date(d.date) >= last30Days).length;
        const previousDeliveries = deliveries.filter(d => {
            const date = new Date(d.date);
            return date >= last60Days && date < last30Days;
        }).length;

        const ordersTrend = previousOrders > 0
            ? Math.round(((recentOrders - previousOrders) / previousOrders) * 100)
            : 0;

        const deliveriesTrend = previousDeliveries > 0
            ? Math.round(((recentDeliveries - previousDeliveries) / previousDeliveries) * 100)
            : 0;

        return {
            recentOrders,
            ordersTrend,
            recentDeliveries,
            deliveriesTrend
        };
    }, [orders, deliveries]);

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-l-4 border-l-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(59,130,246,0.15)] transition-all duration-300 rounded-2xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            Commandes (30 derniers jours)
                        </CardTitle>
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30">
                            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-foreground">{stats.recentOrders}</div>
                        <div className={cn(
                            "flex items-center gap-1 text-xs mt-2",
                            stats.ordersTrend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        )}>
                            {stats.ordersTrend >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                            ) : (
                                <TrendingDown className="h-3 w-3" />
                            )}
                            <span className="font-semibold">
                                {stats.ordersTrend >= 0 ? '+' : ''}{stats.ordersTrend}%
                            </span>
                            <span className="text-muted-foreground ml-1">vs période précédente</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-400 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(34,197,94,0.15)] transition-all duration-300 rounded-2xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">
                            Livraisons (30 derniers jours)
                        </CardTitle>
                        <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-950/30">
                            <Truck className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-foreground">{stats.recentDeliveries}</div>
                        <div className={cn(
                            "flex items-center gap-1 text-xs mt-2",
                            stats.deliveriesTrend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        )}>
                            {stats.deliveriesTrend >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                            ) : (
                                <TrendingDown className="h-3 w-3" />
                            )}
                            <span className="font-semibold">
                                {stats.deliveriesTrend >= 0 ? '+' : ''}{stats.deliveriesTrend}%
                            </span>
                            <span className="text-muted-foreground ml-1">vs période précédente</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Line Chart */}
            <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-2xl border border-border/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Activité sur 30 jours
                    </CardTitle>
                    <CardDescription>
                        Évolution quotidienne des commandes et livraisons
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="colorCommandes" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="rgb(59, 130, 246)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="rgb(59, 130, 246)" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorLivraisons" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="rgb(34, 197, 94)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="rgb(34, 197, 94)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                    className="text-muted-foreground"
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                    className="text-muted-foreground"
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    wrapperStyle={{ paddingTop: '20px' }}
                                    iconType="circle"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="commandes"
                                    name="Commandes"
                                    stroke="rgb(59, 130, 246)"
                                    strokeWidth={3}
                                    dot={{ fill: 'rgb(59, 130, 246)', r: 4 }}
                                    activeDot={{ r: 6 }}
                                    fill="url(#colorCommandes)"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="livraisons"
                                    name="Livraisons"
                                    stroke="rgb(34, 197, 94)"
                                    strokeWidth={3}
                                    dot={{ fill: 'rgb(34, 197, 94)', r: 4 }}
                                    activeDot={{ r: 6 }}
                                    fill="url(#colorLivraisons)"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
