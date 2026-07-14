'use client';

import * as React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export function OnlineStatus() {
    const [isOnline, setIsOnline] = React.useState(true);
    const [showBanner, setShowBanner] = React.useState(false);
    const [justReconnected, setJustReconnected] = React.useState(false);

    React.useEffect(() => {
        // Fonction pour mettre à jour le statut
        const updateOnlineStatus = () => {
            const online = navigator.onLine;
            const wasOffline = !isOnline;

            setIsOnline(online);
            setShowBanner(!online);

            // Si on vient de se reconnecter
            if (online && wasOffline) {
                setJustReconnected(true);
                setShowBanner(true);

                // Masquer le banner après 5 secondes
                setTimeout(() => {
                    setShowBanner(false);
                    setJustReconnected(false);
                }, 5000);
            }
        };

        // Initialiser
        updateOnlineStatus();

        // Écouter les changements
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
        };
    }, [isOnline]);

    return (
        <AnimatePresence>
            {showBanner && (
                <motion.div
                    initial={{ opacity: 0, y: -100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -100 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4"
                >
                    <div className={cn(
                        "px-6 py-3 rounded-2xl shadow-2xl border-2",
                        "backdrop-blur-xl flex items-center gap-3",
                        "max-w-md w-full",
                        justReconnected
                            ? "bg-green-500/20 border-green-500/50"
                            : "bg-red-500/20 border-red-500/50"
                    )}>
                        {/* Icon avec animation */}
                        <motion.div
                            animate={{
                                rotate: justReconnected ? [0, 360] : 0,
                                scale: [1, 1.2, 1],
                            }}
                            transition={{
                                duration: 0.6,
                                ease: "easeOut",
                            }}
                        >
                            {justReconnected ? (
                                <Wifi className="h-5 w-5 text-green-500" />
                            ) : (
                                <WifiOff className="h-5 w-5 text-red-500" />
                            )}
                        </motion.div>

                        {/* Message */}
                        <div className="flex-1">
                            <p className={cn(
                                "font-semibold text-sm",
                                justReconnected ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                            )}>
                                {justReconnected ? '✅ Connexion rétablie' : '⚠️ Hors ligne'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {justReconnected
                                    ? 'Synchronisation en cours vers la base de données...'
                                    : 'Vous pouvez continuer : commandes et modifications seront enregistrées et envoyées à la BDD dès que vous serez en ligne.'}
                            </p>
                        </div>

                        {/* Sync icon si reconnecté */}
                        {justReconnected && (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: "linear",
                                }}
                            >
                                <RefreshCw className="h-4 w-4 text-green-500" />
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Badge minimaliste dans le header
export function OnlineStatusBadge() {
    const [isOnline, setIsOnline] = React.useState(true);

    React.useEffect(() => {
        const updateOnlineStatus = () => setIsOnline(navigator.onLine);
        updateOnlineStatus();

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
        };
    }, []);

    if (isOnline) return null;

    return (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/50"
        >
            <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <WifiOff className="h-3.5 w-3.5 text-red-500" />
            </motion.div>
            <span className="text-xs font-medium text-red-700 dark:text-red-300">
                Hors ligne
            </span>
        </motion.div>
    );
}
