'use client';

import * as React from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Bell, Loader2, LogOut, Save } from 'lucide-react';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import type { UserProfile } from '@/lib/types';
import { isNativeNotificationToken, requestNotificationPermission } from '@/lib/notifications';
import { AVATARS } from '@/components/avatars';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export default function ProfileSettings() {
  const { user, firestore, isUserLoading, auth } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  const [displayName, setDisplayName] = React.useState('');
  const [avatarId, setAvatarId] = React.useState('caregiver');
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = React.useState(false);
  const [pushToken, setPushToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userProfile) return;
    setDisplayName(userProfile.displayName || user?.displayName || '');
    setAvatarId(userProfile.avatarId || 'caregiver');
    setPushNotificationsEnabled(Boolean(userProfile.pushNotificationsEnabled));
    setPushToken(userProfile.pushToken || null);
  }, [userProfile, user]);

  const updateNotificationPermission = async (enabled: boolean) => {
    if (!userDocRef || !user?.uid) return;
    setIsUpdatingNotifications(true);

    try {
      if (!enabled) {
        setPushNotificationsEnabled(false);
        await setDoc(userDocRef, {
          pushNotificationsEnabled: false,
          nativePushEnabled: false,
        }, { merge: true });
        toast({ title: 'Notifications désactivées', description: 'Les alertes Lista sont désactivées sur ce profil.' });
        return;
      }

      const token = await requestNotificationPermission(user.uid);
      if (!token) {
        setPushNotificationsEnabled(false);
        toast({
          title: 'Permission refusée',
          description: 'Autorisez les notifications dans les paramètres du téléphone ou du navigateur.',
          variant: 'destructive',
        });
        return;
      }

      const isNativeApp = typeof window !== 'undefined' && Boolean((window as any).ReactNativeWebView);
      const profileUpdate: Partial<UserProfile> = {
        pushNotificationsEnabled: true,
        nativePushEnabled: isNativeApp,
      };
      if (!isNativeNotificationToken(token)) {
        setPushToken(token);
        profileUpdate.pushToken = token;
      }

      await setDoc(userDocRef, profileUpdate, { merge: true });
      setPushNotificationsEnabled(true);
      toast({
        title: 'Notifications activées',
        description: isNativeApp
          ? 'Les alertes Lista sont maintenant autorisées sur ce téléphone.'
          : 'Vous recevrez désormais les alertes dans votre navigateur.',
      });
    } catch (error) {
      console.error('Notification permission update failed', error);
      setPushNotificationsEnabled(false);
      toast({
        title: 'Erreur',
        description: "Impossible d'activer les notifications pour le moment.",
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  const handleSave = async () => {
    if (!userDocRef) return;
    setIsSaving(true);
    try {
      const isNativeApp = typeof window !== 'undefined' && Boolean((window as any).ReactNativeWebView);
      const updatedProfile: Partial<UserProfile> = {
        displayName,
        avatarId,
        pushNotificationsEnabled,
        nativePushEnabled: isNativeApp && pushNotificationsEnabled,
      };
      if (!isNativeApp || pushToken) {
        updatedProfile.pushToken = pushNotificationsEnabled && pushToken ? pushToken : '';
      }

      await setDoc(userDocRef, updatedProfile, { merge: true });
      toast({ title: 'Profil mis à jour', description: 'Vos informations ont été sauvegardées.' });
    } catch (error) {
      console.error('Profile update failed', error);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder le profil.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  const isLoading = isUserLoading || isProfileLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Mon profil</CardTitle>
        <CardDescription>Mettez à jour vos informations personnelles et vos préférences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <Label>Avatar</Label>
              <div className="flex flex-wrap gap-3">
                {Object.entries(AVATARS).map(([id, AvatarComponent]) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setAvatarId(id)}
                    className={cn(
                      'h-16 w-16 rounded-full p-1 transition-all',
                      avatarId === id ? 'ring-2 ring-primary ring-offset-2' : 'ring-1 ring-border'
                    )}
                  >
                    <AvatarComponent className="h-full w-full" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" value={displayName} onChange={event => setDisplayName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user?.email ?? ''} disabled />
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-lg border p-4">
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="push-notifications" className="flex items-center gap-2">
                  <Bell className="h-4 w-4 shrink-0" />
                  Notifications push
                </Label>
                <p className="break-words text-xs leading-5 text-muted-foreground">
                  Recevoir les nouvelles alertes Lista sur votre téléphone.
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={pushNotificationsEnabled}
                disabled={isUpdatingNotifications}
                onCheckedChange={updateNotificationPermission}
              />
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-6">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Sauvegarder
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
