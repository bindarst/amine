
'use client';

import * as React from 'react';
import DiaperOrderForm from '../components/diaper-order-form';
import type { Diaper, Ward, WardOrder } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Info, MessageSquare, Trash2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useOrders } from '../orders-context';
import { useRouter } from 'next/navigation';
import { useItems } from '../../settings/items-context';
import { useWards } from '../../settings/wards-context';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

export type OrderState = {
  [diaperId: string]: {
    quantity: number;
    mode: 'pieces' | 'cartons';
  };
};

export type MultiWardOrderState = {
  [wardId: string]: OrderState;
};

const generateInitialState = (diapers: Diaper[], wards: Ward[]) => {
  const initialOrderState = diapers.reduce((acc, diaper) => {
    acc[diaper.id] = { quantity: 0, mode: diaper.defaultUnit };
    return acc;
  }, {} as OrderState);

  return wards.reduce((acc, ward) => {
    acc[ward.id] = JSON.parse(JSON.stringify(initialOrderState)); // Deep copy
    return acc;
  }, {} as MultiWardOrderState);
}


export default function NewOrderPage() {
  const { items: diapers, isLoading: isLoadingItems } = useItems();
  const { wards, isLoading: isLoadingWards } = useWards();
  const [multiWardOrderState, setMultiWardOrderState] = React.useState<MultiWardOrderState>({});
  const { toast } = useToast();
  const { addOrder, orders } = useOrders();
  const router = useRouter();
  const isMobile = useIsMobile();

  const activeWards = React.useMemo(() => wards.filter(w => w.isActive), [wards]);
  const activeItems = React.useMemo(() => diapers.filter(i => i.isActive), [diapers]);

  const [selectedWardId, setSelectedWardId] = React.useState<string | undefined>();
  const [comment, setComment] = React.useState('');

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [isDuplicated, setIsDuplicated] = React.useState(false);


  React.useEffect(() => {
    if (activeItems.length > 0 && activeWards.length > 0 && !hasLoaded) {
      const duplicatedOrderData = localStorage.getItem('duplicatedOrder');
      const inProgressOrderData = localStorage.getItem('inProgressOrder');

      let initialStateLoaded = false;
      if (duplicatedOrderData) {
        try {
          const parsedData = JSON.parse(duplicatedOrderData);
          if (parsedData.state) {
            setMultiWardOrderState(parsedData.state);
            setComment(parsedData.comment || '');
            setIsDuplicated(true);
            initialStateLoaded = true;
          }
          // Important: clear it after loading so it doesn't get reloaded
          localStorage.removeItem('duplicatedOrder');
        } catch (error) {
          console.error("Failed to parse duplicated order data", error);
        }
      } else if (inProgressOrderData) {
        try {
          const parsedData = JSON.parse(inProgressOrderData);
          if (parsedData.state) {
            setMultiWardOrderState(parsedData.state || {});
            setComment(parsedData.comment || '');
            initialStateLoaded = true;
          }
        } catch (error) {
          console.error("Failed to parse in-progress order data", error);
        }
      }

      if (!initialStateLoaded) {
        setMultiWardOrderState(generateInitialState(activeItems, activeWards));
      }
      setHasLoaded(true);
    }
  }, [activeItems, activeWards, hasLoaded]);

  React.useEffect(() => {
    if (!selectedWardId && activeWards.length > 0) {
      setSelectedWardId(activeWards[0].id);
    }
  }, [activeWards, selectedWardId]);

  const isOrderEmpty = React.useCallback(() => {
    if (!multiWardOrderState || Object.keys(multiWardOrderState).length === 0) return true;
    return Object.values(multiWardOrderState).every(wardOrder =>
      Object.values(wardOrder).every(item => item.quantity === 0)
    );
  }, [multiWardOrderState]);

  // Save draft on change
  React.useEffect(() => {
    if (hasLoaded && !isOrderEmpty()) {
      const draft = {
        state: multiWardOrderState,
        comment: comment,
      };
      localStorage.setItem('inProgressOrder', JSON.stringify(draft));
    } else if (hasLoaded) {
      localStorage.removeItem('inProgressOrder');
    }
  }, [multiWardOrderState, comment, hasLoaded, isOrderEmpty]);


  const handleOrderSubmit = async () => {
    setIsSubmitting(true);
    const wardOrders: WardOrder[] = Object.entries(multiWardOrderState)
      .map(([wardId, wardOrderState]) => {
        const items = Object.entries(wardOrderState)
          .filter(([, value]) => value.quantity > 0)
          .map(([diaperId, value]) => ({
            diaperId,
            quantity: value.quantity,
            unit: value.mode,
          }));

        if (items.length > 0) {
          return { wardId, items };
        }
        return null;
      })
      .filter((wardOrder): wardOrder is WardOrder => wardOrder !== null);

    if (wardOrders.length > 0) {
      addOrder({
        date: new Date().toISOString(),
        status: 'confirmed',
        wardOrders: wardOrders,
        comment: comment.trim(),
      }, diapers, activeWards);

      localStorage.removeItem('inProgressOrder');
      window.dispatchEvent(new StorageEvent('storage', { key: 'inProgressOrder', newValue: null }));

      toast({
        title: navigator.onLine ? "Demande envoyée" : "Demande conservée hors ligne",
        description: navigator.onLine
          ? "La commande groupée a bien été transmise."
          : "Elle sera synchronisée automatiquement au retour de la connexion.",
      });

      router.push('/dashboard/orders');
    } else {
      toast({
        title: "Commande Vide",
        description: "Veuillez ajouter au moins un article avant de soumettre.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = () => {
    localStorage.removeItem('inProgressOrder');
    window.dispatchEvent(new StorageEvent('storage', { key: 'inProgressOrder', newValue: null }));

    setMultiWardOrderState(generateInitialState(activeItems, activeWards));
    setComment('');
    setIsDuplicated(false);
    toast({
      title: "Commande annulée",
      description: "Le formulaire a été vidé."
    });
  }

  const updateWardOrder = (wardId: string, newOrderState: OrderState) => {
    setMultiWardOrderState(prevState => ({
      ...prevState,
      [wardId]: newOrderState,
    }));
  };

  const isLoading = isLoadingItems || isLoadingWards || !hasLoaded;

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-primary border-r-secondary animate-spin" />
          <Send className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Préparation du formulaire...</p>
      </div>
    );
  }

  const isPrerequisitesMissing = activeWards.length === 0 || activeItems.length === 0;

  const selectedWard = activeWards.find(w => w.id === selectedWardId);

  const renderMobileView = () => {
    if (isMobile === undefined) return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
    if (!isMobile) return null;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ward-select">Étage / Cantou</Label>
          <Select value={selectedWardId} onValueChange={setSelectedWardId}>
            <SelectTrigger id="ward-select">
              <SelectValue placeholder="Sélectionnez un étage..." />
            </SelectTrigger>
            <SelectContent>
              {activeWards.map(ward => (
                <SelectItem key={ward.id} value={ward.id}>{ward.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedWard && multiWardOrderState[selectedWard.id] && (
          <DiaperOrderForm
            key={selectedWard.id}
            ward={selectedWard}
            orderState={multiWardOrderState[selectedWard.id]}
            onOrderChange={(newOrder) => updateWardOrder(selectedWard.id, newOrder)}
          />
        )}
      </div>
    );
  };

  const renderDesktopView = () => {
    if (isMobile === undefined) return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
    if (isMobile) return null;

    return (
      <Tabs defaultValue={selectedWardId} onValueChange={setSelectedWardId} className="w-full">
        <TabsList className="h-auto flex-wrap justify-start">
          {activeWards.map(ward => (
            <TabsTrigger key={ward.id} value={ward.id}>{ward.name}</TabsTrigger>
          ))}
        </TabsList>
        {activeWards.map(ward => (
          multiWardOrderState[ward.id] && (
            <TabsContent key={ward.id} value={ward.id}>
              <DiaperOrderForm
                ward={ward}
                orderState={multiWardOrderState[ward.id]}
                onOrderChange={(newOrder) => updateWardOrder(ward.id, newOrder)}
              />
            </TabsContent>
          )
        ))}
      </Tabs>
    );
  };


  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header avec effet gradient */}
      <div className="space-y-3 relative">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="relative pl-0 text-muted-foreground hover:text-foreground transition-colors group mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Retour
        </Button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl border bg-muted">
            <Send className="h-7 w-7 text-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Nouvelle Commande
          </h1>
        </div>
        <p className="text-base text-muted-foreground relative">
          Remplissez les quantités pour chaque article et chaque étage
        </p>
      </div>

      {isPrerequisitesMissing ? (
        <div className="space-y-4 animate-fade-in-scale">
          {activeWards.length === 0 && (
            <Alert className="border bg-background shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/30 flex-shrink-0">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <AlertTitle className="font-bold">Aucun étage actif trouvé</AlertTitle>
                  <AlertDescription className="mt-1">
                    Vous devez ajouter et activer au moins un étage avant de pouvoir créer une commande.
                    <Button asChild variant="link" className="p-0 h-auto ml-1 text-primary">
                      <Link href="/dashboard/settings">Aller aux paramètres des étages</Link>
                    </Button>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
          {activeItems.length === 0 && (
            <Alert className="border bg-background shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/30 flex-shrink-0">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <AlertTitle className="font-bold">Aucun article trouvé</AlertTitle>
                  <AlertDescription className="mt-1">
                    Vous devez ajouter au moins un article avant de pouvoir créer une commande.
                    <Button asChild variant="link" className="p-0 h-auto ml-1 text-primary">
                      <Link href="/dashboard/settings">Aller aux paramètres des articles</Link>
                    </Button>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
        </div>
      ) : (
        <>
          {isDuplicated && (
            <Alert className="border bg-background shadow-sm animate-fade-in-scale">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 flex-shrink-0">
                  <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <AlertTitle className="font-bold text-emerald-700 dark:text-emerald-300">Commande Dupliquée Chargée</AlertTitle>
                  <AlertDescription className="mt-1">
                    Ajustez les quantités ci-dessous et validez votre nouvelle commande.
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
          {renderMobileView()}
          {renderDesktopView()}
        </>
      )}

      {/* Section commentaire et actions avec border gradient */}
      <div className="relative pt-8 mt-8 space-y-6">
        {/* Border gradient supérieure */}
        <div className="absolute top-0 left-0 right-0 h-px bg-border" />

        {/* Commentaire */}
        <div className="space-y-3 animate-fade-in-scale" style={{ animationDelay: '100ms' }}>
          <Label htmlFor="comment" className="flex items-center gap-2 text-base font-semibold">
            <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/30">
              <MessageSquare className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            Ajouter un commentaire (facultatif)
          </Label>
          <Textarea
            id="comment"
            placeholder="Ex: Commande urgente pour le 3ème étage, merci d'accélérer..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="border-border focus:border-primary/50 transition-colors duration-150 rounded-xl max-w-2xl min-h-[100px] resize-none"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center gap-4 flex-wrap pt-4 animate-fade-in-scale" style={{ animationDelay: '200ms' }}>
          <div>
            {!isOrderEmpty() && (
              <Button
                size="lg"
                variant="outline"
                onClick={handleCancelOrder}
                disabled={isSubmitting}
                className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors duration-150 shadow-sm"
              >
                <Trash2 className="mr-2 h-5 w-5" />
                Annuler
              </Button>
            )}
          </div>
          <div className="flex gap-3 flex-wrap justify-end">
            <Button
              size="lg"
              onClick={handleOrderSubmit}
              disabled={
                isOrderEmpty() ||
                isSubmitting ||
                isPrerequisitesMissing
              }
              className="min-w-[180px] shadow-sm transition-colors duration-150"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Envoyer la Commande
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
