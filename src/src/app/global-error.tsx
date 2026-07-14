'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    console.error('Global error:', error);
  }, [error]);

  if (!mounted) {
    return null;
  }

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Erreur critique</CardTitle>
              <CardDescription>
                Une erreur critique s'est produite. Veuillez rafraîchir la page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={reset} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Réessayer
              </Button>
              {error.digest && (
                <p className="text-xs text-muted-foreground text-center">
                  Code d'erreur: {error.digest}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}



