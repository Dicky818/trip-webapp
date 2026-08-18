/*
 * Design system: P1.1 Day Lens keeps feasibility explainable, calm, and
 * actionable with Ink Black, Canvas Ivory, and Journey Yellow only.
 */
import { ArrowRight, CalendarClock, ChevronDown, Clock3, ListChecks } from 'lucide-react';
import type { DayFeasibility } from '../lib/dayFeasibility';

interface BadgeProps {
  feasibility: DayFeasibility;
  expanded: boolean;
  onToggle: () => void;
}

export function DayLoadBadge({ feasibility, expanded, onToggle }: BadgeProps) {
  const attention = feasibility.level === 'tight' || feasibility.level === 'review' || feasibility.level === 'needs-time';
  return (
    <button type="button" onClick={event => { event.stopPropagation(); onToggle(); }} aria-expanded={expanded}
      aria-label={`${feasibility.date}，${feasibility.label}，${feasibility.summary}`}
      className={`mt-2 inline-flex min-h-9 w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-bold transition-colors sm:mt-0 sm:w-auto ${attention ? 'border-[#ffc91a] bg-[#fff4c8] text-[#111111] hover:bg-[#ffe88c]' : 'border-[#e3ddcf] bg-[#f5f2e8] text-[#111111] hover:bg-white'}`}>
      <span className="flex min-w-0 items-center gap-1.5"><span className={`h-1.5 w-1.5 flex-none rounded-full ${attention ? 'bg-[#9a7100]' : 'bg-[#111111]'}`} /><span className="truncate">{feasibility.label}</span></span>
      <ChevronDown size={13} className={`flex-none transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
    </button>
  );
}

interface LensProps {
  feasibility: DayFeasibility;
  onOpenTimetable: () => void;
  onClose: () => void;
}

export function DayLens({ feasibility, onOpenTimetable, onClose }: LensProps) {
  return (
    <section className="rounded-xl border border-[#e3ddcf] bg-[#f5f2e8] p-3.5 route-enter" aria-label={`第 ${feasibility.dayNumber} 天日程鏡頭`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="portal-eyebrow text-[#9b907c]">DAY LENS / 第 {feasibility.dayNumber} 天</p>
          <h4 className="mt-1 text-sm font-extrabold text-[#111111]">{feasibility.label}</h4>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition-colors hover:bg-white hover:text-[#111111]">收起</button>
      </div>
      <div className="mt-3 space-y-2">
        {feasibility.reasons.length > 0 ? feasibility.reasons.map(reason => (
          <div key={reason.id} className="rounded-lg bg-white px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-xs font-bold text-[#111111]"><ListChecks size={13} className="text-[#9a7100]" />{reason.label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{reason.detail}</p>
          </div>
        )) : <p className="rounded-lg bg-white px-3 py-2.5 text-xs leading-5 text-slate-600">{feasibility.summary}</p>}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500"><Clock3 size={13} />{feasibility.activityCount} 項活動{feasibility.firstTime && feasibility.lastTime ? ` · ${feasibility.firstTime}–${feasibility.lastTime}` : ''}{feasibility.missingTimeCount > 0 ? ` · ${feasibility.missingTimeCount} 項待補時間` : ''}</p>
      <button type="button" onClick={onOpenTimetable} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#111111] px-3.5 py-2.5 text-xs font-bold text-[#ffc91a] transition-colors hover:bg-[#292929] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f2e8]"><CalendarClock size={15} /> 查看時間表 <ArrowRight size={14} /></button>
    </section>
  );
}
