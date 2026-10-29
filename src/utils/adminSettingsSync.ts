import { getAdminAuthHeaders } from './adminAuth';
import {
  getApiBaseUrl,
  getCustomBackendUrl,
  setCustomBackendUrl,
  isStaticHost,
} from './api';
import {
  DEFAULT_EVERAI_API_KEY,
  EverAiVoice,
  getCustomVoices,
  getStoredEverAiKey,
  setStoredEverAiKey,
  STORAGE_KEY_CUSTOM_VOICES,
} from './everai';
import {
  getStoredAutoDownload,
  getStoredVidKrakenKey,
  getStoredVidKrakenProxy,
  setStoredAutoDownload,
  setStoredVidKrakenKey,
  setStoredVidKrakenProxy,
} from './vidkraken';
import { DEFAULT_VIDKRAKEN_API_KEY } from '../config/vidkraken';
import {
  DEFAULT_RAPIDAPI_KEY,
  getTikTokApiKey,
  setTikTokApiKey,
} from './tiktokApi';

export const ADMIN_SETTINGS_SYNCED_EVENT = 'minhhieu_admin_settings_synced';
export const STORAGE_KEY_STORAGE_PREFS = 'minhhieu_storage_preferences_v1';
export const STORAGE_KEY_CHANNEL_PROFILE = 'minhhieu_channel_profile_v1';

export interface StoragePreferences {
  primaryStorage: 'neon_postgresql';
  autoSyncVideosToDb: boolean;
  autoSyncVoicesToDb: boolean;
  autoSyncHistoryToDb: boolean;
  vidkrakenAutoDownload: boolean;
  vidkrakenProxyUrl: string;
  customBackendUrl: string;
}

export interface ApiKeysConfig {
  everaiApiKey: string;
  vidkrakenApiKey: string;
  geminiApiKey: string;
  geminiProEmail: string;
  tiktokRapidApiKey: string;
  youtubeDataApiKey?: string;
  customBackendUrl: string;
  vidkrakenProxyUrl: string;
}

export interface OfficialChannelProfile {
  name: string;
  handle: string;
  avatar: string;
  subscribers: string;
  youtubeUrl: string;
  subscribeUrl: string;
  rssFeedUrl?: string;
}

export const OFFICIAL_DEFAULT_CHANNEL_PROFILE: OfficialChannelProfile = {
  name: 'Minh Hiếu Official VN',
  handle: '@MinhHieuOfficialvn',
  avatar:
    'https://yt3.googleusercontent.com/IAZc3hD-MjzJAtG3Eainm3ueaTvyalzFYEeBqHm-1rkIbUCmIz9--aemFtvSsV-eQIZS0AS0EQ=s900-c-k-c0x00ffffff-no-rj',
  subscribers: 'Kênh YouTube Chính Thức',
  youtubeUrl: 'https://www.youtube.com/@MinhHieuOfficialvn',
  subscribeUrl: 'https://www.youtube.com/@MinhHieuOfficialvn?sub_confirmation=1',
  rssFeedUrl: 'https://www.vemaybaynhauyen.com/studo.xml',
};

function buildApiEndpoints(subPath: string): string[] {
  const cleanSub = subPath.replace(/^\/+/, '');
  const list: string[] = [];
  const apiBase = getApiBaseUrl();
  if (apiBase) {
    list.push(`${apiBase.replace(/\/+$/, '')}/${cleanSub}`);
  }
  if (!isStaticHost) {
    list.push(`/api/${cleanSub}`);
    list.push(`/minhhieu/api/${cleanSub}`);
  }
  return Array.from(new Set(list));
}

