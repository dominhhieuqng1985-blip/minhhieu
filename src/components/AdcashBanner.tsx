import React, { useEffect, useId, useRef } from 'react';

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

/**
 * Adcash Display Banner Component
 * Supports Leaderboard 728x90 (Zone 12358102) and Skyscraper 160x600 (Zone 12358110).
 *
 * Uses Adcash's official SPA `renderIn: '#unique-id'` target option and preserves
 * non-zero container `clientWidth` (728px / 160px) so `banner.js` autoresize never
 * collapses the banner to 0x0 in flex layouts.
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

  useEffect(() => {
    const container = bannerWrapperRef.current;
    if (!container) return;

    // Guard against React StrictMode duplicate initialization on the same DOM node
    if (container.dataset.adcashInitialized === zoneId && container.childElementCount > 0) {
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const aclibScript = ensureAdcashLibrary();

    const mountBanner = (): boolean => {
      if (cancelled || !bannerWrapperRef.current) return false;
      if (typeof window.aclib === 'undefined' || typeof window.aclib.runBanner !== 'function') {
        return false;
      }

      if (bannerWrapperRef.current.dataset.adcashInitialized === zoneId) {
        return true;
      }

      bannerWrapperRef.current.dataset.adcashInitialized = zoneId;
      bannerWrapperRef.current.innerHTML = '';

      try {
        window.aclib.runBanner({
          zoneId,
          renderIn: `#${containerId}`,
        });
        return true;
      } catch {
        bannerWrapperRef.current.dataset.adcashInitialized = '';
        return false;
      }
    };

    const mountDirectFallback = () => {
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
        } else if (retries >= 24) {
          if (pollTimer) clearInterval(pollTimer);
          pollTimer = null;
          mountDirectFallback();
        }
      }, 250);
    }

    return () => {
      cancelled = true;
      aclibScript?.removeEventListener('load', onScriptLoad);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [zoneId, containerId]);

  if (format === '160x600') {
    return (
      <div className={`w-[160px] mx-auto flex flex-col items-center justify-start ${className}`}>
        <div
          id={containerId}
          ref={bannerWrapperRef}
          data-zone-id={zoneId}
          data-ad-format="160x600"
          className="w-[160px] overflow-hidden"
        />
      </div>
    );
  }

  return (
    <div className={`w-full flex justify-center items-center overflow-x-auto scrollbar-none ${className}`}>
      <div
        id={containerId}
        ref={bannerWrapperRef}
        data-zone-id={zoneId}
        data-ad-format="728x90"
        className="w-full max-w-[728px] mx-auto overflow-hidden"
      />
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
 */
export const AdcashVideoSlider: React.FC<AdcashVideoSliderProps> = ({
  zoneId = ADCASH_VIDEO_SLIDER_ZONE_ID,
}) => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.__ADCASH_VIDEO_SLIDER_ZONES__ = window.__ADCASH_VIDEO_SLIDER_ZONES__ || {};
    if (window.__ADCASH_VIDEO_SLIDER_ZONES__[zoneId]) {
      return;
    }

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
        if (startSlider() || retries >= 32) {
          if (pollTimer) clearInterval(pollTimer);
          pollTimer = null;
        }
      }, 250);
    }

    return () => {
      cancelled = true;
      aclibScript?.removeEventListener('load', onScriptLoad);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [zoneId]);

  return null;
};
