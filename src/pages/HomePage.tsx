import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Plane, Calendar, Trash2, MapPin, Share2, Users, Link2, Copy, Check, LogIn } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, Trip } from '../api/supabaseApi';
import { Button, Card, Modal, Input, Select, EmptyState, ConfirmDialog, Spinner } from '../components/ui';

const CURRENCIES = ['HKD','TWD','JPY','KRW','USD','EUR','GBP','CNY','SGD','THB','MYR'];

export default function HomePage() {
  const navigate = useNavigate();
  const { trips, tripsLoading, fetchTrips, isConfigured, showToast } = useApp();

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
    if (isConfigured) fetchTrips();
  }, [isConfigured, fetchTrips]);

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
    } catch (e: any) {
      setFormError(e.message || '建立失敗');
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
    } catch (e: any) {
      showToast(e.message || '刪除失敗', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenShare = async (trip: Trip) => {
    setShareTrip(trip);
    setShareCode(trip.Share_Code || '');
    setSharePassword(trip.Share_Password || '');
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
    } catch (e: any) {
      showToast(e.message || '產生失敗', 'error');
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
      const result = await api.joinTripByCode(joinCode.trim().toUpperCase(), joinPassword.trim().toUpperCase());
      if (result.success) {
        showToast('已成功加入行程！');
        setShowJoin(false);
        setJoinCode('');
        setJoinPassword('');
        await fetchTrips();
        navigate(`/trip/${result.data.Trip_ID}`);
      } else {
        setJoinError('分享碼或密碼不正確，請重新確認');
      }
    } catch (e: any) {
      setJoinError(e.message || '加入失敗');
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">我的行程</h1>
          <p className="text-sm text-slate-500 mt-0.5">共 {activeTrips.length} 個行程</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowJoin(true)}>
            <LogIn size={15} /> 加入行程
          </Button>
          <Button onClick={() => setShowCreate(true)} disabled={!isConfigured}>
            <Plus size={16} /> 新增行程
          </Button>
        </div>
      </div>

      {tripsLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : activeTrips.length === 0 ? (
        <EmptyState
          icon={<Plane size={48} />}
          title="還沒有行程"
          description={isConfigured ? '點擊「新增行程」開始規劃您的旅程，或「加入行程」使用分享碼加入他人行程' : '請先在設定頁面輸入後端 URL'}
          action={isConfigured ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowJoin(true)}><LogIn size={15} /> 加入行程</Button>
              <Button onClick={() => setShowCreate(true)}><Plus size={16} /> 新增行程</Button>
            </div>
          ) : undefined}
        />
      ) : (
        <div className="space-y-6">
          {/* 我的行程 */}
          {ownedTrips.length > 0 && (
            <div>
              {sharedTrips.length > 0 && (
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">我建立的行程</h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
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
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                    <span className="font-mono font-bold text-lg text-slate-900 tracking-widest flex-1">{sharePassword}</span>
                    <button onClick={() => handleCopy(sharePassword, 'pw')}
                      className="p-1 text-slate-400 hover:text-blue-500 transition-colors">
                      {copiedPw ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleCopy(`分享碼：${shareCode}\n密碼：${sharePassword}`, 'code')}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                <Link2 size={14} /> 複製分享碼和密碼
              </button>
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
          <Input label="密碼" required placeholder="例如：XYZ789" value={joinPassword}
            onChange={e => setJoinPassword(e.target.value.toUpperCase())} />
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

function TripCard({ trip, isOwner, formatDate, getDuration, onNavigate, onDelete, onShare }: TripCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
      <div onClick={onNavigate} className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOwner ? 'bg-blue-100' : 'bg-purple-100'}`}>
            {isOwner ? <Plane size={20} className="text-blue-600" /> : <Users size={20} className="text-purple-600" />}
          </div>
          <div className="flex items-center gap-1.5">
            {!isOwner && (
              <span className="text-xs font-medium bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">協作</span>
            )}
            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
              {trip.Base_Currency}
            </span>
          </div>
        </div>
        <h3 className="font-semibold text-slate-900 text-base mb-2 line-clamp-2">{trip.Trip_Name}</h3>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
          <Calendar size={13} />
          <span>{formatDate(trip.Start_Date)} — {formatDate(trip.End_Date)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin size={13} />
          <span>{getDuration(trip.Start_Date, trip.End_Date)}</span>
        </div>
      </div>
      {isOwner && (
        <div className="px-5 pb-4 flex justify-end gap-1">
          {onShare && (
            <button
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
              title="分享行程"
            >
              <Share2 size={15} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
              title="刪除行程（僅擁有者）"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
