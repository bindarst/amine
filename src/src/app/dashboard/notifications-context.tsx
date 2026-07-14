
'use client';

import * as React from 'react';
import { collection, query, orderBy, limit, writeBatch, getDocs, where, or, doc } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useCollection, WithId } from '@/firebase/firestore/use-collection';
import { useUsers } from './settings/users-context';
import { useToast } from '@/hooks/use-toast';

interface NotificationsContextType {
    notifications: WithId<Notification>[];
    isLoading: boolean;
    deleteAllNotifications: () => Promise<void>;
    deleteUserNotifications: (notificationIds: string[]) => Promise<void>;
    deleteAdjustmentHistory: () => Promise<void>;
}

const NotificationsContext = React.createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
    const { firestore, user } = useFirebase();
    const { currentUserProfile } = useUsers();
    const { toast } = useToast();

    const notificationsQuery = useMemoFirebase(() => {
        if (!firestore || !user) {
            return null;
        }
        // Fetch the last 50 notifications, filtering will be done client-side
        return query(
            collection(firestore, 'notifications'),
            orderBy('date', 'desc'),
            limit(50)
        );
    }, [firestore, user]);

    const { data: allNotifications, isLoading: isAllNotificationsLoading } = useCollection<Notification>(notificationsQuery);
    
    const [filteredNotifications, setFilteredNotifications] = React.useState<WithId<Notification>[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        setIsLoading(isAllNotificationsLoading || !currentUserProfile);

        if (!isAllNotificationsLoading && allNotifications && currentUserProfile) {
            const notificationsForUser = allNotifications.filter(notif => {
                if (currentUserProfile.role === 'Admin') {
                    // Admin sees all notifications
                    return true;
                }
                // Other roles see notifications for their role, or notifications with no role specified.
                return !notif.forRole || notif.forRole === currentUserProfile.role;
            });
            setFilteredNotifications(notificationsForUser);
        } else if (!isAllNotificationsLoading) {
            setFilteredNotifications([]);
        }

    }, [allNotifications, isAllNotificationsLoading, currentUserProfile]);

    
    const deleteAllNotifications = React.useCallback(async () => {
        if (!firestore || currentUserProfile?.role !== 'Admin') {
            toast({
                title: "Action non autorisée",
                description: "Seuls les administrateurs peuvent effacer les notifications.",
                variant: 'destructive',
            });
            throw new Error("User is not an admin");
        }

        const notifsCollectionRef = collection(firestore, 'notifications');
        const querySnapshot = await getDocs(notifsCollectionRef);
        
        if (querySnapshot.empty) return;

        const batch = writeBatch(firestore);
        querySnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
    }, [firestore, currentUserProfile, toast]);
    
    const deleteUserNotifications = React.useCallback(async (notificationIds: string[]) => {
        if (!firestore || notificationIds.length === 0) return;

        const batch = writeBatch(firestore);
        notificationIds.forEach(id => {
            const docRef = doc(firestore, 'notifications', id);
            batch.delete(docRef);
        });
        
        try {
            await batch.commit();
        } catch (error) {
            console.error("Failed to delete user notifications:", error);
            toast({
                title: "Erreur",
                description: "Impossible de supprimer les notifications.",
                variant: 'destructive',
            });
        }
    }, [firestore, toast]);
    
    const deleteAdjustmentHistory = React.useCallback(async () => {
        if (!firestore || currentUserProfile?.role !== 'Admin') {
            toast({
                title: "Action non autorisée",
                description: "Seuls les administrateurs peuvent effacer cet historique.",
                variant: 'destructive',
            });
            throw new Error("User is not an admin");
        }

        const notifsCollectionRef = collection(firestore, 'notifications');
        const adjustmentsQuery = query(notifsCollectionRef, where('title', 'in', ['Ajustement manuel du stock', 'Distribution Directe de Stock']));
        
        const querySnapshot = await getDocs(adjustmentsQuery);
        
        if (querySnapshot.empty) {
             toast({
                title: "Historique vide",
                description: "Aucun ajustement de stock à supprimer.",
            });
            return;
        };

        const batch = writeBatch(firestore);
        querySnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();

    }, [firestore, currentUserProfile, toast]);


    const contextValue = {
        notifications: filteredNotifications,
        isLoading,
        deleteAllNotifications,
        deleteUserNotifications,
        deleteAdjustmentHistory,
    };

    return (
        <NotificationsContext.Provider value={contextValue}>
            {children}
        </NotificationsContext.Provider>
    );
}

export function useNotifications() {
    const context = React.useContext(NotificationsContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
}
