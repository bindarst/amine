
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
import { useToast } from '@/components/ui/use-toast';
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
    } else if (notification.type === 'info' && Array.isArray(notification.data?.items) && typeof notification.data?.reason === 'string') {
      href = `/dashboard/stock/direct-distribution/history?notificationId=${notification.id}`;
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
      toast({
        title: "Notification supprimée",
        description: "La notification a été supprimée avec succès.",
      });
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
          icon: <Package className="h-5 w-5" />,
          iconBg: "bg-slate-100 text-slate-700",
          borderColor: "border-l-slate-300"
        };
      case 'delivery':
        return {
          icon: <Truck className="h-5 w-5" />,
          iconBg: "bg-slate-100 text-slate-700",
          borderColor: "border-l-slate-300"
        };
      case 'stock':
      case 'info':
        return {
          icon: <Archive className="h-5 w-5" />,
          iconBg: "bg-slate-100 text-slate-700",
          borderColor: "border-l-slate-300"
        };
      case 'user':
        return {
          icon: <UserIcon className="h-5 w-5" />,
          iconBg: "bg-slate-100 text-slate-700",
          borderColor: "border-l-slate-300"
        };
      case 'anomaly':
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          iconBg: "bg-red-50 text-red-700",
          borderColor: "border-l-red-300"
        };
      default:
        return {
          icon: <Bell className="h-5 w-5" />,
          iconBg: "bg-slate-100 text-slate-700",
          borderColor: "border-l-slate-300"
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
            className="relative rounded-full w-10 h-10 transition-colors hover:bg-muted"
          >
            <Bell className={cn(
              "h-5 w-5 transition-colors",
              unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
            )} />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 min-w-5 justify-center p-0 border border-background bg-slate-900 px-1 text-white shadow-none">
                {unreadCount}
              </Badge>
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[420px] p-0 overflow-hidden border shadow-xl" align="end">
          <div className="relative overflow-hidden bg-background">
            <div className="relative flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <Bell className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">Notifications</h4>
                  {notifications.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {unreadCount > 0 ? `${unreadCount} non lue(s)` : 'Tout lu'}
                    </p>
                  )}
                </div>
              </div>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Tout effacer
                </Button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <ScrollArea className="h-[500px]">
            <div className="p-3">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center p-8 gap-3">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Chargement...</p>
                </div>
              ) : notifications.length > 0 ? (
                <ul className="space-y-2">
                  {notifications.map(notif => {
                    const isClickable = ['order', 'delivery', 'info', 'user', 'stock'].includes(notif.type) && (notif.data ? (notif.data.orderId || notif.data.deliveryId || notif.data.userId || notif.data.diaperId || Array.isArray(notif.data.items) || notif.type === 'stock') : true);
                const { icon, iconBg, borderColor } = getNotificationAppearance(notif.type);

                    return (
                      <li
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={cn(
                          "group relative overflow-hidden rounded-2xl transition-all duration-300",
                          "border border-l-4",
                          isClickable && "cursor-pointer hover:bg-muted/50",
                          !notif.read ? "bg-card" : "bg-muted/20 opacity-80",
                          borderColor
                        )}
                      >
                        <div className="relative flex items-start gap-3 p-4">
                          <div className={cn(
                            "flex-shrink-0 p-2.5 rounded-md",
                            iconBg
                          )}>
                            {icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className={cn(
                                "font-semibold text-sm leading-tight",
                                !notif.read ? "text-foreground" : "text-muted-foreground"
                              )}>
                                {notif.title}
                              </p>
                              {!notif.read && (
                                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-slate-900" />
                              )}
                            </div>

                            <p className={cn(
                              "text-xs leading-relaxed",
                              !notif.read ? "text-foreground/70" : "text-muted-foreground"
                            )}>
                              {notif.description}
                            </p>

                            {notif.date?.toDate && (
                              <p className="text-xs text-muted-foreground font-medium pt-1">
                                {new Date(notif.date.toDate()).toLocaleString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            )}
                          </div>

                          {/* Delete button for Admin */}
                          {currentUserProfile?.role === 'Admin' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "absolute top-2 right-2 h-7 w-7 rounded-full",
                                "opacity-0 group-hover:opacity-100 transition-all",
                                "hover:bg-destructive/10 hover:text-destructive"
                              )}
                              onClick={(e) => handleDeleteNotification(e, notif.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>

                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-12 h-80">
                  <div className="relative mb-6">
                    <div className="p-4 rounded-full bg-muted">
                      <CheckCircle className="h-16 w-16 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="font-bold text-lg mb-2">Tout est calme !</p>
                  <p className="text-muted-foreground text-sm max-w-xs">
                    Aucune nouvelle notification pour le moment.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Push Notification Toggle */}
          <div className="p-3 border-t bg-muted/20">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 border-dashed"
              onClick={async () => {
                const { requestNotificationPermission } = await import('@/lib/notifications');
                if (currentUserProfile?.id) {
                  const token = await requestNotificationPermission(currentUserProfile.id);
                  if (token) {
                    toast({
                      title: "Notifications activées !",
                      description: "Vous recevrez désormais les alertes sur votre bureau.",
                    });
                  } else {
                    toast({
                      title: "Action requise",
                      description: "Veuillez autoriser les notifications dans votre navigateur.",
                      variant: "destructive"
                    });
                  }
                }
              }}
            >
              <Bell className="h-4 w-4" />
              Activer les notifications push
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Confirmation Dialog */}
      < AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen} >
        <AlertDialogContent className="border-2">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmation Administrateur
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Êtes-vous sûr de vouloir supprimer <span className="font-semibold text-foreground">toutes les notifications visibles</span> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAdminConfirmClearAll}
              className="bg-destructive hover:bg-destructive/90"
            >
              Oui, tout effacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog >

    </>
  );
}
