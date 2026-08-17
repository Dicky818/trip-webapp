import React, { useEffect, useRef, useState } from 'react';
/*
 * Design system: "Tabitime-inspired Trip Portal" — AI guidance is the
 * Journey Yellow support service, not an unrelated purple product surface.
 */
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api, Trip } from '../../api/supabaseApi';
import { Button, Card } from '../../components/ui';
import { useApp } from '../../context/AppContext';

interface Props { trip: Trip; }

export default function AITab({ trip }: Props) {
  const { showToast } = useApp();
  const [advice, setAdvice] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [generated, setGenerated] = useState(false);
  const adviceAbortRef = useRef<AbortController | null>(null);
  const adviceRequestIdRef = useRef(0);

  useEffect(() => () => {
    adviceAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    adviceAbortRef.current?.abort();
    adviceAbortRef.current = null;
    adviceRequestIdRef.current += 1;
    setLoading(false);
  }, [trip.Trip_ID]);

  const handleGenerate = async () => {
    adviceAbortRef.current?.abort();
    const controller = new AbortController();
    adviceAbortRef.current = controller;
    const requestId = adviceRequestIdRef.current + 1;
    adviceRequestIdRef.current = requestId;
    setLoading(true);
    setError('');
    try {
      const result = await api.generateAIAdvice(trip.Trip_ID, controller.signal);
      if (controller.signal.aborted || requestId !== adviceRequestIdRef.current) return;
      if (result.success && result.data) {
        setAdvice(result.data);
        setModel((result as any).model || '');
        setGenerated(true);
        showToast('AI 注意事項已生成');
      } else {
        throw new Error(result.error || '回應格式異常');
      }
    } catch (e: unknown) {
      if (controller.signal.aborted || requestId !== adviceRequestIdRef.current) return;
      const msg = e instanceof Error ? e.message : 'AI 生成失敗';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      if (adviceAbortRef.current === controller) {
        adviceAbortRef.current = null;
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[#9a7100]" />
          <div><p className="portal-eyebrow text-[#9a7100]">07 / TRAVEL SUPPORT</p><h3 className="mt-0.5 font-extrabold text-[#111111]">旅程助手</h3></div>
        </div>
        <Button
          onClick={handleGenerate}
          loading={loading}
          variant={generated ? 'outline' : 'primary'}
          className={!generated ? 'bg-[#ffc91a] text-[#111111] hover:bg-[#f1b900] border-0' : ''}
        >
          {loading ? '生成中...' : generated ? <><RefreshCw size={14} /> 重新生成</> : <><Sparkles size={14} /> 生成注意事項</>}
        </Button>
      </div>

      {/* 說明卡片 */}
      {!generated && !loading && (
        <Card className="mb-4 border-[#f3cf59] bg-[#fff3c4] p-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#111111]">
              <Sparkles size={20} className="text-[#ffc91a]" />
            </div>
            <div>
              <h4 className="mb-1 font-extrabold text-[#111111]">AI 智能旅遊助手</h4>
              <p className="text-sm leading-relaxed text-[#4d3900]">
                系統將根據您的行程資訊（目的地、日期、航班、住宿、每日行程等），
                使用 Google Gemini AI 自動生成個人化的旅遊注意事項，包括：
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[#4d3900]">
                <li>目的地入境要求（簽證、護照有效期）</li>
                <li>當地天氣與穿著建議</li>
                <li>交通與住宿注意事項</li>
                <li>文化禮儀與當地習俗</li>
                <li>緊急聯絡資訊</li>
                <li>行李打包建議</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* 載入中 */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#fff3c4] border-t-[#111111]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={20} className="text-[#9a7100]" />
            </div>
          </div>
          <div className="text-center">
            <p className="font-medium text-slate-700">AI 正在分析您的行程...</p>
            <p className="text-sm text-slate-500 mt-1">這可能需要 10-30 秒，請稍候</p>
          </div>
        </div>
      )}

      {/* 錯誤提示 */}
      {error && !loading && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 mb-1">生成失敗</p>
              <p className="text-sm text-red-700">{error}</p>
              <p className="text-xs text-red-600 mt-2">
                請確認網路連線正常，或稍後再試。如問題持續，請聯絡管理員。
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* AI 生成結果 */}
      {generated && advice && !loading && (
        <div>
          {model && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-slate-400">由</span>
              <span className="rounded-full bg-[#fff3c4] px-2 py-0.5 text-xs font-medium text-[#8a6500]">{model}</span>
              <span className="text-xs text-slate-400">生成</span>
            </div>
          )}
          <Card className="p-5">
            <div className="markdown-content prose prose-sm max-w-none text-slate-700">
              <ReactMarkdown>{advice}</ReactMarkdown>
            </div>
          </Card>
          <p className="text-xs text-slate-400 mt-3 text-center">
            ⚠️ AI 生成內容僅供參考，請以官方資訊為準。出發前請自行確認最新入境要求。
          </p>
        </div>
      )}
    </div>
  );
}
