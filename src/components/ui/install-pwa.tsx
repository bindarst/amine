'use client';

import * as React from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallPrompt, setShowInstallPrompt] = React.useState(false);
    const [isInstalled, setIsInstalled] = React.useState(false);

    React.useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Listen for install prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            const promptEvent = e as BeforeInstallPromptEvent;
            setDeferredPrompt(promptEvent);

            // Only show after 30 seconds or after user interaction
            setTimeout(() => {
                const dismissed = localStorage.getItem('pwa-install-dismissed');
                if (!dismissed) {
                    setShowInstallPrompt(true);
                }
            }, 30000); // Show after 30 seconds
        };

        // Listen for successful installation
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setShowInstallPrompt(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        await deferredPrompt.prompt();

        // Wait for user's choice
        const choiceResult = await deferredPrompt.userChoice;

        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        setDeferredPrompt(null);
        setShowInstallPrompt(false);
    };

    const handleDismiss = () => {
        setShowInstallPrompt(false);
        localStorage.setItem('pwa-install-dismissed', 'true');
    };

    // Don't show if already installed or no prompt available
    if (isInstalled || !showInstallPrompt) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ duration: 0.3 }}
                className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50"
            >
                <Card className={cn(
                    "relative overflow-hidden border-2 border-primary/30",
                    "glass-strong backdrop-blur-xl shadow-2xl"
                )}>
                    {/* Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-primary/10" />

                    {/* Shine effect */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    {/* Content */}
                    <div className="relative p-4 space-y-3">
                        {/* Close button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        {/* Header */}
                        <div className="flex items-start gap-3 pr-6">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-primary">
                                <Download className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Installer Lista</h3>
                                <p className="text-sm text-muted-foreground">
                                    Accès rapide, mode hors ligne et notifications
                                </p>
                            </div>
                        </div>

                        {/* Features */}
                        <ul className="space-y-1.5 text-sm pl-12">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                <span>⚡ Accès instantané depuis l'écran d'accueil</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                <span>📱 Fonctionne hors ligne</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                <span>🔔 Notifications push</span>
                            </li>
                        </ul>

                        {/* Install Button */}
                        <Button
                            onClick={handleInstallClick}
                            className="w-full hover-lift shadow-lg"
                            size="lg"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Installer l'application
                        </Button>
                    </div>

                    {/* Bottom shine */}
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </Card>
            </motion.div>
        </AnimatePresence>
    );
}
