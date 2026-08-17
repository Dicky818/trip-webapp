/**
 * Design system: "編輯式旅程入口" — mobile install guidance is a compact
 * Paper White utility card with one Journey Yellow action above thumb navigation.
 */
import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed in this session
    const wasDismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a short delay
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt || dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 md:left-auto md:right-4 md:w-96
      rounded-2xl border border-[#e3ddcf] bg-white p-3 shadow-xl
      animate-in slide-in-from-bottom-4 duration-300">
      <button
        onClick={handleDismiss}
        aria-label="關閉安裝提示"
        title="稍後再說"
        className="absolute right-2 top-2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <X size={15} />
      </button>
      <div className="flex items-center gap-2.5 pr-6">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#fff3c4]">
          <Download size={18} className="text-[#9a7100]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-900">離線也能使用</h3>
          <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">安裝到主畫面，旅途中更快開啟</p>
        </div>
        <button
          onClick={handleInstall}
          className="rounded-xl bg-[#ffc91a] px-3 py-2 text-xs font-bold text-[#111111] shadow-sm transition-all hover:bg-[#f1b900] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2"
        >
          安裝
        </button>
      </div>
    </div>
  );
}
