'use client';

import * as React from 'react';
import type { Ward } from '@/lib/types';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useCollection, WithId } from '@/firebase/firestore/use-collection';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';


interface WardsContextType {
    wards: WithId<Ward>[];
    isLoading: boolean;
    addWard: (ward: Omit<Ward, 'id'>) => Promise<void>;
    updateWard: (wardId: string, updates: Partial<Omit<Ward, 'id'>>) => Promise<void>;
    deleteWard: (wardId: string) => Promise<void>;
}

const WardsContext = React.createContext<WardsContextType | undefined>(undefined);

export function WardsProvider({ children }: { children: React.ReactNode }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const wardsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'wards'), orderBy('name', 'asc'));
    }, [firestore]);

    const { data: wards, isLoading } = useCollection<Ward>(wardsQuery);

    const addWard = React.useCallback(async (wardData: Omit<Ward, 'id'>) => {
        if (!firestore) throw new Error("Firestore not initialized");
        const wardsCollection = collection(firestore, 'wards');
        addDocumentNonBlocking(wardsCollection, wardData);
    }, [firestore]);

    const updateWard = React.useCallback(async (wardId: string, updates: Partial<Omit<Ward, 'id'>>) => {
        if (!firestore) throw new Error("Firestore not initialized");
        const wardDocRef = doc(firestore, 'wards', wardId);
        updateDocumentNonBlocking(wardDocRef, updates);
    }, [firestore]);

    const deleteWard = React.useCallback(async (wardId: string) => {
       if (!firestore) throw new Error("Firestore not initialized");
        const wardDocRef = doc(firestore, 'wards', wardId);
        deleteDocumentNonBlocking(wardDocRef);
    }, [firestore]);

    return (
        <WardsContext.Provider value={{ wards: wards || [], isLoading, addWard, updateWard, deleteWard }}>
            {children}
        </WardsContext.Provider>
    );
}

export function useWards() {
    const context = React.useContext(WardsContext);
    if (context === undefined) {
        throw new Error('useWards must be used within a WardsProvider');
    }
    return context;
}
