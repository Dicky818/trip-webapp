import React from 'react';
import { Wifi, WifiOff, RefreshCw, CloudOff } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';

export function OfflineIndicator() {
  const { online, pendingCount, syncNow, isSyncing } = useOfflineSync();

  // Don't show anything if online and no pending items
  if (online && pendingCount === 0) return null;

  return (
    <div className={`fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80 
      rounded-xl shadow-lg border px-4 py-3 flex items-center gap-3 transition-all duration-300
      ${online ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
      
      {!online ? (
        <>
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <WifiOff size={16} className="text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800">離線模式</p>
            <p className="text-xs text-red-600">
              {pendingCount > 0 
                ? `${pendingCount} 筆待同步費用` 
                : '連線恢復後將自動同步'}
            </p>
          </div>
          <CloudOff size={16} className="text-red-400 flex-shrink-0" />
        </>
      ) : (
        <>
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Wifi size={16} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">待同步</p>
            <p className="text-xs text-amber-600">{pendingCount} 筆離線費用等待上傳</p>
          </div>
          <button
            onClick={syncNow}
            disabled={isSyncing}
            className="w-8 h-8 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <RefreshCw size={16} className={`text-amber-700 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </>
      )}
    </div>
  );
}
