import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
/*
 * Design system: "Trip entry gallery" — the home screen exposes only the
 * requested trip passes. All operational tools appear after a trip is opened.
 */
import { Plane, Calendar, Trash2, MapPin, Share2, Users, Link2, Copy, Check, ArrowRight, CirclePlus } from 'lucide-react';
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
  const homeTripNames = new Set(['2026 8月 大阪京都', '2026 6月京都']);
  const homeTrips = activeTrips.filter(trip => homeTripNames.has(trip.Trip_Name));

  return (
    <div className="space-y-6 route-enter">
      {tripsLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : homeTrips.length === 0 ? (
        <section className="rounded-[1.5rem] border border-[#e3ddcf] bg-white p-6 shadow-[0_12px_28px_rgba(17,17,17,0.06)] sm:p-8 route-enter-delay">
          <p className="portal-eyebrow text-[#9a7100]">TRIP / SELECT</p>
          <h2 className="mt-2 text-xl font-extrabold text-[#111111]">找不到可開啟的指定行程。</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">請確認你已加入「2026 8月 大阪京都」或「2026 6月京都」。</p>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 route-enter-delay sm:grid-cols-2">
          {homeTrips.map(trip => (
            <TripCard
              key={trip.Trip_ID}
              trip={trip}
              isOwner={trip.Is_Owner !== false}
              formatDate={formatDate}
              getDuration={getDuration}
              onNavigate={() => navigate(`/trip/${trip.Trip_ID}`)}
              onDelete={null}
              onShare={null}
            />
          ))}
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
    return { label: '計劃中', color: 'bg-[#fff3c4] text-[#8a6500]', daysText: `${diffStart} 天後出發` };
  } else if (diffEnd >= 0) {
    const dayNum = Math.abs(diffStart) + 1;
    return { label: '旅行中', color: 'bg-[#111111] text-[#ffc91a]', daysText: `第 ${dayNum} 天` };
  } else {
    return { label: '已結束', color: 'bg-[#ece7da] text-slate-500', daysText: '已完成' };
  }
}

function TripCard({ trip, isOwner, formatDate, getDuration, onNavigate, onDelete, onShare }: TripCardProps) {
  const status = getTripStatus(trip.Start_Date, trip.End_Date);
  return (
    <Card className="group cursor-pointer overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(17,17,17,0.10)]">
      <div onClick={onNavigate} className="p-5" role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onNavigate(); }}>
        <div className="flex items-start justify-between mb-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isOwner ? 'bg-[#fff3c4]' : 'bg-[#ece7da]'}`}>
            {isOwner ? <Plane size={20} className="-rotate-12 text-[#9a7100]" /> : <Users size={20} className="text-slate-600" />}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
              {status.label}
            </span>
            {!isOwner && (
              <span className="rounded-full bg-[#ece7da] px-2 py-0.5 text-xs font-medium text-slate-600">協作</span>
            )}
            <span className="rounded-full bg-[#f5f2e8] px-2 py-1 text-xs font-medium text-slate-600">
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
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#9a7100]">繼續規劃 <ArrowRight size={14} /></span>
        </div>
      </div>
      {isOwner && (
        <div className="px-5 pb-4 flex justify-between items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.color}`}>{status.daysText}</span>
          <div className="flex gap-1">
          {onShare && (
            <button
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-[#fff3c4] hover:text-[#9a7100]"
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
