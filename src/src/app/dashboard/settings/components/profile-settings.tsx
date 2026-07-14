
'use client';

import * as React from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { useFirebase, useMemoFirebase } from "@/firebase";
import { useDoc } from '@/firebase/firestore/use-doc';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Save, Loader2, LogOut, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { AVATARS } from '@/components/avatars';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { getMessaging, getToken } from "firebase/messaging";

export default function ProfileSettings() {
  const { user, firestore, isUserLoading, auth, firebaseApp } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const [displayName, setDisplayName] = React.useState('');
  const [avatarId, setAvatarId] = React.useState<string>('caregiver');
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [pushToken, setPushToken] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || user?.displayName || '');
      setAvatarId(userProfile.avatarId || 'caregiver');
      setPushNotificationsEnabled(userProfile.pushNotificationsEnabled || false);
      setPushToken(userProfile.pushToken || null);
    }
  }, [userProfile, user]);

  const requestNotificationPermission = async (enabled: boolean) => {
    setPushNotificationsEnabled(enabled);

    if (!enabled) {
      setPushToken(null);
      toast({ title: "Notifications Désactivées", description: "Vous ne recevrez plus de notifications." });
      return;
    }

    if (!firebaseApp || !('Notification' in window)) {
      toast({ title: "Erreur", description: "Ce navigateur ne supporte pas les notifications.", variant: "destructive" });
      setPushNotificationsEnabled(false);
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const messaging = getMessaging(firebaseApp);
        // Get registration token.
        const currentToken = await getToken(messaging);
        if (currentToken) {
          setPushToken(currentToken);
          toast({ title: "Notifications Activées", description: "Vous recevrez désormais des notifications." });
        } else {
          setPushNotificationsEnabled(false);
          toast({ title: "Erreur", description: "Impossible d'obtenir le jeton de notification.", variant: "destructive" });
        }
      } else {
        setPushNotificationsEnabled(false);
        toast({ title: "Permission Refusée", description: "Vous ne recevrez pas de notifications.", variant: "destructive" });
      }
    } catch (error) {
        console.error('An error occurred while requesting notification permission. ', error);
        setPushNotificationsEnabled(false);
        toast({ title: "Erreur", description: "Une erreur est survenue lors de l'activation des notifications.", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!userDocRef) return;
    setIsSaving(true);
    try {
      let updatedProfile: Partial<UserProfile> = {
        displayName: displayName,
        avatarId: avatarId,
        pushNotificationsEnabled: pushNotificationsEnabled,
        pushToken: pushNotificationsEnabled && pushToken ? pushToken : '',
      };

      await setDoc(userDocRef, updatedProfile, { merge: true });
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été sauvegardées avec succès.",
      });
    } catch (error) {
      console.error("Error updating profile: ", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour de votre profil.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  const isLoading = isUserLoading || isProfileLoading;

  return (
    <Card>
        <CardHeader>
            <CardTitle className="text-xl">Mon Profil</CardTitle>
            <CardDescription>Mettez à jour vos informations personnelles et vos préférences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            {isLoading ? (
                <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    <div className="space-y-4">
                        <Label>Avatar</Label>
                        <div className="flex flex-wrap gap-3">
                            {Object.entries(AVATARS).map(([id, AvatarComponent]) => (
                                <button
                                    key={id}
                                    onClick={() => setAvatarId(id)}
                                    className={cn(
                                        "rounded-full h-16 w-16 p-1 transition-all",
                                        avatarId === id ? "ring-2 ring-primary ring-offset-2" : "ring-1 ring-border"
                                    )}
                                >
                                    <AvatarComponent className="h-full w-full" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Nom</Label>
                        <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={user?.email ?? ''} disabled />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-1.5">
                          <Label htmlFor="push-notifications" className="flex items-center gap-2">
                              <Bell className="h-4 w-4" />
                              Notifications Push
                          </Label>
                          <p className="text-xs text-muted-foreground">
                              Recevoir des alertes sur votre téléphone.
                          </p>
                      </div>
                      <Switch
                          id="push-notifications"
                          checked={pushNotificationsEnabled}
                          onCheckedChange={requestNotificationPermission}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-6 border-t">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            Sauvegarder
                        </Button>
                        <Button variant="outline" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4"/>
                            Déconnexion
                        </Button>
                    </div>
                </>
            )}
        </CardContent>
    </Card>
  );
}
