
'use client';

import * as React from 'react';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import type { Delivery, UserProfile, DeliveryItem } from '@/lib/types';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useCollection, WithId } from '@/firebase/firestore/use-collection';
import { useToast } from '@/components/ui/use-toast';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import { useStock } from '../stock/stock-context';
import { sendTransactionalEmail } from '@/lib/actions';

interface DeliveriesContextType {
  deliveries: WithId<Delivery>[];
  isLoading: boolean;
  addDelivery: (
    delivery: Omit<Delivery, 'id' | 'createdAt' | 'userId'>
  ) => Promise<string | undefined>;
  firestore: ReturnType<typeof useFirebase>['firestore'];
  deleteAllDeliveries: () => Promise<void>;
}

const DeliveriesContext = React.createContext<
  DeliveriesContextType | undefined
>(undefined);

export function DeliveriesProvider({ children }: { children: React.ReactNode }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const deliveriesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'deliveries'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const { data: deliveries, isLoading } = useCollection<Delivery>(deliveriesQuery);


  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const addNotification = React.useCallback(async (notificationData: any) => {
    if (!firestore) return;
    const notificationsCollectionRef = collection(firestore, 'notifications');
    addDocumentNonBlocking(notificationsCollectionRef, {
      ...notificationData,
      date: serverTimestamp(),
      read: false,
    });
  }, [firestore]);


  const addDelivery = React.useCallback(
    async (deliveryData: Omit<Delivery, 'id' | 'createdAt' | 'userId'>) => {
      if (!firestore || !user) {
        throw new Error('User or Firestore not available');
      }
      const deliveriesCollectionRef = collection(firestore, 'deliveries');

      const deliveryDoc = {
        ...deliveryData,
        userId: user.uid,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDocumentNonBlocking(deliveriesCollectionRef, deliveryDoc);

      if (docRef) {
        // Count total items
        const totalItems = deliveryData.items.length;
        const totalCartons = deliveryData.items.reduce((sum, item) => sum + (item.quantity || 0), 0);

        // In-app Notification
        const deliveryNotification = {
          type: 'delivery',
          title: '🚚 Nouvelle livraison enregistrée',
          description: `📦 Livraison de ${deliveryData.supplier} enregistrée par ${userProfile?.displayName || user.email}. ${totalItems} article(s) différent(s) reçu(s). Le stock a été mis à jour automatiquement.`,
          data: {
            deliveryId: docRef.id,
            userId: user.uid,
            supplier: deliveryData.supplier,
            itemCount: totalItems
          }
        };
        addNotification(deliveryNotification);

        // Email Notification
        const subject = `[Lista] Nouvelle Livraison de ${deliveryData.supplier}`;
        const textBody = `Une nouvelle livraison de ${deliveryData.supplier} a été enregistrée par ${userProfile?.displayName || user.email}.\nLe stock a été mis à jour.`;
        const htmlBody = `
              <p>Bonjour,</p>
              <p>Une nouvelle livraison du fournisseur <strong>${deliveryData.supplier}</strong> a été enregistrée par <strong>${userProfile?.displayName || user.email}</strong>.</p>
              <p>Le stock a été automatiquement mis à jour.</p>
          `;
        sendTransactionalEmail({ subject: subject, text: textBody, html: htmlBody });

        return docRef.id;
      }
      return undefined;
    },
    [firestore, user, userProfile, addNotification]
  );

  const deleteAllDeliveries = React.useCallback(async () => {
    if (!firestore) throw new Error("Firestore not initialized");

    const deliveriesCollectionRef = collection(firestore, 'deliveries');
    const querySnapshot = await getDocs(deliveriesCollectionRef);
    if (querySnapshot.empty) return;

    const batch = writeBatch(firestore);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }, [firestore]);

  const contextValue = {
    deliveries: deliveries || [],
    isLoading,
    addDelivery,
    firestore,
    deleteAllDeliveries,
  };

  return (
    <DeliveriesContext.Provider value={contextValue}>
      {children}
    </DeliveriesContext.Provider>
  );
}

export function useDeliveries() {
  const context = React.useContext(DeliveriesContext);
  if (context === undefined) {
    throw new Error('useDeliveries must be used within a DeliveriesProvider');
  }
  return context;
}
