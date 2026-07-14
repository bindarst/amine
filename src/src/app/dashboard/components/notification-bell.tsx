
'use client';

import * as React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, Trash2, CheckCircle, Package, Truck, Archive, User as UserIcon, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '../notifications-context';
import { WithId } from '@/firebase/firestore/use-collection';
import type { Notification } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useUsers } from '../settings/users-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

export default function NotificationBell() {
  const { notifications, isLoading, deleteUserNotifications } = useNotifications();
  const { firestore } = useFirebase();
  const { currentUserProfile } = useUsers();
  const router = useRouter();
  const { toast } = useToast();
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

  const unreadCount = React.useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);
  
  const handleNotificationClick = async (notification: WithId<Notification>) => {
    setIsPopoverOpen(false); // Close popover immediately
    if (!notification.read && firestore) {
      const notifRef = doc(firestore, 'notifications', notification.id);
      await updateDoc(notifRef, { read: true });
    }
    
    let href = '';
    if (notification.type === 'order' && notification.data?.orderId) {
        href = `/dashboard/orders/${notification.data.orderId}`;
    } else if (notification.type === 'delivery' && notification.data?.deliveryId) {
        href = `/dashboard/deliveries/${notification.data.deliveryId}`;
    } else if (notification.type === 'info' && notification.data?.orderId) { // For distribution notifications
        href = `/dashboard/orders/${notification.data.orderId}`;
    } else if (notification.type === 'user') {
        href = `/dashboard/settings`;
    } else if (notification.type === 'stock') {
        href = `/dashboard/stock?filter=low`;
    } else if (notification.type === 'info' && notification.data?.diaperId) {
        href = `/dashboard/stock`;
    }


    if (href) {
        router.push(href);
    }
  };
  
  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation(); 
    if (!firestore) return;
    const notifRef = doc(firestore, 'notifications', notificationId);
    try {
      await deleteDoc(notifRef);
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const handleClearAll = () => {
    if (currentUserProfile?.role === 'Admin') {
        setIsConfirmOpen(true);
    } else {
        const userNotificationsIds = notifications.map(n => n.id);
        deleteUserNotifications(userNotificationsIds);
        toast({
            title: 'Notifications effacées',
            description: 'Votre liste de notifications a été vidée.',
        });
        setIsPopoverOpen(false);
    }
  }

  const handleAdminConfirmClearAll = async () => {
    const notificationIds = notifications.map(n => n.id);
    await deleteUserNotifications(notificationIds);
    toast({
        title: 'Notifications effacées',
        description: 'Toutes les notifications visibles ont été supprimées.',
    });
    setIsPopoverOpen(false);
  }

  const getNotificationAppearance = (type: Notification['type']) => {
    switch (type) {
      case 'order':
        return { 
          icon: <Package className="h-5 w-5 text-[#E3B341]" />, 
          cardClass: "bg-[#FFE8A3]/30 border-l-4 border-l-[#E3B341]" 
        };
      case 'delivery':
        return { 
          icon: <Truck className="h-5 w-5 text-[#7C5CFF]" />, 
          cardClass: "bg-[#D9D4FF]/30 border-l-4 border-l-[#7C5CFF]" 
        };
      case 'stock':
      case 'info': // Group 'info' with 'stock' for consistent coloring
        return { 
          icon: <Archive className="h-5 w-5 text-[#4ECBCB]" />, 
          cardClass: "bg-[#B3F2F2]/30 border-l-4 border-l-[#4ECBCB]" 
        };
      case 'user':
        return { 
          icon: <UserIcon className="h-5 w-5 text-indigo-500" />, 
          cardClass: "bg-indigo-100/50 border-l-4 border-l-indigo-500" 
        };
      case 'anomaly':
         return { 
          icon: <AlertTriangle className="h-5 w-5 text-red-500" />, 
          cardClass: "bg-red-100/50 border-l-4 border-l-red-500" 
        };
      default:
        return { 
          icon: <Bell className="h-5 w-5 text-gray-500" />, 
          cardClass: "bg-gray-100/50 border-l-4 border-l-gray-500" 
        };
    }
  };


  return (
    <>
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full w-9 h-9"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-2 pt-1 border-b">
            <h4 className="font-semibold text-lg pl-2">Notifications</h4>
             {notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearAll}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Tout effacer
                </Button>
            )}
        </div>
        <ScrollArea className="h-[450px]">
          <div className="p-2">
            {isLoading ? (
                <div className="flex items-center justify-center p-4">
                    <p className="text-sm text-muted-foreground">Chargement...</p>
                </div>
            ) : notifications.length > 0 ? (
                <ul className="space-y-3">
                    {notifications.map(notif => {
                        const isClickable = ['order', 'delivery', 'info', 'user', 'stock'].includes(notif.type) && (notif.data ? (notif.data.orderId || notif.data.deliveryId || notif.data.userId || notif.data.diaperId || notif.type === 'stock') : true);
                        const { icon, cardClass } = getNotificationAppearance(notif.type);

                        return (
                            <li 
                                key={notif.id} 
                                onClick={() => handleNotificationClick(notif)}
                                className={cn(
                                "group relative flex items-start gap-4 p-3 rounded-lg shadow-sm transition-all",
                                isClickable && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
                                cardClass,
                                notif.read && "bg-background/10 opacity-70"
                                )}
                            >
                                <div className="pt-0.5">{icon}</div>

                                <div className="flex-grow">
                                    <p className={cn("font-semibold text-base", !notif.read && "text-foreground")}>{notif.title}</p>
                                    <p className={cn("text-sm", !notif.read ? "text-foreground/80" : "text-muted-foreground")}>{notif.description}</p>
                                    {notif.date?.toDate && (
                                        <p className={cn("text-xs pt-1", !notif.read ? "text-foreground/60" : "text-muted-foreground")}>{new Date(notif.date.toDate()).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                    )}
                                </div>
                                {currentUserProfile?.role === 'Admin' && <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className={cn(
                                        "absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                                        "text-muted-foreground"
                                    )}
                                    onClick={(e) => handleDeleteNotification(e, notif.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>}
                            </li>
                        )
                    })}
                </ul>
            ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 h-80">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-4"/>
                    <p className="font-semibold text-base">Tout est calme !</p>
                    <p className="text-muted-foreground text-sm">Aucune nouvelle notification.</p>
                </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
    <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>Confirmation Administrateur</AlertDialogTitle>
            <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer toutes les notifications visibles ? Cette action est irréversible.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdminConfirmClearAll} className="bg-destructive hover:bg-destructive/90">
            Oui, tout effacer
            </AlertDialogAction>
        </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
