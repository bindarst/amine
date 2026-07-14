

'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Edit, Save, Plus, Minus, CalendarClock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useItems } from '../../settings/items-context';
import { useStock } from '../stock-context';
import { useOrders } from '../../orders/orders-context';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUsers } from '../../settings/users-context';
import type { Diaper, WithId } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO } from 'date-fns';
import { useWards } from '../../settings/wards-context';

const getStockLabel = (quantity: number, lowStockThreshold: number): string => {
  if (quantity <= 0) return 'Vide';
  if (quantity < lowStockThreshold) return 'Bas';
  if (quantity < lowStockThreshold * 2) return 'Moyen';
  return 'Élevé';
};

const getStockBadgeVariant = (quantity: number, lowStockThreshold: number): 'destructive' | 'secondary' | 'default' => {
  if (quantity <= 0) return 'destructive';
  if (quantity < lowStockThreshold) return 'destructive';
  if (quantity < lowStockThreshold * 2) return 'secondary';
  return 'default';
};

interface StockDialogInfo {
  diaper: Diaper;
  currentQuantity: number;
}

type SwipeTarget = 'cartons' | 'pieces' | null;

export default function StockClient() {
  const { items: diapers, isLoading: isItemsLoading } = useItems();
  const { stock, isLoading: isStockLoading, manualStockUpdate } = useStock();
  const { orders, isLoading: isOrdersLoading } = useOrders();
  const { wards, isLoading: isWardsLoading } = useWards();
  const { currentUserProfile } = useUsers();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedStockItem, setSelectedStockItem] = React.useState<StockDialogInfo | null>(null);
  
  const [cartons, setCartons] = React.useState(0);
  const [pieces, setPieces] = React.useState(0);
  
  const touchStartRef = React.useRef<{ x: number, y: number, lastUpdatedX: number, target: SwipeTarget } | null>(null);
  const [activeSwipeTarget, setActiveSwipeTarget] = React.useState<SwipeTarget>(null);
  const SWIPE_THRESHOLD = 20;

  const canManageStock = currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Soignant' || currentUserProfile?.role === 'Agent Logistique';

  const isLoading = isItemsLoading || isStockLoading || isOrdersLoading || isWardsLoading;

  const consumptionData = React.useMemo(() => {
    if (isWardsLoading || !wards.length || isItemsLoading || !diapers.length) return {};
  
    const data: { [diaperId: string]: { weeklyNeed: number } } = {};
  
    for (const diaper of diapers) {
      let totalWeeklyNeedInPieces = 0;
  
      for (const ward of wards) {
        if (ward.parLevels && ward.parLevels[diaper.id]) {
          const parLevelQuantity = ward.parLevels[diaper.id];
          
          if (diaper.defaultUnit === 'cartons' && diaper.piecesPerCarton > 0) {
            totalWeeklyNeedInPieces += parLevelQuantity * diaper.piecesPerCarton;
          } else {
            totalWeeklyNeedInPieces += parLevelQuantity;
          }
        }
      }
      data[diaper.id] = { weeklyNeed: totalWeeklyNeedInPieces };
    }
    
    return data;
  }, [diapers, wards, isItemsLoading, isWardsLoading]);


  const stockWithDetails = React.useMemo(() => {
    if (isLoading || !diapers) return [];
    
    let filteredDiapers = diapers;
    
    const filterParam = searchParams.get('filter');
    if (filterParam === 'low') {
        filteredDiapers = diapers.filter(diaper => {
            if (!diaper.isActive) return false;
            const stockItem = stock.find(s => s.diaperId === diaper.id);
            const quantity = stockItem?.quantity || 0;
            return quantity < diaper.lowStockThreshold;
        });
    } else {
        filteredDiapers = diapers.filter(d => d.isActive);
    }


    return filteredDiapers.map(diaper => {
      const stockItem = stock.find(s => s.diaperId === diaper.id);
      const quantity = stockItem?.quantity || 0;
      const weeklyConsumption = consumptionData[diaper.id]?.weeklyNeed || 0;
      const coverageInWeeks = weeklyConsumption > 0 ? quantity / weeklyConsumption : Infinity;

      return { 
        diaperId: diaper.id,
        name: diaper.name, 
        quantity: quantity,
        piecesPerCarton: diaper.piecesPerCarton, 
        hexColor: diaper.hexColor,
        lowStockThreshold: diaper.lowStockThreshold,
        diaper: diaper,
        coverageInWeeks,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [stock, diapers, isLoading, searchParams, consumptionData]);

  const handleOpenDialog = (item: { diaper: Diaper, quantity: number }) => {
    setSelectedStockItem({ diaper: item.diaper, currentQuantity: item.quantity });
    if (item.diaper.piecesPerCarton > 0) {
        setCartons(Math.floor(item.quantity / item.diaper.piecesPerCarton));
        setPieces(item.quantity % item.diaper.piecesPerCarton);
    } else {
        setCartons(0);
        setPieces(item.quantity);
    }
    setIsDialogOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedStockItem) return;

    const newTotalQuantity = (cartons * (selectedStockItem.diaper.piecesPerCarton || 0)) + pieces;
    if (newTotalQuantity < 0) {
        toast({ title: 'Quantité invalide', description: 'La quantité ne peut pas être négative.', variant: 'destructive' });
        return;
    }
    
    setIsSaving(true);
    await manualStockUpdate(selectedStockItem.diaper.id, newTotalQuantity);
    setIsSaving(false);
    setIsDialogOpen(false);

    toast({
      title: 'Stock mis à jour',
      description: `La quantité pour ${selectedStockItem.diaper.name} est maintenant de ${newTotalQuantity} pièces.`,
    });
  };
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setSelectedStockItem(null);
      setCartons(0);
      setPieces(0);
    }
    setIsDialogOpen(open);
  }
  
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const targetElement = e.target as HTMLElement;
    const cartonDiv = targetElement.closest('[data-swipe-target="cartons"]');
    const piecesDiv = targetElement.closest('[data-swipe-target="pieces"]');
    let target: SwipeTarget = null;
    
    if (cartonDiv) target = 'cartons';
    else if (piecesDiv) target = 'pieces';
    
    if (target) {
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            lastUpdatedX: e.touches[0].clientX,
            target: target
        };
        setActiveSwipeTarget(target);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || !touchStartRef.current.target) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartRef.current.x;
    const deltaY = currentY - touchStartRef.current.y;
    
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      touchStartRef.current = null;
      setActiveSwipeTarget(null);
      return;
    }
    
    e.preventDefault();

    const movementSinceLastUpdate = currentX - touchStartRef.current.lastUpdatedX;
    const swipeTarget = touchStartRef.current.target;

    if (Math.abs(movementSinceLastUpdate) >= SWIPE_THRESHOLD) {
        const increments = Math.floor(movementSinceLastUpdate / SWIPE_THRESHOLD);
        
        if (swipeTarget === 'cartons') {
            setCartons(prev => Math.max(0, prev + increments));
        } else if (swipeTarget === 'pieces') {
            setPieces(prev => Math.max(0, prev + increments));
        }
        
        if (touchStartRef.current) {
            touchStartRef.current.lastUpdatedX = currentX;
        }
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    setActiveSwipeTarget(null);
  };
  
  const formatCoverage = (coverage: number) => {
    if (!isFinite(coverage)) return 'N/A';
    if (coverage < 10) return `~ ${coverage.toFixed(1)} sem.`;
    return `~ ${Math.round(coverage)} sem.`;
  };


  const renderDesktopView = () => (
    <div className="border rounded-lg overflow-x-auto">
        <Table>
        <TableHeader>
            <TableRow>
            <TableHead>Article</TableHead>
            <TableHead>Quantité (cartons)</TableHead>
            <TableHead>Couverture</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-[200px]">Niveau</TableHead>
            {canManageStock && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
        </TableHeader>
        <TableBody>
            {stockWithDetails.map(item => (
            <TableRow key={item.diaperId}>
                <TableCell className="font-medium flex items-center gap-2 whitespace-nowrap">
                    <div className="w-2 h-8 rounded-sm" style={{backgroundColor: item.hexColor}}/>
                    {item.name}
                </TableCell>
                <TableCell className="whitespace-nowrap font-semibold">{item.piecesPerCarton > 0 ? (item.quantity / item.piecesPerCarton).toFixed(1) : 'N/A'}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatCoverage(item.coverageInWeeks)}
                </TableCell>
                <TableCell>
                <Badge variant={getStockBadgeVariant(item.quantity, item.lowStockThreshold)}>
                    {getStockLabel(item.quantity, item.lowStockThreshold)}
                </Badge>
                </TableCell>
                <TableCell><Progress value={Math.min(100, (item.quantity / (item.lowStockThreshold * 5)) * 100)} className="w-full" /></TableCell>
                {canManageStock && <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(item)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Ajuster
                    </Button>
                </TableCell>}
            </TableRow>
            ))}
        </TableBody>
        </Table>
    </div>
  );

  const renderMobileView = () => (
    <div className="space-y-4">
      {stockWithDetails.map(item => (
        <Card key={item.diaperId}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="w-2 h-8 rounded-sm" style={{backgroundColor: item.hexColor}}/>
                    {item.name}
                </CardTitle>
                <Badge variant={getStockBadgeVariant(item.quantity, item.lowStockThreshold)}>{getStockLabel(item.quantity, item.lowStockThreshold)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm my-4">
                <div>
                    <p className="text-muted-foreground">Quantité (cartons)</p>
                    <p className="font-semibold text-lg">{item.piecesPerCarton > 0 ? (item.quantity / item.piecesPerCarton).toFixed(1) : 'N/A'}</p>
                </div>
                 <div>
                    <p className="text-muted-foreground flex items-center gap-1"> <CalendarClock className="h-4 w-4"/> Couverture</p>
                    <p className="font-semibold text-lg">{formatCoverage(item.coverageInWeeks)}</p>
                </div>
            </div>
            <Progress value={Math.min(100, (item.quantity / (item.lowStockThreshold * 5)) * 100)} className="w-full h-2 mb-4" />
            {canManageStock && <Button variant="outline" className="w-full" onClick={() => handleOpenDialog(item)}>
                <Edit className="mr-2 h-4 w-4" />
                Ajuster le stock
            </Button>}
          </CardContent>
        </Card>
      ))}
    </div>
  );


  return (
    <>
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Niveaux de Stock Actuels</CardTitle>
        <CardDescription>
          Aperçu en temps réel des quantités de chaque article. {canManageStock ? "Vous pouvez ajuster les quantités manuellement." : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : isMobile === undefined ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : isMobile ? renderMobileView() : renderDesktopView() }
      </CardContent>
    </Card>

     <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent 
            className="sm:max-w-md"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
          <DialogHeader>
            <DialogTitle>Ajuster le stock de "{selectedStockItem?.diaper.name}"</DialogTitle>
            <DialogDescription>
              Entrez la nouvelle quantité en cartons et/ou en pièces. La quantité totale sera calculée automatiquement.
            </DialogDescription>
          </DialogHeader>
          {selectedStockItem && (
            <div className="space-y-6 pt-4">
                <div className='text-center'>
                    <p className='text-sm text-muted-foreground'>Quantité actuelle</p>
                    <p className='text-2xl font-bold'>{selectedStockItem.currentQuantity.toLocaleString('fr-FR')} pièces</p>
                </div>

                <Separator />
                
                <div className="grid grid-cols-2 gap-4 items-end">
                    <div 
                        data-swipe-target="cartons"
                        className={cn("rounded-md p-2 -m-2 transition-colors space-y-1", activeSwipeTarget === 'cartons' && "bg-primary/10")}
                    >
                        <Label htmlFor="cartons">Cartons</Label>
                        <div className='flex items-center gap-1'>
                             <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={() => setCartons(c => Math.max(0, c - 1))}><Minus className="h-4 w-4" /></Button>
                             <Input
                                id="cartons"
                                type="number"
                                value={cartons}
                                onChange={(e) => setCartons(parseInt(e.target.value, 10) || 0)}
                                className="h-12 text-center text-xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                min="0"
                                disabled={!selectedStockItem.diaper.piecesPerCarton || selectedStockItem.diaper.piecesPerCarton === 0}
                            />
                             <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={() => setCartons(c => c + 1)}><Plus className="h-4 w-4" /></Button>
                        </div>
                    </div>
                    <div 
                        data-swipe-target="pieces"
                        className={cn("rounded-md p-2 -m-2 transition-colors space-y-1", activeSwipeTarget === 'pieces' && "bg-primary/10")}
                    >
                        <Label htmlFor="pieces">Pièces</Label>
                        <div className='flex items-center gap-1'>
                             <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={() => setPieces(p => Math.max(0, p - 1))}><Minus className="h-4 w-4" /></Button>
                            <Input
                                id="pieces"
                                type="number"
                                value={pieces}
                                onChange={(e) => setPieces(parseInt(e.target.value, 10) || 0)}
                                className="h-12 text-center text-xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                min="0"
                            />
                            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={() => setPieces(p => p + 1)}><Plus className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </div>
                {selectedStockItem.diaper.piecesPerCarton > 0 && 
                    <div className='text-center text-sm text-muted-foreground'>
                        Total : {(cartons * selectedStockItem.diaper.piecesPerCarton) + pieces} pièces
                    </div>
                }

            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Annuler</Button>
            </DialogClose>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
