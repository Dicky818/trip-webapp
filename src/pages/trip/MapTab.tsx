import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { ItineraryItem, Trip } from '../../api/gasApi';
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
}

interface GeoResult {
  status: 'pending' | 'found' | 'not_found';
  lat?: number;
  lng?: number;
}

// 從 Activity 欄位擷取地點名稱（去除時間前綴等）
function extractLocation(activity: string): string {
  // 移除常見前綴如「前往」「抵達」「入住」「退房」等
  return activity.trim();
}

// 使用 Nominatim 查詢座標
async function geocode(query: string, tripCountryHint: string = ''): Promise<{ lat: number; lng: number } | null> {
  const searchQuery = tripCountryHint ? `${query} ${tripCountryHint}` : query;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'zh-TW,zh,en', 'User-Agent': 'TripWebApp/1.0' }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    // 如果加了國家提示找不到，再試一次不加提示
    if (tripCountryHint) {
      const url2 = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const res2 = await fetch(url2, { headers: { 'Accept-Language': 'zh-TW,zh,en', 'User-Agent': 'TripWebApp/1.0' } });
      const data2 = await res2.json();
      if (data2 && data2.length > 0) {
        return { lat: parseFloat(data2[0].lat), lng: parseFloat(data2[0].lon) };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// 建立數字標記 SVG
function createNumberedIcon(num: number, isActive: boolean): L.DivIcon {
  const bg = isActive ? '#2563eb' : '#64748b';
  const size = isActive ? 36 : 30;
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px;height:${size}px;
        background:${bg};
        border:2.5px solid white;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 2px 6px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="
          transform:rotate(45deg);
          color:white;font-weight:700;
          font-size:${isActive ? 14 : 12}px;
          font-family:system-ui,sans-serif;
          line-height:1;
        ">${num}</span>
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

export default function MapTab({ trip, items, selectedDay, onDayChange, tripDays }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylinesRef = useRef<L.Polyline[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);

  const [geoResults, setGeoResults] = useState<Record<string, GeoResult>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [geocoding, setGeocoding] = useState(false);

  // 當天行程項目（依 Sort_Order 排序）
  const dayItems = items
    .filter(i => Number(i.Day_Number) === selectedDay)
    .sort((a, b) => Number(a.Sort_Order) - Number(b.Sort_Order));

  // 初始化地圖
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const container = mapContainerRef.current;
    const map = L.map(container, {
      center: [35.6762, 139.6503],
      zoom: 12,
      zoomControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    // 確保容器尺寸正確後重新計算
    setTimeout(() => { map.invalidateSize(); }, 100);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 查詢當天所有景點座標
  useEffect(() => {
    if (dayItems.length === 0) return;
    setGeocoding(true);
    setActiveIndex(0);

    const fetchAll = async () => {
      const results: Record<string, GeoResult> = {};
      // 從行程名稱猜測國家提示（簡單從 trip name 取關鍵字）
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
        results[key] = { status: 'pending' };
        setGeoResults(prev => ({ ...prev, [key]: { status: 'pending' } }));

        const location = extractLocation(item.Activity);
        if (!location) {
          results[key] = { status: 'not_found' };
          setGeoResults(prev => ({ ...prev, [key]: { status: 'not_found' } }));
          continue;
        }

        // Nominatim rate limit: 1 req/sec
        await new Promise(r => setTimeout(r, 300));
        const geo = await geocode(location, countryHint);
        if (geo) {
          results[key] = { status: 'found', lat: geo.lat, lng: geo.lng };
        } else {
          results[key] = { status: 'not_found' };
        }
        setGeoResults(prev => ({ ...prev, [key]: results[key] }));
      }
      setGeocoding(false);
    };

    fetchAll();
  }, [selectedDay, trip.Trip_ID]);

  // 更新地圖標記和連線
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 清除舊標記和連線
    markersRef.current.forEach(m => m.remove());
    polylinesRef.current.forEach(p => p.remove());
    markersRef.current = [];
    polylinesRef.current = [];

    const foundItems = dayItems
      .map((item, idx) => ({ item, idx, geo: geoResults[item.Itinerary_ID] }))
      .filter(({ geo }) => geo?.status === 'found' && geo.lat !== undefined);

    if (foundItems.length === 0) return;

    const bounds: [number, number][] = [];

    // 建立標記
    foundItems.forEach(({ item, idx, geo }) => {
      const isActive = idx === activeIndex;
      const marker = L.marker([geo!.lat!, geo!.lng!], {
        icon: createNumberedIcon(idx + 1, isActive),
      });
      marker.bindPopup(`<b>${idx + 1}. ${item.Activity}</b>${item.Time ? `<br><span style="color:#64748b;font-size:12px">${item.Time}</span>` : ''}`);
      marker.on('click', () => {
        setActiveIndex(idx);
        scrollCarouselTo(idx);
      });
      marker.addTo(map);
      markersRef.current.push(marker);
      bounds.push([geo!.lat!, geo!.lng!]);
    });

    // 建立連線（跳過距離過遠的點對）
    for (let i = 0; i < foundItems.length - 1; i++) {
      const a = foundItems[i].geo!;
      const b = foundItems[i + 1].geo!;
      const farApart = isTooFar(a.lat!, a.lng!, b.lat!, b.lng!);
      const polyline = L.polyline(
        [[a.lat!, a.lng!], [b.lat!, b.lng!]],
        farApart
          ? { color: '#f59e0b', weight: 2, opacity: 0.5, dashArray: '8, 8' }
          : { color: '#3b82f6', weight: 2.5, opacity: 0.6, dashArray: '6, 4' }
      );
      polyline.addTo(map);
      polylinesRef.current.push(polyline);
    }

    // fitBounds
    if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [geoResults, selectedDay, activeIndex]);

  // 點擊標記後更新高亮（重建 icon）
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const foundItems = dayItems
      .map((item, idx) => ({ item, idx, geo: geoResults[item.Itinerary_ID] }))
      .filter(({ geo }) => geo?.status === 'found');

    markersRef.current.forEach((marker, i) => {
      const item = foundItems[i];
      if (!item) return;
      marker.setIcon(createNumberedIcon(item.idx + 1, item.idx === activeIndex));
    });
  }, [activeIndex]);

  // 地圖 panTo 至 activeIndex 對應景點
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

  // 滾動卡片至指定 index
  const scrollCarouselTo = useCallback((idx: number) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const cardWidth = container.offsetWidth * 0.85 + 12; // 85% + gap
    container.scrollTo({ left: idx * cardWidth, behavior: 'smooth' });
  }, []);

  // 監聽卡片滾動，更新 activeIndex
  const handleCarouselScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const cardWidth = container.offsetWidth * 0.85 + 12;
    const idx = Math.round(container.scrollLeft / cardWidth);
    if (idx !== activeIndex && idx >= 0 && idx < dayItems.length) {
      setActiveIndex(idx);
    }
  }, [activeIndex, dayItems.length]);

  const handlePrevDay = () => {
    if (selectedDay > 1) { onDayChange(selectedDay - 1); setActiveIndex(0); }
  };
  const handleNextDay = () => {
    if (selectedDay < tripDays.length) { onDayChange(selectedDay + 1); setActiveIndex(0); }
  };

  return (
    <div className="flex flex-col" style={{ minHeight: '600px' }}>
      {/* 天數切換列 */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-100 flex-shrink-0">
        <button
          onClick={handlePrevDay}
          disabled={selectedDay <= 1}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex gap-1 flex-1 overflow-x-auto scrollbar-hide">
          {tripDays.map(({ day, date }) => (
            <button
              key={day}
              onClick={() => { onDayChange(day); setActiveIndex(0); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
                ${selectedDay === day
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              Day {day}
              <span className="block text-[10px] opacity-70">{date.slice(5).replace('-', '/')}</span>
            </button>
          ))}
        </div>
        <button
          onClick={handleNextDay}
          disabled={selectedDay >= tripDays.length}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 地圖區域（固定高度 280px） */}
      <div className="relative flex-shrink-0" style={{ height: '280px' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '280px' }} />
        {/* Geocoding 載入指示 */}
        {geocoding && (
          <div className="absolute top-2 right-2 z-[1000] bg-white rounded-lg shadow px-3 py-1.5 flex items-center gap-2 text-xs text-slate-600">
            <Loader2 size={13} className="animate-spin text-blue-500" />
            正在定位景點...
          </div>
        )}
        {/* 無景點提示 */}
        {!geocoding && dayItems.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 z-[1000]">
            <div className="text-center text-slate-500">
              <MapPin size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">第 {selectedDay} 天尚無行程</p>
            </div>
          </div>
        )}
      </div>

      {/* 卡片輪播區域（60%） */}
      <div className="flex-1 bg-slate-50 overflow-hidden flex flex-col" style={{ minHeight: '200px' }}>
        {dayItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            請先在「每日行程」分頁新增行程
          </div>
        ) : (
          <>
            {/* 卡片計數 */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1 flex-shrink-0">
              <span className="text-xs font-medium text-slate-500">
                第 {selectedDay} 天 · {dayItems.length} 個景點
              </span>
              <span className="text-xs text-slate-400">{activeIndex + 1} / {dayItems.length}</span>
            </div>

            {/* 橫向滑動卡片 */}
            <div
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              className="flex-1 overflow-x-auto flex gap-3 px-4 pb-4 pt-1 snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {dayItems.map((item, idx) => {
                const geo = geoResults[item.Itinerary_ID];
                const isActive = idx === activeIndex;
                const isPending = !geo || geo.status === 'pending';
                const isFound = geo?.status === 'found';
                const isNotFound = geo?.status === 'not_found';

                return (
                  <div
                    key={item.Itinerary_ID}
                    onClick={() => {
                      setActiveIndex(idx);
                      scrollCarouselTo(idx);
                    }}
                    className={`flex-shrink-0 snap-center rounded-2xl p-4 cursor-pointer transition-all duration-200 border
                      ${isActive
                        ? 'bg-white border-blue-300 shadow-md'
                        : 'bg-white border-slate-200 shadow-sm opacity-80'}`}
                    style={{ width: '85%' }}
                  >
                    <div className="flex items-start gap-3">
                      {/* 數字徽章 */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white
                        ${isActive ? 'bg-blue-600' : 'bg-slate-400'}`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        {item.Time && (
                          <span className="text-xs text-slate-400 font-mono">{item.Time}</span>
                        )}
                        <p className={`text-sm font-medium mt-0.5 leading-snug
                          ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                          {item.Activity}
                        </p>
                        {/* 定位狀態 */}
                        <div className="mt-2 flex items-center gap-1.5">
                          {isPending && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Loader2 size={11} className="animate-spin" /> 定位中...
                            </span>
                          )}
                          {isFound && (
                            <span className="flex items-center gap-1 text-xs text-emerald-600">
                              <MapPin size={11} /> 已定位
                            </span>
                          )}
                          {isNotFound && (
                            <span className="flex items-center gap-1 text-xs text-amber-500">
                              <AlertTriangle size={11} /> ⚠ 無法定位
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* 末尾留白，確保最後一張卡片可置中 */}
              <div className="flex-shrink-0" style={{ width: '7.5%' }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
