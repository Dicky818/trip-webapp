import { describe, expect, it } from 'vitest';
import { deriveDayFeasibility } from '../lib/dayFeasibility';
import type { ItineraryItem } from '../api/supabaseApi';

function item(id: string, time = '', order = 1): ItineraryItem {
  return { Itinerary_ID: id, Trip_ID: 'trip-1', Day_Number: 1, Date: '2026-08-15', Time: time, Activity_Name: id, Activity: '', Note: '', Sort_Order: order, Created_At: '', Updated_At: '' } as ItineraryItem;
}

describe('deriveDayFeasibility', () => {
  it('marks an empty day as unplanned', () => expect(deriveDayFeasibility('2026-08-15', 1, []).level).toBe('empty'));
  it('marks two or more missing times as needs-time', () => {
    const result = deriveDayFeasibility('2026-08-15', 1, [item('a'), item('b'), item('c', '12:00', 3)]);
    expect(result.level).toBe('needs-time');
    expect(result.missingTimeCount).toBe(2);
  });
  it('marks a sub-15-minute gap as review and names both items', () => {
    const result = deriveDayFeasibility('2026-08-15', 1, [item('breakfast', '10:30'), item('castle', '10:40', 2)]);
    expect(result.level).toBe('review');
    expect(result.reasons[0].itemIds).toEqual(['breakfast', 'castle']);
  });
  it('marks a 15–29-minute gap as tight', () => expect(deriveDayFeasibility('2026-08-15', 1, [item('a', '10:00'), item('b', '10:20', 2)]).level).toBe('tight'));
  it('marks seven activities as tight even with generous time gaps', () => {
    const items = Array.from({ length: 7 }, (_, index) => item(String(index), `${String(8 + index).padStart(2, '0')}:00`, index + 1));
    expect(deriveDayFeasibility('2026-08-15', 1, items).level).toBe('tight');
  });
  it('marks a long six-activity day as review', () => {
    const items = Array.from({ length: 6 }, (_, index) => item(String(index), index === 5 ? '21:00' : `${String(8 + index).padStart(2, '0')}:00`, index + 1));
    expect(deriveDayFeasibility('2026-08-15', 1, items).level).toBe('review');
  });
  it('uses sort order as a deterministic tie breaker for equal times', () => {
    const result = deriveDayFeasibility('2026-08-15', 1, [item('later', '10:00', 2), item('first', '10:00', 1)]);
    expect(result.level).toBe('review');
    expect(result.reasons[0].itemIds).toEqual(['first', 'later']);
  });
});
