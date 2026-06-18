import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapPin, AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { ItineraryItem, Trip } from '../../api/supabaseApi';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCgBcqumEfwXfqwdSVwj7q8GOymnY_C6fY';

declare global { interface Window { google: any; } }

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
  source?: 'manual' | 'geocode';
}

// Day colors for All view - 16 distinct colors
const DAY_COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed',
  '#0891b2', '#db2777', '#65a30d', '#ea580c', '#0284c7',
  '#9333ea', '#059669', '#b45309', '#e11d48', '#0d9488',
  '#4f46e5',
];

function getDayColor(day: number): string {
  return DAY_COLORS[(day - 1) % DAY_COLORS.length];
}

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
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geocoding&language=zh-TW`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    googleMapsLoaded = true;
    googleMapsLoading = false;
    googleMapsCallbacks.forEach(cb => cb());
    googleMapsCallbacks.length = 0;
  };
  document.head.appendChild(script);
}

async function geocodeWithGoogle(query: string): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    if (!window.google?.maps?.Geocoder) { resolve(null); return; }
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: query }, (results: any, status: any) => {
      if (status === 'OK' && results?.[0]) {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      } else {
        resolve(null);
      }
    });
  });
}

function isTooFar(lat1: number, lng1: number, lat2: number, lng2: number): boolean {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) > 800;
}

// ALL_DAYS sentinel value
const ALL_DAYS = 0;

export default function MapTab({ items, selectedDay, onDayChange, tripDays }: Props) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);
  const activeInfoWindowRef = useRef<any>(null);

  const [mapsReady, setMapsReady] = useState(false);
  const [geoResults, setGeoResults] = useState<Record<string, GeoResult>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [geocoding, setGeocoding] = useState(false);
  // viewDay: 0 = All, otherwise specific day
  const [viewDay, setViewDay] = useState<number>(ALL_DAYS);

  // Items for the current view
  const viewItems = useMemo(() => {
    if (viewDay === ALL_DAYS) {
      return [...items].sort((a, b) => {
        const dayDiff = Number(a.Day_Number) - Number(b.Day_Number);
        if (dayDiff !== 0) return dayDiff;
        return Number(a.Sort_Order) - Number(b.Sort_Order);
      });
    }
    return items
      .filter(i => Number(i.Day_Number) === viewDay)
      .sort((a, b) => Number(a.Sort_Order) - Number(b.Sort_Order));
  }, [items, viewDay]);

  // Sync viewDay with parent selectedDay when not in All mode
  useEffect(() => {
    if (viewDay !== ALL_DAYS) setViewDay(selectedDay);
  }, [selectedDay]);

  useEffect(() => {
    loadGoogleMaps(() => setMapsReady(true));
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapsReady || !mapContainerRef.current || mapRef.current) return;
    const map = new (window.google.maps.Map as any)(mapContainerRef.current, {
      center: { lat: 35.0116, lng: 135.7681 },
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      gestureHandling: 'greedy',
    });
    mapRef.current = map;
    return () => {
      markersRef.current.forEach(m => m.setMap(null));
      polylinesRef.current.forEach(p => p.setMap(null));
      mapRef.current = null;
    };
  }, [mapsReady]);

  // Geocode items for current view
  useEffect(() => {
    if (!mapsReady) return;
    if (viewItems.length === 0) { setGeoResults({}); return; }
    setGeocoding(true);
    setActiveIndex(0);

    const fetchAll = async () => {
      const results: Record<string, GeoResult> = {};
      for (const item of viewItems) {
        const key = item.Itinerary_ID;
        // Skip if already geocoded
        if (geoResults[key]?.status === 'found' || geoResults[key]?.status === 'not_found') {
          results[key] = geoResults[key];
          continue;
        }
        const manualLat = item.Lat !== undefined && item.Lat !== '' ? parseFloat(String(item.Lat)) : NaN;
        const manualLng = item.Lng !== undefined && item.Lng !== '' ? parseFloat(String(item.Lng)) : NaN;
        if (!isNaN(manualLat) && !isNaN(manualLng) && manualLat >= -90 && manualLat <= 90 && manualLng >= -180 && manualLng <= 180) {
          results[key] = { status: 'found', lat: manualLat, lng: manualLng, source: 'manual' };
          setGeoResults(prev => ({ ...prev, [key]: results[key] }));
          continue;
        }
        results[key] = { status: 'pending' };
        setGeoResults(prev => ({ ...prev, [key]: { status: 'pending' } }));
        const activity = (item.Activity_Name || item.Activity)?.trim();
        if (!activity) {
          results[key] = { status: 'not_found' };
          setGeoResults(prev => ({ ...prev, [key]: { status: 'not_found' } }));
          continue;
        }
        await new Promise(r => setTimeout(r, 200));
        const geo = await geocodeWithGoogle(activity);
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
  }, [viewDay, items, mapsReady]);

  // Track if activeIndex change was user-triggered (card click) vs day-change reset
  const userClickedCardRef = useRef(false);
  // Track previous viewDay + geoResults key to know when to fitBounds vs just pan
  const prevFitKeyRef = useRef('');

  // Update map markers and polylines
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapsReady) return;

    markersRef.current.forEach(m => m.setMap(null));
    polylinesRef.current.forEach(p => p.setMap(null));
    markersRef.current = [];
    polylinesRef.current = [];
    if (activeInfoWindowRef.current) {
      activeInfoWindowRef.current.close();
      activeInfoWindowRef.current = null;
    }

    const foundItems = viewItems
      .map((item, idx) => ({ item, idx, geo: geoResults[item.Itinerary_ID] }))
      .filter(({ geo }) => geo?.status === 'found' && geo.lat !== undefined);

    if (foundItems.length === 0) return;

    const bounds = new (window.google.maps as any).LatLngBounds();

    // Build per-day index counters for All view labels
    const dayIndexCounters: Record<number, number> = {};

    foundItems.forEach(({ item, idx, geo }) => {
      const isActive = idx === activeIndex;
      const dayNum = Number(item.Day_Number);
      const color = viewDay === ALL_DAYS ? getDayColor(dayNum) : (isActive ? '#2563eb' : '#64748b');
      const position = { lat: geo!.lat!, lng: geo!.lng! };

      // In All mode, label shows per-day sequential index; in single day mode, shows overall index
      let labelText: string;
      if (viewDay === ALL_DAYS) {
        dayIndexCounters[dayNum] = (dayIndexCounters[dayNum] || 0) + 1;
        labelText = String(dayIndexCounters[dayNum]);
      } else {
        labelText = String(idx + 1);
      }

      const marker = new (window.google.maps as any).Marker({
        position,
        map,
        label: {
          text: labelText,
          color: 'white',
          fontWeight: 'bold',
          fontSize: isActive ? '13px' : '11px',
        },
        draggable: false,
        icon: {
          path: (window.google.maps as any).SymbolPath.CIRCLE,
          scale: isActive ? 18 : 14,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2.5,
        },
        zIndex: isActive ? 100 : idx,
      });

      const dayLabel = viewDay === ALL_DAYS ? `第 ${dayNum} 天 · ` : '';
      const infoWindow = new (window.google.maps as any).InfoWindow({
        content: `<div style="font-family:system-ui,sans-serif;max-width:220px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="background:${color};color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;flex-shrink:0">${dayNum}</span>
            <b style="font-size:13px">${item.Activity_Name || item.Activity}</b>
          </div>
          ${dayLabel ? `<div style="color:#64748b;font-size:11px;margin-bottom:2px">${dayLabel}</div>` : ''}
          ${item.Activity_Name && item.Activity ? `<div style="color:#64748b;font-size:11px;margin-bottom:2px">${item.Activity}</div>` : ''}
          ${item.Time ? `<div style="color:#64748b;font-size:12px">🕐 ${item.Time}</div>` : ''}
          <div style="color:${geo!.source === 'manual' ? '#10b981' : '#94a3b8'};font-size:11px;margin-top:4px">${geo!.source === 'manual' ? '📍 手動座標' : '🔍 自動定位'}</div>
        </div>`,
      });

      // Find the correct viewItems index (foundItems only contains geocoded items, so idx != viewItems idx)
      const viewIdx = viewItems.findIndex(vi => vi.Itinerary_ID === item.Itinerary_ID);
      marker.addListener('click', () => {
        if (activeInfoWindowRef.current) activeInfoWindowRef.current.close();
        infoWindow.open(map, marker);
        activeInfoWindowRef.current = infoWindow;
        const targetIdx = viewIdx >= 0 ? viewIdx : idx;
        setActiveIndex(targetIdx);
        scrollCarouselTo(targetIdx);
      });

      marker.setMap(map);
      markersRef.current.push(marker);
      bounds.extend(position);
    });

    // Draw polylines - in All mode, draw per day; in single day mode, draw all
    if (viewDay === ALL_DAYS) {
      // Group by day and draw per-day polylines
      const dayGroups: Record<number, typeof foundItems> = {};
      foundItems.forEach(fi => {
        const d = Number(fi.item.Day_Number);
        if (!dayGroups[d]) dayGroups[d] = [];
        dayGroups[d].push(fi);
      });
      Object.entries(dayGroups).forEach(([dayStr, dayFoundItems]) => {
        const dayNum = Number(dayStr);
        const color = getDayColor(dayNum);
        for (let i = 0; i < dayFoundItems.length - 1; i++) {
          const a = dayFoundItems[i].geo!;
          const b = dayFoundItems[i + 1].geo!;
          const farApart = isTooFar(a.lat!, a.lng!, b.lat!, b.lng!);
          const polyline = new (window.google.maps as any).Polyline({
            path: [{ lat: a.lat!, lng: a.lng! }, { lat: b.lat!, lng: b.lng! }],
            strokeColor: color,
            strokeOpacity: farApart ? 0 : 0.6,
            strokeWeight: 2,
            icons: farApart ? [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '15px' }] : [],
            map,
          });
          polylinesRef.current.push(polyline);
        }
      });
    } else {
      for (let i = 0; i < foundItems.length - 1; i++) {
        const a = foundItems[i].geo!;
        const b = foundItems[i + 1].geo!;
        const farApart = isTooFar(a.lat!, a.lng!, b.lat!, b.lng!);
        const polyline = new (window.google.maps as any).Polyline({
          path: [{ lat: a.lat!, lng: a.lng! }, { lat: b.lat!, lng: b.lng! }],
          strokeColor: farApart ? '#f59e0b' : '#3b82f6',
          strokeOpacity: 0.7,
          strokeWeight: 2.5,
          icons: farApart ? [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 4 }, offset: '0', repeat: '20px' }] : [],
          map,
        });
        polylinesRef.current.push(polyline);
      }
    }

    // Only fitBounds when the view/geocoding changes, NOT when user just clicked a card
    const fitKey = `${viewDay}:${Object.keys(geoResults).filter(k => geoResults[k].status === 'found').sort().join(',')}`;
    const shouldFit = fitKey !== prevFitKeyRef.current;
    if (shouldFit) {
      prevFitKeyRef.current = fitKey;
      if (foundItems.length === 1) {
        map.setCenter({ lat: foundItems[0].geo!.lat!, lng: foundItems[0].geo!.lng! });
        map.setZoom(15);
      } else {
        map.fitBounds(bounds, 40);
      }
    } else if (userClickedCardRef.current) {
      // User clicked a card — pan to the active item
      userClickedCardRef.current = false;
      const activeItem = viewItems[activeIndex];
      if (activeItem) {
        const geo = geoResults[activeItem.Itinerary_ID];
        if (geo?.status === 'found' && geo.lat !== undefined && geo.lng !== undefined) {
          map.panTo({ lat: geo.lat, lng: geo.lng });
          const currentZoom = map.getZoom() || 13;
          if (currentZoom < 15) map.setZoom(15);
        }
      }
    }
  }, [geoResults, viewDay, activeIndex, mapsReady]);

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
    if (idx !== activeIndex && idx >= 0 && idx < viewItems.length) setActiveIndex(idx);
  }, [activeIndex, viewItems.length]);

  const handlePrevDay = () => {
    if (viewDay === ALL_DAYS) return;
    if (viewDay > 1) { const nd = viewDay - 1; setViewDay(nd); onDayChange(nd); setActiveIndex(0); }
    else { setViewDay(ALL_DAYS); setActiveIndex(0); }
  };

  const handleNextDay = () => {
    if (viewDay === ALL_DAYS) { const nd = 1; setViewDay(nd); onDayChange(nd); setActiveIndex(0); }
    else if (viewDay < tripDays.length) { const nd = viewDay + 1; setViewDay(nd); onDayChange(nd); setActiveIndex(0); }
  };

  const handleDayButtonClick = (day: number) => {
    setViewDay(day);
    onDayChange(day);
    setActiveIndex(0);
  };

  return (
    <div className="flex flex-col" style={{ minHeight: '600px' }}>
      {/* Day selector bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-100 flex-shrink-0">
        <button onClick={handlePrevDay} disabled={viewDay === ALL_DAYS}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="flex gap-1 flex-1 overflow-x-auto scrollbar-hide">
          {/* All button */}
          <button
            onClick={() => { setViewDay(ALL_DAYS); setActiveIndex(0); }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
              ${viewDay === ALL_DAYS ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
            All
            <span className="block text-[10px] opacity-70">全部</span>
          </button>
          {/* Per-day buttons with color indicator */}
          {tripDays.map(({ day, date }) => {
            const color = getDayColor(day);
            const isSelected = viewDay === day;
            return (
              <button key={day} onClick={() => handleDayButtonClick(day)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap border-2
                  ${isSelected ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border-transparent'}`}
                style={isSelected ? { backgroundColor: color, borderColor: color } : { borderColor: 'transparent' }}>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: isSelected ? 'white' : color }} />
                  Day {day}
                </span>
                <span className="block text-[10px] opacity-70">{date.slice(5).replace('-', '/')}</span>
              </button>
            );
          })}
        </div>
        <button onClick={handleNextDay} disabled={viewDay === tripDays.length}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Legend for All view */}
      {viewDay === ALL_DAYS && tripDays.length > 0 && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex-shrink-0">
          <div className="flex flex-wrap gap-2">
            {tripDays.map(({ day, date }) => (
              <button key={day} onClick={() => handleDayButtonClick(day)}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 transition-colors">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getDayColor(day) }} />
                <span>Day {day} ({date.slice(5).replace('-', '/')})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Google Maps area */}
      <div className="relative flex-shrink-0" style={{ height: '280px' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '280px' }} />
        {!mapsReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
            <Loader2 size={24} className="animate-spin text-blue-500" />
          </div>
        )}
        {geocoding && (
          <div className="absolute top-2 right-2 z-[100] bg-white rounded-lg shadow px-3 py-1.5 flex items-center gap-2 text-xs text-slate-600">
            <Loader2 size={13} className="animate-spin text-blue-500" />
            正在定位景點...
          </div>
        )}
        {!geocoding && viewItems.length === 0 && mapsReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 z-[100]">
            <div className="text-center text-slate-500">
              <MapPin size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">{viewDay === ALL_DAYS ? '尚無任何行程' : `第 ${viewDay} 天尚無行程`}</p>
              <p className="text-xs text-slate-400 mt-1">請在「每日行程」分頁新增行程</p>
            </div>
          </div>
        )}
      </div>

      {/* Carousel */}
      <div className="flex-1 bg-slate-50 overflow-hidden flex flex-col" style={{ minHeight: '200px' }}>
        {viewItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            請先在「每日行程」分頁新增行程
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 pt-3 pb-1 flex-shrink-0">
              <span className="text-xs font-medium text-slate-500">
                {viewDay === ALL_DAYS ? `全部 · ${viewItems.length} 個景點` : `第 ${viewDay} 天 · ${viewItems.length} 個景點`}
              </span>
              <span className="text-xs text-slate-400">{activeIndex + 1} / {viewItems.length}</span>
            </div>
            <div ref={carouselRef} onScroll={handleCarouselScroll}
              className="flex-1 overflow-x-auto flex gap-3 px-4 pb-4 pt-1 snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {(() => {
                // Build per-day index map for All view
                const dayCounters: Record<number, number> = {};
                const perDayIndex = viewItems.map(item => {
                  const d = Number(item.Day_Number);
                  dayCounters[d] = (dayCounters[d] || 0) + 1;
                  return dayCounters[d];
                });
                return viewItems.map((item, idx) => {
                const geo = geoResults[item.Itinerary_ID];
                const isActive = idx === activeIndex;
                const isPending = !geo || geo.status === 'pending';
                const isFound = geo?.status === 'found';
                const isNotFound = geo?.status === 'not_found';
                const isManual = geo?.source === 'manual';
                const dayNum = Number(item.Day_Number);
                const dayColor = getDayColor(dayNum);
                const cardLabel = viewDay === ALL_DAYS ? perDayIndex[idx] : idx + 1;
                return (
                  <div key={item.Itinerary_ID} onClick={() => { userClickedCardRef.current = true; setActiveIndex(idx); scrollCarouselTo(idx); }}
                    className={`flex-shrink-0 snap-center rounded-2xl p-4 cursor-pointer transition-all duration-200 border
                      ${isActive ? 'bg-white shadow-md' : 'bg-white border-slate-200 shadow-sm opacity-80'}`}
                    style={isActive ? { borderColor: viewDay === ALL_DAYS ? dayColor : '#93c5fd', borderWidth: '2px' } : {}}
                    data-width="85%">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: viewDay === ALL_DAYS ? dayColor : (isActive ? '#2563eb' : '#94a3b8') }}>
                        {cardLabel}
                      </div>
                      <div className="flex-1 min-w-0">
                        {viewDay === ALL_DAYS && (
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full text-white mb-1 inline-block"
                            style={{ backgroundColor: dayColor }}>
                            第 {dayNum} 天
                          </span>
                        )}
                        {item.Time && <span className="block text-xs text-slate-400 font-mono">{item.Time}</span>}
                        <p className={`text-sm font-medium mt-0.5 leading-snug ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                          {item.Activity_Name || item.Activity}
                        </p>
                        {item.Activity_Name && item.Activity && (
                          <p className="text-xs text-slate-400 leading-snug whitespace-pre-wrap break-words">{item.Activity}</p>
                        )}
                        {item.Note && (
                          <div className="mt-0.5 space-y-0.5">
                            {item.Note.split('\n').map((url, i) => {
                              const trimmed = url.trim();
                              if (!trimmed) return null;
                              return /^https?:\/\//.test(trimmed) ? (
                                <a key={i} href={trimmed} target="_blank" rel="noopener noreferrer"
                                  className="block text-xs text-blue-500 underline break-all italic">
                                  {trimmed}
                                </a>
                              ) : (
                                <p key={i} className="text-xs text-slate-400 italic">{trimmed}</p>
                              );
                            })}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-1.5">
                          {isPending && <span className="flex items-center gap-1 text-xs text-slate-400"><Loader2 size={11} className="animate-spin" /> 定位中...</span>}
                          {isFound && isManual && <span className="flex items-center gap-1 text-xs text-blue-600"><MapPin size={11} /> 手動座標</span>}
                          {isFound && !isManual && <span className="flex items-center gap-1 text-xs text-emerald-600"><MapPin size={11} /> 自動定位</span>}
                          {isNotFound && <span className="flex items-center gap-1 text-xs text-amber-500"><AlertTriangle size={11} /> 無法定位</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
              })()}
              <div className="flex-shrink-0 w-[7.5%]" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
