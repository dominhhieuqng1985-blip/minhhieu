import React, { useEffect, useId, useRef, useState } from 'react';
import { ExternalLink, Play, Volume2, VolumeX, X } from 'lucide-react';
import {
  AdSettings,
  WatermarkSettings,
  getStoredAdSettings,
  getStoredWatermarkSettings,
  AD_SETTINGS_UPDATED_EVENT,
} from '../types/adConfig';

export const ADCASH_LEADERBOARD_728X90_ZONE_ID = '12358102';
export const ADCASH_SKYSCRAPER_160X600_ZONE_ID = '12358110';
export const ADCASH_VIDEO_SLIDER_ZONE_ID = '12358158';

const ADCASH_LIB_URL = 'https://acscdn.com/script/aclib.js';

declare global {
  interface Window {
    aclib?: {
      runBanner?: (options: {
        zoneId: string;
        renderIn?: string;
        width?: number;
        height?: number;
      }) => void;
      runVideoSlider?: (options: {
        zoneId: string;
      }) => void;
    };
    __ADCASH_VIDEO_SLIDER_ZONES__?: Record<string, boolean>;
  }
}

export type AdcashBannerFormat = '728x90' | '160x600';

interface AdcashBannerProps {
  zoneId: string;
  format?: AdcashBannerFormat;
  className?: string;
}

function ensureAdcashLibrary(): HTMLScriptElement | null {
  if (typeof document === 'undefined') return null;
  let scriptEl = document.getElementById('aclib') as HTMLScriptElement | null;
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = 'aclib';
    scriptEl.type = 'text/javascript';
    scriptEl.src = ADCASH_LIB_URL;
    scriptEl.async = true;
    document.head.insertBefore(scriptEl, document.head.firstChild);
  }
  return scriptEl;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? match[1] : null;
}

