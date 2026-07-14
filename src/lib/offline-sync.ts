'use client';

import type { Firestore } from 'firebase/firestore';
import { waitForPendingWrites } from 'firebase/firestore';

const STORAGE_KEY = 'lista-pending-operations-v1';
const CHANGE_EVENT = 'lista-pending-operations-change';

export type PendingOperationType =
  | 'order'
  | 'delivery'
  | 'distribution'
  | 'stock';

export interface PendingOperation {
  id: string;
  type: PendingOperationType;
  label: string;
  createdAt: string;
}

function readOperations(): PendingOperation[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeOperations(operations: PendingOperation[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function getPendingOperations(): PendingOperation[] {
  return readOperations();
}

export function subscribeToPendingOperations(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

export function queueFirestoreWrite(options: {
  id: string;
  type: PendingOperationType;
  label: string;
  write: () => Promise<void>;
  onError?: (error: unknown) => void;
}): void {
  const existing = readOperations();
  if (!existing.some(operation => operation.id === options.id)) {
    writeOperations([
      ...existing,
      {
        id: options.id,
        type: options.type,
        label: options.label,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  options.write().then(() => {
    writeOperations(readOperations().filter(operation => operation.id !== options.id));
  }).catch(error => {
    options.onError?.(error);
  });
}

export async function reconcilePendingWrites(firestore: Firestore): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  await waitForPendingWrites(firestore);
  writeOperations([]);
}
