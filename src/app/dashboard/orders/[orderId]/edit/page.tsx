
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import DiaperOrderForm from '../../components/diaper-order-form';
import type { Diaper, Ward, WardOrder, Order } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Info, ArrowLeft, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useOrders } from '../../orders-context';
import { useItems } from '../../../settings/items-context';
import { useWards } from '../../../settings/wards-context';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUsers } from '../../../settings/users-context';
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

const generateInitialState = (diapers: Diaper[], wards: Ward[], existingOrder?: Order | null): MultiWardOrderState => {
  return wards.reduce((acc, ward) => {
    const existingWardOrder = existingOrder?.wardOrders.find(wo => wo.wardId === ward.id);
    const wardState: OrderState = {};

    diapers.forEach(diaper => {
      const existingItem = existingWardOrder?.items.find(i => i.diaperId === diaper.id);
      if (existingItem) {
        wardState[diaper.id] = {
          quantity: existingItem.quantity,
          mode: existingItem.unit,
        };
      } else {
        wardState[diaper.id] = {
          quantity: 0,
          mode: diaper.defaultUnit,
        };
      }
    });

    acc[ward.id] = wardState;
    return acc;
  }, {} as MultiWardOrderState);
};

export default function EditOrderPage() {
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const { items: diapers, isLoading: isLoadingItems } = useItems();
  const { wards, isLoading: isLoadingWards } = useWards();
  const { orders, isLoading: isLoadingOrders, updateOrder } = useOrders();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { currentUserProfile } = useUsers();

  const [multiWardOrderState, setMultiWardOrderState] = React.useState<MultiWardOrderState>({});
  const [selectedWardId, setSelectedWardId] = React.useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [order, setOrder] = React.useState<Order | null>(null);
  const [comment, setComment] = React.useState('');


  const activeWards = React.useMemo(() => wards.filter(w => w.isActive), [wards]);
  const activeItems = React.useMemo(() => diapers.filter(i => i.isActive), [diapers]);
  
  React.useEffect(() => {
    const foundOrder = orders.find(o => o.id === orderId);
    if (foundOrder) {
      setOrder(foundOrder);
      setComment(foundOrder.comment || '');
    }
  }, [orders, orderId]);
  
  React.useEffect(() => {
    if (activeItems.length > 0 && activeWards.length > 0 && order) {
      setMultiWardOrderState(generateInitialState(activeItems, activeWards, order));
    }
  }, [activeItems, activeWards, order]);
  
  React.useEffect(() => {
    if (!selectedWardId && activeWards.length > 0) {
      setSelectedWardId(activeWards[0].id);
    }
  }, [activeWards, selectedWardId]);

  const handleSaveChanges = async () => {
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
        
        // Return null for wards with no items to filter them out later
        if (items.length > 0) {
            return { wardId, items };
        }
        return null;
      })
      .filter((wardOrder): wardOrder is WardOrder => wardOrder !== null);
      
    if (wardOrders.length > 0) {
      await updateOrder(orderId, { wardOrders, comment: comment.trim() });
      toast({
        title: "Commande Modifiée!",
        description: `La commande a bien été mise à jour.`,
      });
      router.push(`/dashboard/orders/${orderId}`);
    } else {
      toast({
        title: "Commande Vide",
        description: "Veuillez ajouter au moins un article avant de soumettre.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const updateWardOrder = (wardId: string, newOrderState: OrderState) => {
    setMultiWardOrderState(prevState => ({
      ...prevState,
      [wardId]: newOrderState,
    }));
  };

  const isLoading = isLoadingItems || isLoadingWards || isLoadingOrders || Object.keys(multiWardOrderState).length === 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const canModify = order?.status !== 'distributed' && (currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Soignant');

  if (!canModify) {
      return (
          <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertTitle>Modification non autorisée</AlertTitle>
              <AlertDescription>
                  Cette commande ne peut plus être modifiée car elle a déjà été distribuée, ou vous n'avez pas les permissions nécessaires.
                  <Button asChild variant="link" className="p-0 h-auto ml-1">
                      <Link href={`/dashboard/orders/${orderId}`}>Retourner à la commande</Link>
                  </Button>
              </AlertDescription>
          </Alert>
      )
  }

  const selectedWard = activeWards.find(w => w.id === selectedWardId);
  
  const renderMobileView = () => {
    if (isMobile === undefined) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;
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
    if (isMobile === undefined) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;
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
            <Button variant="ghost" onClick={() => router.push(`/dashboard/orders/${orderId}`)} className="pl-0 text-muted-foreground mb-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à la commande
            </Button>
           <h1 className="text-2xl font-headline break-words font-bold">
            Modifier la Commande
          </h1>
          <p className="text-muted-foreground">
            Ajustez les quantités pour chaque article et chaque étage.
          </p>
        </div>
      
      {renderMobileView()}
      {renderDesktopView()}

       <div className="pt-8 mt-8 border-t space-y-6">
          <div className="space-y-2">
            <Label htmlFor="comment" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Modifier le commentaire (facultatif)
            </Label>
            <Textarea 
              id="comment"
              placeholder="Ex: Commande urgente pour le 3ème étage..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="max-w-xl"
            />
          </div>
      
          <div className="flex justify-end">
            <Button size="lg" onClick={handleSaveChanges} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              Enregistrer les modifications
            </Button>
          </div>
       </div>
    </div>
  );
}
