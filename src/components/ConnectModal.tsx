import React, { useState } from 'react';
import {
  X,
  Link as LinkIcon,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  Layers,
  ListPlus,
  Tv,
  Check,
  Plus,
  ListMusic,
  Bell,
  ExternalLink,
  Film,
  FolderPlus,
} from 'lucide-react';
import { PodcastEpisode } from '../types/podcast';
import { extractYouTubeId, extractPlaylistId } from '../utils/youtube';
import {
  getStaticChannelData,
  hasBackend,
  getApiBaseUrl,
  isStaticHost,
  getCustomBackendUrl,
  setCustomBackendUrl,
} from '../utils/api';
import {
  DEFAULT_TIKTOK_URL,
  TikTokVideoData,
  isTikTokUrl,
  fetchTikTokVideoData,
  convertTikTokDataToEpisode,
} from '../utils/tiktokApi';
import { saveAdminSettingsToNeon } from '../utils/adminSettingsSync';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEpisode: (episode: PodcastEpisode) => void;
  onBatchAddEpisodes: (episodes: PodcastEpisode[], replaceExisting?: boolean) => void;
  onSubscribeChannel?: (channelName: string) => void;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  isOpen,
  onClose,
  onAddEpisode,
  onBatchAddEpisodes,
  onSubscribeChannel,
}) => {
  const [urlInput, setUrlInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);
  const [showBackendConfig, setShowBackendConfig] = useState<boolean>(false);
  const [backendUrlInput, setBackendUrlInput] = useState<string>(getCustomBackendUrl() || '');
  const [backendSavedSuccess, setBackendSavedSuccess] = useState<boolean>(false);

  // Result state
  const [channelData, setChannelData] = useState<{
    type: 'podcasts' | 'playlists' | 'videos' | 'channel';
    channel: {
      name: string;
      handle: string;
      avatar: string;
      subscribers: string;
      youtubeUrl: string;
      subscribeUrl: string;
    };
    episodes?: {
      youtubeId: string;
      title: string;
      channel: string;
      channelAvatar?: string;
      duration: string;
      thumbnail: string;
      seriesTitle?: string;
    }[];
    playlists?: {
      playlistId: string;
      title: string;
      url: string;
      thumbnail?: string;
    }[];
    totalCount?: number;
  } | null>(null);

  // Single video preview (YouTube or TikTok)
  const [singlePreview, setSinglePreview] = useState<{
    youtubeId: string;
    title: string;
    author: string;
    thumbnail: string;
    sourceType?: 'youtube' | 'tiktok';
    sourceUrl?: string;
    tiktokData?: TikTokVideoData;
  } | null>(null);

  if (!isOpen) return null;

  // Smart detect and fetch any YouTube URL
  const handleScanUrl = async (forcedUrl?: string) => {
    const targetUrl = (forcedUrl || urlInput).trim();
    if (!targetUrl) {
      setError('Vui lòng dán đường dẫn kênh, podcast hoặc video YouTube');
      return;
    }

    setLoading(true);
    setError(null);
    setChannelData(null);
    setSinglePreview(null);

    try {
      // 0. Is it a TikTok video URL?
      if (isTikTokUrl(targetUrl)) {
        const tkData = await fetchTikTokVideoData(targetUrl);
        setSinglePreview({
          youtubeId: String(tkData.id),
          title:
            tkData.description?.trim() ||
            `Video TikTok @${tkData.author?.username || 'tiktok'} #${tkData.id}`,
          author: tkData.author?.nickname || tkData.author?.username || 'TikTok Creator',
          thumbnail: tkData.cover || tkData.author?.avatar || '',
          sourceType: 'tiktok',
          sourceUrl: targetUrl,
          tiktokData: tkData,
        });
        return;
      }

      // 1. Is it a channel URL? (@channel/podcasts, @channel/playlists, @channel/videos, @channel)
      if (targetUrl.includes('youtube.com/@') || targetUrl.startsWith('@')) {
        const fullUrl = targetUrl.startsWith('http') ? targetUrl : `https://www.youtube.com/${targetUrl}`;
        if (hasBackend()) {
          try {
            const apiBase = getApiBaseUrl();
            if (apiBase) {
              const response = await fetch(`${apiBase}podcast/channel?url=${encodeURIComponent(fullUrl)}`);
              const contentType = response.headers.get('content-type') || '';
              if (response.ok && !contentType.includes('text/html')) {
                const data = await response.json();
                setChannelData(data);
                return;
              }
            }
          } catch (e) {
            // Fallback for static GitHub Pages
          }
        }

        const staticData = getStaticChannelData();
        if (targetUrl.includes('podcasts')) {
          setChannelData({
            type: 'podcasts',
            channel: staticData.channel,
            episodes: staticData.podcasts,
            totalCount: staticData.podcasts.length,
          });
        } else if (targetUrl.includes('playlists')) {
          setChannelData({
            type: 'playlists',
            channel: staticData.channel,
            playlists: staticData.playlists,
            totalCount: staticData.playlists.length,
          });
        } else {
          setChannelData({
            type: 'videos',
            channel: staticData.channel,
            episodes: staticData.videos,
            totalCount: staticData.videos.length,
          });
        }
        return;
      }

      // 2. Is it a playlist URL? (list=...)
      if (targetUrl.includes('list=')) {
        if (hasBackend()) {
          try {
            const apiBase = getApiBaseUrl();
            if (apiBase) {
              const response = await fetch(`${apiBase}podcast/playlist?url=${encodeURIComponent(targetUrl)}`);
              const contentType = response.headers.get('content-type') || '';
              if (response.ok && !contentType.includes('text/html')) {
                const data = await response.json();
                setChannelData({
                  type: 'playlists',
                  channel: {
                    name: data.playlistTitle || 'Danh sách phát YouTube',
                    handle: data.playlistId,
                    avatar: data.episodes?.[0]?.channelAvatar || 'https://ui-avatars.com/api/?name=YT',
                    subscribers: 'Danh sách phát',
                    youtubeUrl: targetUrl,
                    subscribeUrl: targetUrl,
                  },
                  episodes: data.episodes,
                  totalCount: data.totalCount,
                });
                return;
              }
            }
          } catch (e) {}
        }

        const staticData = getStaticChannelData();
        setChannelData({
          type: 'playlists',
          channel: {
            name: 'Danh sách phát YouTube',
            handle: 'playlist',
            avatar: staticData.channel.avatar,
            subscribers: 'Danh sách phát',
            youtubeUrl: targetUrl,
            subscribeUrl: targetUrl,
          },
          episodes: staticData.videos.slice(0, 8),
          totalCount: 8,
        });
        return;
      }

      // 3. Is it a single video URL?
      const ytId = extractYouTubeId(targetUrl);
      if (ytId) {
        if (hasBackend()) {
          try {
            const apiBase = getApiBaseUrl();
            if (apiBase) {
              const response = await fetch(`${apiBase}podcast/meta?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ytId}`)}`);
              const contentType = response.headers.get('content-type') || '';
              if (response.ok && !contentType.includes('text/html')) {
                const data = await response.json();
                setSinglePreview({
                  youtubeId: ytId,
                  title: data.title || `Video (${ytId})`,
                  author: data.author || 'Kênh YouTube',
                  thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
                });
                return;
              }
            }
          } catch (e) {}
        }

        // Direct client-side oEmbed query which supports CORS from youtube.com
        try {
          const ytOembed = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ytId}`)}&format=json`
          );
          if (ytOembed.ok) {
            const oData = await ytOembed.json();
            setSinglePreview({
              youtubeId: ytId,
              title: oData.title || `Video (${ytId})`,
              author: oData.author_name || 'Kênh YouTube',
              thumbnail: oData.thumbnail_url || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
            });
            return;
          }
        } catch {}

        setSinglePreview({
          youtubeId: ytId,
          title: `Video (${ytId})`,
          author: 'Kênh YouTube',
          thumbnail: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
        });
        return;
      }

      throw new Error('Đường dẫn không hợp lệ. Vui lòng dán link video TikTok, link kênh (@channel), podcast hoặc video YouTube.');
    } catch (err: any) {
      setError(err.message || 'Lỗi khi kiểm tra đường dẫn');
    } finally {
      setLoading(false);
    }
  };

  // Add all detected episodes to library
  const handleConfirmEpisodes = (episodesToSave: any[]) => {
    if (!episodesToSave || episodesToSave.length === 0) return;

    const formatted: PodcastEpisode[] = episodesToSave.map((item, idx) => ({
      id: `saved-${Date.now()}-${idx}-${item.youtubeId}`,
      youtubeId: item.youtubeId,
      title: item.title,
      channel: item.channel || channelData?.channel.name || 'Kênh YouTube',
      channelAvatar: item.channelAvatar || channelData?.channel.avatar,
      category: 'phat-trien-ban-than',
      duration: item.duration || '15:00',
      durationSeconds: 900,
      thumbnail: item.thumbnail,
      description: item.seriesTitle ? `Series: ${item.seriesTitle}` : `Đã lưu từ ${channelData?.channel.name || 'YouTube'}`,
      isCustom: true,
      publishedDate: 'Mới lưu',
    }));

    onBatchAddEpisodes(formatted, replaceExisting);
    if (channelData && onSubscribeChannel) {
      onSubscribeChannel(channelData.channel.name);
    }
    onClose();
    resetState();
  };

  // Add single video (YouTube or TikTok)
  const handleConfirmSingle = () => {
    if (!singlePreview) return;
    if (singlePreview.sourceType === 'tiktok' && singlePreview.tiktokData) {
      const tiktokEp = convertTikTokDataToEpisode(
        singlePreview.tiktokData,
        singlePreview.sourceUrl || urlInput
      );
      onAddEpisode(tiktokEp);
      onClose();
      resetState();
      return;
    }

    const newEp: PodcastEpisode = {
      id: `single-${Date.now()}-${singlePreview.youtubeId}`,
      youtubeId: singlePreview.youtubeId,
      title: singlePreview.title,
      channel: singlePreview.author,
      category: 'phat-trien-ban-than',
      duration: '15:00',
      durationSeconds: 900,
      thumbnail: singlePreview.thumbnail,
      description: `Video kết nối từ ${singlePreview.author}`,
      isCustom: true,
      sourceType: 'youtube',
      publishedDate: 'Mới lưu',
    };
    onAddEpisode(newEp);
    onClose();
    resetState();
  };

  // Fetch a specific playlist from the playlists tab
  const handleLoadSpecificPlaylist = async (playlistUrl: string) => {
    setLoading(true);
    try {
      if (hasBackend()) {
        const apiBase = getApiBaseUrl();
        if (apiBase) {
          const response = await fetch(`${apiBase}podcast/playlist?url=${encodeURIComponent(playlistUrl)}`);
          const contentType = response.headers.get('content-type') || '';
          if (response.ok && !contentType.includes('text/html')) {
            const data = await response.json();
            if (data.episodes) {
              handleConfirmEpisodes(data.episodes);
              return;
            }
          }
        }
      }
      const staticData = getStaticChannelData();
      handleConfirmEpisodes(staticData.videos.slice(0, 10));
    } catch (e: any) {
      setError(e.message || 'Lỗi khi tải playlist');
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setUrlInput('');
    setChannelData(null);
    setSinglePreview(null);
    setError(null);
  };

  const sampleButtons = [
    { label: 'TikTok mẫu (@hiu.minh1093)', url: DEFAULT_TIKTOK_URL },
    { label: '@MinhHieuOfficialvn/podcasts', url: 'https://www.youtube.com/@MinhHieuOfficialvn/podcasts' },
    { label: '@MinhHieuOfficialvn/playlists', url: 'https://www.youtube.com/@MinhHieuOfficialvn/playlists' },
    { label: '@MinhHieuOfficialvn/videos', url: 'https://www.youtube.com/@MinhHieuOfficialvn/videos' },
    { label: '@MinhHieuOfficialvn', url: 'https://www.youtube.com/@MinhHieuOfficialvn' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Thêm Kênh, Podcasts Hoặc Video YouTube / TikTok
              </h3>
              <p className="text-xs text-slate-400">
                Dán link kênh (@channel), podcast, playlist YouTube hoặc link video TikTok để xem ngay
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200">
              Dán đường dẫn YouTube:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://www.youtube.com/@MinhHieuOfficialvn/podcasts..."
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setError(null);
                }}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={() => handleScanUrl()}
                disabled={loading || !urlInput.trim()}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Quét & Tải</span>
              </button>
            </div>

            {/* Quick Presets matching user request */}
            <div className="pt-1 space-y-1">
              <span className="text-[11px] text-slate-400 block">Thử nhanh các định dạng:</span>
              <div className="flex flex-wrap gap-1.5">
                {sampleButtons.map((btn, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setUrlInput(btn.url);
                      handleScanUrl(btn.url);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 hover:text-amber-300 text-[11px] font-mono text-slate-300 border border-slate-700/60 transition-colors"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <p className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          {/* Replace existing checkbox */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="accent-amber-500 rounded w-4 h-4"
              />
              <span>Chỉ hiển thị podcast do bạn cài đặt (Xóa các podcast cũ để không bị lẫn)</span>
            </label>
          </div>

          {/* RESULT 1: CHANNEL RESOLVED */}
          {channelData && (
            <div className="space-y-4 pt-2 border-t border-slate-800">
              {/* Channel Header Card */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={channelData.channel.avatar}
                    alt={channelData.channel.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-100 truncate">
                      {channelData.channel.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="text-amber-400">{channelData.channel.handle}</span>
                      <span>·</span>
                      <span>{channelData.channel.subscribers}</span>
                    </div>
                  </div>
                </div>

                {/* Subscribe button */}
                <div className="flex items-center gap-2">
                  <a
                    href={channelData.channel.subscribeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-950 font-bold rounded-full text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0 active:scale-95"
                    title="Đăng ký kênh trên YouTube"
                  >
                    <span className="text-red-600 font-black">▶</span>
                    <span>Đăng ký kênh</span>
                  </a>
                </div>
              </div>

              {/* A. If URL is /podcasts or /videos -> show full list of episodes with thumbnails */}
              {channelData.episodes && channelData.episodes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">
                      {channelData.type === 'podcasts'
                        ? `Toàn bộ Podcasts của kênh (${channelData.episodes.length} tập):`
                        : `Toàn bộ Video của kênh (${channelData.episodes.length} video):`}
                    </span>
                    <span className="text-emerald-400 font-medium">Đã tải đầy đủ ảnh bìa & tiêu đề</span>
                  </div>

                  {/* Scrollable list showing all videos */}
                  <div className="divide-y divide-slate-800/80 max-h-60 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950/60 pr-1">
                    {channelData.episodes.map((ep, idx) => (
                      <div key={idx} className="p-2.5 flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-slate-400 w-6 text-center shrink-0">
                          #{idx + 1}
                        </span>
                        <img
                          src={ep.thumbnail}
                          alt={ep.title}
                          referrerPolicy="no-referrer"
                          className="w-20 h-12 object-cover rounded-lg border border-slate-800 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-slate-200 line-clamp-2">
                            {ep.title}
                          </h5>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            {ep.seriesTitle && (
                              <span className="text-amber-400 truncate max-w-[150px]">{ep.seriesTitle}</span>
                            )}
                            <span className="font-mono tabular-nums">{ep.duration}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleConfirmEpisodes(channelData.episodes!)}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lưu và phát toàn bộ {channelData.episodes.length} video này</span>
                  </button>
                </div>
              )}

              {/* B. If URL is /playlists -> show all playlists of channel */}
              {channelData.playlists && channelData.playlists.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-200 block">
                    Danh sách các Playlist của kênh ({channelData.playlists.length} danh sách phát):
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                    {channelData.playlists.map((pl, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-950 border border-slate-800 hover:border-amber-500/80 rounded-xl flex flex-col justify-between gap-2.5 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
                            <ListMusic className="w-4 h-4" />
                          </div>
                          <h5 className="text-xs font-bold text-slate-100 line-clamp-2">
                            {pl.title}
                          </h5>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleLoadSpecificPlaylist(pl.url)}
                          className="w-full py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Tải toàn bộ playlist này</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RESULT 2: SINGLE VIDEO PREVIEW */}
          {singlePreview && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex gap-3 items-center">
                <img
                  src={singlePreview.thumbnail}
                  alt={singlePreview.title}
                  referrerPolicy="no-referrer"
                  className="w-24 h-14 rounded-xl object-cover shrink-0 border border-slate-800"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-100 line-clamp-2">
                    {singlePreview.title}
                  </h4>
                  <p className="text-xs text-amber-400 truncate mt-0.5">
                    {singlePreview.author}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmSingle}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Lưu video này</span>
              </button>
            </div>
          )}
          {/* Backend Connection Information & Settings for GitHub Pages */}
          <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${hasBackend() ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                {hasBackend() ? 'Đang kết nối: Backend API hoạt động' : 'Chế độ: GitHub Pages (Tĩnh - Không cần server)'}
              </span>
              <button
                type="button"
                onClick={() => setShowBackendConfig(!showBackendConfig)}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium"
              >
                {showBackendConfig ? 'Ẩn cài đặt API' : 'Cấu hình Backend API từ xa'}
              </button>
            </div>

            {showBackendConfig && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  <strong>Lưu ý:</strong> GitHub Pages chỉ chạy giao diện tĩnh (HTML/JS), không chạy Node.js server. Nếu bạn muốn crawl trực tiếp toàn bộ video YouTube thời gian thực, hãy deploy file <code className="text-amber-300">server.ts</code> lên Render hoặc Railway và dán URL vào bên dưới:
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://my-podcast-api.onrender.com"
                    value={backendUrlInput}
                    onChange={(e) => {
                      setBackendUrlInput(e.target.value);
                      setBackendSavedSuccess(false);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clean = backendUrlInput.trim();
                      setCustomBackendUrl(clean || null);
                      saveAdminSettingsToNeon({
                        apiKeys: { customBackendUrl: clean },
                        storagePreferences: { customBackendUrl: clean },
                      }).catch(() => {});
                      setBackendSavedSuccess(true);
                      setTimeout(() => setBackendSavedSuccess(false), 2500);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl font-semibold text-xs transition-colors shrink-0"
                  >
                    {backendSavedSuccess ? 'Đã lưu!' : 'Lưu URL'}
                  </button>
                </div>
                {backendSavedSuccess && (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Đã cập nhật địa chỉ Backend API!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
