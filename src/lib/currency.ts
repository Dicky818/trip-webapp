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
