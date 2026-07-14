import {
  CollectionReference,
  DocumentReference,
  addDoc,
  updateDoc,
  deleteDoc,
  type DocumentData,
} from 'firebase/firestore';

export function addDocumentNonBlocking<T extends DocumentData>(
  collectionRef: CollectionReference<T>,
  data: T
): void {
  addDoc(collectionRef, data).catch(() => {});
}

export function updateDocumentNonBlocking(
  docRef: DocumentReference,
  data: Record<string, unknown>
): void {
  updateDoc(docRef, data).catch(() => {});
}

export function deleteDocumentNonBlocking(docRef: DocumentReference): void {
  deleteDoc(docRef).catch(() => {});
}
