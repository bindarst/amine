'use client';

import * as React from 'react';

export function RegisterOfflineSw(): React.ReactElement | null {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const register = async (): Promise<void> => {
      try {
        const registration = await navigator.serviceWorker.register('/sw-offline.js', {
          scope: '/',
          updateViaCache: 'none',
        });
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      } catch (err) {
        console.warn('Service Worker (hors ligne) non enregistré:', err);
      }
    };

    register();
  }, []);

  return null;
}
