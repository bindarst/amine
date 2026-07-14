
'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Loader2, Trash2, Edit, Power, PowerOff } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useItems } from '../items-context';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const defaultItem: Omit<Diaper, 'id'|'createdAt'|'modifiedAt'> = {
  name: '',
  code: '',
  hexColor: '#FFFFFF',
  piecesPerCarton: 0,
  defaultUnit: 'pieces',
  isActive: true,
};

export default function ItemsSettings() {
  const { items, isLoading, addItem, updateItem, deleteItem } = useItems();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<Diaper | (Omit<Diaper, 'id'> & { id: null }) | null>(null);
  const [itemToDelete, setItemToDelete] = React.useState<Diaper | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleAddNewItem = () => {
    setSelectedItem({ ...defaultItem, id: null });
    setIsDialogOpen(true);
  };

  const handleEditItem = (item: Diaper) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const handleToggleActive = (item: Diaper) => {
    updateItem(item.id, { isActive: !item.isActive });
    toast({
      title: 'Statut Modifié',
      description: `L'article "${item.name}" a été ${item.isActive ? 'désactivé' : 'activé'}.`,
    });
  };

  const confirmDeleteItem = (item: Diaper) => {
    setItemToDelete(item);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    deleteItem(itemToDelete.id);
    toast({
      title: 'Article Supprimé',
      description: `L'article "${itemToDelete.name}" a été supprimé.`,
      variant: 'destructive'
    });
    setItemToDelete(null);
  };

  const handleSaveItem = async () => {
    if (!selectedItem || !selectedItem.name) return;

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  const renderDesktopView = () => (
    <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Pièces/Carton</TableHead>
              <TableHead>Couleur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium whitespace-nowrap">{item.name}</TableCell>
                <TableCell className="whitespace-nowrap">{item.code}</TableCell>
                <TableCell className="whitespace-nowrap">{item.piecesPerCarton}</TableCell>
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
                <TableCell className="text-right whitespace-nowrap">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
  );

  const renderMobileView = () => (
    <div className="space-y-4">
      {items.map(item => (
        <Card key={item.id}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: item.hexColor }} />
                  {item.name}
              </CardTitle>
              <DropdownMenu>
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
              </DropdownMenu>
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
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <h3 className="text-xl font-bold">Gestion des Articles</h3>
        <Button onClick={handleAddNewItem}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un article
        </Button>
      </div>
      
      {isMobile ? renderMobileView() : renderDesktopView()}

       <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[480px]" onInteractOutside={(e) => { if(isSaving) e.preventDefault() }}>
          <DialogHeader>
            <DialogTitle>{selectedItem?.id ? "Modifier l'article" : 'Ajouter un nouvel article'}</DialogTitle>
            <DialogDescription>
              Remplissez les détails de l'article ci-dessous.
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nom</Label>
                <Input id="name" value={selectedItem.name} onChange={(e) => handleFieldChange('name', e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">Code</Label>
                <Input id="code" value={selectedItem.code} onChange={(e) => handleFieldChange('code', e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="piecesPerCarton" className="text-right">Pièces/Carton</Label>
                <Input id="piecesPerCarton" type="number" value={selectedItem.piecesPerCarton} onChange={(e) => handleFieldChange('piecesPerCarton', parseInt(e.target.value) || 0)} className="col-span-3" />
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
                <Label htmlFor="hexColor" className="text-right">Couleur</Label>
                <div className="col-span-3 flex items-center gap-2">
                    <Input id="hexColor" type="color" value={selectedItem.hexColor} onChange={(e) => handleFieldChange('hexColor', e.target.value)} className="w-12 p-1" />
                    <span className="font-mono text-sm">{selectedItem.hexColor}</span>
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
    </div>
  );
}
