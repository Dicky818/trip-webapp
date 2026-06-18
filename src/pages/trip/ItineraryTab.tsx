import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Trash2, Edit2, GripVertical, Hotel, Copy, ChevronDown, ChevronRight, List, MapPin, Navigation, X as XIcon, ArrowRightCircle, CheckSquare, Square, Shuffle, ExternalLink, AlignLeft, Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api, Trip, ItineraryItem, Accommodation, DayAccommodation, Expense, ItineraryAlternative } from '../../api/supabaseApi';
import { Button, Modal, Input, Select, Textarea, EmptyState, ConfirmDialog, Spinner } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import MapTab from './MapTab';

// Google Maps API key
const GOOGLE_MAPS_API_KEY = 'AIzaSyCgBcqumEfwXfqwdSVwj7q8GOymnY_C6fY';

// Load Google Maps script once
let googleMapsLoaded = false;
let googleMapsLoading = false;
const googleMapsCallbacks: (() => void)[] = [];
function loadGoogleMaps(callback: () => void) {
  if (googleMapsLoaded) { callback(); return; }
  googleMapsCallbacks.push(callback);
  if (googleMapsLoading) return;
  googleMapsLoading = true;
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=zh-TW`;
  script.async = true;
  script.onload = () => {
    googleMapsLoaded = true;
    googleMapsLoading = false;
    googleMapsCallbacks.forEach(cb => cb());
    googleMapsCallbacks.length = 0;
  };
  document.head.appendChild(script);
}

interface Props { trip: Trip; }

function formatTimeDisplay(t: string): string {
  if (!t) return '';
  let timeStr = t;
  if (t.includes('T')) timeStr = t.split('T')[1] || '';
  if (!timeStr.includes(':')) return t;
  const parts = timeStr.split(':');
  const h = String(parseInt(parts[0] || '0', 10)).padStart(2, '0');
  const m = String(parseInt(parts[1] || '0', 10)).padStart(2, '0');
  return `${h}:${m}`;
}

function parseLocalDate(d: string): Date {
  const s = d.includes('T') ? d.slice(0, 10) : d;
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function getTripDays(start: string, end: string): Array<{ day: number; date: string }> {
  const days: Array<{ day: number; date: string }> = [];
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  let cur = new Date(s);
  let day = 1;
  while (cur <= e) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    days.push({ day, date: `${y}-${m}-${d}` });
    cur.setDate(cur.getDate() + 1);
    day++;
  }
  return days;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
function getDayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `週${WEEKDAYS[d.getDay()]}`;
}

// WMO Weather Code → icon + label
function getWeatherInfo(code: number): { icon: React.ReactNode; label: string; color: string } {
  if (code === 0) return { icon: <Sun size={13} />, label: '晴天', color: 'text-amber-500' };
  if (code <= 2) return { icon: <Sun size={13} />, label: '多雲', color: 'text-amber-400' };
  if (code === 3) return { icon: <Cloud size={13} />, label: '陰天', color: 'text-slate-500' };
  if (code >= 45 && code <= 48) return { icon: <Wind size={13} />, label: '霧', color: 'text-slate-400' };
  if (code >= 51 && code <= 57) return { icon: <CloudRain size={13} />, label: '毛毛雨', color: 'text-blue-400' };
  if (code >= 61 && code <= 67) return { icon: <CloudRain size={13} />, label: '有雨', color: 'text-blue-500' };
  if (code >= 71 && code <= 77) return { icon: <CloudSnow size={13} />, label: '有雪', color: 'text-sky-400' };
  if (code >= 80 && code <= 82) return { icon: <CloudRain size={13} />, label: '陣雨', color: 'text-blue-500' };
  if (code >= 85 && code <= 86) return { icon: <CloudSnow size={13} />, label: '陣雪', color: 'text-sky-400' };
  if (code >= 95 && code <= 99) return { icon: <CloudLightning size={13} />, label: '雷雨', color: 'text-purple-500' };
  return { icon: <Cloud size={13} />, label: '多雲', color: 'text-slate-400' };
}

// Open Google Maps search for a place name (always use name-based search)
function openGoogleMaps(name: string, _lat?: string | number, _lng?: string | number) {
  if (name) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`, '_blank');
  }
}

