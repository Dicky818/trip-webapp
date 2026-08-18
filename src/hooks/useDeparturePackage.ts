/*
 * Design system: "Departure Package" — keep local readiness visible and
 * recoverable. This hook only reads existing data and writes a per-user
 * IndexedDB snapshot; it never changes Supabase trip data.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { del, get, set } from 'idb-keyval';
import { api, Trip } from '../api/supabaseApi';
import { buildMinimalSnapshot, departurePackageStorageKey, markSnapshotPdfReady, readinessFromSnapshot, type DeparturePackageSnapshot } from '../lib/departurePackage';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from './useOfflineSync';

export async function loadDeparturePackage(tripId: string, userId: string): Promise<DeparturePackageSnapshot | null> {
  return (await get<DeparturePackageSnapshot>(departurePackageStorageKey(tripId, userId))) || null;
}

export async function saveDeparturePackage(snapshot: DeparturePackageSnapshot): Promise<void> {
  await set(departurePackageStorageKey(snapshot.tripId, snapshot.userId), snapshot);
}

export function useDeparturePackage(trip: Trip) {
  const { user } = useAuth();
  const { pendingCount, online } = useOfflineSync();
  const [snapshot, setSnapshot] = useState<DeparturePackageSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);

  const storageKey = user?.id ? departurePackageStorageKey(trip.Trip_ID, user.id) : null;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    if (!user?.id) {
      setSnapshot(null);
      setIsLoading(false);
      return () => { cancelled = true; };
    }
    void loadDeparturePackage(trip.Trip_ID, user.id)
      .then(value => { if (!cancelled) setSnapshot(value); })
      .catch(() => { if (!cancelled) setSnapshot(null); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [trip.Trip_ID, user?.id]);

  const prepare = useCallback(async (): Promise<DeparturePackageSnapshot> => {
    if (!user?.id) throw new Error('請先登入後再準備出發前包');
    if (!online) throw new Error('目前離線；可使用此裝置已準備的出發前包');
    setIsPreparing(true);
    try {
      const [itineraryResult, flightsResult, accommodationsResult, bookingsResult] = await Promise.all([
        api.getItinerary(trip.Trip_ID),
        api.getFlights(trip.Trip_ID),
        api.getAccommodations(trip.Trip_ID),
        api.getBookings(trip.Trip_ID),
      ]);
      if (!itineraryResult.success || !flightsResult.success || !accommodationsResult.success || !bookingsResult.success) {
        throw new Error('未能完整讀取旅程資料，請稍後再試');
      }
      const nextSnapshot = buildMinimalSnapshot({
        trip,
        itinerary: itineraryResult.data,
        flights: flightsResult.data,
        accommodations: accommodationsResult.data,
        bookings: bookingsResult.data,
        pendingCount,
        hasPdf: Boolean(snapshot?.contentSections.pdf.generatedAt),
        pdfGeneratedAt: snapshot?.contentSections.pdf.generatedAt,
        userId: user.id,
      });
      await saveDeparturePackage(nextSnapshot);
      setSnapshot(nextSnapshot);
      return nextSnapshot;
    } finally {
      setIsPreparing(false);
    }
  }, [online, pendingCount, snapshot?.contentSections.pdf.generatedAt, trip, user?.id]);

  const clearPackage = useCallback(async () => {
    if (!storageKey) return;
    await del(storageKey);
    setSnapshot(null);
  }, [storageKey]);

  const markPdfGenerated = useCallback(async () => {
    if (!snapshot) return null;
    const nextSnapshot = markSnapshotPdfReady(snapshot);
    await saveDeparturePackage(nextSnapshot);
    setSnapshot(nextSnapshot);
    return nextSnapshot;
  }, [snapshot]);

  const readiness = useMemo(() => snapshot ? readinessFromSnapshot(snapshot, trip.Updated_At) : null, [snapshot, trip.Updated_At]);

  return { snapshot, readiness, isLoading, isPreparing, prepare, clearPackage, markPdfGenerated, online };
}
