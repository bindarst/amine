
'use client';

import * as React from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  writeBatch,
  runTransaction,
  where,
} from 'firebase/firestore';
import type { Order, Diaper, Ward, UserProfile, WithId } from '@/lib/types';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useToast } from '@/hooks/use-toast';
import { detectConsumptionAnomaly } from '@/ai/flows/anomaly-detection-and-alerting';
import { useDoc } from '@/firebase/firestore/use-doc';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useStock } from '../stock/stock-context';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { sendTransactionalEmail } from '@/lib/actions';

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
                    title: 'Anomalie de consommation détectée',
                    description: `Consommation ${anomalyResult.zScore > 0 ? 'élevée' : 'basse'} de "${diaper.name}" pour ${ward?.name || 'un étage inconnu'}.`,
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
      const ordersCollectionRef = collection(firestore, 'orders');
      
      const orderDoc = {
          ...orderData,
          userId: user.uid,
          createdAt: serverTimestamp(),
          modifiedAt: serverTimestamp(),
      };
      
      // Use non-blocking write
      const docRefPromise = addDocumentNonBlocking(ordersCollectionRef, orderDoc);

      // Run post-order tasks in the background
      docRefPromise.then(docRef => {
        if (!docRef) return;
        
        const involvedWards = orderData.wardOrders.map(wo => allWards.find(w => w.id === wo.wardId)?.name).filter(Boolean).join(', ');
        let description = `${userProfile?.displayName || user.email} a créé une commande pour : ${involvedWards}.`;
        if (orderData.comment) {
            description += ` Commentaire : "${orderData.comment}"`;
        }

        // In-app Notification for order creation
        const orderNotification = {
            type: 'order',
            title: 'Nouvelle commande créée',
            description: description,
            data: {
                orderId: docRef.id,
                userId: user.uid,
            },
            forRole: 'Admin'
        };
        addNotification(orderNotification);
        
        // Email Notification
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

        // Anomaly check
        const ordersQuery = query(collection(firestore, 'orders'), orderBy('date', 'desc'));
        if(ordersQuery){
            getDocs(ordersQuery).then(allOrdersSnapshot => {
              const allOrders: WithId<Order>[] = allOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithId<Order>));
              checkForAnomalies(orderData, allOrders, allDiapers, allWards);
            }).catch(e => console.error("Error fetching all orders for anomaly check:", e));
        }
      }).catch(e => {
          console.error("Error adding order document:", e);
           toast({
            title: 'Erreur',
            description: "Impossible d'ajouter la commande.",
            variant: 'destructive',
          });
      });

    },
    [user, firestore, toast, checkForAnomalies, userProfile, addNotification]
  );

  const updateOrder = React.useCallback(async (orderId: string, updates: Partial<Omit<Order, 'id' | 'createdAt'>>) => {
      if (!firestore || !user) {
          throw new Error('User or Firestore not available');
      }
      const orderDocRef = doc(firestore, 'orders', orderId);

      try {
          let originalOrder: Order | null = null;
          await runTransaction(firestore, async (transaction) => {
              const orderDoc = await transaction.get(orderDocRef);
              if (!orderDoc.exists()) {
                  throw new Error("La commande n'existe pas !");
              }
              originalOrder = orderDoc.data() as Order;
              
              const updatedData: Partial<Order> = { ...updates, modifiedAt: serverTimestamp() };
              
              transaction.update(orderDocRef, updatedData);
          });

          // Notifications after successful transaction
          if (updates.status === 'distributed') {
              const distributedNotification = {
                  type: 'info',
                  title: 'Commande distribuée',
                  description: `La commande a été marquée comme distribuée par ${userProfile?.displayName || user.email}.`,
                  data: {
                      orderId: orderId,
                      userId: user.uid,
                  },
                  forRole: 'Admin'
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
             let description = `La commande a été modifiée par ${userProfile?.displayName || user.email}.`;
             if(updates.comment) {
                description += ` Nouveau commentaire: "${updates.comment}"`
             }
            const modificationNotification = {
                type: 'order',
                title: 'Commande modifiée',
                description: description,
                data: {
                    orderId: orderId,
                    userId: user.uid,
                },
                forRole: 'Admin'
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
