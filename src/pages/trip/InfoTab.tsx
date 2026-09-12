import { useState, useEffect, useMemo } from 'react';
/*
 * Design system: "Tabitime-inspired Trip Portal" — a compact Trip Pass
 * gives one next action before calm, editorial reference sections.
 */
import { Plane, Hotel, Ticket, Clock, MapPin, Users, ArrowRight } from 'lucide-react';
import { api, Trip, Expense } from '../../api/supabaseApi';
import { EmptyState, Spinner, Badge } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import TripHealthCard from '../../components/TripHealthCard';
import DeparturePackageCard from '../../components/DeparturePackageCard';

// 只取日期部分
function formatDateOnly(d: string): string {
  if (!d) return '';
  return d.includes('T') ? d.slice(0, 10) : d;
}

// 格式化時間顯示
function formatTime(t: string): string {
  if (!t) return '';
  const parts = t.split(':');
  const h = String(parseInt(parts[0] || '0', 10)).padStart(2, '0');
  const m = String(parseInt(parts[1] || '0', 10)).padStart(2, '0');
  return `${h}:${m}`;
}

// Flight category keywords
const FLIGHT_KEYWORDS = ['機票', '航班', '飛機', 'flight'];
const ACCOMMODATION_KEYWORDS = ['住宿', '酒店', '旅館', '民宿', '飯店', 'hotel', 'accommodation', 'airbnb'];

function isFlightExpense(exp: Expense): boolean {
  const cat = (exp.Main_Category + ' ' + exp.Sub_Category).toLowerCase();
  return FLIGHT_KEYWORDS.some(k => cat.includes(k.toLowerCase()));
}

function isAccommodationExpense(exp: Expense): boolean {
  const cat = (exp.Main_Category + ' ' + exp.Sub_Category).toLowerCase();
  return ACCOMMODATION_KEYWORDS.some(k => cat.includes(k.toLowerCase()));
}


interface Props {
  trip: Trip;
  onNavigate: (target: 'info' | 'itinerary' | 'expenses', focusToday?: boolean, openLens?: boolean, focusItemIds?: string[]) => void;
  onExportPdf: () => Promise<boolean>;
}

