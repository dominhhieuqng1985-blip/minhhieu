import { getAdminAuthHeaders } from '../utils/adminAuth';
import { getApiBaseUrl, hasBackend, isStaticHost } from '../utils/api';
import {
  PayPalSettings,
  DocumentSettings,
  DEFAULT_PAYPAL_SETTINGS,
  DEFAULT_DOCUMENT_SETTINGS,
  saveStoredPayPalSettings,
  saveStoredDocumentSettings,
} from './documents';

export const DEFAULT_VAST_30_TAG_URL =
  'https://troubled-entertainment.com/d/mOF.zdd/GlN/vDZuGNUc/deLmd9LucZ/UWlFkiPVTncc1dNxjAQf3UMWDgEGt/NlzrUN2sNoDjcvwBNVQE';

export const ADCASH_INSTREAM_VAST_TAG_URL =
  'https://youradexchange.com/video/select.php?r=12358098';

export const DEFAULT_BANNER_300X250_SCRIPT = `<script>
(function(ylse){
var d = document,
    s = d.createElement('script'),
    l = d.currentScript || d.scripts[d.scripts.length - 1];
s.settings = ylse || {};
s.src = "\\/\\/fond-appointment.com\\/bcXnVps_d.G\\/lT0rYrWPcO\\/SeTmy9\\/uqZ\\/Uol\\/kJPrTNcA1\\/NHjgQD3\\/MmDLk\\/tmNgz\\/U_2jN-D\\/cpxDMnwL";
s.async = true;
s.referrerPolicy = 'no-referrer-when-downgrade';
l.parentNode.insertBefore(s, l);
})({})
</script>`;

export const DEFAULT_VIDEO_SLIDER_SCRIPT = `<script>
(function(alsq){
var d = document,
s = d.createElement('script'),
l = d.currentScript || d.scripts[d.scripts.length - 1];
s.settings = alsq || {};
s.src = "\\/\\/fond-appointment.com\\/bOXGV.sodGGQlo0\\/YwW\\/cb\\/WeOmH9sumZ\\/U\\/lKk\\/PzTRcx1INRj\\/Q\\/3VMWjJUNtANdzWUb2TNBDCc_ywOkQG";
s.async = true;
s.referrerPolicy = 'no-referrer-when-downgrade';
l.parentNode.insertBefore(s, l);
})({})
</script>`;

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
  // Rich Ad Formats: In-Stream VAST 3.0, 300x250 Banner, MultiTag Video Slider, Custom HTML/JS
  vastTagUrl?: string;
  enableVastAds?: boolean;
  rotateVideoAds?: boolean; // Luân phiên ngẫu nhiên giữa các quảng cáo video đã cài sẵn
  extraVastTagUrls?: string; // Danh sách nhiều link VAST luân phiên (mỗi dòng 1 URL)
  banner300x250Html?: string;
  enableBanner300x250?: boolean;
  videoSliderHtml?: string;
  enableVideoSlider?: boolean;
  customAdCodeType?: 'vast' | 'html' | 'js';
  customHtmlJsCode?: string;
  enableCustomHtmlJs?: boolean;
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
  redirectUrl: 'https://www.youtube.com/@MinhHieuOfficialvn?sub_confirmation=1',
  skipDelaySeconds: 5,
  adTitle: 'Xuyên Không Về Đại Đường Kích Hoạt Hệ Thống Chọc Tức Cày Điểm Ka - Minh Hiếu Official VN',
  sponsorName: 'Minh Hiếu Official VN',
  showInMovie: true,
  showInYouTube: true,
  enablePreRoll: true,
  enableMidRoll: true,
  enablePostRoll: true,
  enableRandomRoll: true,
  preAdNoticeSeconds: 5,
  enableBannerFallback: true,
  bannerImageUrl: '',
  // Rich ad formats defaults
  vastTagUrl: DEFAULT_VAST_30_TAG_URL,
  enableVastAds: true,
  rotateVideoAds: true,
  extraVastTagUrls: '',
  banner300x250Html: DEFAULT_BANNER_300X250_SCRIPT,
  enableBanner300x250: true,
  videoSliderHtml: DEFAULT_VIDEO_SLIDER_SCRIPT,
  enableVideoSlider: true,
  customAdCodeType: 'vast',
  customHtmlJsCode: '',
  enableCustomHtmlJs: true,
};

