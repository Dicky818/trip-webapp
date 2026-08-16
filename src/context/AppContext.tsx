/*
 * Design system: "旅途作戰桌" — feedback confirms an action and, where safe,
 * gives the traveller a short, direct path to recover from it.
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { api, Trip, Category, UserProfile } from '../api/supabaseApi';

type ToastAction = { label: string; onClick: () => void };
type ToastState = { message: string; type: 'success' | 'error' | 'info'; action?: ToastAction };

interface AppContextType {
  // Trips
  trips: Trip[];
  tripsLoading: boolean;
  fetchTrips: () => Promise<void>;

  // User Profile
  userProfile: UserProfile | null;
  profileLoading: boolean;
  fetchUserProfile: () => Promise<void>;

  // Categories (global)
  categories: Category[];
  categoriesLoading: boolean;
  fetchCategories: () => Promise<void>;

  // Toast notifications
  toast: ToastState | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info', action?: ToastAction) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTrips = useCallback(async () => {
    setTripsLoading(true);
    try {
      const result = await api.getTrips();
      if (result.success) {
        setTrips((result as { success: true; data: Trip[] }).data || []);
      }
    } catch (e) {
      console.error('fetchTrips error:', e);
    } finally {
      setTripsLoading(false);
    }
  }, []);

  const fetchUserProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const result = await api.getUserProfile();
      if (result.success) {
        setUserProfile((result as { success: true; data: UserProfile }).data || null);
      }
    } catch (e) {
      console.error('fetchUserProfile error:', e);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const result = await api.getCategories();
      if (result.success) {
        setCategories((result as { success: true; data: Category[] }).data || []);
      }
    } catch (e) {
      console.error('fetchCategories error:', e);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success', action?: ToastAction) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type, action });
    toastTimeoutRef.current = setTimeout(() => setToast(null), action ? 7000 : 3500);
  }, []);

  useEffect(() => () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  }, []);

  return (
    <AppContext.Provider value={{
      trips, tripsLoading, fetchTrips,
      userProfile, profileLoading, fetchUserProfile,
      categories, categoriesLoading, fetchCategories,
      toast, showToast,
    }}>
      {children}
      {toast && (
        <div role={toast.type === 'error' ? 'alert' : 'status'} aria-live={toast.type === 'error' ? 'assertive' : 'polite'} className={`fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.24)] text-white text-sm font-medium transition-[transform,opacity] duration-200 ease-out
          ${toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}>
          <span className="min-w-0 flex-1">{toast.message}</span>
          {toast.action && (
            <button onClick={() => { toast.action?.onClick(); setToast(null); }} className="rounded-lg border border-white/30 px-2.5 py-1 text-xs font-bold transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98]">
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
