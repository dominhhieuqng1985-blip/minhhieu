export interface AdSettings {
  enabled: boolean;
  videoUrl: string;
  redirectUrl: string;
  skipDelaySeconds: number;
  adTitle: string;
  showInMovie: boolean;
  showInYouTube: boolean;
  // Multi-point & random ad break placements
  enablePreRoll?: boolean;
  enableMidRoll?: boolean;
  enablePostRoll?: boolean;
  enableRandomRoll?: boolean;
  preAdNoticeSeconds?: number;
  // Display banner fallback when external ad network has no fill
  enableBannerFallback?: boolean;
  bannerImageUrl?: string;
  sponsorName?: string;
}

export interface WatermarkSettings {
  enabled: boolean;
  logoUrl: string;
  targetUrl: string;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  opacity: number; // 0.1 to 1.0
  size: 'sm' | 'md' | 'lg';
}

export const DEFAULT_AD_SETTINGS: AdSettings = {
  enabled: true,
  // Link mặc định quảng cáo trên toàn trang theo yêu cầu: Xuyên Không Về Đại Đường Kích Hoạt Hệ Thống Chọc Tức Cày Điểm Ka
  videoUrl: 'https://youtu.be/Co2OgH2FGr0?si=pBe3YR7Em398Ayqf',
  redirectUrl: 'https://www.youtube.com/@minhhieureviewphim?sub_confirmation=1',
  skipDelaySeconds: 5,
  adTitle: 'Xuyên Không Về Đại Đường Kích Hoạt Hệ Thống Chọc Tức Cày Điểm Ka - Minh Hiếu Review Phim',
  sponsorName: 'Minh Hiếu Review Phim',
  showInMovie: true,
  showInYouTube: true,
  enablePreRoll: true,
  enableMidRoll: true,
  enablePostRoll: true,
  enableRandomRoll: true,
  preAdNoticeSeconds: 5,
  enableBannerFallback: true,
  bannerImageUrl: '',
};

export function normalizeAdSettings(raw?: Partial<AdSettings> | Record<string, unknown> | null): AdSettings {
  const src = raw && typeof raw === 'object' ? raw : {};
  const merged = { ...DEFAULT_AD_SETTINGS, ...src } as Record<string, unknown>;

  const rawVideoUrl = typeof merged.videoUrl === 'string' ? merged.videoUrl : '';
  const isObsoleteSample = !rawVideoUrl.trim() || rawVideoUrl.includes('ForBiggerBlazes');

  return {
    enabled: typeof merged.enabled === 'boolean' ? merged.enabled : DEFAULT_AD_SETTINGS.enabled,
    videoUrl: isObsoleteSample ? DEFAULT_AD_SETTINGS.videoUrl : rawVideoUrl,
    redirectUrl:
      typeof merged.redirectUrl === 'string' ? merged.redirectUrl : DEFAULT_AD_SETTINGS.redirectUrl,
    skipDelaySeconds:
      typeof merged.skipDelaySeconds === 'number' && !Number.isNaN(merged.skipDelaySeconds)
        ? merged.skipDelaySeconds
        : DEFAULT_AD_SETTINGS.skipDelaySeconds,
    adTitle:
      isObsoleteSample || typeof merged.adTitle !== 'string'
        ? DEFAULT_AD_SETTINGS.adTitle
        : merged.adTitle,
    sponsorName:
      typeof merged.sponsorName === 'string'
        ? merged.sponsorName
        : DEFAULT_AD_SETTINGS.sponsorName,
    showInMovie:
      typeof merged.showInMovie === 'boolean' ? merged.showInMovie : DEFAULT_AD_SETTINGS.showInMovie,
    showInYouTube:
      typeof merged.showInYouTube === 'boolean'
        ? merged.showInYouTube
        : DEFAULT_AD_SETTINGS.showInYouTube,
    enablePreRoll:
      typeof merged.enablePreRoll === 'boolean'
        ? merged.enablePreRoll
        : DEFAULT_AD_SETTINGS.enablePreRoll,
    enableMidRoll:
      typeof merged.enableMidRoll === 'boolean'
        ? merged.enableMidRoll
        : DEFAULT_AD_SETTINGS.enableMidRoll,
    enablePostRoll:
      typeof merged.enablePostRoll === 'boolean'
        ? merged.enablePostRoll
        : DEFAULT_AD_SETTINGS.enablePostRoll,
    enableRandomRoll:
      typeof merged.enableRandomRoll === 'boolean'
        ? merged.enableRandomRoll
        : DEFAULT_AD_SETTINGS.enableRandomRoll,
    preAdNoticeSeconds:
      typeof merged.preAdNoticeSeconds === 'number' && !Number.isNaN(merged.preAdNoticeSeconds)
        ? merged.preAdNoticeSeconds
        : DEFAULT_AD_SETTINGS.preAdNoticeSeconds,
    enableBannerFallback:
      typeof merged.enableBannerFallback === 'boolean'
        ? merged.enableBannerFallback
        : DEFAULT_AD_SETTINGS.enableBannerFallback,
    bannerImageUrl: typeof merged.bannerImageUrl === 'string' ? merged.bannerImageUrl : '',
  };
}