function normalizeLegacyChannelFields(profile: Partial<OfficialChannelProfile>): Partial<OfficialChannelProfile> {
  const next = { ...profile };
  if (
    next.name === 'Minh Hiếu Official' ||
    next.name === 'Minh Hiếu review phim' ||
    next.name === 'Minh Hiếu Review Phim'
  ) {
    next.name = 'Minh Hiếu Official VN';
  }
  if (next.handle === '@minhhieureviewphim') {
    next.handle = '@MinhHieuOfficialvn';
  }
  if (typeof next.youtubeUrl === 'string' && next.youtubeUrl.includes('@minhhieureviewphim')) {
    next.youtubeUrl = 'https://www.youtube.com/@MinhHieuOfficialvn';
  }
  if (typeof next.subscribeUrl === 'string' && next.subscribeUrl.includes('@minhhieureviewphim')) {
    next.subscribeUrl = 'https://www.youtube.com/@MinhHieuOfficialvn?sub_confirmation=1';
  }
  return next;
}

export function getStoredChannelProfile(): OfficialChannelProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHANNEL_PROFILE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.name === 'string') {
      const upgraded = normalizeLegacyChannelFields(parsed);
      return {
        ...OFFICIAL_DEFAULT_CHANNEL_PROFILE,
        ...upgraded,
      };
    }
  } catch {}
  return null;
}

export function saveStoredChannelProfile(profile: Partial<OfficialChannelProfile>): OfficialChannelProfile {
  const current = getStoredChannelProfile() || OFFICIAL_DEFAULT_CHANNEL_PROFILE;
  const merged: OfficialChannelProfile = {
    ...current,
    ...normalizeLegacyChannelFields(profile),
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_CHANNEL_PROFILE, JSON.stringify(merged));
    } catch {}
  }
  return merged;
}

export function getStoredStoragePreferences(): StoragePreferences {
  const defaults: StoragePreferences = {
    primaryStorage: 'neon_postgresql',
    autoSyncVideosToDb: true,
    autoSyncVoicesToDb: true,
    autoSyncHistoryToDb: true,
    vidkrakenAutoDownload: getStoredAutoDownload(),
    vidkrakenProxyUrl: getStoredVidKrakenProxy(),
    customBackendUrl: getCustomBackendUrl() || '',
  };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STORAGE_PREFS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        ...parsed,
        primaryStorage: 'neon_postgresql',
      };
    }
  } catch {}
  return defaults;
}

export function saveStoredStoragePreferences(prefs: Partial<StoragePreferences>): StoragePreferences {
  const merged: StoragePreferences = {
    ...getStoredStoragePreferences(),
    ...prefs,
    primaryStorage: 'neon_postgresql',
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_STORAGE_PREFS, JSON.stringify(merged));
      if (typeof prefs.vidkrakenAutoDownload === 'boolean') {
        setStoredAutoDownload(prefs.vidkrakenAutoDownload);
      }
      if (typeof prefs.vidkrakenProxyUrl === 'string') {
        setStoredVidKrakenProxy(prefs.vidkrakenProxyUrl);
      }
      if (typeof prefs.customBackendUrl === 'string') {
        setCustomBackendUrl(prefs.customBackendUrl.trim() || null);
      }
    } catch {}
  }
  return merged;
}

export function getCurrentApiKeysSnapshot(): ApiKeysConfig {
  if (typeof window === 'undefined') {
    return {
      everaiApiKey: DEFAULT_EVERAI_API_KEY,
      vidkrakenApiKey: DEFAULT_VIDKRAKEN_API_KEY,
      geminiApiKey: '',
      geminiProEmail: '',
      tiktokRapidApiKey: DEFAULT_RAPIDAPI_KEY,
      youtubeDataApiKey: '',
      customBackendUrl: '',
      vidkrakenProxyUrl: '',
    };
  }
  return {
    everaiApiKey: getStoredEverAiKey(),
    vidkrakenApiKey: getStoredVidKrakenKey(),
    geminiApiKey: localStorage.getItem('gemini_custom_pro_api_key') || '',
    geminiProEmail: localStorage.getItem('gemini_pro_email') || '',
    tiktokRapidApiKey: getTikTokApiKey(),
    youtubeDataApiKey: localStorage.getItem('minhhieu_youtube_api_key') || '',
    customBackendUrl: localStorage.getItem('casttube_custom_backend_url') || '',
    vidkrakenProxyUrl: getStoredVidKrakenProxy(),
  };
}

