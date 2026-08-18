/*
 * Design system: "Departure Package" — a bounded, local-only readiness
 * snapshot turns the five most important pre-departure checks into one calm,
 * actionable status without storing receipt images, credentials, or payments.
 */
import type { Accommodation, Booking, Flight, ItineraryItem, Trip } from '../api/supabaseApi';

export const DEPARTURE_PACKAGE_SCHEMA_VERSION = 1;
export const DEPARTURE_PACKAGE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const DEPARTURE_PACKAGE_MAX_BYTES = 1024 * 1024;

export type DepartureReadinessStatus = 'ready' | 'review' | 'pending_sync' | 'stale';
export type DepartureSectionKey = 'itinerary' | 'flights' | 'accommodations' | 'pdf' | 'sync';
export type DepartureSectionStatus = Exclude<DepartureReadinessStatus, 'stale'>;

export interface DepartureSection {
  status: DepartureSectionStatus;
  label: string;
  detail: string;
  actionLabel: string;
  warningCodes: string[];
  count?: number;
}

export interface DeparturePackageContentSections {
  itinerary: { entries: Array<{ date: string; time: string; title: string; location: string }> };
  flights: { entries: Array<{ date: string; flightNo: string; departure: string; arrival: string; departureTime: string; arrivalTime: string }> };
  accommodations: { entries: Array<{ name: string; address: string; checkInDate: string; checkOutDate: string }> };
  pdf: { generatedAt: string | null };
  sync: { pendingCount: number };
}

export interface DeparturePackageSnapshot {
  tripId: string;
  userId: string;
  preparedAt: string;
  sourceUpdatedAt: string;
  schemaVersion: number;
  contentSections: DeparturePackageContentSections;
  warningCodes: string[];
  readinessStatus: DepartureReadinessStatus;
  sections: Record<DepartureSectionKey, DepartureSection>;
}

export interface DepartureReadiness {
  status: DepartureReadinessStatus;
  warningCodes: string[];
  sections: Record<DepartureSectionKey, DepartureSection>;
}

export interface DeparturePackageInput {
  trip: Trip;
  itinerary: ItineraryItem[];
  flights: Flight[];
  accommodations: Accommodation[];
  bookings: Booking[];
  pendingCount: number;
  hasPdf: boolean;
  userId: string;
  preparedAt?: string;
  pdfGeneratedAt?: string | null;
}

function dateValue(value?: string): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function isMeaningful(value?: string | null): boolean {
  return Boolean(value && value.trim());
}

function lower(source: string | undefined): string {
  return (source || '').toLocaleLowerCase();
}

function isFlightBooking(booking: Booking): boolean {
  const source = `${lower(booking.Booking_Type)} ${lower(booking.Booking_Name)}`;
  return ['flight', 'air', '航班', '機票', '飛機'].some(keyword => source.includes(keyword));
}

function isAccommodationBooking(booking: Booking): boolean {
  const source = `${lower(booking.Booking_Type)} ${lower(booking.Booking_Name)}`;
  return ['hotel', 'accommodation', 'stay', '住宿', '酒店', '旅館', '飯店', '民宿'].some(keyword => source.includes(keyword));
}

function latestUpdatedAt(trip: Trip, collections: Array<Array<{ Updated_At?: string; Created_At?: string }>>, fallback: string): string {
  const candidates = [trip.Updated_At, trip.Created_At];
  collections.forEach(items => items.forEach(item => candidates.push(item.Updated_At || item.Created_At || '')));
  const newest = candidates.reduce((latest, candidate) => dateValue(candidate) > dateValue(latest) ? candidate : latest, '');
  return newest || fallback;
}

function deriveOverallStatus(sections: Record<DepartureSectionKey, DepartureSection>): DepartureReadinessStatus {
  const values = Object.values(sections);
  if (values.some(section => section.status === 'pending_sync')) return 'pending_sync';
  if (values.some(section => section.status === 'review')) return 'review';
  return 'ready';
}

