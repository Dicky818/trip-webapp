/*
 * Design system: "Departure Package" — Journey Yellow names the one action;
 * Ink Black holds the operational state, then a five-line checklist makes
 * offline readiness legible without adding a new workspace destination.
 */
import { ArrowRight, CheckCircle2, CircleAlert, CloudDownload, CloudOff, FileDown, Plane, RefreshCw, Route, Wifi, XCircle } from 'lucide-react';
import type { Trip } from '../api/supabaseApi';
import { useApp } from '../context/AppContext';
import { useDeparturePackage } from '../hooks/useDeparturePackage';
import { useOfflineSync } from '../hooks/useOfflineSync';
import type { DepartureSection, DepartureSectionKey, DepartureReadinessStatus } from '../lib/departurePackage';

type NavigationTarget = 'itinerary' | 'expenses' | 'info';

interface Props {
  trip: Trip;
  variant: 'portal' | 'checklist';
  onOpen?: () => void;
  onNavigate?: (target: NavigationTarget) => void;
  onExportPdf?: () => Promise<boolean>;
}

const SECTION_ORDER: Array<{ key: DepartureSectionKey; title: string; icon: typeof Route }> = [
  { key: 'itinerary', title: '行程', icon: Route },
  { key: 'flights', title: '航班', icon: Plane },
  { key: 'accommodations', title: '住宿', icon: CloudDownload },
  { key: 'pdf', title: 'PDF', icon: FileDown },
  { key: 'sync', title: '同步', icon: RefreshCw },
];

function statusPresentation(status: DepartureReadinessStatus) {
  if (status === 'ready') return { label: '可離線查閱', className: 'bg-[#111111] text-[#ffc91a]', icon: CheckCircle2 };
  if (status === 'pending_sync') return { label: '等待同步', className: 'border border-slate-300 bg-slate-100 text-slate-700', icon: CloudOff };
  if (status === 'stale') return { label: '需要更新', className: 'border border-[#d2b65c] bg-[#fff8df] text-[#735700]', icon: CircleAlert };
  return { label: '需要檢查', className: 'border border-[#ffc91a] bg-[#fffdf4] text-[#735700]', icon: CircleAlert };
}

function SectionIcon({ section }: { section: DepartureSection }) {
  if (section.status === 'ready') return <CheckCircle2 size={17} className="text-[#111111]" aria-hidden="true" />;
  if (section.status === 'pending_sync') return <CloudOff size={17} className="text-slate-500" aria-hidden="true" />;
  return <XCircle size={17} className="text-[#9a7100]" aria-hidden="true" />;
}

