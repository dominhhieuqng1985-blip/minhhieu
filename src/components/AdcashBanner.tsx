import React, { Component, ErrorInfo, ReactNode, useEffect, useId, useRef, useState } from 'react';
import { ExternalLink, Play, Volume2, VolumeX, X } from 'lucide-react';
import {
  AdSettings,
  WatermarkSettings,
  DEFAULT_BANNER_300X250_SCRIPT,
  DEFAULT_BANNER_300X100_MOBILE_SCRIPT,
  getStoredAdSettings,
  getStoredWatermarkSettings,
  normalizeAdSettings,
  AD_SETTINGS_UPDATED_EVENT,
} from '../types/adConfig';

export const ADCASH_LEADERBOARD_728X90_ZONE_ID = '12358102';
export const ADCASH_SKYSCRAPER_160X600_ZONE_ID = '12358110';
export const ADCASH_VIDEO_SLIDER_ZONE_ID = '12358158';
export const ADCASH_RECTANGLE_336X280_ZONE_ID = '12358782';
export const ADCASH_RECTANGLE_300X250_ZONE_ID = '12358790';

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

export type AdcashBannerFormat = '728x90' | '160x600' | '336x280' | '300x250';

interface AdcashBannerProps {
  zoneId?: string;
  format?: AdcashBannerFormat;
  className?: string;
}

/**
 * Isolated Error Boundary for Third-Party Ad Slots
 * Guarantees that any error inside external ad scripts or custom HTML/JS tags
 * never propagates up or causes a white-screen crash on the main application.
 */
export class AdSlotErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('AdSlotErrorBoundary isolated third-party ad error:', error?.message, info);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

function normalizeAdSnippetProtocols(rawCode: string): string {
  if (!rawCode) return '';
  if (typeof window !== 'undefined' && window.location.protocol !== 'https:') {
    return rawCode
      .replace(/(["'])\\\/\\\/(fond-appointment\.com|troubled-entertainment\.com|acscdn\.com|youradexchange\.com)/gi, '$1https:\\/\\/$2')
      .replace(/(["'])\/\/(fond-appointment\.com|troubled-entertainment\.com|acscdn\.com|youradexchange\.com)/gi, '$1https://$2');
  }
  return rawCode;
}

/**
 * Universal safe script and HTML ad runner (Memoized)
 * Uses <template> + live DOM mounting in document.body so tags relying on
 * document.currentScript || document.scripts[document.scripts.length - 1] and
 * l.parentNode.insertBefore(s, l) (such as ylse 300x250 & alsq Video Slider) execute reliably.
 */
export const AdScriptRunner: React.FC<{
  code: string;
  className?: string;
  width?: string | number;
  height?: string | number;
}> = React.memo(({ code, className = '', width = '100%', height = 'auto' }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !code || !code.trim()) return;

    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'ad-script-inner w-full h-full flex items-center justify-center relative';
    container.appendChild(wrapper);

    try {
      const normalized = normalizeAdSnippetProtocols(code.trim());
      const hasHtmlTag = /<[a-z][\s\S]*>/i.test(normalized);

      if (!hasHtmlTag) {
        const scriptEl = document.createElement('script');
        scriptEl.type = 'text/javascript';
        scriptEl.text = normalized;
        wrapper.appendChild(scriptEl);
      } else {
        const tpl = document.createElement('template');
        tpl.innerHTML = normalized;

        const appendWithLiveScripts = (sourceParent: Node, targetParent: Node) => {
          Array.from(sourceParent.childNodes).forEach((node) => {
            if (node.nodeName.toUpperCase() === 'SCRIPT') {
              const oldScript = node as HTMLScriptElement;
              const liveScript = document.createElement('script');
              Array.from(oldScript.attributes).forEach((attr) => {
                let val = attr.value;
                if (
                  attr.name.toLowerCase() === 'src' &&
                  val.startsWith('//') &&
                  typeof window !== 'undefined' &&
                  window.location.protocol !== 'https:'
                ) {
                  val = `https:${val}`;
                }
                liveScript.setAttribute(attr.name, val);
              });
              if (oldScript.textContent) {
                liveScript.text = oldScript.textContent;
              }
              targetParent.appendChild(liveScript);
            } else {
              const cloned = node.cloneNode(false);
              targetParent.appendChild(cloned);
              if (node.childNodes && node.childNodes.length > 0) {
                appendWithLiveScripts(node, cloned);
              }
            }
          });
        };

        appendWithLiveScripts(tpl.content, wrapper);
      }
    } catch (e) {
      console.warn('AdScriptRunner execution notice:', e);
    }

    return () => {
      if (container) container.innerHTML = '';
    };
  }, [code]);

  return (
    <div
      ref={mountRef}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        minHeight: typeof height === 'number' ? `${height}px` : height,
      }}
      className={`ad-script-container overflow-hidden ${className}`}
    />
  );
});

/**
 * Standalone 300x250 Ad Slot (ylse / fond-appointment.com)
 * Runs 100% independently outside the YouTube player, fixed session lifecycle
 * (never reloads on YouTube currentTime ticks and NEVER renders any YouTube fallback card).
 */
export const StandaloneBanner300x250: React.FC<{
  className?: string;
  forceShow?: boolean;
  previewCode?: string;
}> = React.memo(({ className = '', forceShow = false, previewCode }) => {
  const [adSettings, setAdSettings] = useState<AdSettings>(getStoredAdSettings);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail?.adSettings) {
        setAdSettings(normalizeAdSettings(customEv.detail.adSettings));
      } else {
        setAdSettings(getStoredAdSettings());
      }
    };
    window.addEventListener(AD_SETTINGS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(AD_SETTINGS_UPDATED_EVENT, handleUpdate);
  }, []);

  const activeCode =
    typeof previewCode === 'string' && previewCode.trim()
      ? previewCode
      : adSettings.banner300x250Html && adSettings.banner300x250Html.trim()
      ? adSettings.banner300x250Html
      : DEFAULT_BANNER_300X250_SCRIPT;

  if (!forceShow && (!adSettings.enabled || adSettings.enableBanner300x250 === false || !activeCode.trim())) {
    return null;
  }

  return (
    <AdSlotErrorBoundary>
      <div className={`w-full max-w-[300px] mx-auto flex flex-col items-center justify-center ${className}`}>
        <div className="w-[300px] min-h-[250px] rounded-xl overflow-hidden bg-slate-950/85 border border-slate-800/80 shadow-lg flex flex-col items-center justify-center select-none">
          <div className="w-full px-2.5 py-1 bg-slate-950/95 border-b border-slate-800/70 flex items-center justify-between text-[10px] text-slate-400">
            <span className="font-semibold text-amber-400/90">Quảng cáo · 300×250</span>
            <span className="text-[9px] text-slate-500 font-mono">Sponsored</span>
          </div>
          <div className="w-[300px] min-h-[250px] flex items-center justify-center overflow-hidden bg-slate-900/40">
            <AdScriptRunner code={activeCode} width={300} height={250} />
          </div>
        </div>
      </div>
    </AdSlotErrorBoundary>
  );
});

