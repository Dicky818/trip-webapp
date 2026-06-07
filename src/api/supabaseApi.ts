// ============================================================
// Supabase API 統一呼叫層
// 取代原有的 GAS API，直接與 Supabase 資料庫互動
// ============================================================

import { supabase } from '../lib/supabase';

// ── Types ──────────────────────────────────────────────────
export interface Trip {
  Trip_ID: string;
  Trip_Name: string;
  Start_Date: string;
  End_Date: string;
  Base_Currency: string;
  Created_At: string;
  Updated_At: string;
  Status: string;
  Share_Code?: string;
  Share_Password?: string;
  Is_Owner?: boolean;
}

export interface TripCollaborator {
  id: string;
  trip_id: string;
  user_id: string;
  role: 'owner' | 'collaborator';
  joined_at: string;
  display_name?: string;
}

export interface UserProfile {
  User_ID: string;
  Display_Name: string;
  Created_At: string;
  Updated_At: string;
}

export interface Flight {
  Flight_ID: string;
  Trip_ID: string;
  Flight_No: string;
  Flight_Date: string;
  Airline: string;
  Departure_Location: string;
  Arrival_Location: string;
  Departure_Time: string;
  Arrival_Time: string;
  Arrival_Date: string;
  Duration: string;
  Status: string;
  Source_Type: string;
  Attachment: string;
  Created_At: string;
  Updated_At: string;
}

export interface Accommodation {
  Accommodation_ID: string;
  Trip_ID: string;
  Name: string;
  Address: string;
  Check_In_Date: string;
  Check_Out_Date: string;
  Price: string | number;
  Attachment: string;
  Created_At: string;
  Updated_At: string;
}

export interface Booking {
  Booking_ID: string;
  Trip_ID: string;
  Booking_Name: string;
  Booking_Type: string;
  Location: string;
  Date: string;
  Price: string | number;
  Attachment: string;
  Created_At: string;
  Updated_At: string;
}

export interface ItineraryItem {
  Itinerary_ID: string;
  Trip_ID: string;
  Day_Number: string | number;
  Date: string;
  Time: string;
  Activity_Name?: string;
  Activity: string;
  Note?: string;
  Location?: string;
  Sort_Order: string | number;
  Created_At: string;
  Updated_At: string;
  Lat?: string | number;
  Lng?: string | number;
}

export interface ItineraryAlternative {
  Alt_ID: string;
  Trip_ID: string;
  Day_Number: number;
  Time?: string;
  Activity: string;
  Activity_Name?: string;
  Note?: string;
  Location?: string;
  Lat?: number;
  Lng?: number;
  Created_At: string;
}

export interface DayAccommodation {
  Day_Accommodation_ID: string;
  Trip_ID: string;
  Day_Number: string | number;
  Date: string;
  Accommodation_ID: string;
  Created_At: string;
  Updated_At: string;
}

export interface Expense {
  Expense_ID: string;
  Trip_ID: string;
  Date: string;
  Main_Category: string;
  Sub_Category: string;
  Note: string;
  Original_Amount: string | number;
  Currency: string;
  Exchange_Rate: string | number;
  Base_Amount: string | number;
  Payer: string;
  Splitters: string;
  Is_Settled?: string | boolean;
  // Flight-specific fields
  Flight_No?: string;
  Airline?: string;
  Departure_Location?: string;
  Arrival_Location?: string;
  Flight_Date?: string;
  Departure_Time?: string;
  Landing_Time?: string;
  Arrival_Date?: string;
  Arrival_Time?: string;
  Return_Landing_Time?: string;
  Flight_Status?: string;
  // Accommodation-specific fields
  Accommodation_Name?: string;
  Accommodation_Address?: string;
  Check_In_Date?: string;
  Check_Out_Date?: string;
  // Rail pass fields
  Rail_Start_Date?: string;
  Rail_End_Date?: string;
  Rail_Order_No?: string;
  Rail_Platform?: string;
  // Booking flag
  Is_Booking?: boolean;
  Created_At: string;
  Updated_At: string;
}

export interface Category {
  Category_ID: string;
  Main_Category: string;
  Sub_Category: string;
  Is_Active: string;
  Created_At: string;
  Updated_At: string;
}

export interface Member {
  Member_ID: string;
  Member_Name: string;
  Is_Active: string;
  Created_At: string;
  Updated_At: string;
}

// TripMember now maps to trip_collaborators + user_profiles
// Member_ID = user_id, Member_Name = display_name
export interface TripMember {
  Trip_Member_ID: string;  // collaborator record id (or 'owner-{trip_id}' for owner)
  Trip_ID: string;
  Member_ID: string;        // user_id
  Member_Name: string;      // display_name from user_profiles
  Is_Owner: boolean;
  Created_At: string;
}

export interface Settlement {
  totalBase: number;
  categoryStats: Record<string, number>;
  memberBalances: Record<string, number>;
  memberPaid: Record<string, number>;
  memberOwed: Record<string, number>;
  settlements: Array<{ from: string; to: string; amount: number }>;
}

// ── Row mappers (DB columns → App interface) ───────────────

function rowToTrip(r: Record<string, unknown>): Trip {
  return {
    Trip_ID: r.id as string,
    Trip_Name: r.trip_name as string,
    Start_Date: (r.start_date as string) || '',
    End_Date: (r.end_date as string) || '',
    Base_Currency: (r.base_currency as string) || 'HKD',
    Created_At: (r.created_at as string) || '',
    Updated_At: (r.updated_at as string) || '',
    Status: 'active',
    Share_Code: (r.share_code as string) || '',
    Share_Password: (r.share_password as string) || '',
  };
}

