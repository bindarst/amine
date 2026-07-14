
'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Loader2, Trash2, Edit, Power, PowerOff, Check, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import type { Diaper } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useItems } from '../items-context';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { useUsers } from '../users-context';
import { Alert } from '@/components/ui/alert';

const defaultItem: Omit<Diaper, 'id'|'createdAt'|'modifiedAt'> = {
  name: '',
  code: '',
  hexColor: '#FBAC43',
  piecesPerCarton: 0,
  defaultUnit: 'pieces',
  isActive: true,
  description: '',
  imageUrl: '',
  lowStockThreshold: 100,
};

const colorPalette = [
  '#FBAC43', '#9FB9D6', '#CF5829', '#FDE03D', '#0373B8', '#89CCA4', '#EC8B83', '#04A36E',
  '#A16BAC', '#F05F80', '#313744', '#95969A', '#FFE5B4', '#EFB589', '#BAA36A', '#ED8223',
  '#589FD2', '#E25925', '#FCD12C', '#0D4E91', '#9DC183', '#EB5579', '#2D8A57', '#8D51A0',
  '#EE396E', '#333333', '#808488', '#F4E3CF', '#7D9B7B', '#A18C4C', '#F05F25', '#4378BC',
  '#8B1818', '#FEBE10', '#1C2951', '#5CBD76', '#DE3064', '#106635', '#583E98', '#E01B51',
  '#000000', '#676E6A', '#FFDDAF', '#8C6A58', '#6E5C41'
];


