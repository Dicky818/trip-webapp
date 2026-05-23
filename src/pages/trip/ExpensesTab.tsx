import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Edit2, DollarSign, Users, BarChart2, RefreshCw, ArrowRight, Table2, CheckCircle2, Circle } from 'lucide-react';
import { api, Trip, Expense, Member, TripMember, Settlement } from '../../api/supabaseApi';
import { Button, Modal, Input, Select, EmptyState, ConfirmDialog, Spinner, Badge, Card } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import ExpenseBreakdownTab from './ExpenseBreakdownTab';

interface Props { trip: Trip; }

const CURRENCIES = ['HKD','TWD','JPY','KRW','USD','EUR','GBP','CNY','SGD','THB','MYR'];

export default function ExpensesTab({ trip }: Props) {
  const { showToast, members, fetchMembers, categories, fetchCategories } = useApp();
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
    Flight_Date: '', Departure_Time: '', Arrival_Date: '', Arrival_Time: '', Flight_Status: '',
    Accommodation_Address: '', Check_In_Date: '', Check_Out_Date: '',
  });
  const [savingExpense, setSavingExpense] = useState(false);
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState(false);
  const [exchangeRateLoading, setExchangeRateLoading] = useState(false);
  const [settlingExpenseId, setSettlingExpenseId] = useState<string | null>(null);

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
    fetchMembers();
    fetchCategories();
  }, [trip.Trip_ID]);

  useEffect(() => {
    if (activeSubTab === 'settlement') fetchSettlement();
  }, [activeSubTab]);

  const activeMembers = members.filter(m => String(m.Is_Active).toUpperCase() === 'TRUE');
  const activeCategories = categories.filter(c => String(c.Is_Active).toUpperCase() === 'TRUE');
  const tripMemberIds = new Set(tripMembers.map(tm => tm.Member_ID));
  const tripMemberObjects = activeMembers.filter(m => tripMemberIds.has(m.Member_ID));

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
        Arrival_Date: expense.Arrival_Date || '',
        Arrival_Time: expense.Arrival_Time || '',
        Flight_Status: expense.Flight_Status || '',
        Accommodation_Address: expense.Accommodation_Address || '',
        Check_In_Date: expense.Check_In_Date || '',
        Check_Out_Date: expense.Check_Out_Date || '',
      });
    } else {
      setExpenseForm({
        Date: trip.Start_Date || '',
        Main_Category: mainCategories[0] || '',
        Sub_Category: '',
        Note: '',
        Original_Amount: '',
        Currency: trip.Base_Currency,
        Exchange_Rate: '1',
        Payer: tripMemberObjects[0]?.Member_Name || '',
        splitterIds: tripMemberObjects.map(m => m.Member_Name),
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
          Arrival_Date: expenseForm.Arrival_Date,
          Arrival_Time: expenseForm.Arrival_Time,
          Flight_Status: expenseForm.Flight_Status,
        } : {}),
        ...(isAccommodationCategory ? {
          Accommodation_Address: expenseForm.Accommodation_Address,
          Check_In_Date: expenseForm.Check_In_Date,
          Check_Out_Date: expenseForm.Check_Out_Date,
        } : {}),
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

  const handleAddTripMember = async (memberId: string) => {
    try {
      await api.addTripMember({ Trip_ID: trip.Trip_ID, Member_ID: memberId });
      showToast('成員已加入行程');
      await fetchAll();
    } catch (e: any) { showToast(e.message || '加入失敗', 'error'); }
  };

  const handleRemoveTripMember = async (tripMemberId: string, memberName: string) => {
    try {
      await api.removeTripMember(tripMemberId);
      showToast(`${memberName} 已從行程移除`);
      await fetchAll();
    } catch (e: any) { showToast(e.message || '移除失敗', 'error'); }
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
  const settledCount = useMemo(() => expenses.filter(isSettled).length, [expenses]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="p-5">
      {/* 子 Tab */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-xl p-1">
        {[
          { id: 'list', label: '支出列表', icon: <DollarSign size={14} /> },
          { id: 'breakdown', label: '支出細項', icon: <Table2 size={14} /> },
          { id: 'settlement', label: '結算分帳', icon: <BarChart2 size={14} /> },
          { id: 'members', label: '行程成員', icon: <Users size={14} /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors
              ${activeSubTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── 支出列表 ── */}
      {activeSubTab === 'list' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm text-slate-500">共 {expenses.length} 筆支出</span>
              <span className="ml-2 font-semibold text-slate-900">{trip.Base_Currency} {totalBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              {settledCount > 0 && (
                <span className="ml-2 text-xs text-emerald-600 font-medium">（{settledCount} 筆已付清）</span>
              )}
            </div>
            <Button size="sm" onClick={() => openExpenseModal()}>
              <Plus size={14} /> 新增支出
            </Button>
          </div>

          {expenses.length === 0 ? (
            <EmptyState icon={<DollarSign size={32} />} title="尚無支出記錄" description="點擊「新增支出」開始記錄旅途中的花費"
              action={<Button onClick={() => openExpenseModal()}><Plus size={14} /> 新增支出</Button>} />
          ) : (
            <div className="space-y-2">
              {expenses.map(exp => (
                <div key={exp.Expense_ID}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-colors group
                    ${isSettled(exp) ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 hover:border-blue-200'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm font-medium ${isSettled(exp) ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {exp.Sub_Category || exp.Main_Category}
                        {exp.Note && <span className="font-normal ml-1">— {exp.Note}</span>}
                      </span>
                      {exp.Main_Category && <Badge color={isSettled(exp) ? 'green' : 'slate'}>{exp.Main_Category}</Badge>}
                      {isSettled(exp) && <span className="text-xs text-emerald-600 font-medium">已付清</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{exp.Date}</span>
                      <span>付款：{exp.Payer}</span>
                      {exp.Currency !== trip.Base_Currency && (
                        <span>{exp.Currency} {Number(exp.Original_Amount).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${isSettled(exp) ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {trip.Base_Currency} {Number(exp.Base_Amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {/* 已付清按鈕（常駐顯示） */}
                    <button
                      onClick={() => handleToggleSettled(exp)}
                      disabled={settlingExpenseId === exp.Expense_ID}
                      title={isSettled(exp) ? '取消付清' : '標記為已付清'}
                      className={`p-1.5 rounded-lg transition-colors flex-shrink-0
                        ${isSettled(exp)
                          ? 'text-emerald-500 hover:text-slate-400 hover:bg-slate-100'
                          : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50'}
                        ${settlingExpenseId === exp.Expense_ID ? 'opacity-50 cursor-wait' : ''}`}>
                      {isSettled(exp) ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </button>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openExpenseModal(exp)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeleteExpense(exp)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 支出細項 ── */}
      {activeSubTab === 'breakdown' && (
        <ExpenseBreakdownTab
          trip={trip}
          expenses={expenses}
          members={members}
          tripMembers={tripMembers}
          categories={categories}
          loading={loading}
        />
      )}

      {/* ── 結算分帳 ── */}
      {activeSubTab === 'settlement' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">結算分帳</h3>
              {settledCount > 0 && (
                <p className="text-xs text-emerald-600 mt-0.5">已排除 {settledCount} 筆已付清支出</p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={fetchSettlement} loading={settlementLoading}>
              <RefreshCw size={14} /> 重新計算
            </Button>
          </div>

          {settlementLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : !settlement ? (
            <EmptyState title="尚未計算" description="點擊「重新計算」查看分帳結果" />
          ) : (
            <div className="space-y-4">
              {/* 總計 */}
              <Card className="p-4">
                <p className="text-xs text-slate-500 mb-1">總支出</p>
                <p className="text-2xl font-bold text-slate-900">
                  {trip.Base_Currency} {settlement.totalBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </Card>

              {/* 個人結算摘要 */}
              {Object.keys(settlement.memberBalances || {}).length > 0 && (
                <Card className="p-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">個人結算摘要</p>
                  <div className="space-y-2">
                    {Object.entries(settlement.memberBalances).map(([member, balance]) => (
                      <div key={member} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <span className="text-sm font-medium text-slate-700">{member}</span>
                        <div className="text-right">
                          <span className={`text-sm font-semibold ${Number(balance) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {Number(balance) >= 0 ? '+' : ''}{Number(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {trip.Base_Currency}
                          </span>
                          <p className="text-xs text-slate-400">
                            已付 {Number(settlement.memberPaid?.[member] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ·
                            應付 {Number(settlement.memberOwed?.[member] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* 轉帳矩陣 */}
              {Object.keys(settlement.memberBalances || {}).length > 0 && (
                <Card className="p-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">轉帳矩陣（誰欠誰多少）</p>
                  {(() => {
                    const memberList = Object.keys(settlement.memberBalances || {});
                    // Build matrix: matrix[from][to] = amount
                    const matrix: Record<string, Record<string, number>> = {};
                    memberList.forEach(m => { matrix[m] = {}; memberList.forEach(n => { matrix[m][n] = 0; }); });
                    (settlement.settlements || []).forEach(s => {
                      if (matrix[s.from]) matrix[s.from][s.to] = s.amount;
                    });
                    return (
                      <div className="overflow-x-auto">
                        <table className="text-xs border-collapse w-full">
                          <thead>
                            <tr>
                              <th className="px-2 py-1.5 text-left text-slate-500 font-medium border-b border-slate-200 whitespace-nowrap">
                                付款方 ↓ / 收款方 →
                              </th>
                              {memberList.map(to => (
                                <th key={to} className="px-3 py-1.5 text-center text-slate-700 font-semibold border-b border-slate-200 whitespace-nowrap">
                                  {to}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {memberList.map(from => (
                              <tr key={from} className="border-b border-slate-100">
                                <td className="px-2 py-2 font-semibold text-slate-700 whitespace-nowrap">{from}</td>
                                {memberList.map(to => {
                                  const amt = matrix[from]?.[to] || 0;
                                  const isSelf = from === to;
                                  return (
                                    <td key={to} className={`px-3 py-2 text-center whitespace-nowrap
                                      ${isSelf ? 'bg-slate-50 text-slate-300' : amt > 0 ? 'bg-red-50 text-red-600 font-semibold' : 'text-slate-300'}`}>
                                      {isSelf ? '—' : amt > 0 ? `${trip.Base_Currency} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '0'}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="text-xs text-slate-400 mt-2">表格中的金額表示「行成員」需要轉帳給「列成員」的金額</p>
                      </div>
                    );
                  })()}
                </Card>
              )}

              {/* 建議轉帳（文字版） */}
              {(settlement.settlements || []).length > 0 && (
                <Card className="p-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">建議轉帳步驟</p>
                  <div className="space-y-2">
                    {settlement.settlements.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-700">{s.from}</span>
                        <ArrowRight size={14} className="text-blue-500" />
                        <span className="text-sm font-medium text-slate-700">{s.to}</span>
                        <span className="ml-auto text-sm font-semibold text-blue-700">
                          {trip.Base_Currency} {Number(s.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {(settlement.settlements || []).length === 0 && Object.keys(settlement.memberBalances || {}).length > 0 && (
                <div className="text-center py-4 text-sm text-emerald-600 font-medium">✓ 所有費用已平均分攤，無需轉帳</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 行程成員 ── */}
      {activeSubTab === 'members' && (
        <div>
          <h3 className="font-semibold text-slate-900 mb-3">行程成員</h3>
          <div className="space-y-2 mb-4">
            {tripMemberObjects.map(member => {
              const tm = tripMembers.find(t => t.Member_ID === member.Member_ID);
              return (
                <div key={member.Member_ID} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm font-medium text-slate-700">{member.Member_Name}</span>
                  <Button size="sm" variant="ghost" onClick={() => tm && handleRemoveTripMember(tm.Trip_Member_ID, member.Member_Name)}>
                    移除
                  </Button>
                </div>
              );
            })}
            {tripMemberObjects.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-3">尚無行程成員</p>
            )}
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">從全域成員新增</p>
          <div className="space-y-2">
            {activeMembers.filter(m => !tripMemberIds.has(m.Member_ID)).map(member => (
              <div key={member.Member_ID} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-sm text-slate-600">{member.Member_Name}</span>
                <Button size="sm" variant="outline" onClick={() => handleAddTripMember(member.Member_ID)}>
                  <Plus size={13} /> 加入
                </Button>
              </div>
            ))}
            {activeMembers.filter(m => !tripMemberIds.has(m.Member_ID)).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-2">所有成員已加入此行程</p>
            )}
          </div>
        </div>
      )}

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
            <Input label={`匯率 (→ ${trip.Base_Currency})`} type="number" step="0.0001" min="0"
              value={String(expenseForm.Exchange_Rate || '1')}
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
            options={[{ value: '', label: '（選擇付款人）' }, ...tripMemberObjects.map(m => ({ value: m.Member_Name, label: m.Member_Name }))]} />
          <div className="col-span-2">
            <label className="text-sm font-medium text-slate-700 block mb-2">分帳成員</label>
            <div className="flex flex-wrap gap-2">
              {tripMemberObjects.map(m => (
                <button key={m.Member_ID}
                  onClick={() => toggleSplitter(m.Member_Name)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
                    ${expenseForm.splitterIds?.includes(m.Member_Name)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'}`}>
                  {m.Member_Name}
                </button>
              ))}
              {tripMemberObjects.length === 0 && (
                <p className="text-xs text-slate-400">請先在「行程成員」頁面新增成員</p>
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
              <Input label="到達日期" type="date" value={expenseForm.Arrival_Date || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Arrival_Date: e.target.value }))} />
              <Input label="到達時間" type="time" value={expenseForm.Arrival_Time || ''}
                onChange={e => setExpenseForm(f => ({ ...f, Arrival_Time: e.target.value }))} />
            </>
          )}

          {/* 住宿額外欄位 */}
          {(expenseForm.Main_Category === '住宿' || expenseForm.Sub_Category === '住宿') && (
            <>
              <div className="col-span-2 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">住宿資訊</p>
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
        </div>
      </Modal>

      {/* 刪除確認 */}
      <ConfirmDialog open={!!deleteExpense} onClose={() => setDeleteExpense(null)} onConfirm={handleDeleteExpense}
        title="刪除支出" message={`確定要刪除這筆支出嗎？`} loading={deletingExpense} />
    </div>
  );
}