// Sortable item component
function SortableItem({ item, onEdit, onDelete, isSelected, onToggleSelect, selectMode }: {
  item: ItineraryItem;
  onEdit: (item: ItineraryItem) => void;
  onDelete: (item: ItineraryItem) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  selectMode: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.Itinerary_ID });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const activityName = item.Activity_Name || item.Activity;

  return (
    <div ref={setNodeRef} style={style}
      className={`flex items-start gap-2 p-3 bg-white rounded-lg border transition-colors group ${
        isSelected ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-200'
      }`}>
      {selectMode ? (
        <button onClick={() => onToggleSelect(item.Itinerary_ID)}
          className="p-1 text-blue-500 flex-shrink-0 mt-0.5">
          {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-300" />}
        </button>
      ) : (
        <button {...attributes} {...listeners} className="drag-handle p-1 text-slate-300 hover:text-slate-500 flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing">
          <GripVertical size={16} />
        </button>
      )}
      {item.Time && (
        <span className="text-xs font-mono text-slate-500 w-12 flex-shrink-0 mt-0.5">{formatTimeDisplay(item.Time)}</span>
      )}
      <div className="flex-1 min-w-0">
        <button
          onClick={() => openGoogleMaps(activityName, item.Lat, item.Lng)}
          className="text-sm font-medium text-slate-800 hover:text-blue-600 hover:underline text-left break-words flex items-center gap-1 group/name"
          title="在 Google Maps 開啟"
        >
          {activityName}
          <ExternalLink size={11} className="opacity-0 group-hover/name:opacity-100 text-blue-400 flex-shrink-0" />
        </button>
        {item.Activity_Name && item.Activity && (
          <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-wrap break-words">{item.Activity}</p>
        )}
        {item.Note && (
          <div className="mt-0.5 space-y-0.5">
            {item.Note.split('\n').map((url, i) => {
              const trimmed = url.trim();
              if (!trimmed) return null;
              return /^https?:\/\//.test(trimmed) ? (
                <a key={i} href={trimmed} target="_blank" rel="noopener noreferrer"
                  className="block text-xs text-blue-500 underline hover:text-blue-700 break-all italic">
                  {trimmed}
                </a>
              ) : (
                <p key={i} className="text-xs text-slate-500 break-all">{trimmed}</p>
              );
            })}
          </div>
        )}
      </div>
      {!selectMode && (
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(item)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function ItineraryTab({ trip }: Props) {
  const { showToast } = useApp();
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [accommodationExpenses, setAccommodationExpenses] = useState<Expense[]>([]);
  const [dayAccommodations, setDayAccommodations] = useState<DayAccommodation[]>([]);
  const [alternatives, setAlternatives] = useState<ItineraryAlternative[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'map'>('list');
  const [selectedDay, setSelectedDay] = useState<number>(1);

  // Cross-day move selection
  const [selectMode, setSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetDay, setMoveTargetDay] = useState('1');
  const [moving, setMoving] = useState(false);

  // Item modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<ItineraryItem | null>(null);
  const [itemForm, setItemForm] = useState<{ Day_Number: string; Time: string; Activity_Name: string; Activity: string; Note: string; Lat: string; Lng: string }>({ Day_Number: '1', Time: '', Activity_Name: '', Activity: '', Note: '', Lat: '', Lng: '' });
  const [savingItem, setSavingItem] = useState(false);
  const [deleteItem, setDeleteItem] = useState<ItineraryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);
  const [latLngError, setLatLngError] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<{ place_id: string; description: string }[]>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);
  const placesDiv = useRef<HTMLDivElement | null>(null);

  // Alternative itinerary modal
  const [showAltModal, setShowAltModal] = useState(false);
  const [altDay, setAltDay] = useState<number>(1);
  const [editAlt, setEditAlt] = useState<ItineraryAlternative | null>(null);
  const [altForm, setAltForm] = useState({ Time: '', Activity_Name: '', Activity: '', Note: '', Lat: '', Lng: '' });
  const [altLocationQuery, setAltLocationQuery] = useState('');
  const [altLocationSuggestions, setAltLocationSuggestions] = useState<{ place_id: string; description: string }[]>([]);
  const [altLocationSearching, setAltLocationSearching] = useState(false);
  const [altShowSuggestions, setAltShowSuggestions] = useState(false);
  const altLocationInputRef = useRef<HTMLInputElement>(null);
  const [savingAlt, setSavingAlt] = useState(false);
  const [deleteAlt, setDeleteAlt] = useState<ItineraryAlternative | null>(null);
  const [deletingAlt, setDeletingAlt] = useState(false);
  const [showAltSection, setShowAltSection] = useState<Set<number>>(new Set());

  // Copy day modal
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyFrom, setCopyFrom] = useState('1');
  const [copyTo, setCopyTo] = useState('2');
  const [copying, setCopying] = useState(false);

  // Weather state
  const [weatherData, setWeatherData] = useState<Record<string, { code: number; max: number; min: number }>>({});

  const tripDays = useMemo(() => getTripDays(trip.Start_Date, trip.End_Date), [trip.Start_Date, trip.End_Date]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [it, acc, da, exp] = await Promise.all([
        api.getItinerary(trip.Trip_ID),
        api.getAccommodations(trip.Trip_ID),
        api.getDayAccommodations(trip.Trip_ID),
        api.getExpenses(trip.Trip_ID),
      ]);
      setItems((it as any).data || []);
      setAccommodations((acc as any).data || []);
      setDayAccommodations((da as any).data || []);
      const allExpenses: Expense[] = (exp as any).data || [];
      const accExp = allExpenses.filter(e => {
        const main = (e.Main_Category || '').toLowerCase();
        const sub = (e.Sub_Category || '').toLowerCase();
        return main === '住宿' || sub.includes('酒店') || sub.includes('民宿') || sub.includes('airbnb') || sub.includes('bnb');
      });
      setAccommodationExpenses(accExp);

      // Fetch alternatives
      try {
        const altRes = await api.getAlternatives(trip.Trip_ID);
        setAlternatives((altRes as any).data || []);
      } catch (_) { setAlternatives([]); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [trip.Trip_ID]);

  // Fetch weather from open-meteo.com
  useEffect(() => {
    if (!trip.Start_Date || !trip.End_Date) return;
    // Use Kyoto coordinates as default; will use first itinerary item with coords if available
    // We use a fixed coordinate based on trip destination (items may not be loaded yet)
    // We'll refetch when items are loaded
    const fetchWeather = async () => {
      try {
        // Try to get coordinates from the first itinerary item with valid lat/lng
        // Fallback to Kyoto (35.0116, 135.7681)
        let lat = 35.0116;
        let lng = 135.7681;
        const firstWithCoords = items.find(i => i.Lat && i.Lng && !isNaN(parseFloat(String(i.Lat))));
        if (firstWithCoords && firstWithCoords.Lat && firstWithCoords.Lng) {
          lat = parseFloat(String(firstWithCoords.Lat));
          lng = parseFloat(String(firstWithCoords.Lng));
        }
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo&start_date=${trip.Start_Date.slice(0, 10)}&end_date=${trip.End_Date.slice(0, 10)}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();
        const daily = json.daily;
        if (!daily?.time) return;
        const map: Record<string, { code: number; max: number; min: number }> = {};
        daily.time.forEach((date: string, i: number) => {
          map[date] = {
            code: daily.weathercode[i] ?? 0,
            max: daily.temperature_2m_max[i] ?? 0,
            min: daily.temperature_2m_min[i] ?? 0,
          };
        });
        setWeatherData(map);
      } catch (_) { /* silently fail */ }
    };
    fetchWeather();
  }, [trip.Start_Date, trip.End_Date, items]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = async (event: DragEndEvent, dayItems: ItineraryItem[]) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = dayItems.findIndex(i => i.Itinerary_ID === active.id);
    const newIndex = dayItems.findIndex(i => i.Itinerary_ID === over.id);
    const reordered = arrayMove(dayItems, oldIndex, newIndex);
    const reorderPayload = reordered.map((item, idx) => ({ Itinerary_ID: item.Itinerary_ID, Sort_Order: idx + 1 }));
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

  // Initialize Google Places services
  const initPlacesServices = useCallback(() => {
    if (!(window as any).google?.maps?.places) return;
    if (!autocompleteService.current) {
      autocompleteService.current = new (window as any).google.maps.places.AutocompleteService();
    }
    if (!placesService.current) {
      if (!placesDiv.current) placesDiv.current = document.createElement('div');
      placesService.current = new (window as any).google.maps.places.PlacesService(placesDiv.current);
    }
  }, []);

  useEffect(() => { loadGoogleMaps(() => initPlacesServices()); }, [initPlacesServices]);

  const searchLocation = useCallback((query: string) => {
    setLocationQuery(query);
    if (!query.trim() || query.length < 2) { setLocationSuggestions([]); setShowSuggestions(false); return; }
    if (!autocompleteService.current) { loadGoogleMaps(() => { initPlacesServices(); }); return; }
    setLocationSearching(true);
    autocompleteService.current.getPlacePredictions(
      { input: query, language: 'zh-TW' },
      (predictions: any, status: any) => {
        setLocationSearching(false);
        if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && predictions) {
          setLocationSuggestions(predictions.map((p: any) => ({ place_id: p.place_id, description: p.description })));
          setShowSuggestions(true);
        } else {
          setLocationSuggestions([]);
          setShowSuggestions(false);
        }
      }
    );
  }, [initPlacesServices]);

  const selectPlace = useCallback((placeId: string, description: string) => {
    setLocationQuery(description);
    setShowSuggestions(false);
    setLocationSuggestions([]);
    if (!placesService.current) return;
    placesService.current.getDetails(
      { placeId, fields: ['geometry', 'name', 'formatted_address'] },
      (place: any, status: any) => {
        if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          setItemForm(f => ({ ...f, Lat: lat.toFixed(6), Lng: lng.toFixed(6) }));
          setLatLngError('');
        }
      }
    );
  }, []);

  const openItemModal = (day: number, item?: ItineraryItem) => {
    setEditItem(item || null);
    setLatLngError('');
    setLocationQuery('');
    setLocationSuggestions([]);
    setShowSuggestions(false);
    setItemForm(item
      ? { Day_Number: String(item.Day_Number), Time: item.Time || '', Activity_Name: item.Activity_Name || '', Activity: item.Activity, Note: item.Note || '', Lat: item.Lat !== undefined && item.Lat !== '' ? String(item.Lat) : '', Lng: item.Lng !== undefined && item.Lng !== '' ? String(item.Lng) : '' }
      : { Day_Number: String(day), Time: '', Activity_Name: '', Activity: '', Note: '', Lat: '', Lng: '' }
    );
    setShowItemModal(true);
  };

  const validateLatLng = (lat: string, lng: string): boolean => {
    if (!lat && !lng) return true;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) { setLatLngError('請輸入有效的數字座標'); return false; }
    if (latNum < -90 || latNum > 90) { setLatLngError('緯度必須介於 -90 至 90 之間'); return false; }
    if (lngNum < -180 || lngNum > 180) { setLatLngError('經度必須介於 -180 至 180 之間'); return false; }
    setLatLngError('');
    return true;
  };

  const handleSaveItem = async () => {
    if (!itemForm.Activity_Name.trim()) { showToast('請輸入活動名稱', 'error'); return; }
    if (!validateLatLng(itemForm.Lat, itemForm.Lng)) return;
    setSavingItem(true);
    try {
      const dayInfo = tripDays.find(d => d.day === Number(itemForm.Day_Number));
      const payload: Partial<ItineraryItem> = {
        Trip_ID: trip.Trip_ID,
        Day_Number: Number(itemForm.Day_Number),
        Date: dayInfo?.date || '',
        Time: itemForm.Time,
        Activity_Name: itemForm.Activity_Name,
        Activity: itemForm.Activity,
        Note: itemForm.Note,
        Lat: itemForm.Lat !== '' ? itemForm.Lat : '',
        Lng: itemForm.Lng !== '' ? itemForm.Lng : '',
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

  // Cross-day move
  const toggleSelectMode = () => {
    setSelectMode(v => !v);
    setSelectedItems(new Set());
  };

  const toggleItemSelect = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleMoveItems = async () => {
    if (selectedItems.size === 0) { showToast('請先選取要移動的行程', 'error'); return; }
    setMoving(true);
    try {
      const targetDay = Number(moveTargetDay);
      const dayInfo = tripDays.find(d => d.day === targetDay);
      const updates = Array.from(selectedItems).map(id =>
        api.updateItineraryItem(id, {
          Day_Number: targetDay,
          Date: dayInfo?.date || '',
        })
      );
      await Promise.all(updates);
      showToast(`已移動 ${selectedItems.size} 項行程到第 ${targetDay} 天`);
      setShowMoveModal(false);
      setSelectMode(false);
      setSelectedItems(new Set());
      await fetchAll();
    } catch (e: any) { showToast(e.message || '移動失敗', 'error'); }
    finally { setMoving(false); }
  };

  // Alternative itinerary CRUD
  const openAltModal = (day: number, alt?: ItineraryAlternative) => {
    setAltDay(day);
    setEditAlt(alt || null);
    setAltLocationQuery('');
    setAltLocationSuggestions([]);
    setAltShowSuggestions(false);
    setAltForm(alt
      ? { Time: alt.Time || '', Activity_Name: alt.Activity_Name || '', Activity: alt.Activity || '', Note: alt.Note || '',
          Lat: alt.Lat !== undefined ? String(alt.Lat) : '',
          Lng: alt.Lng !== undefined ? String(alt.Lng) : '' }
      : { Time: '', Activity_Name: '', Activity: '', Note: '', Lat: '', Lng: '' }
    );
    setShowAltModal(true);
  };

  const searchAltLocation = useCallback((query: string) => {
    setAltLocationQuery(query);
    if (!query.trim() || query.length < 2) { setAltLocationSuggestions([]); setAltShowSuggestions(false); return; }
    if (!autocompleteService.current) { loadGoogleMaps(() => { initPlacesServices(); }); return; }
    setAltLocationSearching(true);
    autocompleteService.current.getPlacePredictions(
      { input: query, language: 'zh-TW' },
      (predictions: any, status: any) => {
        setAltLocationSearching(false);
        if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && predictions) {
          setAltLocationSuggestions(predictions.map((p: any) => ({ place_id: p.place_id, description: p.description })));
          setAltShowSuggestions(true);
        } else {
          setAltLocationSuggestions([]);
          setAltShowSuggestions(false);
        }
      }
    );
  }, [initPlacesServices]);

  const selectAltPlace = useCallback((placeId: string, description: string) => {
    setAltLocationQuery(description);
    setAltShowSuggestions(false);
    setAltLocationSuggestions([]);
    if (!placesService.current) return;
    placesService.current.getDetails(
      { placeId, fields: ['geometry', 'name', 'formatted_address'] },
      (place: any, status: any) => {
        if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          setAltForm(f => ({ ...f, Lat: lat.toFixed(6), Lng: lng.toFixed(6) }));
        }
      }
    );
  }, []);

  const handleSaveAlt = async () => {
    if (!altForm.Activity_Name.trim()) { showToast('請輸入活動名稱', 'error'); return; }
    setSavingAlt(true);
    try {
      const dayInfo = tripDays.find(d => d.day === altDay);
      const payload = {
        Trip_ID: trip.Trip_ID,
        Day_Number: altDay,
        Date: dayInfo?.date || '',
        Time: altForm.Time,
        Activity_Name: altForm.Activity_Name,
        Activity: altForm.Activity,
        Note: altForm.Note,
        Lat: altForm.Lat ? parseFloat(altForm.Lat) : undefined,
        Lng: altForm.Lng ? parseFloat(altForm.Lng) : undefined,
      };
      if (editAlt) {
        await api.updateAlternative(editAlt.Alt_ID, payload);
      } else {
        await api.createAlternative(payload);
      }
      showToast(editAlt ? '替代行程已更新' : '替代行程已新增');
      setShowAltModal(false);
      await fetchAll();
    } catch (e: any) { showToast(e.message || '儲存失敗', 'error'); }
    finally { setSavingAlt(false); }
  };

  const handleDeleteAlt = async () => {
    if (!deleteAlt) return;
    setDeletingAlt(true);
    try {
      await api.deleteAlternative(deleteAlt.Alt_ID);
      showToast('替代行程已刪除');
      setDeleteAlt(null);
      await fetchAll();
    } catch (e: any) { showToast(e.message || '刪除失敗', 'error'); }
    finally { setDeletingAlt(false); }
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
      let res: any;
      if (existing) {
        if (!accommodationId) {
          res = await api.deleteDayAccommodation(existing.Day_Accommodation_ID);
        } else {
          res = await api.setDayAccommodation({ Trip_ID: trip.Trip_ID, Day_Number: dayNumber, Date: dayInfo?.date || '', Accommodation_ID: accommodationId });
        }
      } else if (accommodationId) {
        res = await api.setDayAccommodation({ Trip_ID: trip.Trip_ID, Day_Number: dayNumber, Date: dayInfo?.date || '', Accommodation_ID: accommodationId });
      }
      if (res && !res.success) {
        showToast(res.error || '設定住宿失敗', 'error');
        console.error('setDayAccommodation error:', res.error);
        return;
      }
      await fetchAll();
      showToast('住宿已設定');
    } catch (e: any) { showToast(e.message || '設定失敗', 'error'); }
  };

  const toggleDay = (day: number) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  };

  const toggleAltSection = (day: number) => {
    setShowAltSection(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  const dayOptions = tripDays.map(d => ({ value: String(d.day), label: `第 ${d.day} 天 (${d.date})` }));
  const accOptions = [
    { value: '', label: '（未設定）' },
    ...accommodationExpenses.map(e => ({
      value: e.Expense_ID,
      label: e.Accommodation_Name || e.Sub_Category || e.Note || '住宿',
    })),
    ...(accommodationExpenses.length === 0 ? accommodations.map(a => ({ value: a.Accommodation_ID, label: a.Name })) : []),
  ];

  return (
    <div>
      {/* Sub-tab toggle */}
      <div className="flex gap-1 mx-5 mt-5 mb-4 bg-slate-100 rounded-xl p-1">
        <button onClick={() => setActiveSubTab('list')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${activeSubTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <List size={14} /> 每日行程
        </button>
        <button onClick={() => setActiveSubTab('map')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${activeSubTab === 'map' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <MapPin size={14} /> 地圖
        </button>
      </div>

      {/* Map sub-tab */}
      {activeSubTab === 'map' && (
        <MapTab
          trip={trip}
          items={items}
          selectedDay={selectedDay}
          onDayChange={setSelectedDay}
          tripDays={tripDays}
          onUpdateCoords={async (id, lat, lng) => {
            try {
              await api.updateItineraryItem(id, { Lat: lat.toFixed(6), Lng: lng.toFixed(6) });
              setItems(prev => prev.map(i => i.Itinerary_ID === id ? { ...i, Lat: lat.toFixed(6), Lng: lng.toFixed(6) } : i));
            } catch (e: any) { showToast('座標儲存失敗', 'error'); }
          }}
          onCreateItem={async (day, lat, lng, activity) => {
            try {
              const dayInfo = tripDays.find(d => d.day === day);
              await api.createItineraryItem({ Trip_ID: trip.Trip_ID, Day_Number: day, Date: dayInfo?.date || '', Time: '', Activity: activity, Lat: lat.toFixed(6), Lng: lng.toFixed(6) });
              showToast('景點已新增');
              await fetchAll();
            } catch (e: any) { showToast(e.message || '新增失敗', 'error'); }
          }}
        />
      )}

      {/* List sub-tab */}
      {activeSubTab === 'list' && (
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900">每日行程</h3>
            <div className="flex items-center gap-2">
              {selectMode && selectedItems.size > 0 && (
                <Button size="sm" variant="primary" onClick={() => setShowMoveModal(true)}>
                  <ArrowRightCircle size={14} /> 移動 ({selectedItems.size})
                </Button>
              )}
              <Button size="sm" variant={selectMode ? 'primary' : 'outline'} onClick={toggleSelectMode}>
                <Shuffle size={14} /> {selectMode ? '取消選取' : '跨日移動'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCopyModal(true)}>
                <Copy size={14} /> 複製行程
              </Button>
            </div>
          </div>

          {selectMode && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 flex items-center gap-2">
              <CheckSquare size={14} />
              長按或點擊左側方框選取行程，選取後點擊「移動」按鈕移到其他日
            </div>
          )}

          {tripDays.length === 0 ? (
            <EmptyState title="無法計算行程天數" description="請確認行程的出發和結束日期已正確設定" />
          ) : (
            <div className="space-y-3">
              {tripDays.map(({ day, date }) => {
                const dayItems = items
                  .filter(i => Number(i.Day_Number) === day)
                  .sort((a, b) => Number(a.Sort_Order) - Number(b.Sort_Order));
                const dayAlts = alternatives.filter(a => Number(a.Day_Number) === day);
                const dayAcc = dayAccommodations.find(da => Number(da.Day_Number) === day);
                const accName = dayAcc
                  ? (accommodationExpenses.find(e => e.Expense_ID === dayAcc.Accommodation_ID)?.Accommodation_Name
                    || accommodationExpenses.find(e => e.Expense_ID === dayAcc.Accommodation_ID)?.Sub_Category
                    || accommodationExpenses.find(e => e.Expense_ID === dayAcc.Accommodation_ID)?.Note
                    || accommodations.find(a => a.Accommodation_ID === dayAcc.Accommodation_ID)?.Name
                    || '')
                  : '';
                const isCollapsed = collapsedDays.has(day);
                const showAlts = showAltSection.has(day);
                const weather = weatherData[date];
                const weatherInfo = weather ? getWeatherInfo(weather.code) : null;

                return (
                  <div key={day} className="border border-slate-200 rounded-xl overflow-hidden">
                    {/* Day Header */}
                    <div
                      className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleDay(day)}
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <button className="text-slate-400">
                          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <div>
                          <span className="font-semibold text-slate-800">第 {day} 天</span>
                          <span className="text-xs text-slate-500 ml-2">{date}</span>
                          <span className="text-xs text-blue-500 ml-1">({getDayOfWeek(date)})</span>
                        </div>
                        {weatherInfo && (
                          <span className={`flex items-center gap-1 text-xs font-medium ${weatherInfo.color} bg-white border border-slate-200 px-2 py-0.5 rounded-full`}>
                            {weatherInfo.icon}
                            <span>{weatherInfo.label}</span>
                            <span className="text-slate-500">{Math.round(weather!.min)}–{Math.round(weather!.max)}°C</span>
                          </span>
                        )}
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
                        {/* Accommodation selector */}
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

                        {/* Main itinerary items */}
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
                                    onDelete={i => setDeleteItem(i)}
                                    isSelected={selectedItems.has(item.Itinerary_ID)}
                                    onToggleSelect={toggleItemSelect}
                                    selectMode={selectMode}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        )}

                        {/* Alternative itinerary section */}
                        <div className="border-t border-slate-100 pt-2">
                          <button
                            onClick={() => toggleAltSection(day)}
                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors w-full text-left py-1"
                          >
                            <AlignLeft size={12} />
                            <span className="font-medium">替代行程</span>
                            {dayAlts.length > 0 && (
                              <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-xs">{dayAlts.length}</span>
                            )}
                            <span className="ml-auto">{showAlts ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
                          </button>

                          {showAlts && (
                            <div className="mt-2 space-y-1.5">
                              {dayAlts.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-2">尚無替代行程</p>
                              ) : (
                                dayAlts.map(alt => (
                                  <div key={alt.Alt_ID}
                                    className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 group">
                                    {alt.Time && (
                                      <span className="text-xs font-mono text-amber-600 w-12 flex-shrink-0 mt-0.5">{formatTimeDisplay(alt.Time)}</span>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <button
                                        onClick={() => openGoogleMaps(alt.Activity_Name || alt.Activity || '', alt.Lat, alt.Lng)}
                                        className="text-sm font-medium text-amber-800 hover:text-blue-600 hover:underline text-left break-words flex items-center gap-1 group/name"
                                        title="在 Google Maps 開啟"
                                      >
                                        {alt.Activity_Name || alt.Activity}
                                        <ExternalLink size={11} className="opacity-0 group-hover/name:opacity-100 text-blue-400 flex-shrink-0" />
                                      </button>
                                      {alt.Activity_Name && alt.Activity && (
                                        <p className="text-xs text-amber-700 mt-0.5 whitespace-pre-wrap break-words">{alt.Activity}</p>
                                      )}
                                      {alt.Note && (
                                        <div className="mt-0.5 space-y-0.5">
                                          {alt.Note.split('\n').map((url, i) => {
                                            const trimmed = url.trim();
                                            if (!trimmed) return null;
                                            return /^https?:\/\//.test(trimmed) ? (
                                              <a key={i} href={trimmed} target="_blank" rel="noopener noreferrer"
                                                className="block text-xs text-blue-500 underline hover:text-blue-700 break-all italic">
                                                {trimmed}
                                              </a>
                                            ) : (
                                              <p key={i} className="text-xs text-amber-600 break-all">{trimmed}</p>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                      <button onClick={() => openAltModal(day, alt)}
                                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                        <Edit2 size={13} />
                                      </button>
                                      <button onClick={() => setDeleteAlt(alt)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                              <button
                                onClick={() => openAltModal(day)}
                                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg border border-dashed border-amber-300 transition-colors"
                              >
                                <Plus size={12} /> 新增替代行程
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add/Edit item modal */}
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
              <Input label="時間" type="time" required value={itemForm.Time}
                onChange={e => setItemForm(f => ({ ...f, Time: e.target.value }))} />
              <Input label="活動名稱" required placeholder="例如：清水寺" value={itemForm.Activity_Name}
                onChange={e => setItemForm(f => ({ ...f, Activity_Name: e.target.value }))} />
              <Textarea label="活動內容（選填）" placeholder="例如：參觀清水寺舞台，欣賞京都市景" value={itemForm.Activity} rows={2}
                onChange={e => setItemForm(f => ({ ...f, Activity: e.target.value }))} />
              <Textarea label="網址（選填，可輸入多個，每行一個）" placeholder={`https://ja.kyoto.travel/...\nhttps://maps.google.com/...`} value={itemForm.Note} rows={3}
                onChange={e => setItemForm(f => ({ ...f, Note: e.target.value }))} />

              {/* Google Places search */}
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">地點搜尋（自動填入座標）</label>
                <div className="relative">
                  <input
                    ref={locationInputRef}
                    type="text"
                    placeholder="輸入地點名稱，如：清水寺、大阪城..."
                    value={locationQuery}
                    onChange={e => searchLocation(e.target.value)}
                    onFocus={() => locationSuggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                  />
                  {locationSearching && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  )}
                </div>
                {showSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {locationSuggestions.map(s => (
                      <button key={s.place_id} type="button" onMouseDown={() => selectPlace(s.place_id, s.description)}
                        className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 border-b border-slate-100 last:border-0 flex items-start gap-2">
                        <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        <span>{s.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Coordinates */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-slate-700">座標（選填）</label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="any" placeholder="緯度（如 25.0339）"
                    value={itemForm.Lat}
                    onChange={e => { setItemForm(f => ({ ...f, Lat: e.target.value })); setLatLngError(''); }}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="number" step="any" placeholder="經度（如 121.5645）"
                    value={itemForm.Lng}
                    onChange={e => { setItemForm(f => ({ ...f, Lng: e.target.value })); setLatLngError(''); }}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {latLngError && <p className="text-xs text-red-500 mt-1">{latLngError}</p>}
                {itemForm.Lat && itemForm.Lng && !latLngError && (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <MapPin size={11} /> 已設定座標：{parseFloat(itemForm.Lat).toFixed(5)}, {parseFloat(itemForm.Lng).toFixed(5)}
                  </p>
                )}
              </div>
            </div>
          </Modal>

          {/* Add/Edit alternative modal */}
          <Modal open={showAltModal} onClose={() => setShowAltModal(false)}
            title={editAlt ? '編輯替代行程' : `新增替代行程（第 ${altDay} 天）`}
            footer={
              <>
                <Button variant="outline" onClick={() => setShowAltModal(false)}>取消</Button>
                <Button onClick={handleSaveAlt} loading={savingAlt}>儲存</Button>
              </>
            }
          >
            <div className="flex flex-col gap-4">
              <Input label="時間（選填）" type="time" value={altForm.Time}
                onChange={e => setAltForm(f => ({ ...f, Time: e.target.value }))} />
              <Input label="活動名稱" required placeholder="例如：嵐山竹林（備用）" value={altForm.Activity_Name}
                onChange={e => setAltForm(f => ({ ...f, Activity_Name: e.target.value }))} />
              <Textarea label="活動內容（選填）" placeholder="例如：若清水寺人太多，改去嵐山" value={altForm.Activity} rows={2}
                onChange={e => setAltForm(f => ({ ...f, Activity: e.target.value }))} />
              <Textarea label="網址（選填，可輸入多個，每行一個）" placeholder={`https://ja.kyoto.travel/...\nhttps://maps.google.com/...`} value={altForm.Note} rows={3}
                onChange={e => setAltForm(f => ({ ...f, Note: e.target.value }))} />

              {/* Google Places search */}
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">地點搜尋（自動填入座標）</label>
                <div className="relative">
                  <input
                    ref={altLocationInputRef}
                    type="text"
                    placeholder="輸入地點名稱，如：嵐山竹林、金閣寺..."
                    value={altLocationQuery}
                    onChange={e => searchAltLocation(e.target.value)}
                    onFocus={() => altLocationSuggestions.length > 0 && setAltShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setAltShowSuggestions(false), 200)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                  />
                  {altLocationSearching && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  )}
                </div>
                {altShowSuggestions && altLocationSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {altLocationSuggestions.map(s => (
                      <button key={s.place_id} type="button" onMouseDown={() => selectAltPlace(s.place_id, s.description)}
                        className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 border-b border-slate-100 last:border-0 flex items-start gap-2">
                        <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        <span>{s.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Coordinates */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-slate-700">座標（選填）</label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="any" placeholder="緯度（如 35.0116）"
                    value={altForm.Lat}
                    onChange={e => setAltForm(f => ({ ...f, Lat: e.target.value }))}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="number" step="any" placeholder="經度（如 135.7681）"
                    value={altForm.Lng}
                    onChange={e => setAltForm(f => ({ ...f, Lng: e.target.value }))}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {altForm.Lat && altForm.Lng && (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <MapPin size={11} /> 已設定座標：{parseFloat(altForm.Lat).toFixed(5)}, {parseFloat(altForm.Lng).toFixed(5)}
                  </p>
                )}
              </div>
            </div>
          </Modal>

          {/* Move items modal */}
          <Modal open={showMoveModal} onClose={() => setShowMoveModal(false)} title="移動行程到其他日"
            footer={
              <>
                <Button variant="outline" onClick={() => setShowMoveModal(false)}>取消</Button>
                <Button onClick={handleMoveItems} loading={moving}>確認移動</Button>
              </>
            }
          >
            <div className="flex flex-col gap-4">
              <p className="text-sm text-slate-500">已選取 <span className="font-semibold text-slate-800">{selectedItems.size}</span> 項行程，選擇要移動到哪一天：</p>
              <Select label="目標日期" value={moveTargetDay}
                onChange={e => setMoveTargetDay(e.target.value)} options={dayOptions} />
            </div>
          </Modal>

          {/* Copy day modal */}
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
              <Select label="複製來源" value={copyFrom} onChange={e => setCopyFrom(e.target.value)} options={dayOptions} />
              <Select label="複製目標" value={copyTo} onChange={e => setCopyTo(e.target.value)} options={dayOptions} />
            </div>
          </Modal>

          {/* Delete item confirm */}
          <ConfirmDialog open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDeleteItem}
            title="刪除行程項目" message={`確定要刪除「${deleteItem?.Activity_Name || deleteItem?.Activity}」嗎？`} loading={deletingItem} />

          {/* Delete alternative confirm */}
          <ConfirmDialog open={!!deleteAlt} onClose={() => setDeleteAlt(null)} onConfirm={handleDeleteAlt}
            title="刪除替代行程" message={`確定要刪除「${deleteAlt?.Activity_Name || deleteAlt?.Activity}」嗎？`} loading={deletingAlt} />
        </div>
      )}
    </div>
  );
}
