
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

export default function InstallationSettings() {
  const { toast } = useToast();
  const [installPromptEvent, setInstallPromptEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = React.useState(false);

  React.useEffect(() => {
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }
    
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPromptEvent) return;

    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    
    if (outcome === 'accepted') {
      toast({
        title: "Installation réussie !",
        description: "L'application est maintenant disponible depuis votre écran d'accueil.",
      });
      setIsAppInstalled(true);
    } else {
      toast({
        title: "Installation annulée",
        description: "Vous pourrez toujours installer l'application plus tard.",
        variant: "default",
      });
    }
    setInstallPromptEvent(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Installation de l'Application</CardTitle>
        <CardDescription>
          Installez cette application sur votre appareil pour un accès plus rapide, comme une application native.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAppInstalled ? (
            <div className="flex items-center gap-4 p-4 rounded-md bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
                <CheckCircle className="h-8 w-8" />
                <div>
                    <h3 className="font-semibold">Application installée</h3>
                    <p className="text-sm">Vous utilisez déjà l'application installée. Vous pouvez la lancer depuis votre bureau ou votre écran d'accueil.</p>
                </div>
            </div>
        ) : installPromptEvent ? (
          <Button onClick={handleInstallClick} size="lg">
            <Download className="mr-2 h-5 w-5" />
            Installer sur cet appareil
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            L'option d'installation n'est pas disponible sur ce navigateur ou l'application est déjà en cours d'installation.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
