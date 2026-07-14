import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, getFirestore } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

// Cette clé doit être générée dans la console Firebase > Project Settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = 'BN6vxiFlyuKnM1a4TvlPfO_5WYRw1rF3u1c2VNMZ_MXtx6FwZ7JIWxxXeAmbb1N2MDYZKflnyfaSNWdnQ2mh1nE';

export async function requestNotificationPermission(userId: string) {
    try {
        const { messaging, firestore } = initializeFirebase();
        if (!messaging) {
            console.warn("Messaging not supported");
            return null;
        }

        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            console.log('Notification permission granted.');

            // Récupérer le token FCM
            const currentToken = await getToken(messaging, {
                vapidKey: VAPID_KEY
            });

            if (currentToken) {
                console.log('FCM Token:', currentToken);

                // Sauvegarder le token dans le profil utilisateur Firestore
                const userRef = doc(firestore, 'users', userId);
                await updateDoc(userRef, {
                    fcmTokens: arrayUnion(currentToken)
                });

                return currentToken;
            } else {
                console.log('No registration token available. Request permission to generate one.');
                return null;
            }
        } else {
            console.log('Unable to get permission to notify.');
            return null;
        }
    } catch (error) {
        console.error('An error occurred while retrieving token. ', error);
        return null;
    }
}

export function onMessageListener() {
    const { messaging } = initializeFirebase();
    if (!messaging) return;

    return onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        // Ici on peut afficher un toast ou mettre à jour l'UI
        // Note: Les notifications système s'affichent automatiquement si l'app est en background via le SW.
        // En foreground, on doit gérer l'affichage nous-mêmes (ex: Toast).

        const title = payload.notification?.title || 'Nouvelle notification';
        const body = payload.notification?.body || '';

        // On peut utiliser le système de Toast existant de l'app ici si on veut
        new Notification(title, { body }); // Fallback natif si l'utilisateur est sur l'onglet
    });
}
