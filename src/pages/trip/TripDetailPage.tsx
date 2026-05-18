import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plane, Map, DollarSign, Sparkles, Edit2, Check, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api, Trip } from '../../api/gasApi';
import { Button, TabBar, Spinner, Input, Select } from '../../components/ui';
import InfoTab from './InfoTab';
import ItineraryTab from './ItineraryTab';
import ExpensesTab from './ExpensesTab';
import AITab from './AITab';

const CURRENCIES = ['HKD','TWD','JPY','KRW','USD','EUR','GBP','CNY','SGD','THB','MYR'];

const TABS = [
  { id: 'info', label: '資訊總結', icon: <Plane size={15} /> },
  { id: 'itinerary', label: '行程總表', icon: <Map size={15} /> },
  { id: 'expenses', label: '支出總表', icon: <DollarSign size={15} /> },
  { id: 'ai', label: 'AI 注意事項', icon: <Sparkles size={15} /> },
];

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { showToast } = useApp();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

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
    } catch (e: any) {
      showToast(e.message || '更新失敗', 'error');
    } finally {
      setSavingName(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    // normalizeDateStr 已在 API 層處理，這裡直接解析 YYYY-MM-DD
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

  return (
    <div>
      {/* 頂部行程資訊 */}
      <div className="mb-4">
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors">
          <ArrowLeft size={16} /> 返回行程列表
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          {editingName ? (
            <div className="flex flex-col gap-3">
              <Input label="行程名稱" value={editName} onChange={e => setEditName(e.target.value)} required />
              <div className="grid grid-cols-2 gap-3">
                <Input label="出發日期" type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} />
                <Input label="結束日期" type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} />
              </div>
              <Select label="基礎貨幣" value={editCurrency} onChange={e => setEditCurrency(e.target.value)}
                options={CURRENCIES.map(c => ({ value: c, label: c }))} />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditingName(false)}><X size={14} /> 取消</Button>
                <Button size="sm" onClick={handleSaveName} loading={savingName}><Check size={14} /> 儲存</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900 mb-1">{trip.Trip_Name}</h1>
                <p className="text-sm text-slate-500">
                  {formatDate(trip.Start_Date)} — {formatDate(trip.End_Date)}
                  <span className="mx-2">·</span>
                  <span className="font-medium text-blue-600">{trip.Base_Currency}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setEditName(trip.Trip_Name);
                  setEditStartDate(trip.Start_Date);
                  setEditEndDate(trip.End_Date);
                  setEditCurrency(trip.Base_Currency);
                  setEditingName(true);
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Edit2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab 導航 */}
      <div className="bg-white rounded-t-2xl border border-slate-200 border-b-0 overflow-hidden">
        <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab 內容 */}
      <div className="bg-white rounded-b-2xl border border-slate-200 border-t-0 shadow-sm min-h-96">
        {activeTab === 'info' && <InfoTab trip={trip} />}
        {activeTab === 'itinerary' && <ItineraryTab trip={trip} />}
        {activeTab === 'expenses' && <ExpensesTab trip={trip} />}
        {activeTab === 'ai' && <AITab trip={trip} />}
      </div>
    </div>
  );
}