export const DEFAULT_WATERMARK_SETTINGS: WatermarkSettings = {
  enabled: true,
  logoUrl: 'https://yt3.googleusercontent.com/IAZc3hD-MjzJAtG3Eainm3ueaTvyalzFYEeBqHm-1rkIbUCmIz9--aemFtvSsV-eQIZS0AS0EQ=s900-c-k-c0x00ffffff-no-rj',
  targetUrl: 'https://www.youtube.com/@minhhieureviewphim',
  position: 'top-right',
  opacity: 0.85,
  size: 'md',
};

export const STORAGE_KEY_AD_SETTINGS = 'minhhieu_ad_settings_v2';
export const STORAGE_KEY_WATERMARK_SETTINGS = 'minhhieu_watermark_settings_v2';
export const AD_SETTINGS_UPDATED_EVENT = 'minhhieu_ad_settings_updated';

// Safe base64 utf-8 encoding
export function encodeConfigToBase64(data: any): string {
  try {
    const jsonStr = JSON.stringify(data);
    return btoa(
      encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  } catch {
    return '';
  }
}

// Safe base64 utf-8 decoding
export function decodeConfigFromBase64(base64Str: string): any {
  try {
    const jsonStr = decodeURIComponent(
      Array.prototype.map
        .call(atob(base64Str.trim()), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// Check and consume URL parameter ?ad_cfg=... on load for 1-click sync when switching devices
export function checkUrlConfigParam(): { adSettings?: AdSettings; watermarkSettings?: WatermarkSettings } | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const cfg = params.get('ad_cfg') || params.get('ad_config');
    if (cfg) {
      const decoded = decodeConfigFromBase64(cfg);
      if (decoded && (decoded.adSettings || decoded.watermarkSettings)) {
        if (decoded.adSettings) saveStoredAdSettings(normalizeAdSettings(decoded.adSettings));
        if (decoded.watermarkSettings) saveStoredWatermarkSettings(decoded.watermarkSettings);
        return decoded;
      }
    }
  } catch {}
  return null;
}

export function getStoredAdSettings(): AdSettings {
  try {
    if (typeof window !== 'undefined') {
      // 1. Check URL param first (e.g. from share link on new device)
      const urlConfig = checkUrlConfigParam();
      if (urlConfig?.adSettings) {
        return normalizeAdSettings(urlConfig.adSettings);
      }

      // 2. Read localStorage
      const stored = localStorage.getItem(STORAGE_KEY_AD_SETTINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        const normalized = normalizeAdSettings(parsed);
        if (
          typeof parsed?.sponsorName !== 'string' ||
          !parsed?.videoUrl ||
          (typeof parsed?.videoUrl === 'string' && parsed.videoUrl.includes('ForBiggerBlazes'))
        ) {
          localStorage.setItem(STORAGE_KEY_AD_SETTINGS, JSON.stringify(normalized));
        }
        return normalized;
      }
    }
  } catch {}
  return DEFAULT_AD_SETTINGS;
}

export function saveStoredAdSettings(settings: AdSettings): void {
  try {
    if (typeof window !== 'undefined') {
      const normalized = normalizeAdSettings(settings);
      localStorage.setItem(STORAGE_KEY_AD_SETTINGS, JSON.stringify(normalized));
      window.dispatchEvent(
        new CustomEvent(AD_SETTINGS_UPDATED_EVENT, { detail: { adSettings: normalized } })
      );
    }
  } catch {}
}

export function getStoredWatermarkSettings(): WatermarkSettings {
  try {
    if (typeof window !== 'undefined') {
      const urlConfig = checkUrlConfigParam();
      if (urlConfig?.watermarkSettings) {
        return { ...DEFAULT_WATERMARK_SETTINGS, ...urlConfig.watermarkSettings };
      }

      const stored = localStorage.getItem(STORAGE_KEY_WATERMARK_SETTINGS);
      if (stored) {
        return { ...DEFAULT_WATERMARK_SETTINGS, ...JSON.parse(stored) };
      }
    }
  } catch {}
  return DEFAULT_WATERMARK_SETTINGS;
}

export function saveStoredWatermarkSettings(settings: WatermarkSettings): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_WATERMARK_SETTINGS, JSON.stringify(settings));
      window.dispatchEvent(
        new CustomEvent(AD_SETTINGS_UPDATED_EVENT, { detail: { watermarkSettings: settings } })
      );
    }
  } catch {}
}

