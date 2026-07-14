
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  User,
  updateProfile,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Image from 'next/image';

function LoginContent() {
  const { auth, user, isUserLoading, firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [isSigningUp, setIsSigningUp] = React.useState(false);
  const [isAuthLoading, setIsAuthLoading] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState('');

  const handleSuccessfulLogin = async (user: User, newDisplayName?: string) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const userProfile: UserProfile = {
          id: user.uid,
          email: user.email,
          displayName: newDisplayName || user.displayName || user.email?.split('@')[0] || '',
          isActive: false, // New users are inactive by default
          avatarId: 'caregiver', // Default avatar
      };
      
      await setDoc(userDocRef, userProfile, { merge: true });
    }
    router.push('/dashboard');
  }

  const handleAuthAction = async (action: 'signin' | 'signup') => {
    if (!auth) return;

    if (action === 'signup' && !displayName) {
        toast({
            title: 'Pseudo manquant',
            description: 'Veuillez choisir un pseudo.',
            variant: 'destructive',
        });
        return;
    }

    setIsAuthLoading(true);
    try {
      let userCredential;
      if (action === 'signup') {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        await handleSuccessfulLogin(userCredential.user, displayName);
        toast({
            title: 'Inscription réussie',
            description: "Votre compte a été créé. Un administrateur doit l'activer.",
        });

      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        await handleSuccessfulLogin(userCredential.user);
      }

    } catch (error: any) {
      console.error(`Error ${action}:`, error);
      let description = "Une erreur est survenue.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          description = "L'adresse e-mail ou le mot de passe est incorrect.";
      } else if (error.code === 'auth/email-already-in-use') {
          description = "Cette adresse e-mail est déjà utilisée par un autre compte.";
      } else if (error.code === 'auth/weak-password') {
          description = "Le mot de passe doit contenir au moins 6 caractères.";
      }
      toast({
        title: `Erreur de ${action === 'signin' ? 'connexion' : 'création de compte'}`,
        description: description,
        variant: 'destructive',
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!auth || !resetEmail) return;
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: 'Email de réinitialisation envoyé',
        description: 'Veuillez consulter votre boîte de réception pour réinitialiser votre mot de passe.',
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'envoyer l'e-mail de réinitialisation. Veuillez vérifier l'adresse e-mail.",
        variant: 'destructive',
      });
    }
  };
  
  React.useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);


  if (isUserLoading || user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-sm mx-auto shadow-2xl">
          <CardHeader className="text-center items-center space-y-4">
            <Image src="/splash.png" alt="Lista Logo" width={150} height={150} />
             <CardTitle className="text-2xl font-bold pt-4">
               {isSigningUp ? "Créer un compte" : "Bienvenue"}
             </CardTitle>
            <CardDescription>
              {isSigningUp
                ? "Entrez vos informations pour vous inscrire."
                : "Connectez-vous à votre compte."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSigningUp && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Pseudo</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Votre pseudo"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isAuthLoading}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m.dupont@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isAuthLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                {!isSigningUp && (
                   <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="link" className="text-xs p-0 h-auto">Mot de passe oublié ?</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Réinitialiser le mot de passe</AlertDialogTitle>
                        <AlertDialogDescription>
                          Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">Email</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="m.dupont@example.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePasswordReset}>Envoyer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isAuthLoading}
              />
            </div>
            {isSigningUp ? (
              <Button size="lg" onClick={() => handleAuthAction('signup')} className="w-full" disabled={isAuthLoading}>
                {isAuthLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                S'inscrire
              </Button>
            ) : (
              <Button size="lg" onClick={() => handleAuthAction('signin')} className="w-full" disabled={isAuthLoading}>
                {isAuthLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Se connecter
              </Button>
            )}
            <div className="text-center">
                <Button variant="link" onClick={() => setIsSigningUp(!isSigningUp)} className="text-muted-foreground">
                  {isSigningUp ? 'Vous avez déjà un compte ? Se connecter' : "Pas de compte ? S'inscrire"}
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}


export default function LoginPage() {
  return <LoginContent />;
}
