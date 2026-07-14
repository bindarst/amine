
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  User,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { getDoc, doc } from 'firebase/firestore';
import Image from 'next/image';
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

function LoginContent() {
  const { auth, user, isUserLoading, firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isSigningUp, setIsSigningUp] = React.useState(false);
  const [isAuthLoading, setIsAuthLoading] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);


  const handleSuccessfulLogin = async (user: User, isNewUser = false) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (isNewUser || !userDoc.exists() || !userDoc.data()?.displayName || !userDoc.data()?.avatarId) {
        // If it's a new user or their profile is incomplete, redirect to the completion page.
        router.push('/login/complete-profile');
    } else {
        router.push('/dashboard');
    }
  }

  const handleAuthAction = async (action: 'signin' | 'signup') => {
    if (!auth) return;

    if (action === 'signup' && password !== confirmPassword) {
      toast({
        title: 'Mots de passe non identiques',
        description: 'Veuillez vérifier que les deux mots de passe correspondent.',
        variant: 'destructive',
      });
      return;
    }

    setIsAuthLoading(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      let userCredential;
      if (action === 'signup') {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await handleSuccessfulLogin(userCredential.user, true); // True for new user
        toast({
            title: 'Compte créé !',
            description: "Finalisez votre profil pour continuer.",
        });

      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        await handleSuccessfulLogin(userCredential.user, false);
      }

    } catch (error: any) {
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
       handleSuccessfulLogin(user);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isUserLoading]);


  if (isUserLoading || user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-30 pointer-events-none" />
        <Card className="w-full max-w-sm mx-auto shadow-modern-lg glass-strong animate-scale-in relative z-10">
          <CardHeader className="text-center items-center space-y-4">
            <div className="relative animate-fade-in">
              <Image src="/splash.png" alt="Lista Logo" width={150} height={150} className="drop-shadow-lg" />
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl -z-10 animate-pulse" />
            </div>
             <CardTitle className="text-3xl font-bold pt-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent animate-fade-in" style={{ animationDelay: '100ms' }}>
               {isSigningUp ? "Créer un compte" : "Bienvenue"}
             </CardTitle>
            <CardDescription className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              {isSigningUp
                ? "Entrez vos informations pour vous inscrire."
                : "Connectez-vous à votre compte."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m.dupont@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isAuthLoading}
                autoComplete="email"
                className="transition-all"
              />
            </div>
            <div className="space-y-2 relative">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isAuthLoading}
                  autoComplete={isSigningUp ? "new-password" : "current-password"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-6 h-7 w-7 text-muted-foreground"
                  onClick={() => setShowPassword(prev => !prev)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
             {isSigningUp && (
              <div className="space-y-2 relative">
                  <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isAuthLoading}
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-6 h-7 w-7 text-muted-foreground"
                    onClick={() => setShowPassword(prev => !prev)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
              </div>
            )}
             <div className="flex items-center justify-between">
                {!isSigningUp && (
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember-me" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked as boolean)} />
                      <Label htmlFor="remember-me" className="text-sm font-normal">Se souvenir de moi</Label>
                    </div>
                )}
                <div className={!isSigningUp ? "ml-auto" : "w-full text-right"}>
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
                                    autoComplete="email"
                                />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={handlePasswordReset}>Envoyer</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
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
