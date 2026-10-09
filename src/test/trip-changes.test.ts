import { describe, expect, it } from 'vitest';
import { resolveDisplayAmount } from '../lib/currency';
import { calculateFlightDuration } from '../api/supabaseApi';
import { inclusiveDateRange, allocateInclusiveAmount } from '../lib/expenseAllocation';

describe('trip changes', () => {
  it('uses an original amount when it already matches the requested currency', () => {
    expect(resolveDisplayAmount({
      originalAmount: 2200,
      originalCurrency: 'TWD',
      baseAmount: 500,
      baseCurrency: 'HKD',
      displayCurrency: 'TWD',
    })).toBe(2200);
  });

  it('uses a supplied historical rate for a missing target currency amount', () => {
    expect(resolveDisplayAmount({
      originalAmount: 100,
      originalCurrency: 'JPY',
      baseAmount: 5,
      baseCurrency: 'HKD',
      displayCurrency: 'TWD',
      rate: 0.22,
    })).toBeCloseTo(22);
  });

  it('returns null instead of mislabeling a base amount when the rate is missing', () => {
    expect(resolveDisplayAmount({
      originalAmount: 100,
      originalCurrency: 'JPY',
      baseAmount: 5,
      baseCurrency: 'HKD',
      displayCurrency: 'TWD',
    })).toBeNull();
  });

  it('subtracts the time-zone difference and handles a cross-midnight segment', () => {
    expect(calculateFlightDuration('2027-01-13', '09:10', '2027-01-13', '15:00', 8, 9)).toBe('4h50m');
    expect(calculateFlightDuration('2027-01-13', '23:30', '2027-01-14', '02:00', 8, 9)).toBe('1h30m');
  });

  it('includes both rental-car or insurance boundary dates', () => {
    expect(inclusiveDateRange('2027-01-13', '2027-01-15')).toEqual(['2027-01-13', '2027-01-14', '2027-01-15']);
    expect(inclusiveDateRange('2027-01-13', '2027-01-13')).toEqual(['2027-01-13']);
  });

  it('allocates a trip-period item over the complete inclusive trip period', () => {
    const tripDates = inclusiveDateRange('2027-01-13', '2027-01-20');
    expect(tripDates).toHaveLength(8);
    expect(tripDates[0]).toBe('2027-01-13');
    expect(tripDates.at(-1)).toBe('2027-01-20');
    expect(allocateInclusiveAmount(800, tripDates)).toEqual([100, 100, 100, 100, 100, 100, 100, 100]);
  });

  it('puts rounding cents on the final allocated day', () => {
    expect(allocateInclusiveAmount(100, ['2027-01-13', '2027-01-14', '2027-01-15'])).toEqual([33.33, 33.33, 33.34]);
  });
});