function resolveBannerImage(adSettings: AdSettings): string {
  if (adSettings.bannerImageUrl && adSettings.bannerImageUrl.trim()) {
    return adSettings.bannerImageUrl.trim();
  }
  const ytId = extractYouTubeId(adSettings.videoUrl);
  if (ytId) {
    return `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
  }
  return 'https://i.ytimg.com/vi/Co2OgH2FGr0/hqdefault.jpg';
}

function checkNodeHasRenderedAd(el: HTMLElement | null): boolean {
  if (!el) return false;
  if (el.offsetHeight > 20) return true;
  const mediaChild = el.querySelector('iframe, img, ins, canvas, video, a');
  if (mediaChild) {
    const rect = mediaChild.getBoundingClientRect();
    if (rect.height > 16 || rect.width > 40) return true;
  }
  return false;
}

/**
 * Adcash Display Banner Component with Pre-Configured Sponsor Fallback
 * Priority 1: Adcash Live Network (`728x90` Zone 12358102 / `160x600` Zone 12358110)
 * Priority 2: Pre-configured Sponsor Display Banner (from AdSettings) whenever Adcash returns 204 No-Fill
 */
export const AdcashBanner: React.FC<AdcashBannerProps> = ({
  zoneId,
  format = '728x90',
  className = '',
}) => {
  const reactId = useId();
  const safeUid = reactId.replace(/[^a-zA-Z0-9_-]/g, '');
  const containerId = `adcash-zone-${zoneId}-${safeUid}`;
  const bannerWrapperRef = useRef<HTMLDivElement>(null);

  const [hasExternalFill, setHasExternalFill] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [thumbFailed, setThumbFailed] = useState<boolean>(false);
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);

  const [adSettings, setAdSettings] = useState<AdSettings>(getStoredAdSettings);
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>(
    getStoredWatermarkSettings
  );

  // Sync live with AdSettingsModal updates
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail?.adSettings) {
        setAdSettings(customEv.detail.adSettings);
        setThumbFailed(false);
      } else {
        setAdSettings(getStoredAdSettings());
      }
      if (customEv.detail?.watermarkSettings) {
        setWatermarkSettings(customEv.detail.watermarkSettings);
        setAvatarFailed(false);
      } else {
        setWatermarkSettings(getStoredWatermarkSettings());
      }
    };

    window.addEventListener(AD_SETTINGS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(AD_SETTINGS_UPDATED_EVENT, handleUpdate);
  }, []);

  // Mount Adcash zone and observe whether an external creative actually renders
  useEffect(() => {
    const container = bannerWrapperRef.current;
    if (!container) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const aclibScript = ensureAdcashLibrary();

    const inspectFill = () => {
      if (cancelled || !bannerWrapperRef.current) return;
      if (checkNodeHasRenderedAd(bannerWrapperRef.current)) {
        setHasExternalFill(true);
      }
    };

    const observer = new MutationObserver(() => {
      inspectFill();
    });
    observer.observe(container, { childList: true, subtree: true, attributes: true });

    const mountBanner = (): boolean => {
      if (cancelled || !bannerWrapperRef.current) return false;
      if (typeof window.aclib === 'undefined' || typeof window.aclib.runBanner !== 'function') {
        return false;
      }

      if (bannerWrapperRef.current.dataset.adcashInitialized === zoneId) {
        inspectFill();
        return true;
      }

      bannerWrapperRef.current.dataset.adcashInitialized = zoneId;
      bannerWrapperRef.current.innerHTML = '';

      try {
        window.aclib.runBanner({
          zoneId,
          renderIn: `#${containerId}`,
        });
        setTimeout(inspectFill, 900);
        setTimeout(inspectFill, 2500);
        return true;
      } catch {
        bannerWrapperRef.current.dataset.adcashInitialized = '';
        return false;
      }
    };

    const mountDirectFallbackScript = () => {
      if (cancelled || !bannerWrapperRef.current) return;
      if (bannerWrapperRef.current.dataset.adcashInitialized === zoneId) return;

      bannerWrapperRef.current.dataset.adcashInitialized = zoneId;
      bannerWrapperRef.current.innerHTML = '';

      const fallbackScript = document.createElement('script');
      fallbackScript.type = 'text/javascript';
      fallbackScript.async = true;
      fallbackScript.src = `https://acscdn.com/script/banner.js?r=${encodeURIComponent(
        zoneId
      )}&ri=${encodeURIComponent(`#${containerId}`)}`;
      fallbackScript.onload = () => {
        setTimeout(inspectFill, 900);
      };
      bannerWrapperRef.current.appendChild(fallbackScript);
    };

    const onScriptLoad = () => {
      if (mountBanner() && pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    if (!mountBanner()) {
      aclibScript?.addEventListener('load', onScriptLoad);
      let retries = 0;
      pollTimer = setInterval(() => {
        retries += 1;
        if (mountBanner()) {
          if (pollTimer) clearInterval(pollTimer);
          pollTimer = null;
        } else if (retries >= 16) {
          if (pollTimer) clearInterval(pollTimer);
          pollTimer = null;
          mountDirectFallbackScript();
        }
      }, 250);
    }

    return () => {
      cancelled = true;
      observer.disconnect();
      aclibScript?.removeEventListener('load', onScriptLoad);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [zoneId, containerId]);

  const showFallbackBanner =
    !hasExternalFill &&
    !isDismissed &&
    adSettings.enabled &&
    adSettings.enableBannerFallback !== false;

  const bannerImage = resolveBannerImage(adSettings);
  const targetHref =
    adSettings.redirectUrl ||
    watermarkSettings.targetUrl ||
    'https://www.youtube.com/@minhhieureviewphim?sub_confirmation=1';
  const sponsorTitle =
    adSettings.adTitle ||
    'Xuyên Không Về Đại Đường Kích Hoạt Hệ Thống Chọc Tức Cày Điểm Ka - Minh Hiếu Review Phim';
  const logoAvatar = watermarkSettings.logoUrl;

  if (format === '160x600') {
    return (
      <div className={`w-[160px] mx-auto flex flex-col items-center justify-start ${className}`}>
        {/* Priority 1: Live Adcash Skyscraper Container */}
        <div
          id={containerId}
          ref={bannerWrapperRef}
          data-zone-id={zoneId}
          data-ad-format="160x600"
          className={`w-[160px] overflow-hidden ${hasExternalFill ? 'block' : 'h-0'}`}
        />

        {/* Priority 2: Pre-configured 160x600 Skyscraper Fallback when Adcash has no fill */}
        {showFallbackBanner && (
          <div className="relative w-[160px] h-[600px] rounded-xl overflow-hidden bg-slate-900 border border-slate-800/90 hover:border-slate-700 transition-colors flex flex-col justify-between select-none shadow-lg group">
            {/* Top Ad Tag & Close */}
            <div className="px-2.5 py-1.5 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span className="tracking-wide">Quảng cáo</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDismissed(true);
                }}
                className="p-0.5 text-slate-500 hover:text-white transition-colors"
                title="Đóng quảng cáo"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Clickable Skyscraper Body */}
            <a
              href={targetHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex flex-col justify-between overflow-hidden"
            >
              {/* Visual Preview */}
              <div className="relative w-full h-44 bg-slate-950 overflow-hidden shrink-0">
                {!thumbFailed ? (
                  <img
                    src={bannerImage}
                    alt={sponsorTitle}
                    referrerPolicy="no-referrer"
                    onError={() => setThumbFailed(true)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex items-center justify-center">
                    <Play className="w-8 h-8 text-white/60" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center gap-2">
                  {logoAvatar && !avatarFailed ? (
                    <img
                      src={logoAvatar}
                      alt="Logo"
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarFailed(true)}
                      className="w-8 h-8 rounded-full object-cover border border-white/30 shrink-0 shadow"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      MH
                    </div>
                  )}
                  <span className="text-[10px] font-semibold text-white/90 leading-tight line-clamp-2 drop-shadow">
                    Minh Hiếu Review Phim
                  </span>
                </div>
              </div>

              {/* Copy Section */}
              <div className="p-3 flex-1 flex flex-col justify-between gap-3">
                <div className="space-y-2.5">
                  <p className="text-xs font-bold text-slate-100 leading-snug line-clamp-5 group-hover:text-white transition-colors">
                    {sponsorTitle}
                  </p>
                  <div className="h-px bg-slate-800" />
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-4">
                    Khám phá trọn bộ truyện audio, review phim đặc sắc và podcast mới nhất cập nhật mỗi ngày.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] text-slate-500 truncate font-mono">
                    youtube.com/@minhhieureviewphim
                  </div>
                  <div className="w-full py-2 px-2.5 rounded-lg bg-white/10 group-hover:bg-red-600 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap">
                    <span>Xem Ngay</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </div>
                </div>
              </div>
            </a>
          </div>
        )}
      </div>
    );
  }

  // Format: 728x90 Leaderboard
  return (
    <div className={`w-full flex flex-col items-center justify-center ${className}`}>
      {/* Priority 1: Live Adcash Leaderboard Container */}
      <div
        id={containerId}
        ref={bannerWrapperRef}
        data-zone-id={zoneId}
        data-ad-format="728x90"
        className={`w-full max-w-[728px] mx-auto overflow-hidden ${hasExternalFill ? 'block' : 'h-0'}`}
      />

      {/* Priority 2: Pre-configured 728x90 Leaderboard Fallback when Adcash has no fill */}
      {showFallbackBanner && (
        <div className="relative w-full max-w-[728px] min-h-[78px] sm:h-[90px] mx-auto rounded-xl overflow-hidden bg-slate-900 border border-slate-800/90 hover:border-slate-700 transition-colors flex items-stretch shadow-md group select-none">
          {/* Dismiss X in top-right corner */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDismissed(true);
            }}
            className="absolute top-1.5 right-1.5 z-20 p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Đóng quảng cáo"
          >
            <X className="w-3 h-3" />
          </button>

          <a
            href={targetHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-between gap-3 sm:gap-4 pr-7 sm:pr-8 overflow-hidden"
          >
            {/* Left Thumbnail */}
            <div className="relative w-28 sm:w-40 h-full min-h-[78px] sm:min-h-[90px] bg-slate-950 shrink-0 overflow-hidden">
              {!thumbFailed ? (
                <img
                  src={bannerImage}
                  alt={sponsorTitle}
                  referrerPolicy="no-referrer"
                  onError={() => setThumbFailed(true)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
                  <Play className="w-6 h-6 text-white/60" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                <div className="w-7 h-7 rounded-full bg-black/65 backdrop-blur-sm flex items-center justify-center text-white group-hover:bg-red-600 transition-colors">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>
              </div>
            </div>

            {/* Center Sponsor Copy */}
            <div className="flex-1 min-w-0 py-2 flex flex-col justify-center gap-1">
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="font-medium text-slate-300">Quảng cáo</span>
                <span>·</span>
                <span className="truncate">Minh Hiếu Review Phim &amp; Podcast</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-100 truncate group-hover:text-white transition-colors">
                {sponsorTitle}
              </p>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                Nghe trọn bộ thuyết minh chất lượng cao &amp; đăng ký kênh nhận tập mới mỗi ngày
              </p>
            </div>

            {/* Right Clean CTA */}
            <div className="shrink-0 hidden xs:flex sm:flex items-center">
              <span className="px-3 py-1.5 rounded-lg bg-white/10 group-hover:bg-red-600 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap">
                <span>Xem ngay</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </span>
            </div>
          </a>
        </div>
      )}
    </div>
  );
};

interface AdcashVideoSliderProps {
  zoneId?: string;
}

/**
 * Adcash Video Slider Component (Default Zone: 12358158)
 * Plays independently in its own floating bottom-right player with muted autoplay
 * and automatically disappears once playback finishes.
 * Falls back to pre-configured muted mini video slider if Adcash returns no-fill.
 */
export const AdcashVideoSlider: React.FC<AdcashVideoSliderProps> = ({
  zoneId = ADCASH_VIDEO_SLIDER_ZONE_ID,
}) => {
  const [showFallbackSlider, setShowFallbackSlider] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [adSettings, setAdSettings] = useState<AdSettings>(getStoredAdSettings);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail?.adSettings) {
        setAdSettings(customEv.detail.adSettings);
      } else {
        setAdSettings(getStoredAdSettings());
      }
    };
    window.addEventListener(AD_SETTINGS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(AD_SETTINGS_UPDATED_EVENT, handleUpdate);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.__ADCASH_VIDEO_SLIDER_ZONES__ = window.__ADCASH_VIDEO_SLIDER_ZONES__ || {};

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const aclibScript = ensureAdcashLibrary();

    const startSlider = (): boolean => {
      if (cancelled) return false;
      window.__ADCASH_VIDEO_SLIDER_ZONES__ = window.__ADCASH_VIDEO_SLIDER_ZONES__ || {};
      if (window.__ADCASH_VIDEO_SLIDER_ZONES__[zoneId]) {
        return true;
      }
      if (
        typeof window.aclib === 'undefined' ||
        typeof window.aclib.runVideoSlider !== 'function'
      ) {
        return false;
      }

      try {
        window.__ADCASH_VIDEO_SLIDER_ZONES__[zoneId] = true;
        window.aclib.runVideoSlider({ zoneId });
        return true;
      } catch {
        window.__ADCASH_VIDEO_SLIDER_ZONES__[zoneId] = false;
        return false;
      }
    };

    const onScriptLoad = () => {
      if (startSlider() && pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    if (!startSlider()) {
      aclibScript?.addEventListener('load', onScriptLoad);
      let retries = 0;
      pollTimer = setInterval(() => {
        retries += 1;
        if (startSlider() || retries >= 20) {
          if (pollTimer) clearInterval(pollTimer);
          pollTimer = null;
        }
      }, 250);
    }

    // Check after 4s if Adcash actually mounted a floating video slider in body;
    // if not, show the pre-configured muted mini slider once per session for 35s
    const fallbackTimer = setTimeout(() => {
      if (cancelled) return;
      try {
        if (sessionStorage.getItem('minhhieu_slider_shown') === '1') return;
        const hasExternalSlider = Boolean(
          document.querySelector('[id*="aclib"], iframe[src*="adexchange"], div[id*="slider"] video')
            ?.clientHeight
        );
        const currentCfg = getStoredAdSettings();
        if (!hasExternalSlider && currentCfg.enabled && currentCfg.enableBannerFallback !== false) {
          sessionStorage.setItem('minhhieu_slider_shown', '1');
          setShowFallbackSlider(true);
        }
      } catch {}
    }, 4000);

    return () => {
      cancelled = true;
      aclibScript?.removeEventListener('load', onScriptLoad);
      if (pollTimer) clearInterval(pollTimer);
      clearTimeout(fallbackTimer);
    };
  }, [zoneId]);

  // Auto-hide fallback video slider after 35s just like Adcash Video Slider disappears after playing
  useEffect(() => {
    if (!showFallbackSlider) return;
    const hideTimer = setTimeout(() => {
      setShowFallbackSlider(false);
    }, 35000);
    return () => clearTimeout(hideTimer);
  }, [showFallbackSlider]);

  if (!showFallbackSlider || !adSettings.enabled || adSettings.enableBannerFallback === false) {
    return null;
  }

  const ytId = extractYouTubeId(adSettings.videoUrl);
  const targetHref =
    adSettings.redirectUrl || 'https://www.youtube.com/@minhhieureviewphim?sub_confirmation=1';

  return (
    <div className="fixed bottom-4 right-4 z-40 w-64 sm:w-72 aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 shadow-2xl animate-in slide-in-from-bottom-4 fade-in select-none">
      {ytId ? (
        <a
          href={targetHref}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full h-full"
        >
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&modestbranding=1&rel=0&playsinline=1`}
            title="Video quảng cáo góc phải"
            className="w-full h-full border-0 pointer-events-none scale-105"
            allow="autoplay; encrypted-media"
          />
        </a>
      ) : (
        <video
          src={adSettings.videoUrl}
          autoPlay
          muted={isMuted}
          playsInline
          onEnded={() => setShowFallbackSlider(false)}
          onError={() => setShowFallbackSlider(false)}
          onClick={() => {
            const a = document.createElement('a');
            a.href = targetHref;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.click();
          }}
          className="w-full h-full object-cover cursor-pointer"
        />
      )}

      {/* Minimal Header Overlay */}
      <div className="absolute top-0 inset-x-0 px-2.5 py-1.5 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-[10px] text-white/85">
        <span className="truncate max-w-[160px]">Quảng cáo · {adSettings.adTitle || 'Tài trợ'}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            className="p-1 text-white/80 hover:text-white transition-colors"
            title={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setShowFallbackSlider(false)}
            className="p-1 text-white/80 hover:text-white transition-colors"
            title="Đóng"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
