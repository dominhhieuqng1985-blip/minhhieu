import React, { useState } from 'react';
import {
  Search,
  X,
  Play,
  Plus,
  Loader2,
  Download,
  ExternalLink,
  Youtube,
  Radio,
  Clock,
  Sparkles,
} from 'lucide-react';
import { PodcastEpisode } from '../types/podcast';

interface GlobalYouTubeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayEpisode: (episode: PodcastEpisode) => void;
  onAddToQueue: (episode: PodcastEpisode) => void;
  onOpenDownloader?: (episode: PodcastEpisode) => void;
  onShowToast?: (msg: string) => void;
}

const POPULAR_SUGGESTIONS = [
  'Minh Hiếu review phim',
  'Review phim hành động hay nhất',
  'Review phim sát thủ báo thù',
  'Podcast tâm lý đời sống',
  'Lời Phật dạy cuộc sống an nhiên',
  'Nhạc lofi không lời thư giãn',
];

export const GlobalYouTubeSearchModal: React.FC<GlobalYouTubeSearchModalProps> = ({
  isOpen,
  onClose,
  onPlayEpisode,
  onAddToQueue,
  onOpenDownloader,
  onShowToast,
}) => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (searchTerm?: string) => {
    const q = (searchTerm !== undefined ? searchTerm : query).trim();
    if (!q) return;

    setIsLoading(true);
    setHasSearched(true);
    setErrorMsg(null);

    // 1. Check if user pasted a direct YouTube link / video ID
    const matchId =
      q.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/) ||
      (q.length === 11 && q.match(/^[a-zA-Z0-9_-]{11}$/) ? [, q] : null);

    if (matchId && matchId[1]) {
      const vidId = matchId[1];
      const singleItem = {
        youtubeId: vidId,
        title: `Video YouTube [${vidId}]`,
        channel: 'YouTube Video',
        duration: '10:00',
        thumbnail: `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
        isShort: q.includes('shorts'),
      };
      setResults([singleItem]);
      setIsLoading(false);
      return;
    }

    // 2. Query backend search endpoint
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          setResults(data.results);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Backend not available, continue to client fallback
    }

    // 3. Client Fallback: Invidious public search API
    try {
      const invidiousInstances = [
        'https://inv.tux.pizza',
        'https://invidious.nerdvpn.de',
        'https://vid.puffyan.us',
      ];
      let fallbackSuccess = false;

      for (const instance of invidiousInstances) {
        try {
          const invRes = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(q)}&type=video`, {
            signal: AbortSignal.timeout(4000),
          });
          if (invRes.ok) {
            const items = await invRes.json();
            if (Array.isArray(items) && items.length > 0) {
              const formatted = items.slice(0, 25).map((item: any) => ({
                youtubeId: item.videoId,
                title: item.title,
                channel: item.author || 'YouTube Creator',
                duration: item.lengthSeconds ? `${Math.floor(item.lengthSeconds / 60)}:${String(item.lengthSeconds % 60).padStart(2, '0')}` : '05:00',
                thumbnail: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
                isShort: item.lengthSeconds && item.lengthSeconds <= 60,
              }));
              setResults(formatted);
              fallbackSuccess = true;
              break;
            }
          }
        } catch {
          continue;
        }
      }

      if (!fallbackSuccess) {
        setErrorMsg('Không tìm thấy kết quả hoặc dịch vụ YouTube đang phản hồi chậm. Bạn có thể dán link trực tiếp video để phát ngay!');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi tìm kiếm trên YouTube.');
    } finally {
      setIsLoading(false);
    }
  };

  const convertToEpisode = (item: any): PodcastEpisode => {
    return {
      id: `yt-search-${item.youtubeId}`,
      youtubeId: item.youtubeId,
      title: item.title,
      channel: item.channel || 'YouTube Video',
      category: 'nghe-thuat-sang-tao',
      duration: item.duration || '10:00',
      durationSeconds: item.isShort ? 60 : 600,
      thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`,
      description: `Video tìm kiếm trên YouTube: "${item.title}"`,
      publishedDate: 'Tìm kiếm YouTube',
      isShort: item.isShort,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold shadow-md shadow-red-600/30">
              <Youtube className="w-5 h-5 fill-white text-red-600" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <span>Tìm Kiếm Trên Toàn YouTube</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-mono font-bold">
                  Toàn Cầu
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Tìm bất kỳ video, Shorts, podcast hay review phim nào trên toàn mạng YouTube
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nhập tên video, từ khóa tìm kiếm hoặc dán link YouTube..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-red-600/20 transition-all shrink-0 active:scale-95"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Tìm Kiếm</span>
            </button>
          </form>

          {/* Quick Suggestions Tags */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Gợi ý:</span>
            </span>
            {POPULAR_SUGGESTIONS.map((tag, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(tag);
                  handleSearch(tag);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && (
            <div className="p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-300 font-semibold">Đang tìm kiếm trên máy chủ YouTube...</p>
            </div>
          )}

          {errorMsg && !isLoading && (
            <div className="p-6 rounded-2xl bg-red-950/40 border border-red-500/30 text-center space-y-2">
              <p className="text-xs text-red-300 font-medium">{errorMsg}</p>
            </div>
          )}

          {!isLoading && hasSearched && results.length === 0 && !errorMsg && (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl space-y-2">
              <p className="text-xs text-slate-400">Không tìm thấy video phù hợp. Thử lại với từ khóa khác.</p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="grid grid-cols-1 gap-2.5">
              {results.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-red-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all group"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="relative w-28 sm:w-36 aspect-video rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-amber-300 font-mono font-bold">
                        {item.duration || '10:00'}
                      </span>
                      {item.isShort && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-red-600 text-[9px] text-white font-black uppercase">
                          Shorts
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <span className="font-semibold text-slate-300">{item.channel}</span>
                        {item.views && (
                          <>
                            <span>·</span>
                            <span>{item.views}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-900">
                    <button
                      onClick={() => {
                        const ep = convertToEpisode(item);
                        onPlayEpisode(ep);
                        if (onShowToast) onShowToast(`Đang phát: "${item.title}"`);
                        onClose();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-600/20 transition-all active:scale-95"
                      title="Phát ngay video này"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Phát Ngay</span>
                    </button>

                    <button
                      onClick={() => {
                        const ep = convertToEpisode(item);
                        onAddToQueue(ep);
                        if (onShowToast) onShowToast(`Đã thêm vào danh sách: "${item.title}"`);
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Thêm vào danh sách phát"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    {onOpenDownloader && (
                      <button
                        onClick={() => {
                          const ep = convertToEpisode(item);
                          onOpenDownloader(ep);
                          onClose();
                        }}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 hover:text-amber-300 transition-colors"
                        title="Tải video / MP3 qua VidKraken"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-slate-400 px-4">
          <span>Tìm kiếm trực tiếp từ máy chủ YouTube &amp; Invidious</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
