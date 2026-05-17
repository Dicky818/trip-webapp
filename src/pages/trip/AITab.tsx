import React, { useState } from 'react';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api, Trip } from '../../api/gasApi';
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

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.generateAIAdvice(trip.Trip_ID);
      if (result.success && result.data) {
        setAdvice(result.data);
        setModel(result.model || '');
        setGenerated(true);
        showToast('AI 注意事項已生成');
      } else {
        throw new Error('回應格式異常');
      }
    } catch (e: any) {
      const msg = e.message || 'AI 生成失敗';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-purple-600" />
          <h3 className="font-semibold text-slate-900">AI 旅遊注意事項</h3>
        </div>
        <Button
          onClick={handleGenerate}
          loading={loading}
          variant={generated ? 'outline' : 'primary'}
          className={!generated ? 'bg-purple-600 hover:bg-purple-700 border-0' : ''}
        >
          {loading ? '生成中...' : generated ? <><RefreshCw size={14} /> 重新生成</> : <><Sparkles size={14} /> 生成注意事項</>}
        </Button>
      </div>

      {/* 說明卡片 */}
      {!generated && !loading && (
        <Card className="p-5 mb-4 border-purple-100 bg-purple-50">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles size={20} className="text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold text-purple-900 mb-1">AI 智能旅遊助手</h4>
              <p className="text-sm text-purple-700 leading-relaxed">
                系統將根據您的行程資訊（目的地、日期、航班、住宿、每日行程等），
                使用 Google Gemini AI 自動生成個人化的旅遊注意事項，包括：
              </p>
              <ul className="text-sm text-purple-700 mt-2 space-y-1 list-disc list-inside">
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
            <div className="w-16 h-16 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={20} className="text-purple-600" />
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
                請確認 GAS 後端已正確設定 Gemini API Key，並確認網路連線正常。
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
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{model}</span>
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
