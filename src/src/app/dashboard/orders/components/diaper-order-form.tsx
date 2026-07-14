'use client';

import * as React from 'react';
import type { Diaper, Ward } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, XCircle, Minus, Plus, Archive, AlertTriangle, Target, Calculator } from 'lucide-react';
import type { OrderState } from '../new/page';
import { useItems } from '../../settings/items-context';
import { useStock } from '../../stock/stock-context';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Custom sort order based on the user's form
const customSortOrder = [
  'FLEX JAUNE',
  'FLEX MAUVE',
  'ALEZE',
  'CELLULOSE',
  'MICRO',
  'MOBY (M)',
  'MOBY (L)',
  'MOBY (XL)',
  'CULOTTE BLEU (M)',
  'CULOTTE BRUN (L)',
  'CULOTTE VERT (XL)',
  'CULOTTE (XXL)',
  'CULOTTE (XXXL)',
  'COMPLET (M)',
  'COMPLET (L)',
  'COMPLET (XL)',
];

interface DiaperOrderFormProps {
    ward: Ward;
    orderState: OrderState;
    onOrderChange: (newState: OrderState) => void;
}

export default function DiaperOrderForm({ ward, orderState, onOrderChange }: DiaperOrderFormProps) {
  const { items: diapers, isLoading: isItemsLoading } = useItems();
  const { stock, isLoading: isStockLoading } = useStock();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentWardStock, setCurrentWardStock] = React.useState<Record<string, number>>({});
  
  // Set the default state of the par level switch
  const initialParLevelState = React.useMemo(() => {
    const state: Record<string, boolean> = {};
    if (ward.parLevels) {
      Object.keys(ward.parLevels).forEach(diaperId => {
        if ((ward.parLevels?.[diaperId] ?? 0) > 0) {
          state[diaperId] = true;
        }
      });
    }
    return state;
  }, [ward.parLevels]);
  const [useParLevel, setUseParLevel] = React.useState<Record<string, boolean>>(initialParLevelState);
  
  const touchStartRef = React.useRef<{ x: number, y: number, lastUpdatedX: number, diaperId: string } | null>(null);
  const [activeSwipeTarget, setActiveSwipeTarget] = React.useState<string | null>(null);
  const SWIPE_THRESHOLD = 20;

  const internalDispatch = (action: { type: 'SET_QUANTITY'; diaperId: string; quantity: number } | { type: 'SET_MODE'; diaperId: string; mode: 'pieces' | 'cartons' }) => {
    const { diaperId } = action;
    const newState = { ...orderState };
    if (action.type === 'SET_QUANTITY') {
        newState[diaperId] = { ...newState[diaperId], quantity: Math.max(0, action.quantity) };
    } else if (action.type === 'SET_MODE') {
        newState[diaperId] = { ...newState[diaperId], mode: action.mode };
    }
    onOrderChange(newState);
  };
  
  const handleUseParLevelToggle = (diaperId: string, checked: boolean) => {
    setUseParLevel(prev => ({...prev, [diaperId]: checked}));
    // If toggling off, clear the on-hand stock for that item and reset order quantity
    if (!checked) {
        setCurrentWardStock(prev => {
            const newStock = {...prev};
            delete newStock[diaperId];
            return newStock;
        });
        // Optionally, reset the ordered quantity to 0 or its previous manual value
        // For simplicity, let's reset to 0
        internalDispatch({ type: 'SET_QUANTITY', diaperId: diaperId, quantity: 0 });
    }
  }

  const handleCurrentStockChange = (diaperId: string, value: string) => {
    const onHand = parseInt(value, 10);
    const newCurrentStock = isNaN(onHand) ? 0 : onHand;
    
    setCurrentWardStock(prev => ({
        ...prev,
        [diaperId]: newCurrentStock
    }));

    const diaper = diapers.find(d => d.id === diaperId);
    if (!diaper) return;

    const parLevel = ward.parLevels?.[diaperId] ?? 0;
    if (parLevel > 0) {
        const needed = Math.max(0, parLevel - newCurrentStock);
        internalDispatch({ type: 'SET_QUANTITY', diaperId: diaperId, quantity: needed });
    }
  };
  
  const sortedAndFilteredDiapers = React.useMemo(() => {
    return diapers
      .filter(diaper => 
        diaper.isActive &&
        diaper.name && 
        diaper.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const nameA = a.name ? a.name.toUpperCase() : '';
        const nameB = b.name ? b.name.toUpperCase() : '';

        const indexA = customSortOrder.indexOf(nameA);
        const indexB = customSortOrder.indexOf(nameB);

        if (indexA === -1 && indexB === -1) return nameA.localeCompare(nameB);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
  }, [diapers, searchTerm]);

  const getStockForDiaper = (diaperId: string) => {
    const stockItem = stock.find(s => s.diaperId === diaperId);
    return stockItem?.quantity ?? 0;
  };
  
  const isLoading = isItemsLoading || isStockLoading;

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, diaperId: string) => {
    touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        lastUpdatedX: e.touches[0].clientX,
        diaperId
    };
    setActiveSwipeTarget(diaperId);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>, diaperId: string) => {
    if (!touchStartRef.current || touchStartRef.current.diaperId !== diaperId) return;
    
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

    if (Math.abs(movementSinceLastUpdate) >= SWIPE_THRESHOLD) {
        const increments = Math.floor(movementSinceLastUpdate / SWIPE_THRESHOLD);
        const currentItemState = orderState[diaperId];
        const newQuantity = (currentItemState.quantity || 0) + increments;
        
        internalDispatch({ type: 'SET_QUANTITY', diaperId: diaperId, quantity: newQuantity });
        
        if (touchStartRef.current) {
            touchStartRef.current.lastUpdatedX = currentX;
        }
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    setActiveSwipeTarget(null);
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
        <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                placeholder="Rechercher un article..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedAndFilteredDiapers.map((diaper) => {
                const itemState = orderState[diaper.id];
                if (!itemState) return null;

                const parLevel = ward.parLevels?.[diaper.id];
                const shouldShowParLevelSection = parLevel && parLevel > 0;
                const isUsingParLevel = shouldShowParLevelSection && useParLevel[diaper.id];
                
                const stockQuantity = getStockForDiaper(diaper.id);
                const orderedQuantityInPieces = itemState.mode === 'cartons' 
                    ? itemState.quantity * (diaper.piecesPerCarton || 1)
                    : itemState.quantity;
                const isStockExceeded = orderedQuantityInPieces > stockQuantity;
                const remainingStock = stockQuantity - orderedQuantityInPieces;

                return (
                    <Card
                      key={diaper.id}
                      className={cn(
                        "flex flex-col shadow-md border-2",
                        activeSwipeTarget === diaper.id && "ring-2 ring-primary",
                        isStockExceeded ? "border-destructive bg-destructive/10" : "border-transparent"
                      )}
                      onTouchStart={(e) => handleTouchStart(e, diaper.id)}
                      onTouchMove={(e) => handleTouchMove(e, diaper.id)}
                      onTouchEnd={handleTouchEnd}
                    >
                      <CardHeader className={cn("p-3 flex-row items-center justify-between space-x-3 rounded-t-lg")} style={{ backgroundColor: diaper.hexColor }}>
                          <CardTitle className="text-base font-bold text-white">{diaper.name}</CardTitle>
                           {shouldShowParLevelSection && (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                    <Target className="h-3 w-3"/>
                                    Besoin: {parLevel}
                                </Badge>
                           )}
                      </CardHeader>

                      <CardContent className="p-3 flex-grow flex flex-col justify-center gap-3">
                        {shouldShowParLevelSection && (
                            <div className="flex items-center space-x-2 border-b pb-3">
                                <Switch id={`par-level-switch-${diaper.id}`} checked={useParLevel[diaper.id]} onCheckedChange={(checked) => handleUseParLevelToggle(diaper.id, checked)}/>
                                <Label htmlFor={`par-level-switch-${diaper.id}`} className="text-xs flex items-center gap-1.5"><Calculator className="h-4 w-4"/> Calculer depuis le stock local</Label>
                            </div>
                        )}

                         {isUsingParLevel && (
                            <div className="space-y-1.5">
                                <Label htmlFor={`onhand-${diaper.id}`} className="text-xs text-muted-foreground">Stock Actuel (local)</Label>
                                <Input 
                                    id={`onhand-${diaper.id}`}
                                    type="number"
                                    placeholder="Quantité en local"
                                    className="h-9 text-center"
                                    value={currentWardStock[diaper.id] || ''}
                                    onChange={(e) => handleCurrentStockChange(diaper.id, e.target.value)}
                                />
                            </div>
                         )}

                         <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-2">
                                <Label htmlFor={`mode-${diaper.id}`} className={cn("text-xs font-medium", itemState.mode === 'cartons' && 'text-muted-foreground')}>Pièces</Label>
                                <Switch
                                    id={`mode-${diaper.id}`}
                                    checked={itemState.mode === 'cartons'}
                                    onCheckedChange={(checked) => internalDispatch({ type: 'SET_MODE', diaperId: diaper.id, mode: checked ? 'cartons' : 'pieces' })}
                                    aria-label={`Switch to ${itemState.mode === 'pieces' ? 'cartons' : 'pièces'}`}
                                />
                                <Label htmlFor={`mode-${diaper.id}`} className={cn("text-xs font-medium", itemState.mode === 'pieces' && 'text-muted-foreground')}>Cartons</Label>
                            </div>
                           
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={() => internalDispatch({ type: 'SET_QUANTITY', diaperId: diaper.id, quantity: itemState.quantity - 1 })}><Minus className="h-4 w-4" /></Button>
                                <Input
                                    id={`quantity-${ward.id}-${diaper.id}`}
                                    type="number"
                                    className="w-14 h-9 text-center text-lg font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={itemState.quantity === 0 ? '' : itemState.quantity}
                                    onChange={(e) => internalDispatch({ type: 'SET_QUANTITY', diaperId: diaper.id, quantity: parseInt(e.target.value) || 0 })}
                                    min="0"
                                    placeholder="0"
                                />
                                <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={() => internalDispatch({ type: 'SET_QUANTITY', diaperId: diaper.id, quantity: itemState.quantity + 1 })}><Plus className="h-4 w-4" /></Button>
                            </div>
                        </div>
                      </CardContent>
                      <CardFooter className={cn(
                          "p-2 border-t",
                           isStockExceeded ? "bg-destructive/20" : "bg-muted/50"
                        )}>
                          {isStockExceeded ? (
                            <div className="flex items-center gap-2 text-xs text-destructive font-semibold w-full justify-center">
                               <AlertTriangle className="h-4 w-4" />
                               <span>Stock total restant: {remainingStock.toLocaleString('fr-FR')}</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground w-full justify-center text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <Archive className="h-3 w-3" />
                                    <span>Stock total: {stockQuantity.toLocaleString('fr-FR')}</span>
                                </div>
                                <div className="flex items-center justify-center gap-1 font-medium text-foreground">
                                    <span>Restant: {remainingStock.toLocaleString('fr-FR')}</span>
                                </div>
                            </div>
                          )}
                      </CardFooter>
                    </Card>
                );
            })}
        </div>
       {sortedAndFilteredDiapers.length === 0 && searchTerm && (
        <div className="text-center text-muted-foreground col-span-full py-10">
          <XCircle className="mx-auto h-12 w-12" />
          <p className="mt-4 font-semibold">Aucun article trouvé</p>
          <p className="text-sm">Votre recherche pour "{searchTerm}" n'a donné aucun résultat.</p>
        </div>
      )}
    </div>
  );
}