function rowToFlight(r: Record<string, unknown>): Flight {
  return {
    Flight_ID: r.id as string,
    Trip_ID: r.trip_id as string,
    Flight_No: (r.flight_no as string) || '',
    Flight_Date: (r.flight_date as string) || '',
    Airline: '',
    Departure_Location: (r.departure_location as string) || '',
    Arrival_Location: (r.arrival_location as string) || '',
    Departure_Time: (r.departure_time as string) || '',
    Arrival_Time: (r.arrival_time as string) || '',
    Arrival_Date: (r.arrival_date as string) || '',
    Duration: (r.duration as string) || '',
    Status: 'confirmed',
    Source_Type: 'manual',
    Attachment: (r.attachment as string) || '',
    Created_At: (r.created_at as string) || '',
    Updated_At: (r.updated_at as string) || '',
  };
}

function rowToAccommodation(r: Record<string, unknown>): Accommodation {
  return {
    Accommodation_ID: r.id as string,
    Trip_ID: r.trip_id as string,
    Name: (r.name as string) || '',
    Address: (r.address as string) || '',
    Check_In_Date: (r.check_in_date as string) || '',
    Check_Out_Date: (r.check_out_date as string) || '',
    Price: (r.price as number) || 0,
    Attachment: (r.attachment as string) || '',
    Created_At: (r.created_at as string) || '',
    Updated_At: (r.updated_at as string) || '',
  };
}

function rowToBooking(r: Record<string, unknown>): Booking {
  return {
    Booking_ID: r.id as string,
    Trip_ID: r.trip_id as string,
    Booking_Name: (r.booking_name as string) || '',
    Booking_Type: (r.booking_type as string) || '',
    Location: (r.location as string) || '',
    Date: (r.date as string) || '',
    Price: (r.price as number) || 0,
    Attachment: (r.attachment as string) || '',
    Created_At: (r.created_at as string) || '',
    Updated_At: (r.updated_at as string) || '',
  };
}

function rowToItinerary(r: Record<string, unknown>): ItineraryItem {
  return {
    Itinerary_ID: r.id as string,
    Trip_ID: r.trip_id as string,
    Day_Number: r.day_number as number,
    Date: (r.date as string) || '',
    Time: (r.time as string) || '',
    Activity_Name: (r.activity_name as string) || '',
    Activity: (r.activity as string) || '',
    Note: (r.note as string) || '',
    Location: (r.location as string) || '',
    Sort_Order: (r.sort_order as number) || 0,
    Lat: r.lat as number | undefined,
    Lng: r.lng as number | undefined,
    Created_At: (r.created_at as string) || '',
    Updated_At: (r.updated_at as string) || '',
  };
}

function rowToExpense(r: Record<string, unknown>): Expense {
  return {
    Expense_ID: r.id as string,
    Trip_ID: r.trip_id as string,
    Date: (r.date as string) || '',
    Main_Category: (r.main_category as string) || '',
    Sub_Category: (r.sub_category as string) || '',
    Note: (r.note as string) || '',
    Original_Amount: (r.original_amount as number) || 0,
    Currency: (r.currency as string) || 'HKD',
    Exchange_Rate: (r.exchange_rate as number) || 1,
    Base_Amount: (r.base_amount as number) || 0,
    Payer: (r.payer as string) || '',
    Splitters: (r.splitters as string) || '',
    Is_Settled: r.is_settled as boolean,
    Flight_No: (r.flight_no as string) || '',
    Airline: (r.airline as string) || '',
    Departure_Location: (r.departure_location as string) || '',
    Arrival_Location: (r.arrival_location as string) || '',
    Flight_Date: (r.flight_date as string) || '',
    Departure_Time: (r.departure_time as string) || '',
    Landing_Time: (r.landing_time as string) || '',
    Arrival_Date: (r.arrival_date as string) || '',
    Arrival_Time: (r.arrival_time as string) || '',
    Return_Landing_Time: (r.return_landing_time as string) || '',
    Flight_Status: (r.flight_status as string) || '',
    Accommodation_Name: (r.accommodation_name as string) || '',
    Accommodation_Address: (r.accommodation_address as string) || '',
    Check_In_Date: (r.check_in_date as string) || '',
    Check_Out_Date: (r.check_out_date as string) || '',
    Rail_Start_Date: (r.rail_start_date as string) || '',
    Rail_End_Date: (r.rail_end_date as string) || '',
    Rail_Order_No: (r.rail_order_no as string) || '',
    Rail_Platform: (r.rail_platform as string) || '',
    Is_Booking: (r.is_booking as boolean) || false,
    Created_At: (r.created_at as string) || '',
    Updated_At: (r.updated_at as string) || '',
  };
}

function rowToCategory(r: Record<string, unknown>): Category {
  return {
    Category_ID: r.id as string,
    Main_Category: (r.main_category as string) || '',
    Sub_Category: (r.sub_category as string) || '',
    Is_Active: r.is_active ? 'TRUE' : 'FALSE',
    Created_At: (r.created_at as string) || '',
    Updated_At: (r.created_at as string) || '',
  };
}

function rowToMember(r: Record<string, unknown>): Member {
  return {
    Member_ID: r.id as string,
    Member_Name: (r.member_name as string) || '',
    Is_Active: r.is_active ? 'TRUE' : 'FALSE',
    Created_At: (r.created_at as string) || '',
    Updated_At: (r.created_at as string) || '',
  };
}

// ── Helper ─────────────────────────────────────────────────
function ok<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}
function err(msg: string): { success: false; error: string } {
  return { success: false, error: msg };
}

