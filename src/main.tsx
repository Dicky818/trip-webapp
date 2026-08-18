import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/*
 * Runtime resilience: PWA updates remain cache-bypassing, but never force a
 * controller-change reload. GitHub Pages can briefly serve mixed cached assets
 * during deploy propagation; a forced reload in that window can loop and leave
 * the React root visibly empty.
 */
class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean; message: string }> {
  state = { failed: false, message: '' };

  static getDerivedStateFromError(error: Error) {
    return { failed: true, message: error.message || '未提供錯誤訊息' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('應用程式啟動失敗', error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#f5f2e8] px-6 text-[#111111]">
          <section className="w-full max-w-md rounded-[1.5rem] border border-[#e3ddcf] bg-white p-6 shadow-[0_14px_30px_rgba(17,17,17,0.10)]">
            <p className="portal-eyebrow text-[#9a7100]">TRIP / RECOVERY</p>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight">暫時無法載入旅程桌</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">請重新載入此頁。你的行程資料沒有被更改；如問題持續，請告訴我們你看到的時間與畫面。</p>
            <p className="mt-3 break-words rounded-lg bg-[#f5f2e8] px-3 py-2 font-mono text-[11px] leading-5 text-slate-500" aria-label="錯誤訊息">{this.state.message}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#ffc91a] px-4 py-2.5 text-sm font-bold text-[#111111] transition-colors hover:bg-[#f1b900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 active:scale-[0.98]">
              重新載入
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

if ('serviceWorker' in navigator) {
  const workerScope = import.meta.env.BASE_URL;
  const workerUrl = `${workerScope}sw.js`;
  void navigator.serviceWorker.register(workerUrl, {
    scope: workerScope,
    updateViaCache: 'none',
  }).then(registration => registration.update()).catch((error) => {
    console.warn('無法檢查應用程式更新', error);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
