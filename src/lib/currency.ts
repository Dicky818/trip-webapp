/*
 * Design system: "旅途作戰桌" — currency labels stay quiet and editorial;
 * numeric failures must degrade to a readable placeholder instead of breaking
 * the entire trip workspace.
 */

export const SUPPORTED_CURRENCIES = ['HKD', 'TWD', 'JPY', 'KRW', 'USD', 'EUR', 'GBP', 'CNY', 'SGD', 'THB', 'MYR'] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export function normalizeCurrency(value: unknown, fallback: string): string {
  const candidate = String(value || '').trim().toUpperCase();
  return SUPPORTED_CURRENCIES.includes(candidate as SupportedCurrency) ? candidate : fallback;
}

export function isFiniteRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function formatCurrencyAmount(value: unknown, currency: string, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }): string {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) return '—';
  const minimumFractionDigits = options?.minimumFractionDigits ?? 2;
  const maximumFractionDigits = options?.maximumFractionDigits ?? 2;
  const safeCurrency = normalizeCurrency(currency, 'HKD');
  return `${safeCurrency} ${amount.toLocaleString('zh-TW', { minimumFractionDigits, maximumFractionDigits })}`;
}

/**
 * Resolve one expense into a requested display currency.
 * A stored amount in the requested currency wins; otherwise the stored base
 * amount is used for base display, and only then is the original amount
 * multiplied by a rate for the expense date. Missing rates never become 1.
 */
export function resolveDisplayAmount(input: {
  originalAmount: unknown;
  originalCurrency: unknown;
  baseAmount: unknown;
  baseCurrency: unknown;
  displayCurrency: unknown;
  rate?: unknown;
}): number | null {
  const originalAmount = Number(input.originalAmount);
  const baseAmount = Number(input.baseAmount);
  const originalCurrency = normalizeCurrency(input.originalCurrency, normalizeCurrency(input.baseCurrency, 'HKD'));
  const baseCurrency = normalizeCurrency(input.baseCurrency, 'HKD');
  const displayCurrency = normalizeCurrency(input.displayCurrency, baseCurrency);

  if (displayCurrency === originalCurrency && Number.isFinite(originalAmount)) return originalAmount;
  if (displayCurrency === baseCurrency && Number.isFinite(baseAmount)) return baseAmount;
  const rate = Number(input.rate);
  if (!Number.isFinite(originalAmount) || !isFiniteRate(rate)) return null;
  return originalAmount * rate;
}
