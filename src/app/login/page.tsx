
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
import { useToast } from '@/components/ui/use-toast';
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
import { Loader2, Eye, EyeOff, Mail, Lock, User as UserIcon, ArrowRight } from 'lucide-react';
import { getDoc, doc } from 'firebase/firestore';
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
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedLogo } from '@/components/ui/animated-logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';

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
        await handleSuccessfulLogin(userCredential.user, true);
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
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-0 shadow-2xl bg-background/60 backdrop-blur-xl overflow-hidden">
          {/* Top Gradient Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-primary to-secondary" />

          <CardHeader className="text-center space-y-6 pb-2">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex justify-center"
            >
              <AnimatedLogo size={60} />
            </motion.div>

            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold tracking-tight">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={isSigningUp ? "signup" : "signin"}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="block"
                  >
                    {isSigningUp ? "Créer un compte" : "Bon retour parmi nous"}
                  </motion.span>
                </AnimatePresence>
              </CardTitle>
              <CardDescription>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={isSigningUp ? "signup-desc" : "signin-desc"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="block"
                  >
                    {isSigningUp
                      ? "Entrez vos détails pour commencer l'aventure"
                      : "Connectez-vous pour accéder à votre espace"}
                  </motion.span>
                </AnimatePresence>
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={isSigningUp ? "signup-form" : "signin-form"}
                initial={{ opacity: 0, x: isSigningUp ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isSigningUp ? -20 : 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nom@exemple.com"
                      className="pl-9 bg-background/50 border-muted-foreground/20 focus:border-primary/50 transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isAuthLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Mot de passe</Label>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="pl-9 pr-9 bg-background/50 border-muted-foreground/20 focus:border-primary/50 transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isAuthLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>

                {isSigningUp && (
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        className="pl-9 bg-background/50 border-muted-foreground/20 focus:border-primary/50 transition-all"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isAuthLoading}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  {!isSigningUp && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(c) => setRememberMe(c as boolean)}
                      />
                      <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer text-muted-foreground">
                        Se souvenir de moi
                      </Label>
                    </div>
                  )}

                  <div className={!isSigningUp ? "" : "w-full text-right"}>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="link" className="text-xs p-0 h-auto text-primary/80 hover:text-primary">
                          Mot de passe oublié ?
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass-strong border-0">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Réinitialisation</AlertDialogTitle>
                          <AlertDialogDescription>
                            Entrez votre email pour recevoir un lien de réinitialisation.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-2 py-4">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            placeholder="nom@exemple.com"
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
                  </div>
                </div>

                <Button
                  className="w-full h-11 text-base font-medium shadow-lg hover:shadow-primary/25 transition-all duration-300"
                  onClick={() => handleAuthAction(isSigningUp ? 'signup' : 'signin')}
                  disabled={isAuthLoading}
                >
                  {isAuthLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {isSigningUp ? "S'inscrire" : "Se connecter"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            </AnimatePresence>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted-foreground/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou
                </span>
              </div>
            </div>

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => setIsSigningUp(!isSigningUp)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full"
              >
                {isSigningUp ? 'Déjà un compte ? Se connecter' : "Pas de compte ? Créer un compte"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          &copy; {new Date().getFullYear()} Lista. Tous droits réservés.
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return <LoginContent />;
}
