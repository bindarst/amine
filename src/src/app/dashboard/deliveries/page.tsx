
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Eye, PlusCircle, Loader2, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useDeliveries } from './deliveries-context';
import { useItems } from '../settings/items-context';
import { useIsMobile } from '@/hooks/use-is-mobile';

export default function DeliveriesListPage() {
    const router = useRouter();
    const { deliveries, isLoading: isDeliveriesLoading } = useDeliveries();
    const { items: diapers, isLoading: isItemsLoading } = useItems();
    const isMobile = useIsMobile();

    const isLoading = isDeliveriesLoading || isItemsLoading;

    const deliveryData = React.useMemo(() => {
        if (isLoading) return [];
        return deliveries.map(delivery => {
            const totalItems = delivery.items.reduce((total, item) => {
                const diaper = diapers.find(d => d.id === item.diaperId);
                if (item.unit === 'cartons' && diaper) {
                    return total + (item.quantity * diaper.piecesPerCarton);
                }
                return total + item.quantity;
            }, 0);

            return {
                ...delivery,
                totalItems,
            };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [deliveries, diapers, isLoading]);

    const handleRowClick = (deliveryId: string) => {
        router.push(`/dashboard/deliveries/${deliveryId}`);
    };
    
    const renderDesktopView = () => (
      <Card>
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Fournisseur</TableHead>
                        <TableHead>Total (pièces)</TableHead>
                        <TableHead className="text-right"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {deliveryData.map(delivery => (
                        <TableRow key={delivery.id} className="cursor-pointer" onClick={() => handleRowClick(delivery.id)}>
                            <TableCell className="whitespace-nowrap font-medium">{new Date(delivery.date).toLocaleDateString('fr-FR')}</TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">{delivery.supplier}</TableCell>
                            <TableCell className="whitespace-nowrap">{delivery.totalItems.toLocaleString('fr-FR')}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
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
        {deliveryData.map(delivery => (
          <Card key={delivery.id} className="cursor-pointer" onClick={() => handleRowClick(delivery.id)}>
            <CardHeader>
              <CardTitle className="text-base font-semibold truncate">
                Livraison du {new Date(delivery.date).toLocaleDateString('fr-FR')}
              </CardTitle>
              <CardDescription>{delivery.supplier}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center text-sm">
                  <p className="text-muted-foreground">Total (pièces)</p>
                  <p className="font-medium">{delivery.totalItems.toLocaleString('fr-FR')}</p>
                </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );

  return (
      <div className="space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">Livraisons</h1>
                  <p className="text-muted-foreground">
                      Consultez toutes les entrées de stock des fournisseurs.
                  </p>
              </div>
              <Link href="/dashboard/deliveries/new">
                  <Button size="lg" className="w-full sm:w-auto">
                      <PlusCircle className="mr-2 h-5 w-5" />
                      Nouvelle Livraison
                  </Button>
              </Link>
          </div>
          {isLoading ? (
              <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
              </div>
          ) : isMobile ? renderMobileView() : renderDesktopView()}
      </div>
  );
}