/** Derives a deterministic readiness summary from existing trip data only. */
export function deriveDepartureReadiness(
  trip: Trip,
  itinerary: ItineraryItem[],
  flights: Flight[],
  accommodations: Accommodation[],
  bookings: Booking[],
  pendingCount: number,
  hasPdf: boolean,
): DepartureReadiness {
  const itineraryWithContent = itinerary.filter(item => isMeaningful(item.Activity_Name) || isMeaningful(item.Activity));
  const flightCount = flights.length + bookings.filter(isFlightBooking).length;
  const accommodationCount = accommodations.length + bookings.filter(isAccommodationBooking).length;

  const sections: Record<DepartureSectionKey, DepartureSection> = {
    itinerary: itineraryWithContent.length > 0
      ? { status: 'ready', label: '行程已整理', detail: `已收錄 ${itineraryWithContent.length} 個行程項目`, actionLabel: '查看每日路線', warningCodes: [], count: itineraryWithContent.length }
      : { status: 'review', label: '尚未安排路線', detail: '先加入至少一個出發日或重要站點', actionLabel: '安排每日路線', warningCodes: ['itinerary_missing'], count: 0 },
    flights: flightCount > 0
      ? { status: 'ready', label: '航班資料已收錄', detail: `已找到 ${flightCount} 筆航班或機票資料`, actionLabel: '管理機票資料', warningCodes: [], count: flightCount }
      : { status: 'review', label: '尚未收錄航班', detail: '如本趟需要搭機，請補上航班或機票資料', actionLabel: '新增機票資料', warningCodes: ['flights_missing'], count: 0 },
    accommodations: accommodationCount > 0
      ? { status: 'ready', label: '住宿資料已收錄', detail: `已找到 ${accommodationCount} 筆住宿資料`, actionLabel: '管理住宿資料', warningCodes: [], count: accommodationCount }
      : { status: 'review', label: '尚未收錄住宿', detail: '如本趟需要住宿，請補上入住與退房資料', actionLabel: '新增住宿資料', warningCodes: ['accommodations_missing'], count: 0 },
    pdf: hasPdf
      ? { status: 'ready', label: '小冊子已下載', detail: '此裝置已有最近一次下載紀錄', actionLabel: '重新下載小冊子', warningCodes: [] }
      : { status: 'review', label: '尚未下載小冊子', detail: '出發前可下載 PDF 旅行小冊子備用', actionLabel: '下載旅行小冊子', warningCodes: ['pdf_not_downloaded'] },
    sync: pendingCount === 0
      ? { status: 'ready', label: '資料已同步', detail: '沒有等待上傳的離線支出', actionLabel: '查看同步狀態', warningCodes: [] }
      : { status: 'pending_sync', label: '仍有資料等待同步', detail: `${pendingCount} 筆離線支出會在連線後同步`, actionLabel: '立即同步', warningCodes: ['pending_sync'], count: pendingCount },
  };

  const warningCodes = Object.values(sections).flatMap(section => section.warningCodes);
  return { status: deriveOverallStatus(sections), warningCodes, sections };
}

/** A per-user key prevents one traveller's offline copy being shown to another user on the same device. */
export function departurePackageStorageKey(tripId: string, userId: string): string {
  return `departure-package:${tripId}:${userId}`;
}

function minimalContent(input: DeparturePackageInput): DeparturePackageContentSections {
  const flightEntries = input.flights.map(flight => ({
    date: flight.Flight_Date,
    flightNo: flight.Flight_No,
    departure: flight.Departure_Location,
    arrival: flight.Arrival_Location,
    departureTime: flight.Departure_Time,
    arrivalTime: flight.Arrival_Time,
  }));
  const accommodationEntries = input.accommodations.map(accommodation => ({
    name: accommodation.Name,
    address: accommodation.Address,
    checkInDate: accommodation.Check_In_Date,
    checkOutDate: accommodation.Check_Out_Date,
  }));
  return {
    itinerary: {
      entries: input.itinerary
        .filter(item => isMeaningful(item.Activity_Name) || isMeaningful(item.Activity))
        .map(item => ({ date: item.Date, time: item.Time, title: item.Activity_Name || item.Activity, location: item.Location || '' })),
    },
    flights: { entries: flightEntries },
    accommodations: { entries: accommodationEntries },
    pdf: { generatedAt: input.pdfGeneratedAt || (input.hasPdf ? input.preparedAt || new Date().toISOString() : null) },
    sync: { pendingCount: input.pendingCount },
  };
}