/**
 * Standalone Mobile 300x100 MultiTag Ad Slot (ozrqy / fond-appointment.com)
 * Specially optimized and positioned for mobile viewports.
 * Seamless, responsive and safely isolated with AdSlotErrorBoundary.
 */
export const MobileBanner300x100: React.FC<{
  className?: string;
  forceShow?: boolean;
  previewCode?: string;
  showDismiss?: boolean;
}> = React.memo(({ className = '', forceShow = false, previewCode, showDismiss = false }) => {
  const [adSettings, setAdSettings] = useState<AdSettings>(getStoredAdSettings);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail?.adSettings) {
        setAdSettings(normalizeAdSettings(customEv.detail.adSettings));
      } else {
        setAdSettings(getStoredAdSettings());
      }
    };
    window.addEventListener(AD_SETTINGS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(AD_SETTINGS_UPDATED_EVENT, handleUpdate);
  }, []);

  if (isDismissed && !forceShow) return null;

  const activeCode =
    typeof previewCode === 'string' && previewCode.trim()
      ? previewCode
      : adSettings.banner300x100MobileHtml && adSettings.banner300x100MobileHtml.trim()
      ? adSettings.banner300x100MobileHtml
      : DEFAULT_BANNER_300X100_MOBILE_SCRIPT;

  if (!forceShow && (!adSettings.enabled || adSettings.enableBanner300x100Mobile === false || !activeCode.trim())) {
    return null;
  }

  return (
    <AdSlotErrorBoundary>
      <div className={`w-full max-w-[320px] mx-auto flex flex-col items-center justify-center my-2 ${className}`}>
        <div className="w-[300px] min-h-[100px] rounded-xl overflow-hidden bg-slate-950/90 border border-slate-800/80 shadow-lg flex flex-col items-center justify-center select-none relative">
          <div className="w-full px-2.5 py-0.5 bg-slate-950/95 border-b border-slate-800/70 flex items-center justify-between text-[10px] text-slate-400">
            <span className="font-semibold text-amber-400/90 flex items-center gap-1">
              <span>Quảng cáo · Mobile 300×100</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-slate-500 font-mono">Sponsored</span>
              {showDismiss && (
                <button
                  type="button"
                  onClick={() => setIsDismissed(true)}
                  className="p-0.5 text-slate-500 hover:text-white transition-colors"
                  title="Đóng quảng cáo"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div className="w-[300px] min-h-[100px] flex items-center justify-center overflow-hidden bg-slate-900/50">
            <AdScriptRunner code={activeCode} width={300} height={100} />
          </div>
        </div>
      </div>
    </AdSlotErrorBoundary>
  );
});

