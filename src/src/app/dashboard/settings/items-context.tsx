'use client';

import * as React from 'react';
import { collection, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import type { Diaper } from '@/lib/types';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useCollection, WithId } from '@/firebase/firestore/use-collection';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

interface ItemsContextType {
    items: WithId<Diaper>[];
    isLoading: boolean;
    addItem: (item: Omit<Diaper, 'id' | 'createdAt' | 'modifiedAt'>) => Promise<void>;
    updateItem: (itemId: string, updates: Partial<Omit<Diaper, 'id'>>) => Promise<void>;
    deleteItem: (itemId: string) => Promise<void>;
}

const ItemsContext = React.createContext<ItemsContextType | undefined>(undefined);

export function ItemsProvider({ children }: { children: React.ReactNode }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const itemsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'items'), orderBy('name', 'asc'));
    }, [firestore]);

    const { data: items, isLoading } = useCollection<Diaper>(itemsQuery);

    const addItem = React.useCallback(async (itemData: Omit<Diaper, 'id'| 'createdAt' | 'modifiedAt'>) => {
        if (!firestore) throw new Error("Firestore not initialized");
        const itemsCollectionRef = collection(firestore, 'items');
        addDocumentNonBlocking(itemsCollectionRef, {
            ...itemData,
            createdAt: serverTimestamp(),
            modifiedAt: serverTimestamp(),
        });
    }, [firestore]);

    const updateItem = React.useCallback(async (itemId: string, updates: Partial<Omit<Diaper, 'id'>>) => {
        if (!firestore) throw new Error("Firestore not initialized");
        const itemDocRef = doc(firestore, 'items', itemId);
        updateDocumentNonBlocking(itemDocRef, {
            ...updates,
            modifiedAt: serverTimestamp(),
        });
    }, [firestore]);

    const deleteItem = React.useCallback(async (itemId: string) => {
        if (!firestore) throw new Error("Firestore not initialized");
        const itemDocRef = doc(firestore, 'items', itemId);
        deleteDocumentNonBlocking(itemDocRef);
    }, [firestore]);

    return (
        <ItemsContext.Provider value={{ items: items || [], isLoading, addItem, updateItem, deleteItem }}>
            {children}
        </ItemsContext.Provider>
    );
}

export function useItems() {
    const context = React.useContext(ItemsContext);
    if (context === undefined) {
        throw new Error('useItems must be used within a ItemsProvider');
    }
    return context;
}
