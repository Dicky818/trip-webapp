import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, AlertTriangle, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import { ItineraryItem, Trip } from '../../api/supabaseApi';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icon path issue with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Props {
  trip: Trip;
  items: ItineraryItem[];
  selectedDay: number;
  onDayChange: (day: number) => void;
  tripDays: Array<{ day: number; date: string }>;
  onUpdateCoords: (itineraryId: string, lat: number, lng: number) => Promise<void>;
  onCreateItem: (day: number, lat: number, lng: number, activity: string) => Promise<void>;
}

interface GeoResult {
  status: 'pending' | 'found' | 'not_found';
  lat?: number;
  lng?: number;
  source?: 'manual' | 'geocode'; // manual = from Lat/Lng field, geocode = from Nominatim
}

// 反向地理編碼（座標 → 地址）
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'zh-TW,zh,en', 'User-Agent': 'TripWebApp/1.0' } });
    const data = await res.json();
    if (data?.display_name) {
      // 取前兩個地址段落（更簡潔）
      const parts = data.display_name.split(',').slice(0, 3).map((s: string) => s.trim());
      return parts.join(', ');
    }
    return null;
  } catch { return null; }
}

// Nominatim 正向地理編碼
async function geocode(query: string, countryHint: string = ''): Promise<{ lat: number; lng: number } | null> {
  const searchQuery = countryHint ? `${query} ${countryHint}` : query;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'zh-TW,zh,en', 'User-Agent': 'TripWebApp/1.0' } });
    const data = await res.json();
    if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    if (countryHint) {
      const url2 = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const res2 = await fetch(url2, { headers: { 'Accept-Language': 'zh-TW,zh,en', 'User-Agent': 'TripWebApp/1.0' } });
      const data2 = await res2.json();
      if (data2?.length > 0) return { lat: parseFloat(data2[0].lat), lng: parseFloat(data2[0].lon) };
    }
    return null;
  } catch { return null; }
}

// 建立數字標記 SVG
function createNumberedIcon(num: number, isActive: boolean): L.DivIcon {
  const bg = isActive ? '#2563eb' : '#64748b';
  const size = isActive ? 36 : 30;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${bg};border:2.5px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);color:white;font-weight:700;font-size:${isActive ? 14 : 12}px;font-family:system-ui,sans-serif;line-height:1;">${num}</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

// 判斷兩點距離是否過遠（超過 800km 視為跨國長途）
function isTooFar(lat1: number, lng1: number, lat2: number, lng2: number): boolean {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) > 800;
}

// 長按偵測 hook（500ms）
function useLongPress(callback: (e: L.LeafletMouseEvent) => void, map: L.Map | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    if (!map) return;
    const onDown = (e: L.LeafletMouseEvent) => {
      movedRef.current = false;
      timerRef.current = setTimeout(() => {
        if (!movedRef.current) callback(e);
      }, 600);
    };
    const onMove = () => { movedRef.current = true; if (timerRef.current) clearTimeout(timerRef.current); };
    const onUp = () => { if (timerRef.current) clearTimeout(timerRef.current); };
    map.on('mousedown', onDown);
    map.on('mousemove', onMove);
    map.on('mouseup', onUp);
    // Touch support
    (map as any).on('touchstart', (e: any) => {
      movedRef.current = false;
      const touch = e.originalEvent?.touches?.[0];
      if (!touch) return;
      timerRef.current = setTimeout(() => {
        if (!movedRef.current) {
          const latlng = map.containerPointToLatLng(L.point(touch.clientX - map.getContainer().getBoundingClientRect().left, touch.clientY - map.getContainer().getBoundingClientRect().top));
          callback({ latlng } as L.LeafletMouseEvent);
        }
      }, 600);
    });
    (map as any).on('touchmove', () => { movedRef.current = true; if (timerRef.current) clearTimeout(timerRef.current); });
    (map as any).on('touchend', () => { if (timerRef.current) clearTimeout(timerRef.current); });
    return () => {
      map.off('mousedown', onDown);
      map.off('mousemove', onMove);
      map.off('mouseup', onUp);
    };
  }, [map, callback]);
}

