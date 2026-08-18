import { describe, expect, it } from 'vitest';
import type { ItineraryItem, Trip } from '../api/supabaseApi';
import { deriveTripHealth } from '../lib/tripHealth';

describe('deriveTripHealth', () => {
  it('derives the next timed stop for a live trip without an undefined timing list', () => {
    const trip = {
      Trip_ID: 'trip-live',
      Start_Date: '2026-08-18',
      End_Date: '2026-08-20',
      Trip_Name: '測試旅程',
    } as Trip;
    const itinerary = [
      {
        Itinerary_ID: 'item-next',
        Date: '2026-08-18',
        Time: '09:30',
        Activity_Name: '前往機場',
        Sort_Order: 1,
      },
    ] as ItineraryItem[];

    const health = deriveTripHealth(
      trip,
      itinerary,
      [],
      { online: true, pendingCount: 0, isSyncing: false },
      new Date('2026-08-18T09:00:00'),
    );

    expect(health.phase).toBe('live');
    expect(health.headline).toBe('下一站：前往機場');
  });
});
