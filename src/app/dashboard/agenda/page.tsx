
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
import { getOrderStatusLabel } from '@/lib/order-status';
import { isStockAdjustmentNotification } from '@/lib/stock-adjustments';

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

const getTotalPieces = (items: { diaperId: string, quantity: number, unit: 'pieces' | 'cartons' }[], diapers: WithId<Diaper>[]) => {
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
                description: `Statut : ${getOrderStatusLabel(order.status)}`,
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
            .filter(isStockAdjustmentNotification)
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


    // Custom Day component with dots.
    const CustomDay = (props: DayProps) => {
        const dayProps = props as DayProps & { date?: Date; day?: { date?: Date } };
        const date = dayProps.date ?? dayProps.day?.date;
        const dayKey = date && isValid(date) ? format(date, 'yyyy-MM-dd') : null;
        const colors = dayKey ? eventDays[dayKey] : null;

        if (!colors || colors.size === 0) {
            return <Day {...props} />;
        }

        const hasBlue = colors.has('blue');
        const hasGreen = colors.has('green');
        const hasRed = colors.has('red');

        return (
            <div
                className={cn(
                    'day-with-dots relative inline-flex items-center justify-center',
                    hasBlue && 'has-blue-dot',
                    hasGreen && 'has-green-dot',
                    hasRed && 'has-red-dot'
                )}
            >
                <Day {...props} />
            </div>
        );
    };

    return (
        <div className="space-y-8 pb-12 animate-fade-in">
            {/* Header avec effet gradient */}
            <div className="space-y-3 relative">
                <div className="absolute -top-8 -left-8 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -top-4 right-12 w-64 h-64 bg-violet-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-400 to-primary shadow-lg">
                        <CalendarIcon className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                        <span className="bg-gradient-to-r from-violet-500 via-primary to-secondary bg-clip-text text-transparent animate-gradient">
                            Agenda
                        </span>
                    </h1>
                </div>
                <p className="text-base text-muted-foreground relative">
                    Visualisez les événements de la journée
                </p>
            </div>

            {/* Grille principale */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Calendrier */}
                <Card className="border-0 glass-strong shadow-modern-lg hover-lift transition-all duration-300">
                    <CardContent className="p-6">
                        <style>{`
                          .day-with-dots {
                            position: relative;
                            min-height: 2.5rem;
                          }
                          .day-with-dots.has-blue-dot::after {
                            content: '';
                            position: absolute;
                            bottom: 2px;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 6px;
                            height: 6px;
                            border-radius: 50%;
                            background-color: rgb(59 130 246);
                            z-index: 10;
                          }
                          .day-with-dots.has-green-dot::before {
                            content: '';
                            position: absolute;
                            bottom: 2px;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 6px;
                            height: 6px;
                            border-radius: 50%;
                            background-color: rgb(34 197 94);
                            z-index: 10;
                          }
                          .day-with-dots.has-green-dot.has-blue-dot::before,
                          .day-with-dots.has-green-dot.has-red-dot::before,
                          .day-with-dots.has-blue-dot.has-green-dot.has-red-dot::before {
                            transform: translateX(calc(-50% + 8px));
                          }
                          .day-with-dots.has-red-dot.has-blue-dot::after {
                            transform: translateX(calc(-50% + 8px));
                          }
                          .day-with-dots.has-red-dot:not(.has-blue-dot):not(.has-green-dot)::after {
                            content: '';
                            position: absolute;
                            bottom: 2px;
                            left: 50%;
                            transform: translateX(calc(-50% - 8px));
                            width: 6px;
                            height: 6px;
                            border-radius: 50%;
                            background-color: rgb(239 68 68);
                            z-index: 10;
                          }
                          .day-with-dots.has-blue-dot.has-green-dot::after {
                            transform: translateX(calc(-50% - 4px));
                          }
                          .day-with-dots.has-blue-dot.has-green-dot.has-red-dot::after {
                            transform: translateX(calc(-50% - 8px));
                          }
                        `}</style>
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            locale={fr}
                            className="w-full"
                            components={{
                                Day: CustomDay,
                            }}
                        />
                    </CardContent>
                </Card>

                {/* Liste des événements */}
                <Card className="border-0 glass-strong shadow-modern-lg hover-lift transition-all duration-300">
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

                                // Définir les dégradés premium selon le type
                                const gradients = {
                                    order: "from-blue-500/10 to-indigo-500/10",
                                    delivery: "from-green-500/10 to-emerald-500/10",
                                    adjustment: "from-red-500/10 to-rose-500/10"
                                };

                                const glowColors = {
                                    order: "shadow-blue-500/20",
                                    delivery: "shadow-green-500/20",
                                    adjustment: "shadow-red-500/20"
                                };

                                return (
                                    <div
                                        key={event.id}
                                        className="relative group animate-fade-in-scale"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                        onClick={() => handleEventClick(event)}
                                    >
                                        {/* Premium card container */}
                                        <div className={cn(
                                            "relative overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer",
                                            "border-2 border-l-4",
                                            "hover:scale-[1.02] hover:shadow-2xl hover:-translate-y-1",
                                            borderColor,
                                            glowColors[event.type]
                                        )}>
                                            {/* Gradient background overlay */}
                                            <div className={cn(
                                                "absolute inset-0 bg-gradient-to-br opacity-30",
                                                gradients[event.type]
                                            )} />

                                            {/* Glassmorphism layer */}
                                            <div className="absolute inset-0 backdrop-blur-sm bg-card/90" />

                                            {/* Shine effect */}
                                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                                            {/* Content */}
                                            <div className="relative flex items-start gap-4 p-4">
                                                {/* Icon with premium styling */}
                                                <div className={cn(
                                                    "relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
                                                    "bg-gradient-to-br border-2 backdrop-blur-sm",
                                                    bgColor,
                                                    borderColor,
                                                    "group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"
                                                )}>
                                                    <div className={iconColor}>
                                                        {icon}
                                                    </div>
                                                    {/* Icon glow */}
                                                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent" />
                                                </div>

                                                {/* Content section */}
                                                <div className="flex-1 min-w-0 space-y-2">
                                                    {/* Title with badge */}
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">
                                                            {event.title}
                                                        </p>
                                                        {/* Type badge */}
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "text-xs font-semibold uppercase px-2 py-0.5",
                                                                borderColor,
                                                                iconColor
                                                            )}
                                                        >
                                                            {event.type === 'order' && '📦 Cmde'}
                                                            {event.type === 'delivery' && '🚚 Livr'}
                                                            {event.type === 'adjustment' && '🔧 Ajust'}
                                                        </Badge>
                                                    </div>

                                                    {/* Description */}
                                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                                        {event.description}
                                                    </p>

                                                    {/* Footer with creator and time */}
                                                    <div className="flex items-center justify-between gap-2 pt-1">
                                                        <p className="text-xs text-muted-foreground/80 flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                            par {event.creator || 'Système'}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground/60 font-mono">
                                                            {format(event.date, 'HH:mm')}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Hover indicator - Arrow */}
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                                                    <svg className={cn("w-5 h-5", iconColor)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>

                                            {/* Bottom shine effect */}
                                            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                        </div>

                                        {/* Ambient light effect */}
                                        <div className={cn(
                                            "absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-4 blur-xl rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-300",
                                            event.type === 'order' && 'bg-blue-500',
                                            event.type === 'delivery' && 'bg-green-500',
                                            event.type === 'adjustment' && 'bg-red-500'
                                        )} />
                                    </div>
                                )
                            })
                        ) : (
                            <Alert className="border-2 border-dashed glass bg-muted/30 backdrop-blur-sm animate-scale-in">
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
