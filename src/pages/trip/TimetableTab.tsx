import React, { useMemo, useRef, useEffect, useState } from 'react';
import { ItineraryItem, Trip } from '../../api/supabaseApi';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface Props {
  trip: Trip;
  items: ItineraryItem[];
  tripDays: Array<{ day: number; date: string }>;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
function getDayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `週${WEEKDAYS[d.getDay()]}`;
}

function parseTime(t: string): number {
  if (!t) return -1;
  let s = t;
  if (s.includes('T')) s = s.split('T')[1] || '';
  const parts = s.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  if (isNaN(h)) return -1;
  return h * 60 + m;
}

function formatTime(t: string): string {
  if (!t) return '';
  let s = t;
  if (s.includes('T')) s = s.split('T')[1] || '';
  const parts = s.split(':');
  const h = String(parseInt(parts[0] || '0', 10)).padStart(2, '0');
  const m = String(parseInt(parts[1] || '0', 10)).padStart(2, '0');
  return `${h}:${m}`;
}

// Day colors matching MapTab
const DAY_COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea',
  '#0891b2', '#db2777', '#65a30d', '#ea580c', '#7c3aed',
  '#0284c7', '#be185d', '#15803d', '#b45309', '#6d28d9',
  '#0e7490',
];
function getDayColor(day: number): string {
  const idx = ((day - 1) % DAY_COLORS.length + DAY_COLORS.length) % DAY_COLORS.length;
  return DAY_COLORS[idx];
}

// Hours to display: 00 to 23
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 64; // px per hour
const TOTAL_HEIGHT = HOUR_HEIGHT * 24;

// Number of days to show at once on desktop
const DESKTOP_VISIBLE_DAYS = 5;
const MOBILE_VISIBLE_DAYS = 3;

