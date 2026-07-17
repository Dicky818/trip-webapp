/**
 * Offline Sync Queue
 * Stores pending expense operations in IndexedDB when offline.
 * Syncs to Supabase when connection is restored.
 */
import { get, set, del, keys } from 'idb-keyval';
import { Expense } from '../api/supabaseApi';

export interface PendingExpense {
  id: string; // local temp ID
  tripId: string;
  expense: Partial<Expense>;
  action: 'create' | 'update' | 'delete';
  createdAt: string;
}

const QUEUE_PREFIX = 'offline_expense_';

export async function addToQueue(item: PendingExpense): Promise<void> {
  await set(QUEUE_PREFIX + item.id, item);
}

export async function getQueue(): Promise<PendingExpense[]> {
  const allKeys = await keys();
  const queueKeys = allKeys.filter(k => String(k).startsWith(QUEUE_PREFIX));
  const items: PendingExpense[] = [];
  for (const key of queueKeys) {
    const item = await get(key);
    if (item) items.push(item as PendingExpense);
  }
  // Sort by creation time
  items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return items;
}

export async function removeFromQueue(id: string): Promise<void> {
  await del(QUEUE_PREFIX + id);
}

export async function getQueueCount(): Promise<number> {
  const allKeys = await keys();
  return allKeys.filter(k => String(k).startsWith(QUEUE_PREFIX)).length;
}

export function isOnline(): boolean {
  return navigator.onLine;
}

// Listen for online event and trigger sync
export function registerSyncListener(syncFn: () => Promise<void>): () => void {
  const handler = () => {
    syncFn();
  };
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}
