
'use client';

import * as React from 'react';
import type { StockItem, DeliveryItem, Order, UserProfile, Diaper, WithId } from '@/lib/types';
import { useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { useItems } from '../settings/items-context';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { sendTransactionalEmail } from '@/lib/actions';

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

      try {
        await runTransaction(firestore, async (transaction) => {
          const stockUpdates = [];

          // Phase 1: Read all data
          for (const deliveredItem of deliveredItems) {
            const stockDocRef = doc(firestore, 'stock', deliveredItem.diaperId);
            const stockDoc = await transaction.get(stockDocRef);
            const diaperInfo = diapers.find(d => d.id === deliveredItem.diaperId);

            const currentQuantity = stockDoc.exists() ? stockDoc.data().quantity || 0 : 0;
            const newQuantity = currentQuantity + deliveredItem.quantity;

            stockUpdates.push({
              ref: stockDocRef,
              newQuantity: newQuantity,
              exists: stockDoc.exists(),
              diaperInfo: diaperInfo,
              oldQuantity: currentQuantity,
            });
          }

          // Phase 2: Perform all writes
          for (const update of stockUpdates) {
            if (update.exists) {
              transaction.update(update.ref, {
                quantity: update.newQuantity,
                modifiedAt: serverTimestamp(),
              });
            } else {
              transaction.set(update.ref, {
                diaperId: update.diaperInfo?.id,
                quantity: update.newQuantity,
                createdAt: serverTimestamp(),
                modifiedAt: serverTimestamp(),
              });
            }
          }

          // Phase 3: Trigger notifications after transaction is prepared
          for (const update of stockUpdates) {
            if (update.diaperInfo) {
              checkLowStockAndNotify(update.diaperInfo, update.oldQuantity, update.newQuantity);
            }
          }
        });
      } catch (error) {
        console.error('Stock update transaction failed: ', error);
        const permissionError = new FirestorePermissionError({
          path: 'stock',
          operation: 'write',
          requestResourceData: deliveredItems,
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    },
    [firestore, diapers, checkLowStockAndNotify]
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

      try {
        await runTransaction(firestore, async (transaction) => {
          const stockUpdates = [];

          // Phase 1: Read all data first
          for (const wardOrder of order.wardOrders) {
            for (const orderItem of wardOrder.items) {
              const stockDocRef = doc(firestore, 'stock', orderItem.diaperId);
              const stockDoc = await transaction.get(stockDocRef);
              const diaperInfo = diapers.find(d => d.id === orderItem.diaperId);

              if (stockDoc.exists() && diaperInfo) {
                const quantityToDeduct = orderItem.unit === 'cartons' && diaperInfo.piecesPerCarton
                  ? orderItem.quantity * diaperInfo.piecesPerCarton
                  : orderItem.quantity;

                const currentQuantity = stockDoc.data().quantity || 0;
                const newQuantity = Math.max(0, currentQuantity - quantityToDeduct);

                stockUpdates.push({
                  ref: stockDocRef,
                  newQuantity: newQuantity,
                  diaperInfo: diaperInfo,
                  oldQuantity: currentQuantity
                });
              } else {
                console.warn(`Stock document for item ${orderItem.diaperId} not found. Cannot deduct stock.`);
              }
            }
          }

          // Phase 2: Perform all writes
          for (const update of stockUpdates) {
            transaction.update(update.ref, {
              quantity: update.newQuantity,
              modifiedAt: serverTimestamp(),
            });
          }

          // Phase 3: Trigger notifications (non-blocking) after transaction is prepared
          for (const update of stockUpdates) {
            checkLowStockAndNotify(update.diaperInfo, update.oldQuantity, update.newQuantity);
          }
        });
        toast({
          title: "Stock Mis à Jour",
          description: "Les quantités ont été déduites du stock.",
        });
      } catch (error) {
        console.error("Stock deduction transaction failed: ", error);
        const permissionError = new FirestorePermissionError({
          path: 'stock', // Path is simplified for batch writes
          operation: 'write',
          requestResourceData: order.wardOrders,
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    },
    [firestore, toast, diapers, checkLowStockAndNotify]
  );

  const manualStockUpdate = React.useCallback(async (diaperId: string, newQuantity: number) => {
    if (!firestore || !user) throw new Error("Firestore not initialized");

    const stockDocRef = doc(firestore, 'stock', diaperId);
    let oldQuantity = 0;
    const diaperInfo = diapers.find(d => d.id === diaperId);

    try {
      await runTransaction(firestore, async (transaction) => {
        const stockDoc = await transaction.get(stockDocRef);
        if (stockDoc.exists()) {
          oldQuantity = stockDoc.data().quantity || 0;
          transaction.update(stockDocRef, {
            quantity: newQuantity,
            modifiedAt: serverTimestamp(),
          });
        } else {
          oldQuantity = 0;
          transaction.set(stockDocRef, {
            diaperId: diaperId,
            quantity: newQuantity,
            createdAt: serverTimestamp(),
            modifiedAt: serverTimestamp(),
          });
        }
      });

      const difference = newQuantity - oldQuantity;
      const action = difference > 0 ? 'augmenté' : 'diminué';
      const description = `🔧 ${userProfile?.displayName || user.email} a ${action} le stock de "${diaperInfo?.name || 'un article'}" : ${oldQuantity} → ${newQuantity} pièces (${difference > 0 ? '+' : ''}${difference}).`;
      // In-app Notification
      const notification = {
        type: 'info' as const,
        title: '⚙️ Ajustement manuel du stock',
        description: description,
        data: {
          diaperId: diaperId,
          oldQuantity: oldQuantity,
          newQuantity: newQuantity,
          userId: user.uid,
          itemName: diaperInfo?.name
        }
      };
      addNotification(notification);

      // Email Notification
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

      // Check for low stock
      if (diaperInfo) {
        checkLowStockAndNotify(diaperInfo, oldQuantity, newQuantity);
      }

    } catch (error) {
      console.error("Manual stock update failed:", error);
      const permissionError = new FirestorePermissionError({
        path: stockDocRef.path,
        operation: 'write',
        requestResourceData: { quantity: newQuantity },
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  }, [firestore, user, userProfile, diapers, addNotification, checkLowStockAndNotify]);

  const directStockDistribution = React.useCallback(async (items: DeliveryItem[], reason: string, details?: { recipientName?: string; comment?: string }) => {
    if (!firestore || !user) throw new Error("Firestore not initialized");

    try {
      await runTransaction(firestore, async (transaction) => {
        const stockUpdates = [];

        // Phase 1: Read all data
        for (const item of items) {
          const stockDocRef = doc(firestore, 'stock', item.diaperId);
          const stockDoc = await transaction.get(stockDocRef);
          const diaperInfo = diapers.find(d => d.id === item.diaperId);

          if (stockDoc.exists() && diaperInfo) {
            const currentQuantity = stockDoc.data().quantity || 0;
            const newQuantity = Math.max(0, currentQuantity - item.quantity);
            stockUpdates.push({
              ref: stockDocRef,
              newQuantity: newQuantity,
              diaperInfo: diaperInfo,
              oldQuantity: currentQuantity,
            });
          } else {
            console.warn(`Stock document for item ${item.diaperId} not found. Cannot deduct stock.`);
          }
        }

        // Phase 2: Perform all writes
        for (const update of stockUpdates) {
          transaction.update(update.ref, {
            quantity: update.newQuantity,
            modifiedAt: serverTimestamp(),
          });
        }

        // Phase 3: Trigger notifications
        for (const update of stockUpdates) {
          checkLowStockAndNotify(update.diaperInfo, update.oldQuantity, update.newQuantity);
        }
      });

      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const itemsCount = items.length;
      const description = `🚚 ${userProfile?.displayName || user.email} a effectué une distribution directe de ${totalItems} pièces (${itemsCount} article(s) différent(s)). Motif: "${reason}"`;

      // In-app Notification
      const notification = {
        type: 'info' as const,
        title: '📤 Distribution directe de stock',
        description: description,
        data: {
          userId: user.uid,
          items,
          reason,
          recipientName: details?.recipientName || null,
          comment: details?.comment || null,
          directDistributionKind: 'external-person',
        }
      };
      addNotification(notification);

      addDocumentNonBlocking(collection(firestore, 'directDistributions'), {
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
      });

      // Email Notification
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


    } catch (error) {
      console.error("Direct stock distribution failed:", error);
      const permissionError = new FirestorePermissionError({
        path: 'stock',
        operation: 'write',
        requestResourceData: { items },
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  }, [firestore, user, userProfile, addNotification, diapers, checkLowStockAndNotify]);

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