function isLegacyBanner300Script(code: unknown): boolean {
  if (typeof code !== 'string' || !code.trim()) return true;
  return (
    code.includes('bYX-VAsLd') ||
    code.includes('petdp') ||
    code.includes('lpysay') ||
    code.includes('bOX/Vcs.dZGvlT0vYyWNcp')
  );
}

export function normalizeAdSettings(raw?: Partial<AdSettings> | Record<string, unknown> | null): AdSettings {
  const src = raw && typeof raw === 'object' ? raw : {};
  const merged = { ...DEFAULT_AD_SETTINGS, ...src } as Record<string, unknown>;

  const rawVideoUrl = typeof merged.videoUrl === 'string' ? merged.videoUrl : '';
  const isObsoleteSample = !rawVideoUrl.trim() || rawVideoUrl.includes('ForBiggerBlazes');

  const rawVastUrl =
    typeof merged.vastTagUrl === 'string' && merged.vastTagUrl.trim()
      ? merged.vastTagUrl.trim()
      : DEFAULT_AD_SETTINGS.vastTagUrl || DEFAULT_VAST_30_TAG_URL;

  const hadLegacy300 = isLegacyBanner300Script((src as Record<string, unknown>).banner300x250Html);
  const rawBanner300 =
    typeof merged.banner300x250Html === 'string' &&
    merged.banner300x250Html.trim() &&
    !isLegacyBanner300Script(merged.banner300x250Html)
      ? merged.banner300x250Html
      : DEFAULT_BANNER_300X250_SCRIPT;

  const rawSlider =
    typeof merged.videoSliderHtml === 'string' && merged.videoSliderHtml.trim()
      ? merged.videoSliderHtml
      : DEFAULT_VIDEO_SLIDER_SCRIPT;

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
    // Rich ad formats
    vastTagUrl: rawVastUrl,
    enableVastAds:
      typeof merged.enableVastAds === 'boolean' ? merged.enableVastAds : DEFAULT_AD_SETTINGS.enableVastAds,
    rotateVideoAds:
      typeof merged.rotateVideoAds === 'boolean'
        ? merged.rotateVideoAds
        : DEFAULT_AD_SETTINGS.rotateVideoAds,
    extraVastTagUrls: typeof merged.extraVastTagUrls === 'string' ? merged.extraVastTagUrls : '',
    banner300x250Html: rawBanner300,
    enableBanner300x250: hadLegacy300
      ? true
      : typeof merged.enableBanner300x250 === 'boolean'
      ? merged.enableBanner300x250
      : DEFAULT_AD_SETTINGS.enableBanner300x250,
    videoSliderHtml: rawSlider,
    enableVideoSlider:
      typeof merged.enableVideoSlider === 'boolean'
        ? merged.enableVideoSlider
        : DEFAULT_AD_SETTINGS.enableVideoSlider,
    customAdCodeType:
      merged.customAdCodeType === 'html' || merged.customAdCodeType === 'js' || merged.customAdCodeType === 'vast'
        ? merged.customAdCodeType
        : 'vast',
    customHtmlJsCode: typeof merged.customHtmlJsCode === 'string' ? merged.customHtmlJsCode : '',
    enableCustomHtmlJs:
      typeof merged.enableCustomHtmlJs === 'boolean'
        ? merged.enableCustomHtmlJs
        : DEFAULT_AD_SETTINGS.enableCustomHtmlJs,
  };
}

