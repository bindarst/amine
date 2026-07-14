import { initializeApp } from 'firebase/app';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  setDoc,
  Timestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'studio-9486387229-bb4f7',
  appId: '1:623398842041:web:cef9dc42f6063202f2b568',
  apiKey: 'AIzaSyDfm5PF-4roYtEI_gIWkRNWeL1_UqYWc2E',
  authDomain: 'studio-9486387229-bb4f7.firebaseapp.com',
  messagingSenderId: '623398842041',
  storageBucket: 'studio-9486387229-bb4f7.appspot.com',
  measurementId: 'G-5G01G2T745',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function text(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function isDirectDistributionNotification(notification) {
  const data = notification.data || {};
  const title = text(notification.title);
  const description = text(notification.description);

  return notification.type === 'info'
    && Array.isArray(data.items)
    && typeof data.reason === 'string'
    && (
      data.directDistributionKind === 'external-person'
      || title.includes('distribution directe')
      || description.includes('distribution directe')
    );
}

function countPieces(items) {
  return (items || []).reduce((total, item) => total + (Number(item.quantity) || 0), 0);
}

const snapshot = await getDocs(query(collection(db, 'notifications'), orderBy('date', 'desc')));
const candidates = [];

snapshot.forEach((notificationDoc) => {
  const notification = { id: notificationDoc.id, ...notificationDoc.data() };
  if (isDirectDistributionNotification(notification)) {
    candidates.push(notification);
  }
});

let created = 0;
let skipped = 0;
let failed = 0;

for (const notification of candidates) {
  const targetRef = doc(db, 'directDistributions', `legacy_${notification.id}`);
  const existing = await getDoc(targetRef);
  if (existing.exists()) {
    skipped += 1;
    continue;
  }

  const data = notification.data || {};
  try {
    await setDoc(targetRef, {
      userId: data.userId || null,
      userName: data.userName || null,
      items: data.items || [],
      reason: data.reason || '',
      recipientName: data.recipientName || null,
      comment: data.comment || null,
      totalPieces: countPieces(data.items),
      itemCount: Array.isArray(data.items) ? data.items.length : 0,
      source: 'legacy-notification-migration',
      migratedFromNotificationId: notification.id,
      migratedAt: Timestamp.now(),
      date: notification.date || Timestamp.now(),
      createdAt: notification.date || Timestamp.now(),
    });
    created += 1;
  } catch (error) {
    failed += 1;
    console.error(`Failed to migrate ${notification.id}:`, error.message || error);
  }
}

console.log(JSON.stringify({
  scannedNotifications: snapshot.size,
  directDistributionCandidates: candidates.length,
  created,
  skipped,
  failed,
}, null, 2));
