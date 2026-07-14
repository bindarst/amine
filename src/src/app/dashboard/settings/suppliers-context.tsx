
'use client';

import * as React from 'react';
import type { Supplier } from '@/lib/types';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useCollection, WithId } from '@/firebase/firestore/use-collection';
import { collection, doc, query, orderBy, writeBatch } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';


interface SuppliersContextType {
    suppliers: WithId<Supplier>[];
    isLoading: boolean;
    addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
    updateSupplier: (supplierId: string, updates: Partial<Omit<Supplier, 'id'>>) => Promise<void>;
    deleteSupplier: (supplierId: string) => Promise<void>;
    setAsDefault: (supplierId: string) => Promise<void>;
}

const SuppliersContext = React.createContext<SuppliersContextType | undefined>(undefined);

export function SuppliersProvider({ children }: { children: React.ReactNode }) {
    const { firestore } = useFirebase();

    const suppliersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'suppliers'), orderBy('name', 'asc'));
    }, [firestore]);

    const { data: suppliers, isLoading } = useCollection<Supplier>(suppliersQuery);

    const addSupplier = React.useCallback(async (supplierData: Omit<Supplier, 'id'>) => {
        if (!firestore) throw new Error("Firestore not initialized");
        const suppliersCollection = collection(firestore, 'suppliers');
        addDocumentNonBlocking(suppliersCollection, supplierData);
    }, [firestore]);

    const updateSupplier = React.useCallback(async (supplierId: string, updates: Partial<Omit<Supplier, 'id'>>) => {
        if (!firestore) throw new Error("Firestore not initialized");
        const supplierDocRef = doc(firestore, 'suppliers', supplierId);
        updateDocumentNonBlocking(supplierDocRef, updates);
    }, [firestore]);

    const deleteSupplier = React.useCallback(async (supplierId: string) => {
       if (!firestore) throw new Error("Firestore not initialized");
        const supplierDocRef = doc(firestore, 'suppliers', supplierId);
        deleteDocumentNonBlocking(supplierDocRef);
    }, [firestore]);

    const setAsDefault = React.useCallback(async (supplierId: string) => {
        if (!firestore || !suppliers) throw new Error("Firestore or suppliers not available");

        const batch = writeBatch(firestore);

        // Unset any other default supplier
        suppliers.forEach(s => {
            if (s.isDefault && s.id !== supplierId) {
                const docRef = doc(firestore, 'suppliers', s.id);
                batch.update(docRef, { isDefault: false });
            }
        });

        // Set the new default supplier
        const newDefaultRef = doc(firestore, 'suppliers', supplierId);
        batch.update(newDefaultRef, { isDefault: true });

        try {
            await batch.commit();
        } catch (error) {
            const permissionError = new FirestorePermissionError({
                path: 'suppliers', // Path is simplified for batch writes
                operation: 'write',
                requestResourceData: { updatedIds: [supplierId, ...suppliers.filter(s => s.isDefault).map(s=>s.id)] },
            });
            errorEmitter.emit('permission-error', permissionError);
        }

    }, [firestore, suppliers]);

    return (
        <SuppliersContext.Provider value={{ suppliers: suppliers || [], isLoading, addSupplier, updateSupplier, deleteSupplier, setAsDefault }}>
            {children}
        </SuppliersContext.Provider>
    );
}

export function useSuppliers() {
    const context = React.useContext(SuppliersContext);
    if (context === undefined) {
        throw new Error('useSuppliers must be used within a SuppliersProvider');
    }
    return context;
}
