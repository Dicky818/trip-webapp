import { useState, useEffect } from 'react';
import { RefreshCw, ArrowRight, Table2, Zap, BookOpen } from 'lucide-react';
import { api, Trip, Settlement } from '../../api/supabaseApi';
import { Button, EmptyState, Spinner, Card, Select } from '../../components/ui';

const CURRENCIES = ['HKD', 'TWD', 'JPY', 'KRW', 'USD', 'EUR', 'GBP', 'CNY', 'SGD', 'THB', 'MYR'];
const SETTLEMENT_CURRENCY_KEY = 'trip_settlement_currency';

interface Props {
  trip: Trip;
  settlement: Settlement | null;
  settlementLoading: boolean;
  fetchSettlement: () => void;
}

export default function SettlementTab({ trip, settlement, settlementLoading, fetchSettlement }: Props) {
  // Display currency (persisted in localStorage)
  const [displayCurrency, setDisplayCurrency] = useState<string>(() => {
    return localStorage.getItem(SETTLEMENT_CURRENCY_KEY) || trip.Base_Currency;
  });
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [rateLoading, setRateLoading] = useState(false);

  // Matrix mode: 'optimised' = minimum transfers | 'raw' = per-person actual debts
  const [matrixMode, setMatrixMode] = useState<'optimised' | 'raw'>('optimised');

  const handleCurrencyChange = (newCurrency: string) => {
    setDisplayCurrency(newCurrency);
    localStorage.setItem(SETTLEMENT_CURRENCY_KEY, newCurrency);
  };

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

  const convert = (baseAmt: number) => baseAmt * exchangeRate;
  const fmt = (amt: number) =>
    `${displayCurrency} ${convert(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-semibold text-slate-900">分帳結算</h3>
        <div className="flex items-center gap-2">
          {rateLoading && <Spinner />}
          <Select
            label=""
            value={displayCurrency}
            onChange={e => handleCurrencyChange(e.target.value)}
            options={CURRENCIES.map(c => ({ value: c, label: c }))}
          />
          <Button size="sm" variant="outline" onClick={fetchSettlement} loading={settlementLoading}>
            <RefreshCw size={13} /> 重新計算
          </Button>
        </div>
      </div>

      {settlementLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !settlement ? (
        <EmptyState icon={<Table2 size={32} />} title="尚未計算" description="點擊「重新計算」開始分帳" />
      ) : (
        <div className="space-y-4">
          {/* 成員餘額 */}
          <Card className="p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">
              成員餘額
              {displayCurrency !== trip.Base_Currency && (
                <span className="ml-2 text-xs font-normal text-slate-400">（以 {displayCurrency} 顯示）</span>
              )}
            </h4>
            <div className="space-y-2">
              {Object.entries(settlement.memberBalances || {}).map(([name, balance]) => {
                const num = Number(balance);
                return (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">{name}</span>
                    <span className={`text-sm font-semibold ${num >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {num >= 0 ? '+' : ''}{fmt(num)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 轉帳矩陣 */}
          {Object.keys(settlement.memberBalances || {}).length > 1 && (
            <Card className="p-4 overflow-x-auto">
              {/* Matrix header with switch button */}
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700">
                    {matrixMode === 'optimised'
                      ? '轉帳矩陣（行→列 表示付款方向）'
                      : '原始欠款矩陣（每人對每人的實際欠款）'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {matrixMode === 'optimised'
                      ? '已最優化：最少步驟清零所有欠款'
                      : '未最優化：直接從每筆支出計算的原始欠款'}
                  </p>
                </div>
                {/* Switch button */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setMatrixMode('optimised')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      matrixMode === 'optimised'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Zap size={12} /> 最優化
                  </button>
                  <button
                    onClick={() => setMatrixMode('raw')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      matrixMode === 'raw'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <BookOpen size={12} /> 原始欠款
                  </button>
                </div>
              </div>

              {/* Optimised matrix */}
              {matrixMode === 'optimised' && (() => {
                const names = Object.keys(settlement.memberBalances || {});
                const matrix: Record<string, Record<string, number>> = {};
                names.forEach(n => { matrix[n] = {}; names.forEach(m => { matrix[n][m] = 0; }); });
                (settlement.settlements || []).forEach(s => { matrix[s.from][s.to] = s.amount; });
                return (
                  <table className="text-xs w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 bg-slate-50 text-slate-500 font-medium text-left">付款 ↓ / 收款 →</th>
                        {names.map(n => <th key={n} className="p-2 bg-slate-50 text-slate-600 font-medium text-center">{n}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {names.map(from => (
                        <tr key={from}>
                          <td className="p-2 bg-slate-50 text-slate-600 font-medium">{from}</td>
                          {names.map(to => (
                            <td key={to} className={`p-2 text-center ${matrix[from][to] > 0 ? 'bg-red-50 text-red-600 font-semibold' : 'text-slate-300'}`}>
                              {matrix[from][to] > 0 ? fmt(matrix[from][to]) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}

              {/* Raw debts matrix */}
              {matrixMode === 'raw' && (() => {
                const names = Object.keys(settlement.memberBalances || {});
                const rawDebts = settlement.rawDebts || {};
                // Net raw debts: if A owes B 100 and B owes A 30, show A→B 70, B→A 0
                const netRaw: Record<string, Record<string, number>> = {};
                names.forEach(n => { netRaw[n] = {}; names.forEach(m => { netRaw[n][m] = 0; }); });
                names.forEach(from => {
                  names.forEach(to => {
                    if (from === to) return;
                    const ab = (rawDebts[from]?.[to] || 0);
                    const ba = (rawDebts[to]?.[from] || 0);
                    const net = ab - ba;
                    if (net > 0.01) netRaw[from][to] = Math.round(net * 100) / 100;
                  });
                });
                const hasAny = names.some(from => names.some(to => netRaw[from][to] > 0));
                return (
                  <>
                    <table className="text-xs w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 bg-slate-50 text-slate-500 font-medium text-left">欠款方 ↓ / 收款方 →</th>
                          {names.map(n => <th key={n} className="p-2 bg-slate-50 text-slate-600 font-medium text-center">{n}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {names.map(from => (
                          <tr key={from}>
                            <td className="p-2 bg-slate-50 text-slate-600 font-medium">{from}</td>
                            {names.map(to => (
                              <td key={to} className={`p-2 text-center ${
                                from === to ? 'text-slate-200' :
                                netRaw[from][to] > 0 ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-slate-300'
                              }`}>
                                {from === to ? '—' : netRaw[from][to] > 0 ? fmt(netRaw[from][to]) : '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!hasAny && (
                      <p className="text-xs text-slate-400 text-center mt-2">所有費用由同一人墊付，無直接欠款</p>
                    )}
                  </>
                );
              })()}
            </Card>
          )}

          {/* 建議轉帳步驟 */}
          {(settlement.settlements || []).length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">建議轉帳步驟</h4>
              <div className="space-y-2">
                {settlement.settlements.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-slate-700">{s.from}</span>
                    <ArrowRight size={14} className="text-slate-400" />
                    <span className="font-medium text-slate-700">{s.to}</span>
                    <span className="ml-auto font-bold text-blue-600">{fmt(s.amount)}</span>
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
  );
}
