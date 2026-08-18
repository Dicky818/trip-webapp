/*
 * Trip Health derives one calm next step and a bounded set of actionable
 * signals from existing trip data; it never writes or mutates trip records.
 */
import type { Expense, ItineraryItem, Trip } from '../api/supabaseApi';
import { deriveDayFeasibility } from './dayFeasibility';

export type TripHealthTarget = 'info' | 'itinerary' | 'expenses';
export type TripHealthSeverity = 'neutral' | 'attention' | 'critical' | 'sync';

export interface TripHealthSignal {
  id: string;
  label: string;
  detail?: string;
  target?: TripHealthTarget;
  severity: TripHealthSeverity;
  allowSync?: boolean;
  openLens?: boolean;
  focusItemIds?: string[];
}

export interface TripHealthState {
  phase: 'upcoming' | 'live' | 'completed';
  dayLabel: string;
  headline: string;
  detail: string;
  primaryLabel: string;
  primaryTarget: TripHealthTarget;
  focusToday: boolean;
  signals: TripHealthSignal[];
}

export interface TripHealthSyncState {
  online: boolean;
  pendingCount: number;
  isSyncing: boolean;
}

function dayKey(value: string): string {
  return value ? value.slice(0, 10) : '';
}

function localDayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localDate(value: string): Date {
  const [year, month, day] = dayKey(value).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function diffDays(from: string, to: string): number {
  return Math.round((localDate(to).getTime() - localDate(from).getTime()) / 86400000);
}

function itemName(item: ItineraryItem): string {
  return item.Activity_Name || item.Activity || item.Location || '未命名站點';
}

function minutes(value: string): number | null {
  if (!value || !value.includes(':')) return null;
  const [hour, minute] = value.slice(-5).split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function relativeTime(targetMinutes: number, now: Date): string {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const distance = targetMinutes - nowMinutes;
  if (distance <= 0) return '即將開始';
  if (distance < 60) return `${distance} 分鐘後`;
  const hours = Math.floor(distance / 60);
  const remainder = distance % 60;
  return remainder ? `${hours} 小時 ${remainder} 分鐘後` : `${hours} 小時後`;
}

function formattedTime(value: string): string {
  const parsed = minutes(value);
  if (parsed === null) return '';
  return `${String(Math.floor(parsed / 60)).padStart(2, '0')}:${String(parsed % 60).padStart(2, '0')}`;
}

function isFlight(expense: Expense): boolean {
  const category = `${expense.Main_Category || ''} ${expense.Sub_Category || ''}`.toLowerCase();
  return ['機票', '航班', '飛機', 'flight'].some(keyword => category.includes(keyword));
}

function isAccommodation(expense: Expense): boolean {
  const category = `${expense.Main_Category || ''} ${expense.Sub_Category || ''}`.toLowerCase();
  return ['住宿', '酒店', '旅館', '民宿', '飯店', 'hotel', 'accommodation', 'airbnb'].some(keyword => category.includes(keyword));
}

export function deriveTripHealth(
  trip: Trip,
  itinerary: ItineraryItem[],
  expenses: Expense[],
  sync: TripHealthSyncState,
  now = new Date(),
): TripHealthState {
  const today = localDayKey(now);
  const start = dayKey(trip.Start_Date);
  const end = dayKey(trip.End_Date);
  const daysUntilStart = diffDays(today, start);
  const tripDuration = diffDays(start, end) + 1;
  const isLive = daysUntilStart <= 0 && diffDays(today, end) >= 0;
  const phase: TripHealthState['phase'] = isLive ? 'live' : daysUntilStart > 0 ? 'upcoming' : 'completed';
  const todayDay = isLive ? Math.abs(daysUntilStart) + 1 : undefined;
  const dayLabel = isLive ? `第 ${todayDay}/${tripDuration} 天` : daysUntilStart > 0 ? `${daysUntilStart} 天後出發` : '旅程已完成';
  const todayItems = itinerary
    .filter(item => dayKey(item.Date) === today)
    .sort((a, b) => (minutes(a.Time) ?? Number.MAX_SAFE_INTEGER) - (minutes(b.Time) ?? Number.MAX_SAFE_INTEGER) || Number(a.Sort_Order) - Number(b.Sort_Order));
  const timedToday = todayItems
    .map(item => {
      const time = minutes(item.Time);
      return time === null ? null : { item, time };
    })
    .filter((entry): entry is { item: ItineraryItem; time: number } => entry !== null);
  const signals: TripHealthSignal[] = [];

  if (!sync.online) {
    signals.push({
      id: 'offline',
      label: sync.pendingCount > 0 ? `離線已保存 ${sync.pendingCount} 筆支出` : '目前離線，支出仍可安全保存',
      detail: '恢復連線後會自動同步',
      target: 'expenses',
      severity: 'sync',
    });
  } else if (sync.pendingCount > 0) {
    signals.push({
      id: 'sync',
      label: sync.isSyncing ? `正在同步 ${sync.pendingCount} 筆支出` : `等待同步 ${sync.pendingCount} 筆支出`,
      detail: sync.isSyncing ? '正在安全上傳離線記錄' : '可立即同步或等待自動同步',
      target: 'expenses',
      severity: 'sync',
      allowSync: !sync.isSyncing,
    });
  }

  const cancelledFlight = expenses.find(expense => isFlight(expense) && expense.Flight_Status?.toLowerCase() === 'cancelled');
  if (cancelledFlight) {
    signals.push({ id: 'flight-cancelled', label: '航班已取消', detail: cancelledFlight.Flight_No || '請查看航班資料', target: 'info', severity: 'critical' });
  } else if (expenses.some(expense => isFlight(expense) && expense.Flight_Status?.toLowerCase() === 'pending')) {
    signals.push({ id: 'flight-pending', label: '航班待確認', detail: '請查看航班資料', target: 'info', severity: 'attention' });
  }

  const todayStay = expenses.find(expense => isAccommodation(expense) && (dayKey(expense.Check_In_Date || '') === today || dayKey(expense.Check_Out_Date || '') === today));
  if (todayStay) {
    const isCheckIn = dayKey(todayStay.Check_In_Date || '') === today;
    signals.push({
      id: isCheckIn ? 'check-in' : 'check-out',
      label: isCheckIn ? `今天入住${todayStay.Accommodation_Name ? `：${todayStay.Accommodation_Name}` : ''}` : `今天退房${todayStay.Accommodation_Name ? `：${todayStay.Accommodation_Name}` : ''}`,
      detail: isCheckIn ? '請確認入住時間與地址' : '請確認退房時間與行李安排',
      target: 'info',
      severity: 'attention',
    });
  } else if (phase === 'upcoming' && daysUntilStart <= 7 && !expenses.some(isAccommodation)) {
    signals.push({ id: 'stay-missing', label: '尚未加入住宿資料', detail: '出發前可先記錄入住與退房資料', target: 'info', severity: 'attention' });
  }

  const todayLoad = phase === 'live' && todayDay ? deriveDayFeasibility(today, todayDay, todayItems) : null;
  if (todayLoad && (todayLoad.level === 'tight' || todayLoad.level === 'review')) {
    signals.push({ id: 'tight-day', label: '今天安排較緊', detail: todayLoad.summary, target: 'itinerary', severity: 'attention', openLens: true, focusItemIds: todayLoad.reasons.flatMap(reason => reason.itemIds || []) });
  }

  let headline = '旅程正在準備中';
  let detail = '先規劃下一天，其他資料可在需要時逐步補齊。';
  let primaryLabel = '規劃下一天';
  let primaryTarget: TripHealthTarget = 'itinerary';
  let focusToday = false;

  if (phase === 'live') {
    const upcoming = timedToday.find(entry => entry.time >= now.getHours() * 60 + now.getMinutes());
    if (upcoming) {
      headline = `下一站：${itemName(upcoming.item)}`;
      detail = `${formattedTime(upcoming.item.Time)} 開始 · ${relativeTime(upcoming.time, now)}${upcoming.item.Location ? ` · ${upcoming.item.Location}` : ''}`;
    } else if (todayItems.length > 0) {
      headline = `今天共有 ${todayItems.length} 項行程`;
      detail = '查看今天路線，確認下一個想處理的站點。';
    } else {
      headline = '今天尚未安排下一站';
      detail = '可從地圖、候選地點或手動新增開始。';
    }
    primaryLabel = todayItems.length > 0 ? '打開今天路線' : '規劃今天路線';
    primaryTarget = 'itinerary';
    focusToday = true;
  } else if (phase === 'upcoming' && daysUntilStart <= 7) {
    headline = `距出發 ${daysUntilStart} 天`;
    detail = signals.length ? '先確認出發前需要處理的資料。' : '行程資料已可開始進行最後確認。';
    primaryLabel = '查看出發前資料';
    primaryTarget = 'info';
  } else if (phase === 'completed') {
    headline = '這趟旅程已完成';
    detail = signals.some(signal => signal.id === 'sync') ? '仍有離線支出等待同步。' : '可回顧行程、預訂與支出摘要。';
    primaryLabel = '查看旅程摘要';
    primaryTarget = 'info';
  }

  return { phase, dayLabel, headline, detail, primaryLabel, primaryTarget, focusToday, signals: signals.slice(0, 3) };
}