// ── Settlement calculation (client-side) ───────────────────
function calcSettlement(expenses: Expense[], members: string[]): Settlement {
  const totalBase = expenses.reduce((s, e) => s + Number(e.Base_Amount || 0), 0);
  const categoryStats: Record<string, number> = {};
  const memberPaid: Record<string, number> = {};
  const memberOwed: Record<string, number> = {};

  members.forEach(m => { memberPaid[m] = 0; memberOwed[m] = 0; });

  expenses.forEach(e => {
    const cat = e.Main_Category || '其他';
    categoryStats[cat] = (categoryStats[cat] || 0) + Number(e.Base_Amount || 0);

    const payer = e.Payer;
    const amt = Number(e.Base_Amount || 0);
    if (payer) memberPaid[payer] = (memberPaid[payer] || 0) + amt;

    const splitterList = e.Splitters
      ? e.Splitters.split(',').map(s => s.trim()).filter(Boolean)
      : members;
    const share = splitterList.length > 0 ? amt / splitterList.length : 0;
    splitterList.forEach(m => { memberOwed[m] = (memberOwed[m] || 0) + share; });
  });

  const memberBalances: Record<string, number> = {};
  const allMembers = new Set([...Object.keys(memberPaid), ...Object.keys(memberOwed)]);
  allMembers.forEach(m => {
    memberBalances[m] = (memberPaid[m] || 0) - (memberOwed[m] || 0);
  });

  // Matrix settlement algorithm (who owes whom)
  const settlements: Array<{ from: string; to: string; amount: number }> = [];
  const bal = { ...memberBalances };
  const debtors = Object.entries(bal).filter(([, v]) => v < -0.01).sort((a, b) => a[1] - b[1]);
  const creditors = Object.entries(bal).filter(([, v]) => v > 0.01).sort((a, b) => b[1] - a[1]);

  let di = 0, ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const [debtor, dAmt] = debtors[di];
    const [creditor, cAmt] = creditors[ci];
    const transfer = Math.min(-dAmt, cAmt);
    if (transfer > 0.01) {
      settlements.push({ from: debtor, to: creditor, amount: Math.round(transfer * 100) / 100 });
    }
    debtors[di][1] += transfer;
    creditors[ci][1] -= transfer;
    if (Math.abs(debtors[di][1]) < 0.01) di++;
    if (Math.abs(creditors[ci][1]) < 0.01) ci++;
  }

  return { totalBase, categoryStats, memberBalances, memberPaid, memberOwed, settlements };
}

// ── Exchange Rate ──────────────────────────────────────────
async function fetchExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;
  try {
    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
    const data = await res.json();
    return data.rates?.[to] || 1;
  } catch {
    return 1;
  }
}