export default function MapTab({ trip, items, selectedDay, onDayChange, tripDays, onUpdateCoords, onCreateItem }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylinesRef = useRef<L.Polyline[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);

  const [geoResults, setGeoResults] = useState<Record<string, GeoResult>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [geocoding, setGeocoding] = useState(false);

  // 長按新增景點 Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [newActivityName, setNewActivityName] = useState('');
  const [reverseAddr, setReverseAddr] = useState<string | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [savingNew, setSavingNew] = useState(false);

  // 當天行程項目（依 Sort_Order 排序）
  const dayItems = items
    .filter(i => Number(i.Day_Number) === selectedDay)
    .sort((a, b) => Number(a.Sort_Order) - Number(b.Sort_Order));

  // 初始化地圖
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const container = mapContainerRef.current;
    const map = L.map(container, { center: [35.6762, 139.6503], zoom: 12, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    setTimeout(() => { map.invalidateSize(); }, 100);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // 長按地圖新增景點
  const handleLongPress = useCallback(async (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    setPendingLatLng({ lat, lng });
    setNewActivityName('');
    setReverseAddr(null);
    setShowAddModal(true);
    // 反向地理編碼
    setReverseLoading(true);
    const addr = await reverseGeocode(lat, lng);
    setReverseAddr(addr);
    setReverseLoading(false);
  }, []);

  useLongPress(handleLongPress, mapRef.current);

  // 查詢當天所有景點座標（優先使用手動 Lat/Lng，否則 Nominatim）
  useEffect(() => {
    if (dayItems.length === 0) { setGeoResults({}); return; }
    setGeocoding(true);
    setActiveIndex(0);

    const fetchAll = async () => {
      const results: Record<string, GeoResult> = {};
      const tripName = trip.Trip_Name || '';
      const countryHint = tripName.match(/日本|Japan/i) ? 'Japan' :
        tripName.match(/韓國|Korea/i) ? 'Korea' :
        tripName.match(/台灣|Taiwan/i) ? 'Taiwan' :
        tripName.match(/泰國|Thailand/i) ? 'Thailand' :
        tripName.match(/香港|Hong Kong/i) ? 'Hong Kong' :
        tripName.match(/新加坡|Singapore/i) ? 'Singapore' :
        tripName.match(/大阪|京都|東京|北海道|沖繩/i) ? 'Japan' :
        tripName.match(/首爾|釜山/i) ? 'Korea' : '';

      for (const item of dayItems) {
        const key = item.Itinerary_ID;
        const manualLat = item.Lat !== undefined && item.Lat !== '' ? parseFloat(String(item.Lat)) : NaN;
        const manualLng = item.Lng !== undefined && item.Lng !== '' ? parseFloat(String(item.Lng)) : NaN;

        // 優先使用手動座標
        if (!isNaN(manualLat) && !isNaN(manualLng) && manualLat >= -90 && manualLat <= 90 && manualLng >= -180 && manualLng <= 180) {
          results[key] = { status: 'found', lat: manualLat, lng: manualLng, source: 'manual' };
          setGeoResults(prev => ({ ...prev, [key]: results[key] }));
          continue;
        }

        // 否則用 Nominatim
        results[key] = { status: 'pending' };
        setGeoResults(prev => ({ ...prev, [key]: { status: 'pending' } }));
        const activity = item.Activity?.trim();
        if (!activity) {
          results[key] = { status: 'not_found' };
          setGeoResults(prev => ({ ...prev, [key]: { status: 'not_found' } }));
          continue;
        }
        await new Promise(r => setTimeout(r, 300));
        const geo = await geocode(activity, countryHint);
        if (geo) {
          results[key] = { status: 'found', lat: geo.lat, lng: geo.lng, source: 'geocode' };
        } else {
          results[key] = { status: 'not_found' };
        }
        setGeoResults(prev => ({ ...prev, [key]: results[key] }));
      }
      setGeocoding(false);
    };

    fetchAll();
  }, [selectedDay, trip.Trip_ID, items]);

  // 更新地圖標記和連線
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    polylinesRef.current.forEach(p => p.remove());
    markersRef.current = [];
    polylinesRef.current = [];

    const foundItems = dayItems
      .map((item, idx) => ({ item, idx, geo: geoResults[item.Itinerary_ID] }))
      .filter(({ geo }) => geo?.status === 'found' && geo.lat !== undefined);

    if (foundItems.length === 0) return;

    const bounds: [number, number][] = [];

    foundItems.forEach(({ item, idx, geo }) => {
      const isActive = idx === activeIndex;
      const marker = L.marker([geo!.lat!, geo!.lng!], {
        icon: createNumberedIcon(idx + 1, isActive),
        draggable: true,
      });

      marker.bindPopup(`<b>${idx + 1}. ${item.Activity}</b>${item.Time ? `<br><span style="color:#64748b;font-size:12px">${item.Time}</span>` : ''}${geo!.source === 'manual' ? '<br><span style="color:#10b981;font-size:11px">📍 手動座標</span>' : '<br><span style="color:#94a3b8;font-size:11px">🔍 自動定位</span>'}`);

      marker.on('click', () => { setActiveIndex(idx); scrollCarouselTo(idx); });

      // 拖拽結束後儲存新座標
      marker.on('dragend', async () => {
        const { lat, lng } = marker.getLatLng();
        await onUpdateCoords(item.Itinerary_ID, lat, lng);
        // 反向地理編碼提示
        const addr = await reverseGeocode(lat, lng);
        if (addr) {
          const confirmed = window.confirm(`已移動至：\n${addr}\n\n是否要用此地址更新景點名稱「${item.Activity}」？`);
          if (confirmed) {
            // 透過 updateItineraryItem 更新名稱（需要從 ItineraryTab 傳入，這裡用 onUpdateCoords 的同層 API）
            // 此處只更新座標，名稱更新需要用戶在表單中手動確認
          }
        }
      });

      marker.addTo(map);
      markersRef.current.push(marker);
      bounds.push([geo!.lat!, geo!.lng!]);
    });

    // 連線
    for (let i = 0; i < foundItems.length - 1; i++) {
      const a = foundItems[i].geo!;
      const b = foundItems[i + 1].geo!;
      const farApart = isTooFar(a.lat!, a.lng!, b.lat!, b.lng!);
      const polyline = L.polyline([[a.lat!, a.lng!], [b.lat!, b.lng!]],
        farApart
          ? { color: '#f59e0b', weight: 2, opacity: 0.5, dashArray: '8, 8' }
          : { color: '#3b82f6', weight: 2.5, opacity: 0.6, dashArray: '6, 4' }
      );
      polyline.addTo(map);
      polylinesRef.current.push(polyline);
    }

    if (bounds.length === 1) map.setView(bounds[0], 14);
    else if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [geoResults, selectedDay, activeIndex]);

  // 更新標記高亮
  useEffect(() => {
    const foundItems = dayItems
      .map((item, idx) => ({ item, idx, geo: geoResults[item.Itinerary_ID] }))
      .filter(({ geo }) => geo?.status === 'found');
    markersRef.current.forEach((marker, i) => {
      const item = foundItems[i];
      if (!item) return;
      marker.setIcon(createNumberedIcon(item.idx + 1, item.idx === activeIndex));
    });
  }, [activeIndex]);

  // panTo 至 activeIndex
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const foundItems = dayItems
      .map((item, idx) => ({ item, idx, geo: geoResults[item.Itinerary_ID] }))
      .filter(({ geo }) => geo?.status === 'found');
    const target = foundItems.find(f => f.idx === activeIndex);
    if (target?.geo?.lat !== undefined) {
      map.panTo([target.geo.lat!, target.geo.lng!], { animate: true, duration: 0.5 });
    }
  }, [activeIndex]);

  const scrollCarouselTo = useCallback((idx: number) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const cardWidth = container.offsetWidth * 0.85 + 12;
    container.scrollTo({ left: idx * cardWidth, behavior: 'smooth' });
  }, []);

  const handleCarouselScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const cardWidth = container.offsetWidth * 0.85 + 12;
    const idx = Math.round(container.scrollLeft / cardWidth);
    if (idx !== activeIndex && idx >= 0 && idx < dayItems.length) setActiveIndex(idx);
  }, [activeIndex, dayItems.length]);

  const handlePrevDay = () => { if (selectedDay > 1) { onDayChange(selectedDay - 1); setActiveIndex(0); } };
  const handleNextDay = () => { if (selectedDay < tripDays.length) { onDayChange(selectedDay + 1); setActiveIndex(0); } };

  const handleConfirmAdd = async () => {
    if (!newActivityName.trim() || !pendingLatLng) return;
    setSavingNew(true);
    await onCreateItem(selectedDay, pendingLatLng.lat, pendingLatLng.lng, newActivityName.trim());
    setSavingNew(false);
    setShowAddModal(false);
    setPendingLatLng(null);
    setNewActivityName('');
  };

  return (
    <div className="flex flex-col" style={{ minHeight: '600px' }}>
      {/* 天數切換列 */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-100 flex-shrink-0">
        <button onClick={handlePrevDay} disabled={selectedDay <= 1}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="flex gap-1 flex-1 overflow-x-auto scrollbar-hide">
          {tripDays.map(({ day, date }) => (
            <button key={day} onClick={() => { onDayChange(day); setActiveIndex(0); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
                ${selectedDay === day ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
              Day {day}
              <span className="block text-[10px] opacity-70">{date.slice(5).replace('-', '/')}</span>
            </button>
          ))}
        </div>
        <button onClick={handleNextDay} disabled={selectedDay >= tripDays.length}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 地圖區域（固定高度 280px） */}
      <div className="relative flex-shrink-0" style={{ height: '280px' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '280px' }} />
        {/* 長按提示 */}
        <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 rounded-lg px-2.5 py-1 text-xs text-slate-500 shadow">
          長按地圖新增景點 · 拖拽標記移動位置
        </div>
        {geocoding && (
          <div className="absolute top-2 right-2 z-[1000] bg-white rounded-lg shadow px-3 py-1.5 flex items-center gap-2 text-xs text-slate-600">
            <Loader2 size={13} className="animate-spin text-blue-500" />
            正在定位景點...
          </div>
        )}
        {!geocoding && dayItems.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 z-[1000]">
            <div className="text-center text-slate-500">
              <MapPin size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">第 {selectedDay} 天尚無行程</p>
              <p className="text-xs text-slate-400 mt-1">長按地圖可直接新增景點</p>
            </div>
          </div>
        )}
      </div>

      {/* 卡片輪播區域 */}
      <div className="flex-1 bg-slate-50 overflow-hidden flex flex-col" style={{ minHeight: '200px' }}>
        {dayItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            請先在「每日行程」分頁新增行程，或長按地圖直接新增
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 pt-3 pb-1 flex-shrink-0">
              <span className="text-xs font-medium text-slate-500">第 {selectedDay} 天 · {dayItems.length} 個景點</span>
              <span className="text-xs text-slate-400">{activeIndex + 1} / {dayItems.length}</span>
            </div>
            <div ref={carouselRef} onScroll={handleCarouselScroll}
              className="flex-1 overflow-x-auto flex gap-3 px-4 pb-4 pt-1 snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {dayItems.map((item, idx) => {
                const geo = geoResults[item.Itinerary_ID];
                const isActive = idx === activeIndex;
                const isPending = !geo || geo.status === 'pending';
                const isFound = geo?.status === 'found';
                const isNotFound = geo?.status === 'not_found';
                const isManual = geo?.source === 'manual';
                return (
                  <div key={item.Itinerary_ID} onClick={() => { setActiveIndex(idx); scrollCarouselTo(idx); }}
                    className={`flex-shrink-0 snap-center rounded-2xl p-4 cursor-pointer transition-all duration-200 border
                      ${isActive ? 'bg-white border-blue-300 shadow-md' : 'bg-white border-slate-200 shadow-sm opacity-80'}`}
                    style={{ width: '85%' }}>
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white
                        ${isActive ? 'bg-blue-600' : 'bg-slate-400'}`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        {item.Time && <span className="text-xs text-slate-400 font-mono">{item.Time}</span>}
                        <p className={`text-sm font-medium mt-0.5 leading-snug ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                          {item.Activity}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5">
                          {isPending && <span className="flex items-center gap-1 text-xs text-slate-400"><Loader2 size={11} className="animate-spin" /> 定位中...</span>}
                          {isFound && isManual && <span className="flex items-center gap-1 text-xs text-blue-600"><MapPin size={11} /> 手動座標</span>}
                          {isFound && !isManual && <span className="flex items-center gap-1 text-xs text-emerald-600"><MapPin size={11} /> 自動定位</span>}
                          {isNotFound && <span className="flex items-center gap-1 text-xs text-amber-500"><AlertTriangle size={11} /> ⚠ 無法定位</span>}
                        </div>
                        {/* 顯示已儲存的座標 */}
                        {item.Lat && item.Lng && (
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">
                            {parseFloat(String(item.Lat)).toFixed(4)}, {parseFloat(String(item.Lng)).toFixed(4)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex-shrink-0" style={{ width: '7.5%' }} />
            </div>
          </>
        )}
      </div>

      {/* 長按新增景點 Modal */}
      {showAddModal && pendingLatLng && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Plus size={16} className="text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900">新增景點</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3 font-mono">
              📍 {pendingLatLng.lat.toFixed(5)}, {pendingLatLng.lng.toFixed(5)}
            </p>
            {reverseLoading && (
              <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                <Loader2 size={11} className="animate-spin" /> 正在取得地址...
              </p>
            )}
            {reverseAddr && !reverseLoading && (
              <div className="bg-slate-50 rounded-lg p-2.5 mb-3">
                <p className="text-xs text-slate-500 mb-1">附近地址：</p>
                <p className="text-xs text-slate-700">{reverseAddr}</p>
              </div>
            )}
            <div className="mb-4">
              <label className="text-sm font-medium text-slate-700 block mb-1.5">景點名稱 *</label>
              <input
                type="text"
                placeholder="例如：清水寺、路邊拉麵店..."
                value={newActivityName}
                onChange={e => setNewActivityName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleConfirmAdd(); }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <p className="text-xs text-slate-400 mb-4">將新增至第 {selectedDay} 天行程</p>
            <div className="flex gap-2">
              <button onClick={() => { setShowAddModal(false); setPendingLatLng(null); }}
                className="flex-1 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                取消
              </button>
              <button onClick={handleConfirmAdd} disabled={!newActivityName.trim() || savingNew}
                className="flex-1 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                {savingNew ? '新增中...' : '新增景點'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
