
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, ChevronRight, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useOrders } from './orders-context';
import type { Order } from '@/lib/types';
import { useItems } from '../settings/items-context';
import { useWards } from '../settings/wards-context';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useUsers } from '../settings/users-context';
import { format } from 'date-fns';

export default function OrdersListPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { orders, isLoading: isOrdersLoading } = useOrders();
    const { items: diapers, isLoading: isItemsLoading } = useItems();
    const { wards, isLoading: isWardsLoading } = useWards();
    const isMobile = useIsMobile();
    const { currentUserProfile } = useUsers();

    const [inProgressOrder, setInProgressOrder] = React.useState<boolean>(false);

    React.useEffect(() => {
        const checkSavedOrder = () => {
            const savedOrder = localStorage.getItem('inProgressOrder');
            setInProgressOrder(!!savedOrder);
        };
        
        checkSavedOrder();

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'inProgressOrder') {
                checkSavedOrder();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('focus', checkSavedOrder);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('focus', checkSavedOrder);
        };
    }, []);


    const isLoading = isOrdersLoading || isItemsLoading || isWardsLoading;
    const canCreateOrder = currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Soignant';
    const selectedDate = searchParams.get('date');
    
    const filteredOrders = React.useMemo(() => {
        if (!orders) return [];
        if (!selectedDate) return orders;
        return orders.filter(order => format(new Date(order.date), 'yyyy-MM-dd') === selectedDate);
    }, [orders, selectedDate]);


    const orderData = React.useMemo(() => {
        if (isLoading || !wards) return [];
        return filteredOrders.map(order => {
            const totalItems = order.wardOrders.reduce((total, wardOrder) => {
                return total + wardOrder.items.reduce((sum, item) => {
                    const diaper = diapers.find(d => d.id === item.diaperId);
                    if (item.unit === 'cartons' && diaper) {
                        return sum + (item.quantity * diaper.piecesPerCarton);
                    }
                    return sum + item.quantity;
                }, 0);
            }, 0);

            const involvedWards = order.wardOrders.map(wo => wards.find(w => w.id === wo.wardId)?.name).filter(Boolean);

            return {
            ...order,
            wardNames: involvedWards.join(', '),
            totalItems,
            };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [filteredOrders, diapers, wards, isLoading]);

    const handleRowClick = (orderId: string) => {
        router.push(`/dashboard/orders/${orderId}`);
    };
    
    const handleResumeOrder = () => {
        router.push('/dashboard/orders/new');
    }

    const getStatusVariant = (status: Order['status']) => {
        switch(status) {
            case 'distributed': return 'success';
            case 'confirmed': return 'default';
            case 'draft': return 'secondary';
            default: return 'secondary';
        }
    }

    const getStatusLabel = (status: Order['status']) => {
        switch(status) {
            case 'fulfilled': return 'Traitée';
            case 'distributed': return 'Distribuée';
            case 'confirmed': return 'Confirmée';
            case 'draft': return 'Brouillon';
            default: return status;
        }
    }
    
    const renderInProgressOrderCard = () => (
        <Card className="border-l-4 border-l-green-500 bg-green-50 dark:bg-green-900/20 cursor-pointer hover-lift animate-scale-in" onClick={handleResumeOrder}>
            <CardHeader>
                 <div className="flex justify-between items-center">
                    <CardTitle className="text-green-700 dark:text-green-300 text-lg">Commande en cours</CardTitle>
                    <Badge variant="success" className="animate-pulse">En cours</Badge>
                </div>
                <CardDescription className="text-green-600 dark:text-green-400">
                    Vous avez une commande non terminée. Cliquez ici pour la reprendre.
                </CardDescription>
            </CardHeader>
        </Card>
    );


    const renderDesktopView = () => (
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="border-b">
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Étages / Cantous</TableHead>
                        <TableHead className="font-semibold">Total (pièces)</TableHead>
                        <TableHead className="font-semibold">Statut</TableHead>
                        <TableHead className="text-right font-semibold"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {inProgressOrder && (
                        <TableRow className="bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer transition-colors animate-scale-in" onClick={handleResumeOrder}>
                            <TableCell colSpan={5}>
                                <div className="flex items-center justify-between font-semibold text-green-700 dark:text-green-300 p-2">
                                    <span>Vous avez une commande en cours de rédaction...</span>
                                    <Button variant="link" size="sm" className="text-green-700 dark:text-green-300 hover:underline">
                                        <Edit className="mr-2 h-4 w-4"/> Reprendre
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                    {orderData.map((order, index) => (
                        <TableRow 
                            key={order.id} 
                            className="cursor-pointer hover:bg-accent/50 transition-colors animate-fade-in group" 
                            style={{ animationDelay: `${index * 50}ms` }}
                            onClick={() => handleRowClick(order.id)}
                        >
                            <TableCell className="whitespace-nowrap font-medium">{new Date(order.date).toLocaleDateString('fr-FR')}</TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">{order.wardNames}</TableCell>
                            <TableCell className="whitespace-nowrap font-semibold">{order.totalItems}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(order.status)} className="capitalize">
                                    {getStatusLabel(order.status)}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      </Card>
    );
    
    const renderMobileView = () => (
      <div className="space-y-4">
        {inProgressOrder && renderInProgressOrderCard()}
        {orderData.map((order, index) => (
          <Card 
            key={order.id} 
            className="cursor-pointer hover-lift border-l-4 border-l-transparent hover:border-l-primary/50 transition-all animate-scale-in" 
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => handleRowClick(order.id)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-base font-semibold break-words mb-1">{order.wardNames}</CardTitle>
                    <CardDescription className="text-sm">{new Date(order.date).toLocaleDateString('fr-FR')}</CardDescription>
                  </div>
                  <Badge variant={getStatusVariant(order.status)} className="ml-2">{getStatusLabel(order.status)}</Badge>
              </div>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center text-sm pt-2 border-t">
                    <p className="text-muted-foreground">Total (pièces)</p>
                    <p className="font-semibold text-lg">{order.totalItems}</p>
                </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2 flex-1">
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {selectedDate ? `Commandes du ${format(new Date(selectedDate), 'dd/MM/yyyy')}` : 'Commandes'}
                </h1>
                <p className="text-muted-foreground">
                    Consultez et gérez toutes les demandes de distribution.
                </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full sm:w-auto">
                 {selectedDate && (
                    <Button variant="outline" onClick={() => router.push('/dashboard/orders')} className="w-full sm:w-auto justify-center">
                        Voir toutes les commandes
                    </Button>
                )}
                {canCreateOrder && <Link href="/dashboard/orders/new" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto justify-center">
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Créer une Commande
                    </Button>
                </Link>}
            </div>
        </div>
        
        {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : (isMobile ?? true) ? renderMobileView() : renderDesktopView()}
    </div>
  );
}
