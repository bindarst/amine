
'use client';

import * as React from 'react';
import {
  collection,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  writeBatch,
  where,
} from 'firebase/firestore';
import type { Order, Diaper, Ward, UserProfile, WithId } from '@/lib/types';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useToast } from '@/components/ui/use-toast';
import { detectConsumptionAnomaly } from '@/ai/flows/anomaly-detection-and-alerting';
import { useDoc } from '@/firebase/firestore/use-doc';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useStock } from '../stock/stock-context';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { sendTransactionalEmail } from '@/lib/actions';
import { queueFirestoreWrite } from '@/lib/offline-sync';
import { getOrderStatusLabel } from '@/lib/order-status';

interface OrdersContextType {
  orders: WithId<Order>[];
  isLoading: boolean;
  addOrder: (
    order: Omit<Order, 'id' | 'createdAt' | 'modifiedAt' | 'userId'>,
    diapers: WithId<Diaper>[],
    wards: WithId<Ward>[]
  ) => Promise<void>;
  updateOrder: (
    orderId: string,
    updates: Partial<Omit<Order, 'id' | 'createdAt' | 'modifiedAt'>>
  ) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  deleteAllOrders: () => Promise<void>;
}

const OrdersContext = React.createContext<OrdersContextType | undefined>(
  undefined
);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const { deductStockFromOrder } = useStock();

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'orders'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile } = useDoc<UserProfile>(userDocRef);


  const addNotification = React.useCallback(async (notificationData: any) => {
    if (!firestore) return;
    const notificationsCollectionRef = collection(firestore, 'notifications');
    // Using non-blocking write for notifications as well
    addDocumentNonBlocking(notificationsCollectionRef, {
      ...notificationData,
      date: serverTimestamp(),
      read: false,
    });
  }, [firestore]);

  const checkForAnomalies = React.useCallback(
    async (
      newOrderData: Omit<Order, 'id' | 'createdAt' | 'modifiedAt' | 'userId'>,
      allOrders: WithId<Order>[],
      diapers: WithId<Diaper>[],
      wards: WithId<Ward>[]
    ) => {
      for (const wardOrder of newOrderData.wardOrders) {
        for (const item of wardOrder.items) {
          const diaper = diapers.find(d => d.id === item.diaperId);
          if (!diaper) continue;

          const historicalData = allOrders
            .flatMap(o => o.wardOrders)
            .filter(wo => wo.wardId === wardOrder.wardId)
            .flatMap(wo => wo.items)
            .filter(i => i.diaperId === item.diaperId)
            .map(i => {
              const historicDiaper = diapers.find(d => d.id === i.diaperId);
              return i.unit === 'cartons' && historicDiaper ? i.quantity * historicDiaper.piecesPerCarton : i.quantity;
            });

          const currentQuantity = item.unit === 'cartons' && diaper ? item.quantity * diaper.piecesPerCarton : item.quantity;
          const consumptionData = [...historicalData, currentQuantity];

          if (consumptionData.length > 5) { // Need enough data for analysis
            try {
              const anomalyResult = await detectConsumptionAnomaly({
                itemId: item.diaperId,
                wardId: wardOrder.wardId,
                consumptionData: consumptionData,
              });

              if (anomalyResult.isAnomaly) {
                const ward = wards.find(w => w.id === wardOrder.wardId);
                const notification = {
                  type: 'anomaly',
                  title: '⚠️ Anomalie de consommation détectée',
                  description: `Une consommation ${anomalyResult.zScore > 0 ? 'anormalement élevée' : 'inhabituellement basse'} de "${diaper.name}" a été détectée pour ${ward?.name || 'un étage inconnu'}. Écart: ${Math.abs(anomalyResult.zScore).toFixed(1)}σ par rapport à la moyenne.`,
                  data: {
                    ...anomalyResult,
                    wardName: ward?.name,
                    itemName: diaper.name,
                  },
                  forRole: 'Admin'
                };
                await addNotification(notification);
                toast({
                  title: notification.title,
                  description: notification.description,
                  variant: 'destructive'
                });
              }
            } catch (error) {
              console.error("Error detecting anomaly", error);
            }
          }
        }
      }
    },
    [addNotification, toast]
  );


  const addOrder = React.useCallback(
    async (orderData: Omit<Order, 'id' | 'createdAt' | 'modifiedAt' | 'userId'>, allDiapers: WithId<Diaper>[], allWards: WithId<Ward>[]) => {
      if (!user || !firestore) {
        throw new Error('User or Firestore not available');
      }
      const orderRef = doc(collection(firestore, 'orders'));
      const notificationRef = doc(collection(firestore, 'notifications'));
      const involvedWards = orderData.wardOrders.map(wo => allWards.find(w => w.id === wo.wardId)?.name).filter(Boolean).join(', ');
      const totalItems = orderData.wardOrders.reduce((sum, wo) => sum + wo.items.length, 0);
      let description = `📦 ${userProfile?.displayName || user.email} a créé une nouvelle commande pour ${orderData.wardOrders.length} étage(s) : ${involvedWards}. Total: ${totalItems} article(s) différent(s).`;
      if (orderData.comment) description += ` 💬 "${orderData.comment}"`;

      const batch = writeBatch(firestore);
      batch.set(orderRef, {
        ...orderData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        modifiedAt: serverTimestamp(),
        clientOperationId: orderRef.id,
      });
      batch.set(notificationRef, {
        type: 'order',
        title: '✨ Nouvelle commande créée',
        description,
        data: { orderId: orderRef.id, userId: user.uid },
        date: serverTimestamp(),
        read: false,
      });

      queueFirestoreWrite({
        id: `order:${orderRef.id}`,
        type: 'order',
        label: `Commande ${involvedWards}`,
        write: () => batch.commit(),
        onError: error => console.error('Order sync failed:', error),
      });

      if (typeof navigator === 'undefined' || navigator.onLine) {
        const subject = `[Lista] Nouvelle Commande Créée - ${involvedWards}`;
        const textBody = `Une nouvelle commande a été créée par ${userProfile?.displayName || user.email} pour les étages suivants : ${involvedWards}.\n${orderData.comment ? `Commentaire: ${orderData.comment}` : ''}\nConsultez la commande sur l'application.`;
        const htmlBody = `
            <p>Bonjour,</p>
            <p>Une nouvelle commande a été créée par <strong>${userProfile?.displayName || user.email}</strong>.</p>
            <p><strong>Étages concernés :</strong> ${involvedWards}</p>
            ${orderData.comment ? `<p><strong>Commentaire :</strong> <em>${orderData.comment}</em></p>` : ''}
            <p>Vous pouvez consulter les détails de la commande sur l'application Lista.</p>
        `;
        sendTransactionalEmail({ subject: subject, text: textBody, html: htmlBody });

        const ordersQuery = query(collection(firestore, 'orders'), orderBy('date', 'desc'));
        getDocs(ordersQuery).then(allOrdersSnapshot => {
          const allOrders: WithId<Order>[] = allOrdersSnapshot.docs.map(snapshot => ({ id: snapshot.id, ...snapshot.data() } as WithId<Order>));
          checkForAnomalies(orderData, allOrders, allDiapers, allWards);
        }).catch(error => console.error("Error fetching all orders for anomaly check:", error));
      }

    },
    [user, firestore, checkForAnomalies, userProfile]
  );

  const updateOrder = React.useCallback(async (orderId: string, updates: Partial<Omit<Order, 'id' | 'createdAt'>>) => {
    if (!firestore || !user) {
      throw new Error('User or Firestore not available');
    }
    const orderDocRef = doc(firestore, 'orders', orderId);

    try {
      const originalOrder = orders?.find(order => order.id === orderId);
      if (!originalOrder) throw new Error("La commande n'est pas disponible dans le cache local.");
      if (updates.status === 'distributed' && originalOrder.status === 'distributed') return;

      const operationId = doc(collection(firestore, '_operationIds')).id;
      const batch = writeBatch(firestore);
      batch.update(orderDocRef, { ...updates, modifiedAt: serverTimestamp() });
      queueFirestoreWrite({
        id: `order-update:${operationId}`,
        type: 'order',
        label: updates.status === 'distributed' ? 'Distribution de commande' : 'Modification de commande',
        write: () => batch.commit(),
        onError: error => console.error('Order update sync failed:', error),
      });

      // Notifications after successful transaction
      if (updates.status === 'distributed') {
        const distributedNotification = {
          type: 'info',
          title: '✅ Commande distribuée',
          description: `✓ La commande du ${originalOrder?.date ? new Date(originalOrder.date).toLocaleDateString('fr-FR') : 'date inconnue'} a été marquée comme distribuée par ${userProfile?.displayName || user.email}. Le stock a été automatiquement déduit.`,
          data: {
            orderId: orderId,
            userId: user.uid,
          }
        };
        addNotification(distributedNotification);

        // Email Notification for distribution
        const subject = `[Lista] Commande Distribuée`;
        const textBody = `La commande du ${originalOrder?.date ? new Date(originalOrder.date).toLocaleDateString() : ''} a été marquée comme distribuée par ${userProfile?.displayName || user.email}. Le stock a été mis à jour.`;
        const htmlBody = `
                  <p>Bonjour,</p>
                  <p>La commande du <strong>${originalOrder?.date ? new Date(originalOrder.date).toLocaleDateString() : ''}</strong> a été marquée comme distribuée par <strong>${userProfile?.displayName || user.email}</strong>.</p>
                  <p>Le stock a été automatiquement déduit.</p>
              `;
        sendTransactionalEmail({ subject: subject, text: textBody, html: htmlBody });


        const orderToDeduct = orders?.find(o => o.id === orderId);
        if (orderToDeduct) {
          await deductStockFromOrder(orderToDeduct);
        } else {
          toast({
            title: "Erreur",
            description: "Impossible de trouver la commande pour déduire le stock.",
            variant: 'destructive',
          })
        }
      } else {
        // Generic modification notification
        let description = `📝 La commande a été modifiée par ${userProfile?.displayName || user.email}. `;
        if (updates.comment) {
          description += `💬 Nouveau commentaire: "${updates.comment}"`
        } else if (updates.status) {
          description += `Statut mis à jour : ${getOrderStatusLabel(updates.status)}`
        } else {
          description += 'Informations mises à jour.'
        }
        const modificationNotification = {
          type: 'order',
          title: '🔄 Commande modifiée',
          description: description,
          data: {
            orderId: orderId,
            userId: user.uid,
          }
        };
        addNotification(modificationNotification);
      }


      toast({
        title: "Commande mise à jour",
        description: "Les modifications ont été enregistrées.",
      });

    } catch (error) {
      console.error("Order update failed:", error);
      const permissionError = new FirestorePermissionError({
        path: orderDocRef.path,
        operation: 'update',
        requestResourceData: updates,
      })
      errorEmitter.emit('permission-error', permissionError);
      throw error;
    }
  }, [firestore, user, orders, toast, userProfile, addNotification, deductStockFromOrder]);


  const deleteOrder = React.useCallback(async (orderId: string) => {
    if (!firestore) throw new Error("Firestore not initialized");

    try {
      // Create a batch write
      const batch = writeBatch(firestore);

      // 1. Reference to the order to be deleted
      const orderDocRef = doc(firestore, 'orders', orderId);

      // 2. Find all notifications related to this order
      const notificationsRef = collection(firestore, 'notifications');
      const notificationsQuery = query(notificationsRef, where("data.orderId", "==", orderId));
      const querySnapshot = await getDocs(notificationsQuery);

      // 3. Add deletion of notifications to the batch
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 4. Add deletion of the order itself to the batch
      batch.delete(orderDocRef);

      // 5. Commit the batch
      await batch.commit();

    } catch (error) {
      console.error("Failed to delete order and its notifications:", error);
      toast({
        title: 'Erreur de suppression',
        description: "Une erreur est survenue lors de la suppression de la commande.",
        variant: 'destructive'
      });
      const permissionError = new FirestorePermissionError({
        path: `orders/${orderId}`,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  }, [firestore, toast]);


  const deleteAllOrders = React.useCallback(async () => {
    if (!firestore) throw new Error("Firestore not initialized");

    const ordersCollectionRef = collection(firestore, 'orders');
    const querySnapshot = await getDocs(ordersCollectionRef);
    if (querySnapshot.empty) return;

    const batch = writeBatch(firestore);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }, [firestore]);


  const contextValue = {
    orders: orders || [],
    isLoading,
    addOrder,
    updateOrder,
    deleteOrder,
    deleteAllOrders,
  };

  return (
    <OrdersContext.Provider value={contextValue}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const context = React.useContext(OrdersContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within a OrdersProvider');
  }
  return context;
}
