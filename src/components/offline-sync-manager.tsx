'use client';

import * as React from 'react';
import { useFirebase } from '@/firebase';
import { reconcilePendingWrites } from '@/lib/offline-sync';

export function OfflineSyncManager(): null {
  const { firestore, user } = useFirebase();

  React.useEffect(() => {
    if (!firestore || !user) return;

    const synchronize = () => {
      reconcilePendingWrites(firestore).catch(error => {
        console.warn('Synchronisation hors ligne en attente:', error);
      });
    };

    synchronize();
    window.addEventListener('online', synchronize);
    return () => window.removeEventListener('online', synchronize);
  }, [firestore, user]);

  return null;
}
