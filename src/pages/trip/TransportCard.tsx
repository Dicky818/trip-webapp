import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Train, Car, PersonStanding, Bike, RefreshCw, ChevronDown, ChevronUp, AlertCircle, Navigation } from 'lucide-react';
import { ItineraryItem } from '../../api/supabaseApi';
import { supabase } from '../../lib/supabase';

const GOOGLE_ROUTES_API_KEY = 'AIzaSyCgBcqumEfwXfqwdSVwj7q8GOymnY_C6fY';
const CACHE_TTL_DAYS = 30;
const DAILY_API_LIMIT = 300;
const DAILY_LIMIT_KEY = 'transport_api_daily';

type TravelMode = 'TRANSIT' | 'DRIVE' | 'WALK' | 'BICYCLE';

interface RouteResult {
  mode: TravelMode;
  duration: number; // seconds
  distanceMeters: number;
  fareAmount?: number;
  fareCurrency?: string;
  polyline?: string;
  steps?: TransitStep[];
  source: 'cache' | 'api' | 'estimate';
}

interface TransitStep {
  instruction: string;
  duration: number;
  transitLine?: string;
  fare?: number;
}

interface DailyCount {
  date: string;
  count: number;
}

function getDailyCount(): DailyCount {
  try {
    const raw = localStorage.getItem(DAILY_LIMIT_KEY);
    if (raw) {
      const d: DailyCount = JSON.parse(raw);
      const today = new Date().toISOString().slice(0, 10);
      if (d.date === today) return d;
    }
  } catch {}
  return { date: new Date().toISOString().slice(0, 10), count: 0 };
}

function incrementDailyCount() {
  const d = getDailyCount();
  d.count++;
  localStorage.setItem(DAILY_LIMIT_KEY, JSON.stringify(d));
}

function isOverDailyLimit(): boolean {
  return getDailyCount().count >= DAILY_API_LIMIT;
}

// Straight-line distance estimate (km)
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Rough estimate when API unavailable
function estimateRoute(mode: TravelMode, distKm: number): RouteResult {
  const speeds: Record<TravelMode, number> = { TRANSIT: 30, DRIVE: 40, WALK: 5, BICYCLE: 15 };
  const speed = speeds[mode];
  const roadFactor = mode === 'WALK' ? 1.2 : 1.4;
  const estKm = distKm * roadFactor;
  const duration = Math.round((estKm / speed) * 3600);
  return {
    mode,
    duration,
    distanceMeters: Math.round(estKm * 1000),
    source: 'estimate',
  };
}

// Fetch from Google Routes API
async function fetchFromGoogleRoutes(
  originLat: number, originLng: number,
  destLat: number, destLng: number,
  mode: TravelMode
): Promise<RouteResult | null> {
  if (isOverDailyLimit()) return null;

  const body: Record<string, unknown> = {
    origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
    destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
    travelMode: mode,
    languageCode: 'zh-TW',
  };

  if (mode === 'TRANSIT') {
    body.transitPreferences = { routingPreference: 'LESS_WALKING' };
  }

  const fieldMask = mode === 'TRANSIT'
    ? 'routes.duration,routes.distanceMeters,routes.polyline,routes.travelAdvisory.transitFare,routes.legs.steps'
    : 'routes.duration,routes.distanceMeters,routes.polyline';

  try {
    const resp = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_ROUTES_API_KEY,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    incrementDailyCount();

    const route = data.routes?.[0];
    if (!route) return null;

    const durationSec = parseInt(route.duration?.replace('s', '') || '0', 10);
    const distMeters = route.distanceMeters || 0;
    const fare = route.travelAdvisory?.transitFare;
    const steps: TransitStep[] = [];

    if (route.legs) {
      for (const leg of route.legs) {
        for (const step of (leg.steps || [])) {
          if (step.transitDetails) {
            steps.push({
              instruction: step.transitDetails.transitLine?.nameShort || step.transitDetails.transitLine?.name || '',
              duration: parseInt(step.staticDuration?.replace('s', '') || '0', 10),
              transitLine: step.transitDetails.transitLine?.nameShort,
            });
          }
        }
      }
    }

    return {
      mode,
      duration: durationSec,
      distanceMeters: distMeters,
      fareAmount: fare?.amount ? parseFloat(fare.amount) : undefined,
      fareCurrency: fare?.currencyCode,
      polyline: route.polyline?.encodedPolyline,
      steps: steps.length > 0 ? steps : undefined,
      source: 'api',
    };
  } catch {
    return null;
  }
}

