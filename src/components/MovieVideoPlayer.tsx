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
} from 'lucide-react';
import { EpisodeData, MovieDetail } from '../types/movie';
import {
  AdSettings,
  WatermarkSettings,
  getStoredAdSettings,
  getStoredWatermarkSettings,
} from '../types/adConfig';
import { VideoAdOverlay } from './VideoAdOverlay';
import { WatermarkOverlay } from './WatermarkOverlay';
import { AdSettingsModal } from './AdSettingsModal';

interface MovieVideoPlayerProps {
  movie: MovieDetail;
  activeEpisode: EpisodeData | null;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  hasPrevEpisode?: boolean;
  hasNextEpisode?: boolean;
}

export const MovieVideoPlayer: React.FC<MovieVideoPlayerProps> = ({
  movie,
  activeEpisode,
  onPrevEpisode,
  onNextEpisode,
  hasPrevEpisode,
  hasNextEpisode,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Engine: 'hls' (Direct native/HLS video - best for phones) | 'embed' (Iframe embed)
  const [engine, setEngine] = useState<'hls' | 'embed'>('hls');
  const [hlsError, setHlsError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(false);

  // Ad & Watermark states
  const [adSettings, setAdSettings] = useState<AdSettings>(getStoredAdSettings);
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>(getStoredWatermarkSettings);
  const [isAdOpen, setIsAdOpen] = useState<boolean>(false);
  const [isAdSettingsModalOpen, setIsAdSettingsModalOpen] = useState<boolean>(false);

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

  // Reset countdown on episode change
  useEffect(() => {
    setNextCountdown(null);
  }, [activeEpisode?.slug]);

  // Next episode countdown timer
  useEffect(() => {
    if (nextCountdown === null) return;
    if (nextCountdown <= 0) {
      setNextCountdown(null);
      onNextEpisode?.();
      return;
    }
    const timer = setTimeout(() => {
      setNextCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [nextCountdown, onNextEpisode]);

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
  }, [hasNextEpisode, isAutoplayNext, onNextEpisode]);

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

  const handleOpenExternal = () => {
    const url = embedUrl || m3u8Url;
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
            title="Phát trực tiếp HLS m3u8 - Tối ưu 100% cho điện thoại iPhone & Android, không bị chặn"
          >
            <span>⚡ Trực Tiếp (m3u8 - ĐT Mượt)</span>
          </button>

          <button
            onClick={() => setEngine('embed')}
            disabled={!embedUrl}
            className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              engine === 'embed'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white disabled:opacity-40'
            }`}
            title="Phát dạng nhúng iframe"
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
            }}
            className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              isAutoplayNext
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm'
                : 'bg-slate-800/80 text-slate-400'
            }`}
            title="Tự động chuyển sang tập tiếp theo khi kết thúc tập hiện tại"
          >
            <Check className={`w-3.5 h-3.5 ${isAutoplayNext ? 'text-emerald-400' : 'opacity-30'}`} />
            <span>Tự Chuyển Tập</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Ad & Logo Settings Button */}
          <button
            onClick={() => setIsAdSettingsModalOpen(true)}
            className="px-3 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold transition-colors flex items-center gap-1.5"
            title="Cài đặt video quảng cáo và logo watermark"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span>Cài Đặt QC &amp; Logo</span>
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

      {/* VIDEO CONTAINER */}
      <div className="relative rounded-3xl overflow-hidden bg-black border border-slate-800 shadow-2xl group w-full aspect-video min-h-[220px] max-h-[80vh]">
        {/* Watermark Overlay */}
        <WatermarkOverlay settings={watermarkSettings} />

        {/* Video Ad Overlay */}
        {isAdOpen && (
          <VideoAdOverlay
            settings={adSettings}
            onAdFinished={() => setIsAdOpen(false)}
            onOpenSettings={() => setIsAdSettingsModalOpen(true)}
            targetMediaTitle={movie.name}
          />
        )}

        {/* Next Episode Auto Transition Overlay */}
        {nextCountdown !== null && (
          <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in select-none">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center text-2xl font-black mb-3 shadow-xl shadow-rose-600/30 animate-pulse">
              {nextCountdown}
            </div>
            <h4 className="text-base sm:text-lg font-black text-white">
              Đã Xem Hết Tập Hiện Tại!
            </h4>
            <p className="text-xs text-slate-300 mt-1 max-w-sm">
              Tự động chuyển tiếp sang tập tiếp theo sau <strong className="text-amber-400 font-mono text-sm">{nextCountdown}s</strong>...
            </p>
            <div className="flex items-center gap-2.5 mt-5">
              <button
                onClick={() => {
                  setNextCountdown(null);
                  onNextEpisode?.();
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-600/40 transition-all active:scale-95"
              >
                <span>Chuyển Tập Ngay</span>
                <FastForward className="w-4 h-4 fill-current" />
              </button>
              <button
                onClick={() => setNextCountdown(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Ở Lại Tập Này
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
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 pointer-events-none flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700 text-white text-xs font-bold shadow-lg">
            {movie.name}
          </span>
          {activeEpisode && (
            <span className="px-2.5 py-1 rounded-full bg-rose-600/90 text-white text-xs font-mono font-bold shadow-lg">
              {activeEpisode.name.startsWith('Tập') ? activeEpisode.name : `Tập ${activeEpisode.name}`}
            </span>
          )}
        </div>
      </div>

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
