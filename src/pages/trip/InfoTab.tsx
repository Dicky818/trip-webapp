import React, { useEffect, useState } from 'react';
import { Plane, Hotel, Ticket, Plus, Trash2, Edit2, ExternalLink, Clock, MapPin } from 'lucide-react';
import { api, Trip, Expense, Booking } from '../../api/supabaseApi';
import { Button, Card, Modal, Input, Select, EmptyState, ConfirmDialog, Spinner, Badge } from '../../components/ui';
import { useApp } from '../../context/AppContext';

const BOOKING_TYPES = ['', '餐廳', '門票', '活動', '交通', '其他'];

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

// 計算航班飛行時間
function calcFlightDuration(depDate: string, depTime: string, arrDate: string, arrTime: string): string {
  if (!depTime || !arrTime) return '';
  const toMinutes = (date: string, time: string): number => {
    const [hStr, mStr] = time.split(':');
    const h = parseInt(hStr || '0', 10);
    const m = parseInt(mStr || '0', 10);
    if (!date) return h * 60 + m;
    const [yStr, moStr, dStr] = date.split('-');
    const d = new Date(parseInt(yStr), parseInt(moStr) - 1, parseInt(dStr));
    return d.getTime() / 60000 + h * 60 + m;
  };
  const depMin = toMinutes(depDate, depTime);
  const arrMin = toMinutes(arrDate, arrTime);
  const diff = arrMin - depMin;
  if (diff <= 0) return '';
  const totalH = Math.floor(diff / 60);
  const totalM = diff % 60;
  const days = Math.floor(totalH / 24);
  const hours = totalH % 24;
  let result = '';
  if (days > 0) result += `+${days}d `;
  if (hours > 0) result += `${hours}h`;
  if (totalM > 0) result += `${totalM}m`;
  return result.trim();
}