// Cache helpers using Supabase
async function getCachedRoute(
  originCoords: string, destCoords: string, mode: TravelMode
): Promise<RouteResult | null> {
  try {
    const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 86400 * 1000).toISOString();
    const { data } = await supabase
      .schema('trip_planner')
      .from('route_cache')
      .select('*')
      .eq('origin_coords', originCoords)
      .eq('dest_coords', destCoords)
      .eq('travel_mode', mode)
      .gte('updated_at', cutoff)
      .single();

    if (!data) return null;
    return {
      mode,
      duration: data.duration || 0,
      distanceMeters: data.distance_meters || 0,
      fareAmount: data.fare_amount ? parseFloat(data.fare_amount) : undefined,
      fareCurrency: data.fare_currency || undefined,
      polyline: data.polyline || undefined,
      steps: data.steps || undefined,
      source: 'cache',
    };
  } catch {
    return null;
  }
}

async function saveRouteCache(
  originCoords: string, destCoords: string, mode: TravelMode, result: RouteResult
) {
  try {
    await supabase
      .schema('trip_planner')
      .from('route_cache')
      .upsert({
        origin_coords: originCoords,
        dest_coords: destCoords,
        travel_mode: mode,
        duration: result.duration,
        distance_meters: result.distanceMeters,
        fare_amount: result.fareAmount ?? null,
        fare_currency: result.fareCurrency ?? null,
        polyline: result.polyline ?? null,
        steps: result.steps ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'origin_coords,dest_coords,travel_mode' });
  } catch {
    // Ignore cache save errors (table may not exist yet)
  }
}

function formatDuration(sec: number): string {
  if (sec <= 0) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h > 0) return `${h}時${m > 0 ? m + '分' : ''}`;
  return `${m}分`;
}