export default function DeparturePackageCard({ trip, variant, onOpen, onNavigate, onExportPdf }: Props) {
  const { showToast } = useApp();
  const { snapshot, readiness, isLoading, isPreparing, prepare, markPdfGenerated, online } = useDeparturePackage(trip);
  const { isSyncing, syncNow } = useOfflineSync();

  const handlePrepare = async () => {
    try {
      await prepare();
      showToast('出發前包已更新並保存在此裝置');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '更新出發前包失敗', 'error');
    }
  };

  const handleSectionAction = async (key: DepartureSectionKey) => {
    if (key === 'sync') {
      const result = await syncNow();
      if (result.failed > 0) showToast(`${result.failed} 筆支出尚未同步，請稍後重試`, 'error');
      else if (result.synced > 0) showToast(`已同步 ${result.synced} 筆離線支出`);
      else showToast(online ? '目前沒有等待同步的支出' : '目前離線，恢復連線後會自動同步', 'info');
      return;
    }
    if (key === 'pdf') {
      if (!onExportPdf) return;
      const exported = await onExportPdf();
      if (exported) await markPdfGenerated();
      return;
    }
    onNavigate?.(key === 'itinerary' ? 'itinerary' : 'expenses');
  };

  if (isLoading) {
    return <section aria-label="正在讀取出發前包" className={`animate-pulse rounded-[1.5rem] ${variant === 'portal' ? 'border border-[#e3ddcf] bg-white p-5' : 'border border-[#e3ddcf] bg-[#f5f2e8] p-5'}`}><div className="h-3 w-32 rounded bg-slate-200" /><div className="mt-4 h-7 w-2/3 rounded bg-slate-200" /><div className="mt-3 h-4 w-1/2 rounded bg-slate-200" /></section>;
  }

  const status = readiness?.status || 'review';
  const presentation = statusPresentation(status);
  const StatusIcon = presentation.icon;
  const preparedAt = snapshot?.preparedAt ? new Date(snapshot.preparedAt).toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' }) : null;

  if (variant === 'portal') {
    return (
      <section className="relative overflow-hidden rounded-[1.5rem] border border-[#e3ddcf] bg-white p-5 shadow-[0_12px_28px_rgba(17,17,17,0.06)]" aria-labelledby="departure-package-portal">
        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#ffc91a]/30 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div><p className="portal-eyebrow text-[#9b907c]">09 / DEPARTURE PACKAGE</p><h2 id="departure-package-portal" className="mt-3 text-xl font-extrabold tracking-tight text-[#111111]">出發前包</h2></div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${presentation.className}`}><StatusIcon size={14} /> {snapshot ? presentation.label : '尚未建立'}</span>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">將行程、航班、住宿、PDF 與同步狀態整理到此裝置；地圖與旅程助手仍需要網絡。</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={handlePrepare} disabled={isPreparing || !online} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#ffc91a] px-4 py-2.5 text-sm font-bold text-[#111111] transition-colors hover:bg-[#f1b900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]">
              <RefreshCw size={16} className={isPreparing ? 'animate-spin' : ''} /> {isPreparing ? '正在更新…' : '更新出發前包'}
            </button>
            {onOpen && <button type="button" onClick={onOpen} className="inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-bold text-[#111111] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2"><Route size={16} /> 查看五項清單 <ArrowRight size={15} /></button>}
          </div>
          <p className="mt-3 text-[11px] font-medium text-slate-400">{preparedAt ? `此裝置更新於 ${preparedAt}` : '尚未儲存任何離線準備資料'}{!online && ' · 目前離線'}</p>
        </div>
      </section>
    );
  }

  const sections = readiness?.sections;
  return (
    <section id="departure-package" className="relative overflow-hidden rounded-[1.5rem] border border-[#e3ddcf] bg-[#f5f2e8] p-5 shadow-[0_12px_28px_rgba(17,17,17,0.06)] sm:p-6" aria-labelledby="departure-package-checklist">
      <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-[4rem] bg-[#ffc91a]/45" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="portal-eyebrow text-[#9a7100]">DEPARTURE / OFFLINE READINESS</p><h2 id="departure-package-checklist" className="mt-2 text-2xl font-extrabold tracking-tight text-[#111111]">出發前包</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">只保存必要行程摘要在此裝置；不包含收據、附件、護照或付款資料。</p></div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${presentation.className}`}><StatusIcon size={14} /> {snapshot ? presentation.label : '尚未建立'}</span>
        </div>

        {!snapshot ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#d8ceb9] bg-white/70 p-5"><p className="font-bold text-[#111111]">先建立第一份離線準備資料</p><p className="mt-1 text-sm leading-6 text-slate-600">需要連線一次，讀取目前行程後才會保存精簡摘要到此裝置。</p></div>
        ) : sections ? (
          <div className="mt-6 divide-y divide-[#e3ddcf] overflow-hidden rounded-2xl border border-[#e3ddcf] bg-white">
            {SECTION_ORDER.map(({ key, title, icon: Icon }) => {
              const section = sections[key];
              const busy = key === 'sync' && isSyncing;
              return <div key={key} className="flex items-center gap-3 p-4 sm:p-4.5"><div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#f5f2e8] text-[#111111]"><Icon size={18} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm font-extrabold text-[#111111]">{title}</p><SectionIcon section={section} /></div><p className="mt-0.5 text-xs leading-5 text-slate-500">{section.detail}</p></div><button type="button" onClick={() => void handleSectionAction(key)} disabled={busy || (key === 'pdf' && !onExportPdf)} className="flex-none text-right text-xs font-bold text-[#735700] underline-offset-4 transition-colors hover:text-[#111111] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{busy ? '同步中…' : section.actionLabel}</button></div>;
            })}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 border-t border-[#d8ceb9] pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Wifi size={15} /> 地圖與旅程助手需要網絡</div><button type="button" onClick={handlePrepare} disabled={isPreparing || !online} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ffc91a] px-4 py-2.5 text-sm font-bold text-[#111111] transition-colors hover:bg-[#f1b900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"><RefreshCw size={16} className={isPreparing ? 'animate-spin' : ''} /> {isPreparing ? '正在更新…' : '更新出發前包'}</button></div>
        <p className="mt-3 text-[11px] font-medium text-slate-400">{preparedAt ? `此裝置更新於 ${preparedAt}` : '尚未建立本機摘要'}{!online && ' · 目前離線，仍可查看既有資料'}</p>
      </div>
    </section>
  );
}
