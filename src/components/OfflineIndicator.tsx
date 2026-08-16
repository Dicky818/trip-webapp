/*
 * Design system: "旅途作戰桌" — expose connectivity as a stamped status that
 * reassures travellers their local work is safe and gives one clear recovery action.
 */
import React from 'react';
import { Wifi, WifiOff, RefreshCw, CloudOff } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useApp } from '../context/AppContext';

export function OfflineIndicator() {
  const { online, pendingCount, syncNow, isSyncing } = useOfflineSync();
  const { showToast } = useApp();

  const handleSyncNow = async () => {
    const result = await syncNow();
    if (result.failed > 0) {
      showToast(`${result.failed} 筆支出尚未同步，請稍後重試`, 'error');
    } else if (result.synced > 0) {
      showToast(`已同步 ${result.synced} 筆離線支出`);
    }
  };

  // Don't show anything if online and no pending items
  if (online && pendingCount === 0) return null;

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className={`fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-[22rem]
      rounded-2xl shadow-[0_12px_28px_rgba(15,23,42,0.16)] border px-4 py-3 flex items-center gap-3 transition-[transform,opacity] duration-200 ease-out
      ${online ? (isSyncing ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200') : 'bg-red-50 border-red-200'}`}>
      
      {!online ? (
        <>
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <WifiOff size={16} className="text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-800">離線儲存已開啟</p>
            <p className="text-xs text-red-600">
              {pendingCount > 0 
                ? `${pendingCount} 筆支出已在此裝置儲存，恢復連線後會自動同步`
                : '你仍可記錄支出，恢復連線後會自動同步'}
            </p>
          </div>
          <CloudOff size={16} className="text-red-400 flex-shrink-0" />
        </>
      ) : (
        <>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSyncing ? 'bg-blue-100' : 'bg-amber-100'}`}>
            {isSyncing ? <RefreshCw size={16} className="animate-spin text-blue-600" /> : <Wifi size={16} className="text-amber-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${isSyncing ? 'text-blue-800' : 'text-amber-800'}`}>{isSyncing ? '正在同步' : '等待同步'}</p>
            <p className={`text-xs ${isSyncing ? 'text-blue-700' : 'text-amber-700'}`}>{isSyncing ? `正在安全上傳 ${pendingCount} 筆離線支出` : `${pendingCount} 筆離線支出等待上傳`}</p>
          </div>
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            aria-label="立即同步離線支出"
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold flex-shrink-0 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${isSyncing ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
          >
            <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? '同步中' : '立即同步'}
          </button>
        </>
      )}
    </div>
  );
}
