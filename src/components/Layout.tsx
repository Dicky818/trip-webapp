import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Plane, Settings, Home } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Layout() {
  const location = useLocation();
  const { isConfigured } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* 頂部導航欄 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-blue-600 font-bold text-lg">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Plane size={18} className="text-white" />
            </div>
            <span>旅遊規劃</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${location.pathname === '/' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Home size={16} />
              <span className="hidden sm:inline">行程列表</span>
            </Link>
            <Link
              to="/settings"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${location.pathname === '/settings' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}
                ${!isConfigured ? 'text-amber-600 animate-pulse' : ''}`}
            >
              <Settings size={16} />
              <span className="hidden sm:inline">設定</span>
              {!isConfigured && <span className="w-2 h-2 bg-amber-500 rounded-full" />}
            </Link>
          </nav>
        </div>
      </header>

      {/* 主內容 */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {!isConfigured && location.pathname !== '/settings' && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center gap-2">
            <span>⚠️</span>
            <span>尚未設定後端 URL。請先前往</span>
            <Link to="/settings" className="font-semibold underline">設定頁面</Link>
            <span>輸入 GAS Web App URL。</span>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
