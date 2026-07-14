'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Camera, FileUp, Loader2, Sparkles, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import type { Diaper } from '@/lib/types';
import { cn } from '@/lib/utils';

type ExtractedItem = {
    code: string;
    cartons: number;
    confidence: number;
};

type ScanDeliveryDocumentProps = {
    items: Diaper[];
    onDataExtracted: (extractedData: { [diaperId: string]: { cartons: number; pieces: number } }) => void;
};

export default function ScanDeliveryDocument({ items, onDataExtracted }: ScanDeliveryDocumentProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [previewImage, setPreviewImage] = React.useState<string | null>(null);
    const [extractedItems, setExtractedItems] = React.useState<ExtractedItem[]>([]);
    const [validatedItems, setValidatedItems] = React.useState<{ [code: string]: boolean }>({});
    const { toast } = useToast();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast({
                title: "Format invalide",
                description: "Veuillez sélectionner une image (JPG, PNG, etc.)",
                variant: "destructive"
            });
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Process with AI
        await processDocument(file);
    };

    const processDocument = async (file: File) => {
        setIsProcessing(true);

        try {
            // Convert file to base64
            const base64 = await fileToBase64(file);

            // Call AI API
            const response = await fetch('/api/scan-delivery', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: base64,
                    knownCodes: items.map(item => ({ code: item.code, name: item.name }))
                }),
            });

            if (!response.ok) {
                throw new Error('Erreur lors du traitement du document');
            }

            const data = await response.json();
            setExtractedItems(data.items || []);

            // Auto-validate high confidence items
            const autoValidated: { [code: string]: boolean } = {};
            data.items?.forEach((item: ExtractedItem) => {
                if (item.confidence > 0.8) {
                    autoValidated[item.code] = true;
                }
            });
            setValidatedItems(autoValidated);

            toast({
                title: "Document analysé !",
                description: `${data.items?.length || 0} article(s) détecté(s)`,
            });
        } catch (error) {
            console.error('Error processing document:', error);
            toast({
                title: "Erreur",
                description: "Impossible d'analyser le document. Veuillez réessayer.",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    };

    const handleValidate = () => {
        const deliveryState: { [diaperId: string]: { cartons: number; pieces: number } } = {};

        extractedItems.forEach(extracted => {
            if (validatedItems[extracted.code]) {
                const item = items.find(i => i.code === extracted.code);
                if (item) {
                    deliveryState[item.id] = {
                        cartons: extracted.cartons,
                        pieces: 0
                    };
                }
            }
        });

        onDataExtracted(deliveryState);

        toast({
            title: "Données importées !",
            description: `${Object.keys(deliveryState).length} article(s) ajouté(s) à la livraison`,
        });

        // Reset and close
        setIsOpen(false);
        setPreviewImage(null);
        setExtractedItems([]);
        setValidatedItems({});
    };

    const toggleItemValidation = (code: string) => {
        setValidatedItems(prev => ({
            ...prev,
            [code]: !prev[code]
        }));
    };

    const updateItemQuantity = (code: string, cartons: number) => {
        setExtractedItems(prev => prev.map(item =>
            item.code === code ? { ...item, cartons: Math.max(0, cartons) } : item
        ));
    };

    const getItemDetails = (code: string) => {
        return items.find(i => i.code === code);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="gap-2">
                    <Sparkles className="h-5 w-5" />
                    Scanner un bon de livraison
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Scanner un bon de livraison avec l'IA</DialogTitle>
                    <DialogDescription>
                        Prenez une photo ou uploadez un bon de livraison. L'IA extraira automatiquement les codes articles et quantités.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Upload Section */}
                    {!previewImage && (
                        <div className="space-y-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="h-32 flex-col gap-2"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <FileUp className="h-8 w-8" />
                                    Uploader un fichier
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="h-32 flex-col gap-2"
                                    onClick={() => {
                                        fileInputRef.current?.setAttribute('capture', 'environment');
                                        fileInputRef.current?.click();
                                    }}
                                >
                                    <Camera className="h-8 w-8" />
                                    Prendre une photo
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Preview & Results */}
                    {previewImage && (
                        <div className="space-y-4">
                            <div className="relative rounded-lg overflow-hidden border">
                                <img src={previewImage} alt="Preview" className="w-full h-auto max-h-96 object-contain bg-muted" />
                                {isProcessing && (
                                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                            <p className="text-sm font-medium">Analyse en cours par l'IA...</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!isProcessing && extractedItems.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base font-semibold">Articles détectés</Label>
                                        <p className="text-sm text-muted-foreground">
                                            {Object.values(validatedItems).filter(Boolean).length} / {extractedItems.length} validés
                                        </p>
                                    </div>

                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {extractedItems.map((extracted, index) => {
                                            const itemDetails = getItemDetails(extracted.code);
                                            const isValidated = validatedItems[extracted.code];

                                            return (
                                                <Card key={index} className={cn(
                                                    "transition-all",
                                                    isValidated ? "border-primary/50 bg-primary/5" : "border-muted"
                                                )}>
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-4">
                                                            <Button
                                                                variant={isValidated ? "default" : "outline"}
                                                                size="icon"
                                                                className="shrink-0"
                                                                onClick={() => toggleItemValidation(extracted.code)}
                                                            >
                                                                {isValidated ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                                            </Button>

                                                            <div className="flex-1 min-w-0 space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium">Code: {extracted.code}</span>
                                                                    {itemDetails && (
                                                                        <span
                                                                            className="text-xs px-2 py-0.5 rounded-full text-white"
                                                                            style={{ backgroundColor: itemDetails.hexColor }}
                                                                        >
                                                                            {itemDetails.name}
                                                                        </span>
                                                                    )}
                                                                    {!itemDetails && (
                                                                        <span className="text-xs text-destructive">Code inconnu</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                    <span>Confiance: {Math.round(extracted.confidence * 100)}%</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    onClick={() => updateItemQuantity(extracted.code, extracted.cartons - 1)}
                                                                >
                                                                    -
                                                                </Button>
                                                                <Input
                                                                    type="number"
                                                                    value={extracted.cartons}
                                                                    onChange={(e) => updateItemQuantity(extracted.code, parseInt(e.target.value) || 0)}
                                                                    className="w-20 text-center"
                                                                />
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    onClick={() => updateItemQuantity(extracted.code, extracted.cartons + 1)}
                                                                >
                                                                    +
                                                                </Button>
                                                                <span className="text-sm text-muted-foreground w-16">carton(s)</span>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>

                                    <div className="flex gap-2 pt-4 border-t">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => {
                                                setPreviewImage(null);
                                                setExtractedItems([]);
                                                setValidatedItems({});
                                            }}
                                        >
                                            Recommencer
                                        </Button>
                                        <Button
                                            className="flex-1"
                                            onClick={handleValidate}
                                            disabled={Object.values(validatedItems).filter(Boolean).length === 0}
                                        >
                                            <Check className="mr-2 h-4 w-4" />
                                            Valider et importer
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {!isProcessing && extractedItems.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>Aucun article détecté dans ce document.</p>
                                    <Button
                                        variant="link"
                                        onClick={() => {
                                            setPreviewImage(null);
                                        }}
                                    >
                                        Essayer avec une autre image
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
