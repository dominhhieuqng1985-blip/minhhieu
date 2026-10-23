import React, { useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  FastForward,
  Volume2,
  VolumeX,
  Settings,
  Info,
  Play,
  RotateCcw,
} from 'lucide-react';
import { AdSettings } from '../types/adConfig';

interface VideoAdOverlayProps {
  settings: AdSettings;
  onAdFinished: () => void;
  onOpenSettings?: () => void;
  targetMediaTitle?: string;
}

export const VideoAdOverlay: React.FC<VideoAdOverlayProps> = ({
  settings,
  onAdFinished,
  onOpenSettings,
  targetMediaTitle,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(settings.skipDelaySeconds || 5);
  const [canSkip, setCanSkip] = useState<boolean>(settings.skipDelaySeconds <= 0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Detect whether ad video is YouTube or direct HTML5 video
  const isYouTubeAd = Boolean(
    settings.videoUrl.includes('youtube.com') || settings.videoUrl.includes('youtu.be')
  );

  const getYouTubeEmbedUrl = (url: string) => {
    let videoId = '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match) {
      videoId = match[1];
    } else {
      videoId = 'dQw4w9WgXcQ';
    }
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&modestbranding=1&rel=0&playsinline=1`;
  };

  // Countdown timer for skipping
  useEffect(() => {
    setSecondsRemaining(settings.skipDelaySeconds || 5);
    setCanSkip((settings.skipDelaySeconds || 5) <= 0);

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [settings.skipDelaySeconds]);

  // Attempt autoplay for HTML5 video
  useEffect(() => {
    if (!isYouTubeAd && videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn('Ad autoplay without user interaction might be muted:', err);
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch(() => {});
        }
      });
    }
  }, [isYouTubeAd, settings.videoUrl]);

  const handleSkip = () => {
    if (canSkip) {
      onAdFinished();
    }
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  const handleClickRedirect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (settings.redirectUrl) {
      window.open(settings.redirectUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="absolute inset-0 z-30 bg-black flex flex-col justify-between overflow-hidden animate-in fade-in select-none">
      {/* Video Content */}
      <div className="absolute inset-0 w-full h-full">
        {isYouTubeAd ? (
          <iframe
            src={getYouTubeEmbedUrl(settings.videoUrl)}
            title="Quảng cáo tài trợ"
            className="w-full h-full border-0 pointer-events-none scale-105"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            src={settings.videoUrl}
            playsInline
            autoPlay
            muted={isMuted}
            onEnded={onAdFinished}
            className="w-full h-full object-cover sm:object-contain bg-black cursor-pointer"
            onClick={handleClickRedirect}
          />
        )}
      </div>

      {/* Top Header Bar */}
      <div className="relative z-40 p-3 sm:p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="px-2 py-0.5 rounded bg-yellow-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
            Quảng Cáo
          </span>
          <span className="text-xs sm:text-sm font-bold truncate max-w-xs sm:max-w-md drop-shadow">
            {settings.adTitle || 'Nhà tài trợ kênh Minh Hiếu TuBe'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isYouTubeAd && (
            <button
              onClick={handleToggleMute}
              className="p-1.5 sm:p-2 rounded-lg bg-black/60 hover:bg-black/90 border border-white/20 text-white text-xs transition-colors"
              title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}

          {onOpenSettings && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSettings();
              }}
              className="p-1.5 sm:p-2 rounded-lg bg-black/60 hover:bg-black/90 border border-white/20 text-white text-xs flex items-center gap-1 transition-colors"
              title="Cài đặt liên kết quảng cáo & logo"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] hidden sm:inline">Cài Đặt QC</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Action Area: Landing link button & Skip countdown button */}
      <div className="relative z-40 p-3 sm:p-5 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-wrap items-center justify-between gap-3 text-white">
        {/* Destination link card */}
        <div
          onClick={handleClickRedirect}
          className="flex items-center gap-2 sm:gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 px-3.5 py-2 rounded-xl cursor-pointer transition-all active:scale-95 group shadow-lg"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center text-white shrink-0 font-bold">
            <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-left min-w-0 max-w-[180px] sm:max-w-xs">
            <p className="text-[11px] text-amber-300 font-bold leading-tight flex items-center gap-1">
              <span>Tìm hiểu thêm</span>
              <ExternalLink className="w-3 h-3 inline" />
            </p>
            <p className="text-[10px] text-slate-300 truncate mt-0.5">
              {settings.redirectUrl || 'Bấm để truy cập liên kết'}
            </p>
          </div>
        </div>

        {/* Skip Countdown / Skip Button */}
        <div className="flex items-center gap-2">
          {canSkip ? (
            <button
              onClick={handleSkip}
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-amber-500/30 transition-all active:scale-95 animate-pulse"
            >
              <span>Bỏ Qua Quảng Cáo</span>
              <FastForward className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <div className="px-4 py-2 rounded-xl bg-black/80 border border-white/20 text-white text-xs font-semibold flex items-center gap-2 shadow-md">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>
                Có thể bỏ qua sau <strong className="text-amber-400 font-mono text-sm">{secondsRemaining}s</strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
