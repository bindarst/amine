'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    console.error('Error:', error);
  }, [error]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Une erreur est survenue</CardTitle>
          <CardDescription>
            {error.message || 'Une erreur inattendue s\'est produite.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={reset} className="flex-1" variant="default">
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
            <Button onClick={() => router.push('/dashboard')} className="flex-1" variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Accueil
            </Button>
          </div>
          {error.digest && (
            <p className="text-xs text-muted-foreground text-center">
              Code d'erreur: {error.digest}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



