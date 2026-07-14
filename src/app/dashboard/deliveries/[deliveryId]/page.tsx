'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
import type { Delivery, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileDown, Loader2, User as UserIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useDeliveries } from '../deliveries-context';
import { useItems } from '../../settings/items-context';
import { useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function DeliveryDetailsPage() {
  const router = useRouter();
  const params = useParams<{ deliveryId: string }>();
  const deliveryId = params.deliveryId;
  const { deliveries, isLoading: isDeliveriesLoading, firestore } = useDeliveries();
  const { items: diapers, isLoading: isItemsLoading } = useItems();

  const [delivery, setDelivery] = React.useState<Delivery | null>(null);

  const creatorDocRef = useMemoFirebase(() => {
    if (!delivery?.userId || !firestore) return null;
    return doc(firestore, 'users', delivery.userId);
  }, [delivery, firestore]);
  
  const { data: creatorProfile } = useDoc<UserProfile>(creatorDocRef);


  const detailedItems = React.useMemo(() => {
    if (!delivery || !diapers) return [];
    return delivery.items.map(item => {
        const diaper = diapers.find(d => d.id === item.diaperId);
        const piecesPerCarton = diaper?.piecesPerCarton || 0;
        const totalPieces = item.quantity;
        
        let quantityDisplay = `${totalPieces} pièces`;
        if (piecesPerCarton > 0) {
            const cartons = Math.floor(totalPieces / piecesPerCarton);
            const remainingPieces = totalPieces % piecesPerCarton;
            if (cartons > 0 && remainingPieces > 0) {
                quantityDisplay = `${cartons} carton(s) et ${remainingPieces} pièce(s)`;
            } else if (cartons > 0) {
                quantityDisplay = `${cartons} carton(s)`;
            }
        }
        
        return {
            ...item,
            name: diaper?.name || 'Article inconnu',
            totalPieces: totalPieces,
            quantityDisplay: quantityDisplay,
        };
    });
  }, [delivery, diapers]);

  React.useEffect(() => {
    if (!isDeliveriesLoading) {
        const foundDelivery = deliveries.find(d => d.id === deliveryId);
        if (foundDelivery) {
            setDelivery(foundDelivery);
        }
    }
  }, [deliveryId, deliveries, isDeliveriesLoading]);
  
  const generatePdf = () => {
    if (!delivery) return;

    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text("Bon de Livraison", 14, 22);

    doc.setFontSize(12);
    doc.text(`Date: ${new Date(delivery.date).toLocaleDateString('fr-FR')}`, 14, 32);
    doc.text(`Fournisseur: ${delivery.supplier}`, 14, 38);
    doc.text(`Enregistré par: ${creatorProfile?.displayName || 'Utilisateur inconnu'}`, 14, 44);
    
    const tableHeader = [['Article', 'Quantité', 'Total (pièces)']];
    const tableBody = detailedItems.map(item => [
        item.name, 
        item.quantityDisplay,
        item.totalPieces.toString()
    ]);

    autoTable(doc, {
        head: tableHeader,
        body: tableBody,
        startY: 60,
        theme: 'striped',
        headStyles: { fillColor: [38, 114, 137] },
    });
    
    doc.save(`livraison-${delivery.id}.pdf`);
  };
  
  const isLoading = isDeliveriesLoading || isItemsLoading || !delivery;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
         <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
        <div className="space-y-2">
            <Button variant="ghost" onClick={() => router.push('/dashboard/deliveries')} className="pl-0 text-muted-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour aux livraisons
            </Button>
             <h1 className="text-3xl font-bold tracking-tight">Livraison du {delivery?.date ? new Date(delivery.date).toLocaleDateString('fr-FR') : ''}</h1>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Détails de la Livraison
          </CardTitle>
          <Separator className="my-4" />
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                    <p className="text-muted-foreground">Date de livraison</p>
                    <p className="font-semibold">{new Date(delivery?.date || '').toLocaleDateString('fr-FR')}</p>
                </div>
                 <div>
                    <p className="text-muted-foreground">Fournisseur</p>
                    <p className="font-semibold">{delivery?.supplier}</p>
                </div>
                 <div>
                    <p className="text-muted-foreground">Enregistré par</p>
                    <p className="font-semibold flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" /> 
                        {creatorProfile?.displayName || 'Utilisateur inconnu'}
                    </p>
                </div>
           </div>
        </CardHeader>
        <CardContent>
            <h3 className="font-semibold text-lg mb-4">Articles Reçus</h3>
             <div className="border rounded-lg overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Article</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead className="text-right">Total (pièces)</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {detailedItems.map((item, index) => (
                        <TableRow key={index}>
                        <TableCell className="whitespace-nowrap font-medium">{item.name}</TableCell>
                        <TableCell className="text-left whitespace-nowrap text-muted-foreground">
                           {item.quantityDisplay}
                        </TableCell>
                         <TableCell className="text-right whitespace-nowrap font-medium">
                            {item.totalPieces.toLocaleString('fr-FR')}
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      <div className="flex justify-end pt-4 border-t">
        <Button variant="outline" onClick={generatePdf}>
            <FileDown className="mr-2 h-4 w-4" />
            Imprimer le bon
        </Button>
      </div>
    </div>
  );
}
