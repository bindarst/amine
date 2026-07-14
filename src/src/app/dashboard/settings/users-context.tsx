
'use client';

import * as React from 'react';
import type { UserProfile } from '@/lib/types';
import { useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { useCollection, WithId } from '@/firebase/firestore/use-collection';
import { collection, doc, query, writeBatch } from 'firebase/firestore';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

interface UsersContextType {
    users: WithId<UserProfile>[];
    isLoading: boolean;
    updateUserRole: (userId: string, role: UserProfile['role']) => Promise<void>;
    updateUserPushNotifications: (userId: string, enabled: boolean) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    currentUserProfile: WithId<UserProfile> | null;
    isCurrentUserProfileLoading: boolean;
}

const UsersContext = React.createContext<UsersContextType | undefined>(undefined);

export function UsersProvider({ children }: { children: React.ReactNode }) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();

    const currentUserDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    
    const { data: currentUserProfile, isLoading: isCurrentUserProfileLoading } = useDoc<UserProfile>(currentUserDocRef);
    
    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'));
    }, [firestore]);

    const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

    React.useEffect(() => {
        const checkAndSetAdmin = async () => {
            if (user && currentUserProfile && currentUserProfile.email === 'bindarst@hotmail.com' && firestore) {
                // If user is the admin email but is not active OR does not have Admin role, force it.
                if (!currentUserProfile.isActive || currentUserProfile.role !== 'Admin') {
                    const userDoc = doc(firestore, 'users', user.uid);
                    updateDocumentNonBlocking(userDoc, { role: 'Admin', isActive: true });
                }
            }
        };
        checkAndSetAdmin();
    }, [user, currentUserProfile, firestore, toast]);

    const updateUserRole = React.useCallback(async (userId: string, role: UserProfile['role']) => {
        if (!firestore) return;
        const userDocRef = doc(firestore, 'users', userId);
        // When a role is assigned, always ensure the user becomes active.
        updateDocumentNonBlocking(userDocRef, { role, isActive: true });
    }, [firestore]);

    const updateUserPushNotifications = React.useCallback(async (userId: string, enabled: boolean) => {
        if (!firestore) return;
        const userDocRef = doc(firestore, 'users', userId);
        updateDocumentNonBlocking(userDocRef, { pushNotificationsEnabled: enabled });
    }, [firestore]);

    const deleteUser = React.useCallback(async (userId: string) => {
        if (!firestore) return;
        const userDocRef = doc(firestore, 'users', userId);
        deleteDocumentNonBlocking(userDocRef);
    }, [firestore]);


    return (
        <UsersContext.Provider value={{ 
            users: users || [],
            isLoading: areUsersLoading,
            updateUserRole,
            updateUserPushNotifications,
            deleteUser,
            currentUserProfile: currentUserProfile,
            isCurrentUserProfileLoading: isCurrentUserProfileLoading
        }}>
            {children}
        </UsersContext.Provider>
    );
}

export function useUsers() {
    const context = React.useContext(UsersContext);
    if (context === undefined) {
        throw new Error('useUsers must be used within a UsersProvider');
    }
    return context;
}
