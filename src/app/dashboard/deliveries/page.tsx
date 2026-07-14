'use client';

import * as React from 'react';
import Link from 'next/link';
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
import { PlusCircle, Loader2, ChevronRight, Sparkles, Truck, Calendar, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDeliveries } from './deliveries-context';
import { useItems } from '../settings/items-context';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';

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
    <Card className="overflow-hidden border-0 glass-strong shadow-modern-lg">
      <div className="overflow-x-auto custom-scrollbar">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/50 hover:bg-transparent">
              <TableHead className="font-bold text-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Date
                </div>
              </TableHead>
              <TableHead className="font-bold text-foreground">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-secondary" />
                  Fournisseur
                </div>
              </TableHead>
              <TableHead className="font-bold text-foreground">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-accent" />
                  Total (pièces)
                </div>
              </TableHead>
              <TableHead className="text-right font-bold text-foreground"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveryData.map((delivery, index) => (
              <TableRow
                key={delivery.id}
                className="cursor-pointer hover:bg-muted/50 transition-all duration-300 animate-fade-in group border-b border-border/30"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => handleRowClick(delivery.id)}
              >
                <TableCell className="whitespace-nowrap font-semibold">{new Date(delivery.date).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{delivery.supplier}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="font-bold text-lg bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                    {delivery.totalItems.toLocaleString('fr-FR')}
                  </span>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
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
      {deliveryData.map((delivery, index) => (
        <Card
          key={delivery.id}
          className="cursor-pointer border-0 glass-strong hover-lift shadow-modern transition-all duration-500 animate-fade-in-scale group overflow-hidden relative"
          style={{ animationDelay: `${index * 50}ms` }}
          onClick={() => handleRowClick(delivery.id)}
        >
          {/* Gradient on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-accent/10 to-primary/10" />

          <CardHeader className="relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <CardDescription className="text-sm font-medium">
                  {new Date(delivery.date).toLocaleDateString('fr-FR')}
                </CardDescription>
              </div>
              <CardTitle className="text-base font-bold">
                {delivery.supplier}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex justify-between items-center pt-3 border-t border-border/30">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Truck className="h-4 w-4" />
                <p className="text-sm">Total</p>
              </div>
              <p className="text-2xl font-black bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                {delivery.totalItems.toLocaleString('fr-FR')}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-primary border-r-secondary animate-spin" />
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Chargement des livraisons...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header avec effet gradient */}
      <div className="space-y-3 relative">
        <div className="absolute -top-8 -left-8 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -top-4 right-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <Truck className="h-10 w-10 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent animate-gradient">
                  Livraisons
                </span>
              </h1>
            </div>
            <p className="text-base text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent animate-pulse" />
              Consultez toutes les entrées de stock des fournisseurs
            </p>
          </div>

          <Link href="/dashboard/deliveries/new" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto justify-center bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 shadow-lg hover:shadow-xl transition-all duration-300">
              <PlusCircle className="mr-2 h-5 w-5" />
              Nouvelle Livraison
            </Button>
          </Link>
        </div>
      </div>

      {isMobile ? renderMobileView() : renderDesktopView()}
    </div>
  );
}