export default function TimetableTab({ trip, items, tripDays }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [startDayIdx, setStartDayIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const visibleDays = isMobile ? MOBILE_VISIBLE_DAYS : DESKTOP_VISIBLE_DAYS;
  const totalDays = tripDays.length;

  // Scroll to 7am on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = HOUR_HEIGHT * 7 - 20;
    }
  }, []);

  // Group items by day
  const itemsByDay = useMemo(() => {
    const map: Record<number, ItineraryItem[]> = {};
    for (const item of items) {
      const d = Number(item.Day_Number);
      if (!map[d]) map[d] = [];
      map[d].push(item);
    }
    // Sort each day's items by time
    for (const d of Object.keys(map)) {
      map[Number(d)].sort((a, b) => parseTime(a.Time) - parseTime(b.Time));
    }
    return map;
  }, [items]);

  const visibleTripDays = tripDays.slice(startDayIdx, startDayIdx + visibleDays);

  const canPrev = startDayIdx > 0;
  const canNext = startDayIdx + visibleDays < totalDays;

  // Current time indicator
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTop = (currentMinutes / 60) * HOUR_HEIGHT;

  // Check if any visible day is today
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayDayIdx = tripDays.findIndex(d => d.date === todayStr);

  return (
    <div className="flex flex-col h-full">
      {/* Header: day navigation */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 bg-white sticky top-0 z-10">
        <button
          onClick={() => setStartDayIdx(i => Math.max(0, i - 1))}
          disabled={!canPrev}
          className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 flex gap-1">
          {visibleTripDays.map(({ day, date }) => {
            const color = getDayColor(day);
            const isToday = date === todayStr;
            return (
              <div key={day} className="flex-1 text-center">
                <div className="text-xs text-slate-500">{getDayOfWeek(date)}</div>
                <div
                  className={`text-xs font-semibold mt-0.5 rounded-md px-1 py-0.5 mx-auto inline-block ${isToday ? 'text-white' : 'text-slate-700'}`}
                  style={isToday ? { backgroundColor: color } : {}}
                >
                  Day {day}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{date.slice(5)}</div>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => setStartDayIdx(i => Math.min(totalDays - visibleDays, i + 1))}
          disabled={!canNext}
          className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Timetable body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex" style={{ minHeight: `${TOTAL_HEIGHT}px` }}>
          {/* Time axis */}
          <div className="w-10 flex-shrink-0 relative select-none">
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute left-0 right-0 flex items-start justify-end pr-1.5"
                style={{ top: `${h * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
              >
                <span className="text-xs text-slate-400 leading-none mt-[-6px]">
                  {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex-1 flex relative">
            {/* Hour grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              {HOURS.map(h => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-slate-100"
                  style={{ top: `${h * HOUR_HEIGHT}px` }}
                />
              ))}
              {/* Half-hour lines */}
              {HOURS.map(h => (
                <div
                  key={`h${h}`}
                  className="absolute left-0 right-0 border-t border-slate-50"
                  style={{ top: `${h * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }}
                />
              ))}
            </div>

            {/* Current time indicator */}
            {visibleTripDays.some(d => d.date === todayStr) && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: `${currentTop}px` }}
              >
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 ml-0.5" />
                  <div className="flex-1 border-t-2 border-red-500" />
                </div>
              </div>
            )}

            {/* Vertical day dividers */}
            {visibleTripDays.map((_, colIdx) => colIdx > 0 && (
              <div
                key={colIdx}
                className="absolute top-0 bottom-0 border-l border-slate-100 pointer-events-none"
                style={{ left: `${(colIdx / visibleTripDays.length) * 100}%` }}
              />
            ))}

            {/* Events per day */}
            {visibleTripDays.map(({ day, date }, colIdx) => {
              const dayItems = itemsByDay[day] || [];
              const colWidth = `${100 / visibleTripDays.length}%`;
              const colLeft = `${(colIdx / visibleTripDays.length) * 100}%`;
              const color = getDayColor(day);

              // Detect overlapping items and assign columns
              type SlottedItem = { item: ItineraryItem; startMin: number; endMin: number; col: number; totalCols: number };
              const slotted: SlottedItem[] = [];
              for (const item of dayItems) {
                const startMin = parseTime(item.Time);
                if (startMin < 0) continue;
                const endMin = startMin + 60; // default 1 hour block
                // Find overlapping items
                const overlapping = slotted.filter(s => s.startMin < endMin && s.endMin > startMin);
                const usedCols = new Set(overlapping.map(s => s.col));
                let col = 0;
                while (usedCols.has(col)) col++;
                const totalCols = Math.max(col + 1, ...overlapping.map(s => s.totalCols));
                // Update totalCols for overlapping items
                overlapping.forEach(s => { s.totalCols = totalCols; });
                slotted.push({ item, startMin, endMin, col, totalCols });
              }

              // Items without time (all-day)
              const noTimeItems = dayItems.filter(item => parseTime(item.Time) < 0);

              return (
                <div
                  key={day}
                  className="absolute top-0 bottom-0"
                  style={{ left: colLeft, width: colWidth }}
                >
                  {/* All-day items at top */}
                  {noTimeItems.length > 0 && (
                    <div
                      className="absolute left-0.5 right-0.5 rounded text-xs px-1 py-0.5 z-10"
                      style={{ top: 2, backgroundColor: `${color}20`, borderLeft: `3px solid ${color}` }}
                    >
                      {noTimeItems.map(item => (
                        <div key={item.Itinerary_ID} className="truncate text-slate-600">
                          {item.Activity_Name || item.Activity}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Timed items */}
                  {slotted.map(({ item, startMin, endMin, col, totalCols }) => {
                    const top = (startMin / 60) * HOUR_HEIGHT;
                    const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT - 2, 22);
                    const itemWidth = `${100 / totalCols}%`;
                    const itemLeft = `${(col / totalCols) * 100}%`;
                    const isShort = height < 36;

                    return (
                      <div
                        key={item.Itinerary_ID}
                        className="absolute rounded-md overflow-hidden cursor-pointer group transition-shadow hover:shadow-md z-10"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          left: `calc(${itemLeft} + 2px)`,
                          width: `calc(${itemWidth} - 4px)`,
                          backgroundColor: `${color}18`,
                          borderLeft: `3px solid ${color}`,
                        }}
                        title={`${formatTime(item.Time)} ${item.Activity_Name || item.Activity}`}
                      >
                        <div className="px-1 py-0.5 h-full flex flex-col justify-start overflow-hidden">
                          {!isShort && (
                            <div className="text-xs font-medium leading-tight" style={{ color }}>
                              {formatTime(item.Time)}
                            </div>
                          )}
                          <div
                            className={`font-medium leading-tight text-slate-700 ${isShort ? 'text-xs' : 'text-xs mt-0.5'} truncate`}
                          >
                            {item.Activity_Name || item.Activity}
                          </div>
                          {!isShort && item.Activity && item.Activity !== item.Activity_Name && (
                            <div className="text-xs text-slate-400 truncate mt-0.5 leading-tight">
                              {item.Activity}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer: day range indicator */}
      <div className="flex items-center justify-center gap-1.5 py-2 border-t border-slate-100 bg-white">
        {tripDays.map((_, i) => {
          const isVisible = i >= startDayIdx && i < startDayIdx + visibleDays;
          return (
            <button
              key={i}
              onClick={() => setStartDayIdx(Math.max(0, Math.min(totalDays - visibleDays, i)))}
              className={`w-1.5 h-1.5 rounded-full transition-all ${isVisible ? 'bg-blue-500 w-3' : 'bg-slate-300 hover:bg-slate-400'}`}
            />
          );
        })}
      </div>
    </div>
  );
}