function formatDistance(m: number): string {
  if (m <= 0) return '';
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${m} m`;
}

const MODE_LABELS: Record<TravelMode, string> = {
  TRANSIT: '大眾運輸',
  DRIVE: '開車',
  WALK: '步行',
  BICYCLE: '單車',
};

const MODE_ICONS: Record<TravelMode, React.ReactNode> = {
  TRANSIT: <Train size={13} />,
  DRIVE: <Car size={13} />,
  WALK: <PersonStanding size={13} />,
  BICYCLE: <Bike size={13} />,
};

const MODES: TravelMode[] = ['TRANSIT', 'DRIVE', 'WALK', 'BICYCLE'];

interface Props {
  from: ItineraryItem;
  to: ItineraryItem;
  dayColor: string;
}

export default function TransportCard({ from, to, dayColor }: Props) {
  const [activeMode, setActiveMode] = useState<TravelMode>('TRANSIT');
  const [results, setResults] = useState<Partial<Record<TravelMode, RouteResult>>>({});
  const [loading, setLoading] = useState<Partial<Record<TravelMode, boolean>>>({});
  const [expanded, setExpanded] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fromLat = parseFloat(String(from.Lat || ''));
  const fromLng = parseFloat(String(from.Lng || ''));
  const toLat = parseFloat(String(to.Lat || ''));
  const toLng = parseFloat(String(to.Lng || ''));
  const hasCoords = !isNaN(fromLat) && !isNaN(fromLng) && !isNaN(toLat) && !isNaN(toLng);

  const originCoords = hasCoords ? `${fromLat.toFixed(4)},${fromLng.toFixed(4)}` : '';
  const destCoords = hasCoords ? `${toLat.toFixed(4)},${toLng.toFixed(4)}` : '';
  const distKm = hasCoords ? haversineKm(fromLat, fromLng, toLat, toLng) : 0;

  // IntersectionObserver: only activate when card is visible in viewport
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const fetchRoute = useCallback(async (mode: TravelMode, forceRefresh = false) => {
    if (!hasCoords) return;
    if (results[mode] && !forceRefresh) return;

    setLoading(prev => ({ ...prev, [mode]: true }));

    // Try cache first
    if (!forceRefresh) {
      const cached = await getCachedRoute(originCoords, destCoords, mode);
      if (cached) {
        setResults(prev => ({ ...prev, [mode]: cached }));
        setLoading(prev => ({ ...prev, [mode]: false }));
        return;
      }
    }

    // Check daily limit
    if (isOverDailyLimit()) {
      setLimitReached(true);
      const est = estimateRoute(mode, distKm);
      setResults(prev => ({ ...prev, [mode]: est }));
      setLoading(prev => ({ ...prev, [mode]: false }));
      return;
    }

    // Fetch from API
    const apiResult = await fetchFromGoogleRoutes(fromLat, fromLng, toLat, toLng, mode);
    if (apiResult) {
      await saveRouteCache(originCoords, destCoords, mode, apiResult);
      setResults(prev => ({ ...prev, [mode]: apiResult }));
    } else {
      // Fallback to estimate
      const est = estimateRoute(mode, distKm);
      setResults(prev => ({ ...prev, [mode]: est }));
    }
    setLoading(prev => ({ ...prev, [mode]: false }));
  }, [hasCoords, originCoords, destCoords, distKm, fromLat, fromLng, toLat, toLng, results]);

  // Only fetch when visible AND has not fetched yet (lazy loading)
  useEffect(() => {
    if (isVisible && hasCoords && !hasFetched) {
      setHasFetched(true);
      fetchRoute('TRANSIT');
    }
  }, [isVisible, hasCoords, hasFetched]);

  // Fetch when mode changes (only if already activated)
  useEffect(() => {
    if (hasFetched && hasCoords) {
      fetchRoute(activeMode);
    }
  }, [activeMode]);

  if (!hasCoords) return null;

  const activeResult = results[activeMode];
  const isLoading = loading[activeMode];

  // Show compact placeholder before visible/fetched
  if (!hasFetched) {
    return (
      <div ref={containerRef} className="mx-0 my-1.5 rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2">
          <Navigation size={12} className="text-slate-300" />
          <span className="text-xs text-slate-400">
            {distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`}
          </span>
          <span className="text-xs text-slate-300">· 滑動至此查看交通資訊</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="mx-0 my-1.5 rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
      {/* Compact summary row */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Mode selector */}
        <div className="flex gap-0.5 flex-shrink-0">
          {MODES.map(mode => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`flex items-center gap-0.5 px-1.5 py-1 rounded-md text-xs font-medium transition-all ${
                activeMode === mode
                  ? 'text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
              }`}
              style={activeMode === mode ? { backgroundColor: dayColor } : {}}
              title={MODE_LABELS[mode]}
              aria-label={MODE_LABELS[mode]}
            >
              {MODE_ICONS[mode]}
            </button>
          ))}
        </div>

        {/* Result */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {isLoading ? (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <RefreshCw size={11} className="animate-spin" />
              <span>查詢中...</span>
            </div>
          ) : activeResult ? (
            <>
              <span className="text-sm font-semibold text-slate-700">
                {formatDuration(activeResult.duration)}
              </span>
              <span className="text-xs text-slate-400">
                {formatDistance(activeResult.distanceMeters)}
              </span>
              {activeResult.fareAmount != null && (
                <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
                  {activeResult.fareCurrency} {activeResult.fareAmount.toFixed(0)}
                </span>
              )}
              {activeResult.source === 'estimate' && (
                <span className="text-xs text-slate-400 italic">估算</span>
              )}
              {activeResult.source === 'cache' && (
                <span className="text-xs text-slate-300">●</span>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>

        {/* Expand / refresh */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => fetchRoute(activeMode, true)}
            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
            title="重新查詢"
            aria-label="重新查詢交通資訊"
          >
            <RefreshCw size={11} />
          </button>
          {activeResult?.steps && activeResult.steps.length > 0 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={expanded ? '收合詳情' : '展開詳情'}
            >
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
        </div>
      </div>

      {/* Limit warning */}
      {limitReached && (
        <div className="px-3 pb-2 flex items-center gap-1 text-xs text-amber-600">
          <AlertCircle size={11} />
          <span>今日即時查詢已達上限，顯示估算值</span>
        </div>
      )}

      {/* Expanded steps */}
      {expanded && activeResult?.steps && activeResult.steps.length > 0 && (
        <div className="px-3 pb-2 border-t border-slate-100 pt-2 space-y-1">
          {activeResult.steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
              <div
                className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: dayColor }}
              >
                {step.transitLine || <Train size={10} />}
              </div>
              <span className="flex-1 truncate">{step.instruction}</span>
              <span className="text-slate-400 flex-shrink-0">{formatDuration(step.duration)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
