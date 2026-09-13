/*
 * Design system: "Tabitime-inspired Trip Portal" — calculation helpers stay
 * deterministic and invisible to the editorial presentation layer.
 */

function parseLocalDate(value: string): Date {
  const dateOnly = String(value || '').slice(0, 10);
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function inclusiveDateRange(start: string, end: string): string[] {
  const startValue = String(start || '').slice(0, 10);
  const endValue = String(end || '').slice(0, 10);
  if (!startValue) return [];
  const startDate = parseLocalDate(startValue);
  const endDate = parseLocalDate(endValue || startValue);
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate < startDate) return [];

  const result: string[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    result.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export function allocateInclusiveAmount(total: number, dates: string[]): number[] {
  if (!dates.length) return [];
  const totalCents = Math.round((Number(total) || 0) * 100);
  const baseCents = Math.floor(totalCents / dates.length);
  const remainderCents = totalCents - baseCents * dates.length;
  return dates.map((_, index) => (baseCents + (index === dates.length - 1 ? remainderCents : 0)) / 100);
}
