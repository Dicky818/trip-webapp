import React, { useEffect, useState } from 'react';
import { Plane, Hotel, Ticket, Plus, Trash2, Edit2, ExternalLink, Clock, MapPin } from 'lucide-react';
import { api, Trip, Flight, Accommodation, Booking } from '../../api/gasApi';
import { Button, Card, Modal, Input, Select, EmptyState, ConfirmDialog, Spinner, Badge } from '../../components/ui';
import { useApp } from '../../context/AppContext';

const FLIGHT_STATUS = ['', '準時', '延誤', '取消', '已完成'];
const BOOKING_TYPES = ['', '餐廳', '門票', '活動', '交通', '其他'];

// 只取日期部分，去除 ISO 時間戳（如 2026-08-12T16:00:00.000Z → 2026-08-12）
function formatDateOnly(d: string): string {
  if (!d) return '';
  // 若包含 T，只取前 10 碼（YYYY-MM-DD）
  return d.includes('T') ? d.slice(0, 10) : d;
}

// 格式化時間為 xxhxxm（如 09:30 → 9h30m，9:00 → 9h）
// GAS 已直接回傳 HH:MM 格式，無需 UTC 轉換
function formatTimeDisplay(t: string): string {
  if (!t) return '';
  let timeStr = t;
  if (t.includes('T')) {
    timeStr = t.split('T')[1] || '';
  }
  if (!timeStr.includes(':')) return t;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}m`;
}

// 計算航班飛行時間（考慮日期趪越）
// depDate: 出發日期 (YYYY-MM-DD)，depTime: 出發時間 (HH:MM)
// arrDate: 到達日期 (YYYY-MM-DD)，arrTime: 到達時間 (HH:MM)
// 回傳格式如 "3h30m" 或 "+1d 2h30m"
function calcFlightDuration(depDate: string, depTime: string, arrDate: string, arrTime: string): string {
  if (!depTime || !arrTime) return '';
  // 將日期時間組合為可計算的數値（分鐘）
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

interface Props { trip: Trip; }

export default function InfoTab({ trip }: Props) {
  const { showToast } = useApp();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Flight modal
  const [showFlightModal, setShowFlightModal] = useState(false);
  const [editFlight, setEditFlight] = useState<Flight | null>(null);
  const [flightForm, setFlightForm] = useState<Partial<Flight>>({});
  const [savingFlight, setSavingFlight] = useState(false);
  const [deleteFlight, setDeleteFlight] = useState<Flight | null>(null);
  const [deletingFlight, setDeletingFlight] = useState(false);

  // Accommodation modal
  const [showAccModal, setShowAccModal] = useState(false);
  const [editAcc, setEditAcc] = useState<Accommodation | null>(null);
  const [accForm, setAccForm] = useState<Partial<Accommodation>>({});
  const [savingAcc, setSavingAcc] = useState(false);
  const [deleteAcc, setDeleteAcc] = useState<Accommodation | null>(null);
  const [deletingAcc, setDeletingAcc] = useState(false);

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
      const [f, a, b] = await Promise.all([
        api.getFlights(trip.Trip_ID),
        api.getAccommodations(trip.Trip_ID),
        api.getBookings(trip.Trip_ID),
      ]);
      setFlights(f.data || []);
      setAccommodations(a.data || []);
      setBookings(b.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [trip.Trip_ID]);

  // ── Flight CRUD ──
  const openFlightModal = (flight?: Flight) => {
    setEditFlight(flight || null);
    if (flight) {
      // 編輯時載入現有資料，Arrival_Date 預設與 Flight_Date 相同（如果沒有趪日）
      setFlightForm({ ...flight, Arrival_Date: (flight as any).Arrival_Date || flight.Flight_Date } as any);
    } else {
      setFlightForm({ Trip_ID: trip.Trip_ID, Source_Type: 'Manual' });
    }
    setShowFlightModal(true);
  };

  const handleSaveFlight = async () => {
    if (!flightForm.Flight_No?.trim()) { showToast('請輸入航班號', 'error'); return; }
    setSavingFlight(true);
    try {
      if (editFlight) {
        await api.updateFlight(editFlight.Flight_ID, flightForm);
      } else {
        await api.createFlight({ ...flightForm, Trip_ID: trip.Trip_ID });
      }
      showToast(editFlight ? '航班已更新' : '航班已新增');
      setShowFlightModal(false);
      await fetchAll();
    } catch (e: any) { showToast(e.message || '儲存失敗', 'error'); }
    finally { setSavingFlight(false); }
  };

  const handleDeleteFlight = async () => {
    if (!deleteFlight) return;
    setDeletingFlight(true);
    try {
      await api.deleteFlight(deleteFlight.Flight_ID);
      showToast('航班已刪除');
      setDeleteFlight(null);
      await fetchAll();
    } catch (e: any) { showToast(e.message || '刪除失敗', 'error'); }
    finally { setDeletingFlight(false); }
  };

  // ── Accommodation CRUD ──
  const openAccModal = (acc?: Accommodation) => {
    setEditAcc(acc || null);
    setAccForm(acc ? { ...acc } : { Trip_ID: trip.Trip_ID });
    setShowAccModal(true);
  };

  const handleSaveAcc = async () => {
    if (!accForm.Name?.trim()) { showToast('請輸入住宿名稱', 'error'); return; }
    setSavingAcc(true);
    try {
      if (editAcc) {
        await api.updateAccommodation(editAcc.Accommodation_ID, accForm);
      } else {
        await api.createAccommodation({ ...accForm, Trip_ID: trip.Trip_ID });
      }
      showToast(editAcc ? '住宿已更新' : '住宿已新增');
      setShowAccModal(false);
      await fetchAll();
    } catch (e: any) { showToast(e.message || '儲存失敗', 'error'); }
    finally { setSavingAcc(false); }
  };

  const handleDeleteAcc = async () => {
    if (!deleteAcc) return;
    setDeletingAcc(true);
    try {
      await api.deleteAccommodation(deleteAcc.Accommodation_ID);
      showToast('住宿已刪除');
      setDeleteAcc(null);
      await fetchAll();
    } catch (e: any) { showToast(e.message || '刪除失敗', 'error'); }
    finally { setDeletingAcc(false); }
  };

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
      {/* ── 航班資訊 ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Plane size={18} className="text-blue-600" />
            <h3 className="font-semibold text-slate-900">航班資訊</h3>
            <span className="text-xs text-slate-400">({flights.length})</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => openFlightModal()}>
            <Plus size={14} /> 新增航班
          </Button>
        </div>
        {flights.length === 0 ? (
          <EmptyState icon={<Plane size={32} />} title="尚無航班" description="點擊「新增航班」手動輸入航班資訊" />
        ) : (
          <div className="space-y-2">
            {flights.map(f => (
              <div key={f.Flight_ID} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">{f.Flight_No}</span>
                    {f.Airline && <span className="text-xs text-slate-500">{f.Airline}</span>}
                    {f.Status && <Badge color={f.Status === '取消' ? 'red' : f.Status === '延誤' ? 'yellow' : 'slate'}>{f.Status}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="flex items-center gap-1"><MapPin size={12} />{f.Departure_Location || '?'}</span>
                    <span>→</span>
                    <span>{f.Arrival_Location || '?'}</span>
                    {f.Flight_Date && <span className="text-slate-400">· {formatDateOnly(f.Flight_Date)}</span>}
                  </div>
                  {(f.Departure_Time || f.Arrival_Time) && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <Clock size={11} />
                      <span>{formatTimeDisplay(f.Departure_Time)} — {formatTimeDisplay(f.Arrival_Time)}</span>
                      {f.Duration && <span>({f.Duration})</span>}
                    </div>
                  )}
                  {f.Attachment && (
                    <a href={f.Attachment} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-500 hover:underline mt-1">
                      <ExternalLink size={11} /> 查看附件
                    </a>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openFlightModal(f)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setDeleteFlight(f)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 住宿資訊 ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Hotel size={18} className="text-blue-600" />
            <h3 className="font-semibold text-slate-900">住宿資訊</h3>
            <span className="text-xs text-slate-400">({accommodations.length})</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => openAccModal()}>
            <Plus size={14} /> 新增住宿
          </Button>
        </div>
        {accommodations.length === 0 ? (
          <EmptyState icon={<Hotel size={32} />} title="尚無住宿" description="點擊「新增住宿」新增住宿資訊" />
        ) : (
          <div className="space-y-2">
            {accommodations.map(a => (
              <div key={a.Accommodation_ID} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 mb-1">{a.Name}</p>
                  {a.Address && <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={12} />{a.Address}</p>}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    {a.Check_In_Date && <span>入住：{formatDateOnly(a.Check_In_Date)}</span>}
                    {a.Check_Out_Date && <span>退房：{formatDateOnly(a.Check_Out_Date)}</span>}
                    {a.Price && <span>· {trip.Base_Currency} {Number(a.Price).toLocaleString()}</span>}
                  </div>
                  {a.Attachment && (
                    <a href={a.Attachment} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-500 hover:underline mt-1">
                      <ExternalLink size={11} /> 查看附件
                    </a>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openAccModal(a)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setDeleteAcc(a)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
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
                    {b.Booking_Type && <Badge color="purple">{b.Booking_Type}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {b.Location && <span className="flex items-center gap-1"><MapPin size={11} />{b.Location}</span>}
                    {b.Date && <span>日期：{formatDateOnly(b.Date)}</span>}
                    {b.Price && <span>· {trip.Base_Currency} {Number(b.Price).toLocaleString()}</span>}
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

      {/* ── Flight Modal ── */}
      <Modal open={showFlightModal} onClose={() => setShowFlightModal(false)}
        title={editFlight ? '編輯航班' : '新增航班'} size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowFlightModal(false)}>取消</Button>
            <Button onClick={handleSaveFlight} loading={savingFlight}>儲存</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input label="航班號" required placeholder="例如：CX100" value={flightForm.Flight_No || ''}
            onChange={e => setFlightForm(f => ({ ...f, Flight_No: e.target.value }))} />
          <Input label="航空公司" placeholder="例如：國泰航空" value={flightForm.Airline || ''}
            onChange={e => setFlightForm(f => ({ ...f, Airline: e.target.value }))} />
          <Input label="出發地" placeholder="例如：香港 (HKG)" value={flightForm.Departure_Location || ''}
            onChange={e => setFlightForm(f => ({ ...f, Departure_Location: e.target.value }))} />
          <Input label="目的地" placeholder="例如：東京 (NRT)" value={flightForm.Arrival_Location || ''}
            onChange={e => setFlightForm(f => ({ ...f, Arrival_Location: e.target.value }))} />
          <Input label="航班日期（出發）" type="date" value={flightForm.Flight_Date || ''}
            onChange={e => setFlightForm(f => ({ ...f, Flight_Date: e.target.value }))} />
          <Select label="狀態" value={flightForm.Status || ''}
            onChange={e => setFlightForm(f => ({ ...f, Status: e.target.value }))}
            options={FLIGHT_STATUS.map(s => ({ value: s, label: s || '（未設定）' }))} />
          <Input label="出發時間" type="time" value={flightForm.Departure_Time || ''}
            onChange={e => {
              const depTime = e.target.value;
              setFlightForm(f => {
                const dur = calcFlightDuration(f.Flight_Date || '', depTime, (f as any).Arrival_Date || f.Flight_Date || '', f.Arrival_Time || '');
                return { ...f, Departure_Time: depTime, Duration: dur || f.Duration || '' };
              });
            }} />
          <Input label="到達日期" type="date" value={(flightForm as any).Arrival_Date || flightForm.Flight_Date || ''}
            onChange={e => {
              const arrDate = e.target.value;
              setFlightForm(f => {
                const dur = calcFlightDuration(f.Flight_Date || '', f.Departure_Time || '', arrDate, f.Arrival_Time || '');
                return { ...f, Arrival_Date: arrDate, Duration: dur || f.Duration || '' } as any;
              });
            }} />
          <Input label="到達時間" type="time" value={flightForm.Arrival_Time || ''}
            onChange={e => {
              const arrTime = e.target.value;
              setFlightForm(f => {
                const dur = calcFlightDuration(f.Flight_Date || '', f.Departure_Time || '', (f as any).Arrival_Date || f.Flight_Date || '', arrTime);
                return { ...f, Arrival_Time: arrTime, Duration: dur || f.Duration || '' };
              });
            }} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">飛行時間（自動計算）</label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 min-h-[38px]">
              {flightForm.Duration
                ? <span className="text-blue-600">{flightForm.Duration}</span>
                : <span className="text-slate-400">輸入出發/到達時間即可自動計算</span>}
            </div>
          </div>
          <Input label="附件連結" placeholder="Google Drive 分享連結" value={flightForm.Attachment || ''}
            onChange={e => setFlightForm(f => ({ ...f, Attachment: e.target.value }))} />
        </div>
      </Modal>

      {/* ── Accommodation Modal ── */}
      <Modal open={showAccModal} onClose={() => setShowAccModal(false)}
        title={editAcc ? '編輯住宿' : '新增住宿'} size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAccModal(false)}>取消</Button>
            <Button onClick={handleSaveAcc} loading={savingAcc}>儲存</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="住宿名稱" required placeholder="例如：東京新宿希爾頓酒店" value={accForm.Name || ''}
              onChange={e => setAccForm(f => ({ ...f, Name: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <Input label="地址" placeholder="完整地址" value={accForm.Address || ''}
              onChange={e => setAccForm(f => ({ ...f, Address: e.target.value }))} />
          </div>
          <Input label="入住日期" type="date" value={accForm.Check_In_Date || ''}
            onChange={e => setAccForm(f => ({ ...f, Check_In_Date: e.target.value }))} />
          <Input label="退房日期" type="date" value={accForm.Check_Out_Date || ''}
            onChange={e => setAccForm(f => ({ ...f, Check_Out_Date: e.target.value }))} />
          <Input label={`費用 (${trip.Base_Currency})`} type="number" placeholder="0" value={String(accForm.Price || '')}
            onChange={e => setAccForm(f => ({ ...f, Price: e.target.value }))} />
          <Input label="附件連結" placeholder="Google Drive 分享連結" value={accForm.Attachment || ''}
            onChange={e => setAccForm(f => ({ ...f, Attachment: e.target.value }))} />
        </div>
      </Modal>

      {/* ── Booking Modal ── */}
      <Modal open={showBookingModal} onClose={() => setShowBookingModal(false)}
        title={editBooking ? '編輯預訂' : '新增預訂'} size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowBookingModal(false)}>取消</Button>
            <Button onClick={handleSaveBooking} loading={savingBooking}>儲存</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="預訂名稱" required placeholder="例如：新宿天婦羅餐廳" value={bookingForm.Booking_Name || ''}
              onChange={e => setBookingForm(f => ({ ...f, Booking_Name: e.target.value }))} />
          </div>
          <Select label="預訂類型" value={bookingForm.Booking_Type || ''}
            onChange={e => setBookingForm(f => ({ ...f, Booking_Type: e.target.value }))}
            options={BOOKING_TYPES.map(t => ({ value: t, label: t || '（未設定）' }))} />
          <Input label="地點" placeholder="例如：東京新宿" value={bookingForm.Location || ''}
            onChange={e => setBookingForm(f => ({ ...f, Location: e.target.value }))} />
          <Input label="日期" type="date" value={bookingForm.Date || ''}
            onChange={e => setBookingForm(f => ({ ...f, Date: e.target.value }))} />
          <Input label={`費用 (${trip.Base_Currency})`} type="number" placeholder="0" value={String(bookingForm.Price || '')}
            onChange={e => setBookingForm(f => ({ ...f, Price: e.target.value }))} />
          <div className="col-span-2">
            <Input label="附件連結" placeholder="Google Drive 分享連結" value={bookingForm.Attachment || ''}
              onChange={e => setBookingForm(f => ({ ...f, Attachment: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* ── Confirm Dialogs ── */}
      <ConfirmDialog open={!!deleteFlight} onClose={() => setDeleteFlight(null)} onConfirm={handleDeleteFlight}
        title="刪除航班" message={`確定要刪除航班「${deleteFlight?.Flight_No}」嗎？`} loading={deletingFlight} />
      <ConfirmDialog open={!!deleteAcc} onClose={() => setDeleteAcc(null)} onConfirm={handleDeleteAcc}
        title="刪除住宿" message={`確定要刪除住宿「${deleteAcc?.Name}」嗎？`} loading={deletingAcc} />
      <ConfirmDialog open={!!deleteBooking} onClose={() => setDeleteBooking(null)} onConfirm={handleDeleteBooking}
        title="刪除預訂" message={`確定要刪除預訂「${deleteBooking?.Booking_Name}」嗎？`} loading={deletingBooking} />
    </div>
  );
}
