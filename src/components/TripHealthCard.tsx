/*
 * Design system: "Trip Health" — one Ink Black operational state and a
 * bounded Canvas Ivory signal list reveal the next useful travel action.
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, CloudOff, MapPin, RefreshCw, ShieldAlert, Wifi } from 'lucide-react';
import { api, Expense, ItineraryItem, Trip } from '../api/supabaseApi';
import { useApp } from '../context/AppContext';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { deriveTripHealth, TripHealthSignal, TripHealthTarget } from '../lib/tripHealth';

interface Props {
  trip: Trip;
  variant: 'portal' | 'overview';
  onNavigate: (target: TripHealthTarget, focusToday?: boolean, openLens?: boolean, focusItemIds?: string[]) => void;
}

function SignalIcon({ signal }: { signal: TripHealthSignal }) {
  if (signal.severity === 'critical') return <ShieldAlert size={16} className="text-red-700" aria-hidden="true" />;
  if (signal.severity === 'attention') return <AlertTriangle size={16} className="text-[#9a7100]" aria-hidden="true" />;
  if (signal.severity === 'sync') return signal.id === 'offline' ? <CloudOff size={16} className="text-[#111111]" aria-hidden="true" /> : <RefreshCw size={16} className="text-[#111111]" aria-hidden="true" />;
  return <CheckCircle2 size={16} className="text-[#111111]" aria-hidden="true" />;
}

export default function TripHealthCard({ trip, variant, onNavigate }: Props) {
  const { online, pendingCount, isSyncing, syncNow } = useOfflineSync();
  const { showToast } = useApp();
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([api.getItinerary(trip.Trip_ID), api.getExpenses(trip.Trip_ID)])
      .then(([itineraryResult, expensesResult]) => {
        if (cancelled) return;
        setItinerary((itineraryResult as any).success ? ((itineraryResult as any).data || []) : []);
        setExpenses((expensesResult as any).success ? ((expensesResult as any).data || []) : []);
      })
      .catch(() => {
        if (!cancelled) {
          setItinerary([]);
          setExpenses([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [trip.Trip_ID]);

  const health = deriveTripHealth(trip, itinerary, expenses, { online, pendingCount, isSyncing });

  const handleSync = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const result = await syncNow();
    if (result.failed > 0) showToast(`${result.failed} 筆支出尚未同步，請稍後重試`, 'error');
    else if (result.synced > 0) showToast(`已同步 ${result.synced} 筆離線支出`);
  };

  const openSignal = (signal: TripHealthSignal) => {
    if (signal.target) onNavigate(signal.target, signal.target === 'itinerary', signal.openLens, signal.focusItemIds);
  };

  if (loading) {
    return <section aria-label="正在整理旅程健康狀態" className={`animate-pulse rounded-[1.5rem] ${variant === 'portal' ? 'border border-[#e3ddcf] bg-white p-5' : 'portal-pass p-5'}`}><div className="h-3 w-28 rounded bg-white/20" /><div className="mt-4 h-6 w-2/3 rounded bg-white/20" /><div className="mt-3 h-4 w-1/2 rounded bg-white/20" /></section>;
  }

  const isPortal = variant === 'portal';
  return (
    <section className={`relative overflow-hidden rounded-[1.5rem] ${isPortal ? 'border border-[#e3ddcf] bg-white p-5 shadow-[0_12px_28px_rgba(17,17,17,0.06)]' : 'portal-pass px-5 py-6 text-white'}`} aria-labelledby={`trip-health-${variant}`}>
      {!isPortal && <><div className="absolute inset-0 route-grid opacity-40" /><div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#ffc91a]/15 blur-3xl" /></>}
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`portal-eyebrow ${isPortal ? 'text-[#9b907c]' : 'text-[#ffc91a]'}`}>{isPortal ? '08 / TODAY’S OPERATIONS' : 'JOURNEY / HEALTH'}</p>
            <h2 id={`trip-health-${variant}`} className={`mt-3 text-xl font-extrabold tracking-tight ${isPortal ? 'text-[#111111]' : 'text-white'}`}>{health.headline}</h2>
          </div>
          <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${isPortal ? 'bg-[#f5f2e8] text-[#111111]' : 'bg-[#ffc91a] text-[#111111]'}`}>{health.dayLabel}</span>
        </div>
        <p className={`mt-2 text-sm leading-6 ${isPortal ? 'text-slate-600' : 'text-[#f5f2e8]/72'}`}>{health.detail}</p>
        <button type="button" onClick={() => onNavigate(health.primaryTarget, health.focusToday)} className={`mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 ${isPortal ? 'bg-[#111111] text-[#ffc91a] hover:bg-[#292929] focus-visible:ring-offset-white' : 'bg-[#ffc91a] text-[#111111] hover:bg-[#f1b900] focus-visible:ring-offset-[#111111]'}`}>
          <MapPin size={16} /> {health.primaryLabel} <ArrowRight size={15} />
        </button>
        {health.signals.length > 0 && (
          <div className={`mt-5 space-y-2 ${isPortal ? 'border-t border-[#ece7da] pt-4' : 'border-t border-white/15 pt-4'}`}>
            {health.signals.map(signal => (
              <div key={signal.id} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 ${isPortal ? 'bg-[#f5f2e8]' : 'bg-white/10'}`}>
                <SignalIcon signal={signal} />
                <button type="button" onClick={() => openSignal(signal)} disabled={!signal.target} className={`min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 disabled:cursor-default ${isPortal ? 'focus-visible:ring-offset-[#f5f2e8]' : 'focus-visible:ring-offset-[#111111]'}`}>
                  <span className={`block text-xs font-bold ${signal.severity === 'critical' ? 'text-red-800' : isPortal ? 'text-[#111111]' : 'text-white'}`}>{signal.label}</span>
                  {signal.detail && <span className={`mt-0.5 block text-[11px] ${isPortal ? 'text-slate-500' : 'text-[#f5f2e8]/65'}`}>{signal.detail}</span>}
                </button>
                {signal.allowSync ? (
                  <button type="button" onClick={handleSync} className="inline-flex h-9 flex-none items-center gap-1.5 rounded-lg bg-[#111111] px-3 text-xs font-bold text-[#ffc91a] transition-colors hover:bg-[#292929] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f2e8]">
                    <RefreshCw size={14} /> 立即同步
                  </button>
                ) : signal.target ? <ArrowRight size={15} className={isPortal ? 'text-[#9b907c]' : 'text-[#ffc91a]'} aria-hidden="true" /> : signal.id !== 'offline' ? <Wifi size={15} className={isPortal ? 'text-[#9b907c]' : 'text-[#f5f2e8]/60'} aria-hidden="true" /> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
