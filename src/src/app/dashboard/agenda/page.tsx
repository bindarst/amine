
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrders } from '../orders/orders-context';
import { useDeliveries } from '../deliveries/deliveries-context';
import { useNotifications } from '../notifications-context';
import { format, isSameDay, startOfDay, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Package, Truck, Edit, Calendar as CalendarIcon, Info } from 'lucide-react';
import type { Order, Delivery, Notification, Diaper } from '@/lib/types';
import type { WithId } from '@/firebase/firestore/use-collection';
import { useUsers } from '../settings/users-context';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Day, type DayProps } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { useItems } from '../settings/items-context';

type AgendaEvent = (
    | { type: 'order'; data: Order }
    | { type: 'delivery'; data: Delivery }
    | { type: 'adjustment'; data: WithId<Notification> }
) & {
    id: string;
    date: Date;
    title: string;
    description: string;
    creator?: string;
};

const getEventAppearance = (type: AgendaEvent['type']) => {
    switch (type) {
        case 'order':
            return {
                icon: <Package className="h-5 w-5" />,
                color: 'blue',
                bgColor: 'bg-blue-50 dark:bg-blue-950/30',
                iconColor: 'text-blue-600 dark:text-blue-400',
                borderColor: 'border-blue-200 dark:border-blue-800',
            };
        case 'delivery':
            return {
                icon: <Truck className="h-5 w-5" />,
                color: 'green',
                bgColor: 'bg-green-50 dark:bg-green-950/30',
                iconColor: 'text-green-600 dark:text-green-400',
                borderColor: 'border-green-200 dark:border-green-800',
            };
        case 'adjustment':
            return {
                icon: <Edit className="h-5 w-5" />,
                color: 'red',
                bgColor: 'bg-red-50 dark:bg-red-950/30',
                iconColor: 'text-red-600 dark:text-red-400',
                borderColor: 'border-red-200 dark:border-red-800',
            };
        default:
            return {
                icon: <Info className="h-5 w-5" />,
                color: 'gray',
                bgColor: 'bg-gray-50 dark:bg-gray-950/30',
                iconColor: 'text-gray-600 dark:text-gray-400',
                borderColor: 'border-gray-200 dark:border-gray-800',
            };
    }
}

const getTotalPieces = (items: {diaperId: string, quantity: number, unit: 'pieces' | 'cartons'}[], diapers: WithId<Diaper>[]) => {
    return items.reduce((total, item) => {
        const diaper = diapers.find(d => d.id === item.diaperId);
        if (item.unit === 'cartons' && diaper && diaper.piecesPerCarton) {
            return total + (item.quantity * diaper.piecesPerCarton);
        }
        return total + item.quantity;
    }, 0);
};