/**
 * Sticky Bottom Mobile Ad Banner (300x100)
 * Floats comfortably at the bottom on mobile devices with an easy dismiss button.
 */
export const MobileStickyBottomBanner: React.FC<{
  className?: string;
}> = React.memo(({ className = '' }) => {
  const [adSettings, setAdSettings] = useState<AdSettings>(getStoredAdSettings);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail?.adSettings) {
        setAdSettings(normalizeAdSettings(customEv.detail.adSettings));
      } else {
        setAdSettings(getStoredAdSettings());
      }
    };
    window.addEventListener(AD_SETTINGS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(AD_SETTINGS_UPDATED_EVENT, handleUpdate);
  }, []);

  if (isDismissed) return null;

  const activeCode =
    adSettings.banner300x100MobileHtml && adSettings.banner300x100MobileHtml.trim()
      ? adSettings.banner300x100MobileHtml
      : DEFAULT_BANNER_300X100_MOBILE_SCRIPT;

  if (!adSettings.enabled || adSettings.enableBanner300x100Mobile === false || !activeCode.trim()) {
    return null;
  }

  return (
    <AdSlotErrorBoundary>
      <div className={`md:hidden fixed bottom-2 inset-x-0 z-40 px-2 flex justify-center pointer-events-none ${className}`}>
        <div className="pointer-events-auto bg-slate-950/95 border border-amber-500/30 rounded-xl shadow-2xl p-1.5 flex flex-col items-center relative backdrop-blur-md">
          <div className="w-full flex items-center justify-between pb-1 px-1 text-[9px] text-slate-400">
            <span className="text-amber-400 font-semibold">Tài trợ · 300×100</span>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-0.5 text-slate-400 hover:text-white rounded"
              title="Đóng quảng cáo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="w-[300px] min-h-[100px] overflow-hidden flex items-center justify-center">
            <AdScriptRunner code={activeCode} width={300} height={100} />
          </div>
        </div>
      </div>
    </AdSlotErrorBoundary>
  );
});

/**
 * Custom HTML / JavaScript Ad Slot configured by Admin in AdSettingsModal
 */
export const CustomHtmlJsAdSlot: React.FC<{ className?: string }> = React.memo(({ className = '' }) => {
  const [adSettings, setAdSettings] = useState<AdSettings>(getStoredAdSettings);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail?.adSettings) {
        setAdSettings(normalizeAdSettings(customEv.detail.adSettings));
      } else {
        setAdSettings(getStoredAdSettings());
      }
    };
    window.addEventListener(AD_SETTINGS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(AD_SETTINGS_UPDATED_EVENT, handleUpdate);
  }, []);

  const code = typeof adSettings.customHtmlJsCode === 'string' ? adSettings.customHtmlJsCode.trim() : '';
  const isHtmlOrJs = adSettings.customAdCodeType === 'html' || adSettings.customAdCodeType === 'js';

  if (!adSettings.enabled || adSettings.enableCustomHtmlJs === false || !isHtmlOrJs || !code) {
    return null;
  }

  return (
    <AdSlotErrorBoundary>
      <div className={`w-full flex justify-center ${className}`}>
        <div className="max-w-full rounded-xl overflow-hidden bg-slate-950/80 border border-slate-800/80 p-2 shadow-md">
          <AdScriptRunner code={code} />
        </div>
      </div>
    </AdSlotErrorBoundary>
  );
});

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

