
'use server';

import { collection, addDoc, serverTimestamp, where, getDocs, query } from 'firebase-admin/firestore';
import type { UserProfile } from '@/lib/types';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// This block ensures Firebase Admin is initialized only once on the server.
let adminApp: App;

if (!getApps().find(app => app?.name === 'admin-sdk')) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      }, 'admin-sdk');
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT. Admin SDK features will be limited.", e);
      if (!getApps().length) {
         adminApp = initializeApp();
      } else {
         adminApp = getApps()[0] as App;
      }
    }
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT env var not set. Admin SDK features will be limited.");
    if (!getApps().length) {
       adminApp = initializeApp();
    } else {
       adminApp = getApps()[0] as App;
    }
  }
} else {
  adminApp = getApps().find(app => app?.name === 'admin-sdk') as App;
}

const db = getAdminFirestore(adminApp);


/**
 * Prepares and sends a transactional email by adding it to the 'mail' collection.
 * A Firebase extension (e.g., Trigger Email) must be configured to listen to this collection.
 * 
 * @param subject The subject of the email.
 * @param text The plain text body of the email.
 * @param html The HTML body of the email.
 */
export async function sendTransactionalEmail({ subject, text, html }: { subject: string, text: string, html: string }) {
    if (!db) {
        console.error("Admin Firestore DB not available. Cannot send email.");
        return;
    };

    try {
        // 1. Get all active users
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('isActive', '==', true));
        const querySnapshot = await getDocs(q);

        const userEmails: string[] = [];
        querySnapshot.forEach((doc) => {
            const user = doc.data() as UserProfile;
            if (user.email) {
                userEmails.push(user.email);
            }
        });
        
        if (userEmails.length === 0) {
            console.log("No active users found to send email to.");
            return;
        }

        // 2. Create the email document for the extension
        const mailCollection = collection(db, 'mail');
        await addDoc(mailCollection, {
            to: userEmails,
            message: {
                subject: subject,
                text: text,
                html: html,
            },
            createdAt: serverTimestamp(),
        });

    } catch (error) {
        console.error("Error preparing email:", error);
    }
}

/**
 * Sends a test email specifically to the admin.
 */
export async function sendTestEmail() {
    if (!db) {
        console.error("Admin Firestore DB not available. Cannot send test email.");
        return;
    }

    const adminEmail = "bindarst@hotmail.com";

    try {
        const mailCollection = collection(db, 'mail');
        await addDoc(mailCollection, {
            to: [adminEmail],
            message: {
                subject: "[Test] Email de test depuis Lista",
                text: "Ceci est un email de test pour vérifier que la configuration d'envoi fonctionne correctement.",
                html: "<p>Ceci est un email de test pour vérifier que la configuration d'envoi fonctionne correctement.</p>",
            },
            createdAt: serverTimestamp(),
        });
        console.log(`Test email queued for ${adminEmail}`);
    } catch (error) {
        console.error("Error sending test email:", error);
    }
}
