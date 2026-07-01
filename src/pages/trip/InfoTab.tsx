import { useState, useEffect, useMemo } from 'react';
import { Plane, Hotel, Ticket, Clock, MapPin, Users } from 'lucide-react';
import { api, Trip, Expense, TripMember } from '../../api/supabaseApi';
import { EmptyState, Spinner, Badge } from '../../components/ui';

// 只取日期部分
function formatDateOnly(d: string): string {
  if (!d) return '';
  return d.includes('T') ? d.slice(0, 10) : d;
}

// 格式化時間顯示
function formatTime(t: string): string {
  if (!t) return '';
  const parts = t.split(':');
  const h = String(parseInt(parts[0] || '0', 10)).padStart(2, '0');
  const m = String(parseInt(parts[1] || '0', 10)).padStart(2, '0');
  return `${h}:${m}`;
}

// Flight category keywords
const FLIGHT_KEYWORDS = ['機票', '航班', '飛機', 'flight'];
const ACCOMMODATION_KEYWORDS = ['住宿', '酒店', '旅館', '民宿', '飯店', 'hotel', 'accommodation', 'airbnb'];

function isFlightExpense(exp: Expense): boolean {
  const cat = (exp.Main_Category + ' ' + exp.Sub_Category).toLowerCase();
  return FLIGHT_KEYWORDS.some(k => cat.includes(k.toLowerCase()));
}

function isAccommodationExpense(exp: Expense): boolean {
  const cat = (exp.Main_Category + ' ' + exp.Sub_Category).toLowerCase();
  return ACCOMMODATION_KEYWORDS.some(k => cat.includes(k.toLowerCase()));
}


interface Props { trip: Trip; }

