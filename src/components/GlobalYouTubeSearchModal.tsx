import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  Play,
  Plus,
  Loader2,
  Download,
  Youtube,
  Radio,
  Clock,
  Sparkles,
  Film,
  Key,
  ShieldCheck,
  Check,
  Flame,
  Globe,
  Settings2,
} from 'lucide-react';
import { PodcastEpisode } from '../types/podcast';
import { DEFAULT_VIDEOS, DEFAULT_PODCASTS } from '../data/minhhieuChannelData';
import {
  searchExternalYouTube,
  searchLocalCatalogWithScores,
  parseDirectYouTubeId,
  getStoredYouTubeApiKey,
  setStoredYouTubeApiKey,
  YouTubeSearchResult,
} from '../utils/youtubeSearch';
import {
  ADMIN_SETTINGS_SYNCED_EVENT,
  saveAdminSettingsToNeon,
} from '../utils/adminSettingsSync';

export type SearchFilterType = 'all' | 'channel' | 'podcasts' | 'global';

interface GlobalYouTubeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayEpisode: (episode: PodcastEpisode) => void;
  onAddToQueue: (episode: PodcastEpisode) => void;
  onOpenDownloader?: (episode: PodcastEpisode) => void;
  onShowToast?: (msg: string) => void;
  channelVideos?: PodcastEpisode[];
  channelPodcasts?: PodcastEpisode[];
}

const POPULAR_SUGGESTIONS = [
  'Minh Hiếu Official VN',
  'Xuyên không về đại đường',
  'Review phim sát thủ',
  'Review phim báo thù',
  'Cao thủ ẩn danh',
  'Podcast lời Phật dạy',
  'Nhạc lofi không lời',
];

