import React, { useMemo, useState } from 'react';
import { Trip, Expense, Member, TripMember, Category } from '../../api/gasApi';
import { Spinner, EmptyState } from '../../components/ui';
import { DollarSign } from 'lucide-react';

interface Props {
  trip: Trip;
  expenses: Expense[];
  members: Member[];
  tripMembers: TripMember[];
  categories: Category[];
  loading: boolean;
}

// 解析本地日期字串（避免 UTC 偏移）
function parseLocalDate(d: string): Date {
  const s = d.includes('T') ? d.slice(0, 10) : d;
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
}

// 產生行程每一天的日期列表
function getTripDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  let cur = new Date(s);
  while (cur <= e) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// 格式化日期為 M/D（如 2026-08-12 → 8/12）
function formatShortDate(d: string): string {
  const s = d.includes('T') ? d.slice(0, 10) : d;
  const parts = s.split('-');
  return `${parseInt(parts[1] || '0')}/${parseInt(parts[2] || '0')}`;
}

// 格式化金額（保留兩位小數，0 顯示為空）
function fmtAmt(n: number, currency: string): string {
  if (n === 0) return '';
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ExpenseBreakdownTab({ trip, expenses, members, tripMembers, categories, loading }: Props) {
  // 分攤成員篩選：'ALL' 或 Member_Name
  const [selectedSplitter, setSelectedSplitter] = useState<string>('ALL'); // 分攤

  // 行程成員（用於篩選下拉）
  const activeMembers = members.filter(m => String(m.Is_Active).toUpperCase() === 'TRUE');
  const tripMemberIds = new Set(tripMembers.map(tm => tm.Member_ID));
  const tripMemberObjects = activeMembers.filter(m => tripMemberIds.has(m.Member_ID));

  // 行程日期列表
  const tripDates = useMemo(() => getTripDates(trip.Start_Date, trip.End_Date), [trip.Start_Date, trip.End_Date]);

  // 篩選後的支出（按分攤成員篩選） // 分攤
  const filteredExpenses = useMemo(() => {
    if (selectedSplitter === 'ALL') return expenses;
    // Splitters 是逗號分隔的成員名稱字串
    return expenses.filter(e => {
      const splitters = (e.Splitters || '').split(',').map(s => s.trim()).filter(Boolean);
      return splitters.includes(selectedSplitter);
    });
  }, [expenses, selectedSplitter]);

  // 建立分類結構：主分類 → 子分類列表（依 categories 順序）
  const activeCategories = categories.filter(c => String(c.Is_Active).toUpperCase() === 'TRUE');
  const categoryStructure = useMemo(() => {
    const map: Array<{ main: string; subs: string[] }> = [];
    const seen = new Map<string, Set<string>>();
    activeCategories.forEach(c => {
      if (!seen.has(c.Main_Category)) {
        seen.set(c.Main_Category, new Set());
        map.push({ main: c.Main_Category, subs: [] });
      }
      const entry = map.find(e => e.main === c.Main_Category);
      if (entry && !seen.get(c.Main_Category)!.has(c.Sub_Category)) {
        seen.get(c.Main_Category)!.add(c.Sub_Category);
        entry.subs.push(c.Sub_Category);
      }
    });
    return map;
  }, [activeCategories]);

  // 建立查找表：main → sub → date → amount
  const amountMap = useMemo(() => {
    const map: Record<string, Record<string, Record<string, number>>> = {};
    filteredExpenses.forEach(e => {
      const main = e.Main_Category || '（未分類）';
      const sub = e.Sub_Category || '（未分類）';
      const date = e.Date?.includes('T') ? e.Date.slice(0, 10) : (e.Date || '');
      const amt = parseFloat(String(e.Base_Amount)) || 0;
      if (!map[main]) map[main] = {};
      if (!map[main][sub]) map[main][sub] = {};
      map[main][sub][date] = (map[main][sub][date] || 0) + amt;
    });
    return map;
  }, [filteredExpenses]);

  // 總支出（用於計算百分比）
  const grandTotal = useMemo(() =>
    filteredExpenses.reduce((sum, e) => sum + (parseFloat(String(e.Base_Amount)) || 0), 0),
    [filteredExpenses]
  );

  // 每個主分類的小計（按日期）
  const mainCategoryDateTotal = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    Object.entries(amountMap).forEach(([main, subMap]) => {
      result[main] = {};
      Object.values(subMap).forEach(dateMap => {
        Object.entries(dateMap).forEach(([date, amt]) => {
          result[main][date] = (result[main][date] || 0) + amt;
        });
      });
    });
    return result;
  }, [amountMap]);

  // 每個主分類的總計
  const mainCategoryTotal = useMemo(() => {
    const result: Record<string, number> = {};
    Object.entries(mainCategoryDateTotal).forEach(([main, dateMap]) => {
      result[main] = Object.values(dateMap).reduce((s, v) => s + v, 0);
    });
    return result;
  }, [mainCategoryDateTotal]);

  // 每個子分類的總計
  const subCategoryTotal = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    Object.entries(amountMap).forEach(([main, subMap]) => {
      result[main] = {};
      Object.entries(subMap).forEach(([sub, dateMap]) => {
        result[main][sub] = Object.values(dateMap).reduce((s, v) => s + v, 0);
      });
    });
    return result;
  }, [amountMap]);

  // 每天的總計
  const dateTotals = useMemo(() => {
    const result: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const date = e.Date?.includes('T') ? e.Date.slice(0, 10) : (e.Date || '');
      result[date] = (result[date] || 0) + (parseFloat(String(e.Base_Amount)) || 0);
    });
    return result;
  }, [filteredExpenses]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (expenses.length === 0) return (
    <EmptyState icon={<DollarSign size={32} />} title="尚無支出記錄" description="請先在「支出列表」新增支出" />
  );

  const cur = trip.Base_Currency;

  return (
    <div className="p-4">
      {/* 篩選列 */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-medium text-slate-600 whitespace-nowrap">分攤成員：</span>
        <select
          value={selectedSplitter}
          onChange={e => setSelectedSplitter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">全部</option>
          {tripMemberObjects.map(m => (
            <option key={m.Member_ID} value={m.Member_Name}>{m.Member_Name}</option>
          ))}
        </select>
        <span className="text-sm text-slate-500 ml-auto">
          總計：<span className="font-semibold text-slate-900">{cur} {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </span>
      </div>

      {/* 表格（橫向捲動） */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="text-xs border-collapse min-w-full">
          <thead>
            <tr className="bg-[#c8a96e] text-white">
              <th className="sticky left-0 z-10 bg-[#c8a96e] text-left px-3 py-2 font-semibold whitespace-nowrap min-w-[120px] border-r border-[#b8996e]">
                分類
              </th>
              {tripDates.map(date => (
                <th key={date} className="px-2 py-2 text-center font-medium whitespace-nowrap min-w-[80px] border-r border-[#b8996e]">
                  {formatShortDate(date)}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-semibold whitespace-nowrap min-w-[90px] border-r border-[#b8996e]">總計</th>
              <th className="px-3 py-2 text-right font-semibold whitespace-nowrap min-w-[60px]">佔比</th>
            </tr>
          </thead>
          <tbody>
            {categoryStructure.map(({ main, subs }, catIdx) => {
              const mainTotal = mainCategoryTotal[main] || 0;
              const mainPct = grandTotal > 0 ? (mainTotal / grandTotal * 100) : 0;
              const hasData = mainTotal > 0;

              return (
                <React.Fragment key={main}>
                  {/* 主分類標題行 */}
                  <tr className={`${catIdx % 2 === 0 ? 'bg-[#f5efe6]' : 'bg-[#ede4d6]'} font-semibold`}>
                    <td className={`sticky left-0 z-10 ${catIdx % 2 === 0 ? 'bg-[#f5efe6]' : 'bg-[#ede4d6]'} px-3 py-2 text-slate-800 border-r border-slate-200 whitespace-nowrap`}>
                      {main}
                    </td>
                    {tripDates.map(date => {
                      const amt = mainCategoryDateTotal[main]?.[date] || 0;
                      return (
                        <td key={date} className="px-2 py-2 text-right text-slate-700 border-r border-slate-200 whitespace-nowrap">
                          {amt > 0 ? `${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right text-slate-900 font-bold border-r border-slate-200 whitespace-nowrap">
                      {hasData ? `${cur} ${mainTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap">
                      {hasData ? `${mainPct.toFixed(2)}%` : '0.00%'}
                    </td>
                  </tr>

                  {/* 子分類行 */}
                  {subs.map(sub => {
                    const subTotal = subCategoryTotal[main]?.[sub] || 0;
                    const subPct = grandTotal > 0 ? (subTotal / grandTotal * 100) : 0;
                    return (
                      <tr key={`${main}-${sub}`} className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100">
                        <td className="sticky left-0 z-10 bg-white px-3 py-1.5 text-slate-600 border-r border-slate-200 whitespace-nowrap pl-6">
                          {sub}
                        </td>
                        {tripDates.map(date => {
                          const amt = amountMap[main]?.[sub]?.[date] || 0;
                          return (
                            <td key={date} className="px-2 py-1.5 text-right text-slate-700 border-r border-slate-100 whitespace-nowrap">
                              {amt > 0 ? amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                            </td>
                          );
                        })}
                        <td className="px-3 py-1.5 text-right text-slate-800 font-medium border-r border-slate-100 whitespace-nowrap">
                          {subTotal > 0 ? `${cur} ${subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                        </td>
                        <td className="px-3 py-1.5 text-right text-slate-500 whitespace-nowrap">
                          {subTotal > 0 ? `${subPct.toFixed(2)}%` : '0.00%'}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {/* 每日總計行 */}
            <tr className="bg-[#c8a96e] text-white font-bold border-t-2 border-[#b8996e]">
              <td className="sticky left-0 z-10 bg-[#c8a96e] px-3 py-2 border-r border-[#b8996e] whitespace-nowrap">
                每日總計
              </td>
              {tripDates.map(date => {
                const amt = dateTotals[date] || 0;
                return (
                  <td key={date} className="px-2 py-2 text-right border-r border-[#b8996e] whitespace-nowrap">
                    {amt > 0 ? amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right border-r border-[#b8996e] whitespace-nowrap">
                {cur} {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
