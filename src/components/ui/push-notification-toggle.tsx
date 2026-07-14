'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { BellRing, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useUsers } from '@/app/dashboard/settings/users-context';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function PushNotificationToggle() {
    const [permissionState, setPermissionState] = React.useState<NotificationPermission | 'loading'>('loading');
    const [isLoading, setIsLoading] = React.useState(false);
    const { currentUserProfile } = useUsers();
    const { toast } = useToast();

    React.useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermissionState(Notification.permission);
        } else {
            setPermissionState('denied'); // Not supported
        }
    }, []);

    const handleEnableNotifications = async () => {
        setIsLoading(true);
        try {
            const { requestNotificationPermission } = await import('@/lib/notifications');
            if (currentUserProfile?.id) {
                const token = await requestNotificationPermission(currentUserProfile.id);
                if (token) {
                    setPermissionState('granted');
                    toast({
                        title: "Notifications activées !",
                        description: "Vous recevrez désormais les alertes sur votre bureau.",
                    });
                } else {
                    setPermissionState('denied');
                    toast({
                        title: "Action requise",
                        description: "Veuillez autoriser les notifications dans les paramètres de votre navigateur.",
                        variant: "destructive"
                    });
                }
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Erreur",
                description: "Impossible d'activer les notifications.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Si déjà accordé ou non supporté, on n'affiche rien pour garder le header propre
    if (permissionState === 'granted' || permissionState === 'denied' || permissionState === 'loading') {
        return null;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleEnableNotifications}
                        disabled={isLoading}
                        className={cn(
                            "relative rounded-full w-9 h-9 text-muted-foreground hover:text-primary transition-colors",
                            isLoading && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <BellRing className="h-5 w-5 animate-pulse-slow" />
                                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-ping" />
                            </>
                        )}
                        <span className="sr-only">Activer les notifications</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Activer les notifications push</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
