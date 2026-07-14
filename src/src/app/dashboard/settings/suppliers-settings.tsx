
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
import { PlusCircle, MoreHorizontal, Loader2, Trash2, Edit, Star, PowerOff, Power } from 'lucide-react';
import type { Supplier } from '@/lib/types';
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
import { useToast } from '@/hooks/use-toast';
import { useSuppliers } from '../suppliers-context';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsers } from './users-context';

const defaultSupplier: Omit<Supplier, 'id'> = {
  name: '',
  isDefault: false,
};

export default function SuppliersSettings() {
  const { suppliers, isLoading, addSupplier, updateSupplier, deleteSupplier, setAsDefault } = useSuppliers();
  const { currentUserProfile } = useUsers();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedSupplier, setSelectedSupplier] = React.useState<(Omit<Supplier, 'id'> & {id: null}) | Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = React.useState<Supplier | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const canManage = currentUserProfile?.role === 'Admin';

  const handleAddNewSupplier = () => {
    if (!canManage) return;
    setSelectedSupplier({ ...defaultSupplier, id: null });
    setIsDialogOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    if (!canManage) return;
    setSelectedSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleSetDefault = (supplier: Supplier) => {
    if (supplier.isDefault || !canManage) return;
    setAsDefault(supplier.id);
     toast({
      title: 'Fournisseur par Défaut',
      description: `"${supplier.name}" est maintenant le fournisseur par défaut.`,
    });
  }

  const confirmDeleteSupplier = (supplier: Supplier) => {
    if (!canManage) return;
    setSupplierToDelete(supplier);
  };

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete || !canManage) return;
    deleteSupplier(supplierToDelete.id);
    toast({
      title: 'Fournisseur Supprimé',
      description: `Le fournisseur "${supplierToDelete.name}" a été supprimé.`,
      variant: 'destructive'
    });
    setSupplierToDelete(null);
  };

  const handleSaveSupplier = async () => {
    if (!selectedSupplier || !selectedSupplier.name || !canManage) return;

    setIsSaving(true);
    
    const supplierDataToSave: Omit<Supplier, 'id'> = {
        name: selectedSupplier.name,
        isDefault: selectedSupplier.isDefault,
    };

    if (selectedSupplier.id) {
        updateSupplier(selectedSupplier.id, supplierDataToSave);
    } else {
        addSupplier(supplierDataToSave);
    }

    toast({
        title: selectedSupplier.id ? 'Fournisseur Modifié' : 'Fournisseur Ajouté',
        description: `Le fournisseur "${selectedSupplier.name}" a été sauvegardé.`,
    });

    setIsSaving(false);
    setIsDialogOpen(false);
    setSelectedSupplier(null);
  };
  
  const handleDialogClose = () => {
    if (isSaving) return;
    setIsDialogOpen(false);
    setSelectedSupplier(null);
  };

  const handleFieldChange = (field: keyof Omit<Supplier, 'id'>, value: any) => {
    if (selectedSupplier) {
      setSelectedSupplier(prev => prev ? { ...prev, [field]: value } : null);
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
            <TableHead>Statut</TableHead>
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map(supplier => (
            <TableRow key={supplier.id}>
              <TableCell className="font-medium whitespace-nowrap">{supplier.name}</TableCell>
              <TableCell>
                  {supplier.isDefault && <Badge variant="success">Par défaut</Badge>}
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
                    <DropdownMenuItem onClick={() => handleEditSupplier(supplier)}>
                      <Edit className="mr-2 h-4 w-4" /> Modifier
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => handleSetDefault(supplier)} disabled={supplier.isDefault}>
                        <Star className="mr-2 h-4 w-4"/>
                        Définir par défaut
                      </DropdownMenuItem>
                     <DropdownMenuSeparator />
                     <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); confirmDeleteSupplier(supplier);}}>
                      <Trash2 className="mr-2 h-4 w-4" />Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderMobileView = () => (
    <div className="space-y-4">
      {suppliers.map(supplier => (
        <Card key={supplier.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-semibold">{supplier.name}</CardTitle>
                {supplier.isDefault && <Badge variant="success" className="mt-1">Par défaut</Badge>}
              </div>
              {canManage && <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button aria-haspopup="true" size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleEditSupplier(supplier)}>
                      <Edit className="mr-2 h-4 w-4" /> Modifier
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => handleSetDefault(supplier)} disabled={supplier.isDefault}>
                        <Star className="mr-2 h-4 w-4"/>
                        Définir par défaut
                      </DropdownMenuItem>
                     <DropdownMenuSeparator />
                     <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); confirmDeleteSupplier(supplier);}}>
                      <Trash2 className="mr-2 h-4 w-4" />Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>}
            </CardHeader>
        </Card>
      ))}
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <h3 className="text-xl font-bold">Gestion des Fournisseurs</h3>
        {canManage && <Button onClick={handleAddNewSupplier}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un fournisseur
        </Button>}
      </div>
      
      {isMobile ? renderMobileView() : renderDesktopView()}

       <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[480px]" onInteractOutside={(e) => { if(isSaving) e.preventDefault() }}>
          <DialogHeader>
            <DialogTitle>{selectedSupplier?.id ? "Modifier le fournisseur" : 'Ajouter un nouveau fournisseur'}</DialogTitle>
            <DialogDescription>
              Entrez le nom du fournisseur ou du livreur.
            </DialogDescription>
          </DialogHeader>
          {selectedSupplier && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nom</Label>
                <Input id="name" value={selectedSupplier.name} onChange={(e) => handleFieldChange('name', e.target.value)} className="col-span-3" />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving}>Annuler</Button>
            </DialogClose>
            <Button type="submit" onClick={handleSaveSupplier} disabled={isSaving || !selectedSupplier?.name}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!supplierToDelete} onOpenChange={() => setSupplierToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action ne peut pas être annulée. Cela supprimera définitivement le fournisseur
                <span className="font-bold"> "{supplierToDelete?.name}"</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSupplierToDelete(null)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSupplier} className="bg-destructive hover:bg-destructive/90">
                Oui, supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
