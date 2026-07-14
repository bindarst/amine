
'use client';

import * as React from 'react';
import type { StockItem, DeliveryItem, Order, UserProfile, Diaper, WithId } from '@/lib/types';
import { useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, doc, serverTimestamp, writeBatch, increment } from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { useItems } from '../settings/items-context';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { sendTransactionalEmail } from '@/lib/actions';
import { queueFirestoreWrite } from '@/lib/offline-sync';

interface StockContextType {
  stock: WithId<StockItem>[];
  isLoading: boolean;
  updateStock: (items: DeliveryItem[]) => Promise<void>;
  deductStockFromOrder: (order: Order) => Promise<void>;
  manualStockUpdate: (diaperId: string, newQuantity: number) => Promise<void>;
  directStockDistribution: (items: DeliveryItem[], reason: string, details?: { recipientName?: string; comment?: string }) => Promise<void>;
}

const StockContext = React.createContext<StockContextType | undefined>(
  undefined
);

export function StockProvider({ children }: { children: React.ReactNode }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const { items: diapers } = useItems();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const stockCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'stock');
  }, [firestore]);

  const { data: stock, isLoading } = useCollection<StockItem>(stockCollectionRef, {
    idField: 'diaperId',
  } as any);

  const addNotification = React.useCallback((notificationData: any) => {
    if (!firestore) return;
    const notificationsCollectionRef = collection(firestore, 'notifications');
    addDocumentNonBlocking(notificationsCollectionRef, {
      ...notificationData,
      date: serverTimestamp(),
      read: false,
    });
  }, [firestore]);

  const checkLowStockAndNotify = React.useCallback((diaper: WithId<Diaper>, oldQuantity: number, newQuantity: number) => {
    if (newQuantity < diaper.lowStockThreshold && oldQuantity >= diaper.lowStockThreshold) {
      const percentageRemaining = Math.round((newQuantity / diaper.lowStockThreshold) * 100);
      const notification = {
        type: 'stock',
        title: '⚠️ Alerte Stock Bas',
        description: `📦 Le stock de "${diaper.name}" est bas ! ${newQuantity} pièces restantes (${percentageRemaining}% du seuil). Recommandation : passez une commande de réapprovisionnement.`,
        data: {
          diaperId: diaper.id,
          itemName: diaper.name,
          quantity: newQuantity,
          lowStockThreshold: diaper.lowStockThreshold,
          percentageRemaining
        }
      };
      addNotification(notification);

      // Email Notification for low stock
      const subject = `[Alerte Stock Bas] - ${diaper.name}`;
      const textBody = `Alerte : Le stock pour l'article "${diaper.name}" est bas.\nStock actuel: ${newQuantity} pièces.\nSeuil de stock bas: ${diaper.lowStockThreshold} pièces.\nVeuillez envisager de passer une commande.`;
      const htmlBody = `
          <p>Bonjour,</p>
          <p><strong>Alerte de stock bas</strong> pour l'article suivant :</p>
          <ul>
              <li><strong>Article :</strong> ${diaper.name}</li>
              <li><strong>Stock actuel :</strong> ${newQuantity} pièces</li>
              <li><strong>Seuil de stock bas :</strong> ${diaper.lowStockThreshold} pièces</li>
          </ul>
          <p>Veuillez envisager de passer une commande de réapprovisionnement.</p>
      `;
      sendTransactionalEmail({ subject: subject, text: textBody, html: htmlBody });
    }
  }, [addNotification]);


  const updateStock = React.useCallback(
    async (deliveredItems: DeliveryItem[]) => {
      if (!firestore) throw new Error('Firestore is not initialized.');

      const operationId = doc(collection(firestore, '_operationIds')).id;
      const batch = writeBatch(firestore);
      for (const item of deliveredItems) {
        batch.set(doc(firestore, 'stock', item.diaperId), {
          diaperId: item.diaperId,
          quantity: increment(item.quantity),
          modifiedAt: serverTimestamp(),
        }, { merge: true });
      }

      queueFirestoreWrite({
        id: `stock-in:${operationId}`,
        type: 'stock',
        label: 'Entrée de stock',
        write: () => batch.commit(),
        onError: error => console.error('Stock update sync failed:', error),
      });
    },
    [firestore]
  );

  const deductStockFromOrder = React.useCallback(
    async (order: Order) => {
      if (!firestore || !diapers || diapers.length === 0) {
        toast({
          title: "Erreur de déduction du stock",
          description: "Les données des articles ne sont pas disponibles.",
          variant: 'destructive',
        });
        return;
      }

      const batch = writeBatch(firestore);
      for (const wardOrder of order.wardOrders) {
        for (const orderItem of wardOrder.items) {
          const diaperInfo = diapers.find(d => d.id === orderItem.diaperId);
          const quantityToDeduct = orderItem.unit === 'cartons' && diaperInfo?.piecesPerCarton
            ? orderItem.quantity * diaperInfo.piecesPerCarton
            : orderItem.quantity;
          batch.set(doc(firestore, 'stock', orderItem.diaperId), {
            diaperId: orderItem.diaperId,
            quantity: increment(-quantityToDeduct),
            modifiedAt: serverTimestamp(),
          }, { merge: true });
        }
      }

      const operationId = doc(collection(firestore, '_operationIds')).id;
      queueFirestoreWrite({
        id: `order-stock:${operationId}`,
        type: 'stock',
        label: 'Distribution de commande',
        write: () => batch.commit(),
        onError: error => console.error('Order stock sync failed:', error),
      });

      toast({
        title: "Stock mis à jour",
        description: typeof navigator !== 'undefined' && !navigator.onLine
          ? "La déduction est conservée sur ce téléphone et sera synchronisée."
          : "Les quantités ont été déduites du stock.",
      });
    },
    [firestore, toast, diapers]
  );

  const manualStockUpdate = React.useCallback(async (diaperId: string, newQuantity: number) => {
    if (!firestore || !user) throw new Error("Firestore not initialized");

    const stockDocRef = doc(firestore, 'stock', diaperId);
    const oldQuantity = (stock || []).find(item => item.diaperId === diaperId)?.quantity || 0;
    const diaperInfo = diapers.find(d => d.id === diaperId);
    const notificationRef = doc(collection(firestore, 'notifications'));
    const adjustmentRef = doc(collection(firestore, 'stockAdjustments'));
    const difference = newQuantity - oldQuantity;
    const action = difference > 0 ? 'augmenté' : 'diminué';
    const description = `🔧 ${userProfile?.displayName || user.email} a ${action} le stock de "${diaperInfo?.name || 'un article'}" : ${oldQuantity} → ${newQuantity} pièces (${difference > 0 ? '+' : ''}${difference}).`;
    const batch = writeBatch(firestore);
    batch.set(stockDocRef, {
      diaperId,
      quantity: newQuantity,
      modifiedAt: serverTimestamp(),
    }, { merge: true });
    batch.set(notificationRef, {
      type: 'info',
      title: '⚙️ Ajustement manuel du stock',
      description,
      data: {
        diaperId,
        oldQuantity,
        newQuantity,
        userId: user.uid,
        itemName: diaperInfo?.name,
      },
      date: serverTimestamp(),
      read: false,
    });
    batch.set(adjustmentRef, {
      diaperId,
      itemName: diaperInfo?.name || 'Article inconnu',
      oldQuantity,
      newQuantity,
      difference,
      userId: user.uid,
      userName: userProfile?.displayName || user.email || 'Utilisateur inconnu',
      description,
      date: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    queueFirestoreWrite({
      id: `stock-adjustment:${notificationRef.id}`,
      type: 'stock',
      label: `Ajustement ${diaperInfo?.name || diaperId}`,
      write: () => batch.commit(),
      onError: error => console.error('Manual stock sync failed:', error),
    });

    if (typeof navigator === 'undefined' || navigator.onLine) {
      const subject = `[Lista] Ajustement Manuel du Stock - ${diaperInfo?.name}`;
      const textBody = `Le stock de ${diaperInfo?.name} a été ajusté manuellement par ${userProfile?.displayName || user.email}.\nAncienne quantité: ${oldQuantity} pièces.\nNouvelle quantité: ${newQuantity} pièces.\nÉcart: ${newQuantity - oldQuantity} pièces.`;
      const htmlBody = `
            <p>Bonjour,</p>
            <p>Un ajustement manuel du stock a été effectué par <strong>${userProfile?.displayName || user.email}</strong>.</p>
            <ul>
                <li><strong>Article :</strong> ${diaperInfo?.name}</li>
                <li><strong>Ancienne quantité :</strong> ${oldQuantity} pièces</li>
                <li><strong>Nouvelle quantité :</strong> ${newQuantity} pièces</li>
                <li><strong>Écart :</strong> ${newQuantity - oldQuantity} pièces</li>
            </ul>
      `;
      sendTransactionalEmail({ subject: subject, text: textBody, html: htmlBody });
    }
  }, [firestore, user, userProfile, diapers, stock]);

  const directStockDistribution = React.useCallback(async (items: DeliveryItem[], reason: string, details?: { recipientName?: string; comment?: string }) => {
    if (!firestore || !user) throw new Error("Firestore not initialized");
    for (const item of items) {
      const available = (stock || []).find(stockItem => stockItem.diaperId === item.diaperId)?.quantity || 0;
      if (item.quantity > available) {
        const diaperName = diapers.find(diaper => diaper.id === item.diaperId)?.name || 'Article';
        throw new Error(`Stock insuffisant pour ${diaperName} : ${available} pièce(s) disponible(s).`);
      }
    }

    const distributionRef = doc(collection(firestore, 'directDistributions'));
    const notificationRef = doc(collection(firestore, 'notifications'));
    const batch = writeBatch(firestore);
    for (const item of items) {
      batch.set(doc(firestore, 'stock', item.diaperId), {
        diaperId: item.diaperId,
        quantity: increment(-item.quantity),
        modifiedAt: serverTimestamp(),
      }, { merge: true });
    }

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const itemsCount = items.length;
    const description = `🚚 ${userProfile?.displayName || user.email} a effectué une distribution directe de ${totalItems} pièces (${itemsCount} article(s) différent(s)). Motif: "${reason}"`;

    batch.set(distributionRef, {
        userId: user.uid,
        userName: userProfile?.displayName || user.email || null,
        items,
        reason,
        recipientName: details?.recipientName || null,
        comment: details?.comment || null,
        totalPieces: totalItems,
        itemCount: itemsCount,
        source: 'direct-stock-distribution',
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        clientOperationId: distributionRef.id,
      });

    batch.set(notificationRef, {
      type: 'info',
      title: '📤 Distribution directe de stock',
      description,
      data: {
        distributionId: distributionRef.id,
        userId: user.uid,
        items,
        reason,
        recipientName: details?.recipientName || null,
        comment: details?.comment || null,
        directDistributionKind: 'external-person',
      },
      date: serverTimestamp(),
      read: false,
    });

    queueFirestoreWrite({
      id: `distribution:${distributionRef.id}`,
      type: 'distribution',
      label: `Sortie directe - ${details?.recipientName || reason}`,
      write: () => batch.commit(),
      onError: error => console.error('Direct distribution sync failed:', error),
    });

    if (typeof navigator === 'undefined' || navigator.onLine) {
      const itemsListHtml = items.map(item => `<li>${diapers.find(d => d.id === item.diaperId)?.name || 'Article inconnu'}: ${item.quantity} pièces</li>`).join('');
      const subject = `[Lista] Distribution Directe - ${reason}`;
      const htmlBody = `
            <p>Bonjour,</p>
            <p>Une distribution directe de stock a été effectuée par <strong>${userProfile?.displayName || user.email}</strong>.</p>
            <p><strong>Raison :</strong> ${reason}</p>
            <p><strong>Articles distribués :</strong></p>
            <ul>${itemsListHtml}</ul>
      `;
      sendTransactionalEmail({ subject: subject, text: description, html: htmlBody });
    }
  }, [firestore, user, userProfile, diapers, stock]);

  const value = { stock: stock || [], isLoading, updateStock, deductStockFromOrder, manualStockUpdate, directStockDistribution };

  return (
    <StockContext.Provider value={value}>{children}</StockContext.Provider>
  );
}

export function useStock() {
  const context = React.useContext(StockContext);
  if (context === undefined) {
    throw new Error('useStock must be used within a StockProvider');
  }
  return context;
}
