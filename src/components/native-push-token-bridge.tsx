'use client';

import * as React from 'react';
import { arrayUnion, doc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';

type NativePushPayload = {
  granted?: boolean;
  platform?: 'android' | 'ios' | 'web';
  type?: string;
  token?: string;
  deviceName?: string | null;
  source?: string;
  updatedAt?: string;
};

const STORAGE_KEY = 'listaNativePushToken';

function parsePayload(value: unknown): NativePushPayload | null {
  if (!value) return null;
  if (typeof value === 'object') return value as NativePushPayload;
  if (typeof value !== 'string') return null;

  try {
    return JSON.parse(value) as NativePushPayload;
  } catch {
    return null;
  }
}

export function NativePushTokenBridge() {
  const { user, firestore } = useFirebase();
  const lastSavedTokenRef = React.useRef<string | null>(null);

  const saveNativeToken = React.useCallback(
    async (payload: NativePushPayload | null) => {
      if (!user || !firestore || !payload || payload.granted === false) return;
      if (payload.token && lastSavedTokenRef.current === payload.token) return;

      if (payload.token) lastSavedTokenRef.current = payload.token;
      const userRef = doc(firestore, 'users', user.uid);
      const tokenFields = payload.token && payload.type && payload.platform
        ? {
            pushToken: payload.token,
            nativePushTokens: arrayUnion({
              platform: payload.platform,
              type: payload.type,
              token: payload.token,
              deviceName: payload.deviceName ?? null,
              source: payload.source ?? 'lista-native-app',
              updatedAt: payload.updatedAt ?? new Date().toISOString(),
            }),
          }
        : {};
      await setDoc(
        userRef,
        {
          pushNotificationsEnabled: true,
          nativePushEnabled: true,
          ...tokenFields,
        },
        { merge: true }
      );
    },
    [firestore, user]
  );

  React.useEffect(() => {
    if (!user || !firestore || typeof window === 'undefined') return;

    saveNativeToken(parsePayload(window.localStorage.getItem(STORAGE_KEY))).catch(console.error);

    const handleNativePushToken = (event: Event) => {
      const customEvent = event as CustomEvent<NativePushPayload>;
      saveNativeToken(parsePayload(customEvent.detail)).catch(console.error);
    };

    window.addEventListener('lista-native-push-token', handleNativePushToken);
    window.addEventListener('lista-native-notification-state', handleNativePushToken);
    return () => {
      window.removeEventListener('lista-native-push-token', handleNativePushToken);
      window.removeEventListener('lista-native-notification-state', handleNativePushToken);
    };
  }, [firestore, saveNativeToken, user]);

  return null;
}
