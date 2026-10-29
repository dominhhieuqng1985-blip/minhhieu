import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Play,
  Copy,
  Check,
  Share2,
  Heart,
  MessageCircle,
  Eye,
  Bookmark,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Video,
  Trash2,
  Settings,
  ShieldCheck,
  AlertCircle,
  Loader2,
  X,
  FileCheck,
  Music,
  Plus,
  Lock,
  Unlock,
  Bell,
} from 'lucide-react';
import {
  TikTokVideoData,
  TikTokHistoryItem,
  DEFAULT_TIKTOK_URL,
  fetchTikTokVideoData,
  fetchFreshTikTokDownloadUrl,
  downloadTikTokFile,
  generateTikTokDownloadFileName,
  formatCompactNumber,
  getTikTokApiKey,
  setTikTokApiKey,
  DEFAULT_RAPIDAPI_KEY,
  DEFAULT_RAPIDAPI_HOST,
  getSavedTikTokHistory,
  saveTikTokHistoryItem,
  clearTikTokHistory,
  convertTikTokDataToEpisode,
} from '../utils/tiktokApi';
import { PodcastEpisode } from '../types/podcast';
import { TikTokVideoPlayer, PlayerErrorBoundary } from './TikTokVideoPlayer';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  YouTubeSubscribeGateModal,
  isYouTubeSubUnlocked,
  subscribeYouTubeUnlockState,
  MINHHIEU_SUBSCRIBE_URL,
} from './YouTubeSubscribeGateModal';

interface TikTokDownloaderStudioProps {
  onShowToast?: (msg: string) => void;
  onAddToQueue?: (episode: PodcastEpisode) => void;
  onPlayInMainPlayer?: (episode: PodcastEpisode) => void;
}

