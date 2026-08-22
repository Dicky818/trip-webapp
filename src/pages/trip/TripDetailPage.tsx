import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
/*
 * Design system: "編輯式旅程入口" — the journey pass establishes trip identity,
 * while the task rail and dock remain quiet, contextual travel shortcuts.
 */
import { ArrowLeft, Plane, Map, DollarSign, Sparkles, Edit2, Check, X, Package, Clock, FileDown, MoreHorizontal } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api, Trip } from '../../api/supabaseApi';
import { Button, Spinner, Input, Select } from '../../components/ui';

// Lazy-loaded tab components for code splitting
const InfoTab = React.lazy(() => import('./InfoTab'));
const ItineraryTab = React.lazy(() => import('./ItineraryTab'));
const ExpensesTab = React.lazy(() => import('./ExpensesTab'));
const AITab = React.lazy(() => import('./AITab'));
const PackingListTab = React.lazy(() => import('./PackingListTab'));

const CURRENCIES = ['HKD','TWD','JPY','KRW','USD','EUR','GBP','CNY','SGD','THB','MYR'];

const TABS = [
  { id: 'info', number: '01', label: '概覽', shortLabel: '概覽', emoji: '🧭', description: '掌握今天與下一站', icon: <Plane size={17} /> },
  { id: 'itinerary', number: '02', label: '規劃路線', shortLabel: '路線', emoji: '📍', description: '安排每天的時間與地點', icon: <Map size={17} /> },
  { id: 'expenses', number: '03', label: '記錄支出', shortLabel: '支出', emoji: '💳', description: '收據、分帳與總覽', icon: <DollarSign size={17} /> },
  { id: 'packing', number: '04', label: '打包清單', shortLabel: '打包', emoji: '🎒', description: '出發前的必需品', icon: <Package size={17} /> },
  { id: 'ai', number: '05', label: '旅程助手', shortLabel: '助手', emoji: '✨', description: '整理需要留意的事', icon: <Sparkles size={17} /> },
];

// Design system: "Trip workspace tool rail" — all primary actions live after
// trip selection, using the same numbered editorial cards from 01 through 09.
const WORKSPACE_TOOLS = [
  { number: '01', eyebrow: 'NOW', emoji: '📍', title: '今日路線', description: '下一站、時間與交通', tab: 'itinerary', query: 'focus=today', tone: 'ink' },
  { number: '02', eyebrow: 'PLAN', emoji: '🗺️', title: '規劃路線', description: '每一天的站點與備案', tab: 'itinerary', query: '', tone: 'paper' },
  { number: '03', eyebrow: 'SPEND', emoji: '💳', title: '記錄支出', description: '收據、付款與分帳', tab: 'expenses', query: '', tone: 'paper' },
  { number: '04', eyebrow: 'STAY', emoji: '✈️', title: '航班與住宿', description: '入住、航班與確認資料', tab: 'info', query: '', tone: 'paper' },
  { number: '05', eyebrow: 'PACK', emoji: '🎒', title: '打包清單', description: '出發前的必要準備', tab: 'packing', query: '', tone: 'paper' },
  { number: '06', eyebrow: 'GUIDE', emoji: '✨', title: '旅程助手', description: '依目前資料整理提醒', tab: 'ai', query: '', tone: 'paper' },
  { number: '07', eyebrow: 'SUPPORT', emoji: '💬', title: '旅程支援', description: '連線提示與旅程提醒', tab: 'ai', query: '', tone: 'yellow' },
  { number: '08', eyebrow: 'OPERATIONS', emoji: '⏱️', title: '今日作戰', description: '查看今天的緊湊安排', tab: 'itinerary', query: 'focus=today', tone: 'paper' },
  { number: '09', eyebrow: 'DEPARTURE', emoji: '🧳', title: '出發前包', description: '行程、PDF 與同步準備', tab: 'info', query: 'panel=departure', tone: 'paper' },
] as const;

