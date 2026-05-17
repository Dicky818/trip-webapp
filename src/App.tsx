import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import HomePage from './pages/HomePage';
import TripDetailPage from './pages/trip/TripDetailPage';
import SettingsPage from './pages/SettingsPage';
import Layout from './components/Layout';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter basename="/trip-webapp">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="trip/:tripId" element={<TripDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
