/*
 * Design system: "旅途作戰桌" — connectivity is a visible trip state, not a
 * background technical detail. Keep queued work recoverable and understandable.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { addToQueue, getQueue, removeFromQueue, getQueueCount, isOnline, registerSyncListener, PendingExpense, OFFLINE_QUEUE_UPDATED_EVENT } from '../lib/offlineSync';
import { api, Expense } from '../api/supabaseApi';

interface UseOfflineSyncReturn {
  online: boolean;
  pendingCount: number;
  addOfflineExpense: (tripId: string, expense: Partial<Expense>) => Promise<void>;
  syncNow: () => Promise<{ synced: number; failed: number }>;
  isSyncing: boolean;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    setPendingCount(await getQueueCount());
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current || !isOnline()) return { synced: 0, failed: 0 };
    syncingRef.current = true;
    setIsSyncing(true);

    let synced = 0;
    let failed = 0;

    try {
      const queue = await getQueue();
      for (const item of queue) {
        try {
          let result;
          if (item.action === 'create') {
            result = await api.createExpense({ ...item.expense, Trip_ID: item.tripId });
          } else if (item.action === 'update' && item.expense.Expense_ID) {
            result = await api.updateExpense(item.expense.Expense_ID, item.expense);
          } else if (item.action === 'delete' && item.expense.Expense_ID) {
            result = await api.deleteExpense(item.expense.Expense_ID);
          }
          if (!result?.success) throw new Error(result?.error || '同步失敗');
          await removeFromQueue(item.id);
          synced++;
        } catch {
          failed++;
        }
      }
      await refreshPendingCount();
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }

    return { synced, failed };
  }, [refreshPendingCount]);

  // Update online status
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load and keep the queue count fresh whenever a local save changes it.
  useEffect(() => {
    void refreshPendingCount();
    window.addEventListener(OFFLINE_QUEUE_UPDATED_EVENT, refreshPendingCount);
    return () => window.removeEventListener(OFFLINE_QUEUE_UPDATED_EVENT, refreshPendingCount);
  }, [refreshPendingCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    const cleanup = registerSyncListener(async () => {
      if (syncingRef.current) return;
      await syncNow();
    });
    return cleanup;
  }, [syncNow]);

  const addOfflineExpense = useCallback(async (tripId: string, expense: Partial<Expense>) => {
    const item: PendingExpense = {
      id: crypto.randomUUID(),
      tripId,
      expense,
      action: 'create',
      createdAt: new Date().toISOString(),
    };
    await addToQueue(item);
    await refreshPendingCount();
  }, [refreshPendingCount]);

  return { online, pendingCount, addOfflineExpense, syncNow, isSyncing };
}
