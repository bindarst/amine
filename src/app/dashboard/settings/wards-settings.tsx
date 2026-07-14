
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
import { PlusCircle, MoreHorizontal, Loader2, Trash2, Edit, Power, PowerOff, Target } from 'lucide-react';
import type { Ward, Diaper } from '@/lib/types';
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
import { useToast } from '@/components/ui/use-toast';
import { useWards } from '../wards-context';
import { useItems } from '../items-context';
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUsers } from '../users-context';
import { ScrollArea } from '@/components/ui/scroll-area';

const defaultWard: Omit<Ward, 'id'> = {
  name: '',
  isActive: true,
  parLevels: {},
};

export default function WardsSettings() {
  const { wards, isLoading, addWard, updateWard, deleteWard } = useWards();
  const { items: allItems, isLoading: isItemsLoading } = useItems();
  const { currentUserProfile } = useUsers();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedWard, setSelectedWard] = React.useState<(Omit<Ward, 'id'> & {id: null}) | Ward | null>(null);
  const [wardToDelete, setWardToDelete] = React.useState<Ward | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const isAdmin = currentUserProfile?.role === 'Admin';
  const isSoignant = currentUserProfile?.role === 'Soignant';
  
  const activeItems = React.useMemo(() => {
      if (!allItems) return [];
      return allItems.filter(item => item.isActive)
  }, [allItems]);

  const handleAddNewWard = () => {
    if (!isAdmin) return;
    setSelectedWard({ ...defaultWard, id: null });
    setIsDialogOpen(true);
  };

  const handleEditWard = (ward: Ward) => {
    if (!isAdmin && !isSoignant) return;
    setSelectedWard(ward);
    setIsDialogOpen(true);
  };
  
  const handleToggleActive = (ward: Ward) => {
    if (!isAdmin) return;
    updateWard(ward.id, { isActive: !ward.isActive });
    toast({
      title: 'Statut Modifié',
      description: `L'étage "${ward.name}" a été ${ward.isActive ? 'désactivé' : 'activé'}.`,
    });
  };


  const confirmDeleteWard = (ward: Ward) => {
    if (!isAdmin) return;
    setWardToDelete(ward);
  };

  const handleDeleteWard = async () => {
    if (!wardToDelete || !isAdmin) return;
    deleteWard(wardToDelete.id);
    toast({
      title: 'Étage Supprimé',
      description: `L'étage "${wardToDelete.name}" a été supprimé.`,
      variant: 'destructive'
    });
    setWardToDelete(null);
  };

  const handleSaveWard = async () => {
    if (!selectedWard || !selectedWard.name || (!isAdmin && !isSoignant)) return;

    setIsSaving(true);
    
    const wardDataToSave: Partial<Omit<Ward, 'id'>> = {
        parLevels: selectedWard.parLevels || {},
    };

    if (isAdmin) {
      wardDataToSave.name = selectedWard.name;
      wardDataToSave.isActive = selectedWard.isActive;
    }

    if (selectedWard.id) {
        updateWard(selectedWard.id, wardDataToSave);
    } else if (isAdmin) {
        addWard(wardDataToSave as Omit<Ward, 'id'>);
    }

    toast({
        title: selectedWard.id ? 'Étage Modifié' : 'Étage Ajouté',
        description: `L'étage "${selectedWard.name}" a été sauvegardé.`,
    });

    setIsSaving(false);
    setIsDialogOpen(false);
    setSelectedWard(null);
  };
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      if (isSaving) return;
      setIsDialogOpen(false);
      setSelectedWard(null);
    } else {
      setIsDialogOpen(true);
    }
  };

  const handleFieldChange = (field: keyof Omit<Ward, 'id'>, value: any) => {
    if (selectedWard && isAdmin) {
      setSelectedWard(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const handleParLevelChange = (itemId: string, value: string) => {
    if (selectedWard) {
        const newParLevels = { ...(selectedWard.parLevels || {}) };
        const quantity = parseInt(value, 10);
        if (!isNaN(quantity) && quantity >= 0) {
            newParLevels[itemId] = quantity;
        } else {
            delete newParLevels[itemId];
        }
        setSelectedWard(prev => prev ? { ...prev, parLevels: newParLevels } : null);
    }
  };
  
  if (isLoading || isItemsLoading) {
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
                <CardTitle className="text-xl">Étages / Cantous</CardTitle>
                <p className="text-muted-foreground text-sm">Ajoutez, modifiez les unités de soin et leurs besoins hebdomadaires.</p>
            </div>
            {isAdmin && <Button onClick={handleAddNewWard}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter un étage
            </Button>}
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
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
                                <DropdownMenuItem onClick={() => handleEditWard(ward)}>
                                <Edit className="mr-2 h-4 w-4" /> Modifier
                                </DropdownMenuItem>
                                {isAdmin && (
                                    <>
                                        <DropdownMenuItem onClick={() => handleToggleActive(ward)}>
                                            {ward.isActive ? <PowerOff className="mr-2 h-4 w-4"/> : <Power className="mr-2 h-4 w-4"/>}
                                            {ward.isActive ? 'Désactiver' : 'Activer'}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); confirmDeleteWard(ward);}}>
                                        <Trash2 className="mr-2 h-4 w-4" />Supprimer
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
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
                <h3 className="text-2xl font-bold">Étages / Cantous</h3>
                <p className="text-muted-foreground">Ajoutez ou modifiez les unités de soin et leurs besoins.</p>
            </div>
            {isAdmin && <Button onClick={handleAddNewWard}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter
            </Button>}
        </div>
      {wards.map(ward => (
        <Card key={ward.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-semibold">{ward.name}</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button aria-haspopup="true" size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleEditWard(ward)}><Edit className="mr-2 h-4 w-4"/> Modifier</DropdownMenuItem>
                  {isAdmin && (
                    <>
                        <DropdownMenuItem onClick={() => handleToggleActive(ward)}>
                            {ward.isActive ? <PowerOff className="mr-2 h-4 w-4"/> : <Power className="mr-2 h-4 w-4"/>}
                            {ward.isActive ? 'Désactiver' : 'Activer'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); confirmDeleteWard(ward);}}>
                            <Trash2 className="mr-2 h-4 w-4"/>Supprimer
                        </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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
    <>
      {isMobile ? renderMobileView() : renderDesktopView()}

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col" onInteractOutside={(e) => { if(isSaving) e.preventDefault(); }}>
          <DialogHeader className="shrink-0">
            <DialogTitle>{selectedWard?.id ? "Modifier l'étage" : 'Ajouter un nouvel étage'}</DialogTitle>
            <DialogDescription>
                {isAdmin ? "Entrez le nom et les besoins hebdomadaires pour cette unité de soin." : "Ajustez les besoins hebdomadaires pour cette unité de soin."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-grow overflow-y-auto -mr-6 pr-6">
             <div className="space-y-6 py-4">
                {selectedWard && (
                    <>
                        {isAdmin && (
                          <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Nom</Label>
                                <Input id="name" value={selectedWard.name} onChange={(e) => handleFieldChange('name', e.target.value)} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="isActive" className="text-right">Actif</Label>
                                <Switch id="isActive" checked={selectedWard.isActive} onCheckedChange={(checked) => handleFieldChange('isActive', checked)} />
                            </div>
                          </>
                        )}
                        <div>
                            <h4 className="text-md font-medium mb-4 flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary"/>
                            Besoins Hebdomadaires (Par Levels)
                            </h4>
                            <div className="space-y-4">
                            {activeItems.map(item => (
                                <div key={item.id} className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor={`par-${item.id}`} className="col-span-2 truncate">{item.name}</Label>
                                <Input
                                    id={`par-${item.id}`}
                                    type="number"
                                    placeholder="0"
                                    value={selectedWard.parLevels?.[item.id] || ''}
                                    onChange={(e) => handleParLevelChange(item.id, e.target.value)}
                                    className="h-8"
                                />
                                </div>
                            ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
          </div>

          <DialogFooter className="mt-auto pt-4 border-t shrink-0">
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
    </>
  );
}