export default function ItemsSettings() {
  const { items, isLoading, addItem, updateItem, deleteItem } = useItems();
  const { currentUserProfile } = useUsers();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<Diaper | (Omit<Diaper, 'id'> & { id: null }) | null>(null);
  const [itemToDelete, setItemToDelete] = React.useState<Diaper | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const canManage = currentUserProfile?.role === 'Admin';

  const handleAddNewItem = () => {
    if (!canManage) return;
    setSelectedItem({ ...defaultItem, id: null });
    setIsDialogOpen(true);
  };

  const handleEditItem = (item: Diaper) => {
    if (!canManage) return;
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const handleToggleActive = (item: Diaper) => {
    if (!canManage) return;
    updateItem(item.id, { isActive: !item.isActive });
    toast({
      title: 'Statut Modifié',
      description: `L'article "${item.name}" a été ${item.isActive ? 'désactivé' : 'activé'}.`,
    });
  };

  const confirmDeleteItem = (item: Diaper) => {
    if (!canManage) return;
    setItemToDelete(item);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete || !canManage) return;
    deleteItem(itemToDelete.id);
    toast({
      title: 'Article Supprimé',
      description: `L'article "${itemToDelete.name}" a été supprimé.`,
      variant: 'destructive'
    });
    setItemToDelete(null);
  };

  const handleSaveItem = async () => {
    if (!selectedItem || !selectedItem.name || !canManage) return;

    if (selectedItem.defaultUnit === 'cartons' && (selectedItem.piecesPerCarton <= 0 || !selectedItem.piecesPerCarton)) {
        toast({
            title: "Validation Incomplète",
            description: "Veuillez spécifier un nombre de pièces par carton valide.",
            variant: "destructive",
        });
        return;
    }

    setIsSaving(true);
    
    if (selectedItem.id) { // Editing existing item
      const { id, ...itemData } = selectedItem;
      updateItem(id, itemData);
    } else { // Adding new item
      const { id, ...newItemData } = selectedItem;
      addItem(newItemData);
    }

    toast({
      title: selectedItem.id ? 'Article Modifié' : 'Article Ajouté',
      description: `L'article "${selectedItem.name}" a été sauvegardé.`,
    });

    setIsSaving(false);
    setIsDialogOpen(false);
    setSelectedItem(null);
  };

  const handleDialogClose = () => {
    if (isSaving) return;
    setIsDialogOpen(false);
    setSelectedItem(null);
  };

  const handleFieldChange = (field: keyof Diaper, value: any) => {
    if (selectedItem) {
      setSelectedItem(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 512;
          const MAX_HEIGHT = 512;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // Compress to JPEG with 80% quality
          handleFieldChange('imageUrl', dataUrl);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  const renderDesktopView = () => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="text-xl">Articles</CardTitle>
                <CardDescription>Ajoutez, modifiez ou supprimez des articles.</CardDescription>
            </div>
            {canManage && <Button onClick={handleAddNewItem}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter un article
            </Button>}
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Pièces/Carton</TableHead>
                    <TableHead>Seuil Stock Bas</TableHead>
                    <TableHead>Couleur</TableHead>
                    <TableHead>Statut</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map(item => (
                    <TableRow key={item.id}>
                        <TableCell className="font-medium whitespace-nowrap">{item.name}</TableCell>
                        <TableCell className="whitespace-nowrap">{item.code}</TableCell>
                        <TableCell className="whitespace-nowrap">{item.piecesPerCarton}</TableCell>
                        <TableCell className="whitespace-nowrap">{item.lowStockThreshold}</TableCell>
                        <TableCell>
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: item.hexColor }} />
                            <span className="whitespace-nowrap">{item.hexColor}</span>
                        </div>
                        </TableCell>
                        <TableCell>
                        <Badge variant={item.isActive ? 'success' : 'secondary'}>
                            {item.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                        </TableCell>
                        {canManage && <TableCell className="text-right whitespace-nowrap">
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleEditItem(item)}>
                                <Edit className="mr-2 h-4 w-4"/> Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleActive(item)}>
                                {item.isActive ? <PowerOff className="mr-2 h-4 w-4"/> : <Power className="mr-2 h-4 w-4"/>}
                                {item.isActive ? 'Désactiver' : 'Activer'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); confirmDeleteItem(item);}}>
                                    <Trash2 className="mr-2 h-4 w-4"/>Supprimer
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>}
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
  );

  const renderMobileView = () => (
    <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
                <h3 className="text-2xl font-bold">Articles</h3>
                <p className="text-muted-foreground">Ajoutez, modifiez ou supprimez des articles.</p>
            </div>
            {canManage && <Button onClick={handleAddNewItem}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter
            </Button>}
        </div>
      {items.map(item => (
        <Card key={item.id}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: item.hexColor }} />
                  {item.name}
              </CardTitle>
              {canManage && <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button aria-haspopup="true" size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleEditItem(item)}><Edit className="mr-2 h-4 w-4"/> Modifier</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggleActive(item)}>
                    {item.isActive ? <PowerOff className="mr-2 h-4 w-4"/> : <Power className="mr-2 h-4 w-4"/>}
                    {item.isActive ? 'Désactiver' : 'Activer'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); confirmDeleteItem(item);}}>
                    <Trash2 className="mr-2 h-4 w-4"/>Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Code</span>
                <span className="font-medium">{item.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pièces/Carton</span>
                <span className="font-medium">{item.piecesPerCarton}</span>
              </div>
               <div className="flex justify-between">
                <span className="text-muted-foreground">Seuil Stock Bas</span>
                <span className="font-medium">{item.lowStockThreshold}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Statut</span>
                <Badge variant={item.isActive ? 'success' : 'secondary'}>
                  {item.isActive ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      {isMobile ? renderMobileView() : renderDesktopView()}

       <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => { if(isSaving) e.preventDefault() }}>
          <DialogHeader>
            <DialogTitle>{selectedItem?.id ? "Modifier l'article" : 'Ajouter un nouvel article'}</DialogTitle>
            <DialogDescription>
              Remplissez les détails de l'article ci-dessous.
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nom</Label>
                <Input id="name" value={selectedItem.name} onChange={(e) => handleFieldChange('name', e.target.value)} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="description" className="text-right pt-2">Description</Label>
                  <Textarea id="description" value={selectedItem.description} onChange={(e) => handleFieldChange('description', e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">Code</Label>
                <Input id="code" value={selectedItem.code} onChange={(e) => handleFieldChange('code', e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="defaultUnit" className="text-right">Unité défaut</Label>
                 <Select value={selectedItem.defaultUnit} onValueChange={(value) => handleFieldChange('defaultUnit', value)}>
                    <SelectTrigger id="defaultUnit" className="col-span-3">
                      <SelectValue placeholder="Sélectionnez une unité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pieces">Pièces</SelectItem>
                      <SelectItem value="cartons">Cartons</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="piecesPerCarton" className="text-right">Pièces/Carton</Label>
                <Input id="piecesPerCarton" type="number" value={selectedItem.piecesPerCarton} onChange={(e) => handleFieldChange('piecesPerCarton', parseInt(e.target.value) || 0)} className="col-span-3" />
              </div>
              {selectedItem.defaultUnit === 'cartons' && selectedItem.piecesPerCarton <= 0 && (
                <div className="col-span-4">
                    <Alert variant="destructive" className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4"/>
                        <div>Le nombre de pièces par carton doit être supérieur à 0 si l'unité par défaut est "cartons".</div>
                    </Alert>
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lowStockThreshold" className="text-right">Seuil stock bas</Label>
                <Input id="lowStockThreshold" type="number" value={selectedItem.lowStockThreshold} onChange={(e) => handleFieldChange('lowStockThreshold', parseInt(e.target.value) || 0)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Couleur</Label>
                <div className="col-span-3">
                    <div className="flex flex-wrap gap-2">
                        {colorPalette.map(color => (
                            <button
                                key={color}
                                type="button"
                                className={cn(
                                    "h-8 w-8 rounded-md border-2 transition-transform",
                                    selectedItem.hexColor.toLowerCase() === color.toLowerCase()
                                        ? 'border-ring ring-2 ring-ring'
                                        : 'border-transparent'
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => handleFieldChange('hexColor', color)}
                            >
                                {selectedItem.hexColor.toLowerCase() === color.toLowerCase() && (
                                    <Check className="h-5 w-5 text-white mix-blend-difference" />
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="h-6 w-6 rounded-md border" style={{backgroundColor: selectedItem.hexColor}}/>
                        <span className="font-mono text-sm">{selectedItem.hexColor}</span>
                    </div>
                </div>
              </div>
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">Image</Label>
                    <div className="col-span-3 space-y-4">
                        <Input id="picture" type="file" accept="image/*" onChange={handleImageUpload} className="col-span-3" />
                        {selectedItem.imageUrl && (
                        <div className="relative w-32 h-32 rounded-md overflow-hidden border">
                            <Image src={selectedItem.imageUrl} alt="Aperçu" fill objectFit="cover" />
                        </div>
                        )}
                        {!selectedItem.imageUrl && (
                            <div className="w-32 h-32 rounded-md border border-dashed flex items-center justify-center bg-muted">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isActive" className="text-right">Actif</Label>
                <Switch id="isActive" checked={selectedItem.isActive} onCheckedChange={(checked) => handleFieldChange('isActive', checked)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving}>Annuler</Button>
            </DialogClose>
            <Button type="submit" onClick={handleSaveItem} disabled={isSaving || !selectedItem?.name}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action ne peut pas être annulée. Cela supprimera définitivement l'article
                <span className="font-bold"> "{itemToDelete?.name}"</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive hover:bg-destructive/90">
                Oui, supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