function extractYouTubeId(url: unknown): string | null {
  if (typeof url !== 'string' || !url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? match[1] : null;
}

function resolveBannerImage(adSettings?: Partial<AdSettings> | null | Record<string, unknown>): string {
  if (adSettings && typeof adSettings.bannerImageUrl === 'string' && adSettings.bannerImageUrl.trim()) {
    return adSettings.bannerImageUrl.trim();
  }
  const ytId = extractYouTubeId(adSettings?.videoUrl);
  if (ytId) {
    return `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
  }
  return 'https://i.ytimg.com/vi/Co2OgH2FGr0/hqdefault.jpg';
}

export function resolveAdvertiserName(
  adSettings?: Partial<AdSettings> | null | Record<string, unknown>,
  dynamicAdTitle?: string
): string {
  if (adSettings && typeof adSettings.sponsorName === 'string') {
    const trimmedSponsor = adSettings.sponsorName.trim();
    if (trimmedSponsor) return trimmedSponsor;
  }
  const titleToCheck =
    typeof dynamicAdTitle === 'string' && dynamicAdTitle.trim()
      ? dynamicAdTitle.trim()
      : adSettings && typeof adSettings.adTitle === 'string'
      ? adSettings.adTitle.trim()
      : '';
  if (titleToCheck) {
    const parts = titleToCheck.split(/\s*[-–|•]\s*/);
    if (parts.length > 1) {
      const last = parts[parts.length - 1].trim();
      if (last.length >= 2 && last.length <= 40) return last;
      const first = parts[0].trim();
      if (first.length >= 2 && first.length <= 40) return first;
    }
    if (titleToCheck.length <= 35) return titleToCheck;
  }
  return 'Minh Hiếu Official VN';
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
  zoneId = ADCASH_LEADERBOARD_728X90_ZONE_ID,
  format = '728x90',
  className = '',
}) => {
  // Format 300x250 runs 100% standalone (ylse) with zero YouTube fallback and isolated error boundary
  if (format === '300x250') {
    return <StandaloneBanner300x250 className={className} />;
  }

  return <AdcashBannerStandard zoneId={zoneId} format={format} className={className} />;
};

const AdcashBannerStandard: React.FC<{
  zoneId: string;
  format: Exclude<AdcashBannerFormat, '300x250'>;
  className: string;
}> = ({ zoneId, format, className }) => {
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
        setAdSettings(normalizeAdSettings(customEv.detail.adSettings));
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
        const runOptions: { zoneId: string; renderIn?: string; width?: number; height?: number } = {
          zoneId,
          renderIn: `#${containerId}`,
        };
        if (format === '336x280') {
          runOptions.width = 336;
          runOptions.height = 280;
        } else if (format === '160x600') {
          runOptions.width = 160;
          runOptions.height = 600;
        } else if (format === '728x90') {
          runOptions.width = 728;
          runOptions.height = 90;
        }
        window.aclib.runBanner(runOptions);
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
    'https://www.youtube.com/@MinhHieuOfficialvn?sub_confirmation=1';
  const sponsorTitle =
    adSettings.adTitle ||
    'Xuyên Không Về Đại Đường Kích Hoạt Hệ Thống Chọc Tức Cày Điểm Ka - Minh Hiếu Official VN';
  const logoAvatar = watermarkSettings.logoUrl;

  const advertiserName = resolveAdvertiserName(adSettings);

  if (format === '160x600') {
    return (
      <AdSlotErrorBoundary>
      <div className={`w-[160px] mx-auto flex flex-col items-center justify-start ${className}`}>
        {/* Priority 1: Live Adcash Skyscraper Container */}
        {hasExternalFill && (
          <div className="w-[160px] pb-1 px-1 flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-bold text-amber-400 shrink-0">Quảng cáo:</span>
              <span className="text-slate-300 font-medium truncate max-w-[85px]">{advertiserName}</span>
            </div>
          </div>
        )}
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
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-bold text-amber-400 shrink-0">Quảng cáo:</span>
                <span className="text-slate-300 font-medium truncate max-w-[85px]">{advertiserName}</span>
              </div>
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
                    {advertiserName}
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
                    youtube.com/@MinhHieuOfficialvn
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
      </AdSlotErrorBoundary>
    );
  }

  // Format: 336x280 Large Rectangle
  if (format === '336x280') {
    return (
      <AdSlotErrorBoundary>
      <div className={`w-full max-w-[336px] mx-auto flex flex-col items-center justify-start ${className}`}>
        {/* Priority 1: Live Adcash Large Rectangle 336x280 Container */}
        {hasExternalFill && (
          <div className="w-full max-w-[336px] pb-1 px-1 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-amber-400 shrink-0">Quảng cáo:</span>
              <span className="text-slate-300 font-medium truncate max-w-[220px]">{advertiserName}</span>
            </div>
          </div>
        )}
        <div
          id={containerId}
          ref={bannerWrapperRef}
          data-zone-id={zoneId}
          data-ad-format="336x280"
          className={`w-full max-w-[336px] overflow-hidden ${hasExternalFill ? 'block' : 'h-0'}`}
        />

        {/* Priority 2: Pre-configured 336x280 Large Rectangle Fallback when Adcash has no fill */}
        {showFallbackBanner && (
          <div className="relative w-full max-w-[336px] h-[280px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/90 hover:border-slate-700 transition-colors flex flex-col justify-between select-none shadow-xl group">
            {/* Top Bar */}
            <div className="px-3 py-1.5 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-amber-400 shrink-0">Quảng cáo:</span>
                <span className="text-slate-200 font-medium truncate max-w-[220px]">{advertiserName}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDismissed(true);
                }}
                className="p-1 text-slate-500 hover:text-white transition-colors rounded"
                title="Đóng quảng cáo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Clickable Card Body */}
            <a
              href={targetHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex flex-col justify-between overflow-hidden"
            >
              {/* Media preview */}
              <div className="relative w-full h-[142px] bg-slate-950 overflow-hidden shrink-0">
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
                    <Play className="w-10 h-10 text-white/60" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white group-hover:bg-red-600 transition-colors shadow-lg">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center gap-2">
                  {logoAvatar && !avatarFailed ? (
                    <img
                      src={logoAvatar}
                      alt="Logo"
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarFailed(true)}
                      className="w-6 h-6 rounded-full object-cover border border-white/40 shadow shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      MH
                    </div>
                  )}
                  <span className="text-[11px] font-semibold text-white/95 truncate drop-shadow">
                    {advertiserName}
                  </span>
                </div>
              </div>

              {/* Bottom Details & CTA */}
              <div className="p-3 flex-1 flex flex-col justify-between bg-slate-900">
                <p className="text-xs font-bold text-slate-100 line-clamp-2 group-hover:text-amber-300 transition-colors leading-snug">
                  {sponsorTitle}
                </p>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                    @MinhHieuOfficialvn
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-white/10 group-hover:bg-red-600 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0">
                    <span>Xem ngay</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </span>
                </div>
              </div>
            </a>
          </div>
        )}
      </div>
      </AdSlotErrorBoundary>
    );
  }

  // Format: 728x90 Leaderboard
  return (
    <AdSlotErrorBoundary>
    <div className={`w-full flex flex-col items-center justify-center ${className}`}>
      {/* Priority 1: Live Adcash Leaderboard Container */}
      {hasExternalFill && (
        <div className="w-full max-w-[728px] mx-auto pb-1 px-1 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-amber-400 shrink-0">Quảng cáo:</span>
            <span className="text-slate-300 font-medium truncate">{advertiserName}</span>
          </div>
        </div>
      )}
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
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="font-bold text-amber-400 shrink-0">Quảng cáo:</span>
                <span className="font-medium text-slate-200 truncate">{advertiserName}</span>
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
    </AdSlotErrorBoundary>
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
        setAdSettings(normalizeAdSettings(customEv.detail.adSettings));
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

  const hasCustomSlider = Boolean(
    adSettings.enabled &&
    adSettings.enableVideoSlider !== false &&
    adSettings.videoSliderHtml &&
    adSettings.videoSliderHtml.trim()
  );

  // If user enabled custom MultiTag slider (alsq), inject inside AdSlotErrorBoundary
  if (hasCustomSlider) {
    return (
      <AdSlotErrorBoundary>
        <div className="fixed bottom-3 right-3 z-40 pointer-events-auto">
          <AdScriptRunner code={adSettings.videoSliderHtml!} />
        </div>
      </AdSlotErrorBoundary>
    );
  }

  if (!showFallbackSlider || !adSettings.enabled || adSettings.enableBannerFallback === false) {
    return null;
  }

  const ytId = extractYouTubeId(adSettings.videoUrl);
  const targetHref =
    adSettings.redirectUrl || 'https://www.youtube.com/@MinhHieuOfficialvn?sub_confirmation=1';

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

/**
 * Convenience helper for Display 336x280 Large Rectangle
 * Default Adcash Zone ID: 12358782
 */
export const AdcashRectangle336x280: React.FC<{
  zoneId?: string;
  className?: string;
}> = ({ zoneId = ADCASH_RECTANGLE_336X280_ZONE_ID, className = '' }) => (
  <AdcashBanner zoneId={zoneId} format="336x280" className={className} />
);

/**
 * Convenience helper for Display 300x250 Medium Rectangle (Standalone ylse)
 */
export const AdcashRectangle300x250: React.FC<{
  zoneId?: string;
  className?: string;
}> = ({ className = '' }) => (
  <StandaloneBanner300x250 className={className} />
);

/**
 * Convenience helper for Display 300x100 Mobile Banner (Standalone ozrqy)
 */
export const AdcashMobileBanner300x100: React.FC<{
  className?: string;
  showDismiss?: boolean;
}> = ({ className = '', showDismiss = false }) => (
  <MobileBanner300x100 className={className} showDismiss={showDismiss} />
);

