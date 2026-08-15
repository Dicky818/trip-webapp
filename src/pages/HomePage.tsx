import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
/*
 * Design system: "旅途作戰桌" — home is an action-oriented launchpad.
 * Prioritize an active trip and one clear next step over a flat card gallery.
 */
import { Plus, Plane, Calendar, Trash2, MapPin, Share2, Users, Link2, Copy, Check, LogIn, ArrowRight, Compass, CirclePlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, Trip } from '../api/supabaseApi';
import { Button, Card, Modal, Input, Select, EmptyState, ConfirmDialog, Spinner } from '../components/ui';

const CURRENCIES = ['HKD','TWD','JPY','KRW','USD','EUR','GBP','CNY','SGD','THB','MYR'];

export default function HomePage() {
  const navigate = useNavigate();
  const { trips, tripsLoading, fetchTrips, showToast } = useApp();

  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Trip | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ Trip_Name: '', Start_Date: '', End_Date: '', Base_Currency: 'HKD' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Share modal
  const [shareTrip, setShareTrip] = useState<Trip | null>(null);
  const [shareCode, setShareCode] = useState('');
  const [sharePassword, setSharePassword] = useState('');
  const [generatingShare, setGeneratingShare] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPw, setCopiedPw] = useState(false);

  // Join trip modal
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleCreate = async () => {
    if (!form.Trip_Name.trim()) { setFormError('請輸入行程名稱'); return; }
    if (!form.Start_Date || !form.End_Date) { setFormError('請選擇出發和結束日期'); return; }
    if (form.Start_Date > form.End_Date) { setFormError('出發日期不能晚於結束日期'); return; }
    setSaving(true);
    setFormError('');
    try {
      const result = await api.createTrip(form);
      if (result.success) {
        showToast('行程已建立！');
        setShowCreate(false);
        setForm({ Trip_Name: '', Start_Date: '', End_Date: '', Base_Currency: 'HKD' });
        await fetchTrips();
        navigate(`/trip/${result.data.Trip_ID}`);
      }
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteTrip(deleteTarget.Trip_ID);
      showToast('行程已刪除');
      setDeleteTarget(null);
      await fetchTrips();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '刪除失敗', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenShare = async (trip: Trip) => {
    setShareTrip(trip);
    setShareCode(trip.Share_Code || '');
    setSharePassword(''); // Password is never stored/returned; only shown after generation
  };

  const handleGenerateShareCode = async () => {
    if (!shareTrip) return;
    setGeneratingShare(true);
    try {
      const result = await api.generateShareCode(shareTrip.Trip_ID);
      if (result.success) {
        setShareCode(result.data.shareCode);
        setSharePassword(result.data.sharePassword);
        showToast('分享碼已產生');
        await fetchTrips();
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '產生失敗', 'error');
    } finally {
      setGeneratingShare(false);
    }
  };

  const handleCopy = async (text: string, type: 'code' | 'pw') => {
    await navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedPw(true);
      setTimeout(() => setCopiedPw(false), 2000);
    }
  };

  const handleJoinTrip = async () => {
    if (!joinCode.trim() || !joinPassword.trim()) {
      setJoinError('請輸入分享碼和密碼');
      return;
    }
    setJoining(true);
    setJoinError('');
    try {
      const result = await api.joinTripByCode(joinCode.trim().toUpperCase(), joinPassword.trim());
      if (result.success) {
        showToast('已成功加入行程！');
        setShowJoin(false);
        setJoinCode('');
        setJoinPassword('');
        await fetchTrips();
        navigate(`/trip/${result.data.Trip_ID}`);
      } else {
        setJoinError(result.error || '分享碼或密碼不正確，請重新確認');
      }
    } catch (e: unknown) {
      setJoinError(e instanceof Error ? e.message : '加入失敗');
    } finally {
      setJoining(false);
    }
  };

  const getDuration = (start: string, end: string) => {
    if (!start || !end) return '';
    const parseDate = (d: string) => { const s = d.includes('T') ? d.slice(0, 10) : d; const [y, m, day] = s.split('-').map(Number); return new Date(y, m - 1, day); };
    const days = Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 86400000) + 1;
    return `${days} 天`;
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const dateStr = d.includes('T') ? d.slice(0, 10) : d;
    const [y, m, day] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const activeTrips = trips.filter(t => t.Status !== 'Deleted');
  const ownedTrips = activeTrips.filter(t => t.Is_Owner !== false);
  const sharedTrips = activeTrips.filter(t => t.Is_Owner === false);
  const liveTrip = activeTrips.find(t => getTripStatus(t.Start_Date, t.End_Date).label === '旅行中') || ownedTrips[0] || sharedTrips[0];

  return (
    <div className="space-y-7 sm:space-y-9 route-enter">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 text-white px-6 py-7 sm:px-9 sm:py-9 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0 route-grid opacity-40" />
        <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-blue-200 uppercase">
              <Compass size={15} /> Trip desk / {activeTrips.length} trips
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
              {liveTrip ? '你的旅程，都有下一步。' : '先建立一趟想出發的旅程。'}
            </h1>
            <p className="mt-3 max-w-xl text-sm sm:text-base leading-7 text-slate-300">
              {liveTrip
                ? `從「${liveTrip.Trip_Name}」繼續：規劃路線、記錄支出，或把最新進度分享給旅伴。`
                : '建立自己的行程，或使用旅伴提供的分享碼加入協作；需要的資訊會一步一步出現。'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowJoin(true)} className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <LogIn size={16} /> 加入旅伴行程
            </Button>
            <Button onClick={() => setShowCreate(true)} className="bg-blue-500 hover:bg-blue-400 focus:ring-blue-300 shadow-none">
              <CirclePlus size={17} /> 建立新行程
            </Button>
          </div>
        </div>

        {liveTrip && (
          <button
            onClick={() => navigate(`/trip/${liveTrip.Trip_ID}`)}
            className="relative mt-7 w-full max-w-3xl text-left flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 hover:bg-white/15 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shrink-0"><Plane size={18} className="-rotate-12" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] tracking-[0.14em] font-bold text-blue-200 uppercase">{getTripStatus(liveTrip.Start_Date, liveTrip.End_Date).label}</p>
              <p className="mt-0.5 font-semibold truncate">{liveTrip.Trip_Name}</p>
            </div>
            <div className="hidden sm:block text-right text-xs text-slate-300">
              <p>{formatDate(liveTrip.Start_Date)} — {formatDate(liveTrip.End_Date)}</p>
              <p className="mt-0.5 text-blue-200 font-semibold">{getTripStatus(liveTrip.Start_Date, liveTrip.End_Date).daysText}</p>
            </div>
            <ArrowRight size={18} className="text-blue-200 shrink-0" />
          </button>
        )}
      </section>

      {tripsLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : activeTrips.length === 0 ? (
        <section className="bg-white border border-slate-200 rounded-[1.5rem] p-6 sm:p-8 route-enter-delay">
          <p className="text-xs font-bold text-blue-600 tracking-[0.14em] uppercase">First trip</p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">從一個目的地和日期開始就夠了。</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">建立後，你可以再補航班、住宿、每日安排和支出；也可以隨時邀請旅伴一起完成。</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ['01', '建立行程', '設定名稱、日期與基礎貨幣'],
              ['02', '安排下一站', '先新增最重要的一天或一筆預訂'],
              ['03', '邀請旅伴', '產生分享碼後一起更新'],
            ].map(([index, title, description]) => (
              <div key={index} className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                <span className="text-xs font-bold text-blue-600">{index}</span>
                <p className="mt-2 font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="space-y-8 route-enter-delay">
          {/* 我的行程 */}
          {ownedTrips.length > 0 && (
            <div>
              {sharedTrips.length > 0 && (
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.14em] mb-3">我建立的行程</h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {ownedTrips.map(trip => (
                  <TripCard
                    key={trip.Trip_ID}
                    trip={trip}
                    isOwner={true}
                    formatDate={formatDate}
                    getDuration={getDuration}
                    onNavigate={() => navigate(`/trip/${trip.Trip_ID}`)}
                    onDelete={() => setDeleteTarget(trip)}
                    onShare={() => handleOpenShare(trip)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 協作行程 */}
          {sharedTrips.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.14em] mb-3 flex items-center gap-2">
                <Users size={14} /> 協作行程
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sharedTrips.map(trip => (
                  <TripCard
                    key={trip.Trip_ID}
                    trip={trip}
                    isOwner={false}
                    formatDate={formatDate}
                    getDuration={getDuration}
                    onNavigate={() => navigate(`/trip/${trip.Trip_ID}`)}
                    onDelete={null}
                    onShare={null}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 新增行程 Modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setFormError(''); }}
        title="新增行程"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} loading={saving}>建立行程</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="行程名稱" required placeholder="例如：東京五日遊" value={form.Trip_Name}
            onChange={e => setForm(f => ({ ...f, Trip_Name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="出發日期" required type="date" value={form.Start_Date}
              onChange={e => setForm(f => ({ ...f, Start_Date: e.target.value }))} />
            <Input label="結束日期" required type="date" value={form.End_Date}
              onChange={e => setForm(f => ({ ...f, End_Date: e.target.value }))} />
          </div>
          <Select label="基礎貨幣" required value={form.Base_Currency}
            onChange={e => setForm(f => ({ ...f, Base_Currency: e.target.value }))}
            options={CURRENCIES.map(c => ({ value: c, label: c }))} />
          {formError && <p className="text-sm text-red-500">{formError}</p>}
        </div>
      </Modal>

      {/* 分享行程 Modal */}
      <Modal
        open={!!shareTrip}
        onClose={() => setShareTrip(null)}
        title="分享行程"
        footer={<Button variant="outline" onClick={() => setShareTrip(null)}>關閉</Button>}
      >
        <div className="flex flex-col gap-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-blue-700 font-medium mb-1">邀請協作者</p>
            <p className="text-xs text-blue-600">分享以下分享碼和密碼給協作者，他們可以在「加入行程」中輸入後加入。協作者可以新增、編輯和刪除所有行程內容，但無法刪除行程本身。</p>
          </div>

          {shareCode ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-slate-500 block mb-1">分享碼</label>
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                    <span className="font-mono font-bold text-lg text-slate-900 tracking-widest flex-1">{shareCode}</span>
                    <button onClick={() => handleCopy(shareCode, 'code')}
                      className="p-1 text-slate-400 hover:text-blue-500 transition-colors">
                      {copiedCode ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-slate-500 block mb-1">密碼</label>
                  {sharePassword ? (
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                      <span className="font-mono font-bold text-lg text-slate-900 tracking-widest flex-1">{sharePassword}</span>
                      <button onClick={() => handleCopy(sharePassword, 'pw')}
                        className="p-1 text-slate-400 hover:text-blue-500 transition-colors">
                        {copiedPw ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                      <span className="text-xs text-amber-700">密碼僅在產生時顯示一次，如遺忘請重新產生</span>
                    </div>
                  )}
                </div>
              </div>
              {sharePassword ? (
                <button
                  onClick={() => handleCopy(`分享碼：${shareCode}\n密碼：${sharePassword}`, 'code')}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                  <Link2 size={14} /> 複製分享碼和密碼
                </button>
              ) : (
                <button
                  onClick={() => handleCopy(shareCode, 'code')}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                  <Link2 size={14} /> 複製分享碼
                </button>
              )}
              <Button variant="outline" size="sm" onClick={handleGenerateShareCode} loading={generatingShare} className="w-full">
                重新產生分享碼
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <Share2 size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-500 mb-4">尚未產生分享碼</p>
              <Button onClick={handleGenerateShareCode} loading={generatingShare}>
                <Share2 size={14} /> 產生分享碼
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* 加入行程 Modal */}
      <Modal
        open={showJoin}
        onClose={() => { setShowJoin(false); setJoinCode(''); setJoinPassword(''); setJoinError(''); }}
        title="加入行程"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowJoin(false)}>取消</Button>
            <Button onClick={handleJoinTrip} loading={joining}>加入行程</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">請向行程擁有者索取分享碼和密碼，輸入後即可加入協作。</p>
          </div>
          <Input label="分享碼" required placeholder="例如：ABC123" value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())} />
          <Input label="密碼" required placeholder="輸入密碼" value={joinPassword}
            onChange={e => setJoinPassword(e.target.value)} />
          {joinError && <p className="text-sm text-red-500">{joinError}</p>}
        </div>
      </Modal>

      {/* 刪除確認（只有擁有者可刪除） */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="刪除行程"
        message={`確定要刪除「${deleteTarget?.Trip_Name}」嗎？此操作無法復原，相關的行程和支出資料都將一併刪除。`}
        loading={deleting}
      />
    </div>
  );
}

// Trip Card Component
interface TripCardProps {
  trip: Trip;
  isOwner: boolean;
  formatDate: (d: string) => string;
  getDuration: (start: string, end: string) => string;
  onNavigate: () => void;
  onDelete: (() => void) | null;
  onShare: (() => void) | null;
}

function getTripStatus(start: string, end: string): { label: string; color: string; daysText: string } {
  const parseDate = (d: string) => { const s = d.includes('T') ? d.slice(0, 10) : d; const [y, m, day] = s.split('-').map(Number); return new Date(y, m - 1, day); };
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  const diffStart = Math.ceil((startDate.getTime() - now.getTime()) / 86400000);
  const diffEnd = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);
  if (diffStart > 0) {
    return { label: '計劃中', color: 'bg-blue-100 text-blue-700', daysText: `${diffStart} 天後出發` };
  } else if (diffEnd >= 0) {
    const dayNum = Math.abs(diffStart) + 1;
    return { label: '旅行中', color: 'bg-emerald-100 text-emerald-700', daysText: `第 ${dayNum} 天` };
  } else {
    return { label: '已結束', color: 'bg-slate-100 text-slate-500', daysText: '已完成' };
  }
}

function TripCard({ trip, isOwner, formatDate, getDuration, onNavigate, onDelete, onShare }: TripCardProps) {
  const status = getTripStatus(trip.Start_Date, trip.End_Date);
  return (
    <Card className="group overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.10)] transition-all cursor-pointer border-slate-200">
      <div onClick={onNavigate} className="p-5" role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onNavigate(); }}>
        <div className="flex items-start justify-between mb-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isOwner ? 'bg-blue-50' : 'bg-violet-50'}`}>
            {isOwner ? <Plane size={20} className="text-blue-600 -rotate-12" /> : <Users size={20} className="text-violet-600" />}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
              {status.label}
            </span>
            {!isOwner && (
              <span className="text-xs font-medium bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">協作</span>
            )}
            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
              {trip.Base_Currency}
            </span>
          </div>
        </div>
        <h3 className="font-bold text-slate-950 text-base mb-2 line-clamp-2">{trip.Trip_Name}</h3>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
          <Calendar size={13} />
          <span>{formatDate(trip.Start_Date)} — {formatDate(trip.End_Date)}</span>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin size={13} />
            <span>{getDuration(trip.Start_Date, trip.End_Date)}</span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600">繼續規劃 <ArrowRight size={14} /></span>
        </div>
      </div>
      {isOwner && (
        <div className="px-5 pb-4 flex justify-between items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.color}`}>{status.daysText}</span>
          <div className="flex gap-1">
          {onShare && (
            <button
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
              title="分享行程"
            >
              <Share2 size={15} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="刪除行程（僅擁有者）"
            >
              <Trash2 size={15} />
            </button>
          )}
          </div>
        </div>
      )}
    </Card>
  );
}
