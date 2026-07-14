
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
import { Barcode, Camera, Send, Loader2, Minus, Plus, Trash2, Search, XCircle, Info, ArrowLeft, Package, Sparkles, TrendingUp, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
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
  const [barcodeValue, setBarcodeValue] = React.useState('');
  const [scannedItemId, setScannedItemId] = React.useState<string | null>(null);
  const [isBarcodeScanning, setIsBarcodeScanning] = React.useState(false);
  const [barcodeScannerError, setBarcodeScannerError] = React.useState('');
  const barcodeVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const barcodeStreamRef = React.useRef<MediaStream | null>(null);
  const barcodeTimerRef = React.useRef<number | null>(null);

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

  const stopBarcodeScanner = React.useCallback(() => {
    if (barcodeTimerRef.current) {
      window.clearInterval(barcodeTimerRef.current);
      barcodeTimerRef.current = null;
    }
    barcodeStreamRef.current?.getTracks().forEach((track) => track.stop());
    barcodeStreamRef.current = null;
    setIsBarcodeScanning(false);
  }, []);

  React.useEffect(() => stopBarcodeScanner, [stopBarcodeScanner]);

  const findItemByBarcode = React.useCallback((code: string) => {
    const normalizedCode = code.trim();
    return activeItems.find((item) => item.barcode === normalizedCode || item.code === normalizedCode) || null;
  }, [activeItems]);

  const applyBarcode = React.useCallback((code: string) => {
    const item = findItemByBarcode(code);
    setBarcodeValue(code);

    if (!item) {
      setScannedItemId(null);
      toast({
        title: 'Code inconnu',
        description: "Aucun article n'est lie a ce code-barres. Configurez-le dans Parametres > Codes-barres.",
        variant: 'destructive',
      });
      return;
    }

    setScannedItemId(item.id);
    setSearchTerm(item.name);
    toast({
      title: 'Article reconnu',
      description: `${item.name} est pret a etre encode en cartons ou en pieces.`,
    });
  }, [findItemByBarcode, toast]);

  const startBarcodeScanner = async () => {
    setBarcodeScannerError('');
    if (!('BarcodeDetector' in window)) {
      setBarcodeScannerError("Le scan camera n'est pas supporte par ce navigateur. Encodez le code manuellement.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      barcodeStreamRef.current = stream;
      setIsBarcodeScanning(true);

      if (barcodeVideoRef.current) {
        barcodeVideoRef.current.srcObject = stream;
        await barcodeVideoRef.current.play();
      }

      const BarcodeDetectorCtor = (window as any).BarcodeDetector;
      const detector = new BarcodeDetectorCtor({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf'],
      });

      barcodeTimerRef.current = window.setInterval(async () => {
        if (!barcodeVideoRef.current) return;
        const codes = await detector.detect(barcodeVideoRef.current);
        if (codes.length > 0) {
          const rawValue = String(codes[0].rawValue || '').trim();
          if (rawValue) {
            stopBarcodeScanner();
            applyBarcode(rawValue);
          }
        }
      }, 500);
    } catch (error) {
      console.error(error);
      setBarcodeScannerError("Impossible d'ouvrir la camera. Verifiez l'autorisation camera ou encodez le code manuellement.");
      stopBarcodeScanner();
    }
  };

  const addScannedQuantity = (target: 'cartons' | 'pieces') => {
    if (!scannedItemId) return;
    const currentItemState = deliveryState[scannedItemId];
    if (!currentItemState) return;
    updateDeliveryState(scannedItemId, {
      ...currentItemState,
      [target]: currentItemState[target] + 1,
    });
  };

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

  const getTotalItemsCount = () => {
    return Object.values(deliveryState).filter(item => item.cartons > 0 || item.pieces > 0).length;
  };

  const getTotalPiecesCount = () => {
    return Object.entries(deliveryState).reduce((total, [diaperId, state]) => {
      const diaper = diapers.find(d => d.id === diaperId);
      if (diaper) {
        return total + (state.cartons * (diaper.piecesPerCarton || 0)) + state.pieces;
      }
      return total;
    }, 0);
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
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <div className="relative">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <div className="absolute inset-0 animate-ping opacity-20">
            <Loader2 className="h-16 w-16 text-primary" />
          </div>
        </div>
        <p className="text-muted-foreground font-medium">Chargement...</p>
      </div>
    );
  }

  if (!canManageDeliveries) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>Accès non autorisé</AlertTitle>
          <AlertDescription>Vous ne disposez pas des autorisations nécessaires pour accéder à cette page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Premium Header with Glassmorphism */}
        <div className="relative overflow-hidden rounded-3xl">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/90 via-purple-600/90 to-fuchsia-600/90 dark:from-violet-950/90 dark:via-purple-950/90 dark:to-fuchsia-950/90" />

          {/* Animated mesh gradient */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.3),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.3),transparent_50%)]" />
          </div>

          {/* Glassmorphism layer */}
          <div className="absolute inset-0 backdrop-blur-xl bg-gradient-to-b from-white/10 to-white/5 dark:from-white/5 dark:to-white/5" />

          {/* Content */}
          <div className="relative p-6 sm:p-8">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4 text-white/90 hover:text-white hover:bg-white/20 transition-all"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>

            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
                    <Package className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">
                    Nouvelle Livraison
                  </h1>
                </div>
                <p className="text-white/90 text-lg mt-2 max-w-2xl">
                  Enregistrez les quantités reçues pour mettre à jour votre stock automatiquement
                </p>
              </div>

              {/* Stats badges */}
              {!isDeliveryEmpty() && (
                <div className="flex gap-3">
                  <div className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                    <div className="text-white/80 text-xs font-medium">Articles</div>
                    <div className="text-white text-2xl font-bold">{getTotalItemsCount()}</div>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                    <div className="text-white/80 text-xs font-medium">Pièces</div>
                    <div className="text-white text-2xl font-bold">{getTotalPiecesCount().toLocaleString('fr-FR')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom shine */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </div>

        {/* Controls Section with Premium Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Supplier Select */}
          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
            <CardContent className="p-4">
              <Label htmlFor="supplier-select" className="text-sm font-semibold flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                Fournisseur / Livreur
              </Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger id="supplier-select" className="h-11 border-2 focus:border-primary">
                  <SelectValue placeholder="Sélectionnez un fournisseur..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Search */}
          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
            <CardContent className="p-4">
              <Label htmlFor="search-input" className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Search className="h-4 w-4 text-primary" />
                Rechercher un article
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-input"
                  placeholder="Filtrer les articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 border-2 focus:border-primary"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 space-y-3">
              <Label htmlFor="barcode-input" className="text-sm font-semibold flex items-center gap-2">
                <Barcode className="h-4 w-4 text-primary" />
                Code-barres
              </Label>
              <div className="flex gap-2">
                <Input
                  id="barcode-input"
                  value={barcodeValue}
                  onChange={(event) => setBarcodeValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') applyBarcode(barcodeValue);
                  }}
                  placeholder="Scanner ou encoder..."
                  className="h-11 border-2 focus:border-primary"
                />
                <Button type="button" variant="outline" onClick={() => applyBarcode(barcodeValue)}>
                  OK
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={startBarcodeScanner} disabled={isBarcodeScanning}>
                  <Camera className="mr-2 h-4 w-4" />
                  Scanner
                </Button>
                {isBarcodeScanning && (
                  <Button type="button" size="sm" variant="outline" onClick={stopBarcodeScanner}>
                    <X className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                )}
              </div>
              {barcodeScannerError && <p className="text-sm text-destructive">{barcodeScannerError}</p>}
              {isBarcodeScanning && (
                <div className="rounded-lg overflow-hidden border bg-black">
                  <video ref={barcodeVideoRef} className="h-40 w-full object-cover" muted playsInline />
                </div>
              )}
              {scannedItemId && (
                <div className="rounded-lg border bg-primary/5 p-3 space-y-2">
                  <p className="text-sm font-semibold">
                    {activeItems.find((item) => item.id === scannedItemId)?.name}
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => addScannedQuantity('cartons')}>
                      +1 carton
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => addScannedQuantity('pieces')}>
                      +1 piece
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Scanner - Premium highlight */}
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5 hover:border-primary/50 transition-all duration-300 hover:shadow-lg sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 flex items-center justify-center h-full">
              <ScanDeliveryDocument
                items={activeItems}
                onDataExtracted={(scannedData) => {
                  setDeliveryState(prevState => ({
                    ...prevState,
                    ...scannedData
                  }));
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDiapers.map((diaper) => {
            const itemState = deliveryState[diaper.id];
            if (!itemState) return null;

            const totalPieces = (itemState.cartons * (diaper.piecesPerCarton || 0)) + itemState.pieces;
            const hasQuantity = itemState.cartons > 0 || itemState.pieces > 0;

            return (
              <div
                key={diaper.id}
                className={cn(
                  "group relative rounded-2xl transition-all duration-300 overflow-hidden",
                  "bg-card border-2",
                  hasQuantity
                    ? "border-primary/50 shadow-lg shadow-primary/10 scale-[1.02]"
                    : "border-border/50 hover:border-border hover:shadow-md"
                )}
                onTouchStart={(e) => handleTouchStart(e, diaper.id)}
                onTouchMove={(e) => handleTouchMove(e, diaper.id)}
                onTouchEnd={handleTouchEnd}
              >
                {/* Colored Header with Gradient */}
                <div
                  className="relative p-4 overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${diaper.hexColor} 0%, ${diaper.hexColor}dd 100%)`
                  }}
                >
                  {/* Subtle pattern */}
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }} />

                  <div className="relative flex items-center justify-between">
                    <span className="font-bold text-lg text-white drop-shadow-md">{diaper.name}</span>

                    {hasQuantity && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-all h-8 w-8"
                        onClick={() => updateDeliveryState(diaper.id, { cartons: 0, pieces: 0 })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Active indicator */}
                  {hasQuantity && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 rounded-full bg-white shadow-lg animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Cartons */}
                  <div
                    data-swipe-target="cartons"
                    className={cn(
                      "rounded-xl p-3 transition-all duration-200",
                      activeSwipeTarget === `${diaper.id}-cartons` && "bg-primary/10 ring-2 ring-primary/20"
                    )}
                  >
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cartons</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full hover:scale-110 transition-transform"
                        onClick={() => updateDeliveryState(diaper.id, { ...itemState, cartons: Math.max(0, itemState.cartons - 1) })}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <Input
                        type="number"
                        className="h-12 text-center text-xl font-bold rounded-xl bg-muted/50 border-2 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={itemState.cartons}
                        onChange={(e) => updateDeliveryState(diaper.id, { ...itemState, cartons: parseInt(e.target.value) || 0 })}
                        min="0"
                        disabled={!diaper.piecesPerCarton || diaper.piecesPerCarton === 0}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full hover:scale-110 transition-transform"
                        onClick={() => updateDeliveryState(diaper.id, { ...itemState, cartons: itemState.cartons + 1 })}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Pieces */}
                  <div
                    data-swipe-target="pieces"
                    className={cn(
                      "rounded-xl p-3 transition-all duration-200",
                      activeSwipeTarget === `${diaper.id}-pieces` && "bg-primary/10 ring-2 ring-primary/20"
                    )}
                  >
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pièces</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full hover:scale-110 transition-transform"
                        onClick={() => updateDeliveryState(diaper.id, { ...itemState, pieces: Math.max(0, itemState.pieces - 1) })}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <Input
                        type="number"
                        className="h-12 text-center text-xl font-bold rounded-xl bg-muted/50 border-2 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={itemState.pieces}
                        onChange={(e) => updateDeliveryState(diaper.id, { ...itemState, pieces: parseInt(e.target.value) || 0 })}
                        min="0"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full hover:scale-110 transition-transform"
                        onClick={() => updateDeliveryState(diaper.id, { ...itemState, pieces: itemState.pieces + 1 })}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Footer with Total - Premium gradient */}
                <div className="p-4 bg-gradient-to-br from-muted/50 to-muted/30 border-t-2 border-border/50">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Total</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      {totalPieces.toLocaleString('fr-FR')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">pièces</p>
                    {itemState.cartons > 0 && diaper.piecesPerCarton > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ({itemState.cartons} × {diaper.piecesPerCarton}p + {itemState.pieces}p)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredDiapers.length === 0 && searchTerm && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
              <XCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold mb-1">Aucun article trouvé</p>
            <p className="text-sm text-muted-foreground">Votre recherche pour "{searchTerm}" n'a donné aucun résultat.</p>
          </div>
        )}

        {/* Submit Button - Premium floating */}
        <div className="sticky bottom-4 z-10">
          <div className="max-w-md mx-auto">
            <Button
              size="lg"
              onClick={handleDeliverySubmit}
              disabled={isDeliveryEmpty() || isSubmitting}
              className={cn(
                "w-full h-14 text-lg font-semibold rounded-2xl shadow-lg transition-all duration-300",
                !isDeliveryEmpty() && "animate-pulse-subtle shadow-primary/30"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Valider la Livraison
                  {!isDeliveryEmpty() && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                      {getTotalItemsCount()}
                    </span>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes pulse-subtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