export function applyApiKeysSnapshotToBrowser(cfg: Partial<ApiKeysConfig>): void {
  if (typeof window === 'undefined' || !cfg || typeof cfg !== 'object') return;
  try {
    if (typeof cfg.everaiApiKey === 'string' && cfg.everaiApiKey.trim()) {
      setStoredEverAiKey(cfg.everaiApiKey.trim());
    }
    if (typeof cfg.vidkrakenApiKey === 'string' && cfg.vidkrakenApiKey.trim()) {
      setStoredVidKrakenKey(cfg.vidkrakenApiKey.trim());
    }
    if (typeof cfg.geminiApiKey === 'string') {
      if (cfg.geminiApiKey.trim()) {
        localStorage.setItem('gemini_custom_pro_api_key', cfg.geminiApiKey.trim());
      } else {
        localStorage.removeItem('gemini_custom_pro_api_key');
      }
    }
    if (typeof cfg.geminiProEmail === 'string') {
      if (cfg.geminiProEmail.trim()) {
        localStorage.setItem('gemini_pro_email', cfg.geminiProEmail.trim());
        localStorage.setItem('gemini_pro_account_connected', 'true');
      }
    }
    if (typeof cfg.tiktokRapidApiKey === 'string' && cfg.tiktokRapidApiKey.trim()) {
      setTikTokApiKey(cfg.tiktokRapidApiKey.trim());
    }
    if (typeof cfg.youtubeDataApiKey === 'string') {
      if (cfg.youtubeDataApiKey.trim()) {
        localStorage.setItem('minhhieu_youtube_api_key', cfg.youtubeDataApiKey.trim());
      } else {
        localStorage.removeItem('minhhieu_youtube_api_key');
      }
    }
    if (typeof cfg.customBackendUrl === 'string') {
      setCustomBackendUrl(cfg.customBackendUrl.trim() || null);
    }
    if (typeof cfg.vidkrakenProxyUrl === 'string') {
      setStoredVidKrakenProxy(cfg.vidkrakenProxyUrl.trim());
    }
    window.dispatchEvent(new CustomEvent(ADMIN_SETTINGS_SYNCED_EVENT, { detail: { apiKeys: cfg } }));
  } catch {}
}

export function applyCustomVoicesToBrowser(voices: EverAiVoice[]): void {
  if (typeof window === 'undefined' || !Array.isArray(voices)) return;
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_VOICES, JSON.stringify(voices));
    window.dispatchEvent(new CustomEvent(ADMIN_SETTINGS_SYNCED_EVENT, { detail: { customVoices: voices } }));
  } catch {}
}

/**
 * Hydrate Admin private settings (API keys, storage preferences, custom voices, channel profile)
 * directly from Neon PostgreSQL (`neon_app_settings`).
 * Uses `/api/admin/settings` first and automatically falls back to `/api/neon/table/neon_app_settings`
 * so it works immediately on live Render servers even before redeploying!
 */
export async function fetchAndHydrateAdminPrivateSettings(): Promise<Record<string, any> | null> {
  if (typeof window === 'undefined') return null;
  const authHeaders = getAdminAuthHeaders();
  if (!authHeaders.Authorization) return null;

  // Path 1: Dedicated /api/admin/settings endpoint
  for (const endpoint of buildApiEndpoints('admin/settings')) {
    try {
      const res = await fetch(`${endpoint}?nocache=${Date.now()}`, {
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
          ...authHeaders,
        },
      });
      if (res.ok) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<')) {
          const parsed = JSON.parse(text);
          if (parsed && parsed.success && parsed.settings) {
            applyHydratedSettingsMap(parsed.settings);
            return parsed.settings;
          }
        }
      }
    } catch {}
  }

  // Path 2: Compatible fallback via existing /api/neon/table/neon_app_settings on Render
  for (const endpoint of buildApiEndpoints('neon/table/neon_app_settings')) {
    try {
      const res = await fetch(`${endpoint}?page=1&limit=50&_nocache=${Date.now()}`, {
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
          ...authHeaders,
        },
      });
      if (res.ok) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<')) {
          const parsed = JSON.parse(text);
          if (parsed && Array.isArray(parsed.rows)) {
            const settingsMap: Record<string, any> = {};
            for (const row of parsed.rows) {
              if (row && row.setting_key) {
                let val = row.setting_value;
                if (typeof val === 'string') {
                  try {
                    val = JSON.parse(val);
                  } catch {}
                }
                settingsMap[row.setting_key] = val;
              }
            }
            applyHydratedSettingsMap(settingsMap);
            return settingsMap;
          }
        }
      }
    } catch {}
  }

  return null;
}

