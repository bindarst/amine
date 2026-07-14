'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore
} from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

// Variable globale pour stocker l'instance Firestore et éviter les ré-initialisations
let firestoreInstance: Firestore | null = null;

export function initializeFirebase() {
  let firebaseApp: FirebaseApp;

  // 1. Initialisation de l'App Firebase
  if (!getApps().length) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      console.warn('Firebase initialization error, falling back to existing app if possible', e);
      firebaseApp = getApp();
    }

    // 2. Initialisation IMMÉDIATE de Firestore avec Persistance
    // C'est ici que la magie opère : on configure la persistance AVANT que quiconque ne puisse faire un getFirestore
    if (typeof window !== 'undefined' && !firestoreInstance) {
      try {
        firestoreInstance = initializeFirestore(firebaseApp, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
          })
        });
        console.log('Firestore initialized with persistence');
      } catch (err: any) {
        // Si erreur (ex: déjà initialisé par un autre module ou hot reload), on fallback proprement
        console.warn('Firestore persistence init skipped (likely already initialized):', err.code);
        firestoreInstance = getFirestore(firebaseApp);
      }
    } else if (!firestoreInstance) {
      // Côté serveur ou si pas de window
      firestoreInstance = getFirestore(firebaseApp);
    }

  } else {
    // Si l'app existe déjà (Hot Reload ou navigation), on la récupère
    firebaseApp = getApp();

    // On récupère l'instance Firestore associée
    if (!firestoreInstance) {
      firestoreInstance = getFirestore(firebaseApp);
    }
  }

  let messaging = null;
  if (typeof window !== 'undefined') {
    try {
      messaging = getMessaging(firebaseApp);
    } catch (err) {
      console.warn('Firebase Messaging non disponible (contexte navigateur incomplet, IP, ou iframe):', err);
    }
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: firestoreInstance!, // On est sûr qu'il est initialisé
    messaging
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