function TabSpinner() {
  return (
    <div className="flex justify-center py-12">
      <Spinner size="md" />
    </div>
  );
}

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useApp();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  const [exporting, setExporting] = useState(false);

  // 編輯行程名稱
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editCurrency, setEditCurrency] = useState('HKD');
  const [savingName, setSavingName] = useState(false);

  const fetchTrip = async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const result = await api.getTripById(tripId);
      if (result.success) setTrip(result.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrip(); }, [tripId]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (requestedTab && TABS.some(tab => tab.id === requestedTab)) setActiveTab(requestedTab);
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get('panel') !== 'departure') return;
    setActiveTab('info');
    const timer = window.setTimeout(() => document.getElementById('departure-package')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 180);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  const handleSaveName = async () => {
    if (!trip || !editName.trim()) return;
    setSavingName(true);
    try {
      await api.updateTrip(trip.Trip_ID, {
        Trip_Name: editName,
        Start_Date: editStartDate,
        End_Date: editEndDate,
        Base_Currency: editCurrency,
      });
      showToast('行程資訊已更新');
      setEditingName(false);
      await fetchTrip();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '更新失敗', 'error');
    } finally {
      setSavingName(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const dateStr = d.includes('T') ? d.slice(0, 10) : d;
    const [y, m, day] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('zh-TW', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!trip) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">找不到此行程</p>
        <Button onClick={() => navigate('/')}>返回首頁</Button>
      </div>
    );
  }

  const parseD = (d: string) => { const s = d.includes('T') ? d.slice(0, 10) : d; const [y, m, day] = s.split('-').map(Number); return new Date(y, m - 1, day); };
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const startDate = parseD(trip.Start_Date);
  const endDate = parseD(trip.End_Date);
  const diffStart = Math.ceil((startDate.getTime() - now.getTime()) / 86400000);
  const diffEnd = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);
  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
  const tripStatus = diffStart > 0
    ? { label: `還有 ${diffStart} 天出發`, className: 'border-white/15 bg-white/10 text-[#f5f2e8]' }
    : diffEnd >= 0
      ? { label: `旅行中 · 第 ${Math.abs(diffStart) + 1}/${totalDays} 天`, className: 'border-[#ffc91a] bg-[#ffc91a] text-[#111111]' }
      : { label: '行程已結束', className: 'border-white/15 bg-white/10 text-slate-300' };
  const activeSection = TABS.find(tab => tab.id === activeTab) || TABS[0];
  const openWorkspaceTool = (tool: typeof WORKSPACE_TOOLS[number]) => {
    setActiveTab(tool.tab);
    navigate(`/trip/${trip.Trip_ID}?tab=${tool.tab}${tool.query ? `&${tool.query}` : ''}`);
  };
  const exportBooklet = async (): Promise<boolean> => {
    if (exporting) return false;
    setExporting(true);
    try {
      const [expRes, itiRes, fliRes, accRes, memRes] = await Promise.all([
        api.getExpenses(trip.Trip_ID), api.getItinerary(trip.Trip_ID), api.getFlights(trip.Trip_ID), api.getAccommodations(trip.Trip_ID), api.getTripMembers(trip.Trip_ID),
      ]);
      const settlement = await api.getSettlement(trip.Trip_ID);
      const { generateTravelBooklet } = await import('../../lib/pdfExport');
      await generateTravelBooklet({ trip, expenses: expRes.success ? expRes.data : [], itinerary: itiRes.success ? itiRes.data : [], flights: fliRes.success ? fliRes.data : [], accommodations: accRes.success ? accRes.data : [], members: memRes.success ? memRes.data : [], settlement: settlement.success ? settlement.data : null });
      showToast('PDF 旅行小冊子已下載');
      return true;
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '匯出失敗', 'error');
      return false;
    } finally { setExporting(false); }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="portal-pass relative overflow-hidden rounded-[1.75rem] px-5 py-6 text-white sm:px-8 sm:py-7 route-enter">
        <div className="absolute inset-0 route-grid opacity-40" />
        <div className="absolute -right-16 -bottom-20 h-56 w-56 rounded-full bg-[#ffc91a]/15 blur-3xl" />
        <div className="relative">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#f5f2e8]/70 transition-colors hover:text-white">
            <ArrowLeft size={15} /> 所有行程
          </button>

          {editingName ? (
            <div className="mt-5 max-w-2xl rounded-2xl bg-white p-4 sm:p-5 text-slate-900">
              <div className="flex flex-col gap-3">
                <Input label="行程名稱" value={editName} onChange={e => setEditName(e.target.value)} required />
                <div className="grid grid-cols-2 gap-3"><Input label="出發日期" type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} /><Input label="結束日期" type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} /></div>
                <Select label="基礎貨幣" value={editCurrency} onChange={e => setEditCurrency(e.target.value)} options={CURRENCIES.map(c => ({ value: c, label: c }))} />
                <div className="flex gap-2 justify-end"><Button variant="outline" size="sm" onClick={() => setEditingName(false)}><X size={14} /> 取消</Button><Button size="sm" onClick={handleSaveName} loading={savingName}><Check size={14} /> 儲存變更</Button></div>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="portal-eyebrow text-[#f5f2e8]/50">TRIP / PLAN</p>
                <div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">{trip.Trip_Name}</h1><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${tripStatus.className}`}>{tripStatus.label}</span></div>
                <p className="mt-2 text-sm text-[#f5f2e8]/70">{formatDate(trip.Start_Date)} — {formatDate(trip.End_Date)} <span className="mx-2 text-white/25">/</span><span className="font-semibold text-[#ffc91a]">{trip.Base_Currency}</span></p>
              </div>
              <details className="relative self-start sm:self-auto">
                <summary className="list-none inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10"><MoreHorizontal size={16} /> 更多</summary>
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-36 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-xl">
                  <button onClick={exportBooklet} disabled={exporting} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"><FileDown size={15} className={exporting ? 'animate-pulse' : ''} /> 匯出小冊子</button>
                  <button onClick={() => { setEditName(trip.Trip_Name); setEditStartDate(trip.Start_Date); setEditEndDate(trip.End_Date); setEditCurrency(trip.Base_Currency); setEditingName(true); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50"><Edit2 size={15} /> 編輯行程</button>
                </div>
              </details>
            </div>
          )}
        </div>
      </section>

      <section className="route-enter-delay">
        <div className="mb-4 flex items-end justify-between gap-4 px-1">
          <div>
            <p className="portal-eyebrow text-[#9b907c]">SECTION / YOUR TRIP TOOLS</p>
            <h2 className="mt-1 text-xl font-extrabold text-[#171717]">下一步，從這裡開始</h2>
          </div>
          <span className="text-2xl font-extrabold text-[#b7aa91]">09</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {WORKSPACE_TOOLS.map(tool => {
            const className = tool.tone === 'ink'
              ? 'bg-[#111111] text-white shadow-[0_14px_30px_rgba(17,17,17,0.16)] hover:-translate-y-0.5'
              : tool.tone === 'yellow'
                ? 'bg-[#ffc91a] text-[#111111] shadow-[0_14px_30px_rgba(156,116,0,0.14)] hover:-translate-y-0.5'
                : 'border border-[#e3ddcf] bg-white text-[#171717] shadow-[0_12px_28px_rgba(17,17,17,0.06)] hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(17,17,17,0.10)]';
            const eyebrowClass = tool.tone === 'ink' ? 'text-[#ffc91a]' : tool.tone === 'yellow' ? 'text-[#735700]' : 'text-[#9b907c]';
            const descriptionClass = tool.tone === 'ink' ? 'text-white/65' : tool.tone === 'yellow' ? 'text-[#4d3900]' : 'text-slate-500';
            return (
              <button
                key={tool.number}
                onClick={() => openWorkspaceTool(tool)}
                className={`min-h-36 rounded-[1.35rem] p-5 text-left transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 ${className}`}
              >
                <p className={`portal-eyebrow ${eyebrowClass}`}>{tool.number} / {tool.eyebrow}</p>
                <p className="mt-4 text-lg font-extrabold leading-tight">{tool.emoji} {tool.title}</p>
                <p className={`mt-2 text-xs leading-5 ${descriptionClass}`}>{tool.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[224px_minmax(0,1fr)] route-enter-delay">
        <aside className="hidden xl:block">
          <div className="sticky top-24 rounded-2xl border border-[#e3ddcf] bg-white p-2 shadow-[0_12px_28px_rgba(17,17,17,0.06)]">
            <nav className="space-y-1">
              {TABS.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full text-left rounded-xl px-3 py-2.5 transition-colors ${activeTab === tab.id ? 'bg-[#111111] text-[#ffc91a] shadow-sm' : 'text-slate-600 hover:bg-[#f5f2e8]'}`}><span className="flex items-center gap-2.5 text-sm font-bold"><span className="w-4 text-[10px] tracking-wide opacity-70">{tab.number}</span><span aria-hidden="true">{tab.emoji}</span>{tab.label}</span></button>)}
            </nav>
          </div>
        </aside>

        <div className="min-w-0">
            <div className="mb-4 flex items-center gap-3 px-1">
              <span className="text-base" aria-hidden="true">{activeSection.emoji}</span>
            <div><p className="portal-eyebrow text-[#9b907c]">{activeSection.number} / SECTION</p><h2 className="mt-0.5 text-base font-bold text-slate-950">{activeSection.label}</h2></div>
            </div>

          <div className="min-h-[32rem] overflow-hidden rounded-[1.5rem] border border-[#e3ddcf] bg-white shadow-[0_12px_28px_rgba(17,17,17,0.06)]">
            <Suspense fallback={<TabSpinner />}>
              {activeTab === 'info' && <InfoTab trip={trip} onExportPdf={exportBooklet} onNavigate={(target, focusToday, openLens, focusItemIds) => navigate(`/trip/${trip.Trip_ID}?tab=${target}${focusToday ? '&focus=today' : ''}${openLens ? '&lens=load' : ''}${focusItemIds?.length ? `&focusItems=${encodeURIComponent(focusItemIds.join(','))}` : ''}`)} />}
              {activeTab === 'itinerary' && <ItineraryTab trip={trip} focusToday={searchParams.get('focus') === 'today'} focusLens={searchParams.get('lens') === 'load'} focusItemIds={(searchParams.get('focusItems') || '').split(',').filter(Boolean)} />}
              {activeTab === 'expenses' && <ExpensesTab trip={trip} />}
              {activeTab === 'packing' && <PackingListTab trip={trip} />}
              {activeTab === 'ai' && <AITab trip={trip} />}
            </Suspense>
          </div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e3ddcf] bg-[#f5f2e8]/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_24px_rgba(17,17,17,0.08)] backdrop-blur-xl xl:hidden" aria-label="行程工作區">
        <div className="grid grid-cols-5">
          {TABS.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold transition-colors ${activeTab === tab.id ? 'bg-[#111111] text-[#ffc91a]' : 'text-slate-400'}`}><span className="text-sm" aria-hidden="true">{tab.emoji}</span><span>{tab.shortLabel}</span></button>)}
        </div>
      </nav>
    </div>
  );
}
