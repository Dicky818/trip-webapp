/**
 * Design system: "旅途作戰桌" — first use should explain the journey before
 * asking for authentication, using one focused entry action.
 */
import { useState } from 'react';
import { ArrowRight, CheckCircle2, Plane, ReceiptText, Route } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="route-grid min-h-screen bg-[#f4f7fb] flex items-center p-4 sm:p-8">
      <div className="w-full max-w-5xl mx-auto grid lg:grid-cols-[1.15fr_0.85fr] overflow-hidden bg-white rounded-[2rem] border border-slate-200 shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
        <section className="bg-slate-950 text-white p-8 sm:p-12 lg:p-14 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-blue-500/30 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-blue-200 mb-8">
              <span className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center"><Plane size={16} className="-rotate-12" /></span>
              旅途作戰桌
            </div>
            <p className="text-blue-200 text-sm font-semibold tracking-[0.16em] uppercase">Plan once. Move together.</p>
            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl leading-tight font-bold tracking-tight">把下一站、下一筆支出，放在同一張旅程桌上。</h1>
            <p className="mt-5 text-slate-300 leading-7 max-w-xl">建立行程、邀請旅伴、安排每日路線與記錄收據；每一項資訊都先整理成你可以確認的下一步。</p>
            <div className="mt-10 space-y-4">
              {[
                [Route, '先排好旅程節點', '從今天到出發日，知道下一步要完成什麼。'],
                [ReceiptText, '支出不必手動重打', '拍下收據，系統先整理成待確認的支出。'],
                [CheckCircle2, '和旅伴共用同一份進度', '分享後一起規劃，重要設定仍由擁有者掌握。'],
              ].map(([Icon, title, description]) => {
                const FeatureIcon = Icon as typeof Route;
                return <div key={title as string} className="flex gap-3"><FeatureIcon size={19} className="mt-0.5 text-blue-300 shrink-0" /><div><p className="font-semibold">{title as string}</p><p className="text-sm text-slate-400 mt-0.5">{description as string}</p></div></div>;
              })}
            </div>
          </div>
        </section>

        <section className="p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full">
            <p className="text-sm font-semibold text-blue-600">開始你的旅程</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">登入後，從一個清楚的下一步開始。</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">你可以建立自己的行程，或用旅伴提供的分享碼加入協作。</p>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mt-8 w-full flex items-center justify-center gap-3 bg-slate-950 hover:bg-blue-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? (
            <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? '正在帶你進入旅程…' : <><span>使用 Google 帳號繼續</span><ArrowRight size={17} /></>}
        </button>

            <p className="text-xs text-slate-400 mt-6 leading-5">登入即代表你同意服務條款及隱私政策。收據圖片只會用於即時辨識，不會儲存到行程資料中。</p>
          </div>
        </section>
      </div>
    </div>
  );
}
