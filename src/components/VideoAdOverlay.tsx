import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import {
  ExternalLink,
  SkipForward,
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

interface PreAdCountdownNoticeProps {
  secondsRemaining: number | null;
  totalSeconds?: number;
}

/**
 * Sleek YouTube-style pre-ad countdown notice shown in the bottom-right corner
 * of the main video player right before a Mid-roll, Random-roll, or Post-roll ad starts.
 */
export const PreAdCountdownNotice: React.FC<PreAdCountdownNoticeProps> = ({
  secondsRemaining,
  totalSeconds = 5,
}) => {
  if (secondsRemaining === null || secondsRemaining <= 0) return null;
  const pct = Math.max(0, Math.min(100, (secondsRemaining / Math.max(1, totalSeconds)) * 100));

  return (
    <div className="absolute right-3 sm:right-4 bottom-12 sm:bottom-14 z-25 pointer-events-none select-none animate-in fade-in duration-200">
      <div className="relative overflow-hidden bg-black/75 backdrop-blur-sm px-3 py-1.5 rounded text-[11px] sm:text-xs font-normal text-white/90 tracking-wide whitespace-nowrap shadow-lg">
        <span className="tabular-nums">
          Quảng cáo sắp bắt đầu sau <span className="font-medium text-white">{secondsRemaining}s</span>
        </span>
        <div
          className="absolute bottom-0 left-0 h-[1.5px] bg-white/75 transition-all duration-700 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

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

  const [secondsRemaining, setSecondsRemaining] = useState<number>(settings.skipDelaySeconds ?? 5);
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
      videoId = 'Co2OgH2FGr0';
    }
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`;
  };

  // Countdown timer starts once adMode is active ('vast' or 'default')
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
            <Loader2 className="w-6 h-6 animate-spin text-white/70" />
            <span className="text-xs font-normal text-white/60">Đang tải quảng cáo...</span>
          </div>
        ) : isDefaultYouTubeAd ? (
          <div className="w-full h-full cursor-pointer" onClick={handleAdClick}>
            <iframe
              src={getYouTubeEmbedUrl(settings.videoUrl)}
              title="Quảng cáo tài trợ"
              className="w-full h-full border-0 pointer-events-none scale-105"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
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

      {/* Top Subtle Info Bar (YouTube minimalist style - no yellow badges) */}
      <div className="relative z-40 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-b from-black/75 via-black/25 to-transparent flex items-center justify-between gap-3 text-white pointer-events-none">
        <div className="flex items-center gap-1.5 min-w-0 text-[11px] text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          <span className="font-medium text-white/90 shrink-0">Quảng cáo</span>
          <span className="text-white/40 shrink-0">·</span>
          <span className="truncate max-w-[200px] sm:max-w-sm text-white/75">{activeTitle}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pointer-events-auto">
          {adMode !== 'checking_vast' && !isDefaultYouTubeAd && (
            <button
              type="button"
              onClick={handleToggleMute}
              className="p-1.5 text-white/80 hover:text-white transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
              title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}

          {onOpenSettings && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSettings();
              }}
              className="p-1.5 text-white/70 hover:text-white transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
              title="Cài đặt quảng cáo"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom YouTube-Style Minimalist Bar: Quiet sponsor link on left, unboxed small "Bỏ qua >|" on right */}
      {adMode !== 'checking_vast' && (
        <div className="relative z-40 px-3.5 py-3 sm:px-5 sm:py-4 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex items-end justify-between gap-4 text-white">
          {/* Minimal Destination Link */}
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
              className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-normal text-white/80 hover:text-white transition-colors truncate max-w-[190px] sm:max-w-xs drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
            >
              <span className="truncate">Truy cập trang tài trợ</span>
              <ExternalLink className="w-3 h-3 shrink-0 opacity-85" />
            </a>
          ) : (
            <div />
          )}

          {/* YouTube-Style Clean Unboxed Skip Control (Small text, no yellow, no button box) */}
          <div className="flex items-center shrink-0">
            {canSkip ? (
              <button
                type="button"
                onClick={handleSkip}
                className="group inline-flex items-center gap-1.5 bg-transparent border-0 p-1 text-xs sm:text-[13px] font-medium text-white/90 hover:text-white tracking-wide cursor-pointer transition-opacity whitespace-nowrap drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]"
              >
                <span>Bỏ qua</span>
                <SkipForward className="w-3.5 h-3.5 fill-current opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <span className="p-1 text-[11px] sm:text-xs font-normal text-white/80 tabular-nums tracking-wide whitespace-nowrap drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                Có thể bỏ qua sau {secondsRemaining}s
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
