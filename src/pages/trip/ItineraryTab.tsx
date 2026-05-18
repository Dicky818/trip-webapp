import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, GripVertical, Hotel, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api, Trip, ItineraryItem, Accommodation, DayAccommodation } from '../../api/gasApi';
import { Button, Modal, Input, Select, Textarea, EmptyState, ConfirmDialog, Spinner } from '../../components/ui';
import { useApp } from '../../context/AppContext';

interface Props { trip: Trip; }

// 格式化時間為 xxhxxm（如 09:30 → 9h30m）
// Google Sheets 將時間以 UTC 儲存，需加 +8 小時轉換為 HKT
function formatTimeDisplay(t: string): string {
  if (!t) return '';
  let h = 0, m = 0;
  if (t.includes('T')) {
    // ISO 格式（如 1899-12-30T01:00:00.000Z）：UTC 時間需加 +8
    const timePart = t.split('T')[1] || '';
    const parts = timePart.split(':');
    const utcH = parseInt(parts[0] || '0', 10);
    m = parseInt(parts[1] || '0', 10);
    h = (utcH + 8) % 24; // 轉換為 HKT (UTC+8)
  } else if (t.includes(':')) {
    // HH:MM 格式（前端直接輸入，無需轉換）
    const parts = t.split(':');
    h = parseInt(parts[0] || '0', 10);
    m = parseInt(parts[1] || '0', 10);
  } else {
    return t;
  }
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}m`;
}

// 計算行程天數
function getTripDays(start: string, end: string): Array<{ day: number; date: string }> {
  const days: Array<{ day: number; date: string }> = [];
  const s = new Date(start);
  const e = new Date(end);
  let cur = new Date(s);
  let day = 1;
  while (cur <= e) {
    days.push({ day, date: cur.toISOString().slice(0, 10) });
    cur.setDate(cur.getDate() + 1);
    day++;
  }
  return days;
}

// 可拖曳的行程項目
function SortableItem({ item, onEdit, onDelete }: {
  item: ItineraryItem;
  onEdit: (item: ItineraryItem) => void;
  onDelete: (item: ItineraryItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.Itinerary_ID });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style}
      className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-200 group transition-colors">
      <button {...attributes} {...listeners} className="drag-handle p-1 text-slate-300 hover:text-slate-500 flex-shrink-0">
        <GripVertical size={16} />
      </button>
      {item.Time && (
        <span className="text-xs font-mono text-slate-500 w-12 flex-shrink-0">{formatTimeDisplay(item.Time)}</span>
      )}
      <span className="flex-1 text-sm text-slate-800">{item.Activity}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
          <Edit2 size={13} />
        </button>
        <button onClick={() => onDelete(item)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default function ItineraryTab({ trip }: Props) {
  const { showToast } = useApp();
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [dayAccommodations, setDayAccommodations] = useState<DayAccommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());

  // Item modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<ItineraryItem | null>(null);
  const [itemForm, setItemForm] = useState<{ Day_Number: string; Time: string; Activity: string }>({ Day_Number: '1', Time: '', Activity: '' });
  const [savingItem, setSavingItem] = useState(false);
  const [deleteItem, setDeleteItem] = useState<ItineraryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  // Copy day modal
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyFrom, setCopyFrom] = useState('1');
  const [copyTo, setCopyTo] = useState('2');
  const [copying, setCopying] = useState(false);

  const tripDays = useMemo(() => getTripDays(trip.Start_Date, trip.End_Date), [trip.Start_Date, trip.End_Date]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [it, acc, da] = await Promise.all([
        api.getItinerary(trip.Trip_ID),
        api.getAccommodations(trip.Trip_ID),
        api.getDayAccommodations(trip.Trip_ID),
      ]);
      setItems(it.data || []);
      setAccommodations(acc.data || []);
      setDayAccommodations(da.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [trip.Trip_ID]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = async (event: DragEndEvent, dayItems: ItineraryItem[]) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = dayItems.findIndex(i => i.Itinerary_ID === active.id);
    const newIndex = dayItems.findIndex(i => i.Itinerary_ID === over.id);
    const reordered = arrayMove(dayItems, oldIndex, newIndex);
    const reorderPayload = reordered.map((item, idx) => ({ Itinerary_ID: item.Itinerary_ID, Sort_Order: idx + 1 }));

    // Optimistic update
    setItems(prev => {
      const otherItems = prev.filter(i => i.Day_Number !== dayItems[0].Day_Number);
      return [...otherItems, ...reordered.map((item, idx) => ({ ...item, Sort_Order: idx + 1 }))];
    });

    try {
      await api.reorderItinerary(reorderPayload);
    } catch (e) {
      showToast('排序儲存失敗', 'error');
      await fetchAll();
    }
  };

  const openItemModal = (day: number, item?: ItineraryItem) => {
    setEditItem(item || null);
    setItemForm(item
      ? { Day_Number: String(item.Day_Number), Time: item.Time || '', Activity: item.Activity }
      : { Day_Number: String(day), Time: '', Activity: '' }
    );
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.Activity.trim()) { showToast('請輸入活動內容', 'error'); return; }
    setSavingItem(true);
    try {
      const dayInfo = tripDays.find(d => d.day === Number(itemForm.Day_Number));
      const payload = {
        Trip_ID: trip.Trip_ID,
        Day_Number: Number(itemForm.Day_Number),
        Date: dayInfo?.date || '',
        Time: itemForm.Time,
        Activity: itemForm.Activity,
      };
      if (editItem) {
        await api.updateItineraryItem(editItem.Itinerary_ID, payload);
      } else {
        await api.createItineraryItem(payload);
      }
      showToast(editItem ? '行程已更新' : '行程已新增');
      setShowItemModal(false);
      await fetchAll();
    } catch (e: any) { showToast(e.message || '儲存失敗', 'error'); }
    finally { setSavingItem(false); }
  };

  const handleDeleteItem = async () => {
    if (!deleteItem) return;
    setDeletingItem(true);
    try {
      await api.deleteItineraryItem(deleteItem.Itinerary_ID);
      showToast('行程已刪除');
      setDeleteItem(null);
      await fetchAll();
    } catch (e: any) { showToast(e.message || '刪除失敗', 'error'); }
    finally { setDeletingItem(false); }
  };

  const handleCopyDay = async () => {
    if (copyFrom === copyTo) { showToast('來源和目標不能相同', 'error'); return; }
    setCopying(true);
    try {
      const fromDay = tripDays.find(d => d.day === Number(copyFrom));
      const toDay = tripDays.find(d => d.day === Number(copyTo));
      await api.copyDayItinerary({
        Trip_ID: trip.Trip_ID,
        fromDay: Number(copyFrom),
        toDay: Number(copyTo),
        fromDate: fromDay?.date,
        toDate: toDay?.date,
      });
      showToast(`第 ${copyFrom} 天的行程已複製到第 ${copyTo} 天`);
      setShowCopyModal(false);
      await fetchAll();
    } catch (e: any) { showToast(e.message || '複製失敗', 'error'); }
    finally { setCopying(false); }
  };

  const handleSetDayAccommodation = async (dayNumber: number, accommodationId: string) => {
    try {
      const dayInfo = tripDays.find(d => d.day === dayNumber);
      const existing = dayAccommodations.find(da => Number(da.Day_Number) === dayNumber);
      if (existing) {
        if (!accommodationId) {
          await api.deleteDayAccommodation(existing.Day_Accommodation_ID);
        } else {
          await api.setDayAccommodation({
            Trip_ID: trip.Trip_ID,
            Day_Number: dayNumber,
            Date: dayInfo?.date || '',
            Accommodation_ID: accommodationId,
          });
        }
      } else if (accommodationId) {
        await api.setDayAccommodation({
          Trip_ID: trip.Trip_ID,
          Day_Number: dayNumber,
          Date: dayInfo?.date || '',
          Accommodation_ID: accommodationId,
        });
      }
      await fetchAll();
    } catch (e: any) { showToast(e.message || '設定失敗', 'error'); }
  };

  const toggleDay = (day: number) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  const dayOptions = tripDays.map(d => ({ value: String(d.day), label: `第 ${d.day} 天 (${d.date})` }));
  const accOptions = [
    { value: '', label: '（未設定）' },
    ...accommodations.map(a => ({ value: a.Accommodation_ID, label: a.Name })),
  ];

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">每日行程</h3>
        <Button size="sm" variant="outline" onClick={() => setShowCopyModal(true)}>
          <Copy size={14} /> 複製行程
        </Button>
      </div>

      {tripDays.length === 0 ? (
        <EmptyState title="無法計算行程天數" description="請確認行程的出發和結束日期已正確設定" />
      ) : (
        <div className="space-y-3">
          {tripDays.map(({ day, date }) => {
            const dayItems = items
              .filter(i => Number(i.Day_Number) === day)
              .sort((a, b) => Number(a.Sort_Order) - Number(b.Sort_Order));
            const dayAcc = dayAccommodations.find(da => Number(da.Day_Number) === day);
            const accName = dayAcc ? accommodations.find(a => a.Accommodation_ID === dayAcc.Accommodation_ID)?.Name : '';
            const isCollapsed = collapsedDays.has(day);

            return (
              <div key={day} className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Day Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleDay(day)}
                >
                  <div className="flex items-center gap-3">
                    <button className="text-slate-400">
                      {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <div>
                      <span className="font-semibold text-slate-800">第 {day} 天</span>
                      <span className="text-xs text-slate-500 ml-2">{date}</span>
                    </div>
                    {accName && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                        <Hotel size={11} /> {accName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <span className="text-xs text-slate-400">{dayItems.length} 項活動</span>
                    <Button size="sm" variant="ghost" onClick={() => openItemModal(day)}>
                      <Plus size={14} />
                    </Button>
                  </div>
                </div>

                {/* Day Content */}
                {!isCollapsed && (
                  <div className="p-3 space-y-2">
                    {/* 住宿關聯 */}
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <Hotel size={14} className="text-slate-400" />
                      <span className="text-xs text-slate-500">當晚住宿：</span>
                      <select
                        value={dayAcc?.Accommodation_ID || ''}
                        onChange={e => handleSetDayAccommodation(day, e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {accOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* 行程項目 */}
                    {dayItems.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3">尚無行程，點擊 + 新增</p>
                    ) : (
                      <DndContext sensors={sensors} collisionDetection={closestCenter}
                        onDragEnd={e => handleDragEnd(e, dayItems)}>
                        <SortableContext items={dayItems.map(i => i.Itinerary_ID)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-1.5">
                            {dayItems.map(item => (
                              <SortableItem key={item.Itinerary_ID} item={item}
                                onEdit={i => openItemModal(day, i)}
                                onDelete={i => setDeleteItem(i)} />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 新增/編輯行程 Modal */}
      <Modal open={showItemModal} onClose={() => setShowItemModal(false)}
        title={editItem ? '編輯行程項目' : '新增行程項目'}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowItemModal(false)}>取消</Button>
            <Button onClick={handleSaveItem} loading={savingItem}>儲存</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Select label="日期" required value={itemForm.Day_Number}
            onChange={e => setItemForm(f => ({ ...f, Day_Number: e.target.value }))}
            options={dayOptions} />
          <Input label="時間" type="time" value={itemForm.Time}
            onChange={e => setItemForm(f => ({ ...f, Time: e.target.value }))} />
          <Textarea label="活動內容" required placeholder="例如：參觀淺草寺" value={itemForm.Activity} rows={3}
            onChange={e => setItemForm(f => ({ ...f, Activity: e.target.value }))} />
        </div>
      </Modal>

      {/* 複製行程 Modal */}
      <Modal open={showCopyModal} onClose={() => setShowCopyModal(false)} title="複製行程"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCopyModal(false)}>取消</Button>
            <Button onClick={handleCopyDay} loading={copying}>複製</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500">將某天的所有行程項目複製到另一天（不會刪除目標天的現有行程）</p>
          <Select label="複製來源" value={copyFrom}
            onChange={e => setCopyFrom(e.target.value)} options={dayOptions} />
          <Select label="複製目標" value={copyTo}
            onChange={e => setCopyTo(e.target.value)} options={dayOptions} />
        </div>
      </Modal>

      {/* 刪除確認 */}
      <ConfirmDialog open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDeleteItem}
        title="刪除行程項目" message={`確定要刪除「${deleteItem?.Activity}」嗎？`} loading={deletingItem} />
    </div>
  );
}