export function applyHydratedSettingsMap(settings: Record<string, any>): void {
  if (!settings || typeof settings !== 'object') return;

  if (settings.api_keys_config && typeof settings.api_keys_config === 'object') {
    applyApiKeysSnapshotToBrowser(settings.api_keys_config);
  }
  if (settings.storage_preferences && typeof settings.storage_preferences === 'object') {
    saveStoredStoragePreferences(settings.storage_preferences);
  }
  if (Array.isArray(settings.custom_voices) && settings.custom_voices.length > 0) {
    applyCustomVoicesToBrowser(settings.custom_voices);
  }
  if (settings.channel_profile && typeof settings.channel_profile === 'object' && settings.channel_profile.name) {
    saveStoredChannelProfile(settings.channel_profile);
  }
}

/**
 * Save API Keys, Storage Preferences, Custom Voices, or Channel Profile directly to Neon PostgreSQL (`neon_app_settings`).
 * Uses `/api/admin/settings` first, with automatic fallback to `POST /api/neon/table/neon_app_settings` + `PUT /api/settings/general`
 * so 100% of settings persist on BOTH local dev and live Render immediately!
 */
export async function saveAdminSettingsToNeon(payload: {
  apiKeys?: Partial<ApiKeysConfig>;
  storagePreferences?: Partial<StoragePreferences>;
  customVoices?: EverAiVoice[];
  channelProfile?: Partial<OfficialChannelProfile>;
  playbackPreferences?: Record<string, any>;
}): Promise<{ success: boolean; message: string }> {
  if (typeof window === 'undefined') {
    return { success: false, message: 'Môi trường không hỗ trợ.' };
  }

  // 1. Update local browser state immediately so UI is instant
  let mergedApiKeys: ApiKeysConfig | undefined;
  if (payload.apiKeys) {
    mergedApiKeys = {
      ...getCurrentApiKeysSnapshot(),
      ...payload.apiKeys,
    };
    applyApiKeysSnapshotToBrowser(mergedApiKeys);
  }

  let mergedStorage: StoragePreferences | undefined;
  if (payload.storagePreferences) {
    mergedStorage = saveStoredStoragePreferences(payload.storagePreferences);
  }

  if (payload.customVoices) {
    applyCustomVoicesToBrowser(payload.customVoices);
  }

  let mergedChannel: OfficialChannelProfile | undefined;
  if (payload.channelProfile) {
    mergedChannel = saveStoredChannelProfile(payload.channelProfile);
  }

  const authHeaders = getAdminAuthHeaders();
  if (!authHeaders.Authorization) {
    return {
      success: false,
      message: 'Cần đăng nhập Quản trị viên (Admin) để lưu cấu hình lên Admin Data (Neon PostgreSQL).',
    };
  }

  // 2. Primary: POST /api/admin/settings
  for (const endpoint of buildApiEndpoints('admin/settings')) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          apiKeys: mergedApiKeys,
          storagePreferences: mergedStorage,
          customVoices: payload.customVoices,
          channelProfile: mergedChannel,
          playbackPreferences: payload.playbackPreferences,
        }),
      });
      if (res.status === 401 || res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        return {
          success: false,
          message: errData?.error || 'Phiên đăng nhập Admin đã hết hạn. Vui lòng đăng nhập lại!',
        };
      }
      if (res.ok) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<')) {
          const data = JSON.parse(text);
          if (data && data.success) {
            return {
              success: true,
              message: data.message || 'Đã lưu và đồng bộ cấu hình trực tiếp lên Admin Data (Neon PostgreSQL)!',
            };
          }
        }
      }
    } catch {}
  }

  // 3. Compatible Fallback for existing deployed Render servers:
  // Upsert each row directly into neon_app_settings via POST /api/neon/table/neon_app_settings
  let savedAnyRow = false;
  const rowsToUpsert: Array<{
    setting_key: string;
    setting_value: any;
    category: string;
    is_public: boolean;
    description: string;
  }> = [];

  if (mergedApiKeys) {
    rowsToUpsert.push({
      setting_key: 'api_keys_config',
      setting_value: mergedApiKeys,
      category: 'api',
      is_public: false,
      description: 'Cấu hình khóa API (EverAI, VidKraken, Gemini, Backend Proxy) dành riêng cho Admin',
    });
  }
  if (mergedStorage) {
    rowsToUpsert.push({
      setting_key: 'storage_preferences',
      setting_value: mergedStorage,
      category: 'storage',
      is_public: true,
      description: 'Cấu hình lưu trữ và đồng bộ tự động trên Neon PostgreSQL',
    });
  }
  if (payload.customVoices) {
    rowsToUpsert.push({
      setting_key: 'custom_voices',
      setting_value: payload.customVoices,
      category: 'tts',
      is_public: true,
      description: 'Danh sách giọng đọc AI tùy chỉnh đồng bộ toàn hệ thống',
    });
  }
  if (mergedChannel) {
    rowsToUpsert.push({
      setting_key: 'channel_profile',
      setting_value: mergedChannel,
      category: 'channel',
      is_public: true,
      description: 'Thông tin kênh YouTube chính thức Minh Hiếu Official VN (@MinhHieuOfficialvn)',
    });
  }
  if (payload.playbackPreferences) {
    rowsToUpsert.push({
      setting_key: 'playback_preferences',
      setting_value: payload.playbackPreferences,
      category: 'playback',
      is_public: true,
      description: 'Tùy chọn trải nghiệm phát tự động & giọng đọc',
    });
  }

  for (const endpoint of buildApiEndpoints('neon/table/neon_app_settings')) {
    let okCount = 0;
    for (const row of rowsToUpsert) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify(row),
        });
        if (res.status === 401 || res.status === 403) {
          return {
            success: false,
            message: 'Phiên đăng nhập Admin không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại!',
          };
        }
        if (res.ok) {
          okCount++;
        }
      } catch {}
    }
    if (okCount > 0 && okCount === rowsToUpsert.length) {
      savedAnyRow = true;
      break;
    }
  }

  // Secondary fallback via PUT /api/settings/general
  if (!savedAnyRow) {
    for (const endpoint of buildApiEndpoints('settings/general')) {
      try {
        const res = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            channelProfile: mergedChannel,
            playbackPreferences: payload.playbackPreferences,
            extraSettings: {
              ...(mergedApiKeys ? { api_keys_config: mergedApiKeys } : {}),
              ...(mergedStorage ? { storage_preferences: mergedStorage } : {}),
              ...(payload.customVoices ? { custom_voices: payload.customVoices } : {}),
            },
          }),
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data && data.success) {
            savedAnyRow = true;
            break;
          }
        }
      } catch {}
    }
  }

  if (savedAnyRow) {
    return {
      success: true,
      message: 'Đã lưu và đồng bộ cấu hình trực tiếp vào Admin Data (Neon PostgreSQL)!',
    };
  }

  return {
    success: false,
    message: 'Không thể kết nối máy chủ Admin Data để lưu cài đặt. Vui lòng kiểm tra kết nối mạng.',
  };
}

/**
 * Convenience helper to sync current browser voices to Neon if Admin is logged in
 */
export function syncCustomVoicesToNeonIfAdmin(voices?: EverAiVoice[]): void {
  const authHeaders = getAdminAuthHeaders();
  if (!authHeaders.Authorization) return;
  const list = voices || getCustomVoices();
  saveAdminSettingsToNeon({ customVoices: list }).catch(() => {});
}
