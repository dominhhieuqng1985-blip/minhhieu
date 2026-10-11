import React, { useState } from 'react';
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
} from 'lucide-react';
import { PodcastEpisode } from '../types/podcast';
import { parseTimeString } from '../utils/youtube';

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

  const API_BASE = `${import.meta.env.BASE_URL}api/`;

  const fetchAIAnalysis = async (action: 'summary' | 'chapters' | 'quotes' | 'qa', question?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}podcast/ai`, {
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi phân tích Podcast');
      }

      if (action === 'qa' && question) {
        setQaHistory((prev) => [...prev, { question, answer: data.result }]);
        setQuestionInput('');
      } else {
        setResults((prev) => ({
          ...prev,
          [`${episode.id}_${action}`]: data.result,
        }));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể kết nối với dịch vụ AI');
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
      // Push text preceding the timestamp
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
      <div className="whitespace-pre-wrap leading-relaxed text-slate-300 text-sm">
        {parts}
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Trợ lý AI Podcast
            </h3>
            <p className="text-xs text-slate-400">
              Phân tích sâu sắc · Đúc kết kiến thức · Trả lời theo ngữ cảnh
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => handleTabChange('summary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'summary'
                ? 'bg-slate-800 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tóm tắt</span>
          </button>
          <button
            onClick={() => handleTabChange('chapters')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'chapters'
                ? 'bg-slate-800 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Dòng thời gian</span>
          </button>
          <button
            onClick={() => handleTabChange('quotes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'quotes'
                ? 'bg-slate-800 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Quote className="w-3.5 h-3.5" />
            <span>Trích dẫn</span>
          </button>
          <button
            onClick={() => handleTabChange('qa')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'qa'
                ? 'bg-slate-800 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Hỏi đáp</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="pt-4 flex-1 flex flex-col min-h-[220px]">
        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center justify-between">
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
          <div className="flex flex-col flex-1 gap-4">
            <div className="flex-1 space-y-3 max-h-72 overflow-y-auto pr-1">
              {qaHistory.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  Đặt bất kỳ câu hỏi nào về nội dung, quan điểm hoặc bài học từ tập Podcast này.
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

            <form onSubmit={handleAskQuestion} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Hỏi về quan điểm của khách mời, bài học, hay sách đề cập..."
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                disabled={loading}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={loading || !questionInput.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
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
                <span>Gemini đang lắng nghe và phân tích tập Podcast...</span>
              </div>
            ) : currentResult ? (
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between pb-3">
                  <span className="text-xs text-slate-400">
                    {activeTab === 'chapters'
                      ? 'Nhấp vào mốc thời gian để tua nhanh player'
                      : 'Đúc kết bởi AI Studio Gemini'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchAIAnalysis(activeTab)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1"
                      title="Phân tích lại"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(currentResult)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1"
                      title="Sao chép nội dung"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 max-h-80 overflow-y-auto">
                  {renderFormattedContent(currentResult)}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <p className="text-xs text-slate-400 mb-3">
                  Chưa có phân tích cho mục này. Nhấn nút bên dưới để tạo ngay.
                </p>
                <button
                  onClick={() => fetchAIAnalysis(activeTab)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Phân tích nội dung bằng AI</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
