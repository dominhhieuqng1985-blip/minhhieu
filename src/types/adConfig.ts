export interface AdSettings {
  enabled: boolean;
  videoUrl: string;
  redirectUrl: string;
  skipDelaySeconds: number;
  adTitle: string;
  showInMovie: boolean;
  showInYouTube: boolean;
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
  // High quality sample trailer / ad video (Direct MP4 or YouTube)
  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  redirectUrl: 'https://www.youtube.com/@minhhieureviewphim?sub_confirmation=1',
  skipDelaySeconds: 5,
  adTitle: 'Quảng Cáo Tài Trợ - Minh Hiếu TuBe',
  showInMovie: true,
  showInYouTube: true,
};

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

export function getStoredAdSettings(): AdSettings {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_AD_SETTINGS);
      if (stored) {
        return { ...DEFAULT_AD_SETTINGS, ...JSON.parse(stored) };
      }
    }
  } catch {}
  return DEFAULT_AD_SETTINGS;
}

export function saveStoredAdSettings(settings: AdSettings): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_AD_SETTINGS, JSON.stringify(settings));
    }
  } catch {}
}

export function getStoredWatermarkSettings(): WatermarkSettings {
  try {
    if (typeof window !== 'undefined') {
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
    }
  } catch {}
}