// ── API ────────────────────────────────────────────────────
export const api = {

  // ── Trips ────────────────────────────────────────────────
  getTrips: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return err('User not logged in');

    // Get trips owned by user
    const { data: ownedTrips, error: ownedError } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id);

    if (ownedError) return err(ownedError.message);

    // Get trips where user is a collaborator
    const { data: collabRecords, error: collabError } = await supabase
      .from('trip_collaborators')
      .select('trip_id')
      .eq('user_id', user.id);

    if (collabError) return err(collabError.message);

    let collabTrips: any[] = [];
    if (collabRecords && collabRecords.length > 0) {
      const tripIds = collabRecords.map(r => r.trip_id);
      const { data: sharedTrips, error: sharedError } = await supabase
        .from('trips')
        .select('*')
        .in('id', tripIds);
        
      if (!sharedError && sharedTrips) {
        collabTrips = sharedTrips;
      }
    }

    // Combine and deduplicate
    const allTripsMap = new Map();
    
    (ownedTrips || []).forEach(t => {
      allTripsMap.set(t.id, { ...rowToTrip(t), Is_Owner: true });
    });
    
    collabTrips.forEach(t => {
      if (!allTripsMap.has(t.id)) {
        allTripsMap.set(t.id, { ...rowToTrip(t), Is_Owner: false });
      }
    });

    const result = Array.from(allTripsMap.values()).sort((a, b) => {
      return new Date(b.Start_Date).getTime() - new Date(a.Start_Date).getTime();
    });

    return ok(result);
  },

  getTripById: async (tripId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();
    if (error) return err(error.message);
    const trip = rowToTrip(data);
    // Check if current user is the owner
    const isOwner = user && data.user_id === user.id;
    return ok({ ...trip, Is_Owner: !!isOwner });
  },

  createTrip: async (body: Partial<Trip>) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: user?.id || null,
        trip_name: body.Trip_Name,
        start_date: body.Start_Date || null,
        end_date: body.End_Date || null,
        base_currency: body.Base_Currency || 'HKD',
      })
      .select()
      .single();
    if (error) return err(error.message);
    return ok(rowToTrip(data));
  },

  updateTrip: async (tripId: string, body: Partial<Trip>) => {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.Trip_Name !== undefined) updates.trip_name = body.Trip_Name;
    if (body.Start_Date !== undefined) updates.start_date = body.Start_Date || null;
    if (body.End_Date !== undefined) updates.end_date = body.End_Date || null;
    if (body.Base_Currency !== undefined) updates.base_currency = body.Base_Currency;
    const { error } = await supabase.from('trips').update(updates).eq('id', tripId);
    if (error) return err(error.message);
    return ok({ Trip_ID: tripId });
  },

  deleteTrip: async (tripId: string) => {
    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    if (error) return err(error.message);
    return ok(null);
  },

  // ── Trip Sharing ─────────────────────────────────────────
  generateShareCode: async (tripId: string) => {
    const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const sharePassword = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { error } = await supabase
      .from('trips')
      .update({ share_code: shareCode, share_password: sharePassword })
      .eq('id', tripId);
      
    if (error) return err(error.message);
    return ok({ shareCode, sharePassword });
  },

  joinTripByCode: async (shareCode: string, sharePassword: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return err('User not logged in');

    // Find the trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('share_code', shareCode)
      .eq('share_password', sharePassword)
      .single();

    if (tripError || !trip) return err('Invalid share code or password');

    // Check if already a collaborator
    const { data: existing } = await supabase
      .from('trip_collaborators')
      .select('id')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .single();

    if (existing) return ok({ Trip_ID: trip.id });

    // Add as collaborator
    const { error: joinError } = await supabase
      .from('trip_collaborators')
      .insert({
        trip_id: trip.id,
        user_id: user.id,
        role: 'collaborator'
      });

    if (joinError) return err(joinError.message);
    return ok({ Trip_ID: trip.id });
  },

  getTripCollaborators: async (tripId: string) => {
    const { data, error } = await supabase
      .from('trip_collaborators')
      .select('*')
      .eq('trip_id', tripId);
      
    if (error) return err(error.message);
    return ok(data as TripCollaborator[]);
  },

  removeCollaborator: async (collaboratorId: string) => {
    const { error } = await supabase
      .from('trip_collaborators')
      .delete()
      .eq('id', collaboratorId);
    if (error) return err(error.message);
    return ok(null);
  },

  // ── Flights ──────────────────────────────────────────────
  getFlights: async (tripId: string) => {
    const { data, error } = await supabase
      .from('flights')
      .select('*')
      .eq('trip_id', tripId)
      .order('flight_date');
    if (error) return err(error.message);
    return ok((data || []).map(rowToFlight));
  },

  createFlight: async (body: Partial<Flight>) => {
    const { data, error } = await supabase
      .from('flights')
      .insert({
        trip_id: body.Trip_ID,
        flight_no: body.Flight_No || '',
        flight_date: body.Flight_Date || null,
        departure_location: body.Departure_Location || '',
        arrival_location: body.Arrival_Location || '',
        departure_time: body.Departure_Time || '',
        arrival_time: body.Arrival_Time || '',
        arrival_date: body.Arrival_Date || null,
        duration: body.Duration || '',
        attachment: body.Attachment || '',
      })
      .select()
      .single();
    if (error) return err(error.message);
    return ok(rowToFlight(data));
  },

  updateFlight: async (flightId: string, body: Partial<Flight>) => {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.Flight_No !== undefined) updates.flight_no = body.Flight_No;
    if (body.Flight_Date !== undefined) updates.flight_date = body.Flight_Date || null;
    if (body.Departure_Location !== undefined) updates.departure_location = body.Departure_Location;
    if (body.Arrival_Location !== undefined) updates.arrival_location = body.Arrival_Location;
    if (body.Departure_Time !== undefined) updates.departure_time = body.Departure_Time;
    if (body.Arrival_Time !== undefined) updates.arrival_time = body.Arrival_Time;
    if (body.Arrival_Date !== undefined) updates.arrival_date = body.Arrival_Date || null;
    if (body.Duration !== undefined) updates.duration = body.Duration;
    if (body.Attachment !== undefined) updates.attachment = body.Attachment;
    const { error } = await supabase.from('flights').update(updates).eq('id', flightId);
    if (error) return err(error.message);
    return ok(null);
  },

  deleteFlight: async (flightId: string) => {
    const { error } = await supabase.from('flights').delete().eq('id', flightId);
    if (error) return err(error.message);
    return ok(null);
  },

  // ── Accommodations ───────────────────────────────────────
  getAccommodations: async (tripId: string) => {
    const { data, error } = await supabase
      .from('accommodations')
      .select('*')
      .eq('trip_id', tripId)
      .order('check_in_date');
    if (error) return err(error.message);
    return ok((data || []).map(rowToAccommodation));
  },

  createAccommodation: async (body: Partial<Accommodation>) => {
    const { data, error } = await supabase
      .from('accommodations')
      .insert({
        trip_id: body.Trip_ID,
        name: body.Name || '',
        address: body.Address || '',
        check_in_date: body.Check_In_Date || null,
        check_out_date: body.Check_Out_Date || null,
        price: Number(body.Price) || 0,
        attachment: body.Attachment || '',
      })
      .select()
      .single();
    if (error) return err(error.message);
    return ok(rowToAccommodation(data));
  },

  updateAccommodation: async (accommodationId: string, body: Partial<Accommodation>) => {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.Name !== undefined) updates.name = body.Name;
    if (body.Address !== undefined) updates.address = body.Address;
    if (body.Check_In_Date !== undefined) updates.check_in_date = body.Check_In_Date || null;
    if (body.Check_Out_Date !== undefined) updates.check_out_date = body.Check_Out_Date || null;
    if (body.Price !== undefined) updates.price = Number(body.Price) || 0;
    if (body.Attachment !== undefined) updates.attachment = body.Attachment;
    const { error } = await supabase.from('accommodations').update(updates).eq('id', accommodationId);
    if (error) return err(error.message);
    return ok(null);
  },

  deleteAccommodation: async (accommodationId: string) => {
    const { error } = await supabase.from('accommodations').delete().eq('id', accommodationId);
    if (error) return err(error.message);
    return ok(null);
  },

  // ── Bookings ─────────────────────────────────────────────
  getBookings: async (tripId: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('trip_id', tripId)
      .order('date');
    if (error) return err(error.message);
    return ok((data || []).map(rowToBooking));
  },

  createBooking: async (body: Partial<Booking>) => {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        trip_id: body.Trip_ID,
        booking_name: body.Booking_Name || '',
        booking_type: body.Booking_Type || '',
        location: body.Location || '',
        date: body.Date || null,
        price: Number(body.Price) || 0,
        attachment: body.Attachment || '',
      })
      .select()
      .single();
    if (error) return err(error.message);
    return ok(rowToBooking(data));
  },

  updateBooking: async (bookingId: string, body: Partial<Booking>) => {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.Booking_Name !== undefined) updates.booking_name = body.Booking_Name;
    if (body.Booking_Type !== undefined) updates.booking_type = body.Booking_Type;
    if (body.Location !== undefined) updates.location = body.Location;
    if (body.Date !== undefined) updates.date = body.Date || null;
    if (body.Price !== undefined) updates.price = Number(body.Price) || 0;
    if (body.Attachment !== undefined) updates.attachment = body.Attachment;
    const { error } = await supabase.from('bookings').update(updates).eq('id', bookingId);
    if (error) return err(error.message);
    return ok(null);
  },

  deleteBooking: async (bookingId: string) => {
    const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
    if (error) return err(error.message);
    return ok(null);
  },

  // ── Itinerary ────────────────────────────────────────────
  getItinerary: async (tripId: string) => {
    const { data, error } = await supabase
      .from('itinerary')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_number')
      .order('sort_order')
      .order('time');
    if (error) return err(error.message);
    return ok((data || []).map(rowToItinerary));
  },

  createItineraryItem: async (body: Partial<ItineraryItem>) => {
    const { data, error } = await supabase
      .from('itinerary')
      .insert({
        trip_id: body.Trip_ID,
        day_number: Number(body.Day_Number) || 1,
        date: body.Date || null,
        time: body.Time || '',
        activity_name: body.Activity_Name || '',
        activity: body.Activity || '',
        note: body.Note || '',
        location: body.Location || '',
        sort_order: Number(body.Sort_Order) || 0,
        lat: body.Lat ? Number(body.Lat) : null,
        lng: body.Lng ? Number(body.Lng) : null,
      })
      .select()
      .single();
    if (error) return err(error.message);
    return ok(rowToItinerary(data));
  },

  updateItineraryItem: async (itineraryId: string, body: Partial<ItineraryItem>) => {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.Day_Number !== undefined) updates.day_number = Number(body.Day_Number);
    if (body.Date !== undefined) updates.date = body.Date || null;
    if (body.Time !== undefined) updates.time = body.Time;
    if (body.Activity_Name !== undefined) updates.activity_name = body.Activity_Name;
    if (body.Activity !== undefined) updates.activity = body.Activity;
    if (body.Note !== undefined) updates.note = body.Note;
    if (body.Location !== undefined) updates.location = body.Location;
    if (body.Sort_Order !== undefined) updates.sort_order = Number(body.Sort_Order);
    if (body.Lat !== undefined) updates.lat = body.Lat ? Number(body.Lat) : null;
    if (body.Lng !== undefined) updates.lng = body.Lng ? Number(body.Lng) : null;
    const { error } = await supabase.from('itinerary').update(updates).eq('id', itineraryId);
    if (error) return err(error.message);
    return ok(null);
  },

  deleteItineraryItem: async (itineraryId: string) => {
    const { error } = await supabase.from('itinerary').delete().eq('id', itineraryId);
    if (error) return err(error.message);
    return ok(null);
  },

  reorderItinerary: async (items: Array<{ Itinerary_ID: string; Sort_Order: number }>) => {
    const updates = items.map(item =>
      supabase.from('itinerary').update({ sort_order: item.Sort_Order }).eq('id', item.Itinerary_ID)
    );
    await Promise.all(updates);
    return ok(null);
  },

  copyDayItinerary: async (body: { Trip_ID: string; fromDay: number; toDay: number; fromDate?: string; toDate?: string }) => {
    const { data: sourceItems, error } = await supabase
      .from('itinerary')
      .select('*')
      .eq('trip_id', body.Trip_ID)
      .eq('day_number', body.fromDay);
    if (error) return err(error.message);

    const newItems = (sourceItems || []).map(item => ({
      trip_id: body.Trip_ID,
      day_number: body.toDay,
      date: body.toDate || null,
      time: item.time,
      activity: item.activity,
      location: item.location || '',
      sort_order: item.sort_order,
      lat: item.lat,
      lng: item.lng,
    }));

    if (newItems.length === 0) return ok([]);
    const { data: inserted, error: insertError } = await supabase.from('itinerary').insert(newItems).select();
    if (insertError) return err(insertError.message);
    return ok((inserted || []).map(rowToItinerary));
  },

  // ── Alternative Itinerary ────────────────────────────────
  getAlternatives: async (tripId: string) => {
    const { data, error } = await supabase
      .from('itinerary_alternatives')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_number')
      .order('created_at');
    if (error) return err(error.message);
    return ok((data || []).map((r: Record<string, unknown>) => ({
      Alt_ID: r.id as string,
      Trip_ID: r.trip_id as string,
      Day_Number: r.day_number as number,
      Time: (r.time as string) || '',
      Activity: (r.activity as string) || '',
      Activity_Name: (r.activity_name as string) || '',
      Note: (r.note as string) || '',
      Location: (r.location_name as string) || '',
      Lat: r.lat as number | undefined,
      Lng: r.lng as number | undefined,
      Created_At: (r.created_at as string) || '',
    } as ItineraryAlternative)));
  },

  createAlternative: async (body: Partial<ItineraryAlternative>) => {
    const { data, error } = await supabase
      .from('itinerary_alternatives')
      .insert({
        trip_id: body.Trip_ID,
        day_number: Number(body.Day_Number) || 1,
        time: body.Time || '',
        activity: body.Activity || '',
        activity_name: body.Activity_Name || '',
        note: body.Note || '',
        location_name: body.Location || '',
        lat: body.Lat ? Number(body.Lat) : null,
        lng: body.Lng ? Number(body.Lng) : null,
      })
      .select()
      .single();
    if (error) return err(error.message);
    return ok({
      Alt_ID: data.id as string,
      Trip_ID: data.trip_id as string,
      Day_Number: data.day_number as number,
      Time: (data.time as string) || '',
      Activity: (data.activity as string) || '',
      Activity_Name: (data.activity_name as string) || '',
      Note: (data.note as string) || '',
      Location: (data.location_name as string) || '',
      Lat: data.lat as number | undefined,
      Lng: data.lng as number | undefined,
      Created_At: (data.created_at as string) || '',
    } as ItineraryAlternative);
  },

  updateAlternative: async (altId: string, body: Partial<ItineraryAlternative>) => {
    const updates: Record<string, unknown> = {};
    if (body.Time !== undefined) updates.time = body.Time;
    if (body.Activity !== undefined) updates.activity = body.Activity;
    if (body.Activity_Name !== undefined) updates.activity_name = body.Activity_Name;
    if (body.Note !== undefined) updates.note = body.Note;
    if (body.Location !== undefined) updates.location_name = body.Location;
    if (body.Lat !== undefined) updates.lat = body.Lat ? Number(body.Lat) : null;
    if (body.Lng !== undefined) updates.lng = body.Lng ? Number(body.Lng) : null;
    const { error } = await supabase.from('itinerary_alternatives').update(updates).eq('id', altId);
    if (error) return err(error.message);
    return ok(null);
  },

  deleteAlternative: async (altId: string) => {
    const { error } = await supabase.from('itinerary_alternatives').delete().eq('id', altId);
    if (error) return err(error.message);
    return ok(null);
  },

  // ── Day Accommodations ───────────────────────────────────
  getDayAccommodations: async (tripId: string) => {
    const { data, error } = await supabase
      .from('day_accommodations')
      .select('*')
      .eq('trip_id', tripId);
    if (error) return err(error.message);
    return ok((data || []).map(r => ({
      Day_Accommodation_ID: r.id as string,
      Trip_ID: r.trip_id as string,
      Day_Number: r.day_number as number,
      Date: '',
      // Use expense_id (new) or fall back to accommodation_id (legacy)
      Accommodation_ID: (r.expense_id as string) || (r.accommodation_id as string) || '',
      Created_At: (r.created_at as string) || '',
      Updated_At: (r.created_at as string) || '',
    } as DayAccommodation)));
  },

  setDayAccommodation: async (body: Partial<DayAccommodation>) => {
    // Upsert: delete existing for this day then insert
    await supabase
      .from('day_accommodations')
      .delete()
      .eq('trip_id', body.Trip_ID!)
      .eq('day_number', body.Day_Number!);

    if (body.Accommodation_ID) {
      const { error } = await supabase.from('day_accommodations').insert({
        trip_id: body.Trip_ID,
        day_number: body.Day_Number,
        expense_id: body.Accommodation_ID,  // Store as expense_id (references expenses table)
      });
      if (error) return err(error.message);
    }
    return ok(null);
  },

  deleteDayAccommodation: async (dayAccommodationId: string) => {
    const { error } = await supabase.from('day_accommodations').delete().eq('id', dayAccommodationId);
    if (error) return err(error.message);
    return ok(null);
  },

  // ── Expenses ─────────────────────────────────────────────
  getExpenses: async (tripId: string) => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId)
      .order('date')
      .order('created_at');
    if (error) return err(error.message);
    return ok((data || []).map(rowToExpense));
  },

  createExpense: async (body: Partial<Expense>) => {
    const tripRes = await api.getTripById(body.Trip_ID!);
    const baseCurrency = (tripRes.success && (tripRes as { success: true; data: Trip }).data?.Base_Currency) || 'HKD';
    let exchangeRate = 1;
    let baseAmount = Number(body.Original_Amount) || 0;
    if (body.Currency && body.Currency !== baseCurrency) {
      exchangeRate = await fetchExchangeRate(body.Currency, baseCurrency);
      baseAmount = Math.round(baseAmount * exchangeRate * 100) / 100;
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        trip_id: body.Trip_ID,
        date: body.Date || null,
        main_category: body.Main_Category || '',
        sub_category: body.Sub_Category || '',
        note: body.Note || '',
        original_amount: Number(body.Original_Amount) || 0,
        currency: body.Currency || baseCurrency,
        exchange_rate: exchangeRate,
        base_amount: baseAmount,
        payer: body.Payer || '',
        splitters: body.Splitters || '',
        is_settled: false,
        flight_no: body.Flight_No || null,
        airline: body.Airline || null,
        departure_location: body.Departure_Location || null,
        arrival_location: body.Arrival_Location || null,
        flight_date: body.Flight_Date || null,
        departure_time: body.Departure_Time || null,
        landing_time: body.Landing_Time || null,
        arrival_date: body.Arrival_Date || null,
        arrival_time: body.Arrival_Time || null,
        return_landing_time: body.Return_Landing_Time || null,
        flight_status: body.Flight_Status || null,
        accommodation_name: body.Accommodation_Name || null,
        accommodation_address: body.Accommodation_Address || null,
        check_in_date: body.Check_In_Date || null,
        check_out_date: body.Check_Out_Date || null,
        rail_start_date: body.Rail_Start_Date || null,
        rail_end_date: body.Rail_End_Date || null,
        rail_order_no: body.Rail_Order_No || null,
        rail_platform: body.Rail_Platform || null,
        is_booking: body.Is_Booking || false,
      })
      .select()
      .single();
    if (error) return err(error.message);
    return ok(rowToExpense(data));
  },

  updateExpense: async (expenseId: string, body: Partial<Expense>) => {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.Date !== undefined) updates.date = body.Date || null;
    if (body.Main_Category !== undefined) updates.main_category = body.Main_Category;
    if (body.Sub_Category !== undefined) updates.sub_category = body.Sub_Category;
    if (body.Note !== undefined) updates.note = body.Note;
    if (body.Payer !== undefined) updates.payer = body.Payer;
    if (body.Splitters !== undefined) updates.splitters = body.Splitters;
    if (body.Is_Settled !== undefined) {
      updates.is_settled = body.Is_Settled === true || String(body.Is_Settled).toUpperCase() === 'TRUE';
    }
    if (body.Flight_No !== undefined) updates.flight_no = body.Flight_No;
    if (body.Airline !== undefined) updates.airline = body.Airline;
    if (body.Departure_Location !== undefined) updates.departure_location = body.Departure_Location;
    if (body.Arrival_Location !== undefined) updates.arrival_location = body.Arrival_Location;
    if (body.Flight_Date !== undefined) updates.flight_date = body.Flight_Date || null;
    if (body.Departure_Time !== undefined) updates.departure_time = body.Departure_Time;
    if (body.Landing_Time !== undefined) updates.landing_time = body.Landing_Time;
    if (body.Arrival_Date !== undefined) updates.arrival_date = body.Arrival_Date || null;
    if (body.Arrival_Time !== undefined) updates.arrival_time = body.Arrival_Time;
    if (body.Return_Landing_Time !== undefined) updates.return_landing_time = body.Return_Landing_Time;
    if (body.Flight_Status !== undefined) updates.flight_status = body.Flight_Status;
    if (body.Accommodation_Name !== undefined) updates.accommodation_name = body.Accommodation_Name;
    if (body.Accommodation_Address !== undefined) updates.accommodation_address = body.Accommodation_Address;
    if (body.Check_In_Date !== undefined) updates.check_in_date = body.Check_In_Date || null;
    if (body.Check_Out_Date !== undefined) updates.check_out_date = body.Check_Out_Date || null;
    if (body.Rail_Start_Date !== undefined) updates.rail_start_date = body.Rail_Start_Date || null;
    if (body.Rail_End_Date !== undefined) updates.rail_end_date = body.Rail_End_Date || null;
    if (body.Rail_Order_No !== undefined) updates.rail_order_no = body.Rail_Order_No;
    if (body.Rail_Platform !== undefined) updates.rail_platform = body.Rail_Platform;
    if (body.Is_Booking !== undefined) updates.is_booking = body.Is_Booking;

    // Recalculate base amount if amount or currency changed
    if (body.Original_Amount !== undefined || body.Currency !== undefined) {
      const { data: existing } = await supabase.from('expenses').select('*').eq('id', expenseId).single();
      const currency = body.Currency || (existing?.currency as string) || 'HKD';
      const amount = Number(body.Original_Amount ?? existing?.original_amount) || 0;
      const { data: tripData } = await supabase
        .from('trips')
        .select('base_currency')
        .eq('id', existing?.trip_id as string)
        .single();
      const baseCurrency = (tripData?.base_currency as string) || 'HKD';
      let exchangeRate = 1;
      let baseAmount = amount;
      if (currency !== baseCurrency) {
        exchangeRate = await fetchExchangeRate(currency, baseCurrency);
        baseAmount = Math.round(amount * exchangeRate * 100) / 100;
      }
      updates.original_amount = amount;
      updates.currency = currency;
      updates.exchange_rate = exchangeRate;
      updates.base_amount = baseAmount;
    }

    const { error } = await supabase.from('expenses').update(updates).eq('id', expenseId);
    if (error) return err(error.message);
    return ok(null);
  },

  deleteExpense: async (expenseId: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    if (error) return err(error.message);
    return ok(null);
  },

  getSettlement: async (tripId: string) => {
    const [expRes, memberRes] = await Promise.all([
      api.getExpenses(tripId),
      api.getTripMembers(tripId),
    ]);
    if (!expRes.success) return err((expRes as { success: false; error: string }).error);

    const expenses = (expRes as { success: true; data: Expense[] }).data.filter(
      e => String(e.Is_Settled).toUpperCase() !== 'TRUE' && e.Is_Settled !== true
    );
    const members = memberRes.success
      ? (memberRes as { success: true; data: TripMember[] }).data.map(m => m.Member_Name || '')
      : [];

    return ok(calcSettlement(expenses, members));
  },

  // ── Categories ───────────────────────────────────────────
  getCategories: async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (error) return err(error.message);
    return ok((data || []).map(rowToCategory));
  },

  createCategory: async (body: Partial<Category>) => {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        main_category: body.Main_Category || '',
        sub_category: body.Sub_Category || '',
        is_active: true,
      })
      .select()
      .single();
    if (error) return err(error.message);
    return ok(rowToCategory(data));
  },

  updateCategory: async (categoryId: string, body: Partial<Category>) => {
    const updates: Record<string, unknown> = {};
    if (body.Main_Category !== undefined) updates.main_category = body.Main_Category;
    if (body.Sub_Category !== undefined) updates.sub_category = body.Sub_Category;
    const { error } = await supabase.from('categories').update(updates).eq('id', categoryId);
    if (error) return err(error.message);
    return ok(null);
  },

  deactivateCategory: async (categoryId: string) => {
    const { error } = await supabase.from('categories').update({ is_active: false }).eq('id', categoryId);
    if (error) return err(error.message);
    return ok(null);
  },

  // ── Members ──────────────────────────────────────────────
  // ── User Profile ─────────────────────────────────────────
  // Each user has one profile with a display name they set themselves
  getUserProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return err('User not logged in');
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error && error.code !== 'PGRST116') return err(error.message);
    if (!data) return ok(null as unknown as UserProfile);
    return ok({
      User_ID: data.id as string,
      Display_Name: (data.display_name as string) || '',
      Created_At: (data.created_at as string) || '',
      Updated_At: (data.updated_at as string) || '',
    } as UserProfile);
  },

  upsertUserProfile: async (displayName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return err('User not logged in');
    const { error } = await supabase
      .from('user_profiles')
      .upsert({ id: user.id, display_name: displayName, updated_at: new Date().toISOString() });
    if (error) return err(error.message);
    return ok({ Display_Name: displayName });
  },

  // ── Trip Members (now based on trip_collaborators + user_profiles) ─────
  // Returns all participants of a trip: owner + collaborators with their display names
  getTripMembers: async (tripId: string) => {
    // Get the trip to find the owner
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select('id, user_id, owner_display_name')
      .eq('id', tripId)
      .single();
    if (tripError) return err(tripError.message);

    // Get collaborators
    const { data: collabs, error: collabError } = await supabase
      .from('trip_collaborators')
      .select('id, user_id, display_name, joined_at')
      .eq('trip_id', tripId);
    if (collabError) return err(collabError.message);

    // Collect all user_ids to fetch profiles
    const allUserIds = [tripData.user_id, ...(collabs || []).map((c: any) => c.user_id)].filter(Boolean);
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .in('id', allUserIds);

    const profileMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.id] = p.display_name || ''; });

    const members: TripMember[] = [];

    // Add owner
    const ownerName = tripData.owner_display_name || profileMap[tripData.user_id] || '擁有者';
    members.push({
      Trip_Member_ID: `owner-${tripId}`,
      Trip_ID: tripId,
      Member_ID: tripData.user_id,
      Member_Name: ownerName,
      Is_Owner: true,
      Created_At: '',
    });

    // Add collaborators
    (collabs || []).forEach((c: any) => {
      const name = c.display_name || profileMap[c.user_id] || '協作者';
      members.push({
        Trip_Member_ID: c.id,
        Trip_ID: tripId,
        Member_ID: c.user_id,
        Member_Name: name,
        Is_Owner: false,
        Created_At: c.joined_at || '',
      });
    });

    return ok(members);
  },

  // Update display name for a user in a specific trip
  // For owner: updates trips.owner_display_name
  // For collaborator: updates trip_collaborators.display_name
  updateTripMemberName: async (tripId: string, isOwner: boolean, newName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return err('User not logged in');
    if (isOwner) {
      const { error } = await supabase
        .from('trips')
        .update({ owner_display_name: newName })
        .eq('id', tripId)
        .eq('user_id', user.id);
      if (error) return err(error.message);
    } else {
      const { error } = await supabase
        .from('trip_collaborators')
        .update({ display_name: newName })
        .eq('trip_id', tripId)
        .eq('user_id', user.id);
      if (error) return err(error.message);
    }
    // Also update global user profile
    await supabase.from('user_profiles')
      .upsert({ id: user.id, display_name: newName, updated_at: new Date().toISOString() });
    return ok(null);
  },

  // Legacy stubs for compatibility
  getMembers: async () => ok([] as Member[]),
  createMember: async (_body: Partial<Member>) => err('Use upsertUserProfile instead'),
  updateMember: async (_id: string, _body: Partial<Member>) => err('Use updateTripMemberName instead'),
  deactivateMember: async (_id: string) => err('Use updateTripMemberName instead'),
  addTripMember: async (_body: { Trip_ID: string; Member_ID: string; Member_Name?: string }) => err('Members are now account-based'),
  removeTripMember: async (_id: string) => err('Members are now account-based'),

  // ── AI ───────────────────────────────────────────────────
  generateAIAdvice: async (tripId: string) => {
    // Fetch trip data for AI context
    const [tripRes, itinRes, expRes] = await Promise.all([
      api.getTripById(tripId),
      api.getItinerary(tripId),
      api.getExpenses(tripId),
    ]);
    const trip = tripRes.success ? (tripRes as { success: true; data: Trip }).data : null;
    const itinerary = itinRes.success ? (itinRes as { success: true; data: ItineraryItem[] }).data : [];
    const expenses = expRes.success ? (expRes as { success: true; data: Expense[] }).data : [];

    // Build flight info
    const flightExpenses = expenses.filter(e => e.Main_Category === '機票' || e.Sub_Category?.includes('機票'));
    const accExpenses = expenses.filter(e => e.Main_Category === '住宿' || ['酒店','民宿','Airbnb'].some(k => e.Sub_Category?.includes(k)));

    const prompt = `你是一個旅遊助手。請根據以下行程資料，提供詳細的旅遊注意事項和建議：

行程名稱：${trip?.Trip_Name}
旅遊日期：${trip?.Start_Date} 至 ${trip?.End_Date}
基礎貨幣：${trip?.Base_Currency}

航班資訊：${flightExpenses.map(f => `${f.Flight_No || ''} ${f.Departure_Location || ''}→${f.Arrival_Location || ''} ${f.Flight_Date || ''}`).join('；') || '未填寫'}
住宿資訊：${accExpenses.map(a => `${a.Sub_Category || ''} ${a.Accommodation_Address || ''} (${a.Check_In_Date || ''}~${a.Check_Out_Date || ''})`).join('；') || '未填寫'}
每日行程：${itinerary.slice(0, 30).map(i => `第${i.Day_Number}天 ${i.Time || ''} ${i.Activity}`).join('、')}
支出概況：共 ${expenses.length} 筆，總計 ${expenses.reduce((s, e) => s + Number(e.Base_Amount || 0), 0).toFixed(0)} ${trip?.Base_Currency}

請用繁體中文回答，提供以下方面的實用建議（每點用 ## 標題分隔）：
1. 入境要求（簽證、護照有效期）
2. 當地天氣與穿著建議
3. 交通注意事項
4. 住宿注意事項
5. 文化禮儀與當地習俗
6. 緊急聯絡資訊
7. 行李打包建議
8. 其他重要提示`;

    try {
      // Call Supabase Edge Function as secure proxy
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';
      const supabaseUrl = 'https://skrdhktjyiiipxcuxknk.supabase.co';
      const anonKey = 'sb_publishable_cf_O443CtcqqwgGGarU7wQ_CSdXr4MF';
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-advice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Edge Function error: ${res.status} ${errText}`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const result = { ...ok(data.text as string), model: data.model };
      return result;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'AI 服務暫時不可用';
      return err(msg);
    }
  },

  // ── Exchange Rate ────────────────────────────────────────
  getExchangeRate: async (from: string, to: string) => {
    const rate = await fetchExchangeRate(from, to);
    return { success: true as const, rate, from, to };
  },
};

// Keep backward compatibility: export normalizeDateStr
export function normalizeDateStr(d: string | null | undefined): string {
  if (!d) return '';
  if (d.includes('T')) return d.slice(0, 10);
  return d;
}

// Keep getGasUrl/setGasUrl for settings page (now no-ops)
export function getGasUrl(): string { return ''; }
export function setGasUrl(_url: string): void { /* no-op */ }