export default function InfoTab({ trip, onNavigate, onExportPdf }: Props) {
  const { showToast } = useApp();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [travelerNames, setTravelerNames] = useState<string[]>([]);
  const [newTravelerName, setNewTravelerName] = useState('');
  const [savingTravelers, setSavingTravelers] = useState(false);
  const [persistedTravelerKey, setPersistedTravelerKey] = useState('');
  const isOwner = trip.Is_Owner !== false;
  const savedTravelerKey = (trip.Traveler_Names || []).join('|');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const exp = await api.getExpenses(trip.Trip_ID);
      setExpenses((exp as any).data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [trip.Trip_ID]);

  useEffect(() => {
    const saved = (trip.Traveler_Names || []).map(name => name.trim()).filter(Boolean);
    const creator = trip.Owner_Display_Name?.trim() || saved[0] || '創建者';
    setTravelerNames(Array.from(new Set([creator, ...saved])));
    setPersistedTravelerKey(Array.from(new Set([creator, ...saved])).join('|'));
  }, [trip.Trip_ID, trip.Owner_Display_Name, savedTravelerKey]);

  const creatorName = trip.Owner_Display_Name?.trim() || travelerNames[0] || '創建者';
  const normalizedTravelerNames = useMemo(
    () => Array.from(new Set([creatorName, ...travelerNames.map(name => name.trim()).filter(Boolean)])),
    [creatorName, travelerNames],
  );
  const travelerListChanged = normalizedTravelerNames.join('|') !== persistedTravelerKey;

  const addTraveler = () => {
    const name = newTravelerName.trim();
    if (!name) return;
    if (normalizedTravelerNames.includes(name)) {
      setNewTravelerName('');
      return;
    }
    setTravelerNames([...normalizedTravelerNames, name]);
    setNewTravelerName('');
  };

  const removeTraveler = (name: string) => {
    if (name === creatorName) {
      showToast('創建者必須保留在同行者清單中', 'info');
      return;
    }
    setTravelerNames(current => current.filter(item => item !== name));
  };

  const saveTravelerNames = async () => {
    setSavingTravelers(true);
    try {
      const result = await api.updateTrip(trip.Trip_ID, { Traveler_Names: normalizedTravelerNames });
      if (!result.success) throw new Error(result.error);
      setTravelerNames(normalizedTravelerNames);
      setPersistedTravelerKey(normalizedTravelerNames.join('|'));
      showToast('同行者清單已更新');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '同行者清單更新失敗', 'error');
    } finally {
      setSavingTravelers(false);
    }
  };

  // Filter expenses by category
  const flightExpenses = expenses.filter(isFlightExpense);
  const accommodationExpenses = expenses.filter(isAccommodationExpense);
  const bookingExpenses = expenses.filter(exp => exp.Is_Booking === true);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  // Trip overview stats
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.Base_Amount) || 0), 0);
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <TripHealthCard trip={trip} variant="overview" onNavigate={onNavigate} />
      <DeparturePackageCard trip={trip} variant="checklist" onNavigate={onNavigate} onExportPdf={onExportPdf} />

      <section className="grid grid-cols-3 divide-x divide-[#ece7da] overflow-hidden rounded-2xl border border-[#e3ddcf] bg-white shadow-[0_12px_28px_rgba(17,17,17,0.06)]">
        <div className="px-4 py-3"><p className="text-lg font-bold text-slate-950">{normalizedTravelerNames.length}</p><p className="text-xs text-slate-500">👥 旅伴</p></div>
        <div className="px-4 py-3"><p className="text-lg font-bold text-slate-950">{bookingExpenses.length}</p><p className="text-xs text-slate-500">🎟️ 預訂</p></div>
        <button type="button" onClick={() => onNavigate('expenses')} className="px-4 py-3 text-left transition-colors hover:bg-[#fff8df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2563eb]"><p className="text-lg font-bold text-slate-950">{trip.Base_Currency} {totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p><p className="text-xs text-[#9a7100]">💳 總支出</p></button>
      </section>

      {/* ── 行程成員（第一個區塊） ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Users size={18} className="text-[#9a7100]" />
          <h3 className="font-bold text-slate-950">一起出發的人</h3>
          <span className="text-xs text-slate-400">({normalizedTravelerNames.length})</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {normalizedTravelerNames.map((name, index) => (
            <div key={`${name}-${index}`} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${index === 0 ? 'bg-[#111111]' : 'bg-[#9a7100]'}`}>
                {name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-700">{name}</span>
              {index === 0 && <span className="rounded-full bg-[#fff3c4] px-1.5 py-0.5 text-xs text-[#8a6500]">創建者</span>}
              {isOwner && index > 0 && (
                <button type="button" onClick={() => removeTraveler(name)} className="rounded-md px-1 text-slate-400 hover:bg-red-50 hover:text-red-500" aria-label={`移除${name}`}>
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {isOwner ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newTravelerName}
                onChange={event => setNewTravelerName(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addTraveler(); } }}
                placeholder="輸入同行者姓名／名稱"
                className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#111111] focus:ring-2 focus:ring-[#ffc91a]"
                aria-label="同行者姓名或名稱"
              />
              <button type="button" onClick={addTraveler} className="min-h-10 rounded-xl border border-[#111111] bg-[#111111] px-4 text-sm font-bold text-[#ffc91a] hover:bg-[#252525]">加入</button>
            </div>
            {travelerListChanged && (
              <Button size="sm" onClick={saveTravelerNames} loading={savingTravelers}>儲存同行者清單</Button>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-400">同行者清單由行程創建者管理；協作者只能查看。</p>
        )}
      </section>

      {/* ── 航班資訊（從支出讀取） ── */}
      <section id="departure-package-flights">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Plane size={18} className="text-[#9a7100]" />
            <h3 className="font-semibold text-slate-900">航班資訊</h3>
            <span className="text-xs text-slate-400">({flightExpenses.length})</span>
          </div>
          <p className="text-xs text-slate-400">資料來自「支出」→「機票」分類</p>
        </div>
        {flightExpenses.length === 0 ? (
          <EmptyState icon={<Plane size={32} />} title="尚無航班記錄"
            description="請在「支出」頁面新增「機票」類別的支出，並填寫航班詳細資訊" />
        ) : (
          <div className="space-y-3">
            {flightExpenses.map(exp => {
              const statusColor = exp.Flight_Status === 'cancelled' ? 'red'
                : exp.Flight_Status === 'pending' ? 'yellow' : 'slate';
              const statusLabel = exp.Flight_Status === 'confirmed' ? '已確認'
                : exp.Flight_Status === 'pending' ? '待確認'
                : exp.Flight_Status === 'cancelled' ? '已取消' : '';
              return (
                <div key={exp.Expense_ID} className="rounded-xl border border-[#ece7da] bg-[#f5f2e8] p-4 transition-colors hover:border-[#ffc91a]">
                  {/* Header row: Airline + Flight No + Status */}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    {exp.Airline && (
                      <span className="text-sm font-semibold text-slate-700">{exp.Airline}</span>
                    )}
                      <span className="text-base font-bold tracking-wide text-[#8a6500]">
                      {exp.Flight_No || '—'}
                    </span>
                    {statusLabel && <Badge color={statusColor}>{statusLabel}</Badge>}
                    {exp.Note && <span className="text-xs text-slate-400 italic ml-auto">— {exp.Note}</span>}
                  </div>

                  {/* Main info grid: Route | Dep Time | Return Time */}
                  <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                    {/* Route */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-400 uppercase tracking-wide">航線</span>
                      <span className="font-semibold text-slate-800">
                        {exp.Departure_Location || 'HKG'}
                        <span className="text-slate-400 mx-1">→</span>
                        {exp.Arrival_Location || 'KIX'}
                      </span>
                      {(exp.Flight_Date || exp.Date) && (
                        <span className="text-xs text-slate-400">{formatDateOnly(exp.Flight_Date || exp.Date)}</span>
                      )}
                    </div>
                    {/* Outbound time */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-400 uppercase tracking-wide">去程</span>
                      {(exp.Departure_Time || exp.Landing_Time) ? (
                        <span className="font-mono text-slate-800">
                          {exp.Departure_Time ? formatTime(exp.Departure_Time) : '—'}
                          <span className="text-slate-400 mx-1">→</span>
                          {exp.Landing_Time ? formatTime(exp.Landing_Time) : '—'}
                        </span>
                      ) : <span className="text-slate-300 text-xs">未填</span>}
                    </div>
                    {/* Return time */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-400 uppercase tracking-wide">回程</span>
                      {(exp.Arrival_Time || exp.Return_Landing_Time) ? (
                        <>
                          {exp.Arrival_Date && (
                            <span className="text-xs text-slate-400">{formatDateOnly(exp.Arrival_Date)}</span>
                          )}
                          <span className="font-mono text-slate-800">
                            {exp.Arrival_Time ? formatTime(exp.Arrival_Time) : '—'}
                            <span className="text-slate-400 mx-1">→</span>
                            {exp.Return_Landing_Time ? formatTime(exp.Return_Landing_Time) : '—'}
                          </span>
                        </>
                      ) : <span className="text-slate-300 text-xs">未填</span>}
                    </div>
                  </div>

                  {/* Footer: Amount + payer */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100 flex-wrap">
                    <span className="font-semibold text-slate-700">
                      {exp.Currency} {Number(exp.Original_Amount).toLocaleString()}
                    </span>
                    {exp.Currency !== trip.Base_Currency && (
                      <span>= {trip.Base_Currency} {Number(exp.Base_Amount).toLocaleString()}</span>
                    )}
                    <span className="text-slate-300">·</span>
                    <span>付款：{exp.Payer}</span>
                    {exp.Splitters && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>分帳：{exp.Splitters}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 住宿資訊（從支出讀取） ── */}
      <section id="departure-package-accommodations">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Hotel size={18} className="text-[#9a7100]" />
            <h3 className="font-semibold text-slate-900">住宿資訊</h3>
            <span className="text-xs text-slate-400">({accommodationExpenses.length})</span>
          </div>
          <p className="text-xs text-slate-400">資料來自「支出」→「住宿」分類</p>
        </div>
        {accommodationExpenses.length === 0 ? (
          <EmptyState icon={<Hotel size={32} />} title="尚無住宿記錄"
            description="請在「支出」頁面新增「住宿」類別的支出，並填寫住宿詳細資訊" />
        ) : (
          <div className="space-y-2">
            {accommodationExpenses.map(exp => (
              <div key={exp.Expense_ID} className="rounded-xl border border-[#ece7da] bg-[#f5f2e8] p-4 transition-colors hover:border-[#ffc91a]">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 mb-1">
                    {exp.Accommodation_Name || exp.Sub_Category || exp.Note || '（未填住宿名稱）'}
                    {exp.Note && (exp.Accommodation_Name || exp.Sub_Category) && (
                      <span className="font-normal text-slate-500 ml-1">— {exp.Note}</span>
                    )}
                  </p>
                  {exp.Accommodation_Address && (
                    <p className="text-sm text-slate-500 flex items-center gap-1 mb-1">
                      <MapPin size={12} />{exp.Accommodation_Address}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {exp.Check_In_Date && <span>入住：{formatDateOnly(exp.Check_In_Date)}</span>}
                    {exp.Check_Out_Date && <span>退房：{formatDateOnly(exp.Check_Out_Date)}</span>}
                    <span className="font-medium text-slate-700">
                      {exp.Currency} {Number(exp.Original_Amount).toLocaleString()}
                    </span>
                    {exp.Currency !== trip.Base_Currency && (
                      <span>= {trip.Base_Currency} {Number(exp.Base_Amount).toLocaleString()}</span>
                    )}
                    <span>· 付款：{exp.Payer}</span>
                    {exp.Splitters && (
                      <span>· 分帳：{exp.Splitters}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 預訂資訊（從支出中標記為「預訂」的項目） ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Ticket size={18} className="text-[#9a7100]" />
            <h3 className="font-semibold text-slate-900">預訂資訊</h3>
            <span className="text-xs text-slate-400">({bookingExpenses.length})</span>
          </div>
          <p className="text-xs text-slate-400">在支出中開啟「顯示於預訂資訊」</p>
        </div>
        {bookingExpenses.length === 0 ? (
          <EmptyState icon={<Ticket size={32} />} title="尚無預訂"
            description="在新增/編輯支出時，開啟「顯示於預訂資訊」開關，即可在此顯示" />
        ) : (
          <div className="space-y-2">
            {bookingExpenses.map(exp => (
              <div key={exp.Expense_ID} className="rounded-xl border border-[#ece7da] bg-[#f5f2e8] p-4 transition-colors hover:border-[#ffc91a]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">
                      {exp.Note || exp.Sub_Category || exp.Main_Category}
                    </span>
                    <Badge color="blue">{exp.Main_Category}{exp.Sub_Category ? ` / ${exp.Sub_Category}` : ''}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {exp.Date && <span>{formatDateOnly(exp.Date)}</span>}
                    <span className="font-medium text-slate-700">
                      {exp.Currency} {Number(exp.Original_Amount).toLocaleString()}
                    </span>
                    {exp.Currency !== trip.Base_Currency && (
                      <span>= {trip.Base_Currency} {Number(exp.Base_Amount).toLocaleString()}</span>
                    )}
                    <span>· 付款：{exp.Payer}</span>
                    {exp.Splitters && <span>· 分帳：{exp.Splitters}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
