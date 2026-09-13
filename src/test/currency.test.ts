import { describe, expect, it } from 'vitest';
import { formatCurrencyAmount, isFiniteRate, normalizeCurrency } from '../lib/currency';

describe('currency display safety', () => {
  it('formats TWD amounts with a visible currency code', () => {
    expect(formatCurrencyAmount(1234.5, 'TWD')).toBe('TWD 1,234.50');
  });

  it('falls back to a supported currency for invalid stored preferences', () => {
    expect(normalizeCurrency('twd', 'HKD')).toBe('TWD');
    expect(normalizeCurrency('not-a-currency', 'HKD')).toBe('HKD');
  });

  it('does not render invalid numeric values as NaN', () => {
    expect(formatCurrencyAmount(Number.NaN, 'TWD')).toBe('—');
    expect(formatCurrencyAmount(undefined, 'TWD')).toBe('—');
  });

  it('accepts only finite positive exchange rates', () => {
    expect(isFiniteRate(1.25)).toBe(true);
    expect(isFiniteRate(0)).toBe(false);
    expect(isFiniteRate(Number.NaN)).toBe(false);
    expect(isFiniteRate('1.25')).toBe(false);
  });
});
