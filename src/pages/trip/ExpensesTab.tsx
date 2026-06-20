import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, DollarSign, BarChart2, RefreshCw, ArrowRight, Table2, CheckCircle2, Circle, UserCog, ChevronDown, ChevronRight, GripVertical, Download } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api, Trip, Expense, TripMember, Settlement } from '../../api/supabaseApi';
import { Button, Modal, Input, Select, EmptyState, ConfirmDialog, Spinner, Badge, Card } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import ExpenseBreakdownTab from './ExpenseBreakdownTab';
import SettlementTab from './SettlementTab';

interface Props { trip: Trip; }

const CURRENCIES = ['HKD','TWD','JPY','KRW','USD','EUR','GBP','CNY','SGD','THB','MYR'];

// Sortable expense item component
function SortableExpenseItem({ exp, trip, isSettled, settlingExpenseId, onToggleSettled, onEdit, onDelete }: {
  exp: Expense;
  trip: Trip;
  isSettled: boolean;
  settlingExpenseId: string | null;
  onToggleSettled: (exp: Expense) => void;
  onEdit: (exp: Expense) => void;
  onDelete: (exp: Expense) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exp.Expense_ID });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style}
      className={`flex items-start gap-2 p-3 rounded-xl border transition-all ${
        isSettled ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 hover:border-blue-200'
      }`}>
      {/* Drag handle */}
      <button {...attributes} {...listeners}
        className="drag-handle p-1 text-slate-300 hover:text-slate-500 flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing touch-none">
        <GripVertical size={15} />
      </button>
      {/* Settled toggle */}
      <button onClick={() => onToggleSettled(exp)} className="mt-0.5 flex-shrink-0">
        {settlingExpenseId === exp.Expense_ID
          ? <Spinner />
          : isSettled
            ? <CheckCircle2 size={18} className="text-emerald-500" />
            : <Circle size={18} className="text-slate-300" />}
      </button>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${isSettled ? 'line-through text-slate-400' : 'text-slate-900'}`}>
            {exp.Main_Category}{exp.Sub_Category ? ` / ${exp.Sub_Category}` : ''}
          </span>
          {exp.Note && <span className="text-xs text-slate-400 truncate">{exp.Note}</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-slate-400">付款：{exp.Payer}</span>
          {exp.Splitters && <span className="text-xs text-slate-400">分帳：{exp.Splitters}</span>}
        </div>
      </div>
      {/* Amount + actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="text-right">
          <p className="text-sm font-bold text-slate-900">
            {trip.Base_Currency} {parseFloat(String(exp.Base_Amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {exp.Currency !== trip.Base_Currency && (
            <p className="text-xs text-slate-400">{exp.Currency} {parseFloat(String(exp.Original_Amount || 0)).toLocaleString()}</p>
          )}
        </div>
        <button onClick={() => onEdit(exp)}
          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
          <Edit2 size={14} />
        </button>
        <button onClick={() => onDelete(exp)}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default function ExpensesTab({ trip }: Props) {
  const { showToast, categories, fetchCategories } = useApp();
  const { user: currentUser } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tripMembers, setTripMembers] = useState<TripMember[]>([]);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'breakdown' | 'settlement' | 'members'>('list');

  // Expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState<Partial<Expense> & { splitterIds: string[] }>({
    Date: '', Main_Category: '', Sub_Category: '', Note: '',
    Original_Amount: '', Currency: trip.Base_Currency,
    Exchange_Rate: '1', Payer: '', splitterIds: [],
    Flight_No: '', Airline: '', Departure_Location: '', Arrival_Location: '',
    Flight_Date: '', Departure_Time: '', Landing_Time: '', Arrival_Date: '', Arrival_Time: '', Return_Landing_Time: '', Flight_Status: '',
    Accommodation_Name: '', Accommodation_Address: '', Check_In_Date: '', Check_Out_Date: '',
    Rail_Start_Date: '', Rail_End_Date: '', Rail_Order_No: '', Rail_Platform: '',
    Is_Booking: false,
  });
  const [savingExpense, setSavingExpense] = useState(false);
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState(false);
  const [exchangeRateLoading, setExchangeRateLoading] = useState(false);
  const [settlingExpenseId, setSettlingExpenseId] = useState<string | null>(null);

  // Member name editing
  const [editingMember, setEditingMember] = useState<TripMember | null>(null);
  const [newMemberName, setNewMemberName] = useState('');
  const [savingMemberName, setSavingMemberName] = useState(false);

  // Collapsible date groups
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const toggleDate = (date: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  // Expense order (local-only, for drag-to-reorder within each date group)
  const [expenseOrder, setExpenseOrder] = useState<Record<string, string[]>>({});

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleExpenseDragEnd = (event: DragEndEvent, date: string, dateExpenses: Expense[]) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = dateExpenses.findIndex(e => e.Expense_ID === active.id);
    const newIndex = dateExpenses.findIndex(e => e.Expense_ID === over.id);
    const reordered = arrayMove(dateExpenses, oldIndex, newIndex);
    setExpenseOrder(prev => ({ ...prev, [date]: reordered.map(e => e.Expense_ID) }));
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [exp, tm] = await Promise.all([
        api.getExpenses(trip.Trip_ID),
        api.getTripMembers(trip.Trip_ID),
      ]);
      setExpenses((exp as any).data || []);
      setTripMembers((tm as any).data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchSettlement = async () => {
    setSettlementLoading(true);
    try {
      const result = await api.getSettlement(trip.Trip_ID);
      setSettlement((result as any).data);
    } catch (e: any) { showToast(e.message || '計算失敗', 'error'); }
    finally { setSettlementLoading(false); }
  };

  useEffect(() => {
    fetchAll();
    fetchCategories();
  }, [trip.Trip_ID]);

  useEffect(() => {
    if (activeSubTab === 'settlement') fetchSettlement();
  }, [activeSubTab]);

  const activeCategories = categories.filter(c => String(c.Is_Active).toUpperCase() === 'TRUE');

  // 主分類 → 子分類 映射
  const catMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    activeCategories.forEach(c => {
      if (!map[c.Main_Category]) map[c.Main_Category] = [];
      if (!map[c.Main_Category].includes(c.Sub_Category)) map[c.Main_Category].push(c.Sub_Category);
    });
    return map;
  }, [activeCategories]);

  const mainCategories = Object.keys(catMap);
  const subCategories = expenseForm.Main_Category ? (catMap[expenseForm.Main_Category] || []) : [];

  // 取得匯率
  const fetchExchangeRate = async () => {
    if (!expenseForm.Currency || expenseForm.Currency === trip.Base_Currency) {
      setExpenseForm(f => ({ ...f, Exchange_Rate: '1' }));
      return;
    }
    setExchangeRateLoading(true);
    try {
      const result = await api.getExchangeRate(expenseForm.Currency, trip.Base_Currency);
      setExpenseForm(f => ({ ...f, Exchange_Rate: String(result.rate) }));
      showToast(`匯率已更新：1 ${expenseForm.Currency} = ${result.rate} ${trip.Base_Currency}`);
    } catch (e: any) {
      showToast(e.message || '取得匯率失敗', 'error');
    } finally {
      setExchangeRateLoading(false);
    }
  };

  // 計算基礎金額
  const baseAmount = useMemo(() => {
    const amt = parseFloat(String(expenseForm.Original_Amount)) || 0;
    const rate = parseFloat(String(expenseForm.Exchange_Rate)) || 1;
    return (amt * rate).toFixed(2);
  }, [expenseForm.Original_Amount, expenseForm.Exchange_Rate]);

  const openExpenseModal = (expense?: Expense) => {
    setEditExpense(expense || null);
    if (expense) {
      const splitterIds = expense.Splitters ? expense.Splitters.split(',').map(s => s.trim()).filter(Boolean) : [];
      setExpenseForm({
        Date: expense.Date || '',
        Main_Category: expense.Main_Category || '',
        Sub_Category: expense.Sub_Category || '',
        Note: expense.Note || '',
        Original_Amount: String(expense.Original_Amount || ''),
        Currency: expense.Currency || trip.Base_Currency,
        Exchange_Rate: String(expense.Exchange_Rate || '1'),
        Payer: expense.Payer || '',
        splitterIds,
        Flight_No: expense.Flight_No || '',
        Airline: expense.Airline || '',
        Departure_Location: expense.Departure_Location || '',
        Arrival_Location: expense.Arrival_Location || '',
        Flight_Date: expense.Flight_Date || '',
        Departure_Time: expense.Departure_Time || '',
        Landing_Time: expense.Landing_Time || '',
        Arrival_Date: expense.Arrival_Date || '',
        Arrival_Time: expense.Arrival_Time || '',
        Return_Landing_Time: expense.Return_Landing_Time || '',
        Flight_Status: expense.Flight_Status || '',
        Accommodation_Name: expense.Accommodation_Name || '',
        Accommodation_Address: expense.Accommodation_Address || '',
        Check_In_Date: expense.Check_In_Date || '',
        Check_Out_Date: expense.Check_Out_Date || '',
        Rail_Start_Date: expense.Rail_Start_Date || '',
        Rail_End_Date: expense.Rail_End_Date || '',
        Rail_Order_No: expense.Rail_Order_No || '',
        Rail_Platform: expense.Rail_Platform || '',
        Is_Booking: expense.Is_Booking || false,
      });
    } else {
      setExpenseForm({
        Date: new Date().toISOString().slice(0, 10),
        Main_Category: mainCategories[0] || '',
        Sub_Category: '',
        Note: '',
        Original_Amount: '',
        Currency: trip.Base_Currency,
        Exchange_Rate: '1',
        Payer: tripMembers[0]?.Member_Name || '',
        splitterIds: tripMembers.map(m => m.Member_Name),
      });
    }
    setShowExpenseModal(true);
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.Original_Amount || parseFloat(String(expenseForm.Original_Amount)) <= 0) {
      showToast('請輸入有效金額', 'error'); return;
    }
    if (!expenseForm.Payer) { showToast('請選擇付款人', 'error'); return; }
    setSavingExpense(true);
    try {
      const isFlightCategory = expenseForm.Main_Category === '機票' || expenseForm.Sub_Category === '機票';
      const isAccommodationCategory = expenseForm.Main_Category === '住宿' || expenseForm.Sub_Category === '住宿';
      const payload: Partial<Expense> = {
        Trip_ID: trip.Trip_ID,
        Date: expenseForm.Date,
        Main_Category: expenseForm.Main_Category,
        Sub_Category: expenseForm.Sub_Category,
        Note: expenseForm.Note,
        Original_Amount: parseFloat(String(expenseForm.Original_Amount)),
        Currency: expenseForm.Currency,
        Exchange_Rate: parseFloat(String(expenseForm.Exchange_Rate)) || 1,
        Base_Amount: parseFloat(baseAmount),
        Payer: expenseForm.Payer,
        Splitters: expenseForm.splitterIds?.join(',') || '',
        ...(isFlightCategory ? {
          Flight_No: expenseForm.Flight_No,
          Airline: expenseForm.Airline,
          Departure_Location: expenseForm.Departure_Location,
          Arrival_Location: expenseForm.Arrival_Location,
          Flight_Date: expenseForm.Flight_Date,
          Departure_Time: expenseForm.Departure_Time,
          Landing_Time: expenseForm.Landing_Time,
          Arrival_Date: expenseForm.Arrival_Date,
          Arrival_Time: expenseForm.Arrival_Time,
          Return_Landing_Time: expenseForm.Return_Landing_Time,
          Flight_Status: expenseForm.Flight_Status,
        } : {}),
        ...(isAccommodationCategory ? {
          Accommodation_Name: expenseForm.Accommodation_Name,
          Accommodation_Address: expenseForm.Accommodation_Address,
          Check_In_Date: expenseForm.Check_In_Date,
          Check_Out_Date: expenseForm.Check_Out_Date,
        } : {}),
        Rail_Start_Date: expenseForm.Rail_Start_Date || undefined,
        Rail_End_Date: expenseForm.Rail_End_Date || undefined,
        Rail_Order_No: expenseForm.Rail_Order_No || undefined,
        Rail_Platform: expenseForm.Rail_Platform || undefined,
        Is_Booking: expenseForm.Is_Booking,
      };
      if (editExpense) {
        await api.updateExpense(editExpense.Expense_ID, payload);
      } else {
        await api.createExpense(payload);
      }
      showToast(editExpense ? '支出已更新' : '支出已新增');
      setShowExpenseModal(false);
      await fetchAll();
    } catch (e: any) { showToast(e.message || '儲存失敗', 'error'); }
    finally { setSavingExpense(false); }
  };

  const handleToggleSettled = async (exp: Expense) => {
    const newVal = !(String(exp.Is_Settled).toUpperCase() === 'TRUE' || exp.Is_Settled === true);
    setSettlingExpenseId(exp.Expense_ID);
    try {
      await api.updateExpense(exp.Expense_ID, { Is_Settled: newVal ? 'TRUE' : 'FALSE' } as any);
      setExpenses(prev => prev.map(e =>
        e.Expense_ID === exp.Expense_ID ? { ...e, Is_Settled: newVal ? 'TRUE' : 'FALSE' } : e
      ));
      showToast(newVal ? '已標記為付清' : '已取消付清標記');
    } catch (e: any) { showToast(e.message || '更新失敗', 'error'); }
    finally { setSettlingExpenseId(null); }
  };

  const handleDeleteExpense = async () => {
    if (!deleteExpense) return;
    setDeletingExpense(true);
    try {
      await api.deleteExpense(deleteExpense.Expense_ID);
      showToast('支出已刪除');
      setDeleteExpense(null);
      await fetchAll();
    } catch (e: any) { showToast(e.message || '刪除失敗', 'error'); }
    finally { setDeletingExpense(false); }
  };

  const handleSaveMemberName = async () => {
    if (!editingMember) return;
    if (!newMemberName.trim()) { showToast('請輸入名稱', 'error'); return; }
    setSavingMemberName(true);
    try {
      await api.updateTripMemberName(trip.Trip_ID, editingMember.Is_Owner, newMemberName.trim());
      showToast('名稱已更新');
      setEditingMember(null);
      await fetchAll();
    } catch (e: any) { showToast(e.message || '更新失敗', 'error'); }
    finally { setSavingMemberName(false); }
  };

  // Download expenses as CSV
  const handleDownloadCSV = () => {
    const headers = [
      '日期', '主分類', '子分類', '備注',
      '貨幣', '原始金額', '匯率', `基礎金額(${trip.Base_Currency})`,
      '付款人', '分帳成員', '已付清',
      '航班號', '航空公司', '出發地', '目的地', '航班日期', '出發時間', '到達時間', '回程日期', '回程時間', '到港時間', '航班狀態',
      '住宿名稱', '住宿地址', '入住日期', '退房日期',
      '鐵路開始日期', '鐵路結束日期', '鐵路訂單號', '購買平台',
      '預訂資訊',
    ];
    const rows = expenses.map(exp => [
      exp.Date || '',
      exp.Main_Category || '',
      exp.Sub_Category || '',
      exp.Note || '',
      exp.Currency || '',
      exp.Original_Amount ?? '',
      exp.Exchange_Rate ?? '',
      exp.Base_Amount ?? '',
      exp.Payer || '',
      exp.Splitters || '',
      (String(exp.Is_Settled).toUpperCase() === 'TRUE' || exp.Is_Settled === true) ? '是' : '否',
      exp.Flight_No || '',
      exp.Airline || '',
      exp.Departure_Location || '',
      exp.Arrival_Location || '',
      exp.Flight_Date || '',
      exp.Departure_Time || '',
      exp.Landing_Time || '',
      exp.Arrival_Date || '',
      exp.Arrival_Time || '',
      exp.Return_Landing_Time || '',
      exp.Flight_Status || '',
      exp.Accommodation_Name || '',
      exp.Accommodation_Address || '',
      exp.Check_In_Date || '',
      exp.Check_Out_Date || '',
      exp.Rail_Start_Date || '',
      exp.Rail_End_Date || '',
      exp.Rail_Order_No || '',
      exp.Rail_Platform || '',
      exp.Is_Booking ? '是' : '否',
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.Trip_Name || '支出記錄'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV 已下載');
  };

  const toggleSplitter = (name: string) => {
    setExpenseForm(f => ({
      ...f,
      splitterIds: f.splitterIds?.includes(name)
        ? f.splitterIds.filter(s => s !== name)
        : [...(f.splitterIds || []), name],
    }));
  };

  // 已付清判斷工具
  const isSettled = (exp: Expense) => String(exp.Is_Settled).toUpperCase() === 'TRUE' || exp.Is_Settled === true;

  // 總計（含已付清）
  const totalBase = useMemo(() => expenses.reduce((sum, e) => sum + (parseFloat(String(e.Base_Amount)) || 0), 0), [expenses]);
  const unsettledTotal = useMemo(() => expenses.filter(e => !isSettled(e)).reduce((sum, e) => sum + (parseFloat(String(e.Base_Amount)) || 0), 0), [expenses]);

  const subTabs = [
    { id: 'list', label: '支出列表', icon: <DollarSign size={14} /> },
    { id: 'breakdown', label: '支出分析', icon: <BarChart2 size={14} /> },
    { id: 'settlement', label: '分帳結算', icon: <Table2 size={14} /> },
  ];

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="p-5">
      {/* Sub-tab bar */}
      <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1">
        {subTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all
              ${activeSubTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── 支出列表 ── */}
      {activeSubTab === 'list' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-500">
                合計：<span className="font-bold text-slate-900">{trip.Base_Currency} {totalBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                {unsettledTotal < totalBase && (
                  <span className="ml-2 text-xs text-amber-600">（未付清：{trip.Base_Currency} {unsettledTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}）</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleDownloadCSV} title="下載 CSV">
                <Download size={14} /> CSV
              </Button>
              <Button size="sm" onClick={() => openExpenseModal()}>
                <Plus size={14} /> 新增支出
              </Button>
            </div>
          </div>

          {expenses.length === 0 ? (
            <EmptyState icon={<DollarSign size={32} />} title="尚無支出記錄" description="點擊「新增支出」開始記錄" />
          ) : (
            <div className="space-y-2">
              {(() => {
                // Group expenses by date
                const groups: Record<string, Expense[]> = {};
                expenses.forEach(exp => {
                  const d = exp.Date || '（未填日期）';
                  if (!groups[d]) groups[d] = [];
                  groups[d].push(exp);
                });
                const sortedDates = Object.keys(groups).sort();
                return sortedDates.map(date => {
                  const isCollapsed = collapsedDates.has(date);
                  // Apply local drag order if exists
                  const order = expenseOrder[date];
                  const rawExpenses = groups[date];
                  const dateExpenses = order
                    ? [...rawExpenses].sort((a, b) => {
                        const ai = order.indexOf(a.Expense_ID);
                        const bi = order.indexOf(b.Expense_ID);
                        if (ai === -1 && bi === -1) return 0;
                        if (ai === -1) return 1;
                        if (bi === -1) return -1;
                        return ai - bi;
                      })
                    : rawExpenses;
                  const dateTotal = dateExpenses.reduce((s, e) => s + (parseFloat(String(e.Base_Amount)) || 0), 0);
                  return (
                    <div key={date} className="border border-slate-200 rounded-xl overflow-hidden">
                      {/* Date header - clickable to collapse */}
                      <div
                        className="flex items-center justify-between px-3 py-2.5 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => toggleDate(date)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">
                            {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                          </span>
                          <span className="text-xs font-semibold text-slate-700">{date}</span>
                          <span className="text-xs text-slate-400">{dateExpenses.length} 項</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-600">
                          {trip.Base_Currency} {dateTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {/* Date content */}
                      {!isCollapsed && (
                        <div className="p-2">
                          <DndContext sensors={sensors} collisionDetection={closestCenter}
                            onDragEnd={e => handleExpenseDragEnd(e, date, dateExpenses)}>
                            <SortableContext items={dateExpenses.map(e => e.Expense_ID)} strategy={verticalListSortingStrategy}>
                              <div className="space-y-1.5">
                                {dateExpenses.map(exp => (
                                  <SortableExpenseItem
                                    key={exp.Expense_ID}
                                    exp={exp}
                                    trip={trip}
                                    isSettled={isSettled(exp)}
                                    settlingExpenseId={settlingExpenseId}
                                    onToggleSettled={handleToggleSettled}
                                    onEdit={openExpenseModal}
                                    onDelete={setDeleteExpense}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── 支出分析 ── */}
      {activeSubTab === 'breakdown' && (
        <ExpenseBreakdownTab
          trip={trip}
          expenses={expenses}
          tripMembers={tripMembers}
          categories={activeCategories}
          loading={loading}
        />
      )}

      {/* ── 分帳結算 ── */}
      {activeSubTab === 'settlement' && (
        <SettlementTab
          trip={trip}
          settlement={settlement}
          settlementLoading={settlementLoading}
          fetchSettlement={fetchSettlement}
        />
      )}



      {/* ── 修改名稱 Modal ── */}
      <Modal open={!!editingMember} onClose={() => setEditingMember(null)} title="修改我的顯示名稱"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingMember(null)}>取消</Button>
            <Button onClick={handleSaveMemberName} loading={savingMemberName}>儲存</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">修改您在此行程中的顯示名稱（同時更新全域顯示名稱）</p>
          <Input
            label="顯示名稱"
            value={newMemberName}
            onChange={e => setNewMemberName(e.target.value)}
            placeholder="例如：Dicky、Alex"
            autoFocus
          />
        </div>
      </Modal>

      {/* ── 新增/編輯支出 Modal ── */}
      <Modal open={showExpenseModal} onClose={() => setShowExpenseModal(false)}
        title={editExpense ? '編輯支出' : '新增支出'} size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowExpenseModal(false)}>取消</Button>
            <Button onClick={handleSaveExpense} loading={savingExpense}>儲存</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input label="日期" type="date" required value={expenseForm.Date || ''}
            onChange={e => setExpenseForm(f => ({ ...f, Date: e.target.value }))} />
          <Select label="主分類" value={expenseForm.Main_Category || ''}
            onChange={e => setExpenseForm(f => ({ ...f, Main_Category: e.target.value, Sub_Category: '' }))}
            options={[{ value: '', label: '（選擇主分類）' }, ...mainCategories.map(c => ({ value: c, label: c }))]} />
          <Select label="子分類" value={expenseForm.Sub_Category || ''}
            onChange={e => setExpenseForm(f => ({ ...f, Sub_Category: e.target.value }))}
            options={[{ value: '', label: '（選擇子分類）' }, ...subCategories.map(c => ({ value: c, label: c }))]} />
          <Input label="備注" placeholder="可選" value={expenseForm.Note || ''}
            onChange={e => setExpenseForm(f => ({ ...f, Note: e.target.value }))} />
          <Select label="貨幣" value={expenseForm.Currency || trip.Base_Currency}
            onChange={e => setExpenseForm(f => ({ ...f, Currency: e.target.value }))}
            options={CURRENCIES.map(c => ({ value: c, label: c }))} />
          <Input label="金額" type="number" required placeholder="0.00" step="0.01" min="0"
            value={String(expenseForm.Original_Amount || '')}
            onChange={e => setExpenseForm(f => ({ ...f, Original_Amount: e.target.value }))} />
          <div className="flex gap-2 items-end">
            <Input label={`匯率 (→ ${trip.Base_Currency})`} type="text" inputMode="decimal"
              value={String(expenseForm.Exchange_Rate ?? '1')}
              onChange={e => setExpenseForm(f => ({ ...f, Exchange_Rate: e.target.value }))}
              className="flex-1" />
            <Button size="sm" variant="outline" onClick={fetchExchangeRate} loading={exchangeRateLoading} className="mb-0.5">
              <RefreshCw size={13} />
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">基礎金額 ({trip.Base_Currency})</label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900">
              {parseFloat(baseAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <Select label="付款人" required value={expenseForm.Payer || ''}
            onChange={e => setExpenseForm(f => ({ ...f, Payer: e.target.value }))}
            options={[{ value: '', label: '（選擇付款人）' }, ...tripMembers.map(m => ({ value: m.Member_Name, label: m.Member_Name }))]} />
          <div className="col-span-2">
            <label className="text-sm font-medium text-slate-700 block mb-2">分帳成員</label>
            <div className="flex flex-wrap gap-2">
              {tripMembers.map(m => (
                <button key={m.Member_ID}
                  onClick={() => toggleSplitter(m.Member_Name)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
                    ${expenseForm.splitterIds?.includes(m.Member_Name)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'}`}>
                  {m.Member_Name}
                </button>
              ))}
              {tripMembers.length === 0 && (
                <p className="text-xs text-slate-400">尚無成員，請先加入行程</p>
              )}
            </div>
          </div>

          {/* 機票額外欄位 */}
          {(expenseForm.Main_Category === '機票' || expenseForm.Sub_Category === '機票') && (
            <>
              <div className="col-span-2 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">機票資訊</p>
              </div>
              <Input label="航班號" placeholder="例如：CX543" value={expenseForm.Flight_No || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Flight_No: e.target.value }))} />
              <Input label="航空公司" placeholder="例如：國泰航空" value={expenseForm.Airline || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Airline: e.target.value }))} />
              <Input label="出發地" placeholder="例如：香港 (HKG)" value={expenseForm.Departure_Location || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Departure_Location: e.target.value }))} />
              <Input label="目的地" placeholder="例如：東京成田 (NRT)" value={expenseForm.Arrival_Location || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Arrival_Location: e.target.value }))} />
              <Input label="航班日期（出發）" type="date" value={expenseForm.Flight_Date || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Flight_Date: e.target.value }))} />
              <Select label="狀態" value={expenseForm.Flight_Status || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Flight_Status: e.target.value }))}
                options={[
                  { value: '', label: '（選擇狀態）' },
                  { value: 'confirmed', label: '已確認' },
                  { value: 'pending', label: '待確認' },
                  { value: 'cancelled', label: '已取消' },
                ]} />
              <Input label="出發時間" type="time" value={expenseForm.Departure_Time || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Departure_Time: e.target.value }))} />
              <Input label="到達時間" type="time" value={expenseForm.Landing_Time || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Landing_Time: e.target.value }))} />
              <Input label="回程日期" type="date" value={expenseForm.Arrival_Date || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Arrival_Date: e.target.value }))} />
              <Input label="回程時間" type="time" value={expenseForm.Arrival_Time || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Arrival_Time: e.target.value }))} />
              <Input label="到港時間" type="time" value={expenseForm.Return_Landing_Time || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Return_Landing_Time: e.target.value }))} />
            </>
          )}

          {/* 住宿額外欄位 */}
          {(expenseForm.Main_Category === '住宿' || expenseForm.Sub_Category === '住宿' ||
            ['酒店', '民宿', 'Airbnb', '旅館'].some(k => (expenseForm.Sub_Category || '').includes(k))) && (
            <>
              <div className="col-span-2 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">住宿資訊</p>
              </div>
              <div className="col-span-2">
                <Input label="名稱" placeholder="例如：新宿格蘭貝爾酒店" value={expenseForm.Accommodation_Name || ''}
                  onChange={e => setExpenseForm(f => ({ ...f, Accommodation_Name: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Input label="地址" placeholder="例如：東京都新宿區..." value={expenseForm.Accommodation_Address || ''}
                  onChange={e => setExpenseForm(f => ({ ...f, Accommodation_Address: e.target.value }))} />
              </div>
              <Input label="入住日期" type="date" value={expenseForm.Check_In_Date || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Check_In_Date: e.target.value }))} />
              <Input label="退房日期" type="date" value={expenseForm.Check_Out_Date || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Check_Out_Date: e.target.value }))} />
            </>
          )}

          {/* 鐵路套票額外欄位 */}
          {(['鐵路', '套票', 'Pass', 'Rail', 'JR', '新幹線'].some(k => (expenseForm.Sub_Category || '').toLowerCase().includes(k.toLowerCase())) ||
            expenseForm.Main_Category === '鐵路' || expenseForm.Sub_Category === '鐵路（套票）') && (
            <>
              <div className="col-span-2 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">鐵路套票資訊</p>
              </div>
              <Input label="使用開始日期" type="date" value={expenseForm.Rail_Start_Date || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Rail_Start_Date: e.target.value }))} />
              <Input label="使用完結日期" type="date" value={expenseForm.Rail_End_Date || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Rail_End_Date: e.target.value }))} />
              <Input label="訂單編號" placeholder="例如：JR-2026-XXXXX" value={expenseForm.Rail_Order_No || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Rail_Order_No: e.target.value }))} />
              <Input label="購買平台" placeholder="例如：JR Pass Official" value={expenseForm.Rail_Platform || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Rail_Platform: e.target.value }))} />
            </>
          )}

          {/* 預訂 Toggle */}
          <div className="col-span-2 border-t border-slate-100 pt-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  expenseForm.Is_Booking ? 'bg-blue-600' : 'bg-slate-200'
                }`}
                onClick={() => setExpenseForm(f => ({ ...f, Is_Booking: !f.Is_Booking }))}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  expenseForm.Is_Booking ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </div>
              <span className="text-sm font-medium text-slate-700">顯示於預訂資訊</span>
              {expenseForm.Is_Booking && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">已標記為預訂</span>
              )}
            </label>
          </div>
        </div>
      </Modal>

      {/* 刪除支出確認 */}
      <ConfirmDialog open={!!deleteExpense} onClose={() => setDeleteExpense(null)} onConfirm={handleDeleteExpense}
        title="刪除支出" message={`確定要刪除「${deleteExpense?.Main_Category}${deleteExpense?.Sub_Category ? ` / ${deleteExpense.Sub_Category}` : ''}」嗎？`}
        confirmText="確認刪除" loading={deletingExpense} />
    </div>
  );
}
