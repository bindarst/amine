
'use client';

import * as React from 'react';
import {
  collection,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  writeBatch,
  increment,
} from 'firebase/firestore';
import type { Delivery, UserProfile, DeliveryItem } from '@/lib/types';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useCollection, WithId } from '@/firebase/firestore/use-collection';
import { useToast } from '@/components/ui/use-toast';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import { sendTransactionalEmail } from '@/lib/actions';
import { queueFirestoreWrite } from '@/lib/offline-sync';

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

  const addDelivery = React.useCallback(
    async (deliveryData: Omit<Delivery, 'id' | 'createdAt' | 'userId'>) => {
      if (!firestore || !user) {
        throw new Error('User or Firestore not available');
      }
      const deliveryRef = doc(collection(firestore, 'deliveries'));
      const notificationRef = doc(collection(firestore, 'notifications'));
      const batch = writeBatch(firestore);
      batch.set(deliveryRef, {
        ...deliveryData,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      for (const item of deliveryData.items) {
        batch.set(doc(firestore, 'stock', item.diaperId), {
          diaperId: item.diaperId,
          quantity: increment(item.quantity),
          modifiedAt: serverTimestamp(),
        }, { merge: true });
      }

      const totalItems = deliveryData.items.length;
      batch.set(notificationRef, {
        type: 'delivery',
        title: '🚚 Nouvelle livraison enregistrée',
        description: `📦 Livraison de ${deliveryData.supplier} enregistrée par ${userProfile?.displayName || user.email}. ${totalItems} article(s) différent(s) reçu(s). Le stock a été mis à jour automatiquement.`,
        data: {
          deliveryId: deliveryRef.id,
          userId: user.uid,
          supplier: deliveryData.supplier,
          itemCount: totalItems,
        },
        date: serverTimestamp(),
        read: false,
      });

      queueFirestoreWrite({
        id: `delivery:${deliveryRef.id}`,
        type: 'delivery',
        label: `Livraison ${deliveryData.supplier}`,
        write: () => batch.commit(),
        onError: error => console.error('Delivery sync failed:', error),
      });

      if (typeof navigator === 'undefined' || navigator.onLine) {
        const subject = `[Lista] Nouvelle Livraison de ${deliveryData.supplier}`;
        const textBody = `Une nouvelle livraison de ${deliveryData.supplier} a été enregistrée par ${userProfile?.displayName || user.email}.\nLe stock a été mis à jour.`;
        const htmlBody = `
              <p>Bonjour,</p>
              <p>Une nouvelle livraison du fournisseur <strong>${deliveryData.supplier}</strong> a été enregistrée par <strong>${userProfile?.displayName || user.email}</strong>.</p>
              <p>Le stock a été automatiquement mis à jour.</p>
        `;
        sendTransactionalEmail({ subject: subject, text: textBody, html: htmlBody });
      }

      return deliveryRef.id;
    },
    [firestore, user, userProfile]
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
