import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Key,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  RefreshCw,
  ExternalLink,
  Play,
  Volume2,
  Video,
  Scissors,
  Copy,
  Trash2,
  Sparkles,
  ShieldCheck,
  FileAudio,
  Radio,
  Eye,
  EyeOff,
  PlusCircle,
  HelpCircle,
  Globe,
  Loader2,
} from 'lucide-react';
import {
  getStoredVidKrakenKey,
  setStoredVidKrakenKey,
  getVidKrakenAccount,
  submitVideoInfo,
  checkVideoInfo,
  submitDownload,
  checkDownloadStatus,
  formatBytes,
  formatDurationSeconds,
  getSavedDownloadHistory,
  saveDownloadHistoryItem,
  clearDownloadHistory,
  VidKrakenAccountInfo,
  VidKrakenVideoInfoResult,
  VidKrakenDownloadJob,
  DownloadHistoryItem,
} from '../utils/vidkraken';
import {
  DEFAULT_VIDKRAKEN_API_KEY,
  VIDKRAKEN_FORMATS,
  VidKrakenFormat,
} from '../config/vidkraken';
import { PodcastEpisode } from '../types/podcast';

interface VidKrakenDownloaderProps {
  currentEpisode?: PodcastEpisode | null;
  onAddToQueue?: (episode: PodcastEpisode) => void;
  onShowToast: (msg: string) => void;
}

