'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
import type { Order, WardOrder, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileDown, Mail, Loader2, Send, User as UserIcon, RefreshCw, CheckCircle2, Trash2, MessageSquare, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useOrders } from '../orders-context';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import { useItems } from '../../settings/items-context';
import { useWards } from '../../settings/wards-context';
import type { MultiWardOrderState, OrderState } from '../new/page';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUsers } from '../../settings/users-context';


interface DetailedWardOrder extends WardOrder {
    wardName: string;
    detailedItems: any[];
}

export default function OrderDetailsPage({ params }: { params: { orderId: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const { orderId } = React.use(params);
  const { orders, updateOrder, deleteOrder, isLoading: isOrdersLoading } = useOrders();
  const { items: diapers, isLoading: isItemsLoading } = useItems();
  const { wards, isLoading: isWardsLoading } = useWards();
  const { user, firestore } = useFirebase();
  const { currentUserProfile } = useUsers();

  const [order, setOrder] = React.useState<Order | null>(null);
  const [detailedWardOrders, setDetailedWardOrders] = React.useState<DetailedWardOrder[]>([]);
  const [creatorProfile, setCreatorProfile] = React.useState<UserProfile | null>(null);
  const [distributorProfile, setDistributorProfile] = React.useState<UserProfile | null>(null);
  const [collectedItems, setCollectedItems] = React.useState<Record<string, boolean>>({});
  
  const touchStartRef = React.useRef<{ x: number, id: string } | null>(null);

  // Load collected items from localStorage on mount
  React.useEffect(() => {
    if (orderId) {
      const storedState = localStorage.getItem(`collected_order_${orderId}`);
      if (storedState) {
        setCollectedItems(JSON.parse(storedState));
      }
    }
  }, [orderId]);

  // Save to localStorage whenever collectedItems changes
  React.useEffect(() => {
    if (orderId && Object.keys(collectedItems).length > 0) {
      localStorage.setItem(`collected_order_${orderId}`, JSON.stringify(collectedItems));
    }
  }, [collectedItems, orderId]);

  const creatorDocRef = useMemoFirebase(() => {
    if (!order?.userId || !firestore) return null;
    return doc(firestore, 'users', order.userId);
  }, [order, firestore]);
  const { data: creatorData } = useDoc<UserProfile>(creatorDocRef);
  
  const distributorDocRef = useMemoFirebase(() => {
    if (!order?.distributorId || !firestore) return null;
    return doc(firestore, 'users', order.distributorId);
  }, [order, firestore]);
  const { data: distributorData } = useDoc<UserProfile>(distributorDocRef);

  React.useEffect(() => {
    if (creatorData) setCreatorProfile(creatorData);
    if (distributorData) setDistributorProfile(distributorData);
  }, [creatorData, distributorData]);


  React.useEffect(() => {
    if (!isOrdersLoading && !isItemsLoading && !isWardsLoading && diapers.length > 0 && wards.length > 0) {
        const foundOrder = orders.find(o => o.id === orderId);
        if (foundOrder) {
            setOrder(foundOrder);
            
            const detailedOrders = foundOrder.wardOrders.map(wardOrder => {
                const ward = wards.find(w => w.id === wardOrder.wardId);
                const items = wardOrder.items.map((item, index) => {
                    const diaper = diapers.find(d => d.id === item.diaperId);
                    return {
                        ...item,
                        id: `${wardOrder.wardId}-${item.diaperId}-${index}`, // unique ID for state
                        name: diaper?.name || 'Article inconnu',
                    };
                });
                return {
                    ...wardOrder,
                    wardName: ward?.name || 'Inconnu',
                    detailedItems: items
                };
            });
            setDetailedWardOrders(detailedOrders);
        }
    }
  }, [orderId, orders, isOrdersLoading, diapers, isItemsLoading, wards, isWardsLoading]);
  
  const generatePdf = (output: 'blob' | 'save' = 'save') => {
    if (!order || !wards.length || !diapers.length) return null;

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 10;
    const verticalGap = 2; // Reduced gap
    const cellWidth = (pageWidth - 3 * margin) / 2;

    doc.setFontSize(12);
    doc.text(`Date: ${new Date(order.date).toLocaleDateString('fr-FR')}`, margin, margin + 5);
    doc.text(`Commande par: ${creatorProfile?.displayName || 'Utilisateur inconnu'}`, margin, margin + 12);
    
    let yPos = margin + 25;
    let tableCount = 0;
    let maxHeightInRow = 0;

    const wardsWithOrders = order.wardOrders
      .map(wo => wards.find(w => w.id === wo.wardId))
      .filter((w): w is import('@/lib/types').Ward => !!w);


    wardsWithOrders.forEach((ward, index) => {
        const wardOrder = order.wardOrders.find(wo => wo.wardId === ward.id);
        if (!wardOrder || wardOrder.items.length === 0) return;

        const orderedItems = wardOrder.items.filter(item => item.quantity > 0);
        if (orderedItems.length === 0) return;

        const tableBody = orderedItems.map(item => {
            const diaper = diapers.find(d => d.id === item.diaperId);
            const quantityText = `${item.quantity} ${item.unit === 'cartons' ? 'c.' : 'p.'}`;
            return [diaper?.name || item.diaperId, quantityText];
        });
        
        const tableHeader = [['Article', 'Quantité']];
        const isNewRow = tableCount % 2 === 0;

        if (tableCount > 0 && isNewRow) {
            yPos += maxHeightInRow + verticalGap;
            maxHeightInRow = 0;
        }

        if (yPos > pageHeight - 50) {
            doc.addPage();
            yPos = margin;
            maxHeightInRow = 0;
        }

        const currentX = isNewRow ? margin : margin + cellWidth + margin;
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(ward.name, currentX, yPos);

        autoTable(doc, {
            head: tableHeader,
            body: tableBody,
            startY: yPos + 5,
            margin: { left: currentX },
            tableWidth: cellWidth,
            theme: 'striped',
            headStyles: { fillColor: [38, 114, 137] },
            styles: { fontSize: 8 },
        });
        
        const finalY = (doc as any).lastAutoTable.finalY || yPos + 5;
        const tableHeight = finalY - yPos; // Height of title + table
        if(tableHeight > maxHeightInRow) {
            maxHeightInRow = tableHeight;
        }
        tableCount++;
    });
    
    if (output === 'save') {
        doc.save(`commande-${order.id}.pdf`);
        return null;
    } else {
        return doc.output('blob');
    }
  };


  const handleEmail = async () => {
    if (!order) return;
    
    generatePdf('save');

    const subject = `Bon de Commande: ${new Date(order.date).toLocaleDateString('fr-FR')}`;
    const body = `Veuillez trouver le bon de commande en pièce jointe (téléchargé sur votre appareil).`;
    
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };
  
  const handleMarkAsDistributed = () => {
    if (!user) return;
    updateOrder(orderId, { status: 'distributed', distributorId: user.uid, distributedAt: new Date().toISOString() });
    localStorage.removeItem(`collected_order_${orderId}`); // Clear progress on distribution
    toast({
        title: 'Commande Distribuée',
        description: 'Le statut de la commande a été mis à jour.'
    });
  };

  const handleRedoOrder = () => {
    if (!order || !wards || !diapers) return;

    const orderStateToDuplicate: MultiWardOrderState = {};

    wards.forEach(ward => {
        const existingWardOrder = order.wardOrders.find(wo => wo.wardId === ward.id);
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
        orderStateToDuplicate[ward.id] = wardState;
    });

    try {
        // CRITICAL: Clear any in-progress order to avoid conflicts
        localStorage.removeItem('inProgressOrder');

        // Store the duplicated order data
        const dataToStore = {
            state: orderStateToDuplicate,
            comment: order.comment || '',
        };
        localStorage.setItem('duplicatedOrder', JSON.stringify(dataToStore));
        
        toast({
            title: "Préparation de la nouvelle commande...",
            description: "Vous allez être redirigé pour l'ajuster.",
        });
        
        router.push('/dashboard/orders/new');
    } catch (e) {
        console.error("Could not save duplicated order to localStorage", e);
        toast({
            title: "Erreur",
            description: "Impossible de préparer la duplication de la commande.",
            variant: "destructive",
        });
    }
  };


 const getStatusVariant = (status: Order['status']) => {
    switch(status) {
        case 'distributed': return 'success';
        case 'confirmed': return 'default';
        case 'draft': return 'secondary';
        default: return 'secondary';
    }
  }

  const getStatusLabel = (status: Order['status']) => {
    switch(status) {
        case 'fulfilled': return 'Traitée';
        case 'distributed': return 'Distribuée';
        case 'confirmed': return 'Confirmée';
        case 'draft': return 'Brouillon';
        default: return status;
    }
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLTableRowElement>, itemId: string) => {
    touchStartRef.current = { x: e.touches[0].clientX, id: itemId };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLTableRowElement>, itemId: string) => {
    if (!touchStartRef.current || touchStartRef.current.id !== itemId) return;
    
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    if (Math.abs(deltaX) > 50) { // Swipe threshold
      setCollectedItems(prev => ({
        ...prev,
        [itemId]: !prev[itemId]
      }));
    }
    touchStartRef.current = null;
  };
  
  const handleDeleteOrder = async () => {
    if (!order) return;
    try {
        await deleteOrder(order.id);
        toast({
            title: 'Commande Supprimée',
            description: 'La commande a été supprimée avec succès.',
        });
        router.push('/dashboard/orders');
    } catch (error) {
        toast({
            title: 'Erreur',
            description: 'Impossible de supprimer la commande.',
            variant: 'destructive',
        });
    }
};

  const isLoading = isOrdersLoading || isItemsLoading || isWardsLoading || !order;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
         <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  const canModify = order?.status !== 'distributed' && (currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Soignant');
  const canDistribute = order?.status === 'confirmed' && (currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Agent Logistique');
  const canDelete = (currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Soignant') && order?.status !== 'distributed';

  return (
    <div className="space-y-8">
        <div className="flex justify-between items-start flex-wrap gap-4">
            <div className="flex-1 min-w-0">
                <Button variant="ghost" onClick={() => router.push('/dashboard/orders')} className="pl-0 text-muted-foreground">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour aux commandes
                </Button>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">Commande du {order?.date ? new Date(order.date).toLocaleDateString('fr-FR') : ''}</h1>
            </div>
            <div className="flex gap-2 flex-wrap justify-end w-full sm:w-auto">
                {canModify && (
                     <Button variant="outline" onClick={() => router.push(`/dashboard/orders/${orderId}/edit`)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Modifier
                    </Button>
                )}
                {canDistribute && (
                     <Button onClick={handleMarkAsDistributed}>
                        <Send className="mr-2 h-4 w-4" />
                        Marquer comme distribuée
                    </Button>
                )}
            </div>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Informations Générales
          </CardTitle>
          <Separator className="my-4" />
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                    <p className="text-muted-foreground">Date de la demande</p>
                    <p className="font-semibold">{order?.date ? new Date(order.date).toLocaleDateString('fr-FR') : ''}</p>
                </div>
                <div>
                    <p className="text-muted-foreground">Statut</p>
                    <Badge variant={getStatusVariant(order?.status ?? 'draft')} className="capitalize">
                       {getStatusLabel(order?.status ?? 'draft')}
                    </Badge>
                </div>
                 <div>
                    <p className="text-muted-foreground">Créé par</p>
                    <p className="font-semibold flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" /> 
                        {creatorProfile?.displayName || 'Utilisateur inconnu'}
                    </p>
                </div>
                 {order?.status === 'distributed' && (
                    <div>
                        <p className="text-muted-foreground">Distribué par</p>
                        <p className="font-semibold flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                            {distributorProfile?.displayName || 'Utilisateur inconnu'}
                        </p>
                    </div>
                )}
           </div>
        </CardHeader>
         {order?.comment && (
            <CardContent>
                <Separator className="mb-4" />
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground"/>
                        Commentaire
                    </h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border italic">
                        "{order.comment}"
                    </p>
                </div>
            </CardContent>
        )}
      </Card>
        
      {detailedWardOrders.map(wo => {
        const allItemsForWardCollected = wo.detailedItems.length > 0 && wo.detailedItems.every(item => collectedItems[item.id]);
        return (
          <Card key={wo.wardId} className={cn(allItemsForWardCollected && 'bg-green-50 dark:bg-green-900/20 border-green-500/50')}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {allItemsForWardCollected && <CheckCircle2 className="h-6 w-6 text-green-600" />}
                  {wo.wardName}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="border-t overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Article</TableHead>
                            <TableHead className="text-right">Quantité Demandée</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {wo.detailedItems.map((item, index) => (
                            <TableRow 
                                key={item.id}
                                onTouchStart={(e) => handleTouchStart(e, item.id)}
                                onTouchEnd={(e) => handleTouchEnd(e, item.id)}
                                onContextMenu={(e) => { e.preventDefault(); setCollectedItems(prev => ({...prev, [item.id]: !prev[item.id]})); }}
                                className={cn(
                                    "transition-colors",
                                    collectedItems[item.id] ? 'bg-muted/60 text-muted-foreground line-through' : ''
                                )}
                                >
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-right">
                                {item.quantity} {item.unit === 'cartons' ? `carton(s)` : `pièce(s)`}
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
          </Card>
        )})}

      <div className="flex justify-between items-center flex-wrap gap-2 pt-4 border-t">
        <div>
            {canDelete && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer la Commande
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette commande ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Cette action est irréversible. La commande et toutes ses notifications associées seront définitivement supprimées.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive hover:bg-destructive/90">
                                Oui, supprimer
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
        <div className="flex justify-end gap-2 flex-wrap">
            <Button variant="outline" onClick={handleRedoOrder}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refaire la commande
            </Button>
            <Button variant="outline" onClick={handleEmail}>
                <Mail className="mr-2 h-4 w-4" />
                Partager
            </Button>
            <Button variant="outline" onClick={() => generatePdf('save')}>
                <FileDown className="mr-2 h-4 w-4" />
                Télécharger le Bon (PDF)
            </Button>
        </div>
      </div>

    </div>
  );
}