export const TikTokDownloaderStudio: React.FC<TikTokDownloaderStudioProps> = ({
  onShowToast,
  onAddToQueue,
  onPlayInMainPlayer,
}) => {
  const [urlInput, setUrlInput] = useState<string>(DEFAULT_TIKTOK_URL);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<TikTokVideoData | null>(null);
  const [lastQueriedUrl, setLastQueriedUrl] = useState<string>(DEFAULT_TIKTOK_URL);

  // Download filename & explicit download state (ONLY runs when user clicks Download)
  const [targetFileName, setTargetFileName] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadingHistoryId, setDownloadingHistoryId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Settings & YouTube Subscription Unlock Gate (Admin bypasses automatically)
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [customKey, setCustomKey] = useState<string>(() => getTikTokApiKey());
  const [history, setHistory] = useState<TikTokHistoryItem[]>(() => getSavedTikTokHistory());
  const [isSubGateOpen, setIsSubGateOpen] = useState<boolean>(false);
  const [isGateInitialWaiting, setIsGateInitialWaiting] = useState<boolean>(false);
  const [isSubUnlocked, setIsSubUnlocked] = useState<boolean>(() => isYouTubeSubUnlocked());
  const pendingHistoryItemRef = useRef<TikTokHistoryItem | null>(null);
  const autoDownloadAfterUnlockRef = useRef<boolean>(false);

  const { isAdmin, openAdminModal } = useAdminAuth();
  const didAutoLoadRef = useRef<boolean>(false);

  useEffect(() => {
    return subscribeYouTubeUnlockState((unlocked) => setIsSubUnlocked(unlocked));
  }, []);

  // Generate filename whenever videoData is updated
  useEffect(() => {
    if (videoData) {
      const generated = generateTikTokDownloadFileName(videoData.description, videoData.id);
      setTargetFileName(generated);
    }
  }, [videoData]);

  const saveHistoryRecord = (data: TikTokVideoData, fname: string, sourceLink: string) => {
    const item: TikTokHistoryItem = {
      id: String(data.id),
      authorName: data.author?.nickname || data.author?.username || 'TikTok',
      authorUsername: data.author?.username || 'tiktok',
      description: data.description || '',
      cover: data.cover || '',
      downloadUrl: data.playUrl || data.hdPlayUrl || data.downloadUrl,
      videoUrl: data.videoUrl || sourceLink,
      downloadedAt: Date.now(),
      fileName: fname,
    };
    saveTikTokHistoryItem(item);
    setHistory(getSavedTikTokHistory());
  };

  // Fetch video info & load into inline player
  const handleFetch = async (targetUrl?: string, silentToast = false) => {
    const query = (targetUrl !== undefined ? targetUrl : urlInput).trim();
    if (!query) {
      setErrorMsg('Vui lòng dán đường link video TikTok cần xem hoặc tải.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = await fetchTikTokVideoData(query);
      setVideoData(data);
      setLastQueriedUrl(query);
      if (!silentToast && onShowToast) {
        onShowToast('Đã sẵn sàng phát video chất lượng cao!');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể tải thông tin video TikTok. Vui lòng kiểm tra lại link.');
    } finally {
      setIsLoading(false);
    }
  };

  // Automatically load the default TikTok link on initial mount
  useEffect(() => {
    if (didAutoLoadRef.current) return;
    didAutoLoadRef.current = true;
    handleFetch(DEFAULT_TIKTOK_URL, true);
  }, []);

  const executeDownloadNow = async () => {
    if (!videoData || isDownloading) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setErrorMsg(null);

    const mediaToDownload =
      videoData.playUrl || videoData.hdPlayUrl || videoData.downloadUrl;
    const pageUrl = videoData.videoUrl || lastQueriedUrl || urlInput;

    try {
      await downloadTikTokFile(
        mediaToDownload,
        targetFileName,
        (pct) => setDownloadProgress(pct),
        pageUrl
      );
      saveHistoryRecord(videoData, targetFileName, pageUrl);
      if (onShowToast) onShowToast(`Đã lưu video về thiết bị: ${targetFileName}`);
    } catch (err: any) {
      setErrorMsg('Tải thất bại: ' + (err?.message || 'Vui lòng thử lại sau giây lát.'));
    } finally {
      setIsDownloading(false);
    }
  };

  // Triggered when user clicks "Tải Video Không Logo" — Admin bypasses gate; regular users subscribe first
  const handleDownload = () => {
    if (!videoData || isDownloading) return;
    if (!isAdmin && !isSubUnlocked && !isYouTubeSubUnlocked()) {
      pendingHistoryItemRef.current = null;
      autoDownloadAfterUnlockRef.current = true;
      setIsGateInitialWaiting(false);
      setIsSubGateOpen(true);
      return;
    }
    executeDownloadNow();
  };

  const executeHistoryDownload = async (item: TikTokHistoryItem) => {
    if (downloadingHistoryId) return;
    setDownloadingHistoryId(item.id);
    const pageUrl =
      item.videoUrl || `https://www.tiktok.com/@${item.authorUsername}/video/${item.id}`;
    try {
      await downloadTikTokFile(item.downloadUrl, item.fileName, undefined, pageUrl);
      if (onShowToast) onShowToast(`Đã tải lại tệp: ${item.fileName}`);
    } catch (err: any) {
      if (onShowToast) onShowToast('Không thể tải lại: ' + (err?.message || 'Thử phát lại rồi bấm tải'));
    } finally {
      setDownloadingHistoryId(null);
    }
  };

  const handleRedownloadHistoryItem = (item: TikTokHistoryItem) => {
    if (downloadingHistoryId) return;
    if (!isAdmin && !isSubUnlocked && !isYouTubeSubUnlocked()) {
      pendingHistoryItemRef.current = item;
      autoDownloadAfterUnlockRef.current = true;
      setIsGateInitialWaiting(false);
      setIsSubGateOpen(true);
      return;
    }
    executeHistoryDownload(item);
  };

  const handleRegenerateFileName = () => {
    if (!videoData) return;
    const newName = generateTikTokDownloadFileName(videoData.description, videoData.id);
    setTargetFileName(newName);
    if (onShowToast) onShowToast(`Đã tạo tên tệp ngẫu nhiên mới: ${newName}`);
  };

  const handleCopyLink = async () => {
    if (!videoData) return;
    const pageUrl = videoData.videoUrl || lastQueriedUrl || DEFAULT_TIKTOK_URL;
    try {
      const fresh = await fetchFreshTikTokDownloadUrl(pageUrl);
      await navigator.clipboard.writeText(fresh);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      if (onShowToast) onShowToast('Đã sao chép link MP4 không logo vào clipboard!');
    } catch {
      navigator.clipboard.writeText(videoData.hdPlayUrl || videoData.playUrl || videoData.downloadUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      if (onShowToast) onShowToast('Đã sao chép link video vào clipboard!');
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text.trim());
        handleFetch(text.trim());
      }
    } catch {
      if (onShowToast) onShowToast('Vui lòng nhấn Ctrl+V / ⌘V để dán đường link.');
    }
  };

  const handleAddVideoToAppQueue = (switchToPlayer = false) => {
    if (!videoData) return;
    const episode = convertTikTokDataToEpisode(
      videoData,
      videoData.videoUrl || lastQueriedUrl || urlInput
    );
    if (switchToPlayer && onPlayInMainPlayer) {
      onPlayInMainPlayer(episode);
      return;
    }
    if (onAddToQueue) {
      onAddToQueue(episode);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/10 via-rose-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-cyan-400">
              <Music className="w-3.5 h-3.5 text-rose-400" />
              <span>TikTok Player &amp; Downloader HD</span>
              <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] uppercase font-bold">
                Không Logo
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5 flex-wrap">
              <span>Xem &amp; Tải Video TikTok Không Logo</span>
              <span className="text-sm px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                Minh Hiếu
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              Dán đường dẫn TikTok bất kỳ để thưởng thức trọn vẹn hình ảnh Full HD sắc nét, giữ nguyên âm thanh gốc và lưu video sạch bóng logo về máy tính hoặc điện thoại.
            </p>
          </div>

          {/* Cấu Hình API - Strictly hidden for regular users, only visible when isAdmin is true */}
          {isAdmin && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-cyan-500/30 text-cyan-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                title="Cài đặt cấu hình RapidAPI dự phòng (Chỉ Quản trị viên)"
              >
                <Settings className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Cấu Hình API</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-bold">
                  Admin
                </span>
              </button>
            </div>
          )}
        </div>

        {/* RapidAPI Settings Drawer - Only rendered for Admin */}
        {isAdmin && showSettings && (
          <div className="mt-5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">Cổng Kết Nối TikTok HD &amp; RapidAPI Dự Phòng (Admin)</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">{DEFAULT_RAPIDAPI_HOST}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Hệ thống tự động ưu tiên luồng phát HD trực tiếp không logo và dùng khóa RapidAPI dự phòng khi cần.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="Nhập mã X-RapidAPI-Key..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => {
                  setTikTokApiKey(customKey);
                  if (onShowToast) onShowToast('Đã lưu mã RapidAPI Key!');
                  setShowSettings(false);
                }}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shrink-0 transition-colors"
              >
                Lưu
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomKey(DEFAULT_RAPIDAPI_KEY);
                  setTikTokApiKey(DEFAULT_RAPIDAPI_KEY);
                  if (onShowToast) onShowToast('Đã khôi phục mã RapidAPI mặc định.');
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs shrink-0 transition-colors"
              >
                Mặc Định
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleFetch();
          }}
          className="space-y-3"
        >
          <div className="relative">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setErrorMsg(null);
              }}
              placeholder={`Dán link video TikTok (Mặc định: ${DEFAULT_TIKTOK_URL})`}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pl-4 pr-24 py-3.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors shadow-inner font-sans"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {urlInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput('');
                    setErrorMsg(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  title="Xóa link"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700 transition-colors flex items-center gap-1"
                  title="Dán từ Clipboard"
                >
                  <Copy className="w-3 h-3" />
                  <span>Dán</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400">Link mặc định:</span>
              <button
                type="button"
                onClick={() => {
                  setUrlInput(DEFAULT_TIKTOK_URL);
                  handleFetch(DEFAULT_TIKTOK_URL);
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-cyan-300 hover:text-white text-xs border border-cyan-500/30 transition-colors flex items-center gap-1.5 font-medium"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>@hiu.minh1093 (Mặc định)</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || !urlInput.trim()}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-rose-500 to-amber-500 hover:opacity-90 disabled:opacity-40 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang mở trình phát...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Mở Xem Video Không Logo</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1">
          <span className="text-cyan-400 font-semibold shrink-0">Hỗ trợ:</span>
          <span className="truncate">{DEFAULT_TIKTOK_URL} hoặc link rút gọn vt.tiktok.com/...</span>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}
      </div>

      {/* Loading Skeleton when fetching initial video */}
      {isLoading && !videoData && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-xs font-semibold text-slate-300">
            Đang kết nối trình phát TikTok HD không logo...
          </p>
        </div>
      )}

      {/* Video Result Presentation + Dedicated Inline Player */}
      {videoData && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 animate-in slide-in-from-bottom-3">
          {/* Top Author Details */}
          <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <img
                src={videoData.author?.avatar || videoData.cover}
                alt={videoData.author?.nickname || 'TikTok'}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-2xl object-cover border border-slate-700 shadow-md bg-slate-800"
                onError={(e) => {
                  if (videoData.cover && e.currentTarget.src !== videoData.cover) {
                    e.currentTarget.src = videoData.cover;
                  }
                }}
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-extrabold text-white">
                    {videoData.author?.nickname || videoData.author?.username || 'TikTok Creator'}
                  </h3>
                  {videoData.author?.verified && (
                    <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-cyan-400 font-mono">
                  @{videoData.author?.username || 'tiktok'}
                </p>
                {videoData.author?.signature && (
                  <p className="text-[11px] text-slate-400 line-clamp-1 italic max-w-md">
                    {videoData.author.signature}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5" />
                <span>Chuẩn HD · Sạch Watermark</span>
              </span>
            </div>
          </div>

          {/* Description & Hashtags */}
          <div className="space-y-2">
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              {videoData.description || 'Video TikTok không có mô tả.'}
            </p>
            {videoData.hashtags && videoData.hashtags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {videoData.hashtags.map((h, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800/80 text-cyan-300 font-mono"
                  >
                    #{h.hashtagName}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Social Stats Counters */}
          {videoData.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center">
              <div className="space-y-0.5">
                <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Lượt xem</span>
                </div>
                <div className="text-xs sm:text-sm font-black text-white">
                  {formatCompactNumber(videoData.stats.views)}
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>Thích</span>
                </div>
                <div className="text-xs sm:text-sm font-black text-white">
                  {formatCompactNumber(videoData.stats.likes)}
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                  <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bình luận</span>
                </div>
                <div className="text-xs sm:text-sm font-black text-white">
                  {formatCompactNumber(videoData.stats.comments)}
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Chia sẻ</span>
                </div>
                <div className="text-xs sm:text-sm font-black text-white">
                  {formatCompactNumber(videoData.stats.shares)}
                </div>
              </div>

              <div className="space-y-0.5 col-span-2 sm:col-span-1">
                <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                  <Bookmark className="w-3.5 h-3.5 text-violet-400" />
                  <span>Lưu lại</span>
                </div>
                <div className="text-xs sm:text-sm font-black text-white">
                  {formatCompactNumber(videoData.stats.saves)}
                </div>
              </div>
            </div>
          )}

          {/* Dedicated Inline TikTok Player + Explicit Download Box */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* Left: Dedicated TikTok Player (Plays inline, NEVER auto-downloads!) */}
            <div className="md:col-span-5">
              <PlayerErrorBoundary resetKey={videoData.id}>
                <TikTokVideoPlayer
                  variant="compact"
                  tiktokData={videoData}
                  sourceUrl={videoData.videoUrl || lastQueriedUrl || urlInput}
                  onShowToast={onShowToast}
                />
              </PlayerErrorBoundary>
              <p className="text-[11px] text-center text-slate-400 mt-2">
                Hình ảnh sắc nét chuẩn H.264 &amp; âm thanh gốc trung thực
              </p>
            </div>

            {/* Right: Filename, Subscription Status & Download Actions */}
            <div className="md:col-span-7 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tên tệp video lưu về thiết bị</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleRegenerateFileName}
                    className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                    title="Đổi mã tệp ngẫu nhiên khác"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Làm mới tên tệp</span>
                  </button>
                </div>

                <div className="bg-slate-900 border border-amber-500/30 rounded-xl px-3 py-2 text-xs font-mono text-amber-300 break-all select-all">
                  {targetFileName}
                </div>

                <p className="text-[11px] text-slate-400">
                  Định dạng MP4 tương thích tốt trên iPhone, Android, máy tính và các trình biên tập video.
                </p>
              </div>

              {/* YouTube Channel Subscription Unlock Status Banner */}
              {isAdmin ? (
                <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-950/35 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold">Tài khoản Quản trị viên: Tải trực tiếp không cần mở khóa</span>
                  </div>
                </div>
              ) : isSubUnlocked ? (
                <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-950/35 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Đã đăng ký kênh <strong>@minhhieureviewphim</strong> · Đã mở khóa tải video
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-red-950/25 border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-start gap-2 text-slate-200">
                    <Lock className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>
                      Đăng ký kênh YouTube <strong className="text-amber-300">@minhhieureviewphim</strong> để mở khóa tính năng tải về miễn phí.
                    </span>
                  </div>
                  <a
                    href={MINHHIEU_SUBSCRIBE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      pendingHistoryItemRef.current = null;
                      autoDownloadAfterUnlockRef.current = false;
                      setIsGateInitialWaiting(true);
                      setIsSubGateOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors"
                  >
                    <Bell className="w-3.5 h-3.5 fill-current" />
                    <span>Đăng ký mở khóa</span>
                  </a>
                </div>
              )}

              {/* Download & Queue Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Đang tải xuống ({downloadProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      {!isAdmin && !isSubUnlocked ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <Download className="w-5 h-5" />
                      )}
                      <span>Tải Video Không Logo</span>
                    </>
                  )}
                </button>

                {isDownloading && (
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-rose-500 h-full transition-all duration-200"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/80 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{isCopied ? 'Đã chép link' : 'Chép link MP4'}</span>
                  </button>

                  <a
                    href={videoData.videoUrl || lastQueriedUrl || DEFAULT_TIKTOK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/80 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở trên TikTok</span>
                  </a>
                </div>

                {(onAddToQueue || onPlayInMainPlayer) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {onPlayInMainPlayer && (
                      <button
                        type="button"
                        onClick={() => handleAddVideoToAppQueue(true)}
                        className="py-2.5 px-3 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Video className="w-4 h-4 text-cyan-400" />
                        <span>Xem Trên Trình Phát Chính</span>
                      </button>
                    )}
                    {onAddToQueue && (
                      <button
                        type="button"
                        onClick={() => handleAddVideoToAppQueue(false)}
                        className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-amber-300 border border-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-4 h-4 text-amber-400" />
                        <span>Thêm Vào Danh Sách Phát Kênh</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download History Section */}
      {history.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span>Lịch Sử Đã Tải TikTok ({history.length})</span>
            </h4>
            <button
              type="button"
              onClick={() => {
                clearTikTokHistory();
                setHistory([]);
                if (onShowToast) onShowToast('Đã xóa lịch sử tải TikTok.');
              }}
              className="text-[11px] text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Xóa lịch sử</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {history.map((item) => {
              const itemUrl =
                item.videoUrl || `https://www.tiktok.com/@${item.authorUsername}/video/${item.id}`;
              return (
                <div
                  key={item.id + item.downloadedAt}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 group hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.cover}
                      alt={item.authorName}
                      referrerPolicy="no-referrer"
                      className="w-12 h-14 rounded-xl object-cover bg-slate-900 border border-slate-800 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                        {item.authorName}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate font-mono">{item.fileName}</p>
                      <span className="text-[10px] text-slate-500">
                        {new Date(item.downloadedAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setUrlInput(itemUrl);
                        handleFetch(itemUrl);
                      }}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                      title="Phát lại video này"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRedownloadHistoryItem(item)}
                      disabled={downloadingHistoryId === item.id}
                      className="p-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 transition-all disabled:opacity-50"
                      title="Tải lại tệp này về máy"
                    >
                      {downloadingHistoryId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* YouTube Subscription Gate Modal (Admin automatically bypasses) */}
      <YouTubeSubscribeGateModal
        isOpen={isSubGateOpen}
        initialWaiting={isGateInitialWaiting}
        onClose={() => {
          setIsSubGateOpen(false);
          setIsGateInitialWaiting(false);
          pendingHistoryItemRef.current = null;
        }}
        onUnlocked={() => {
          setIsSubUnlocked(true);
          setIsGateInitialWaiting(false);
          const pendingItem = pendingHistoryItemRef.current;
          const shouldAutoDownload = autoDownloadAfterUnlockRef.current;
          pendingHistoryItemRef.current = null;
          autoDownloadAfterUnlockRef.current = false;
          if (pendingItem) {
            executeHistoryDownload(pendingItem);
          } else if (shouldAutoDownload) {
            executeDownloadNow();
          }
        }}
        onOpenAdminLogin={() =>
          openAdminModal(
            'Đăng Nhập Quản Trị Viên',
            'Đăng nhập tài khoản Admin để tải video trực tiếp mà không cần bước đăng ký kênh.'
          )
        }
        onShowToast={onShowToast}
      />
    </div>
  );
};
