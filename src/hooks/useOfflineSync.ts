import { useState, useEffect, useCallback, useRef } from 'react';
import { addToQueue, getQueue, removeFromQueue, getQueueCount, isOnline, registerSyncListener, PendingExpense } from '../lib/offlineSync';
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

  // Load pending count on mount
  useEffect(() => {
    getQueueCount().then(setPendingCount);
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    const cleanup = registerSyncListener(async () => {
      if (syncingRef.current) return;
      await syncNow();
    });
    return cleanup;
  }, []);

  const addOfflineExpense = useCallback(async (tripId: string, expense: Partial<Expense>) => {
    const item: PendingExpense = {
      id: crypto.randomUUID(),
      tripId,
      expense,
      action: 'create',
      createdAt: new Date().toISOString(),
    };
    await addToQueue(item);
    setPendingCount(prev => prev + 1);
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
          if (item.action === 'create') {
            await api.createExpense({ ...item.expense, Trip_ID: item.tripId });
          } else if (item.action === 'update' && item.expense.Expense_ID) {
            await api.updateExpense(item.expense.Expense_ID, item.expense);
          } else if (item.action === 'delete' && item.expense.Expense_ID) {
            await api.deleteExpense(item.expense.Expense_ID);
          }
          await removeFromQueue(item.id);
          synced++;
        } catch {
          failed++;
        }
      }
      setPendingCount(await getQueueCount());
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }

    return { synced, failed };
  }, []);

  return { online, pendingCount, addOfflineExpense, syncNow, isSyncing };
}
