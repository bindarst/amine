'use client';

import * as React from 'react';
import DiaperOrderForm from '../components/diaper-order-form';
import type { Diaper, Ward, WardOrder } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Info, MessageSquare, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
          title: "Demande Envoyée!",
          description: `La commande groupée a bien été transmise.`,
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
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
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
    <div className="container mx-auto py-8 space-y-6">
       <div>
           <h1 className="text-2xl font-headline break-words font-bold">
            Créer une Nouvelle Commande
          </h1>
          <p className="text-muted-foreground">
            Remplissez les quantités pour chaque article et chaque étage.
          </p>
        </div>
      {isPrerequisitesMissing ? (
        <div className="space-y-4">
          {activeWards.length === 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Aucun étage actif trouvé</AlertTitle>
              <AlertDescription>
                Vous devez ajouter et activer au moins un étage avant de pouvoir créer une commande.
                <Button asChild variant="link" className="p-0 h-auto ml-1">
                  <Link href="/dashboard/settings">Aller aux paramètres des étages</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {activeItems.length === 0 && (
              <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Aucun article trouvé</AlertTitle>
              <AlertDescription>
                Vous devez ajouter au moins un article avant de pouvoir créer une commande.
                  <Button asChild variant="link" className="p-0 h-auto ml-1">
                  <Link href="/dashboard/settings">Aller aux paramètres des articles</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : (
          <>
          {isDuplicated && (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Commande Dupliquée Chargée</AlertTitle>
                <AlertDescription>
                    Ajustez les quantités ci-dessous et validez votre nouvelle commande.
                </AlertDescription>
            </Alert>
           )}
          {renderMobileView()}
          {renderDesktopView()}
          </>
      )}

      <div className="pt-8 mt-8 border-t space-y-6">
          <div className="space-y-2">
            <Label htmlFor="comment" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Ajouter un commentaire (facultatif)
            </Label>
            <Textarea 
              id="comment"
              placeholder="Ex: Commande urgente pour le 3ème étage, merci d'accélérer..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="max-w-xl"
            />
          </div>

          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div>
              {!isOrderEmpty() && (
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={handleCancelOrder}
                  disabled={isSubmitting}
                >
                  <Trash2 className="mr-2 h-5 w-5" />
                  Annuler
                </Button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Button
                size="lg"
                onClick={handleOrderSubmit}
                disabled={
                  isOrderEmpty() ||
                  isSubmitting ||
                  isPrerequisitesMissing
                }
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Send className="mr-2 h-5 w-5" />
                )}
                Envoyer
              </Button>
            </div>
          </div>
      </div>
    </div>
  );
}
