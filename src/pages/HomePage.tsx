import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Plane, Calendar, Trash2, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, Trip } from '../api/gasApi';
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

  const getDuration = (start: string, end: string) => {
    if (!start || !end) return '';
    // 直接解析 YYYY-MM-DD 避免 UTC 時區偏移問題
    const parseDate = (d: string) => { const s = d.includes('T') ? d.slice(0, 10) : d; const [y, m, day] = s.split('-').map(Number); return new Date(y, m - 1, day); };
    const days = Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 86400000) + 1;
    return `${days} 天`;
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    // 直接解析 YYYY-MM-DD 避免 UTC 時區偏移問題
    const dateStr = d.includes('T') ? d.slice(0, 10) : d;
    const [y, m, day] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const activeTrips = trips.filter(t => t.Status !== 'Deleted');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">我的行程</h1>
          <p className="text-sm text-slate-500 mt-0.5">共 {activeTrips.length} 個行程</p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={!isConfigured}>
          <Plus size={16} /> 新增行程
        </Button>
      </div>

      {tripsLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : activeTrips.length === 0 ? (
        <EmptyState
          icon={<Plane size={48} />}
          title="還沒有行程"
          description={isConfigured ? '點擊「新增行程」開始規劃您的旅程' : '請先在設定頁面輸入後端 URL'}
          action={isConfigured ? <Button onClick={() => setShowCreate(true)}><Plus size={16} /> 新增行程</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTrips.map(trip => (
            <Card
              key={trip.Trip_ID}
              className="hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div onClick={() => navigate(`/trip/${trip.Trip_ID}`)} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Plane size={20} className="text-blue-600" />
                  </div>
                  <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                    {trip.Base_Currency}
                  </span>
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
              <div className="px-5 pb-4 flex justify-end">
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(trip); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  title="刪除行程"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </Card>
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
          <Input
            label="行程名稱"
            required
            placeholder="例如：東京五日遊"
            value={form.Trip_Name}
            onChange={e => setForm(f => ({ ...f, Trip_Name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="出發日期"
              required
              type="date"
              value={form.Start_Date}
              onChange={e => setForm(f => ({ ...f, Start_Date: e.target.value }))}
            />
            <Input
              label="結束日期"
              required
              type="date"
              value={form.End_Date}
              onChange={e => setForm(f => ({ ...f, End_Date: e.target.value }))}
            />
          </div>
          <Select
            label="基礎貨幣"
            required
            value={form.Base_Currency}
            onChange={e => setForm(f => ({ ...f, Base_Currency: e.target.value }))}
            options={CURRENCIES.map(c => ({ value: c, label: c }))}
          />
          {formError && <p className="text-sm text-red-500">{formError}</p>}
        </div>
      </Modal>

      {/* 刪除確認 */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="刪除行程"
        message={`確定要刪除「${deleteTarget?.Trip_Name}」嗎？此操作無法復原，相關的航班、住宿、行程和支出資料都將一併刪除。`}
        loading={deleting}
      />
    </div>
  );
}
