import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { api, Trip, Member, Category, UserProfile } from '../api/supabaseApi';

interface AppContextType {
  // Trips
  trips: Trip[];
  tripsLoading: boolean;
  fetchTrips: () => Promise<void>;

  // User Profile (replaces global members)
  userProfile: UserProfile | null;
  profileLoading: boolean;
  fetchUserProfile: () => Promise<void>;

  // Categories (global)
  categories: Category[];
  categoriesLoading: boolean;
  fetchCategories: () => Promise<void>;

  // Toast notifications
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;

  // Legacy compatibility (no-op stubs kept so old imports don't break)
  gasUrl: string;
  setGasUrl: (url: string) => void;
  isConfigured: boolean;
  members: Member[];
  membersLoading: boolean;
  fetchMembers: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

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

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <AppContext.Provider value={{
      trips, tripsLoading, fetchTrips,
      userProfile, profileLoading, fetchUserProfile,
      categories, categoriesLoading, fetchCategories,
      toast, showToast,
      // Legacy no-ops
      gasUrl: 'supabase',
      setGasUrl: () => {},
      isConfigured: true,
      members: [],
      membersLoading: false,
      fetchMembers: async () => {},
    }}>
      {children}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all
          ${toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}>
          {toast.message}
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
