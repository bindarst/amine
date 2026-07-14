
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { setDoc, doc, collection, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, Users } from 'lucide-react';
import { AVATARS } from '@/components/avatars';
import { cn } from '@/lib/utils';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { sendTransactionalEmail } from '@/lib/actions';

export default function CompleteProfilePage() {
  const { user, auth, firestore, isUserLoading } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const [displayName, setDisplayName] = React.useState('');
  const [selectedAvatarId, setSelectedAvatarId] = React.useState('caregiver');
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    // If user is not logged in or still loading, redirect to login
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
    // Pre-fill display name if available
    if (user?.displayName) {
        setDisplayName(user.displayName);
    }
  }, [user, isUserLoading, router]);

  const handleSaveProfile = async () => {
    if (!user || !firestore || !auth.currentUser) {
      toast({
        title: "Erreur",
        description: "Utilisateur non authentifié. Veuillez vous reconnecter.",
        variant: "destructive",
      });
      return;
    }

    if (!displayName.trim()) {
      toast({
        title: "Nom manquant",
        description: "Veuillez entrer votre nom ou un pseudo.",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedAvatarId) {
      toast({
        title: "Avatar manquant",
        description: "Veuillez choisir un avatar.",
        variant: "destructive",
      });
      return;
    }


    setIsSaving(true);
    try {
      // 1. Update Firebase Auth profile
      await updateProfile(auth.currentUser, { displayName });

      // 2. Create/update Firestore user document
      const userDocRef = doc(firestore, 'users', user.uid);
      const userProfile: UserProfile = {
        id: user.uid,
        email: user.email,
        displayName: displayName,
        avatarId: selectedAvatarId,
        isActive: false, // New users are always inactive until an admin approves
      };

      await setDoc(userDocRef, userProfile, { merge: true });
      
      // 3. Create notification for admin
      const notificationsCollectionRef = collection(firestore, 'notifications');
      const notification = {
        type: 'user',
        title: 'Nouvel utilisateur',
        description: `${displayName} a finalisé son profil et attend l'activation.`,
        date: serverTimestamp(),
        read: false,
        data: {
          userId: user.uid,
          displayName: displayName,
        },
        forRole: 'Admin'
      };
      addDocumentNonBlocking(notificationsCollectionRef, notification);

      // 4. Send email to admins
      const subject = `[Lista] Nouvel Utilisateur à Activer: ${displayName}`;
      const textBody = `Un nouvel utilisateur, ${displayName} (${user.email}), vient de finaliser son profil et attend votre activation pour accéder à l'application.`;
      const htmlBody = `
        <p>Bonjour,</p>
        <p>Un nouvel utilisateur, <strong>${displayName}</strong> (<em>${user.email}</em>), vient de finaliser son profil.</p>
        <p>Veuillez vous rendre dans les paramètres de l'application pour lui assigner un rôle et activer son compte.</p>
      `;
      sendTransactionalEmail({ subject: subject, text: textBody, html: htmlBody });


      toast({
        title: "Profil complété !",
        description: "Vous allez être redirigé vers le tableau de bord.",
      });

      router.push('/dashboard');

    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isUserLoading || !user) {
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Finaliser votre profil</CardTitle>
          <CardDescription>Choisissez votre nom et votre avatar pour commencer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="displayName">Nom ou Pseudo</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Votre nom"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-4">
            <Label>Choisissez votre avatar</Label>
            <div className="flex flex-wrap gap-4 justify-center">
              {Object.entries(AVATARS).map(([id, AvatarComponent]) => (
                <button
                  key={id}
                  onClick={() => setSelectedAvatarId(id)}
                  className={cn(
                    "rounded-full h-20 w-20 p-2 transition-all transform hover:scale-105",
                    selectedAvatarId === id ? "ring-4 ring-primary ring-offset-2" : "ring-2 ring-border"
                  )}
                >
                  <AvatarComponent className="h-full w-full" />
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full" size="lg">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Enregistrer et continuer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
