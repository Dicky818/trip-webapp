// ============================================================
// GAS API 統一呼叫層
// 所有請求均使用 GET + payload 參數，避免 CORS 問題
// GAS_URL 從 localStorage 中設定
// ============================================================

const GAS_URL_KEY = 'trip_webapp_gas_url';

export function getGasUrl(): string {
  return localStorage.getItem(GAS_URL_KEY) || import.meta.env.VITE_GAS_URL || '';
}

export function setGasUrl(url: string): void {
  localStorage.setItem(GAS_URL_KEY, url);
}

async function callGas<T>(params: Record<string, string>, body?: object): Promise<T> {
  const baseUrl = getGasUrl();
  if (!baseUrl) throw new Error('GAS URL 未設定，請先在設定頁面輸入後端 URL');

  const url = new URL(baseUrl);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  // 所有請求均使用 GET，body 透過 payload 參數傳遞（解決 GAS CORS 限制）
  if (body) {
    url.searchParams.set('payload', JSON.stringify(body));
  }

  const response = await fetch(url.toString(), { method: 'GET' });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
}

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
  Activity: string;
  Sort_Order: string | number;
  Created_At: string;
  Updated_At: string;
  Lat?: string | number;
  Lng?: string | number;
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

export interface TripMember {
  Trip_Member_ID: string;
  Trip_ID: string;
  Member_ID: string;
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

// ── 日期正規化工具函數 ─────────────────────────────────────
export function normalizeDateStr(d: string | null | undefined): string {
  if (!d) return '';
  if (d.includes('T')) return d.slice(0, 10);
  return d;
}
function normalizeTrip(trip: Trip): Trip {
  return { ...trip, Start_Date: normalizeDateStr(trip.Start_Date), End_Date: normalizeDateStr(trip.End_Date) };
}

// ── API Functions ──────────────────────────────────────────

export const api = {
  // Trips
  getTrips: async () => {
    const res = await callGas<{ success: boolean; data: Trip[] }>({ action: 'getTrips' });
    if (res.success && res.data) res.data = res.data.map(normalizeTrip);
    return res;
  },
  getTripById: async (tripId: string) => {
    const res = await callGas<{ success: boolean; data: Trip }>({ action: 'getTripById', tripId });
    if (res.success && res.data) res.data = normalizeTrip(res.data);
    return res;
  },
  createTrip: (body: Partial<Trip>) => callGas<{ success: boolean; data: Trip }>({ action: 'createTrip' }, body),
  updateTrip: (tripId: string, body: Partial<Trip>) => callGas<{ success: boolean; data: Trip }>({ action: 'updateTrip', tripId }, body),
  deleteTrip: (tripId: string) => callGas<{ success: boolean }>({ action: 'deleteTrip', tripId }),

  // Flights
  getFlights: (tripId: string) => callGas<{ success: boolean; data: Flight[] }>({ action: 'getFlights', tripId }),
  createFlight: (body: Partial<Flight>) => callGas<{ success: boolean; data: Flight }>({ action: 'createFlight' }, body),
  updateFlight: (flightId: string, body: Partial<Flight>) => callGas<{ success: boolean }>({ action: 'updateFlight', flightId }, body),
  deleteFlight: (flightId: string) => callGas<{ success: boolean }>({ action: 'deleteFlight', flightId }),

  // Accommodations
  getAccommodations: (tripId: string) => callGas<{ success: boolean; data: Accommodation[] }>({ action: 'getAccommodations', tripId }),
  createAccommodation: (body: Partial<Accommodation>) => callGas<{ success: boolean; data: Accommodation }>({ action: 'createAccommodation' }, body),
  updateAccommodation: (accommodationId: string, body: Partial<Accommodation>) => callGas<{ success: boolean }>({ action: 'updateAccommodation', accommodationId }, body),
  deleteAccommodation: (accommodationId: string) => callGas<{ success: boolean }>({ action: 'deleteAccommodation', accommodationId }),

  // Bookings
  getBookings: (tripId: string) => callGas<{ success: boolean; data: Booking[] }>({ action: 'getBookings', tripId }),
  createBooking: (body: Partial<Booking>) => callGas<{ success: boolean; data: Booking }>({ action: 'createBooking' }, body),
  updateBooking: (bookingId: string, body: Partial<Booking>) => callGas<{ success: boolean }>({ action: 'updateBooking', bookingId }, body),
  deleteBooking: (bookingId: string) => callGas<{ success: boolean }>({ action: 'deleteBooking', bookingId }),

  // Itinerary
  getItinerary: (tripId: string) => callGas<{ success: boolean; data: ItineraryItem[] }>({ action: 'getItinerary', tripId }),
  createItineraryItem: (body: Partial<ItineraryItem>) => callGas<{ success: boolean; data: ItineraryItem }>({ action: 'createItineraryItem' }, body),
  updateItineraryItem: (itineraryId: string, body: Partial<ItineraryItem>) => callGas<{ success: boolean }>({ action: 'updateItineraryItem', itineraryId }, body),
  deleteItineraryItem: (itineraryId: string) => callGas<{ success: boolean }>({ action: 'deleteItineraryItem', itineraryId }),
  reorderItinerary: (items: Array<{ Itinerary_ID: string; Sort_Order: number }>) => callGas<{ success: boolean }>({ action: 'reorderItinerary' }, { items }),
  copyDayItinerary: (body: { Trip_ID: string; fromDay: number; toDay: number; fromDate?: string; toDate?: string }) => callGas<{ success: boolean; data: ItineraryItem[] }>({ action: 'copyDayItinerary' }, body),

  // Day Accommodations
  getDayAccommodations: (tripId: string) => callGas<{ success: boolean; data: DayAccommodation[] }>({ action: 'getDayAccommodations', tripId }),
  setDayAccommodation: (body: Partial<DayAccommodation>) => callGas<{ success: boolean }>({ action: 'setDayAccommodation' }, body),
  deleteDayAccommodation: (dayAccommodationId: string) => callGas<{ success: boolean }>({ action: 'deleteDayAccommodation', dayAccommodationId }),

  // Expenses
  getExpenses: (tripId: string) => callGas<{ success: boolean; data: Expense[] }>({ action: 'getExpenses', tripId }),
  createExpense: (body: Partial<Expense>) => callGas<{ success: boolean; data: Expense }>({ action: 'createExpense' }, body),
  updateExpense: (expenseId: string, body: Partial<Expense>) => callGas<{ success: boolean }>({ action: 'updateExpense', expenseId }, body),
  deleteExpense: (expenseId: string) => callGas<{ success: boolean }>({ action: 'deleteExpense', expenseId }),
  getSettlement: (tripId: string) => callGas<{ success: boolean; data: Settlement }>({ action: 'getSettlement', tripId }),

  // Categories
  getCategories: () => callGas<{ success: boolean; data: Category[] }>({ action: 'getCategories' }),
  createCategory: (body: Partial<Category>) => callGas<{ success: boolean; data: Category }>({ action: 'createCategory' }, body),
  updateCategory: (categoryId: string, body: Partial<Category>) => callGas<{ success: boolean }>({ action: 'updateCategory', categoryId }, body),
  deactivateCategory: (categoryId: string) => callGas<{ success: boolean }>({ action: 'deactivateCategory', categoryId }),

  // Members
  getMembers: () => callGas<{ success: boolean; data: Member[] }>({ action: 'getMembers' }),
  createMember: (body: Partial<Member>) => callGas<{ success: boolean; data: Member }>({ action: 'createMember' }, body),
  updateMember: (memberId: string, body: Partial<Member>) => callGas<{ success: boolean }>({ action: 'updateMember', memberId }, body),
  deactivateMember: (memberId: string) => callGas<{ success: boolean }>({ action: 'deactivateMember', memberId }),

  // Trip Members
  getTripMembers: (tripId: string) => callGas<{ success: boolean; data: TripMember[] }>({ action: 'getTripMembers', tripId }),
  addTripMember: (body: { Trip_ID: string; Member_ID: string }) => callGas<{ success: boolean; data: TripMember }>({ action: 'addTripMember' }, body),
  removeTripMember: (tripMemberId: string) => callGas<{ success: boolean }>({ action: 'removeTripMember', tripMemberId }),

  // AI
  generateAIAdvice: (tripId: string) => callGas<{ success: boolean; data: string; model?: string }>({ action: 'generateAIAdvice', tripId }),

  // Exchange Rate
  getExchangeRate: (from: string, to: string) => callGas<{ success: boolean; rate: number; from: string; to: string }>({ action: 'getExchangeRate', from, to }),
};