export const DEFAULT_WATERMARK_SETTINGS: WatermarkSettings = {
  enabled: true,
  logoUrl: 'https://yt3.googleusercontent.com/IAZc3hD-MjzJAtG3Eainm3ueaTvyalzFYEeBqHm-1rkIbUCmIz9--aemFtvSsV-eQIZS0AS0EQ=s900-c-k-c0x00ffffff-no-rj',
  targetUrl: 'https://www.youtube.com/@MinhHieuOfficialvn',
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
          (typeof parsed?.videoUrl === 'string' && parsed.videoUrl.includes('ForBiggerBlazes')) ||
          isLegacyBanner300Script(parsed?.banner300x250Html)
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

function buildSettingsApiEndpoints(subPath: string): string[] {
  const cleanSub = subPath.replace(/^\/+/, '');
  const urls: string[] = [];
  const apiBase = getApiBaseUrl();
  if (apiBase) {
    urls.push(`${apiBase.replace(/\/+$/, '')}/${cleanSub}`);
  }
  if (!isStaticHost) {
    urls.push(`/api/${cleanSub}`);
    urls.push(`/minhhieu/api/${cleanSub}`);
  }
  return Array.from(new Set(urls));
}

/**
 * Fetch remote ad settings from Neon PostgreSQL backend API.
 * NEVER overwrites saved settings with static ./ad-settings.json on F5 reload!
 */
export async function fetchRemoteAdSettings(): Promise<{
  adSettings: AdSettings;
  watermarkSettings: WatermarkSettings;
  paypalSettings?: PayPalSettings;
  documentSettings?: DocumentSettings;
} | null> {
  if (typeof window === 'undefined') return null;

  // 1. Always prioritize live Neon PostgreSQL backend endpoints (works on both local & GitHub Pages -> Render)
  const apiUrls = buildSettingsApiEndpoints('settings/ads');

  for (const url of apiUrls) {
    try {
      const res = await fetch(`${url}?nocache=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache', Accept: 'application/json' },
      });
      if (res.ok) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<')) {
          const data = JSON.parse(text);
          if (data && (data.adSettings || data.watermarkSettings || data.paypalSettings || data.documentSettings)) {
            const finalAd = data.adSettings ? normalizeAdSettings(data.adSettings) : null;
            const finalWatermark = data.watermarkSettings
              ? { ...DEFAULT_WATERMARK_SETTINGS, ...data.watermarkSettings }
              : null;
            const finalPaypal = data.paypalSettings
              ? { ...DEFAULT_PAYPAL_SETTINGS, ...data.paypalSettings }
              : undefined;
            const finalDocs = data.documentSettings
              ? { ...DEFAULT_DOCUMENT_SETTINGS, ...data.documentSettings }
              : undefined;

            if (finalAd) {
              localStorage.setItem(STORAGE_KEY_AD_SETTINGS, JSON.stringify(finalAd));
            }
            if (finalWatermark) {
              localStorage.setItem(STORAGE_KEY_WATERMARK_SETTINGS, JSON.stringify(finalWatermark));
            }
            if (finalPaypal) {
              saveStoredPayPalSettings(finalPaypal);
            }
            if (finalDocs) {
              saveStoredDocumentSettings(finalDocs);
            }

            window.dispatchEvent(
              new CustomEvent(AD_SETTINGS_UPDATED_EVENT, {
                detail: {
                  adSettings: finalAd,
                  watermarkSettings: finalWatermark,
                  paypalSettings: finalPaypal,
                  documentSettings: finalDocs,
                },
              })
            );

            return {
              adSettings: finalAd || DEFAULT_AD_SETTINGS,
              watermarkSettings: finalWatermark || DEFAULT_WATERMARK_SETTINGS,
              paypalSettings: finalPaypal,
              documentSettings: finalDocs,
            };
          }
        }
      }
    } catch {}
  }

  // 2. Only fall back to static ./ad-settings.json if NO backend exists AND localStorage has NEVER been initialized
  const hasExistingLocal = Boolean(localStorage.getItem(STORAGE_KEY_AD_SETTINGS));
  if (hasBackend() || hasExistingLocal) {
    return null;
  }

  const staticCandidates = ['./ad-settings.json', '/ad-settings.json', '/minhhieu/ad-settings.json'];
  for (const url of staticCandidates) {
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
            if (finalAd) localStorage.setItem(STORAGE_KEY_AD_SETTINGS, JSON.stringify(finalAd));
            if (finalWatermark) localStorage.setItem(STORAGE_KEY_WATERMARK_SETTINGS, JSON.stringify(finalWatermark));
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
 * Save ad, watermark, paypal and document settings to Neon PostgreSQL (Admin Only) so ANY device and F5 reload automatically loads it.
 */
export async function saveRemoteAdSettings(
  adSettings: AdSettings,
  watermarkSettings: WatermarkSettings,
  paypalSettings?: PayPalSettings,
  documentSettings?: DocumentSettings
): Promise<{ success: boolean; message?: string }> {
  const normalizedAd = normalizeAdSettings(adSettings);
  saveStoredAdSettings(normalizedAd);
  saveStoredWatermarkSettings(watermarkSettings);
  if (paypalSettings) saveStoredPayPalSettings(paypalSettings);
  if (documentSettings) saveStoredDocumentSettings(documentSettings);

  const candidateEndpoints = buildSettingsApiEndpoints('settings/ads');
  const authHeaders = getAdminAuthHeaders();

  if (!authHeaders.Authorization) {
    return {
      success: false,
      message: 'Cần đăng nhập Quản trị viên (Admin) để lưu cấu hình lên Admin Data (Neon PostgreSQL).',
    };
  }

  let savedToServer = false;
  let unauthorizedError = '';
  let lastErrorMsg = '';

  for (const endpoint of candidateEndpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          adSettings: normalizedAd,
          watermarkSettings,
          paypalSettings,
          documentSettings,
        }),
      });
      if (res.status === 401 || res.status === 403) {
        const errBody = await res.json().catch(() => ({}));
        unauthorizedError =
          errBody?.error || 'Chỉ Quản trị viên (Admin) mới được phép lưu cấu hình lên cơ sở dữ liệu!';
        break;
      }
      if (res.ok) {
        const text = await res.text();
        if (!text.trim().startsWith('<')) {
          savedToServer = true;
          break;
        }
      } else {
        const errBody = await res.json().catch(() => ({}));
        lastErrorMsg = errBody?.error || `HTTP ${res.status}`;
      }
    } catch (err: any) {
      lastErrorMsg = err?.message || '';
    }
  }

  if (unauthorizedError) {
    return {
      success: false,
      message: unauthorizedError,
    };
  }

  // Backup upsert directly to neon_app_settings table if primary endpoint encountered a transient issue
  if (!savedToServer) {
    for (const neonEndpoint of buildSettingsApiEndpoints('neon/table/neon_app_settings')) {
      try {
        const [r1, r2] = await Promise.all([
          fetch(neonEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({
              setting_key: 'ad_settings',
              setting_value: normalizedAd,
              category: 'ads',
              is_public: true,
              description: 'Cấu hình Quảng cáo Video VAST, Display Banner & Video Slider',
            }),
          }),
          fetch(neonEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({
              setting_key: 'watermark_settings',
              setting_value: watermarkSettings,
              category: 'watermark',
              is_public: true,
              description: 'Cấu hình Logo Watermark thương hiệu kênh',
            }),
          }),
        ]);
        if (r1.ok && r2.ok) {
          savedToServer = true;
          break;
        }
      } catch {}
    }
  }

  if (!savedToServer && hasBackend()) {
    return {
      success: false,
      message:
        lastErrorMsg ||
        'Không thể đồng bộ lên máy chủ Admin Data (Neon PostgreSQL). Vui lòng thử lại sau giây lát.',
    };
  }

  return {
    success: true,
    message: savedToServer
      ? 'Đã lưu cấu hình lên Admin Data (Neon PostgreSQL) & đồng bộ cho mọi thiết bị!'
      : 'Đã lưu vào bộ nhớ trình duyệt!',
  };
}

/**
 * Load all public settings (channel profile, playback preferences, custom voices, storage prefs, custom videos, deleted IDs) from Neon PostgreSQL
 */
export async function fetchPublicSystemSettingsFromDb(): Promise<{
  connected: boolean;
  settings: Record<string, any>;
  customVideos: any[];
  deletedVideoIds: string[];
} | null> {
  if (typeof window === 'undefined') return null;

  const endpoints = buildSettingsApiEndpoints('settings/public');
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${endpoint}?nocache=${Date.now()}`, {
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<')) {
          const parsed = JSON.parse(text);
          if (parsed && parsed.success) {
            return {
              connected: Boolean(parsed.connected),
              settings: parsed.settings || {},
              customVideos: Array.isArray(parsed.customVideos) ? parsed.customVideos : [],
              deletedVideoIds: Array.isArray(parsed.deletedVideoIds) ? parsed.deletedVideoIds : [],
            };
          }
        }
      }
    } catch {}
  }
  return null;
}

/**
 * Persist general settings (channel profile, playback preferences, custom videos, deleted blacklist) to Neon PostgreSQL (Admin Only)
 */
export async function saveGeneralSettingsToDb(payload: {
  channelProfile?: Record<string, any>;
  playbackPreferences?: Record<string, any>;
  customVideos?: any[];
  deletedVideoIds?: string[];
  extraSettings?: Record<string, any>;
}): Promise<{ success: boolean; message?: string }> {
  if (typeof window === 'undefined') return { success: false };
  const authHeaders = getAdminAuthHeaders();
  if (!authHeaders.Authorization) {
    return { success: false, message: 'Cần quyền Admin để lưu lên cơ sở dữ liệu.' };
  }

  const endpoints = buildSettingsApiEndpoints('settings/general');
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      if (res.status === 401 || res.status === 403) {
        return { success: false, message: data.error || 'Từ chối truy cập: Yêu cầu quyền Admin!' };
      }
    } catch {}
  }

  return { success: false, message: 'Không thể đồng bộ cài đặt lên máy chủ Admin Data.' };
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
