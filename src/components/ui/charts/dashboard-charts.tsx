'use client';

import * as React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface DashboardChartsProps {
    orders: any[];
    stock: any[];
    items: any[];
}

const COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#6366F1'];

export function DashboardCharts({ orders, stock, items }: DashboardChartsProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [selectedItemId, setSelectedItemId] = React.useState<string>("all");

    // 1. Préparer les données pour les Top Articles (BarChart)
    const topArticlesData = React.useMemo(() => {
        const articleCounts: Record<string, number> = {};

        orders.forEach(order => {
            order.wardOrders?.forEach((wo: any) => {
                wo.items?.forEach((item: any) => {
                    const itemName = items.find(i => i.id === item.diaperId)?.name || 'Inconnu';
                    articleCounts[itemName] = (articleCounts[itemName] || 0) + item.quantity;
                });
            });
        });

        return Object.entries(articleCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [orders, items]);

    // 2. Préparer les données pour la Répartition du Stock (PieChart)
    // On affiche la répartition par Article (Nom) car la taille n'est pas toujours présente
    const stockDistributionData = React.useMemo(() => {
        const itemCounts: Record<string, number> = {};

        stock.forEach(stockItem => {
            const item = items.find(i => i.id === stockItem.diaperId);
            if (item) {
                // On utilise le nom de l'article, ou la taille si disponible pour être plus précis
                const label = item.name || item.size || 'Article Inconnu';
                itemCounts[label] = (itemCounts[label] || 0) + stockItem.quantity;
            }
        });

        // Convertir en tableau et trier
        const sortedData = Object.entries(itemCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // Si plus de 5 catégories, on regroupe le reste dans "Autres"
        if (sortedData.length > 5) {
            const top5 = sortedData.slice(0, 5);
            const others = sortedData.slice(5).reduce((acc, curr) => acc + curr.value, 0);
            return [...top5, { name: 'Autres', value: others }];
        }

        return sortedData;
    }, [stock, items]);

    // 3. Simuler des données de tendance (AreaChart)
    const activityData = React.useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        return last7Days.map(date => {
            let ordersCount = 0;
            let currentStockLevel = 0;

            if (selectedItemId === "all") {
                // Global
                ordersCount = orders.filter(o => o.date.startsWith(date)).length;
                // Simulation stock global
                currentStockLevel = 5000 + Math.random() * 1000 - (ordersCount * 100);
            } else {
                // Filtré par article
                const relevantOrders = orders.filter(o => o.date.startsWith(date));
                relevantOrders.forEach(order => {
                    order.wardOrders?.forEach((wo: any) => {
                        wo.items?.forEach((item: any) => {
                            if (item.diaperId === selectedItemId) {
                                ordersCount += item.quantity;
                            }
                        });
                    });
                });

                // Trouver le stock actuel de l'article
                const stockItem = stock.find(s => s.diaperId === selectedItemId);
                const baseStock = stockItem ? stockItem.quantity : 0;
                // Simulation variation stock article (juste pour l'exemple visuel car on n'a pas l'historique)
                currentStockLevel = baseStock + (Math.random() * 50 - 25);
            }

            return {
                date: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' }),
                commandes: ordersCount,
                stock: Math.max(0, Math.round(currentStockLevel))
            };
        });
    }, [orders, stock, selectedItemId]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background/90 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl">
                    <p className="font-semibold mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-muted-foreground">{entry.name}:</span>
                            <span className="font-bold">{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-7 mt-8">
            {/* Area Chart - Activité Semaine */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="col-span-1 lg:col-span-4"
            >
                <Card className="border-0 glass-strong shadow-modern-lg h-full">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-primary" />
                                    Activité {selectedItemId === 'all' ? 'Globale' : 'par Article'}
                                </CardTitle>
                                <CardDescription>Commandes et niveau de stock</CardDescription>
                            </div>
                            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                                <SelectTrigger className="w-[180px] glass-input">
                                    <SelectValue placeholder="Filtrer par article" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les articles</SelectItem>
                                    {items.map(item => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {item.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={activityData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke={isDark ? '#9CA3AF' : '#6B7280'}
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={10}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        stroke={isDark ? '#9CA3AF' : '#6B7280'}
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                        width={35}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        stroke={isDark ? '#9CA3AF' : '#6B7280'}
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        width={35}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="stock"
                                        name="Stock Est."
                                        stroke="#8B5CF6"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorStock)"
                                    />
                                    <Area
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="commandes"
                                        name="Commandes"
                                        stroke="#EC4899"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorOrders)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Pie Chart - Répartition Stock */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="col-span-1 lg:col-span-3"
            >
                <Card className="border-0 glass-strong shadow-modern-lg h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5 text-secondary" />
                            Répartition du Stock
                        </CardTitle>
                        <CardDescription>Par volume d'articles</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stockDistributionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stockDistributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        formatter={(value) => <span className="text-sm text-muted-foreground ml-1">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <span className="text-2xl font-bold text-foreground">
                                        {stockDistributionData.length}
                                    </span>
                                    <p className="text-xs text-muted-foreground">Catégories</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Bar Chart - Top Articles */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="col-span-1 lg:col-span-7"
            >
                <Card className="border-0 glass-strong shadow-modern-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-accent" />
                            Top 5 Articles Commandés
                        </CardTitle>
                        <CardDescription>Articles les plus populaires</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topArticlesData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDark ? '#374151' : '#E5E7EB'} />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={150}
                                        tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="count" name="Quantité" radius={[0, 4, 4, 0]} barSize={20}>
                                        {topArticlesData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
