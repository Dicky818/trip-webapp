import React, { useMemo, useState, useEffect } from 'react';
import { Trip, Expense, TripMember, Category } from '../../api/supabaseApi';
import { Spinner, EmptyState } from '../../components/ui';
import { DollarSign, RefreshCw } from 'lucide-react';
import { api } from '../../api/supabaseApi';

interface Props {
  trip: Trip;
  expenses: Expense[];
  tripMembers: TripMember[];
  categories: Category[];
  loading: boolean;
}

const CURRENCIES = ['HKD','TWD','JPY','KRW','USD','EUR','GBP','CNY','SGD','THB','MYR'];

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

// 格式化日期為 M/D
function formatShortDate(d: string): string {
  const s = d.includes('T') ? d.slice(0, 10) : d;
  const parts = s.split('-');
  return `${parseInt(parts[1] || '0')}/${parseInt(parts[2] || '0')}`;
}

// localStorage key for display currency preference
const DISPLAY_CURRENCY_KEY = 'trip_display_currency';

export default function ExpenseBreakdownTab({ trip, expenses, tripMembers, categories, loading }: Props) {
  // 分攤成員篩選
  const [selectedSplitter, setSelectedSplitter] = useState<string>('ALL');

  // 顯示貨幣（個人偏好，儲存於 localStorage）
  const [displayCurrency, setDisplayCurrency] = useState<string>(() => {
    return localStorage.getItem(DISPLAY_CURRENCY_KEY) || trip.Base_Currency;
  });
  const [exchangeRate, setExchangeRate] = useState<number>(1); // base → display
  const [rateLoading, setRateLoading] = useState(false);

  // 更新 localStorage 並取得匯率
  const handleCurrencyChange = async (newCurrency: string) => {
    setDisplayCurrency(newCurrency);
    localStorage.setItem(DISPLAY_CURRENCY_KEY, newCurrency);
  };

  // 取得匯率（base → display）
  useEffect(() => {
    if (displayCurrency === trip.Base_Currency) {
      setExchangeRate(1);
      return;
    }
    setRateLoading(true);
    api.getExchangeRate(trip.Base_Currency, displayCurrency)
      .then(result => {
        if (result.success) setExchangeRate(result.rate);
      })
      .finally(() => setRateLoading(false));
  }, [displayCurrency, trip.Base_Currency]);

  // 轉換金額（base → display）
  const convertAmt = (baseAmt: number) => baseAmt * exchangeRate;

  // 行程成員（直接使用 tripMembers，已包含擁有者和協作者）
  const tripMemberObjects = tripMembers;

  // 行程日期列表
  const tripDates = useMemo(() => getTripDates(trip.Start_Date, trip.End_Date), [trip.Start_Date, trip.End_Date]);

  // 篩選後的支出
  const filteredExpenses = useMemo(() => {
    if (selectedSplitter === 'ALL') return expenses;
    return expenses.filter(e => {
      const splitters = (e.Splitters || '').split(',').map(s => s.trim()).filter(Boolean);
      return splitters.includes(selectedSplitter);
    });
  }, [expenses, selectedSplitter]);

  // 建立分類結構
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

  // 計算每筆支出的分攤金額（base currency）
  const getEffectiveAmount = (e: Expense): number => {
    const total = parseFloat(String(e.Base_Amount)) || 0;
    if (selectedSplitter === 'ALL') return total;
    const splitters = (e.Splitters || '').split(',').map(s => s.trim()).filter(Boolean);
    const count = splitters.length;
    return count > 0 ? total / count : total;
  };

  // 建立查找表：main → sub → date → amount (in base currency)
  const amountMap = useMemo(() => {
    const map: Record<string, Record<string, Record<string, number>>> = {};
    filteredExpenses.forEach(e => {
      const main = e.Main_Category || '（未分類）';
      const sub = e.Sub_Category || '（未分類）';
      const date = e.Date?.includes('T') ? e.Date.slice(0, 10) : (e.Date || '');
      const amt = getEffectiveAmount(e);
      if (!map[main]) map[main] = {};
      if (!map[main][sub]) map[main][sub] = {};
      map[main][sub][date] = (map[main][sub][date] || 0) + amt;
    });
    return map;
  }, [filteredExpenses, selectedSplitter]);

  // 總支出
  const grandTotal = useMemo(() =>
    filteredExpenses.reduce((sum, e) => sum + getEffectiveAmount(e), 0),
    [filteredExpenses, selectedSplitter]
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
      result[date] = (result[date] || 0) + getEffectiveAmount(e);
    });
    return result;
  }, [filteredExpenses, selectedSplitter]);

  // 格式化顯示金額
  const fmtAmt = (baseAmt: number, showCurrency = false): string => {
    if (baseAmt === 0) return '';
    const displayAmt = convertAmt(baseAmt);
    const formatted = displayAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return showCurrency ? `${displayCurrency} ${formatted}` : formatted;
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (expenses.length === 0) return (
    <EmptyState icon={<DollarSign size={32} />} title="尚無支出記錄" description="請先在「支出列表」新增支出" />
  );

  const grandTotalDisplay = convertAmt(grandTotal);

  return (
    <div className="p-4">
      {/* 篩選列 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
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

        {/* 貨幣切換器 */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-500 whitespace-nowrap">顯示貨幣：</span>
          <select
            value={displayCurrency}
            onChange={e => handleCurrencyChange(e.target.value)}
            className="text-sm border border-blue-200 rounded-lg px-2 py-1.5 bg-blue-50 text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CURRENCIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {rateLoading && <RefreshCw size={13} className="animate-spin text-blue-500" />}
          {displayCurrency !== trip.Base_Currency && !rateLoading && (
            <span className="text-xs text-slate-400">
              1 {trip.Base_Currency} = {exchangeRate.toFixed(4)} {displayCurrency}
            </span>
          )}
        </div>
      </div>

      {/* 總計 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-500">
          總計：<span className="font-semibold text-slate-900">
            {displayCurrency} {grandTotalDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </span>
        {displayCurrency !== trip.Base_Currency && (
          <span className="text-xs text-slate-400">
            ({trip.Base_Currency} {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
          </span>
        )}
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
              <th className="px-3 py-2 text-right font-semibold whitespace-nowrap min-w-[100px] border-r border-[#b8996e]">總計</th>
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
                          {fmtAmt(amt)}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right text-slate-900 font-bold border-r border-slate-200 whitespace-nowrap">
                      {hasData ? fmtAmt(mainTotal, true) : ''}
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
                              {fmtAmt(amt)}
                            </td>
                          );
                        })}
                        <td className="px-3 py-1.5 text-right text-slate-800 font-medium border-r border-slate-100 whitespace-nowrap">
                          {subTotal > 0 ? fmtAmt(subTotal, true) : ''}
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
                    {fmtAmt(amt)}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right border-r border-[#b8996e] whitespace-nowrap">
                {displayCurrency} {grandTotalDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
