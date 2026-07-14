
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Order, Delivery, Notification, Diaper, UserProfile, WithId } from '@/lib/types';
import { ArrowDownLeft, ArrowUpRight, Box, Edit, ShoppingCart, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { isStockAdjustmentNotification } from '@/lib/stock-adjustments';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ItemMovementHistoryProps {
  itemId: string;
  orders: WithId<Order>[];
  deliveries: WithId<Delivery>[];
  notifications: WithId<Notification>[];
  items: WithId<Diaper>[];
  users: WithId<UserProfile>[];
}

type Movement = {
  date: Date;
  type: 'Entrée' | 'Sortie';
  event: 'Livraison' | 'Commande' | 'Ajustement' | 'Distribution Directe';
  quantity: number;
  unit: 'pièces' | 'cartons';
  user?: string;
  details: string;
};

export default function ItemMovementHistory({ itemId, orders, deliveries, notifications, items, users }: ItemMovementHistoryProps) {

  const movementData = React.useMemo(() => {
    const movements: Movement[] = [];
    const itemInfo = items.find(i => i.id === itemId);
    if (!itemInfo) return [];

    const defaultUnit = itemInfo.defaultUnit;
    const piecesPerCarton = itemInfo.piecesPerCarton || 1;

    // 1. Process Deliveries (Entrée)
    deliveries.forEach(delivery => {
      delivery.items.forEach(item => {
        if (item.diaperId === itemId) {
          const user = users.find(u => u.id === delivery.userId);
          const quantityInPieces = item.unit === 'cartons' && piecesPerCarton > 0 ? item.quantity * piecesPerCarton : item.quantity;
          
          let displayQuantity = quantityInPieces;
          let displayUnit: 'pièces' | 'cartons' = 'pièces';

          if (defaultUnit === 'cartons' && piecesPerCarton > 0) {
            displayQuantity = quantityInPieces / piecesPerCarton;
            displayUnit = 'cartons';
          }
          
          movements.push({
            date: new Date(delivery.date),
            type: 'Entrée',
            event: 'Livraison',
            quantity: displayQuantity,
            unit: displayUnit,
            user: user?.displayName || 'N/A',
            details: `de ${delivery.supplier}`
          });
        }
      });
    });

    // 2. Process Orders (Sortie)
    orders.forEach(order => {
      if (order.status === 'distributed' && order.distributedAt) {
        order.wardOrders.forEach(wardOrder => {
          wardOrder.items.forEach(item => {
            if (item.diaperId === itemId) {
              const user = users.find(u => u.id === order.distributorId);
              const quantityInPieces = item.unit === 'cartons' && piecesPerCarton > 0 ? item.quantity * piecesPerCarton : item.quantity;

              let displayQuantity = quantityInPieces;
              let displayUnit: 'pièces' | 'cartons' = 'pièces';

              if (defaultUnit === 'cartons' && piecesPerCarton > 0) {
                  displayQuantity = quantityInPieces / piecesPerCarton;
                  displayUnit = 'cartons';
              }
              
              movements.push({
                date: new Date(order.distributedAt),
                type: 'Sortie',
                event: 'Commande',
                quantity: displayQuantity,
                unit: displayUnit,
                user: user?.displayName || 'N/A',
                details: `Commande #${order.id.substring(0, 4)}`
              });
            }
          });
        });
      }
    });

    // 3. Process Notifications for adjustments and direct distributions
    notifications.forEach(notif => {
      const isAdjustment = isStockAdjustmentNotification(notif);
      const isDirectDistribution = Array.isArray(notif.data?.items) &&
        String(notif.title || '').toLowerCase().includes('distribution directe');
      if (notif.type === 'info' && (isAdjustment || isDirectDistribution)) {
        let quantityInPieces = 0;
        let movementType: 'Entrée' | 'Sortie' | undefined;
        let eventType: 'Ajustement' | 'Distribution Directe' | undefined;
        let detailsText = '';

        if (isAdjustment && notif.data?.diaperId === itemId) {
            eventType = 'Ajustement';
            const diff = notif.data.newQuantity - notif.data.oldQuantity;
            quantityInPieces = Math.abs(diff);
            movementType = diff > 0 ? 'Entrée' : 'Sortie';
            
            let displayDiff = diff;
            let displayUnitText = 'pièces';
            if (defaultUnit === 'cartons' && piecesPerCarton > 0) {
                displayDiff = diff / piecesPerCarton;
                displayUnitText = 'carton(s)';
            }
            detailsText = `Écart: ${displayDiff > 0 ? '+' : ''}${displayDiff % 1 !== 0 ? displayDiff.toFixed(1) : displayDiff} ${displayUnitText}`;

        } else if (isDirectDistribution && notif.data?.items) {
            const relevantItem = notif.data.items.find((i: any) => i.diaperId === itemId);
            if (relevantItem) {
                eventType = 'Distribution Directe';
                quantityInPieces = relevantItem.quantity;
                movementType = 'Sortie';
                detailsText = `Raison: ${notif.data.reason || 'Non spécifiée'}`;
            }
        }

        if (movementType && eventType && quantityInPieces > 0) {
            const user = users.find(u => u.id === notif.data.userId);

            let displayQuantity = quantityInPieces;
            let displayUnit: 'pièces' | 'cartons' = 'pièces';

            if (defaultUnit === 'cartons' && piecesPerCarton > 0) {
                displayQuantity = quantityInPieces / piecesPerCarton;
                displayUnit = 'cartons';
            }

            movements.push({
                date: notif.date.toDate(),
                type: movementType,
                event: eventType,
                quantity: displayQuantity,
                unit: displayUnit,
                user: user?.displayName || 'N/A',
                details: detailsText
            });
        }
      }
    });

    return movements.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [itemId, orders, deliveries, notifications, items, users]);
  
  const getEventAppearance = (event: Movement['event']) => {
    switch (event) {
        case 'Livraison':
            return { icon: <Truck className="h-4 w-4" />, color: 'text-green-600' };
        case 'Commande':
            return { icon: <ShoppingCart className="h-4 w-4" />, color: 'text-red-600' };
        case 'Ajustement':
            return { icon: <Edit className="h-4 w-4" />, color: 'text-blue-600' };
        case 'Distribution Directe':
            return { icon: <Box className="h-4 w-4" />, color: 'text-orange-600' };
        default:
            return { icon: <Box className="h-4 w-4" />, color: 'text-gray-500' };
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des Mouvements de Stock</CardTitle>
        <CardDescription>Journal de toutes les entrées et sorties pour cet article.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg max-h-[400px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted z-10">
              <TableRow>
                <TableHead className="w-[150px]">Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Événement</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movementData.map((m, index) => {
                const {icon, color} = getEventAppearance(m.event);
                const isEntry = m.type === 'Entrée';
                const quantityFormatted = Number.isInteger(m.quantity) ? m.quantity : m.quantity.toFixed(1);
                return (
                    <TableRow key={index}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{m.date.toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell>
                            <Badge variant={isEntry ? 'success' : 'destructive'} className="bg-opacity-20 text-opacity-100">
                                {isEntry ? <ArrowUpRight className="mr-1 h-3 w-3"/> : <ArrowDownLeft className="mr-1 h-3 w-3"/>}
                                {m.type}
                            </Badge>
                        </TableCell>
                         <TableCell>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className={cn("flex items-center gap-2 font-medium", color)}>
                                            {icon}
                                            {m.event}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{m.event}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </TableCell>
                        <TableCell className={cn("text-right font-semibold", isEntry ? 'text-green-600' : 'text-red-600')}>
                            {isEntry ? '+' : '-'} {quantityFormatted} {m.unit}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{m.user}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{m.details}</TableCell>
                    </TableRow>
                )
              })}
            </TableBody>
          </Table>
           {movementData.length === 0 && (
                <div className="text-center p-8 text-muted-foreground">
                    Aucun mouvement de stock enregistré pour cet article.
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
