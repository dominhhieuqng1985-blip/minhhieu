import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import {
  Film,
  Play,
  RotateCcw,
  ExternalLink,
  Settings,
  Sparkles,
  Maximize2,
  Tv,
  Smartphone,
  AlertCircle,
  Volume2,
  VolumeX,
  Check,
  FastForward,
  Copy,
  Share2,
  Download,
  Info,
  X,
  Radio,
} from 'lucide-react';
import { EpisodeData, MovieDetail } from '../types/movie';
import {
  AdSettings,
  WatermarkSettings,
  getStoredAdSettings,
  getStoredWatermarkSettings,
  fetchRemoteAdSettings,
  AD_SETTINGS_UPDATED_EVENT,
} from '../types/adConfig';
import { VideoAdOverlay } from './VideoAdOverlay';
import { WatermarkOverlay } from './WatermarkOverlay';
import { AdSettingsModal } from './AdSettingsModal';
import { useAdminAuth } from '../context/AdminAuthContext';

interface MovieVideoPlayerProps {
  movie: MovieDetail;
  activeEpisode: EpisodeData | null;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  hasPrevEpisode?: boolean;
  hasNextEpisode?: boolean;
  nextEpisodeName?: string;
  onShowToast?: (message: string) => void;
}

export const MovieVideoPlayer: React.FC<MovieVideoPlayerProps> = ({
  movie,
  activeEpisode,
  onPrevEpisode,
  onNextEpisode,
  hasPrevEpisode,
  hasNextEpisode,
  nextEpisodeName,
  onShowToast,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hasEndedTriggered = useRef<boolean>(false);

  // Engine: 'hls' (Direct native/HLS video stream - best for phones and VLC) | 'embed' (Iframe embed)
  const [engine, setEngine] = useState<'hls' | 'embed'>('hls');
  const [hlsError, setHlsError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(false);

  // Direct Link Modal & Copy Feedback
  const [isLinkModalOpen, setIsLinkModalOpen] = useState<boolean>(false);
  const [copiedType, setCopiedType] = useState<'m3u8' | 'embed' | 'vlc' | null>(null);

  // Ad & Watermark states
  const [adSettings, setAdSettings] = useState<AdSettings>(getStoredAdSettings);
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>(getStoredWatermarkSettings);
  const [isAdOpen, setIsAdOpen] = useState<boolean>(false);
  const [isAdSettingsModalOpen, setIsAdSettingsModalOpen] = useState<boolean>(false);
  const { requireAdmin } = useAdminAuth();

  const handleOpenAdSettings = () => {
    requireAdmin(
      () => setIsAdSettingsModalOpen(true),
      'Cài Đặt Quảng Cáo Rạp Phim & Logo',
      'Cấu hình quảng cáo video và logo rạp phim yêu cầu quyền Quản trị viên.'
    );
  };

  useEffect(() => {
    // Cross-device sync: fetch remote settings from server or public json on mount
    fetchRemoteAdSettings().then((remote) => {
      if (remote) {
        setAdSettings(remote.adSettings);
        setWatermarkSettings(remote.watermarkSettings);
      }
    });

    const handleUpdate = (e: any) => {
      if (e.detail?.adSettings) setAdSettings(e.detail.adSettings);
      if (e.detail?.watermarkSettings) setWatermarkSettings(e.detail.watermarkSettings);
    };

    window.addEventListener(AD_SETTINGS_UPDATED_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(AD_SETTINGS_UPDATED_EVENT, handleUpdate);
    };
  }, []);

  const m3u8Url = activeEpisode?.link_m3u8;
  const embedUrl = activeEpisode?.link_embed;

  // Auto-play Next Episode states (Default: true)
  const [isAutoplayNext, setIsAutoplayNext] = useState<boolean>(() => {
    try {
      return localStorage.getItem('minhhieu_movie_autoplay') !== 'false';
    } catch {
      return true;
    }
  });
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);

  const handleVideoEnded = () => {
    if (hasNextEpisode && isAutoplayNext && onNextEpisode) {
      setNextCountdown(3);
    }
  };

  // Reset countdown and ended trigger on episode change
  useEffect(() => {
    hasEndedTriggered.current = false;
    setNextCountdown(null);
  }, [activeEpisode?.slug]);

  // Next episode countdown timer
  useEffect(() => {
    if (nextCountdown === null) return;
    if (nextCountdown <= 0) {
      setNextCountdown(null);
      if (onNextEpisode) {
        onNextEpisode();
        if (onShowToast) {
          onShowToast(`Đang phát tập tiếp theo: ${nextEpisodeName || 'Tập mới'}`);
        }
      }
      return;
    }
    const timer = setTimeout(() => {
      setNextCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [nextCountdown, onNextEpisode, nextEpisodeName, onShowToast]);

  // Monitor video progress to trigger auto next episode reliably even on mobile
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    if (
      v.duration > 5 &&
      v.duration - v.currentTime <= 0.8 &&
      !hasEndedTriggered.current &&
      hasNextEpisode &&
      isAutoplayNext
    ) {
      hasEndedTriggered.current = true;
      handleVideoEnded();
    }
  };

  // Listen to postMessage from embed iframes for video ended events
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (
          d?.event === 'ended' ||
          d?.type === 'ended' ||
          d === 'ended' ||
          d?.event === 'onEnded' ||
          d?.name === 'ended'
        ) {
          handleVideoEnded();
        }
      } catch {}
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [hasNextEpisode, isAutoplayNext]);

  // Trigger ad when active episode or movie changes
  useEffect(() => {
    if (adSettings.enabled && adSettings.showInMovie) {
      setIsAdOpen(true);
    } else {
      setIsAdOpen(false);
    }
  }, [activeEpisode?.slug, movie.slug, adSettings.enabled, adSettings.showInMovie]);

  // HLS stream attachment
  useEffect(() => {
    if (engine !== 'hls' || !m3u8Url) return;

    const videoEl = videoRef.current;
    if (!videoEl) return;

    setHlsError(null);
    setIsVideoLoading(true);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // 1. Native HLS support (Safari on iOS & Mac)
    if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = m3u8Url;
      videoEl.load();
      videoEl.onloadedmetadata = () => {
        setIsVideoLoading(false);
        videoEl.play().catch(() => {});
      };
      videoEl.onerror = () => {
        setIsVideoLoading(false);
        setHlsError('Nguồn phát HLS không khả dụng trên trình duyệt này.');
      };
    } else if (Hls.isSupported()) {
      // 2. HLS.js for Android Chrome, Windows, Linux, Edge
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      hlsRef.current = hls;

      hls.loadSource(m3u8Url);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsVideoLoading(false);
        videoEl.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setHlsError('Không thể nạp luồng HLS trực tiếp. Đang chuyển sang chế độ Nhúng...');
              setEngine('embed');
              break;
          }
        }
      });
    } else {
      // Browser doesn't support HLS, fallback to iframe embed
      setEngine('embed');
      setIsVideoLoading(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [m3u8Url, engine]);

  const handleCopyLink = (url: string, type: 'm3u8' | 'embed' | 'vlc') => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
    const label =
      type === 'm3u8'
        ? 'Link phim trực tiếp (.m3u8)'
        : type === 'embed'
        ? 'Link nhúng iframe'
        : 'Link mở VLC';
    onShowToast?.(`📋 Đã sao chép ${label} vào clipboard!`);
  };

  const handleOpenExternal = () => {
    const url = m3u8Url || embedUrl;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="space-y-3">
      {/* Engine Switcher Bar & Fast Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Chế độ phát:</span>
          </span>

          <button
            onClick={() => setEngine('hls')}
            disabled={!m3u8Url}
            className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              engine === 'hls'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white disabled:opacity-40'
            }`}
            title="Phát trực tiếp HLS m3u8 - Tự động phát, chuyển tập mượt và không bị popup quảng cáo ngoài"
          >
            <span>⚡ Trực Tiếp (m3u8 - Không Nhúng)</span>
          </button>

          <button
            onClick={() => setEngine('embed')}
            disabled={!embedUrl}
            className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              engine === 'embed'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white disabled:opacity-40'
            }`}
            title="Phát dạng nhúng iframe từ máy chủ rạp phim"
          >
            <span>📺 Nhúng (Embed)</span>
          </button>

          {/* Autoplay Next Episode Toggle */}
          <button
            onClick={() => {
              const next = !isAutoplayNext;
              setIsAutoplayNext(next);
              try {
                localStorage.setItem('minhhieu_movie_autoplay', String(next));
              } catch {}
              onShowToast?.(next ? 'Đã BẬT tự động chuyển tập tiếp theo' : 'Đã TẮT tự động chuyển tập');
            }}
            className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              isAutoplayNext
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm'
                : 'bg-slate-800/80 text-slate-400'
            }`}
            title="Tự động chuyển sang tập tiếp theo khi kết thúc tập hiện tại"
          >
            <Check className={`w-3.5 h-3.5 ${isAutoplayNext ? 'text-emerald-400' : 'opacity-30'}`} />
            <span>Tự Động Chuyển Tập</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Direct Link Extractor Button */}
          <button
            onClick={() => setIsLinkModalOpen(true)}
            className="px-3 py-1 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Lấy link phim trực tiếp (.m3u8) để chạy trên VLC, PotPlayer hoặc player riêng"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Lấy Link Phim</span>
          </button>

          {/* Ad & Logo Settings Button */}
          <button
            onClick={handleOpenAdSettings}
            className="px-3 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold transition-colors flex items-center gap-1.5"
            title="Cài đặt video quảng cáo và logo watermark"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Cài Đặt QC</span>
          </button>

          {/* External Tab Link */}
          {(embedUrl || m3u8Url) && (
            <button
              onClick={handleOpenExternal}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
              title="Mở liên kết xem phim trong tab trình duyệt mới"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mở Tab Ngoài</span>
            </button>
          )}
        </div>
      </div>

      {/* VIDEO CONTAINER - Constrained on mobile (max-h-[35vh]) so it never covers the entire phone screen */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-black border border-slate-800 shadow-2xl group w-full aspect-video min-h-[190px] max-h-[35vh] sm:max-h-[75vh]">
        {/* Watermark Overlay */}
        <WatermarkOverlay settings={watermarkSettings} />

        {/* Video Ad Overlay */}
        {isAdOpen && (
          <VideoAdOverlay
            settings={adSettings}
            onAdFinished={() => setIsAdOpen(false)}
            onOpenSettings={handleOpenAdSettings}
            targetMediaTitle={movie.name}
          />
        )}

        {/* Next Episode Auto Transition Overlay */}
        {nextCountdown !== null && (
          <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-in fade-in select-none">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center text-xl sm:text-2xl font-black mb-2 sm:mb-3 shadow-xl shadow-rose-600/30 animate-pulse">
              {nextCountdown}
            </div>
            <h4 className="text-sm sm:text-lg font-black text-white">
              Đã Xem Hết Tập Này!
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-1 max-w-sm">
              Đang tự động chuyển tiếp sang tập kế tiếp sau <strong className="text-amber-400 font-mono text-xs sm:text-sm">{nextCountdown}s</strong>...
            </p>
            <div className="flex items-center gap-2 sm:gap-2.5 mt-3 sm:mt-5">
              <button
                onClick={() => {
                  setNextCountdown(null);
                  if (onNextEpisode) onNextEpisode();
                }}
                className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-600/40 transition-all active:scale-95"
              >
                <span>Chuyển Tập Ngay</span>
                <FastForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
              </button>
              <button
                onClick={() => setNextCountdown(null)}
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Ở Lại
              </button>
            </div>
          </div>
        )}

        {/* Player Body */}
        {engine === 'hls' && m3u8Url ? (
          <div className="w-full h-full relative bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              controls
              loop={false}
              playsInline
              webkit-playsinline="true"
              x5-playsinline="true"
              x5-video-player-type="h5"
              x5-video-player-fullscreen="true"
              className="w-full h-full object-contain"
              poster={movie.poster_url || movie.thumb_url}
              onEnded={handleVideoEnded}
              onTimeUpdate={handleTimeUpdate}
            />
            {isVideoLoading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Đang kết nối luồng phát m3u8...</span>
                </div>
              </div>
            )}
          </div>
        ) : embedUrl ? (
          <div className="w-full h-full relative bg-slate-950">
            <iframe
              src={embedUrl}
              title={`${movie.name} - ${activeEpisode?.name || 'Tập phim'}`}
              className="w-full h-full border-0 absolute inset-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-3">
            <Film className="w-12 h-12 text-slate-600" />
            <p className="text-sm font-semibold">Tập phim này chưa có nguồn phát hợp lệ.</p>
            <p className="text-xs text-slate-500">Vui lòng chọn tập khác hoặc nguồn máy chủ khác bên dưới.</p>
          </div>
        )}

        {/* Top Info Badge */}
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 pointer-events-none flex items-center gap-1.5 sm:gap-2">
          <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700 text-white text-[11px] sm:text-xs font-bold shadow-lg truncate max-w-[180px] sm:max-w-none">
            {movie.name}
          </span>
          {activeEpisode && (
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-rose-600/90 text-white text-[10px] sm:text-xs font-mono font-bold shadow-lg shrink-0">
              {activeEpisode.name.startsWith('Tập') ? activeEpisode.name : `Tập ${activeEpisode.name}`}
            </span>
          )}
        </div>
      </div>

      {/* QUICK MOBILE ACTION BAR: Specially placed directly underneath the video for instant tap on phones */}
      <div className="p-2 sm:p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] text-slate-400 font-semibold truncate">
            {activeEpisode ? `Đang phát: ${activeEpisode.name}` : 'Chưa chọn tập'}
          </span>
          {m3u8Url && (
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] border border-emerald-500/30">
              M3U8 Sẵn Sàng
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {m3u8Url && (
            <button
              onClick={() => handleCopyLink(m3u8Url, 'm3u8')}
              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95"
              title="Sao chép link m3u8 chạy player riêng"
            >
              {copiedType === 'm3u8' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedType === 'm3u8' ? 'Đã chép m3u8!' : 'Chép m3u8'}</span>
            </button>
          )}

          {embedUrl && (
            <button
              onClick={() => handleCopyLink(embedUrl, 'embed')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px] flex items-center gap-1 transition-all active:scale-95"
              title="Sao chép link embed iframe"
            >
              {copiedType === 'embed' ? <Check className="w-3 h-3 text-sky-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedType === 'embed' ? 'Đã chép Embed!' : 'Chép Embed'}</span>
            </button>
          )}

          <button
            onClick={() => setIsLinkModalOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95"
            title="Xem toàn bộ công cụ lấy link phim"
          >
            <Info className="w-3 h-3" />
            <span>Lấy Link Chi Tiết</span>
          </button>
        </div>
      </div>

      {/* MODAL: BỘ CÔNG CỤ LẤY LINK PHIM & CHẠY PLAYER RIÊNG */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-5 sm:p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsLinkModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Bộ Công Cụ Lấy Link Phim Rạp Chiếu
                </h3>
                <p className="text-xs text-slate-400">
                  {movie.name} · {activeEpisode?.name || 'Tập phim'}
                </p>
              </div>
            </div>

            {/* Link Options */}
            <div className="space-y-4 text-xs">
              {/* 1. M3U8 Direct Link */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    1. Link Luồng Trực Tiếp (.m3u8) - Chạy Player Riêng
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                    Khuyên dùng
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Đây là link video stream gốc từ máy chủ rạp phim. Dán vào <strong>VLC Player</strong>, <strong>PotPlayer</strong>, <strong>IINA (Mac)</strong>, <strong>MX Player (Android)</strong> để xem cực mượt, không có quảng cáo của bên thứ 3 và không bị hạn chế nhúng.
                </p>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2 font-mono text-[11px] text-slate-300 break-all select-all">
                  <span className="flex-1 truncate">{m3u8Url || 'Không có nguồn m3u8 cho tập này'}</span>
                  {m3u8Url && (
                    <button
                      onClick={() => handleCopyLink(m3u8Url, 'm3u8')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0 flex items-center gap-1 transition-all active:scale-95"
                    >
                      {copiedType === 'm3u8' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedType === 'm3u8' ? 'Đã Chép!' : 'Sao Chép'}</span>
                    </button>
                  )}
                </div>

                {m3u8Url && (
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <a
                      href={`vlc://${m3u8Url}`}
                      className="px-3 py-1.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-300 font-bold text-[11px] flex items-center gap-1.5 transition-all"
                    >
                      <span>Mở Trực Tiếp Bằng VLC</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={m3u8Url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] flex items-center gap-1.5 transition-all"
                    >
                      <span>Mở Tab Trình Duyệt</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* 2. Embed Link */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-sky-400 uppercase tracking-wider text-[11px]">
                  2. Link Nhúng (Embed Iframe)
                </span>
                <p className="text-slate-400 text-[11px]">
                  Dùng để nhúng phim vào blog, website cá nhân hoặc chạy trực tiếp bằng thẻ iframe:
                </p>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2 font-mono text-[11px] text-slate-300 break-all select-all">
                  <span className="flex-1 truncate">{embedUrl || 'Không có nguồn nhúng'}</span>
                  {embedUrl && (
                    <button
                      onClick={() => handleCopyLink(embedUrl, 'embed')}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold shrink-0 flex items-center gap-1 transition-all active:scale-95"
                    >
                      {copiedType === 'embed' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedType === 'embed' ? 'Đã Chép!' : 'Sao Chép'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ad & Watermark Settings Modal */}
      <AdSettingsModal
        isOpen={isAdSettingsModalOpen}
        onClose={() => setIsAdSettingsModalOpen(false)}
        adSettings={adSettings}
        watermarkSettings={watermarkSettings}
        onSaveAdSettings={(s) => setAdSettings(s)}
        onSaveWatermarkSettings={(w) => setWatermarkSettings(w)}
        onTriggerTestAd={() => setIsAdOpen(true)}
      />
    </div>
  );
};
