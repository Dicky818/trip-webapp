/*
 * P1.1 Day Feasibility Lens: pure, explainable schedule analysis only.
 * It never writes trip data or claims live transport estimates.
 */
import type { ItineraryItem } from '../api/supabaseApi';

export type DayLoadLevel = 'empty' | 'needs-time' | 'relaxed' | 'balanced' | 'tight' | 'review';

export interface DayFeasibilityReason {
  id: 'activity-count' | 'short-gap' | 'long-window' | 'missing-time';
  label: string;
  detail: string;
  itemIds?: string[];
}

export interface DayFeasibility {
  date: string;
  dayNumber: number;
  level: DayLoadLevel;
  label: string;
  summary: string;
  activityCount: number;
  timedCount: number;
  missingTimeCount: number;
  firstTime?: string;
  lastTime?: string;
  reasons: DayFeasibilityReason[];
}

function toMinutes(value: string | undefined): number | null {
  if (!value || !value.includes(':')) return null;
  const [hour, minute] = value.slice(-5).split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function displayTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function deriveDayFeasibility(date: string, dayNumber: number, items: ItineraryItem[]): DayFeasibility {
  const ordered = [...items].sort((a, b) => (Number(a.Sort_Order) || 0) - (Number(b.Sort_Order) || 0));
  const timed = ordered
    .map(item => ({ item, minutes: toMinutes(item.Time) }))
    .filter((entry): entry is { item: ItineraryItem; minutes: number } => entry.minutes !== null)
    .sort((a, b) => a.minutes - b.minutes || (Number(a.item.Sort_Order) || 0) - (Number(b.item.Sort_Order) || 0));
  const missingTime = ordered.filter(item => toMinutes(item.Time) === null);
  const activityCount = ordered.length;
  const reasons: DayFeasibilityReason[] = [];
  const first = timed[0]?.minutes;
  const last = timed[timed.length - 1]?.minutes;

  let shortestGap: { gap: number; first: typeof timed[number]; second: typeof timed[number] } | undefined;
  for (let index = 1; index < timed.length; index += 1) {
    const gap = timed[index].minutes - timed[index - 1].minutes;
    if (!shortestGap || gap < shortestGap.gap) shortestGap = { gap, first: timed[index - 1], second: timed[index] };
  }

  if (shortestGap && shortestGap.gap < 30) {
    reasons.push({
      id: 'short-gap',
      label: shortestGap.gap < 15 ? '相隔少於 15 分鐘' : '相隔不足 30 分鐘',
      detail: `${displayTime(shortestGap.first.minutes)} 與 ${displayTime(shortestGap.second.minutes)} 只相隔 ${shortestGap.gap} 分鐘`,
      itemIds: [shortestGap.first.item.Itinerary_ID, shortestGap.second.item.Itinerary_ID],
    });
  }
  if (missingTime.length > 0) {
    reasons.push({
      id: 'missing-time',
      label: `${missingTime.length} 項活動尚未設定時間`,
      detail: timed.length === 0 ? '暫時無法判斷這一天的節奏' : '設定時間後才可比較日程間隔',
      itemIds: missingTime.map(item => item.Itinerary_ID),
    });
  }
  if (activityCount >= 5) {
    reasons.push({
      id: 'activity-count',
      label: `今天共 ${activityCount} 項活動`,
      detail: activityCount >= 7 ? '可先檢查交通與下一站時間' : '行程完整；出發前可確認交通',
    });
  }
  if (first !== undefined && last !== undefined && activityCount >= 6 && last - first > 12 * 60) {
    reasons.push({
      id: 'long-window',
      label: '日程跨度超過 12 小時',
      detail: `第一站 ${displayTime(first)}；最後一站 ${displayTime(last)}`,
    });
  }

  let level: DayLoadLevel = 'relaxed';
  if (activityCount === 0) level = 'empty';
  else if ((shortestGap && shortestGap.gap < 15) || (first !== undefined && last !== undefined && activityCount >= 6 && last - first > 12 * 60)) level = 'review';
  else if (activityCount >= 7 || (shortestGap && shortestGap.gap < 30)) level = 'tight';
  else if (missingTime.length >= 2 || timed.length === 0) level = 'needs-time';
  else if (activityCount >= 5 || (shortestGap && shortestGap.gap < 45)) level = 'balanced';

  const copy: Record<DayLoadLevel, { label: string; summary: string }> = {
    empty: { label: '尚未安排', summary: '可先加入第一個站點。' },
    'needs-time': { label: '時間待補', summary: `${missingTime.length} 項活動尚未設定時間，暫時無法完整判斷節奏。` },
    relaxed: { label: '節奏寬鬆', summary: '可保留彈性移動與休息時間。' },
    balanced: { label: '節奏可行', summary: '行程完整；建議出發前確認交通。' },
    tight: { label: '安排偏緊', summary: reasons.find(reason => reason.id === 'short-gap')?.detail || `今天共 ${activityCount} 項活動；可先檢查交通。` },
    review: { label: '需要檢查', summary: reasons.find(reason => reason.id === 'short-gap')?.detail || '日程跨度較長，建議先確認重要時段。' },
  };

  return {
    date,
    dayNumber,
    level,
    label: copy[level].label,
    summary: copy[level].summary,
    activityCount,
    timedCount: timed.length,
    missingTimeCount: missingTime.length,
    firstTime: first === undefined ? undefined : displayTime(first),
    lastTime: last === undefined ? undefined : displayTime(last),
    reasons: reasons.slice(0, 2),
  };
}
