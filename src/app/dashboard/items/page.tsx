'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useItems } from '../settings/items-context';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Image as ImageIcon, Search, XCircle, Archive, Target, Sparkles, Package2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useStock } from '../stock/stock-context';
import { useWards } from '../settings/wards-context';

export default function ItemsPage() {
    const { items, isLoading: isItemsLoading } = useItems();
    const { stock, isLoading: isStockLoading } = useStock();
    const { wards, isLoading: isWardsLoading } = useWards();
    const [searchTerm, setSearchTerm] = React.useState('');
    const isMobile = useIsMobile();

    const isLoading = isItemsLoading || isStockLoading || isWardsLoading;

    const weeklyNeeds = React.useMemo(() => {
        if (isWardsLoading || !wards || !items) return {};

        const needs: { [itemId: string]: number } = {};

        items.forEach(item => {
            let totalNeed = 0;
            wards.forEach(ward => {
                if (ward.parLevels && ward.parLevels[item.id]) {
                    const parLevel = ward.parLevels[item.id];
                    const itemInfo = items.find(i => i.id === item.id);
                    // Assume par level unit matches item's default unit
                    if (itemInfo?.defaultUnit === 'cartons' && itemInfo.piecesPerCarton > 0) {
                        totalNeed += parLevel * itemInfo.piecesPerCarton;
                    } else {
                        totalNeed += parLevel;
                    }
                }
            });
            needs[item.id] = totalNeed;
        });

        return needs;

    }, [wards, items, isWardsLoading]);

    const filteredItems = React.useMemo(() => {
        return items.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.code.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [items, searchTerm]);

    const getStockQuantity = (itemId: string) => {
        const stockItem = stock.find(s => s.diaperId === itemId);
        return stockItem?.quantity ?? 0;
    }

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-screen gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-primary border-r-secondary animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">Chargement des articles...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header avec effet gradient */}
            <div className="space-y-3 relative">
                <div className="absolute -top-8 -left-8 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -top-4 right-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

                <div className="flex items-center gap-3">
                    <Package2 className="h-10 w-10 text-primary" />
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight relative">
                        <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                            Liste des Articles
                        </span>
                    </h1>
                </div>
                <p className="text-base text-muted-foreground relative flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent animate-pulse" />
                    Parcourez tous les articles disponibles avec leur niveau de stock et besoins
                </p>
            </div>

            {/* Search bar premium */}
            <div className="relative max-w-xl">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                    <Input
                        placeholder="Rechercher un article par nom ou code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 h-12 glass border-border/50 focus:border-primary/50 transition-all duration-300 rounded-2xl text-base"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-lg transition-colors"
                        >
                            <XCircle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                        </button>
                    )}
                </div>
            </div>

            {/* Grid d'articles */}
            <div className={cn(
                "grid gap-5",
                isMobile ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            )}>
                {filteredItems.map((item, index) => {
                    const totalWeeklyNeed = weeklyNeeds[item.id] || 0;
                    const stockQty = getStockQuantity(item.id);
                    const isLowStock = stockQty < item.lowStockThreshold;

                    return (
                        <Link
                            href={`/dashboard/items/${item.id}`}
                            key={item.id}
                            className="group flex"
                            style={{ animationDelay: `${index * 30}ms` }}
                        >
                            <Card className="overflow-hidden border-0 glass-strong hover-lift shadow-modern w-full flex flex-col animate-fade-in-scale transition-all duration-500">
                                {/* Image avec overlay gradient au hover */}
                                <CardHeader className="p-0 relative">
                                    <div className="relative aspect-square w-full overflow-hidden">
                                        {item.imageUrl ? (
                                            <>
                                                <Image
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    fill
                                                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                                                    className="object-cover transition-all duration-500 group-hover:scale-110"
                                                />
                                                {/* Overlay gradient au hover */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            </>
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 flex items-center justify-center">
                                                <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                                            </div>
                                        )}

                                        {/* Badges */}
                                        <div className="absolute top-2 right-2 flex flex-col gap-2">
                                            {!item.isActive && (
                                                <Badge variant="secondary" className="glass-strong backdrop-blur-md">
                                                    Inactif
                                                </Badge>
                                            )}
                                            {isLowStock && (
                                                <Badge className="bg-gradient-to-r from-rose-500 to-red-500 text-white border-0 shadow-lg animate-pulse-glow">
                                                    Stock bas
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>

                                {/* Content */}
                                <CardContent className="p-4 flex-grow">
                                    <CardTitle className="text-base font-bold truncate group-hover:text-primary transition-colors">
                                        {item.name}
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground font-mono mt-1">{item.code}</p>
                                </CardContent>

                                {/* Footer avec stats */}
                                <CardFooter className="p-4 pt-0 mt-auto flex-col items-start gap-2">
                                    {/* Stock */}
                                    <div className="flex items-center gap-2 w-full">
                                        <div className={cn(
                                            "p-1.5 rounded-lg transition-colors",
                                            isLowStock ? "bg-rose-100 dark:bg-rose-950/30" : "bg-emerald-100 dark:bg-emerald-950/30"
                                        )}>
                                            <Archive className={cn(
                                                "h-3.5 w-3.5",
                                                isLowStock ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                                            )} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-muted-foreground">Stock</p>
                                            <p className={cn(
                                                "text-sm font-bold truncate",
                                                isLowStock ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                                            )}>
                                                {stockQty.toLocaleString('fr-FR')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Besoins */}
                                    <div className="flex items-center gap-2 w-full">
                                        <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/30">
                                            <Target className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-muted-foreground">Besoin/sem</p>
                                            <p className="text-sm font-bold text-violet-600 dark:text-violet-400 truncate">
                                                {totalWeeklyNeed.toLocaleString('fr-FR')}
                                            </p>
                                        </div>
                                    </div>
                                </CardFooter>
                            </Card>
                        </Link>
                    )
                })}
            </div>

            {/* Empty state */}
            {filteredItems.length === 0 && (
                <div className="text-center py-20">
                    <div className="glass-strong inline-flex p-8 rounded-3xl shadow-modern-lg">
                        <div className="space-y-4">
                            <div className="relative inline-flex">
                                <XCircle className="h-16 w-16 text-muted-foreground" />
                                <div className="absolute inset-0 blur-2xl bg-muted-foreground/20 rounded-full" />
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-foreground">Aucun article trouvé</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Votre recherche pour "<span className="font-semibold text-primary">{searchTerm}</span>" n'a donné aucun résultat
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