/**
 * Fetch remote ad settings from server or public json file
 * Automatically saves to localStorage and notifies components if new settings are loaded.
 */
export async function fetchRemoteAdSettings(): Promise<{
  adSettings: AdSettings;
  watermarkSettings: WatermarkSettings;
} | null> {
  if (typeof window === 'undefined') return null;

  const candidateUrls = [
    '/api/settings/ads',
    '/minhhieu/api/settings/ads',
    './ad-settings.json',
    '/ad-settings.json',
    '/minhhieu/ad-settings.json',
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(`${url}?nocache=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache', Accept: 'application/json' },
      });
      if (res.ok) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<')) {
          const data = JSON.parse(text);
          if (data && (data.adSettings || data.watermarkSettings)) {
            const finalAd = data.adSettings ? normalizeAdSettings(data.adSettings) : null;
            const finalWatermark = data.watermarkSettings
              ? { ...DEFAULT_WATERMARK_SETTINGS, ...data.watermarkSettings }
              : null;

            if (finalAd) {
              localStorage.setItem(STORAGE_KEY_AD_SETTINGS, JSON.stringify(finalAd));
            }
            if (finalWatermark) {
              localStorage.setItem(STORAGE_KEY_WATERMARK_SETTINGS, JSON.stringify(finalWatermark));
            }

            window.dispatchEvent(
              new CustomEvent(AD_SETTINGS_UPDATED_EVENT, {
                detail: { adSettings: finalAd, watermarkSettings: finalWatermark },
              })
            );

            return {
              adSettings: finalAd || DEFAULT_AD_SETTINGS,
              watermarkSettings: finalWatermark || DEFAULT_WATERMARK_SETTINGS,
            };
          }
        }
      }
    } catch {}
  }
  return null;
}

/**
 * Save ad and watermark settings to the server so ANY other device will automatically load it.
 */
export async function saveRemoteAdSettings(
  adSettings: AdSettings,
  watermarkSettings: WatermarkSettings
): Promise<{ success: boolean; message?: string }> {
  saveStoredAdSettings(adSettings);
  saveStoredWatermarkSettings(watermarkSettings);

  const candidateEndpoints = [
    '/api/settings/ads',
    '/minhhieu/api/settings/ads',
  ];

  let savedToServer = false;
  for (const endpoint of candidateEndpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adSettings, watermarkSettings }),
      });
      if (res.ok) {
        savedToServer = true;
        break;
      }
    } catch {}
  }

  return {
    success: true,
    message: savedToServer
      ? 'Đã lưu cấu hình lên máy chủ & đồng bộ cho mọi thiết bị!'
      : 'Đã lưu vào bộ nhớ trình duyệt!',
  };
}

/**
 * Generate a shareable URL containing the current ad and watermark configuration.
 * Opening this link on any computer, tablet or mobile phone automatically sets the same configuration!
 */
export function generateShareableConfigUrl(
  adSettings: AdSettings,
  watermarkSettings: WatermarkSettings
): string {
  if (typeof window === 'undefined') return '';
  const payload = { adSettings, watermarkSettings };
  const encoded = encodeConfigToBase64(payload);
  const url = new URL(window.location.href);
  url.searchParams.set('ad_cfg', encoded);
  return url.toString();
}
