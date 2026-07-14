
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useStock } from '../stock-context';
import { useItems } from '../../settings/items-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Minus, Plus, Send, Search, XCircle, ArrowLeft, Info, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DeliveryItem, Diaper } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUsers } from '../../settings/users-context';
import { Textarea } from '@/components/ui/textarea';
import { useWards } from '../../settings/wards-context';


type DistributionState = {
  [diaperId: string]: {
    quantity: number;
    mode: 'pieces' | 'cartons';
  };
};

const generateInitialState = (diapers: Diaper[]) => {
  return diapers.reduce((acc, diaper) => {
    acc[diaper.id] = { quantity: 0, mode: diaper.defaultUnit };
    return acc;
  }, {} as DistributionState);
}


export default function DirectDistributionPage() {
    const { items: diapers, isLoading: isLoadingItems } = useItems();
    const { directStockDistribution } = useStock();
    const { currentUserProfile } = useUsers();
    const { wards } = useWards();
    const router = useRouter();
    const { toast } = useToast();

    const [distributionState, setDistributionState] = React.useState<DistributionState>({});
    const [searchTerm, setSearchTerm] = React.useState('');
    const [recipientName, setRecipientName] = React.useState('');
    const [comment, setComment] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    const activeItems = React.useMemo(() => diapers.filter(i => i.isActive), [diapers]);
    const canManageStock = currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Soignant' || currentUserProfile?.role === 'Agent Logistique';

    React.useEffect(() => {
        if (diapers.length > 0) {
            setDistributionState(generateInitialState(diapers));
        }
    }, [diapers]);

    const updateDistributionState = (diaperId: string, newDiaperState: { quantity: number; mode: 'pieces' | 'cartons' }) => {
        setDistributionState(prevState => ({
            ...prevState,
            [diaperId]: newDiaperState,
        }));
    };

    const normalizeText = (value: string) => value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    const isWardName = (value: string) => {
        const normalizedValue = normalizeText(value);
        return wards.some(ward => normalizeText(ward.name) === normalizedValue);
    };

    const handleDistributionSubmit = async () => {
        if (!canManageStock) {
            toast({ title: "Accès refusé", description: "Vous n'avez pas les permissions pour effectuer une distribution.", variant: "destructive" });
            return;
        }

        if (!recipientName.trim()) {
            toast({
                title: "Personne manquante",
                description: "Veuillez indiquer la personne qui recoit les langes.",
                variant: "destructive",
            });
            return;
        }

        if (isWardName(recipientName.trim()) || (comment.trim() && isWardName(comment.trim()))) {
            toast({
                title: "Ce n'est pas une sortie directe",
                description: "Pour un etage, utilisez une commande normale. La sortie directe sert uniquement pour une personne hors commande.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);

        const distributionItems: DeliveryItem[] = Object.entries(distributionState)
            .map(([diaperId, value]) => {
                const diaper = diapers.find(d => d.id === diaperId);
                if (value.quantity > 0 && diaper) {
                    const quantityInPieces = value.mode === 'cartons' && diaper.piecesPerCarton ? value.quantity * diaper.piecesPerCarton : value.quantity;
                    return {
                        diaperId,
                        quantity: quantityInPieces, // Always deduct in pieces
                        unit: 'pieces' as const,
                    };
                }
                return null;
            })
            .filter((item): item is DeliveryItem => item !== null);

        if (distributionItems.length === 0) {
            toast({
                title: "Distribution Vide",
                description: "Veuillez ajouter au moins un article.",
                variant: "destructive",
            });
            setIsSubmitting(false);
            return;
        }
        
        const reason = comment.trim() || `Remise a ${recipientName.trim()}`;
        try {
            await directStockDistribution(distributionItems, reason, {
                recipientName: recipientName.trim(),
                comment: comment.trim(),
            });

            toast({
                title: navigator.onLine ? "Distribution enregistrée" : "Distribution conservée hors ligne",
                description: navigator.onLine
                    ? "La sortie de stock a été enregistrée."
                    : "Elle sera synchronisée automatiquement au retour de la connexion.",
            });
            router.push('/dashboard/stock');
        } catch (error) {
            toast({
                title: "Distribution impossible",
                description: error instanceof Error ? error.message : "Une erreur est survenue.",
                variant: "destructive",
            });
            setIsSubmitting(false);
        }
    };

    const isDistributionEmpty = () => {
        return Object.values(distributionState).every(item => item.quantity === 0);
    };

    const filteredDiapers = activeItems.filter(diaper =>
        diaper.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isLoading = isLoadingItems || Object.keys(distributionState).length === 0;
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    if (!canManageStock) {
        return (
            <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>Accès non autorisé</AlertTitle>
                <AlertDescription>Vous ne disposez pas des autorisations nécessaires pour accéder à cette page.</AlertDescription>
            </Alert>
        );
    }
    
    return (
        <div className="container mx-auto py-8 space-y-6">
            <div>
                <Button variant="ghost" onClick={() => router.push('/dashboard/stock')} className="pl-0 text-muted-foreground mb-2">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour au stock
                </Button>
                <h1 className="text-2xl font-headline break-words font-bold">
                    Distribution Directe de Stock
                </h1>
                <p className="text-muted-foreground">
                    Enregistrez une sortie de stock non planifiée (ex: don, usage exceptionnel).
                </p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 pt-6 border-t">
                <div className="space-y-2">
                    <Label htmlFor="recipient-name">Personne qui recoit les langes</Label>
                    <Input
                        id="recipient-name"
                        placeholder="Ex: Malika, Madame Dupont..."
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                     <Label htmlFor="comment">Commentaire</Label>
                     <Textarea
                        id="comment"
                        placeholder="Ex: Don à une famille, besoin urgent pour un événement..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                     />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="search-input">Rechercher un article</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            id="search-input"
                            placeholder="Filtrer les articles..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDiapers.map((diaper) => {
                    const itemState = distributionState[diaper.id];
                    if (!itemState) return null;

                    const totalPieces = itemState.mode === 'cartons' && diaper.piecesPerCarton ? itemState.quantity * diaper.piecesPerCarton : itemState.quantity;

                    return (
                        <Card key={diaper.id} className="flex flex-col">
                            <CardHeader className="p-3 flex-row items-center space-x-3">
                                <div className="w-4 h-8 rounded-sm" style={{ backgroundColor: diaper.hexColor }} />
                                <CardTitle className="text-base">{diaper.name}</CardTitle>
                                <Button variant="ghost" size="icon" className="ml-auto" onClick={() => updateDistributionState(diaper.id, { ...itemState, quantity: 0 })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-3 p-3">
                                <div className="flex items-center space-x-2">
                                    <Label htmlFor={`mode-${diaper.id}`} className={cn("text-sm font-medium", itemState.mode === 'cartons' && 'text-muted-foreground')}>Pièces</Label>
                                    <Switch
                                        id={`mode-${diaper.id}`}
                                        checked={itemState.mode === 'cartons'}
                                        onCheckedChange={() => updateDistributionState(diaper.id, { ...itemState, mode: itemState.mode === 'pieces' ? 'cartons' : 'pieces' })}
                                        aria-label={`Switch to ${itemState.mode === 'pieces' ? 'cartons' : 'pièces'}`}
                                    />
                                    <Label htmlFor={`mode-${diaper.id}`} className={cn("text-sm font-medium", itemState.mode === 'pieces' && 'text-muted-foreground')}>Cartons</Label>
                                </div>
                                <div className="flex items-center justify-center space-x-2">
                                    <Button variant="outline" size="icon" className="shrink-0" onClick={() => updateDistributionState(diaper.id, { ...itemState, quantity: Math.max(0, itemState.quantity - 1) })}>
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <Input
                                        type="number"
                                        className="text-center"
                                        value={itemState.quantity}
                                        onChange={(e) => updateDistributionState(diaper.id, { ...itemState, quantity: parseInt(e.target.value) || 0 })}
                                        min="0"
                                    />
                                    <Button variant="outline" size="icon" className="shrink-0" onClick={() => updateDistributionState(diaper.id, { ...itemState, quantity: itemState.quantity + 1 })}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="text-sm text-muted-foreground text-center">{itemState.quantity > 0 ? `${itemState.quantity} ${itemState.mode === 'cartons' ? 'carton(s)' : 'pièce(s)'}` : 'Aucun'}</div>
                            </CardContent>
                            <CardFooter className="p-3 mt-auto rounded-b-lg">
                                <div className="w-full">
                                    <p className="font-semibold text-base text-center">
                                        Total: {totalPieces} pièces
                                    </p>
                                    {itemState.quantity > 0 && itemState.mode === 'cartons' && diaper.piecesPerCarton &&
                                        <p className="text-xs text-center text-muted-foreground">({itemState.quantity}x{diaper.piecesPerCarton}p)</p>
                                    }
                                </div>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
            {filteredDiapers.length === 0 && searchTerm && (
                <div className="text-center text-muted-foreground col-span-full py-10">
                    <XCircle className="mx-auto h-12 w-12" />
                    <p className="mt-4 font-semibold">Aucun article trouvé</p>
                    <p className="text-sm">Votre recherche pour "{searchTerm}" n'a donné aucun résultat.</p>
                </div>
            )}
            <div className="flex justify-end pt-8 mt-8 border-t">
                <Button size="lg" onClick={handleDistributionSubmit} disabled={isDistributionEmpty() || isSubmitting || !recipientName.trim()}>
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                    Valider la Distribution
                </Button>
            </div>
        </div>
    );
}
