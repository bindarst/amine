
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { DeliveryItem, Diaper } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Minus, Plus, Trash2, Search, XCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDeliveries } from '../deliveries-context';
import { useRouter } from 'next/navigation';
import { useItems } from '../../settings/items-context';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useStock } from '../../stock/stock-context';
import { useSuppliers } from '../../settings/suppliers-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUsers } from '../../settings/users-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import ScanDeliveryDocument from '../components/scan-delivery-document';

type DeliveryState = {
  [diaperId: string]: {
    cartons: number;
    pieces: number;
  };
};

type SwipeTarget = 'cartons' | 'pieces' | null;

const generateInitialState = (diapers: Diaper[]) => {
  return diapers.reduce((acc, diaper) => {
    acc[diaper.id] = { cartons: 0, pieces: 0 };
    return acc;
  }, {} as DeliveryState);
}

export default function NewDeliveryPage() {
  const { items: diapers, isLoading: isLoadingItems } = useItems();
  const { stock: currentStock, isLoading: isLoadingStock, updateStock } = useStock();
  const { suppliers, isLoading: isLoadingSuppliers } = useSuppliers();
  const { addDelivery } = useDeliveries();
  const { toast } = useToast();
  const router = useRouter();
  const { currentUserProfile } = useUsers();

  const [deliveryState, setDeliveryState] = React.useState<DeliveryState>({});
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedSupplier, setSelectedSupplier] = React.useState<string | undefined>();

  const touchStartRef = React.useRef<{ x: number, y: number, lastUpdatedX: number, target: SwipeTarget } | null>(null);
  const [activeSwipeTarget, setActiveSwipeTarget] = React.useState<string | null>(null);
  const SWIPE_THRESHOLD = 20;

  const activeItems = React.useMemo(() => diapers.filter(i => i.isActive), [diapers]);
  const canManageDeliveries = currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Soignant' || currentUserProfile?.role === 'Agent Logistique';

  React.useEffect(() => {
    if (diapers.length > 0) {
      setDeliveryState(generateInitialState(diapers));
    }
  }, [diapers]);

  React.useEffect(() => {
    if (suppliers.length > 0) {
      const defaultSupplier = suppliers.find(s => s.isDefault);
      setSelectedSupplier(defaultSupplier?.name || suppliers[0]?.name);
    }
  }, [suppliers]);

  const handleDeliverySubmit = async () => {
    if (!canManageDeliveries) {
      toast({ title: "Accès refusé", description: "Vous n'avez pas les permissions pour enregistrer une livraison.", variant: "destructive" });
      return;
    }

    if (!selectedSupplier) {
      toast({
        title: "Aucun fournisseur sélectionné",
        description: "Veuillez choisir un fournisseur avant de valider.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);

    const deliveryItemsForDb: DeliveryItem[] = [];

    for (const diaperId in deliveryState) {
      const { cartons, pieces } = deliveryState[diaperId];
      const diaper = diapers.find(d => d.id === diaperId);

      if ((cartons > 0 || pieces > 0) && diaper) {
        const totalPieces = (cartons * (diaper.piecesPerCarton || 0)) + pieces;

        if (totalPieces > 0) {
          deliveryItemsForDb.push({ diaperId, quantity: totalPieces, unit: 'pieces' });
        }
      }
    }


    if (deliveryItemsForDb.length === 0) {
      toast({
        title: "Livraison Vide",
        description: "Veuillez ajouter au moins un article avant de soumettre.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    await addDelivery({
      date: new Date().toISOString(),
      supplier: selectedSupplier,
      items: deliveryItemsForDb,
    });

    await updateStock(deliveryItemsForDb);

    toast({
      title: "Livraison Enregistrée!",
      description: `La livraison a bien été enregistrée et le stock a été mis à jour.`,
    });

    router.push('/dashboard/deliveries');
  };

  const updateDeliveryState = (diaperId: string, newDiaperState: { cartons: number, pieces: number }) => {
    setDeliveryState(prevState => ({
      ...prevState,
      [diaperId]: newDiaperState,
    }));
  };

  const isDeliveryEmpty = () => {
    return Object.values(deliveryState).every(item => item.cartons === 0 && item.pieces === 0);
  };

  const filteredDiapers = activeItems.filter(diaper =>
    diaper.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, diaperId: string) => {
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
      setActiveSwipeTarget(`${diaperId}-${target}`);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>, diaperId: string) => {
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
      const currentItemState = deliveryState[diaperId];
      const newQuantity = (currentItemState[swipeTarget] || 0) + increments;

      updateDeliveryState(diaperId, {
        ...currentItemState,
        [swipeTarget]: Math.max(0, newQuantity)
      });

      if (touchStartRef.current) {
        touchStartRef.current.lastUpdatedX = currentX;
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    setActiveSwipeTarget(null);
  };

  const isLoading = isLoadingItems || isLoadingSuppliers || Object.keys(deliveryState).length === 0 || isLoadingStock;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManageDeliveries) {
    return (
      <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>Accès non autorisé</AlertTitle>
        <AlertDescription>Vous ne disposez pas des autorisations nécessaires pour accéder à cette page.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-headline break-words font-bold">
            Enregistrer une Nouvelle Livraison
          </h1>
          <p className="text-muted-foreground">
            Renseignez les quantités reçues pour chaque article pour mettre le stock à jour.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 pt-6 border-t">
          <div className="space-y-2">
            <Label htmlFor="supplier-select">Fournisseur / Livreur</Label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger id="supplier-select">
                <SelectValue placeholder="Sélectionnez un fournisseur..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="search-input">Rechercher un article manuellement</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="search-input"
                placeholder="Filtrer les articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* AI Scanner Section */}
        <div className="flex justify-center py-4">
          <ScanDeliveryDocument
            items={activeItems}
            onDataExtracted={(scannedData) => {
              // Merge scanned data with existing state
              setDeliveryState(prevState => ({
                ...prevState,
                ...scannedData
              }));
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDiapers.map((diaper) => {
            const itemState = deliveryState[diaper.id];
            if (!itemState) return null;

            const totalPieces = (itemState.cartons * (diaper.piecesPerCarton || 0)) + itemState.pieces;

            // Create gradient based on the item's hex color
            const baseColor = diaper.hexColor;
            const gradientStyle = {
              background: `linear-gradient(135deg, ${baseColor} 0%, ${baseColor}dd 100%)`,
            };

            return (
              <div
                key={diaper.id}
                className="rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-300 flex flex-col border border-border/50 overflow-hidden"
                onTouchStart={(e) => handleTouchStart(e, diaper.id)}
                onTouchMove={(e) => handleTouchMove(e, diaper.id)}
                onTouchEnd={handleTouchEnd}
              >
                {/* Gradient Header */}
                <div
                  className="p-4 flex items-center justify-between relative overflow-hidden"
                  style={gradientStyle}
                >
                  {/* Subtle pattern overlay */}
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)',
                    backgroundSize: '30px 30px'
                  }} />

                  <span className="font-bold text-lg text-white drop-shadow-sm relative z-10">{diaper.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all relative z-10"
                    onClick={() => updateDeliveryState(diaper.id, { cartons: 0, pieces: 0 })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="p-4 bg-card flex-grow flex flex-col justify-between">
                  <div className="flex flex-col gap-4">
                    <div
                      data-swipe-target="cartons"
                      className={cn("rounded-xl p-3 -m-1 transition-all duration-200", activeSwipeTarget === `${diaper.id}-cartons` && "bg-primary/10 shadow-inner")}
                    >
                      <Label htmlFor={`cartons-${diaper.id}`} className="text-sm font-medium">Cartons</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0 rounded-full hover:scale-105 transition-transform"
                          onClick={() => updateDeliveryState(diaper.id, { ...itemState, cartons: Math.max(0, itemState.cartons - 1) })}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          id={`cartons-${diaper.id}`}
                          type="number"
                          className="h-14 text-center text-2xl font-bold rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-background/50"
                          value={itemState.cartons}
                          onChange={(e) => updateDeliveryState(diaper.id, { ...itemState, cartons: parseInt(e.target.value) || 0 })}
                          min="0"
                          disabled={!diaper.piecesPerCarton || diaper.piecesPerCarton === 0}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0 rounded-full hover:scale-105 transition-transform"
                          onClick={() => updateDeliveryState(diaper.id, { ...itemState, cartons: itemState.cartons + 1 })}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <Separator className="my-1" />

                    <div
                      data-swipe-target="pieces"
                      className={cn("rounded-xl p-3 -m-1 transition-all duration-200", activeSwipeTarget === `${diaper.id}-pieces` && "bg-primary/10 shadow-inner")}
                    >
                      <Label htmlFor={`pieces-${diaper.id}`} className="text-sm font-medium">Pièces</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0 rounded-full hover:scale-105 transition-transform"
                          onClick={() => updateDeliveryState(diaper.id, { ...itemState, pieces: Math.max(0, itemState.pieces - 1) })}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          id={`pieces-${diaper.id}`}
                          type="number"
                          className="h-14 text-center text-2xl font-bold rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-background/50"
                          value={itemState.pieces}
                          onChange={(e) => updateDeliveryState(diaper.id, { ...itemState, pieces: parseInt(e.target.value) || 0 })}
                          min="0"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0 rounded-full hover:scale-105 transition-transform"
                          onClick={() => updateDeliveryState(diaper.id, { ...itemState, pieces: itemState.pieces + 1 })}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer with total */}
                <div className="p-4 mt-auto rounded-b-2xl bg-gradient-to-br from-muted/30 to-muted/60 border-t backdrop-blur-sm">
                  <div className="w-full">
                    <p className="font-bold text-xl text-center bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      Total: {totalPieces.toLocaleString('fr-FR')} pièces
                    </p>
                    {itemState.cartons > 0 && diaper.piecesPerCarton > 0 &&
                      <p className="text-xs text-center text-muted-foreground mt-1">({itemState.cartons} × {diaper.piecesPerCarton}p + {itemState.pieces}p)</p>
                    }
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {filteredDiapers.length === 0 && searchTerm && (
          <div className="text-center text-muted-foreground col-span-full py-10">
            <XCircle className="mx-auto h-12 w-12" />
            <p className="mt-4 font-semibold">Aucun article trouvé</p>
            <p className="text-sm">Votre recherche pour "{searchTerm}" n'a donné aucun résultat.</p>
          </div>
        )}
        <div className="flex justify-end pt-8 mt-8 border-t">
          <Button size="lg" onClick={handleDeliverySubmit} disabled={isDeliveryEmpty() || isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
            Valider la Livraison
          </Button>
        </div>
      </div>
    </div>
  );
}


