/**
 * Design system: "旅途作戰桌" — the shell preserves orientation with a
 * compact route marker and reserves wide, calm workspace for trip tasks.
 */
import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Plane, Home, LogOut, ChevronDown, MapPinned } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName = (user?.user_metadata?.full_name as string) || user?.email || '用戶';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f7fb]">
      {/* Route marker: present on every authenticated screen without competing with task content. */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 text-slate-950 font-bold tracking-tight">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_8px_18px_rgba(37,99,235,0.22)]">
              <Plane size={18} className="text-white -rotate-12" />
            </div>
            <span className="text-base sm:text-lg">旅途作戰桌</span>
            {location.pathname.startsWith('/trip/') && (
              <span className="hidden md:inline-flex items-center gap-1.5 pl-3 ml-1 border-l border-slate-200 text-xs text-slate-500 font-medium tracking-normal">
                <MapPinned size={14} className="text-blue-600" /> 行程工作區
              </span>
            )}
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors
                ${location.pathname === '/' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Home size={16} />
              <span className="hidden sm:inline">行程列表</span>
            </Link>

            {/* User menu */}
            <div className="relative ml-1">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                  </div>
                )}
                <span className="hidden sm:inline text-sm text-slate-700 max-w-[120px] truncate">{displayName}</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 z-20 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-800 truncate">{displayName}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => { setShowUserMenu(false); signOut(); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={15} />
                      登出
                    </button>
                  </div>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Shared workspace: pages provide their own task hierarchy. */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-24 sm:pb-8">
        <Outlet />
      </main>
    </div>
  );
}