export const GlobalYouTubeSearchModal: React.FC<GlobalYouTubeSearchModalProps> = ({
  isOpen,
  onClose,
  onPlayEpisode,
  onAddToQueue,
  onOpenDownloader,
  onShowToast,
  channelVideos = DEFAULT_VIDEOS,
  channelPodcasts = DEFAULT_PODCASTS,
}) => {
  // All hooks defined unconditionally at the very top
  const [query, setQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<SearchFilterType>('all');
  const [externalResults, setExternalResults] = useState<YouTubeSearchResult[]>([]);
  const [isLoadingExternal, setIsLoadingExternal] = useState<boolean>(false);
  const [hasSearchedExternal, setHasSearchedExternal] = useState<boolean>(false);
  const [lastSource, setLastSource] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // API Key Settings Modal
  const [showApiKeySettings, setShowApiKeySettings] = useState<boolean>(false);
  const [customApiKey, setCustomApiKey] = useState<string>(() => getStoredYouTubeApiKey());
  const [keySavedToast, setKeySavedToast] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncYtKey = () => setCustomApiKey(getStoredYouTubeApiKey());
    window.addEventListener(ADMIN_SETTINGS_SYNCED_EVENT, syncYtKey);
    return () => window.removeEventListener(ADMIN_SETTINGS_SYNCED_EVENT, syncYtKey);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (showApiKeySettings) {
            setShowApiKeySettings(false);
          } else {
            onClose();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose, showApiKeySettings]);

  // Combined Channel & Podcast library for instant zero-latency search
  const localCatalog = useMemo(() => {
    const list: { episode: PodcastEpisode; type: 'video' | 'podcast' }[] = [];
    const seen = new Set<string>();

    for (const v of channelVideos) {
      if (!seen.has(v.youtubeId)) {
        seen.add(v.youtubeId);
        list.push({ episode: v, type: 'video' });
      }
    }
    for (const p of channelPodcasts) {
      if (!seen.has(p.youtubeId)) {
        seen.add(p.youtubeId);
        list.push({ episode: p, type: 'podcast' });
      }
    }
    return list;
  }, [channelVideos, channelPodcasts]);

  // Live Instant Local Matches as user types with Vietnamese diacritic tolerance
  const localMatches = useMemo(() => {
    if (!query.trim()) return [];
    const scored = searchLocalCatalogWithScores(query, localCatalog);
    return scored.slice(0, 35).map((s) => ({
      episode: s.episode,
      type: s.type,
    }));
  }, [query, localCatalog]);

  const handleSearchExternal = async (searchTerm?: string) => {
    const q = (searchTerm !== undefined ? searchTerm : query).trim();
    if (!q) return;

    setIsLoadingExternal(true);
    setHasSearchedExternal(true);
    setErrorMsg(null);

    try {
      const { results, source } = await searchExternalYouTube(q);
      setExternalResults(results);
      setLastSource(source);

      if (results.length === 0) {
        if (localMatches.length > 0) {
          // Keep showing local matches happily
          setErrorMsg(null);
        } else {
          setErrorMsg(
            'Không tìm thấy video ngoại tuyến phù hợp. Bạn có thể dán trực tiếp đường link YouTube bất kỳ để phát ngay!'
          );
        }
      }
    } catch {
      if (localMatches.length === 0) {
        setErrorMsg('Không thể kết nối máy chủ ngoại tuyến. Bạn có thể dán link video trực tiếp để nghe ngay!');
      }
    } finally {
      setIsLoadingExternal(false);
    }
  };

  const convertToEpisode = (item: YouTubeSearchResult): PodcastEpisode => {
    return {
      id: `yt-search-${item.youtubeId}`,
      youtubeId: item.youtubeId,
      title: item.title,
      channel: item.channel || 'YouTube Video',
      category: 'nghe-thuat-sang-tao',
      duration: item.duration || '10:00',
      durationSeconds: item.durationSeconds || (item.isShort ? 60 : 600),
      thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`,
      description: `Video tìm kiếm: "${item.title}" (${item.channel})`,
      publishedDate: item.publishedDate || 'Tìm kiếm YouTube',
      isShort: item.isShort,
    };
  };

  // Filtered combined results to display
  const displayedItems = useMemo(() => {
    const directId = parseDirectYouTubeId(query);
    const directCards: { type: 'direct'; episode: PodcastEpisode }[] = directId
      ? [
          {
            type: 'direct',
            episode: {
              id: `direct-${directId}`,
              youtubeId: directId,
              title: `Phát Video YouTube [${directId}]`,
              channel: 'Link Trực Tiếp',
              category: 'nghe-thuat-sang-tao',
              duration: 'Đang mở...',
              durationSeconds: 600,
              thumbnail: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
              description: `Video phát trực tiếp theo ID: ${directId}`,
              publishedDate: 'Trực tiếp',
              isShort: query.includes('shorts'),
            },
          },
        ]
      : [];

    const localCards = localMatches.map((m) => ({
      type: m.type as 'video' | 'podcast',
      episode: m.episode,
    }));

    const externalCards = externalResults.map((r) => ({
      type: 'external' as const,
      episode: convertToEpisode(r),
    }));

    let all = [...directCards, ...localCards, ...externalCards];

    // Deduplicate by youtubeId
    const seen = new Set<string>();
    all = all.filter((item) => {
      if (seen.has(item.episode.youtubeId)) return false;
      seen.add(item.episode.youtubeId);
      return true;
    });

    if (activeFilter === 'channel') {
      return all.filter((i) => i.type === 'video');
    }
    if (activeFilter === 'podcasts') {
      return all.filter((i) => i.type === 'podcast');
    }
    if (activeFilter === 'global') {
      return all.filter((i) => i.type === 'external' || i.type === 'direct');
    }
    return all;
  }, [query, localMatches, externalResults, activeFilter]);

  const channelCount = localMatches.filter((i) => i.type === 'video').length;
  const podcastCount = localMatches.filter((i) => i.type === 'podcast').length;
  const globalCount = externalResults.length + (parseDirectYouTubeId(query) ? 1 : 0);

  // Early return placed AFTER all hooks
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white font-bold shadow-md shadow-red-600/30 shrink-0">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                  Trung Tâm Tìm Kiếm Đa Năng
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-mono font-bold shrink-0">
                  Kênh &amp; Toàn Mạng
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                Tìm video review phim Minh Hiếu hoặc tìm kiếm toàn bộ mạng YouTube
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowApiKeySettings(!showApiKeySettings)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                customApiKey
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Cài đặt khóa YouTube Data API v3 (tùy chọn)"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{customApiKey ? 'API Key Đã Lưu' : 'Cài API Key'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Optional API Key Settings Panel */}
        {showApiKeySettings && (
          <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-3 animate-in slide-in-from-top-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Cấu Hình YouTube Data API v3 (Tùy Chọn)</span>
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl">
                  Trên máy chủ tĩnh (GitHub Pages / Custom Domain), ứng dụng tự động tìm kiếm qua máy chủ mạng
                  Piped với CORS mở. Nếu muốn tìm kiếm trực tiếp 100% từ Google không giới hạn, bạn có thể dán
                  khóa API YouTube Data v3 miễn phí của bạn vào đây.
                </p>
              </div>
              <button
                onClick={() => setShowApiKeySettings(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Đóng
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Dán mã YouTube Data API v3 key (AIzaSy...)"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = customApiKey.trim();
                  setStoredYouTubeApiKey(trimmed);
                  saveAdminSettingsToNeon({ apiKeys: { youtubeDataApiKey: trimmed } }).catch(() => {});
                  setKeySavedToast(true);
                  setTimeout(() => setKeySavedToast(false), 2500);
                  if (onShowToast) onShowToast('Đã lưu & đồng bộ YouTube API Key!');
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu Key</span>
              </button>
              {customApiKey && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomApiKey('');
                    setStoredYouTubeApiKey('');
                    saveAdminSettingsToNeon({ apiKeys: { youtubeDataApiKey: '' } }).catch(() => {});
                    if (onShowToast) onShowToast('Đã xóa YouTube API Key. Sử dụng chế độ Piped CORS mặc định.');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs shrink-0"
                >
                  Xóa
                </button>
              )}
            </div>

            {keySavedToast && (
              <p className="text-[11px] text-emerald-400 font-medium">
                ✓ Đã lưu thành công! Các lượt tìm kiếm mở rộng sẽ ưu tiên gọi trực tiếp YouTube Data API.
              </p>
            )}
          </div>
        )}

        {/* Search Bar Input */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchExternal();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Nhập tên video, từ khóa (ví dụ: sát thủ, xuyên không, báo thù...) hoặc link YouTube..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl pl-10 pr-8 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-red-500 transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setExternalResults([]);
                    setErrorMsg(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoadingExternal || !query.trim()}
              className="px-4 sm:px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-red-600/20 transition-all shrink-0 active:scale-95"
              title="Tìm kiếm mở rộng trên toàn mạng YouTube"
            >
              {isLoadingExternal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Youtube className="w-4 h-4" />}
              <span className="hidden sm:inline">Tìm Toàn YouTube</span>
              <span className="sm:hidden">Tìm</span>
            </button>
          </form>

          {/* Filter Chips Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs">
            <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-red-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tất cả ({displayedItems.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('channel')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeFilter === 'channel'
                    ? 'bg-red-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Video Kênh ({channelCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('podcasts')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeFilter === 'podcasts'
                    ? 'bg-red-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Podcasts ({podcastCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveFilter('global');
                  if (!hasSearchedExternal && query.trim()) handleSearchExternal();
                }}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeFilter === 'global'
                    ? 'bg-red-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mạng YouTube ({globalCount})
              </button>
            </div>

            {/* Quick Suggestions Tags */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Gợi ý:</span>
              </span>
              {POPULAR_SUGGESTIONS.slice(0, 3).map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(tag);
                    handleSearchExternal(tag);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoadingExternal && (
            <div className="p-8 text-center space-y-2">
              <Loader2 className="w-6 h-6 text-red-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-300 font-semibold">Đang truy vấn video từ máy chủ YouTube...</p>
              <p className="text-[11px] text-slate-500">Đang đồng bộ qua máy chủ CORS an toàn</p>
            </div>
          )}

          {errorMsg && !isLoadingExternal && (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-center space-y-1">
              <p className="text-xs text-amber-300 font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Empty state: No query yet */}
          {!query.trim() && displayedItems.length === 0 && (
            <div className="p-8 sm:p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-200">Tìm kiếm video hoặc podcasts</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Gõ từ khóa để lọc ngay hàng trăm video chính thức của kênh Minh Hiếu, hoặc dán link YouTube để phát tức thì.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {POPULAR_SUGGESTIONS.map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(tag);
                      handleSearchExternal(tag);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/80 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No results for current query */}
          {query.trim() && displayedItems.length === 0 && !isLoadingExternal && (
            <div className="p-10 text-center border border-dashed border-slate-800 rounded-2xl space-y-3">
              <p className="text-xs text-slate-400">
                Không tìm thấy video nào khớp với từ khóa "{query}".
              </p>
              <button
                onClick={() => handleSearchExternal()}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-red-600/20"
              >
                <Youtube className="w-4 h-4" />
                <span>Tìm kiếm mở rộng toàn mạng YouTube</span>
              </button>
            </div>
          )}

          {/* Results List */}
          {displayedItems.length > 0 && (
            <div className="grid grid-cols-1 gap-2.5">
              {displayedItems.map(({ type, episode }) => {
                const isShort = episode.isShort;
                const isOfficialChannel =
                  type === 'video' ||
                  type === 'podcast' ||
                  episode.channel?.toLowerCase().includes('minh hiếu');

                return (
                  <div
                    key={episode.id || episode.youtubeId}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-red-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all group"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="relative w-28 sm:w-36 aspect-video rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                        <img
                          src={episode.thumbnail}
                          alt={episode.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            // Fallback to standard YouTube thumbnail if mirror CDN image fails
                            const target = e.currentTarget;
                            if (!target.src.includes('hqdefault.jpg')) {
                              target.src = `https://i.ytimg.com/vi/${episode.youtubeId}/hqdefault.jpg`;
                            }
                          }}
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-amber-300 font-mono font-bold">
                          {episode.duration || '10:00'}
                        </span>
                        {isShort && (
                          <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-red-600 text-[9px] text-white font-black uppercase">
                            Shorts
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          {isOfficialChannel ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                              Kênh Minh Hiếu
                            </span>
                          ) : type === 'direct' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                              Link Trực Tiếp
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                              YouTube Toàn Cầu
                            </span>
                          )}
                          {type === 'podcast' && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                              Podcast
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                          {episode.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                          <span className="font-semibold text-slate-300">{episode.channel}</span>
                          {episode.publishedDate && (
                            <>
                              <span>·</span>
                              <span>{episode.publishedDate}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-900">
                      <button
                        onClick={() => {
                          onPlayEpisode(episode);
                          if (onShowToast) onShowToast(`Đang phát: "${episode.title}"`);
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
                          onAddToQueue(episode);
                          if (onShowToast) onShowToast(`Đã thêm vào danh sách phát: "${episode.title}"`);
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Thêm vào hàng đợi phát tiếp"
                      >
                        <Plus className="w-4 h-4" />
                      </button>

                      {onOpenDownloader && (
                        <button
                          onClick={() => {
                            onOpenDownloader(episode);
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
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-slate-400 px-4">
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>Thư viện Kênh Minh Hiếu &amp; Tìm kiếm YouTube đa nguồn (CORS)</span>
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-medium"
          >
            Đóng (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
