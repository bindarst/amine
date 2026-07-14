
'use client';

import * as React from 'react';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useOrders } from '../../orders/orders-context';
import { useDeliveries } from '../../deliveries/deliveries-context';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNotifications } from '../../notifications-context';

export default function DataSettings() {
    const { deleteAllOrders } = useOrders();
    const { deleteAllDeliveries } = useDeliveries();
    const { deleteAllNotifications, deleteAdjustmentHistory } = useNotifications();
    const [isResetting, setIsResetting] = React.useState(false);
    const [confirmationText, setConfirmationText] = React.useState('');
    const { toast } = useToast();

    const handleResetData = async (dataType: 'orders' | 'deliveries' | 'notifications' | 'adjustments') => {
        if (confirmationText !== 'supprimer') return;
        
        setIsResetting(true);
        try {
            let successMessage = '';
            if (dataType === 'orders') {
                await deleteAllOrders();
                successMessage = "Toutes les commandes ont été supprimées.";
            } else if (dataType === 'deliveries') {
                await deleteAllDeliveries();
                successMessage = "Toutes les livraisons ont été supprimées.";
            } else if (dataType === 'notifications') {
                await deleteAllNotifications();
                successMessage = "Toutes les notifications ont été supprimées.";
            } else if (dataType === 'adjustments') {
                await deleteAdjustmentHistory();
                successMessage = "L'historique des ajustements de stock a été réinitialisé.";
            }


            toast({
                title: "Réinitialisation terminée",
                description: successMessage,
            });
        } catch (error) {
            console.error("Failed to reset data:", error);
            toast({
                title: "Erreur de réinitialisation",
                description: "Une erreur est survenue lors de la suppression des données.",
                variant: "destructive",
            });
        } finally {
            setIsResetting(false);
            setConfirmationText('');
        }
    };
    
    const onDialogOpenChange = (open: boolean) => {
        if (!open) {
            setConfirmationText('');
        }
    }

    const renderResetDialog = (dataType: 'orders' | 'deliveries' | 'notifications' | 'adjustments', title: string, description: string) => (
        <AlertDialog onOpenChange={onDialogOpenChange}>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mt-4 sm:mt-0">
                    Réinitialiser
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description} Pour confirmer, veuillez taper le mot <strong className="text-foreground">supprimer</strong> ci-dessous.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                    <Label htmlFor={`confirmation-input-${dataType}`}>Confirmation</Label>
                    <Input
                        id={`confirmation-input-${dataType}`}
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        placeholder='Tapez "supprimer"'
                        autoComplete="off"
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isResetting}>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => handleResetData(dataType)}
                        disabled={isResetting || confirmationText !== 'supprimer'}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Oui, tout supprimer
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    return (
        <div className="space-y-6">
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-xl text-destructive flex items-center gap-2">
                        <AlertCircle />
                        Zone Dangereuse
                    </CardTitle>
                    <CardDescription>
                        Ces actions sont irréversibles. Soyez certain avant de continuer.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-destructive/5">
                        <div>
                            <h4 className="font-semibold">Réinitialiser les commandes</h4>
                            <p className="text-sm text-muted-foreground">Supprime toutes les commandes de la base de données. Utile pour repartir de zéro.</p>
                        </div>
                        {renderResetDialog('orders', 'Réinitialiser les commandes', 'Cette action est irréversible. Toutes les données de commandes seront définitivement supprimées.')}
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-destructive/5">
                        <div>
                            <h4 className="font-semibold">Réinitialiser les livraisons</h4>
                            <p className="text-sm text-muted-foreground">Supprime toutes les livraisons de la base de données.</p>
                        </div>
                        {renderResetDialog('deliveries', 'Réinitialiser les livraisons', 'Cette action est irréversible. Toutes les données de livraisons seront définitivement supprimées.')}
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-destructive/5">
                        <div>
                            <h4 className="font-semibold">Réinitialiser les ajustements</h4>
                            <p className="text-sm text-muted-foreground">Supprime l'historique des ajustements de stock (visibles dans les rapports).</p>
                        </div>
                        {renderResetDialog('adjustments', "Réinitialiser l'historique des ajustements", "Cette action est irréversible. Toutes les notifications liées aux ajustements de stock seront supprimées.")}
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-destructive/5">
                        <div>
                            <h4 className="font-semibold">Réinitialiser les notifications</h4>
                            <p className="text-sm text-muted-foreground">Supprime toutes les notifications pour tous les utilisateurs.</p>
                        </div>
                        {renderResetDialog('notifications', 'Réinitialiser les notifications', 'Cette action est irréversible. Toutes les notifications seront définitivement supprimées pour tous les utilisateurs.')}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