function compactContent(content: DeparturePackageContentSections): DeparturePackageContentSections {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 2);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...content,
    itinerary: { entries: content.itinerary.entries.filter(entry => !entry.date || entry.date.slice(0, 10) >= cutoffDate) },
    flights: { entries: content.flights.entries.filter(entry => !entry.date || entry.date.slice(0, 10) >= today) },
    accommodations: { entries: content.accommodations.entries.filter(entry => !entry.checkOutDate || entry.checkOutDate.slice(0, 10) >= today) },
  };
}

/** Builds the deliberately minimal JSON persisted in IndexedDB; it never includes attachments, receipt images, identity documents, or payment details. */
export function buildMinimalSnapshot(input: DeparturePackageInput): DeparturePackageSnapshot {
  const preparedAt = input.preparedAt || new Date().toISOString();
  const readiness = deriveDepartureReadiness(input.trip, input.itinerary, input.flights, input.accommodations, input.bookings, input.pendingCount, input.hasPdf);
  const sourceUpdatedAt = latestUpdatedAt(input.trip, [input.itinerary, input.flights, input.accommodations, input.bookings], preparedAt);
  let snapshot: DeparturePackageSnapshot = {
    tripId: input.trip.Trip_ID,
    userId: input.userId,
    preparedAt,
    sourceUpdatedAt,
    schemaVersion: DEPARTURE_PACKAGE_SCHEMA_VERSION,
    contentSections: minimalContent(input),
    warningCodes: readiness.warningCodes,
    readinessStatus: readiness.status,
    sections: readiness.sections,
  };

  if (new TextEncoder().encode(JSON.stringify(snapshot)).length > DEPARTURE_PACKAGE_MAX_BYTES) {
    snapshot = { ...snapshot, contentSections: compactContent(snapshot.contentSections) };
  }
  return snapshot;
}

/** A package becomes stale after 24 hours, or if a caller has evidence that source data is newer than the snapshot. */
export function isSnapshotStale(snapshot: DeparturePackageSnapshot, currentSourceUpdatedAt?: string): boolean {
  if (Date.now() - dateValue(snapshot.preparedAt) > DEPARTURE_PACKAGE_MAX_AGE_MS) return true;
  const knownSource = currentSourceUpdatedAt || snapshot.sourceUpdatedAt;
  return dateValue(knownSource) > dateValue(snapshot.preparedAt);
}

export function readinessFromSnapshot(snapshot: DeparturePackageSnapshot, currentSourceUpdatedAt?: string): DepartureReadiness {
  if (!isSnapshotStale(snapshot, currentSourceUpdatedAt)) {
    return { status: snapshot.readinessStatus, warningCodes: snapshot.warningCodes, sections: snapshot.sections };
  }
  const sections = Object.fromEntries(Object.entries(snapshot.sections).map(([key, section]) => [key, {
    ...section,
    detail: '資料包需要更新，以確認內容仍是最新狀態',
  }])) as Record<DepartureSectionKey, DepartureSection>;
  return { status: 'stale', warningCodes: [...snapshot.warningCodes, 'package_stale'], sections };
}

export function markSnapshotPdfReady(snapshot: DeparturePackageSnapshot, generatedAt = new Date().toISOString()): DeparturePackageSnapshot {
  const sections = {
    ...snapshot.sections,
    pdf: { status: 'ready' as const, label: '小冊子已下載', detail: '此裝置已有最近一次下載紀錄', actionLabel: '重新下載小冊子', warningCodes: [] },
  };
  const warningCodes = Object.values(sections).flatMap(section => section.warningCodes);
  return {
    ...snapshot,
    preparedAt: generatedAt,
    contentSections: { ...snapshot.contentSections, pdf: { generatedAt } },
    sections,
    warningCodes,
    readinessStatus: deriveOverallStatus(sections),
  };
}
