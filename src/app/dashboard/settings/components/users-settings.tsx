
'use client';

import * as React from 'react';
import { Loader2, Trash2, Bell } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUsers } from '../users-context';
import type { UserProfile } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function UsersSettings() {
  const { users, isLoading, updateUserRole, deleteUser, currentUserProfile } = useUsers();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [userToDelete, setUserToDelete] = React.useState<UserProfile | null>(null);

  const canManage = currentUserProfile?.role === 'Admin';

  const handleRoleChange = (user: UserProfile, newRole: 'Admin' | 'Soignant' | 'Agent Logistique') => {
    if (!canManage || user.id === currentUserProfile?.id) return;
    updateUserRole(user.id, newRole);
    toast({
      title: 'Rôle mis à jour',
      description: `Le rôle de ${user.displayName || user.email} est maintenant ${newRole}. L'utilisateur est activé.`,
    });
  };

  const confirmDeleteUser = (user: UserProfile) => {
    if (!canManage || user.id === currentUserProfile?.id) return;
    setUserToDelete(user);
  }

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    deleteUser(userToDelete.id);
    toast({
        title: 'Utilisateur supprimé',
        description: `L'utilisateur ${userToDelete.displayName || userToDelete.email} a été supprimé.`,
        variant: 'destructive',
    });
    setUserToDelete(null);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!canManage) {
      return (
           <Card>
            <CardHeader>
                <CardTitle>Accès non autorisé</CardTitle>
                <CardDescription>
                Vous n'avez pas les permissions nécessaires pour gérer les utilisateurs.
                </CardDescription>
            </CardHeader>
        </Card>
      )
  }

  const renderDesktopView = () => (
    <Card>
        <CardHeader>
            <CardTitle className="text-xl">Gestion des Utilisateurs</CardTitle>
            <CardDescription>Assignez des rôles pour contrôler les permissions et activer les comptes.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto rounded-lg border">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {users.map(user => (
                        <TableRow key={user.id}>
                        <TableCell className="font-medium whitespace-nowrap">{user.displayName || 'N/A'}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                            <Badge variant={user.isActive ? 'success' : 'destructive'}>
                                {user.isActive ? 'Actif' : 'Inactif'}
                            </Badge>
                        </TableCell>
                        <TableCell className="w-[200px]">
                            <Select
                            value={user.role}
                            onValueChange={(newRole: 'Admin' | 'Soignant' | 'Agent Logistique') => handleRoleChange(user, newRole)}
                            disabled={user.id === currentUserProfile?.id} // Admin cannot change their own role
                            >
                            <SelectTrigger>
                                <SelectValue placeholder="Aucun rôle" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="Soignant">Soignant</SelectItem>
                                <SelectItem value="Agent Logistique">Agent Logistique</SelectItem>
                            </SelectContent>
                            </Select>
                        </TableCell>
                        <TableCell className="text-right">
                        {user.id !== currentUserProfile?.id && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Toggle menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); confirmDeleteUser(user);}} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4"/>Supprimer
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
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
        <h3 className="text-2xl font-bold">Gestion des Utilisateurs</h3>
        {users.map(user => (
            <Card key={user.id}>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-base">{user.displayName || 'N/A'}</CardTitle>
                            <CardDescription>{user.email}</CardDescription>
                        </div>
                        <Badge variant={user.isActive ? 'success' : 'destructive'}>
                            {user.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Rôle</p>
                        <Select
                            value={user.role}
                            onValueChange={(newRole: 'Admin' | 'Soignant' | 'Agent Logistique') => handleRoleChange(user, newRole)}
                            disabled={user.id === currentUserProfile?.id}
                            >
                            <SelectTrigger>
                                <SelectValue placeholder="Aucun rôle" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="Soignant">Soignant</SelectItem>
                                <SelectItem value="Agent Logistique">Agent Logistique</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {user.id !== currentUserProfile?.id && (
                        <div className="mt-4 pt-4 border-t">
                            <Button variant="destructive" className="w-full" onClick={() => confirmDeleteUser(user)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer l'utilisateur
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        ))}
    </div>
  );

  return (
    <>
      {isMobile ? renderMobileView() : renderDesktopView()}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action ne peut pas être annulée. Cela supprimera définitivement l'utilisateur 
                <span className="font-bold"> "{userToDelete?.displayName || userToDelete?.email}"</span> de la base de données.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDelete(null)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
                Oui, supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