// Flight category keywords
const FLIGHT_KEYWORDS = ['機票', '航班', '飛機', 'flight'];
const ACCOMMODATION_KEYWORDS = ['住宿', '酒店', '旅館', '民宿', '飯店', 'hotel', 'accommodation'];

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
  const { showToast } = useApp();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking modal
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [bookingForm, setBookingForm] = useState<Partial<Booking>>({});
  const [savingBooking, setSavingBooking] = useState(false);
  const [deleteBooking, setDeleteBooking] = useState<Booking | null>(null);
  const [deletingBooking, setDeletingBooking] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [exp, b] = await Promise.all([
        api.getExpenses(trip.Trip_ID),
        api.getBookings(trip.Trip_ID),
      ]);
      setExpenses((exp as any).data || []);
      setBookings((b as any).data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [trip.Trip_ID]);

  // Filter expenses by category
  const flightExpenses = expenses.filter(isFlightExpense);
  const accommodationExpenses = expenses.filter(isAccommodationExpense);

  // ── Booking CRUD ──
  const openBookingModal = (booking?: Booking) => {
    setEditBooking(booking || null);
    setBookingForm(booking ? { ...booking } : { Trip_ID: trip.Trip_ID });
    setShowBookingModal(true);
  };

  const handleSaveBooking = async () => {
    if (!bookingForm.Booking_Name?.trim()) { showToast('請輸入預訂名稱', 'error'); return; }
    setSavingBooking(true);
    try {
      if (editBooking) {
        await api.updateBooking(editBooking.Booking_ID, bookingForm);
      } else {
        await api.createBooking({ ...bookingForm, Trip_ID: trip.Trip_ID });
      }
      showToast(editBooking ? '預訂已更新' : '預訂已新增');
      setShowBookingModal(false);
      await fetchAll();
    } catch (e: any) { showToast(e.message || '儲存失敗', 'error'); }
    finally { setSavingBooking(false); }
  };

  const handleDeleteBooking = async () => {
    if (!deleteBooking) return;
    setDeletingBooking(true);
    try {
      await api.deleteBooking(deleteBooking.Booking_ID);
      showToast('預訂已刪除');
      setDeleteBooking(null);
      await fetchAll();
    } catch (e: any) { showToast(e.message || '刪除失敗', 'error'); }
    finally { setDeletingBooking(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="p-5 space-y-6">
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
          <div className="space-y-2">
            {flightExpenses.map(exp => {
              const duration = calcFlightDuration(
                exp.Flight_Date || exp.Date,
                exp.Departure_Time || '',
                exp.Arrival_Date || exp.Flight_Date || exp.Date,
                exp.Arrival_Time || ''
              );
              const statusColor = exp.Flight_Status === 'cancelled' ? 'red'
                : exp.Flight_Status === 'pending' ? 'yellow' : 'slate';
              const statusLabel = exp.Flight_Status === 'confirmed' ? '已確認'
                : exp.Flight_Status === 'pending' ? '待確認'
                : exp.Flight_Status === 'cancelled' ? '已取消' : '';
              return (
                <div key={exp.Expense_ID} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {exp.Flight_No ? (
                          <span className="font-semibold text-slate-900">{exp.Flight_No}</span>
                        ) : (
                          <span className="font-semibold text-slate-500 italic">（未填航班號）</span>
                        )}
                        {exp.Airline && <span className="text-xs text-slate-500">{exp.Airline}</span>}
                        {statusLabel && <Badge color={statusColor}>{statusLabel}</Badge>}
                        {exp.Note && <span className="text-xs text-slate-400">— {exp.Note}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />{exp.Departure_Location || '（未填出發地）'}
                        </span>
                        <span>→</span>
                        <span>{exp.Arrival_Location || '（未填目的地）'}</span>
                        {(exp.Flight_Date || exp.Date) && (
                          <span className="text-slate-400">· {formatDateOnly(exp.Flight_Date || exp.Date)}</span>
                        )}
                      </div>
                      {(exp.Departure_Time || exp.Arrival_Time) && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <Clock size={11} />
                          <span>
                            {exp.Departure_Time ? formatTime(exp.Departure_Time) : '?'}
                            {exp.Arrival_Date && exp.Arrival_Date !== (exp.Flight_Date || exp.Date) && (
                              <span className="text-slate-400"> (+1d)</span>
                            )}
                            {' — '}
                            {exp.Arrival_Time ? formatTime(exp.Arrival_Time) : '?'}
                          </span>
                          {duration && <span className="text-slate-400">({duration})</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="font-medium text-slate-700">
                          {exp.Currency} {Number(exp.Original_Amount).toLocaleString()}
                        </span>
                        {exp.Currency !== trip.Base_Currency && (
                          <span>= {trip.Base_Currency} {Number(exp.Base_Amount).toLocaleString()}</span>
                        )}
                        <span>· 付款：{exp.Payer}</span>
                      </div>
                    </div>
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
                    {exp.Sub_Category || exp.Note || '（未填住宿名稱）'}
                    {exp.Note && exp.Sub_Category && <span className="font-normal text-slate-500 ml-1">— {exp.Note}</span>}
                  </p>
                  {exp.Accommodation_Address && (
                    <p className="text-sm text-slate-500 flex items-center gap-1 mb-1">
                      <MapPin size={12} />{exp.Accommodation_Address}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {exp.Check_In_Date && <span>入住：{formatDateOnly(exp.Check_In_Date)}</span>}
                    {exp.Check_Out_Date && <span>退房：{formatDateOnly(exp.Check_Out_Date)}</span>}
                    <span className="font-medium text-slate-700">
                      {exp.Currency} {Number(exp.Original_Amount).toLocaleString()}
                    </span>
                    {exp.Currency !== trip.Base_Currency && (
                      <span>= {trip.Base_Currency} {Number(exp.Base_Amount).toLocaleString()}</span>
                    )}
                    <span>· 付款：{exp.Payer}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 預訂資訊 ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Ticket size={18} className="text-blue-600" />
            <h3 className="font-semibold text-slate-900">預訂資訊</h3>
            <span className="text-xs text-slate-400">({bookings.length})</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => openBookingModal()}>
            <Plus size={14} /> 新增預訂
          </Button>
        </div>
        {bookings.length === 0 ? (
          <EmptyState icon={<Ticket size={32} />} title="尚無預訂" description="點擊「新增預訂」新增餐廳、門票等預訂資訊" />
        ) : (
          <div className="space-y-2">
            {bookings.map(b => (
              <div key={b.Booking_ID} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">{b.Booking_Name}</span>
                    {b.Booking_Type && <Badge color="slate">{b.Booking_Type}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {b.Date && <span>{b.Date}</span>}
                    {b.Location && <span className="flex items-center gap-1"><MapPin size={11} />{b.Location}</span>}
                    {b.Price && Number(b.Price) > 0 && <span>{trip.Base_Currency} {Number(b.Price).toLocaleString()}</span>}
                  </div>
                  {b.Attachment && (
                    <a href={b.Attachment} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-500 hover:underline mt-1">
                      <ExternalLink size={11} /> 查看附件
                    </a>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openBookingModal(b)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setDeleteBooking(b)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 新增/編輯預訂 Modal */}
      <Modal open={showBookingModal} onClose={() => setShowBookingModal(false)}
        title={editBooking ? '編輯預訂' : '新增預訂'}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowBookingModal(false)}>取消</Button>
            <Button onClick={handleSaveBooking} loading={savingBooking}>儲存</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="預訂名稱" required placeholder="例如：東京鐵塔門票" value={bookingForm.Booking_Name || ''}
            onChange={e => setBookingForm(f => ({ ...f, Booking_Name: e.target.value }))} />
          <Select label="類型" value={bookingForm.Booking_Type || ''}
            onChange={e => setBookingForm(f => ({ ...f, Booking_Type: e.target.value }))}
            options={BOOKING_TYPES.map(t => ({ value: t, label: t || '（選擇類型）' }))} />
          <Input label="日期" type="date" value={bookingForm.Date || ''}
            onChange={e => setBookingForm(f => ({ ...f, Date: e.target.value }))} />
          <Input label="地點" placeholder="可選" value={bookingForm.Location || ''}
            onChange={e => setBookingForm(f => ({ ...f, Location: e.target.value }))} />
          <Input label="費用" type="number" step="0.01" min="0" placeholder="0" value={String(bookingForm.Price || '')}
            onChange={e => setBookingForm(f => ({ ...f, Price: e.target.value }))} />
          <Input label="附件連結" placeholder="https://..." value={bookingForm.Attachment || ''}
            onChange={e => setBookingForm(f => ({ ...f, Attachment: e.target.value }))} />
        </div>
      </Modal>

      {/* 刪除確認 */}
      <ConfirmDialog open={!!deleteBooking} onClose={() => setDeleteBooking(null)} onConfirm={handleDeleteBooking}
        title="刪除預訂" message={`確定要刪除「${deleteBooking?.Booking_Name}」嗎？`} loading={deletingBooking} />
    </div>
  );
}
