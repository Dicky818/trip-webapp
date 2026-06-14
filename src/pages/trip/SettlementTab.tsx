import { useState, useEffect } from 'react';
import { RefreshCw, ArrowRight, Table2 } from 'lucide-react';
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
              <h4 className="text-sm font-semibold text-slate-700 mb-3">轉帳矩陣（行→列 表示付款方向）</h4>
              {(() => {
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
