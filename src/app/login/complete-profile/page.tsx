
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { setDoc, doc, collection, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, Users, User as UserIcon } from 'lucide-react';
import { AVATARS } from '@/components/avatars';
import { cn } from '@/lib/utils';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { sendTransactionalEmail } from '@/lib/actions';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AnimatedLogo } from '@/components/ui/animated-logo';

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
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
          <Loader2 className="h-16 w-16 animate-spin text-primary relative z-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[100px] animate-pulse-slow" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-secondary/10 blur-[100px] animate-pulse-slow" style={{ animationDelay: '4s' }} />
      </div>

      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl relative z-10"
      >
        <Card className="border-0 shadow-2xl bg-background/60 backdrop-blur-xl overflow-hidden">
          {/* Top Gradient Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-primary to-secondary" />

          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center mb-4">
              <AnimatedLogo size={50} />
            </div>
            <CardTitle className="text-3xl font-bold">Finaliser votre profil</CardTitle>
            <CardDescription className="text-lg">
              Choisissez votre nom et votre avatar pour commencer l'aventure.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-3">
              <Label htmlFor="displayName" className="text-base font-medium">Nom ou Pseudo</Label>
              <div className="relative group">
                <UserIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Comment doit-on vous appeler ?"
                  disabled={isSaving}
                  className="pl-10 h-11 bg-background/50 border-muted-foreground/20 focus:border-primary/50 text-lg transition-all"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-medium">Choisissez votre avatar</Label>
              <div className="flex flex-wrap gap-6 justify-center p-4 bg-background/30 rounded-2xl border border-white/10">
                {Object.entries(AVATARS).map(([id, AvatarComponent]) => (
                  <motion.button
                    key={id}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedAvatarId(id)}
                    className={cn(
                      "rounded-full h-24 w-24 p-2 transition-all relative group",
                      selectedAvatarId === id ? "ring-4 ring-primary ring-offset-4 ring-offset-background" : "hover:bg-white/10"
                    )}
                  >
                    <AvatarComponent className="h-full w-full drop-shadow-lg" />
                    {selectedAvatarId === id && (
                      <motion.div
                        layoutId="avatar-check"
                        className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 shadow-lg"
                      >
                        <Save className="h-4 w-4" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full h-12 text-lg font-medium shadow-lg hover:shadow-primary/25 transition-all duration-300"
              size="lg"
            >
              {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              Enregistrer et continuer
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
