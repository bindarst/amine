'use client';

import * as React from 'react';
import { Barcode, Camera, CheckCircle2, Loader2, Save, Search, X } from 'lucide-react';
import { useItems } from '../items-context';
import { useUsers } from '../users-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

export default function BarcodeSettings() {
  const { items, isLoading, updateItem } = useItems();
  const { currentUserProfile } = useUsers();
  const { toast } = useToast();
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const scanTimerRef = React.useRef<number | null>(null);

  const [selectedItemId, setSelectedItemId] = React.useState('');
  const [barcodeValue, setBarcodeValue] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isScanning, setIsScanning] = React.useState(false);
  const [scannerError, setScannerError] = React.useState('');

  const canManage = currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Soignant';
  const activeItems = React.useMemo(() => items.filter((item) => item.isActive), [items]);
  const filteredItems = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.name, item.code, item.barcode || ''].join(' ').toLowerCase().includes(query)
    );
  }, [items, searchTerm]);

  const stopScanner = React.useCallback(() => {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsScanning(false);
  }, []);

  React.useEffect(() => stopScanner, [stopScanner]);

  const startScanner = async () => {
    setScannerError('');
    if (!('BarcodeDetector' in window)) {
      setScannerError("Le scan camera n'est pas supporte par ce navigateur. Vous pouvez encoder le code manuellement.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setIsScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const BarcodeDetectorCtor = (window as any).BarcodeDetector;
      const detector = new BarcodeDetectorCtor({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf'],
      });

      scanTimerRef.current = window.setInterval(async () => {
        if (!videoRef.current) return;
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0) {
          const rawValue = String(codes[0].rawValue || '').trim();
          if (rawValue) {
            setBarcodeValue(rawValue);
            stopScanner();
          }
        }
      }, 500);
    } catch (error) {
      console.error(error);
      setScannerError("Impossible d'ouvrir la camera. Verifiez l'autorisation camera ou encodez le code manuellement.");
      stopScanner();
    }
  };

  const handleSave = () => {
    if (!selectedItemId || !barcodeValue.trim()) {
      toast({
        title: 'Information manquante',
        description: "Choisissez un article et scannez ou encodez un code-barres.",
        variant: 'destructive',
      });
      return;
    }

    const existingItem = items.find((item) => item.id !== selectedItemId && item.barcode === barcodeValue.trim());
    if (existingItem) {
      toast({
        title: 'Code deja utilise',
        description: `Ce code est deja attribue a ${existingItem.name}.`,
        variant: 'destructive',
      });
      return;
    }

    updateItem(selectedItemId, { barcode: barcodeValue.trim() });
    toast({
      title: 'Code-barres enregistre',
      description: "Le code-barres a ete attribue a l'article.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Acces non autorise</AlertTitle>
        <AlertDescription>Cette section est reservee aux administrateurs et soignants.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5 text-primary" />
            Attribution des codes-barres
          </CardTitle>
          <CardDescription>
            Scannez un code-barres puis choisissez le type de lange correspondant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="item-select">Type de lange</Label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger id="item-select">
                  <SelectValue placeholder="Choisir un article..." />
                </SelectTrigger>
                <SelectContent>
                  {activeItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode-value">Code-barres</Label>
              <Input
                id="barcode-value"
                value={barcodeValue}
                onChange={(event) => setBarcodeValue(event.target.value)}
                placeholder="Scanner ou encoder le code..."
              />
            </div>
          </div>

          {scannerError && (
            <Alert variant="destructive">
              <AlertTitle>Scan indisponible</AlertTitle>
              <AlertDescription>{scannerError}</AlertDescription>
            </Alert>
          )}

          {isScanning && (
            <div className="rounded-xl overflow-hidden border bg-black">
              <video ref={videoRef} className="h-64 w-full object-cover" muted playsInline />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={startScanner} disabled={isScanning}>
              <Camera className="mr-2 h-4 w-4" />
              Scanner
            </Button>
            {isScanning && (
              <Button type="button" variant="outline" onClick={stopScanner}>
                <X className="mr-2 h-4 w-4" />
                Arreter
              </Button>
            )}
            <Button type="button" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Codes attribues</CardTitle>
          <CardDescription>Liste des articles avec leur code-barres.</CardDescription>
          <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 translate-y-0 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher un article ou un code..."
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Code interne</TableHead>
                <TableHead>Code-barres</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.code}</TableCell>
                  <TableCell>{item.barcode || '-'}</TableCell>
                  <TableCell>
                    {item.barcode ? (
                      <span className="inline-flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Configure
                      </span>
                    ) : (
                      <span className="text-muted-foreground">A configurer</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