export default function AgendaPage() {
    const router = useRouter();
    const { orders, isLoading: isOrdersLoading } = useOrders();
    const { deliveries, isLoading: isDeliveriesLoading } = useDeliveries();
    const { notifications, isLoading: isNotifsLoading } = useNotifications();
    const { users, isLoading: isUsersLoading } = useUsers();
    const { items: diapers, isLoading: isItemsLoading } = useItems();

    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(startOfDay(new Date()));
    
    const isLoading = isOrdersLoading || isDeliveriesLoading || isUsersLoading || isNotifsLoading || isItemsLoading;
    
    const allEvents = React.useMemo(() => {
        if (isLoading) return [];
        const events: AgendaEvent[] = [];

        orders.forEach(order => {
            const creator = users.find(u => u.id === order.userId);
            const allOrderItems = order.wardOrders.flatMap((wo: { items: { diaperId: string; quantity: number; unit: 'pieces' | 'cartons' }[] }) => wo.items);
            const totalPieces = getTotalPieces(allOrderItems, diapers);

            events.push({
                type: 'order',
                id: order.id,
                data: order,
                date: parseISO(order.date),
                title: `Commande - ${totalPieces.toLocaleString('fr-FR')} pièces`,
                description: `Statut: ${order.status}`,
                creator: creator?.displayName ?? undefined,
            });
        });
        
        deliveries.forEach(delivery => {
            const creator = users.find(u => u.id === delivery.userId);
            const totalPieces = getTotalPieces(delivery.items, diapers);
            
            events.push({
                type: 'delivery',
                id: delivery.id,
                data: delivery,
                date: parseISO(delivery.date),
                title: `Livraison - ${totalPieces.toLocaleString('fr-FR')} pièces`,
                description: `Fournisseur: ${delivery.supplier}`,
                creator: creator?.displayName ?? undefined,
            });
        });

        notifications
            .filter(n => n.type === 'info' && n.title === 'Ajustement manuel du stock')
            .forEach(notif => {
                const creator = users.find(u => u.id === notif.data?.userId);
                 const difference = notif.data.newQuantity - notif.data.oldQuantity;
                events.push({
                    type: 'adjustment',
                    id: notif.id,
                    data: notif,
                    date: notif.date.toDate(),
                    title: 'Ajustement de Stock',
                    description: `${notif.data.itemName}: ${difference > 0 ? '+' : ''}${difference} pièces`,
                    creator: creator?.displayName ?? undefined,
                });
            });
            
        return events;
    }, [orders, deliveries, notifications, users, diapers, isLoading]);

    const eventsForSelectedDate = React.useMemo(() => {
        if (!selectedDate) return [];
        return allEvents
            .filter(event => isSameDay(event.date, selectedDate))
            .sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [selectedDate, allEvents]);

    const eventDays = React.useMemo(() => {
        const days: Record<string, Set<string>> = {};
        allEvents.forEach(event => {
            const day = format(event.date, 'yyyy-MM-dd');
            if (!days[day]) {
                days[day] = new Set();
            }
            days[day].add(getEventAppearance(event.type).color);
        });
        return days;
    }, [allEvents]);
    
    const handleDateSelect = (date: Date | undefined) => {
        setSelectedDate(date);
    };


    const handleEventClick = (event: AgendaEvent) => {
        if (event.type === 'order') {
            router.push(`/dashboard/orders/${event.id}`);
        } else if (event.type === 'delivery') {
            router.push(`/dashboard/deliveries/${event.id}`);
        } else if (event.type === 'adjustment' && event.data.data?.diaperId) {
             router.push(`/dashboard/items/${event.data.data.diaperId}`);
        }
    };
    
    function DayWithDots(props: DayProps) {
      const date = props.day?.date;
      if (!date || !isValid(date)) {
        return <Day {...props} />;
      }
      const dayKey = format(date, 'yyyy-MM-dd');
      const colors = eventDays[dayKey];
      return (
        <div className="relative block" style={{ width: '100%', height: '100%' }}>
          <Day {...props} className={cn(props.className, 'w-full h-full')} />
          {colors && (
            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-1 justify-center pointer-events-none z-10">
              {Array.from(colors).map(color => (
                <div 
                  key={color} 
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-all duration-200",
                    color === 'blue' && "bg-blue-500 dark:bg-blue-400",
                    color === 'green' && "bg-green-500 dark:bg-green-400",
                    color === 'red' && "bg-red-500 dark:bg-red-400",
                    color === 'gray' && "bg-gray-500 dark:bg-gray-400"
                  )} 
                />
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return (
        <div className="space-y-8 pb-8 animate-fade-in">
            {/* Header avec espacement généreux */}
            <div className="space-y-2">
                <h1 className="text-4xl font-semibold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Agenda
                </h1>
                <p className="text-muted-foreground text-lg">
                    Visualisez les événements de la journée
                </p>
            </div>

            {/* Grille principale avec espacement Apple */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Calendrier avec style Apple */}
                <Card className="border-0 shadow-modern-lg bg-card/50 backdrop-blur-sm hover-lift transition-all duration-300">
                    <CardContent className="p-6">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            locale={fr}
                            className="w-full"
                            components={{
                                Day: DayWithDots,
                            }}
                        />
                    </CardContent>
                </Card>

                {/* Liste des événements avec design Apple */}
                <Card className="border-0 shadow-modern-lg bg-card/50 backdrop-blur-sm hover-lift transition-all duration-300">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-semibold">
                            {selectedDate ? (
                                <span className="capitalize">
                                    {format(selectedDate, 'eeee dd MMMM', { locale: fr })}
                                </span>
                            ) : (
                                'Sélectionnez une date'
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {isLoading ? (
                            <div className="flex flex-col justify-center items-center h-48 space-y-4">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Chargement des événements...</p>
                            </div>
                        ) : eventsForSelectedDate.length > 0 ? (
                            eventsForSelectedDate.map((event, index) => {
                                const { icon, bgColor, iconColor, borderColor } = getEventAppearance(event.type);
                                return (
                                    <div 
                                        key={event.id} 
                                        className={cn(
                                            "group relative flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300 cursor-pointer",
                                            "hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5",
                                            "bg-card/80 backdrop-blur-sm",
                                            borderColor,
                                            bgColor,
                                            "animate-slide-in-up"
                                        )}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                        onClick={() => handleEventClick(event)}
                                    >
                                        {/* Icône avec fond arrondi */}
                                        <div className={cn(
                                            "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                                            "bg-background/60 backdrop-blur-sm border",
                                            borderColor,
                                            "group-hover:scale-110 transition-transform duration-300"
                                        )}>
                                            <div className={iconColor}>
                                                {icon}
                                            </div>
                                        </div>
                                        
                                        {/* Contenu */}
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <p className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
                                                {event.title}
                                            </p>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {event.description}
                                            </p>
                                            <p className="text-xs text-muted-foreground/80 pt-1">
                                                par {event.creator || 'Système'}
                                            </p>
                                        </div>

                                        {/* Indicateur de hover */}
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <Alert className="border-dashed border-2 bg-muted/30 backdrop-blur-sm animate-scale-in">
                                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                                <AlertTitle className="font-medium">Aucun événement</AlertTitle>
                                <AlertDescription className="text-muted-foreground">
                                    Il n'y a rien de prévu à cette date.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            {/* Classes Tailwind pour les couleurs dynamiques */}
            <div className="hidden">
                <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800" />
                <div className="bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800" />
                <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800" />
                <div className="bg-gray-50 dark:bg-gray-950/30 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800" />
                <div className="bg-blue-500 dark:bg-blue-400 bg-green-500 dark:bg-green-400 bg-red-500 dark:bg-red-400 bg-gray-500 dark:bg-gray-400" />
            </div>
        </div>
    );
}

