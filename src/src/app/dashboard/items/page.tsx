
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useItems } from '../settings/items-context';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Image as ImageIcon, Search, XCircle, Archive, Target } from 'lucide-react';
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
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Liste des Articles</h1>
                <p className="text-muted-foreground">
                    Parcourez la liste de tous les articles disponibles avec leur niveau de stock et leurs besoins.
                </p>
            </div>
            
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Rechercher un article par nom ou code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
            
            <div className={cn(
                "grid gap-4",
                isMobile ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            )}>
                {filteredItems.map(item => {
                    const totalWeeklyNeed = weeklyNeeds[item.id] || 0;

                    return (
                        <Link href={`/dashboard/items/${item.id}`} key={item.id} className="group flex">
                            <Card className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 w-full flex flex-col">
                                <CardHeader className="p-0">
                                    <div className="relative aspect-square w-full">
                                        {item.imageUrl ? (
                                            <Image 
                                                src={item.imageUrl} 
                                                alt={item.name} 
                                                fill
                                                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                                                className="object-cover transition-transform group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                                            </div>
                                        )}
                                        {!item.isActive && (
                                            <Badge variant="secondary" className="absolute top-2 right-2">Inactif</Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3 flex-grow">
                                    <CardTitle className="text-base font-semibold truncate">{item.name}</CardTitle>
                                    <p className="text-sm text-muted-foreground">{item.code}</p>
                                </CardContent>
                                <CardFooter className="p-3 mt-auto border-t bg-muted/50 flex-col items-start gap-1">
                                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                        <Archive className="h-4 w-4" />
                                        <span>Stock: {getStockQuantity(item.id).toLocaleString('fr-FR')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                        <Target className="h-4 w-4 text-destructive" />
                                        <span className="text-destructive">Besoin/sem: {totalWeeklyNeed.toLocaleString('fr-FR')}</span>
                                    </div>
                                </CardFooter>
                            </Card>
                        </Link>
                    )
                })}
            </div>

            {filteredItems.length === 0 && (
                 <div className="text-center text-muted-foreground col-span-full py-16">
                    <XCircle className="mx-auto h-12 w-12" />
                    <p className="mt-4 font-semibold">Aucun article trouvé</p>
                    <p className="text-sm">Votre recherche pour "{searchTerm}" n'a donné aucun résultat.</p>
                </div>
            )}
        </div>
    )
}