export default function InfoTab({ trip }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tripMembers, setTripMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { fetchAll(); }, [trip.Trip_ID]);

  // Derive all unique participant names from expenses (payer + splitters)
  const expenseParticipants = useMemo(() => {
    const names = new Set<string>();
    expenses.forEach(exp => {
      if (exp.Payer) names.add(exp.Payer.trim());
      if (exp.Splitters) {
        exp.Splitters.split(',').map(s => s.trim()).filter(Boolean).forEach(n => names.add(n));
      }
    });
    return names;
  }, [expenses]);

  // Merge trip_members (real users) with virtual members from expenses
  const allMembers = useMemo(() => {
    const realNames = new Set(tripMembers.map(m => m.Member_Name));
    const virtual: TripMember[] = [];
    expenseParticipants.forEach(name => {
      if (!realNames.has(name)) {
        virtual.push({
          Trip_Member_ID: `virtual-${name}`,
          Trip_ID: trip.Trip_ID,
          Member_ID: '',
          Member_Name: name,
          Is_Owner: false,
          Created_At: '',
        });
      }
    });
    return [...tripMembers, ...virtual.sort((a, b) => a.Member_Name.localeCompare(b.Member_Name))];
  }, [tripMembers, expenseParticipants, trip.Trip_ID]);

  // Filter expenses by category
  const flightExpenses = expenses.filter(isFlightExpense);
  const accommodationExpenses = expenses.filter(isAccommodationExpense);
  const bookingExpenses = expenses.filter(exp => exp.Is_Booking === true);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="p-5 space-y-6">

      {/* ── 行程成員（第一個區塊） ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Users size={18} className="text-blue-600" />
          <h3 className="font-semibold text-slate-900">行程成員</h3>
          <span className="text-xs text-slate-400">({allMembers.length})</span>
        </div>
        {allMembers.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-3">尚無成員</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allMembers.map(member => (
              <div key={member.Trip_Member_ID}
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0
                  ${member.Is_Owner ? 'bg-blue-500' : member.Member_ID === '' ? 'bg-emerald-400' : 'bg-slate-400'}`}>
                  {(member.Member_Name || '?').charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700">{member.Member_Name}</span>
                {member.Is_Owner && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">擁有者</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 航班資訊（從支出讀取） ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Plane size={18} className="text-blue-600" />
            <h3 className="font-semibold text-slate-900">航班資訊</h3>
            <span className="text-xs text-slate-400">({flightExpenses.length})</span>
          </div>
          <p className="text-xs text-slate-400">資料來自「支出」→「機票」分類</p>
        </div>
        {flightExpenses.length === 0 ? (
          <EmptyState icon={<Plane size={32} />} title="尚無航班記錄"
            description="請在「支出」頁面新增「機票」類別的支出，並填寫航班詳細資訊" />
        ) : (
          <div className="space-y-3">
            {flightExpenses.map(exp => {
              const statusColor = exp.Flight_Status === 'cancelled' ? 'red'
                : exp.Flight_Status === 'pending' ? 'yellow' : 'slate';
              const statusLabel = exp.Flight_Status === 'confirmed' ? '已確認'
                : exp.Flight_Status === 'pending' ? '待確認'
                : exp.Flight_Status === 'cancelled' ? '已取消' : '';
              return (
                <div key={exp.Expense_ID} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                  {/* Row 1: Flight number + airline + status badge */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-bold text-slate-900 text-base">
                      {exp.Flight_No || '（未填航班號）'}
                    </span>
                    {exp.Airline && (
                      <span className="text-sm text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{exp.Airline}</span>
                    )}
                    {statusLabel && <Badge color={statusColor}>{statusLabel}</Badge>}
                    {exp.Note && <span className="text-xs text-slate-400 italic">— {exp.Note}</span>}
                  </div>
                  {/* Row 2: Route + date */}
                  <div className="flex items-center gap-2 text-sm text-slate-700 mb-1.5 flex-wrap">
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin size={13} className="text-slate-400" />
                      {exp.Departure_Location || '（未填出發地）'}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="font-medium">{exp.Arrival_Location || '（未填目的地）'}</span>
                    {(exp.Flight_Date || exp.Date) && (
                      <span className="text-xs text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-full">
                        {formatDateOnly(exp.Flight_Date || exp.Date)}
                      </span>
                    )}
                  </div>
                  {/* Row 3: Times */}
                  {(exp.Departure_Time || exp.Landing_Time || exp.Arrival_Time || exp.Return_Landing_Time) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-1.5">
                      {(exp.Departure_Time || exp.Landing_Time) && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-slate-400" />
                          <span className="text-slate-400">去程：</span>
                          <span className="font-mono">{exp.Departure_Time ? formatTime(exp.Departure_Time) : '?'} → {exp.Landing_Time ? formatTime(exp.Landing_Time) : '?'}</span>
                        </span>
                      )}
                      {(exp.Arrival_Time || exp.Return_Landing_Time) && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-slate-400" />
                          <span className="text-slate-400">回程：</span>
                          {exp.Arrival_Date && <span className="text-slate-400">{formatDateOnly(exp.Arrival_Date)} </span>}
                          <span className="font-mono">{exp.Arrival_Time ? formatTime(exp.Arrival_Time) : '?'} → {exp.Return_Landing_Time ? formatTime(exp.Return_Landing_Time) : '?'}</span>
                        </span>
                      )}
                    </div>
                  )}
                  {/* Row 4: Amount + payer */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 pt-1.5 border-t border-slate-100 flex-wrap">
                    <span className="font-semibold text-slate-700">
                      {exp.Currency} {Number(exp.Original_Amount).toLocaleString()}
                    </span>
                    {exp.Currency !== trip.Base_Currency && (
                      <span>= {trip.Base_Currency} {Number(exp.Base_Amount).toLocaleString()}</span>
                    )}
                    <span className="text-slate-300">·</span>
                    <span>付款：{exp.Payer}</span>
                    {exp.Splitters && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>分帳：{exp.Splitters}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 住宿資訊（從支出讀取） ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Hotel size={18} className="text-blue-600" />
            <h3 className="font-semibold text-slate-900">住宿資訊</h3>
            <span className="text-xs text-slate-400">({accommodationExpenses.length})</span>
          </div>
          <p className="text-xs text-slate-400">資料來自「支出」→「住宿」分類</p>
        </div>
        {accommodationExpenses.length === 0 ? (
          <EmptyState icon={<Hotel size={32} />} title="尚無住宿記錄"
            description="請在「支出」頁面新增「住宿」類別的支出，並填寫住宿詳細資訊" />
        ) : (
          <div className="space-y-2">
            {accommodationExpenses.map(exp => (
              <div key={exp.Expense_ID} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 mb-1">
                    {exp.Accommodation_Name || exp.Sub_Category || exp.Note || '（未填住宿名稱）'}
                    {exp.Note && (exp.Accommodation_Name || exp.Sub_Category) && (
                      <span className="font-normal text-slate-500 ml-1">— {exp.Note}</span>
                    )}
                  </p>
                  {exp.Accommodation_Address && (
                    <p className="text-sm text-slate-500 flex items-center gap-1 mb-1">
                      <MapPin size={12} />{exp.Accommodation_Address}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {exp.Check_In_Date && <span>入住：{formatDateOnly(exp.Check_In_Date)}</span>}
                    {exp.Check_Out_Date && <span>退房：{formatDateOnly(exp.Check_Out_Date)}</span>}
                    <span className="font-medium text-slate-700">
                      {exp.Currency} {Number(exp.Original_Amount).toLocaleString()}
                    </span>
                    {exp.Currency !== trip.Base_Currency && (
                      <span>= {trip.Base_Currency} {Number(exp.Base_Amount).toLocaleString()}</span>
                    )}
                    <span>· 付款：{exp.Payer}</span>
                    {exp.Splitters && (
                      <span>· 分帳：{exp.Splitters}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 預訂資訊（從支出中標記為「預訂」的項目） ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Ticket size={18} className="text-blue-600" />
            <h3 className="font-semibold text-slate-900">預訂資訊</h3>
            <span className="text-xs text-slate-400">({bookingExpenses.length})</span>
          </div>
          <p className="text-xs text-slate-400">在支出中開啟「顯示於預訂資訊」</p>
        </div>
        {bookingExpenses.length === 0 ? (
          <EmptyState icon={<Ticket size={32} />} title="尚無預訂"
            description="在新增/編輯支出時，開啟「顯示於預訂資訊」開關，即可在此顯示" />
        ) : (
          <div className="space-y-2">
            {bookingExpenses.map(exp => (
              <div key={exp.Expense_ID} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">
                      {exp.Note || exp.Sub_Category || exp.Main_Category}
                    </span>
                    <Badge color="blue">{exp.Main_Category}{exp.Sub_Category ? ` / ${exp.Sub_Category}` : ''}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {exp.Date && <span>{formatDateOnly(exp.Date)}</span>}
                    <span className="font-medium text-slate-700">
                      {exp.Currency} {Number(exp.Original_Amount).toLocaleString()}
                    </span>
                    {exp.Currency !== trip.Base_Currency && (
                      <span>= {trip.Base_Currency} {Number(exp.Base_Amount).toLocaleString()}</span>
                    )}
                    <span>· 付款：{exp.Payer}</span>
                    {exp.Splitters && <span>· 分帳：{exp.Splitters}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