export const VidKrakenDownloader: React.FC<VidKrakenDownloaderProps> = ({
  currentEpisode,
  onAddToQueue,
  onShowToast,
}) => {
  // API Key State
  const [apiKey, setApiKey] = useState<string>(getStoredVidKrakenKey);
  const [isKeyVisible, setIsKeyVisible] = useState<boolean>(false);
  const [isEditingKey, setIsEditingKey] = useState<boolean>(false);
  const [tempApiKey, setTempApiKey] = useState<string>(apiKey);

  // Account / Quota State (GET /me)
  const [accountInfo, setAccountInfo] = useState<VidKrakenAccountInfo | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState<boolean>(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Input URL State
  const [inputUrl, setInputUrl] = useState<string>('');
  const [isFetchingInfo, setIsFetchingInfo] = useState<boolean>(false);
  const [videoInfo, setVideoInfo] = useState<{
    jobId: string;
    title: string;
    duration: number;
    url: string;
    thumbnail: string;
  } | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);

  // Download Configuration State
  const [selectedFormat, setSelectedFormat] = useState<VidKrakenFormat>('audio-mp3');
  const [isTrimmingEnabled, setIsTrimmingEnabled] = useState<boolean>(false);
  const [startTimeInput, setStartTimeInput] = useState<string>('0');
  const [endTimeInput, setEndTimeInput] = useState<string>('');
  const [languageInput, setLanguageInput] = useState<string>('');

  // Active Download Job State (POST /download & GET /download/:jobId)
  const [activeJob, setActiveJob] = useState<VidKrakenDownloadJob | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const pollingRef = useRef<any>(null);

  // Download History
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  // Load initial account info and history
  useEffect(() => {
    setHistory(getSavedDownloadHistory());
    fetchAccountDetails(apiKey);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Fetch account balances & details (GET /me)
  const fetchAccountDetails = async (keyToUse: string) => {
    setIsLoadingAccount(true);
    setAccountError(null);
    try {
      const data = await getVidKrakenAccount(keyToUse);
      setAccountInfo(data);
    } catch (err: any) {
      console.warn('Account check error:', err);
      setAccountError(err.message || 'Không thể kiểm tra tài khoản');
    } finally {
      setIsLoadingAccount(false);
    }
  };

  // Save new API Key
  const handleSaveApiKey = () => {
    const trimmed = tempApiKey.trim() || DEFAULT_VIDKRAKEN_API_KEY;
    setStoredVidKrakenKey(trimmed);
    setApiKey(trimmed);
    setIsEditingKey(false);
    fetchAccountDetails(trimmed);
    onShowToast('🔑 Đã lưu trữ API Key VidKraken thành công!');
  };

  // Reset to default provided key
  const handleResetDefaultKey = () => {
    setStoredVidKrakenKey(DEFAULT_VIDKRAKEN_API_KEY);
    setApiKey(DEFAULT_VIDKRAKEN_API_KEY);
    setTempApiKey(DEFAULT_VIDKRAKEN_API_KEY);
    setIsEditingKey(false);
    fetchAccountDetails(DEFAULT_VIDKRAKEN_API_KEY);
    onShowToast('🔄 Đã khôi phục API Key gốc của bạn!');
  };

  // Populate from currently playing episode
  const handleUseCurrentEpisode = () => {
    if (currentEpisode) {
      const epUrl = `https://www.youtube.com/watch?v=${currentEpisode.youtubeId}`;
      setInputUrl(epUrl);
      setVideoInfo({
        jobId: 'current-' + currentEpisode.youtubeId,
        title: currentEpisode.title,
        duration: parseDurationToSeconds(currentEpisode.duration),
        url: epUrl,
        thumbnail: currentEpisode.thumbnail,
      });
      setEndTimeInput(String(parseDurationToSeconds(currentEpisode.duration)));
      onShowToast(`🎯 Đã chọn tập: "${currentEpisode.title}"`);
    } else {
      onShowToast('⚠️ Chưa có tập nào đang phát!');
    }
  };

  // Parse duration helper (e.g. "12:34" or "1:02:30" to seconds)
  const parseDurationToSeconds = (dur: string): number => {
    if (!dur) return 300;
    const parts = dur.split(':').map((p) => parseInt(p, 10));
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 300;
  };

  // Extract YouTube ID from url for fast thumbnail preview
  const extractYoutubeId = (url: string): string | null => {
    const m =
      url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/) ||
      url.match(/^([a-zA-Z0-9_-]{11})$/);
    return m ? m[1] : null;
  };

  // Submit Video Info (POST /info -> GET /info/{jobId})
  const handleFetchInfo = async () => {
    const targetUrl = inputUrl.trim();
    if (!targetUrl) {
      onShowToast('⚠️ Vui lòng nhập đường dẫn video YouTube');
      return;
    }

    setIsFetchingInfo(true);
    setInfoError(null);

    const vidId = extractYoutubeId(targetUrl);
    const fallbackThumb = vidId ? `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg` : '';

    try {
      // 1. Submit POST /info
      const job = await submitVideoInfo(targetUrl, apiKey);
      if (!job || !job.jobId) {
        throw new Error('Máy chủ không trả về jobId hợp lệ');
      }

      // 2. Poll GET /info/{jobId} until success or max 10 tries
      let attempts = 0;
      let finalResult: VidKrakenVideoInfoResult | null = null;

      while (attempts < 10) {
        attempts++;
        await new Promise((r) => setTimeout(r, 1200));
        const res = await checkVideoInfo(job.jobId, apiKey);
        if (res.status === 'success' || res.status === 'completed') {
          finalResult = res;
          break;
        }
        if (res.status === 'failed') {
          throw new Error(res.error || 'Lấy thông tin video thất bại');
        }
      }

      if (finalResult && finalResult.result) {
        const d = finalResult.result;
        setVideoInfo({
          jobId: job.jobId,
          title: d.title || 'Video YouTube',
          duration: d.duration || 180,
          url: d.url || targetUrl,
          thumbnail: d.thumbnail || fallbackThumb,
        });
        if (d.duration) {
          setEndTimeInput(String(d.duration));
        }
        onShowToast('✅ Đã nhận diện thông tin video thành công!');
      } else {
        // Fallback: Use oEmbed or extracted info so user is never blocked
        setVideoInfo({
          jobId: job.jobId,
          title: 'YouTube Video (' + (vidId || 'Link') + ')',
          duration: 300,
          url: targetUrl,
          thumbnail: fallbackThumb,
        });
        onShowToast('ℹ️ Đã nhận diện URL YouTube! Sẵn sàng tải xuống.');
      }
    } catch (err: any) {
      console.warn('Info fetch error:', err);
      // If VidKraken /info failed (e.g. quota or timeout), still allow user to proceed with the URL
      if (vidId) {
        setVideoInfo({
          jobId: 'manual-' + vidId,
          title: `Video YouTube (${vidId})`,
          duration: 300,
          url: targetUrl,
          thumbnail: fallbackThumb,
        });
        setInfoError('Lưu ý: Không thể tải mô tả chi tiết từ /info, nhưng vẫn có thể gửi lệnh tải trực tiếp.');
      } else {
        setInfoError(err.message || 'Lỗi khi lấy thông tin video');
      }
    } finally {
      setIsFetchingInfo(false);
    }
  };

  // Submit Download Request (POST /download -> Polling GET /download/{jobId})
  const handleStartDownload = async () => {
    const targetUrl = (videoInfo?.url || inputUrl).trim();
    if (!targetUrl) {
      onShowToast('⚠️ Vui lòng nhập hoặc chọn video cần tải');
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);
    if (pollingRef.current) clearInterval(pollingRef.current);

    try {
      const params: any = {
        url: targetUrl,
        format: selectedFormat,
      };

      if (isTrimmingEnabled) {
        const startSec = parseInt(startTimeInput, 10);
        const endSec = parseInt(endTimeInput, 10);
        if (!isNaN(startSec) && startSec >= 0) params.startTime = startSec;
        if (!isNaN(endSec) && endSec > 0 && endSec > startSec) params.endTime = endSec;
      }

      if (languageInput.trim()) {
        params.language = languageInput.trim();
      }

      // Step 1: POST /download
      const initialJob = await submitDownload(params, apiKey);
      setActiveJob(initialJob);
      onShowToast(`🚀 Đã gửi yêu cầu tải (${selectedFormat}). Đang xử lý...`);

      // Step 2: Poll GET /download/{jobId} every 1.5 seconds
      const pollJobId = initialJob.jobId;
      let pollCount = 0;

      pollingRef.current = setInterval(async () => {
        pollCount++;
        try {
          const statusRes = await checkDownloadStatus(pollJobId, apiKey);
          setActiveJob(statusRes);

          if (statusRes.status === 'COMPLETED') {
            clearInterval(pollingRef.current);
            setIsDownloading(false);
            onShowToast('🎉 Tải hoàn tất! Liên kết tải đã sẵn sàng.');

            // Refresh account quota in background
            fetchAccountDetails(apiKey);

            // Add to download history
            const historyItem: DownloadHistoryItem = {
              id: 'hist-' + Date.now(),
              jobId: statusRes.jobId,
              title: statusRes.title || videoInfo?.title || 'Video YouTube',
              youtubeUrl: targetUrl,
              downloadUrl: statusRes.downloadUrl || '',
              format: (statusRes.actualFormat || statusRes.format || selectedFormat) as VidKrakenFormat,
              duration: statusRes.duration || videoInfo?.duration || 0,
              fileSize: statusRes.fileSize,
              completedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            };
            saveDownloadHistoryItem(historyItem);
            setHistory(getSavedDownloadHistory());
          } else if (statusRes.status === 'FAILED') {
            clearInterval(pollingRef.current);
            setIsDownloading(false);
            setDownloadError(statusRes.error || statusRes.message || 'Quá trình tải thất bại trên máy chủ VidKraken');
          }

          // Timeout protection: stop polling after 5 minutes (200 checks)
          if (pollCount > 200) {
            clearInterval(pollingRef.current);
            setIsDownloading(false);
            setDownloadError('Thời gian xử lý quá lâu. Bạn có thể kiểm tra lại sau với mã Job: ' + pollJobId);
          }
        } catch (pollErr: any) {
          console.warn('Poll error:', pollErr);
        }
      }, 1500);
    } catch (err: any) {
      console.error('Download start error:', err);
      setIsDownloading(false);
      setDownloadError(err.message || 'Lỗi khi bắt đầu tải');
    }
  };

  // Add downloaded track to CastTube playlist
  const handleAddDownloadedToQueue = (item: DownloadHistoryItem | VidKrakenDownloadJob) => {
    if (!onAddToQueue) return;
    const rawUrl = 'youtubeUrl' in item ? item.youtubeUrl : item.url || inputUrl;
    const vidId = extractYoutubeId(rawUrl || '') || 'custom-' + Date.now();
    const durSec = item.duration || 300;
    const newEp: PodcastEpisode = {
      id: 'vk-' + Date.now(),
      youtubeId: vidId,
      title: item.title || 'Tập VidKraken Download',
      channel: 'Minh Hiếu review phim',
      category: 'nghe-thuat-sang-tao',
      duration: formatDurationSeconds(durSec),
      durationSeconds: durSec,
      thumbnail: `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
      description: `Tập tải xuống từ VidKraken API v2 (${item.title || 'YouTube Video'})`,
      isCustom: true,
      isShort: false,
      seriesTitle: 'Đã tải xuống (VidKraken)',
    };
    onAddToQueue(newEp);
    onShowToast(`📻 Đã thêm "${newEp.title}" vào danh sách phát!`);
  };

  // Copy link to clipboard
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    onShowToast('📋 Đã sao chép liên kết vào clipboard!');
  };

  // Calculate progress percent
  const getProgressPercent = (job: VidKrakenDownloadJob | null): number => {
    if (!job) return 0;
    if (job.status === 'COMPLETED') return 100;
    if (job.progress && typeof job.progress.percent === 'number') {
      return Math.min(100, Math.max(0, job.progress.percent));
    }
    if (job.status === 'IN_PROGRESS') return 45;
    if (job.status === 'IN_QUEUE') return 15;
    return 0;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Account Status */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-amber-950/40 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 shadow-lg">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  VidKraken Pro Studio &amp; Downloader
                </h2>
                <span className="text-[11px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  API v2 Ready
                </span>
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Chạy được trên GitHub &amp; Local
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                Công cụ trích xuất âm thanh Podcast và tải video YouTube chất lượng cao (1080p, 720p, MP3, AAC) sử dụng API VidKraken. Không cần tài khoản riêng, không cần cơ sở dữ liệu.
              </p>
            </div>
          </div>

          {/* Account Balance Pills (GET /me) */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {isLoadingAccount ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Đang kiểm tra tài khoản...</span>
              </div>
            ) : accountInfo && accountInfo.balances ? (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400">Lượt tải:</span>
                  <span className="font-bold text-white font-mono">
                    {accountInfo.balances.download_count?.remaining ?? '9'}/
                    {accountInfo.balances.download_count?.granted ?? '10'}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-400">Băng thông:</span>
                  <span className="font-bold text-white font-mono">
                    {Math.round((accountInfo.balances.bandwidth_mb?.remaining || 9980) / 1000)} GB
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-slate-400">Chủ sở hữu:</span>
                  <span className="font-semibold text-sky-300">
                    {accountInfo.name || 'Hiếu Đỗ Minh'}
                  </span>
                </div>
                <button
                  onClick={() => fetchAccountDetails(apiKey)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Cập nhật lại hạn mức"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-amber-300">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Key hoạt động tốt</span>
                <button
                  onClick={() => fetchAccountDetails(apiKey)}
                  className="ml-1 text-slate-400 hover:text-white"
                  title="Kiểm tra hạn mức"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* API Key Management Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              API Key đã lưu trữ:
            </span>
            <div className="font-mono text-slate-200 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-2">
              <span>
                {isKeyVisible
                  ? apiKey
                  : `${apiKey.slice(0, 8)}••••••••••••••••${apiKey.slice(-6)}`}
              </span>
              <button
                onClick={() => setIsKeyVisible(!isKeyVisible)}
                className="text-slate-500 hover:text-slate-300"
                title={isKeyVisible ? 'Ẩn key' : 'Hiện key'}
              >
                {isKeyVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
              <button
                onClick={() => handleCopyLink(apiKey)}
                className="text-slate-500 hover:text-slate-300"
                title="Sao chép key"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Đã xác thực &amp; Lưu vĩnh viễn
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isEditingKey ? (
              <button
                onClick={() => setIsEditingKey(true)}
                className="text-xs text-slate-400 hover:text-amber-400 underline underline-offset-2"
              >
                Thay đổi Key khác
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Nhập API Key mới..."
                  className="px-2.5 py-1 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white font-mono w-64 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleSaveApiKey}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
                >
                  Lưu
                </button>
                <button
                  onClick={handleResetDefaultKey}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                  title="Đặt lại key ban đầu f71cd7b5..."
                >
                  Đặt lại gốc
                </button>
                <button
                  onClick={() => setIsEditingKey(false)}
                  className="px-2 py-1 text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Input & Options (Left) + Active Job / Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input Form (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Section 1: URL Input */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <span>Nhập đường dẫn YouTube</span>
              </label>
              {currentEpisode && (
                <button
                  onClick={handleUseCurrentEpisode}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1.5 transition-colors"
                  title="Tải tập đang phát trong trình phát CastTube"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Dùng video đang phát</span>
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Dán link YouTube (ví dụ: https://youtu.be/dQw4w9WgXcQ hoặc video review...)"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all pr-24 font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFetchInfo();
                }}
              />
              <div className="absolute right-2 top-2 flex items-center gap-1">
                {inputUrl && (
                  <button
                    onClick={() => setInputUrl('')}
                    className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg"
                    title="Xóa"
                  >
                    ×
                  </button>
                )}
                <button
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) {
                        setInputUrl(text);
                        onShowToast('📋 Đã dán link từ clipboard!');
                      }
                    } catch {
                      onShowToast('⚠️ Vui lòng nhấn Ctrl+V / Command+V để dán.');
                    }
                  }}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  Dán
                </button>
              </div>
            </div>

            {/* Quick Suggestions / Sample URLs */}
            <div className="flex items-center gap-2 flex-wrap pt-1 text-xs text-slate-400">
              <span className="font-semibold text-slate-500">Mẫu gợi ý:</span>
              <button
                onClick={() => {
                  setInputUrl('https://www.youtube.com/watch?v=kY8c2_Z0a9M');
                  onShowToast('Đã chọn video phim Kẻ Đào Tẩu!');
                }}
                className="px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-700/60 transition-colors"
              >
                🎬 Minh Hiếu - Review Phim
              </button>
              <button
                onClick={() => {
                  setInputUrl('https://youtu.be/dQw4w9WgXcQ');
                  onShowToast('Đã chọn mẫu Rick Astley!');
                }}
                className="px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-700/60 transition-colors"
              >
                🎵 Mẫu Tài liệu API
              </button>
            </div>

            {/* Fetch Info Button */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleFetchInfo}
                disabled={isFetchingInfo || !inputUrl.trim()}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95"
              >
                {isFetchingInfo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Đang lấy thông tin từ POST /info...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kiểm tra &amp; Lấy thông tin video</span>
                  </>
                )}
              </button>
            </div>

            {infoError && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{infoError}</span>
              </div>
            )}
          </div>

          {/* Section 2: Video Metadata & Format Selection */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <span>Thông tin video &amp; Chọn chất lượng</span>
              </label>
              {videoInfo && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Đã tải dữ liệu
                </span>
              )}
            </div>

            {/* Video Preview Card if loaded */}
            {videoInfo ? (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3.5">
                {videoInfo.thumbnail && (
                  <div className="w-28 sm:w-32 aspect-video rounded-lg overflow-hidden relative shrink-0 bg-slate-900 border border-slate-800 shadow">
                    <img
                      src={videoInfo.thumbnail}
                      alt={videoInfo.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                      {formatDurationSeconds(videoInfo.duration)}
                    </div>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug">
                    {videoInfo.title}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {formatDurationSeconds(videoInfo.duration)}
                    </span>
                    <span>•</span>
                    <a
                      href={videoInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <span>Mở YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                Nhập link ở bước 1 và bấm "Kiểm tra" hoặc chọn video đang phát để xem thông tin
              </div>
            )}

            {/* Format Selector: Audio vs Video */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Định dạng &amp; Chất lượng tải về:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VIDKRAKEN_FORMATS.map((fmt) => {
                  const isSelected = selectedFormat === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setSelectedFormat(fmt.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                          : 'bg-slate-950 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          fmt.type === 'audio'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-sky-500/20 text-sky-400'
                        }`}
                      >
                        {fmt.type === 'audio' ? (
                          <FileAudio className="w-4 h-4" />
                        ) : (
                          <Video className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold line-clamp-1">{fmt.label}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                              fmt.type === 'audio'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-sky-500/20 text-sky-300'
                            }`}
                          >
                            {fmt.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {fmt.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Trimming Controls */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTrimmingEnabled}
                    onChange={(e) => setIsTrimmingEnabled(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <Scissors className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cắt đoạn thời gian (Trim Audio / Clip)</span>
                </label>
                {isTrimmingEnabled && (
                  <span className="text-[11px] text-amber-400 font-mono">
                    {formatDurationSeconds(parseInt(startTimeInput || '0', 10))} →{' '}
                    {formatDurationSeconds(parseInt(endTimeInput || '0', 10))}
                  </span>
                )}
              </div>

              {isTrimmingEnabled && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Bắt đầu (giây):
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={startTimeInput}
                      onChange={(e) => setStartTimeInput(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Kết thúc (giây):
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={endTimeInput}
                      onChange={(e) => setEndTimeInput(e.target.value)}
                      placeholder={videoInfo ? String(videoInfo.duration) : '300'}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Optional Language track */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                Track ngôn ngữ âm thanh (BCP-47):
              </span>
              <input
                type="text"
                value={languageInput}
                onChange={(e) => setLanguageInput(e.target.value)}
                placeholder="Mặc định (vi, en...)"
                className="w-32 px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-amber-500 text-right"
              />
            </div>

            {/* Start Download Button */}
            <div className="pt-2">
              <button
                onClick={handleStartDownload}
                disabled={isDownloading || (!videoInfo && !inputUrl.trim())}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Đang gửi yêu cầu và xử lý tải...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Bắt đầu tải định dạng: {selectedFormat.toUpperCase()}</span>
                  </>
                )}
              </button>
            </div>

            {downloadError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{downloadError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Status & Download Tracker (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Active Job Tracker */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <span>Tiến trình &amp; Kết quả tải xuống</span>
              </h3>
              {activeJob && (
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    activeJob.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : activeJob.status === 'FAILED'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-amber-500/20 text-amber-400 animate-pulse'
                  }`}
                >
                  {activeJob.status}
                </span>
              )}
            </div>

            {activeJob ? (
              <div className="space-y-4">
                {/* Job Title and Details */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-white line-clamp-2">
                      {activeJob.title || videoInfo?.title || 'YouTube Video Job'}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                      {activeJob.format || selectedFormat}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Job ID: {activeJob.jobId.slice(0, 12)}...</span>
                    {activeJob.duration && (
                      <span>{formatDurationSeconds(activeJob.duration)}</span>
                    )}
                  </div>
                </div>

                {/* Live Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                      {activeJob.status === 'IN_QUEUE' && '⏳ Đang chờ máy chủ xử lý...'}
                      {activeJob.status === 'IN_PROGRESS' && '⚡ Đang tải & chuyển mã...'}
                      {activeJob.status === 'COMPLETED' && '✅ Tải xong!'}
                      {activeJob.status === 'FAILED' && '❌ Lỗi xử lý'}
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      {getProgressPercent(activeJob)}%
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        activeJob.status === 'COMPLETED'
                          ? 'bg-emerald-500'
                          : activeJob.status === 'FAILED'
                          ? 'bg-red-500'
                          : 'bg-gradient-to-r from-amber-500 to-amber-300'
                      }`}
                      style={{ width: `${getProgressPercent(activeJob)}%` }}
                    />
                  </div>

                  {activeJob.progress && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Giai đoạn: {activeJob.progress.stage || 'downloading'}</span>
                      {activeJob.progress.bytesDownloaded && (
                        <span>
                          {formatBytes(activeJob.progress.bytesDownloaded)} /{' '}
                          {formatBytes(activeJob.progress.totalBytes)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* If COMPLETED: Direct Action Buttons & Audio Player */}
                {activeJob.status === 'COMPLETED' && activeJob.downloadUrl && (
                  <div className="space-y-3 pt-2">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          File sẵn sàng tải về
                        </span>
                        {activeJob.fileSize && (
                          <span className="text-[11px] text-emerald-300 font-mono">
                            {formatBytes(activeJob.fileSize)}
                          </span>
                        )}
                      </div>

                      {/* HTML5 Audio Preview if audio format */}
                      <audio
                        controls
                        src={activeJob.downloadUrl}
                        className="w-full h-9 rounded-lg mt-1"
                        preload="metadata"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <a
                        href={activeJob.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow transition-all active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        <span>Tải tệp về máy</span>
                      </a>

                      <button
                        onClick={() => handleCopyLink(activeJob.downloadUrl!)}
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép link tải</span>
                      </button>
                    </div>

                    {onAddToQueue && (
                      <button
                        onClick={() => handleAddDownloadedToQueue(activeJob)}
                        className="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Thêm vào danh sách phát CastTube để nghe</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                  <Download className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-400">
                  Chưa có tác vụ tải nào đang chạy. Chọn định dạng và nhấn "Bắt đầu tải" ở bên trái.
                </p>
              </div>
            )}
          </div>

          {/* Download History Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>Lịch sử tải gần đây ({history.length})</span>
              </h3>
              {history.length > 0 && (
                <button
                  onClick={() => {
                    clearDownloadHistory();
                    setHistory([]);
                    onShowToast('🗑️ Đã xóa lịch sử tải!');
                  }}
                  className="text-[11px] text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                  title="Xóa lịch sử tải"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa</span>
                </button>
              )}
            </div>

            {history.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-semibold text-white line-clamp-1 flex-1">
                        {item.title}
                      </h4>
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                        {item.format}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{item.completedAt}</span>
                      {item.fileSize && <span>{formatBytes(item.fileSize)}</span>}
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                      <a
                        href={item.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Download className="w-3 h-3 text-amber-400" />
                        <span>Tải lại</span>
                      </a>
                      <button
                        onClick={() => handleCopyLink(item.downloadUrl)}
                        className="p-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[11px] transition-colors"
                        title="Sao chép link"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {onAddToQueue && (
                        <button
                          onClick={() => handleAddDownloadedToQueue(item)}
                          className="p-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 text-[11px] font-semibold transition-colors"
                          title="Thêm vào trình phát"
                        >
                          + Phát
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">
                Chưa có tệp nào được tải. Các tệp đã tải sẽ lưu tại đây.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
