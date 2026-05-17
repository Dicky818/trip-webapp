import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { api, Trip, Member, Category } from '../api/gasApi';

interface AppContextType {
  // GAS URL
  gasUrl: string;
  setGasUrl: (url: string) => void;
  isConfigured: boolean;

  // Trips
  trips: Trip[];
  tripsLoading: boolean;
  fetchTrips: () => Promise<void>;

  // Members (global)
  members: Member[];
  membersLoading: boolean;
  fetchMembers: () => Promise<void>;

  // Categories (global)
  categories: Category[];
  categoriesLoading: boolean;
  fetchCategories: () => Promise<void>;

  // Toast notifications
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [gasUrl, setGasUrlState] = useState<string>(() => {
    return localStorage.getItem('trip_webapp_gas_url') || '';
  });
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const setGasUrl = useCallback((url: string) => {
    localStorage.setItem('trip_webapp_gas_url', url);
    setGasUrlState(url);
  }, []);

  const fetchTrips = useCallback(async () => {
    if (!gasUrl) return;
    setTripsLoading(true);
    try {
      const result = await api.getTrips();
      setTrips(result.data || []);
    } catch (e) {
      console.error('fetchTrips error:', e);
    } finally {
      setTripsLoading(false);
    }
  }, [gasUrl]);

  const fetchMembers = useCallback(async () => {
    if (!gasUrl) return;
    setMembersLoading(true);
    try {
      const result = await api.getMembers();
      setMembers(result.data || []);
    } catch (e) {
      console.error('fetchMembers error:', e);
    } finally {
      setMembersLoading(false);
    }
  }, [gasUrl]);

  const fetchCategories = useCallback(async () => {
    if (!gasUrl) return;
    setCategoriesLoading(true);
    try {
      const result = await api.getCategories();
      setCategories(result.data || []);
    } catch (e) {
      console.error('fetchCategories error:', e);
    } finally {
      setCategoriesLoading(false);
    }
  }, [gasUrl]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <AppContext.Provider value={{
      gasUrl, setGasUrl, isConfigured: !!gasUrl,
      trips, tripsLoading, fetchTrips,
      members, membersLoading, fetchMembers,
      categories, categoriesLoading, fetchCategories,
      toast, showToast,
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
