import { describe, expect, it } from 'vitest';
import type { Accommodation, Booking, Flight, ItineraryItem, Trip } from '../api/supabaseApi';
import { buildMinimalSnapshot, deriveDepartureReadiness, isSnapshotStale } from '../lib/departurePackage';

const trip: Trip = { Trip_ID: 'trip-1', Trip_Name: '東京', Start_Date: '2026-09-01', End_Date: '2026-09-05', Base_Currency: 'JPY', Created_At: '2026-08-01T00:00:00.000Z', Updated_At: '2026-08-01T00:00:00.000Z', Status: 'active' };
const itinerary: ItineraryItem[] = [{ Itinerary_ID: 'i-1', Trip_ID: 'trip-1', Day_Number: 1, Date: '2026-09-01', Time: '09:00', Activity_Name: '抵達東京', Activity: '', Location: '東京站', Sort_Order: 1, Created_At: '', Updated_At: '' }];
const flight: Flight = { Flight_ID: 'f-1', Trip_ID: 'trip-1', Flight_No: 'CX520', Flight_Date: '2026-09-01', Airline: 'CX', Departure_Location: 'HKG', Arrival_Location: 'NRT', Departure_Time: '09:00', Arrival_Time: '14:00', Arrival_Date: '2026-09-01', Duration: '', Status: 'confirmed', Source_Type: 'manual', Attachment: '', Created_At: '', Updated_At: '' };
const accommodation: Accommodation = { Accommodation_ID: 'a-1', Trip_ID: 'trip-1', Name: '東京酒店', Address: '東京', Check_In_Date: '2026-09-01', Check_Out_Date: '2026-09-05', Price: 0, Attachment: '', Created_At: '', Updated_At: '' };
const bookings: Booking[] = [];

describe('Departure Package readiness', () => {
  it('is ready when itinerary, flights, accommodations, PDF, and sync are all present', () => {
    expect(deriveDepartureReadiness(trip, itinerary, [flight], [accommodation], bookings, 0, true).status).toBe('ready');
  });

  it('asks for review when flights are missing', () => {
    const result = deriveDepartureReadiness(trip, itinerary, [], [accommodation], bookings, 0, true);
    expect(result.status).toBe('review');
    expect(result.sections.flights.warningCodes).toContain('flights_missing');
  });

  it('asks for review when accommodations are missing', () => {
    const result = deriveDepartureReadiness(trip, itinerary, [flight], [], bookings, 0, true);
    expect(result.status).toBe('review');
    expect(result.sections.accommodations.warningCodes).toContain('accommodations_missing');
  });

  it('prioritises a pending sync state over otherwise complete content', () => {
    const result = deriveDepartureReadiness(trip, itinerary, [flight], [accommodation], bookings, 2, true);
    expect(result.status).toBe('pending_sync');
    expect(result.sections.sync.status).toBe('pending_sync');
  });

  it('asks for review when the itinerary is empty', () => {
    const result = deriveDepartureReadiness(trip, [], [flight], [accommodation], bookings, 0, true);
    expect(result.status).toBe('review');
    expect(result.sections.itinerary.warningCodes).toContain('itinerary_missing');
  });

  it('marks snapshots older than 24 hours as stale', () => {
    const snapshot = buildMinimalSnapshot({ trip, itinerary, flights: [flight], accommodations: [accommodation], bookings, pendingCount: 0, hasPdf: true, userId: 'user-1', preparedAt: '2026-01-01T00:00:00.000Z' });
    expect(isSnapshotStale(snapshot)).toBe(true);
  });
});
