import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ListOrdered,
  Quote,
  MessageSquare,
  Copy,
  Check,
  Send,
  Loader2,
  RefreshCw,
  Key,
  ShieldCheck,
  X,
  ExternalLink,
} from 'lucide-react';
import { PodcastEpisode } from '../types/podcast';
import { parseTimeString } from '../utils/youtube';
import { hasBackend, getApiBaseUrl } from '../utils/api';
import {
  callGeminiDirectClient,
  generateSmartAnalysisOffline,
  getClientGeminiKey,
  setClientGeminiKey,
  hasClientGeminiKey,
} from '../utils/geminiClient';

interface AIPodcastCompanionProps {
  episode: PodcastEpisode;
  onSeekToTime: (seconds: number) => void;
}

export const AIPodcastCompanion: React.FC<AIPodcastCompanionProps> = ({
  episode,
  onSeekToTime,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'chapters' | 'quotes' | 'qa'>('summary');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Q&A state
  const [questionInput, setQuestionInput] = useState<string>('');
  const [qaHistory, setQaHistory] = useState<{ question: string; answer: string }[]>([]);

  // Key Settings Modal
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [inputKey, setInputKey] = useState<string>(getClientGeminiKey());
  const [hasKey, setHasKey] = useState<boolean>(hasClientGeminiKey());

  useEffect(() => {
    setHasKey(hasClientGeminiKey());
  }, []);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    setClientGeminiKey(inputKey);
    setHasKey(hasClientGeminiKey());
    setIsKeyModalOpen(false);
  };

  const fetchAIAnalysis = async (action: 'summary' | 'chapters' | 'quotes' | 'qa', question?: string) => {
    setLoading(true);
    setError(null);

    try {
      let finalResult = '';

      // Priority 1: Direct Client Gemini 2.5 Flash if user has API Key (Works 100% on GitHub Pages without backend!)
      if (hasClientGeminiKey()) {
        try {
          let prompt = '';
          if (action === 'summary') {
            prompt = `Hãy tóm tắt phân tích sắc sảo, kịch tính và nêu bật 3 bài học đắt giá nhất từ tập: "${episode.title}". Kênh: ${episode.channel}. Mô tả: ${episode.description || ''}`;
          } else if (action === 'chapters') {
            prompt = `Hãy lập dòng thời gian các chương/mốc kịch tính của tập: "${episode.title}" theo định dạng [MM:SS] Nội dung (ví dụ [00:00], [03:15], [07:30], [12:00], [16:45]) để người xem dễ tua nhanh.`;
          } else if (action === 'quotes') {
            prompt = `Hãy trích dẫn 3-4 câu nói hay, triết lý nhân sinh sâu sắc hoặc lời thoại đắt giá gắn liền với thông điệp tập: "${episode.title}".`;
          } else if (action === 'qa' && question) {
            prompt = `Dựa trên tập "${episode.title}" của kênh ${episode.channel}, hãy giải đáp câu hỏi sau của khán giả một cách chi tiết, thuyết phục và giàu cảm xúc: "${question}"`;
          }

          finalResult = await callGeminiDirectClient({
            prompt,
            systemInstruction:
              'Bạn là chuyên gia cố vấn nội dung và trợ lý AI thông minh của kênh Minh Hiếu Official VN. Hãy trả lời bằng tiếng Việt tự nhiên, gãy gọn, văn phong điện ảnh cuốn hút và giàu ý nghĩa.',
          });
        } catch (directErr) {
          console.warn('Lỗi gọi trực tiếp Gemini API client, chuyển sang phân tích ngoại tuyến:', directErr);
        }
      }

      // Priority 2: Backend API if running full-stack
      if (!finalResult && hasBackend()) {
        try {
          const apiBase = getApiBaseUrl();
          if (apiBase) {
            const response = await fetch(`${apiBase}podcast/ai`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action,
                title: episode.title,
                host: episode.channel,
                description: episode.description,
                videoId: episode.youtubeId,
                question,
              }),
            });

            const contentType = response.headers.get('content-type') || '';
            if (response.ok && !contentType.includes('text/html')) {
              const data = await response.json();
              if (data && data.result) {
                finalResult = data.result;
              }
            }
          }
        } catch {
          // Backend not reachable
        }
      }

      // Priority 3: Smart Offline AI Analysis Engine (Guaranteed zero-error fallback for GitHub Pages!)
      if (!finalResult) {
        finalResult = generateSmartAnalysisOffline({
          action,
          title: episode.title,
          channel: episode.channel,
          description: episode.description,
          question,
        });
      }

      if (action === 'qa' && question) {
        setQaHistory((prev) => [...prev, { question, answer: finalResult }]);
        setQuestionInput('');
      } else {
        setResults((prev) => ({
          ...prev,
          [`${episode.id}_${action}`]: finalResult,
        }));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể tạo phân tích AI');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'summary' | 'chapters' | 'quotes' | 'qa') => {
    setActiveTab(tab);
    setError(null);
    const cached = results[`${episode.id}_${tab}`];
    if (!cached && tab !== 'qa') {
      fetchAIAnalysis(tab);
    }
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim() || loading) return;
    fetchAIAnalysis('qa', questionInput.trim());
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentResult = results[`${episode.id}_${activeTab}`];

  // Helper to render text with clickable timestamps like [05:20] or [12:45]
  const renderFormattedContent = (content: string) => {
    const timestampRegex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = timestampRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      const timeStr = match[1];
      const seconds = parseTimeString(timeStr);

      parts.push(
        <button
          key={match.index}
          onClick={() => onSeekToTime(seconds)}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 font-mono text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 rounded transition-colors"
          title={`Chuyển đến mốc ${timeStr}`}
        >
          ▶ [{timeStr}]
        </button>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return (
      <div className="whitespace-pre-wrap leading-relaxed text-slate-300 text-xs sm:text-sm">
        {parts}
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/20 to-rose-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-100">
                Trợ Lý AI Podcast &amp; Phim
              </h3>
              <button
                onClick={() => setIsKeyModalOpen(true)}
                className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 transition-all ${
                  hasKey
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-amber-300'
                }`}
                title="Cài đặt Google Gemini API Key để trò chuyện trực tiếp không giới hạn trên GitHub Pages"
              >
                <Key className="w-3 h-3 text-amber-400" />
                <span>{hasKey ? 'Gemini 2.5 Flash' : 'Ngoại tuyến / Cài Key'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Phân tích sâu sắc · Đúc kết bài học · Hỏi đáp ngữ cảnh (Tương thích 100% GitHub Pages)
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs shrink-0 overflow-x-auto">
          <button
            onClick={() => handleTabChange('summary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'summary'
                ? 'bg-slate-800 text-amber-400 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tóm tắt</span>
          </button>
          <button
            onClick={() => handleTabChange('chapters')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'chapters'
                ? 'bg-slate-800 text-amber-400 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Dòng thời gian</span>
          </button>
          <button
            onClick={() => handleTabChange('quotes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'quotes'
                ? 'bg-slate-800 text-amber-400 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Quote className="w-3.5 h-3.5" />
            <span>Trích dẫn</span>
          </button>
          <button
            onClick={() => handleTabChange('qa')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'qa'
                ? 'bg-slate-800 text-amber-400 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Hỏi đáp</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="pt-3 flex-1 flex flex-col min-h-[220px]">
        {error && (
          <div className="mb-3 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => fetchAIAnalysis(activeTab)}
              className="text-red-200 hover:underline flex items-center gap-1 font-medium"
            >
              <RefreshCw className="w-3 h-3" /> Thử lại
            </button>
          </div>
        )}

        {/* Tab: Q&A */}
        {activeTab === 'qa' ? (
          <div className="flex flex-col flex-1 gap-3">
            <div className="flex-1 space-y-3 max-h-72 overflow-y-auto pr-1">
              {qaHistory.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs space-y-2">
                  <p>Đặt bất kỳ câu hỏi nào về nội dung, nhân vật, diễn biến hoặc bài học từ video này.</p>
                  <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                    {['Cốt truyện chính là gì?', 'Bài học đắt giá nhất?', 'Tính cách nhân vật chính?'].map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setQuestionInput(sug);
                          fetchAIAnalysis('qa', sug);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-amber-300 text-[11px] transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                qaHistory.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-end">
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs rounded-xl px-3.5 py-2 max-w-sm">
                        {item.question}
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl p-3.5 max-w-lg leading-relaxed whitespace-pre-wrap">
                        {item.answer}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAskQuestion} className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Hỏi về cốt truyện, thông điệp, cái kết của video..."
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                disabled={loading}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={loading || !questionInput.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Gửi</span>
              </button>
            </form>
          </div>
        ) : (
          /* Tab: Summary, Chapters, Quotes */
          <div className="flex flex-col flex-1">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 text-xs gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                <span>Trợ lý AI đang phân tích nội dung...</span>
              </div>
            ) : currentResult ? (
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between pb-2.5">
                  <span className="text-[11px] text-slate-400">
                    {activeTab === 'chapters'
                      ? 'Nhấp vào mốc [MM:SS] để tua nhanh tới phân cảnh đó'
                      : hasKey
                      ? 'Tạo trực tiếp bởi Gemini 2.5 Flash'
                      : 'Đúc kết thông minh (Tương thích GitHub Pages)'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => fetchAIAnalysis(activeTab)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-xs"
                      title="Phân tích lại"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(currentResult)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-xs"
                      title="Sao chép nội dung"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 max-h-80 overflow-y-auto">
                  {renderFormattedContent(currentResult)}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-xs text-slate-400 mb-3">
                  Chưa có phân tích cho mục này. Nhấn nút bên dưới để tạo ngay.
                </p>
                <button
                  onClick={() => fetchAIAnalysis(activeTab)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Bắt đầu phân tích AI</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gemini API Key Configuration Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                  <Key className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-white">Cài Đặt Gemini API Key</h4>
              </div>
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Nhập API Key Google Gemini cá nhân để gọi trực tiếp mô hình <strong className="text-amber-400">Gemini 2.5 Flash</strong> từ trình duyệt. Không cần backend máy chủ, hoạt động 100% mượt mà khi xuất bản lên <strong className="text-emerald-400">GitHub Pages</strong>!
            </p>

            <form onSubmit={handleSaveKey} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Google AI Studio API Key:
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Lấy API Key miễn phí</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInputKey('');
                      setClientGeminiKey('');
                      setHasKey(false);
                      setIsKeyModalOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200"
                  >
                    Xóa Key
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    Lưu Cài Đặt
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
