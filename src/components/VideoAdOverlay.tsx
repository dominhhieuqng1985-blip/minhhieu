import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import {
  ExternalLink,
  FastForward,
  Volume2,
  VolumeX,
  Settings,
  Loader2,
} from 'lucide-react';
import { AdSettings } from '../types/adConfig';
import {
  ADCASH_INSTREAM_VAST_TAG_URL,
  ParsedVastAd,
  fetchAndParseVastAd,
  fireVastPixels,
} from '../utils/vastParser';

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
  // Priority 1: VAST In-Stream Video (12358098) -> Fallback Priority 2: Default Ad (settings.videoUrl)
  const [adMode, setAdMode] = useState<'checking_vast' | 'vast' | 'default'>('checking_vast');
  const [vastAd, setVastAd] = useState<ParsedVastAd | null>(null);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(settings.skipDelaySeconds || 5);
  const [canSkip, setCanSkip] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const redirectAnchorRef = useRef<HTMLAnchorElement>(null);

  // VAST quartile & impression tracking flags
  const firedStartRef = useRef<boolean>(false);
  const firedFirstQuartileRef = useRef<boolean>(false);
  const firedMidpointRef = useRef<boolean>(false);
  const firedThirdQuartileRef = useRef<boolean>(false);
  const firedCompleteRef = useRef<boolean>(false);

  // Step 1: Request VAST Tag (12358098) first; fallback to Default Ad if empty/unavailable
  useEffect(() => {
    let cancelled = false;

    firedStartRef.current = false;
    firedFirstQuartileRef.current = false;
    firedMidpointRef.current = false;
    firedThirdQuartileRef.current = false;
    firedCompleteRef.current = false;

    setAdMode('checking_vast');
    setVastAd(null);
    setCanSkip(false);

    fetchAndParseVastAd(ADCASH_INSTREAM_VAST_TAG_URL)
      .then((parsed) => {
        if (cancelled) return;
        if (parsed && parsed.mediaUrl) {
          const skipSec =
            parsed.skipOffsetSeconds !== null
              ? parsed.skipOffsetSeconds
              : settings.skipDelaySeconds ?? 5;
          setVastAd(parsed);
          setSecondsRemaining(skipSec);
          setCanSkip(skipSec <= 0);
          setAdMode('vast');
        } else {
          // No VAST ad fill -> Fallback to Default Ad
          const defaultSkip = settings.skipDelaySeconds ?? 5;
          setSecondsRemaining(defaultSkip);
          setCanSkip(defaultSkip <= 0);
          setAdMode('default');
        }
      })
      .catch(() => {
        if (cancelled) return;
        const defaultSkip = settings.skipDelaySeconds ?? 5;
        setSecondsRemaining(defaultSkip);
        setCanSkip(defaultSkip <= 0);
        setAdMode('default');
      });

    return () => {
      cancelled = true;
    };
  }, [targetMediaTitle, settings.videoUrl, settings.skipDelaySeconds]);

  const fallbackToDefaultAd = () => {
    if (vastAd?.errorUrls?.length) {
      fireVastPixels(vastAd.errorUrls, '405');
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    const defaultSkip = settings.skipDelaySeconds ?? 5;
    setVastAd(null);
    setSecondsRemaining(defaultSkip);
    setCanSkip(defaultSkip <= 0);
    setAdMode('default');
  };

  // Detect whether fallback default ad video is YouTube or direct HTML5 video
  const isDefaultYouTubeAd = Boolean(
    adMode === 'default' &&
      (settings.videoUrl.includes('youtube.com') || settings.videoUrl.includes('youtu.be'))
  );

  const getYouTubeEmbedUrl = (url: string) => {
    let videoId = '';
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    if (match) {
      videoId = match[1];
    } else {
      videoId = 'dQw4w9WgXcQ';
    }
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&modestbranding=1&rel=0&playsinline=1`;
  };

  // Countdown timer starts only once adMode is active ('vast' or 'default')
  useEffect(() => {
    if (adMode === 'checking_vast') return;

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
  }, [adMode]);

  // Attach & autoplay HTML5 / HLS video for VAST mode or non-YouTube Default mode
  useEffect(() => {
    if (adMode === 'checking_vast' || isDefaultYouTubeAd) return;

    const videoEl = videoRef.current;
    if (!videoEl) return;

    const activeMediaUrl = adMode === 'vast' && vastAd ? vastAd.mediaUrl : settings.videoUrl;
    if (!activeMediaUrl) {
      if (adMode === 'vast') fallbackToDefaultAd();
      return;
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHlsStream =
      activeMediaUrl.toLowerCase().includes('.m3u8') ||
      (adMode === 'vast' && vastAd?.mimeType.includes('mpegurl'));

    const attemptPlay = () => {
      videoEl.play().catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch(() => {
            if (adMode === 'vast') {
              fallbackToDefaultAd();
            }
          });
        }
      });
    };

    if (isHlsStream && !videoEl.canPlayType('application/vnd.apple.mpegurl') && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(activeMediaUrl);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        attemptPlay();
      });
      hls.on(Hls.Events.ERROR, (_ev, data) => {
        if (data.fatal) {
          hls.destroy();
          if (adMode === 'vast') {
            fallbackToDefaultAd();
          }
        }
      });
    } else {
      videoEl.src = activeMediaUrl;
      videoEl.load();
      attemptPlay();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [adMode, vastAd, isDefaultYouTubeAd, settings.videoUrl]);

  const handleVideoPlay = () => {
    if (adMode === 'vast' && vastAd && !firedStartRef.current) {
      firedStartRef.current = true;
      fireVastPixels(vastAd.impressionUrls);
      fireVastPixels(vastAd.trackingEvents.start);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (adMode !== 'vast' || !vastAd || !videoRef.current) return;
    const dur = videoRef.current.duration;
    const cur = videoRef.current.currentTime;
    if (!dur || dur <= 0 || Number.isNaN(dur)) return;

    const progress = cur / dur;
    if (progress >= 0.25 && !firedFirstQuartileRef.current) {
      firedFirstQuartileRef.current = true;
      fireVastPixels(vastAd.trackingEvents.firstQuartile);
    }
    if (progress >= 0.5 && !firedMidpointRef.current) {
      firedMidpointRef.current = true;
      fireVastPixels(vastAd.trackingEvents.midpoint);
    }
    if (progress >= 0.75 && !firedThirdQuartileRef.current) {
      firedThirdQuartileRef.current = true;
      fireVastPixels(vastAd.trackingEvents.thirdQuartile);
    }
  };

  const handleVideoEnded = () => {
    if (adMode === 'vast' && vastAd && !firedCompleteRef.current) {
      firedCompleteRef.current = true;
      fireVastPixels(vastAd.trackingEvents.complete);
    }
    onAdFinished();
  };

  const handleVideoError = () => {
    if (adMode === 'vast') {
      fallbackToDefaultAd();
    } else {
      onAdFinished();
    }
  };

  const handleSkip = () => {
    if (!canSkip) return;
    if (adMode === 'vast' && vastAd) {
      fireVastPixels(vastAd.trackingEvents.skip);
    }
    onAdFinished();
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
    setIsMuted(nextMuted);

    if (adMode === 'vast' && vastAd) {
      fireVastPixels(
        nextMuted ? vastAd.trackingEvents.mute : vastAd.trackingEvents.unmute
      );
    }
  };

  const activeTitle =
    adMode === 'vast' && vastAd?.adTitle
      ? vastAd.adTitle
      : settings.adTitle || 'Nhà tài trợ kênh Minh Hiếu TuBe';

  const activeRedirectUrl =
    adMode === 'vast' && vastAd?.clickThroughUrl
      ? vastAd.clickThroughUrl
      : settings.redirectUrl;

  const handleAdClick = () => {
    if (adMode === 'vast' && vastAd?.clickTrackingUrls?.length) {
      fireVastPixels(vastAd.clickTrackingUrls);
    }
    if (activeRedirectUrl && redirectAnchorRef.current) {
      redirectAnchorRef.current.click();
    }
  };

  return (
    <div className="absolute inset-0 z-30 bg-black flex flex-col justify-between overflow-hidden animate-in fade-in select-none">
      {/* Hidden safe external link anchor (avoids window.open popup blocking) */}
      {activeRedirectUrl && (
        <a
          ref={redirectAnchorRef}
          href={activeRedirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden"
        >
          Mở liên kết tài trợ
        </a>
      )}

      {/* Video Content */}
      <div className="absolute inset-0 w-full h-full">
        {adMode === 'checking_vast' ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black text-slate-300 gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
            <span className="text-xs font-medium text-slate-400">Đang tải quảng cáo...</span>
          </div>
        ) : isDefaultYouTubeAd ? (
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
            playsInline
            autoPlay
            muted={isMuted}
            onPlay={handleVideoPlay}
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleVideoEnded}
            onError={handleVideoError}
            className="w-full h-full object-cover sm:object-contain bg-black cursor-pointer"
            onClick={handleAdClick}
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
            {activeTitle}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {adMode !== 'checking_vast' && !isDefaultYouTubeAd && (
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
      {adMode !== 'checking_vast' && (
        <div className="relative z-40 p-3 sm:p-5 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-wrap items-center justify-between gap-3 text-white">
          {/* Destination link card */}
          {activeRedirectUrl ? (
            <a
              href={activeRedirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                if (adMode === 'vast' && vastAd?.clickTrackingUrls?.length) {
                  fireVastPixels(vastAd.clickTrackingUrls);
                }
              }}
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
                  {activeRedirectUrl}
                </p>
              </div>
            </a>
          ) : (
            <div />
          )}

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
                  Có thể bỏ qua sau{' '}
                  <strong className="text-amber-400 font-mono text-sm">{secondsRemaining}s</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
