
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
import type { Ward } from '@/lib/types';
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
import { useWards } from '../wards-context';
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsers } from './users-context';

const defaultWard: Omit<Ward, 'id'> = {
  name: '',
  isActive: true,
};

export default function WardsSettings() {
  const { wards, isLoading, addWard, updateWard, deleteWard } = useWards();
  const { currentUserProfile } = useUsers();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedWard, setSelectedWard] = React.useState<(Omit<Ward, 'id'> & {id: null}) | Ward | null>(null);
  const [wardToDelete, setWardToDelete] = React.useState<Ward | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const canManage = currentUserProfile?.role === 'Admin';

  const handleAddNewWard = () => {
    if (!canManage) return;
    setSelectedWard({ ...defaultWard, id: null });
    setIsDialogOpen(true);
  };

  const handleEditWard = (ward: Ward) => {
    if (!canManage) return;
    setSelectedWard(ward);
    setIsDialogOpen(true);
  };
  
  const handleToggleActive = (ward: Ward) => {
    if (!canManage) return;
    updateWard(ward.id, { isActive: !ward.isActive });
    toast({
      title: 'Statut Modifié',
      description: `L'étage "${ward.name}" a été ${ward.isActive ? 'désactivé' : 'activé'}.`,
    });
  };


  const confirmDeleteWard = (ward: Ward) => {
    if (!canManage) return;
    setWardToDelete(ward);
  };

  const handleDeleteWard = async () => {
    if (!wardToDelete || !canManage) return;
    deleteWard(wardToDelete.id);
    toast({
      title: 'Étage Supprimé',
      description: `L'étage "${wardToDelete.name}" a été supprimé.`,
      variant: 'destructive'
    });
    setWardToDelete(null);
  };

  const handleSaveWard = async () => {
    if (!selectedWard || !selectedWard.name || !canManage) return;

    setIsSaving(true);
    
    const wardDataToSave: Omit<Ward, 'id'> = {
        name: selectedWard.name,
        isActive: selectedWard.isActive,
    };

    if (selectedWard.id) {
        updateWard(selectedWard.id, wardDataToSave);
    } else {
        addWard(wardDataToSave);
    }

    toast({
        title: selectedWard.id ? 'Étage Modifié' : 'Étage Ajouté',
        description: `L'étage "${selectedWard.name}" a été sauvegardé.`,
    });

    setIsSaving(false);
    setIsDialogOpen(false);
    setSelectedWard(null);
  };
  
  const handleDialogClose = () => {
    if (isSaving) return;
    setIsDialogOpen(false);
    setSelectedWard(null);
  };

  const handleFieldChange = (field: keyof Omit<Ward, 'id'>, value: any) => {
    if (selectedWard) {
      setSelectedWard(prev => prev ? { ...prev, [field]: value } : null);
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
          {wards.map(ward => (
            <TableRow key={ward.id}>
              <TableCell className="font-medium whitespace-nowrap">{ward.name}</TableCell>
              <TableCell>
                  <Badge variant={ward.isActive ? 'success' : 'secondary'}>
                      {ward.isActive ? 'Actif' : 'Inactif'}
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
                    <DropdownMenuItem onClick={() => handleEditWard(ward)}>
                      <Edit className="mr-2 h-4 w-4" /> Modifier
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => handleToggleActive(ward)}>
                        {ward.isActive ? <PowerOff className="mr-2 h-4 w-4"/> : <Power className="mr-2 h-4 w-4"/>}
                        {ward.isActive ? 'Désactiver' : 'Activer'}
                      </DropdownMenuItem>
                     <DropdownMenuSeparator />
                     <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); confirmDeleteWard(ward);}}>
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
      {wards.map(ward => (
        <Card key={ward.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">{ward.name}</CardTitle>
              {canManage && <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button aria-haspopup="true" size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleEditWard(ward)}><Edit className="mr-2 h-4 w-4"/> Modifier</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggleActive(ward)}>
                    {ward.isActive ? <PowerOff className="mr-2 h-4 w-4"/> : <Power className="mr-2 h-4 w-4"/>}
                    {ward.isActive ? 'Désactiver' : 'Activer'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); confirmDeleteWard(ward);}}>
                    <Trash2 className="mr-2 h-4 w-4"/>Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>}
            </CardHeader>
            <CardContent>
              <Badge variant={ward.isActive ? 'success' : 'secondary'}>
                {ward.isActive ? 'Actif' : 'Inactif'}
              </Badge>
            </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <h3 className="text-xl font-bold">Gestion des Étages / Cantous</h3>
        {canManage && <Button onClick={handleAddNewWard}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un étage
        </Button>}
      </div>
      
      {isMobile ? renderMobileView() : renderDesktopView()}

       <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[480px]" onInteractOutside={(e) => { if(isSaving) e.preventDefault() }}>
          <DialogHeader>
            <DialogTitle>{selectedWard?.id ? "Modifier l'étage" : 'Ajouter un nouvel étage'}</DialogTitle>
            <DialogDescription>
              Entrez le nom de l'étage ou du cantou.
            </DialogDescription>
          </DialogHeader>
          {selectedWard && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nom</Label>
                <Input id="name" value={selectedWard.name} onChange={(e) => handleFieldChange('name', e.target.value)} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isActive" className="text-right">Actif</Label>
                <Switch id="isActive" checked={selectedWard.isActive} onCheckedChange={(checked) => handleFieldChange('isActive', checked)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving}>Annuler</Button>
            </DialogClose>
            <Button type="submit" onClick={handleSaveWard} disabled={isSaving || !selectedWard?.name}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!wardToDelete} onOpenChange={() => setWardToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action ne peut pas être annulée. Cela supprimera définitivement l'étage
                <span className="font-bold"> "{wardToDelete?.name}"</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setWardToDelete(null)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteWard} className="bg-destructive hover:bg-destructive/90">
                Oui, supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
