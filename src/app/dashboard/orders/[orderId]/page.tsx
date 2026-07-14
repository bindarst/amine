
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import type { Order, WardOrder, UserProfile, OrderItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileDown, Mail, Loader2, Send, User as UserIcon, RefreshCw, CheckCircle2, Trash2, MessageSquare, Pencil, Minus, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useOrders } from '../orders-context';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { sendTransactionalEmail } from '@/lib/actions';
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

export default function OrderDetailsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const params = useParams<{ orderId: string }>();
    const orderId = params.orderId;
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

    // State for quantity adjustment dialog
    const [adjustDialogOpen, setAdjustDialogOpen] = React.useState(false);
    const [selectedItem, setSelectedItem] = React.useState<{
        wardId: string;
        diaperId: string;
        itemName: string;
        currentQuantity: number;
        unit: 'pieces' | 'cartons';
    } | null>(null);
    const [adjustedQuantity, setAdjustedQuantity] = React.useState(0);
    const [adjustmentReason, setAdjustmentReason] = React.useState('');
    const [isAdjusting, setIsAdjusting] = React.useState(false);

    const touchStartRef = React.useRef<{ x: number, id: string } | null>(null);
    const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);

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
            if (tableHeight > maxHeightInRow) {
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
        switch (status) {
            case 'distributed': return 'success';
            case 'confirmed': return 'default';
            case 'draft': return 'secondary';
            default: return 'secondary';
        }
    }

    const getStatusLabel = (status: Order['status']) => {
        switch (status) {
            case 'fulfilled': return 'Traitée';
            case 'distributed': return 'Distribuée';
            case 'confirmed': return 'Confirmée';
            case 'draft': return 'Brouillon';
            default: return status;
        }
    }

    // Long press handler - opens adjustment dialog
    const handleLongPress = (wardId: string, item: any) => {
        if (order?.status === 'distributed') return; // Can't adjust distributed orders

        setSelectedItem({
            wardId,
            diaperId: item.diaperId,
            itemName: item.name,
            currentQuantity: item.quantity,
            unit: item.unit
        });
        setAdjustedQuantity(item.quantity);
        setAdjustmentReason('');
        setAdjustDialogOpen(true);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLTableRowElement>, itemId: string, wardId: string, item: any) => {
        touchStartRef.current = { x: e.touches[0].clientX, id: itemId };

        // Start long press timer (500ms)
        longPressTimerRef.current = setTimeout(() => {
            handleLongPress(wardId, item);
            touchStartRef.current = null; // Cancel swipe after long press
        }, 500);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLTableRowElement>) => {
        // Cancel long press if user moves finger
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLTableRowElement>, itemId: string) => {
        // Cancel long press timer
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }

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

    // Handle quantity adjustment confirmation
    const handleAdjustQuantity = async () => {
        if (!order || !selectedItem || adjustedQuantity < 0 || !firestore) return;

        setIsAdjusting(true);
        try {
            // Create updated ward orders with adjusted quantity
            const updatedWardOrders = order.wardOrders.map(wardOrder => {
                if (wardOrder.wardId !== selectedItem.wardId) return wardOrder;

                return {
                    ...wardOrder,
                    items: wardOrder.items.map(item => {
                        if (item.diaperId !== selectedItem.diaperId) return item;
                        return { ...item, quantity: adjustedQuantity };
                    })
                };
            });

            // Find the ward name for notifications
            const ward = wards.find(w => w.id === selectedItem.wardId);
            const wardName = ward?.name || 'Étage inconnu';

            // Build adjustment comment
            const adjustmentNote = `[Ajustement] ${selectedItem.itemName}: ${selectedItem.currentQuantity} → ${adjustedQuantity} ${selectedItem.unit === 'cartons' ? 'carton(s)' : 'pièce(s)'}. Raison: ${adjustmentReason || 'Non spécifiée'}. Par ${currentUserProfile?.displayName || 'Agent'}.`;

            // Append to existing comment or create new one
            const newComment = order.comment
                ? `${order.comment}\n\n${adjustmentNote}`
                : adjustmentNote;

            await updateOrder(orderId, {
                wardOrders: updatedWardOrders,
                comment: newComment
            });

            // Send notification to all users about the adjustment
            const notificationsCollectionRef = collection(firestore, 'notifications');
            const difference = adjustedQuantity - selectedItem.currentQuantity;
            const adjustmentDirection = difference > 0 ? 'augmentée' : difference < 0 ? 'diminuée' : 'modifiée';

            const notificationData = {
                type: 'order',
                title: `⚠️ Quantité ${adjustmentDirection} lors de la distribution`,
                description: `📦 ${currentUserProfile?.displayName || 'Un agent'} a ajusté la commande du ${new Date(order.date).toLocaleDateString('fr-FR')} - ${wardName}: "${selectedItem.itemName}" ${selectedItem.currentQuantity} → ${adjustedQuantity}. Raison: "${adjustmentReason}"`,
                date: serverTimestamp(),
                read: false,
                data: {
                    orderId: orderId,
                    diaperId: selectedItem.diaperId,
                    wardId: selectedItem.wardId,
                    oldQuantity: selectedItem.currentQuantity,
                    newQuantity: adjustedQuantity,
                    reason: adjustmentReason,
                    adjustedBy: currentUserProfile?.displayName || user?.email
                }
                // Pas de forRole - visible par tous
            };
            addDocumentNonBlocking(notificationsCollectionRef, notificationData);

            // Send email notification
            const subject = `[Lista] Ajustement de commande - ${selectedItem.itemName}`;
            const textBody = `Un ajustement a été effectué sur une commande par ${currentUserProfile?.displayName || 'un agent'}.\n\nDétails:\n- Date commande: ${new Date(order.date).toLocaleDateString('fr-FR')}\n- Étage: ${wardName}\n- Article: ${selectedItem.itemName}\n- Quantité: ${selectedItem.currentQuantity} → ${adjustedQuantity}\n- Raison: ${adjustmentReason}`;
            const htmlBody = `
                <p>Bonjour,</p>
                <p>Un ajustement a été effectué sur une commande par <strong>${currentUserProfile?.displayName || 'un agent'}</strong>.</p>
                <table style="border-collapse: collapse; margin: 10px 0;">
                    <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>Date commande</strong></td><td style="padding: 5px; border: 1px solid #ddd;">${new Date(order.date).toLocaleDateString('fr-FR')}</td></tr>
                    <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>Étage</strong></td><td style="padding: 5px; border: 1px solid #ddd;">${wardName}</td></tr>
                    <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>Article</strong></td><td style="padding: 5px; border: 1px solid #ddd;">${selectedItem.itemName}</td></tr>
                    <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>Ancienne quantité</strong></td><td style="padding: 5px; border: 1px solid #ddd;">${selectedItem.currentQuantity}</td></tr>
                    <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>Nouvelle quantité</strong></td><td style="padding: 5px; border: 1px solid #ddd; ${difference < 0 ? 'color: red;' : difference > 0 ? 'color: green;' : ''}">${adjustedQuantity}</td></tr>
                    <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>Raison</strong></td><td style="padding: 5px; border: 1px solid #ddd;">${adjustmentReason}</td></tr>
                </table>
            `;
            sendTransactionalEmail({ subject, text: textBody, html: htmlBody });

            toast({
                title: 'Quantité ajustée',
                description: `La quantité de "${selectedItem.itemName}" a été modifiée. Tout le monde a été notifié.`
            });

            setAdjustDialogOpen(false);
            setSelectedItem(null);
        } catch (error) {
            console.error('Error adjusting quantity:', error);
            toast({
                title: 'Erreur',
                description: "Impossible de modifier la quantité.",
                variant: 'destructive'
            });
        } finally {
            setIsAdjusting(false);
        }
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
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
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
                                                onTouchStart={(e) => handleTouchStart(e, item.id, wo.wardId, item)}
                                                onTouchMove={handleTouchMove}
                                                onTouchEnd={(e) => handleTouchEnd(e, item.id)}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    // Long press on desktop: open adjustment dialog
                                                    if (order?.status !== 'distributed') {
                                                        handleLongPress(wo.wardId, item);
                                                    } else {
                                                        setCollectedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                                                    }
                                                }}
                                                className={cn(
                                                    "transition-colors cursor-pointer",
                                                    collectedItems[item.id] ? 'bg-muted/60 text-muted-foreground line-through' : '',
                                                    order?.status !== 'distributed' && 'active:bg-primary/10'
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
                )
            })}

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

            {/* Quantity Adjustment Dialog */}
            <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Ajuster la quantité</DialogTitle>
                        <DialogDescription>
                            Modifiez la quantité de <strong>{selectedItem?.itemName}</strong>.
                            Cette action sera enregistrée avec votre commentaire.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Current vs New Quantity Display */}
                        <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Avant</p>
                                <p className="text-2xl font-bold text-muted-foreground line-through">
                                    {selectedItem?.currentQuantity}
                                </p>
                            </div>
                            <span className="text-2xl text-muted-foreground">→</span>
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Après</p>
                                <p className={cn(
                                    "text-2xl font-bold",
                                    adjustedQuantity < (selectedItem?.currentQuantity || 0)
                                        ? "text-destructive"
                                        : adjustedQuantity > (selectedItem?.currentQuantity || 0)
                                            ? "text-green-600"
                                            : "text-foreground"
                                )}>
                                    {adjustedQuantity}
                                </p>
                            </div>
                        </div>

                        {/* Quantity Adjuster */}
                        <div className="space-y-2">
                            <Label>Nouvelle quantité ({selectedItem?.unit === 'cartons' ? 'cartons' : 'pièces'})</Label>
                            <div className="flex items-center justify-center gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-12 w-12 rounded-full"
                                    onClick={() => setAdjustedQuantity(Math.max(0, adjustedQuantity - 1))}
                                    disabled={adjustedQuantity <= 0}
                                >
                                    <Minus className="h-5 w-5" />
                                </Button>
                                <Input
                                    type="number"
                                    value={adjustedQuantity}
                                    onChange={(e) => setAdjustedQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-24 h-12 text-center text-xl font-bold"
                                    min={0}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-12 w-12 rounded-full"
                                    onClick={() => setAdjustedQuantity(adjustedQuantity + 1)}
                                >
                                    <Plus className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Reason Comment */}
                        <div className="space-y-2">
                            <Label htmlFor="adjustment-reason">
                                Raison de l'ajustement <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                id="adjustment-reason"
                                placeholder="Ex: Erreur de comptage, article cassé, stock insuffisant..."
                                value={adjustmentReason}
                                onChange={(e) => setAdjustmentReason(e.target.value)}
                                rows={3}
                            />
                            <p className="text-xs text-muted-foreground">
                                Ce commentaire sera ajouté à la commande pour traçabilité.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setAdjustDialogOpen(false)}
                            disabled={isAdjusting}
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={handleAdjustQuantity}
                            disabled={isAdjusting || !adjustmentReason.trim() || adjustedQuantity === selectedItem?.currentQuantity}
                        >
                            {isAdjusting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Enregistrement...
                                </>
                            ) : (
                                'Confirmer l\'ajustement'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
