import { PodcastEpisode } from '../types/podcast';
import { getApiBaseUrl, hasBackend } from './api';

export interface TikTokAuthor {
  username: string;
  nickname: string;
  verified?: boolean;
  signature?: string;
  avatar?: string;
  id?: string;
}

export interface TikTokStats {
  likes?: number;
  comments?: number;
  views?: number;
  shares?: number;
  saves?: number;
}

export interface TikTokHashtag {
  hashtagId?: string;
  hashtagName?: string;
}

export interface TikTokVideoData {
  id: string;
  videoUrl?: string;
  author: TikTokAuthor;
  description: string;
  cover: string;
  duration?: number;
  musicTitle?: string;
  stats?: TikTokStats;
  hashtags?: TikTokHashtag[];
  locationCreated?: string;
  playUrl?: string;
  hdPlayUrl?: string;
  wmPlayUrl?: string;
  downloadUrl: string;
  needsTranscode?: boolean;
}

export interface TikTokHistoryItem {
  id: string;
  authorName: string;
  authorUsername: string;
  description: string;
  cover: string;
  downloadUrl: string;
  videoUrl?: string;
  downloadedAt: number;
  fileName: string;
}

export const DEFAULT_TIKTOK_URL = 'https://www.tiktok.com/@hiu.minh1093/video/7673836556217486612';

export const STORAGE_KEY_TIKTOK_API_KEY = 'minhhieu_tiktok_rapidapi_key';
export const STORAGE_KEY_TIKTOK_HISTORY = 'minhhieu_tiktok_download_history';

export const DEFAULT_RAPIDAPI_KEY = '22640ad209msha29ac75e0e57edfp1a2cbejsndd57d476497c';
export const DEFAULT_RAPIDAPI_HOST = 'tiktok-video-downloader-api.p.rapidapi.com';

/**
 * Check if a URL string is a TikTok link (standard or short vt/vm link)
 */
export function isTikTokUrl(raw?: string | null): boolean {
  if (!raw || typeof raw !== 'string') return false;
  const trimmed = raw.trim().toLowerCase();
  return (
    trimmed.includes('tiktok.com/') ||
    trimmed.includes('vt.tiktok.com/') ||
    trimmed.includes('vm.tiktok.com/')
  );
}

/**
 * Extract numeric TikTok video ID (typically 17-20 digits) from URL or ID string
 */
export function extractTikTokVideoId(input?: string | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (/^\d{15,22}$/.test(trimmed)) return trimmed;
  const match =
    trimmed.match(/\/(?:video|photo|v)\/(\d{15,22})/i) ||
    trimmed.match(/player\/v1\/(\d{15,22})/i) ||
    trimmed.match(/embed\/v2\/(\d{15,22})/i);
  return match ? match[1] : null;
}

/**
 * Determine whether a PodcastEpisode represents a TikTok video
 */
export function isTikTokEpisode(ep?: PodcastEpisode | null): boolean {
  if (!ep) return false;
  if (ep.sourceType === 'tiktok') return true;
  if (typeof ep.id === 'string' && ep.id.startsWith('tiktok-')) return true;
  if (ep.tiktokUrl && isTikTokUrl(ep.tiktokUrl)) return true;
  if (typeof ep.youtubeId === 'string' && /^\d{15,22}$/.test(ep.youtubeId.trim())) return true;
  return false;
}

/**
 * Get configured RapidAPI Key
 */
export function getTikTokApiKey(): string {
  if (typeof window === 'undefined') return DEFAULT_RAPIDAPI_KEY;
  const stored = localStorage.getItem(STORAGE_KEY_TIKTOK_API_KEY);
  if (stored && stored.trim()) return stored.trim();
  return DEFAULT_RAPIDAPI_KEY;
}

/**
 * Save custom RapidAPI Key
 */
export function setTikTokApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (!key || !key.trim()) {
    localStorage.removeItem(STORAGE_KEY_TIKTOK_API_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY_TIKTOK_API_KEY, key.trim());
  }
}

/**
 * Generate standard Minh Hiếu filename:
 * minhhieu_ten_video_XXXXXX.mp4
 */
export function generateTikTokDownloadFileName(title?: string, id?: string): string {
  const random6Digits = Math.floor(100000 + Math.random() * 900000);

  let cleanTitle = String(title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 45);

  if (!cleanTitle && id) {
    cleanTitle = `tiktok_${String(id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
  }
  if (!cleanTitle) {
    cleanTitle = 'video';
  }

  return `minhhieu_${cleanTitle}_${random6Digits}.mp4`;
}

/**
 * Format numbers to compact strings (e.g. 2.7M, 33.7M, 12.5K)
 */
export function formatCompactNumber(num?: number): string {
  if (typeof num !== 'number' || Number.isNaN(num)) return '0';
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return num.toLocaleString();
}

/**
 * Format seconds as MM:SS
 */
export function formatTikTokDuration(seconds?: number): string {
  const sec = typeof seconds === 'number' && seconds > 0 && !Number.isNaN(seconds) ? Math.round(seconds) : 30;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Sanitize TikTok video URL: remove unnecessary tracking query params
 */
export function sanitizeTikTokUrl(rawUrl: string): string {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes('tiktok.com')) {
      const match = parsed.pathname.match(/\/@[\w.-]+\/(?:video|photo)\/\d+/);
      if (match) {
        return `https://${parsed.hostname}${match[0]}`;
      }
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

function resolveTikwmClientUrl(u?: string): string {
  if (!u || typeof u !== 'string') return '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('//')) return `https:${u}`;
  return `https://www.tikwm.com${u.startsWith('/') ? '' : '/'}${u}`;
}

/**
 * Normalize raw TikTok API data so no missing/non-string field can ever crash React rendering
 */
export function normalizeTikTokVideoData(raw: any, fallbackUrl?: string): TikTokVideoData {
  const extractedId = extractTikTokVideoId(fallbackUrl) || String(Date.now());
  const idStr = raw?.id !== undefined && raw?.id !== null ? String(raw.id) : extractedId;
  const username = String(raw?.author?.username || raw?.author?.unique_id || 'tiktok_user');
  const nickname = String(raw?.author?.nickname || username);
  const description =
    typeof raw?.description === 'string'
      ? raw.description
      : typeof raw?.title === 'string'
      ? raw.title
      : '';
  const playUrl = String(raw?.playUrl || raw?.play || raw?.hdPlayUrl || raw?.downloadUrl || '');
  const hdPlayUrl = String(raw?.hdPlayUrl || raw?.hdplay || playUrl || raw?.downloadUrl || '');
  const wmPlayUrl = String(raw?.wmPlayUrl || raw?.wmplay || '');
  const downloadUrl = String(raw?.downloadUrl || hdPlayUrl || playUrl || wmPlayUrl || '');
  const canonicalUrl =
    typeof raw?.videoUrl === 'string' && raw.videoUrl
      ? raw.videoUrl
      : sanitizeTikTokUrl(fallbackUrl || '') || `https://www.tiktok.com/@${username}/video/${idStr}`;

  const rawHashtags = Array.isArray(raw?.hashtags)
    ? raw.hashtags
        .map((h: any) => ({
          hashtagId: h?.hashtagId ? String(h.hashtagId) : undefined,
          hashtagName: typeof h === 'string' ? h : String(h?.hashtagName || h?.name || ''),
        }))
        .filter((h: TikTokHashtag) => Boolean(h.hashtagName))
    : Array.from(String(description).matchAll(/#([\p{L}\p{N}_]+)/gu)).map((m: RegExpMatchArray) => ({
        hashtagName: m[1],
      }));

  return {
    id: idStr,
    videoUrl: canonicalUrl,
    author: {
      id: raw?.author?.id ? String(raw.author.id) : undefined,
      username,
      nickname,
      verified: Boolean(raw?.author?.verified),
      signature: typeof raw?.author?.signature === 'string' ? raw.author.signature : '',
      avatar: typeof raw?.author?.avatar === 'string' ? raw.author.avatar : '',
    },
    description,
    cover: typeof raw?.cover === 'string' ? raw.cover : '',
    duration: typeof raw?.duration === 'number' && raw.duration > 0 ? raw.duration : 30,
    musicTitle: typeof raw?.musicTitle === 'string' ? raw.musicTitle : undefined,
    stats: raw?.stats
      ? {
          views: Number(raw.stats.views ?? 0),
          likes: Number(raw.stats.likes ?? 0),
          comments: Number(raw.stats.comments ?? 0),
          shares: Number(raw.stats.shares ?? 0),
          saves: Number(raw.stats.saves ?? 0),
        }
      : undefined,
    hashtags: rawHashtags,
    locationCreated: typeof raw?.locationCreated === 'string' ? raw.locationCreated : undefined,
    playUrl: playUrl || downloadUrl,
    hdPlayUrl: hdPlayUrl || playUrl || downloadUrl,
    wmPlayUrl: wmPlayUrl || undefined,
    downloadUrl,
    needsTranscode: Boolean(raw?.needsTranscode),
  };
}

/**
 * Build an inline playable stream URL for HTML5 <video> (NEVER triggers attachment download)
 */
export function getTikTokInlineStreamUrl(
  mediaUrl?: string,
  originalVideoUrl?: string,
  forceTranscode = false
): string {
  const cleanMedia = String(mediaUrl || '').trim();
  const apiBase = hasBackend() ? getApiBaseUrl() : null;

  if (apiBase && (cleanMedia || originalVideoUrl)) {
    const params = new URLSearchParams();
    if (cleanMedia) params.set('url', cleanMedia);
    if (originalVideoUrl) params.set('videoUrl', sanitizeTikTokUrl(originalVideoUrl));
    if (forceTranscode) params.set('transcode', '1');
    return `${apiBase}tiktok/stream?${params.toString()}`;
  }
  return cleanMedia;
}

/**
 * Build an explicit attachment download URL (ONLY used when user clicks Download button)
 */
export function getTikTokAttachmentDownloadUrl(
  mediaUrl: string,
  fileName: string,
  originalVideoUrl?: string
): string | null {
  const apiBase = hasBackend() ? getApiBaseUrl() : null;
  if (!apiBase) return null;
  const params = new URLSearchParams();
  if (mediaUrl) params.set('url', mediaUrl);
  if (originalVideoUrl) params.set('videoUrl', sanitizeTikTokUrl(originalVideoUrl));
  if (fileName) params.set('filename', fileName);
  return `${apiBase}tiktok/download?${params.toString()}`;
}

/**
 * Fetch TikTok video info & direct stream/download URLs (Multi-provider: Backend -> TikWM -> RapidAPI)
 */
export async function fetchTikTokVideoData(
  videoUrl: string,
  customApiKey?: string
): Promise<TikTokVideoData> {
  const cleanUrl = sanitizeTikTokUrl(videoUrl);
  if (!cleanUrl) {
    throw new Error('Vui lòng nhập đường dẫn video TikTok hợp lệ');
  }

  const apiKey = (customApiKey && customApiKey.trim()) || getTikTokApiKey();

  // 1. Try Express Backend Resolver (/api/tiktok/info) if available
  if (hasBackend()) {
    try {
      const apiBase = getApiBaseUrl();
      if (apiBase) {
        const res = await fetch(`${apiBase}tiktok/info?url=${encodeURIComponent(cleanUrl)}`, {
          headers: {
            Accept: 'application/json',
            'x-rapidapi-key': apiKey,
          },
        });
        const ct = res.headers.get('content-type') || '';
        if (res.ok && !ct.includes('text/html')) {
          const json = await res.json();
          if (json && (json.playUrl || json.downloadUrl)) {
            return normalizeTikTokVideoData(json, cleanUrl);
          }
        }
      }
    } catch {
      // Fall through to client-side resolvers
    }
  }

  // 2. Client-side Primary: TikWM API (CORS * enabled, supports HD inline MP4 streams on static hosts too!)
  try {
    const wmRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}&hd=1`, {
      headers: { Accept: 'application/json' },
    });
    if (wmRes.ok) {
      const wmJson = await wmRes.json();
      if (wmJson && wmJson.code === 0 && wmJson.data) {
        const d = wmJson.data;
        const playUrl = resolveTikwmClientUrl(d.play);
        const hdPlayUrl = resolveTikwmClientUrl(d.hdplay) || playUrl;
        const wmPlayUrl = resolveTikwmClientUrl(d.wmplay);
        const coverUrl =
          resolveTikwmClientUrl(d.origin_cover) ||
          resolveTikwmClientUrl(d.cover) ||
          resolveTikwmClientUrl(d.ai_dynamic_cover);
        if (playUrl || hdPlayUrl || wmPlayUrl) {
          return normalizeTikTokVideoData(
            {
              id: d.id,
              author: {
                id: d.author?.id,
                username: d.author?.unique_id,
                nickname: d.author?.nickname,
                avatar: resolveTikwmClientUrl(d.author?.avatar),
              },
              description: d.title || '',
              cover: coverUrl,
              duration: d.duration,
              musicTitle: d.music_info?.title,
              stats: {
                views: d.play_count,
                likes: d.digg_count,
                comments: d.comment_count,
                shares: d.share_count,
                saves: d.collect_count,
              },
              // On unprobed client-side TikWM, d.play is H.264 (avc1) whereas d.hdplay is often HEVC (hvc1 audio-only in browsers)
              playUrl: playUrl || hdPlayUrl || wmPlayUrl,
              hdPlayUrl: playUrl || hdPlayUrl || wmPlayUrl,
              wmPlayUrl: wmPlayUrl || playUrl,
              downloadUrl: playUrl || hdPlayUrl || wmPlayUrl,
            },
            cleanUrl
          );
        }
      }
    }
  } catch {
    // Fall through to RapidAPI
  }

  // 3. Client-side Fallback: RapidAPI
  const endpoint = `https://${DEFAULT_RAPIDAPI_HOST}/media?videoUrl=${encodeURIComponent(cleanUrl)}`;
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'x-rapidapi-host': DEFAULT_RAPIDAPI_HOST,
      'x-rapidapi-key': apiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    let errMsg = `Lỗi kết nối API (${res.status})`;
    try {
      const parsed = JSON.parse(text);
      if (parsed.message || parsed.error) {
        errMsg = parsed.message || parsed.error;
      }
    } catch {}
    throw new Error(errMsg);
  }

  const data = await res.json();
  if (!data || (!data.downloadUrl && !data.playUrl)) {
    throw new Error('Không tìm thấy link video không logo từ TikTok. Vui lòng kiểm tra lại link!');
  }

  return normalizeTikTokVideoData(data, cleanUrl);
}

/**
 * Convert TikTokVideoData into a safe PodcastEpisode ready for the dedicated TikTokVideoPlayer
 */
export function convertTikTokDataToEpisode(
  data: TikTokVideoData,
  rawUrl?: string,
  seriesTitle?: string
): PodcastEpisode {
  const safeId = String(data.id || extractTikTokVideoId(rawUrl) || Date.now());
  const username = String(data.author?.username || 'tiktok_user');
  const nickname = String(data.author?.nickname || username);
  const canonicalUrl =
    data.videoUrl || sanitizeTikTokUrl(rawUrl || '') || `https://www.tiktok.com/@${username}/video/${safeId}`;
  const cleanTitle = (data.description || '').trim() || `Video TikTok @${username}`;
  const durSec = typeof data.duration === 'number' && data.duration > 0 ? Math.round(data.duration) : 30;

  return {
    id: `tiktok-${safeId}`,
    youtubeId: safeId,
    title: cleanTitle,
    channel: `${nickname} (@${username})`,
    channelHandle: `@${username}`,
    channelAvatar: data.author?.avatar || data.cover || '',
    channelUrl: `https://www.tiktok.com/@${username}`,
    category: 'nghe-thuat-sang-tao',
    duration: formatTikTokDuration(durSec),
    durationSeconds: durSec,
    thumbnail: data.cover || data.author?.avatar || '',
    description: cleanTitle,
    publishedDate: 'TikTok HD',
    views: data.stats?.views ? formatCompactNumber(data.stats.views) : undefined,
    isCustom: true,
    isShort: true,
    seriesTitle: seriesTitle && seriesTitle !== 'none' ? seriesTitle : undefined,
    sourceType: 'tiktok',
    tiktokUrl: canonicalUrl,
    videoUrl: data.playUrl || data.hdPlayUrl || data.downloadUrl,
    hdVideoUrl: data.hdPlayUrl || data.playUrl || data.downloadUrl,
  };
}

/**
 * Request a fresh download/stream URL for the given TikTok video URL
 */
export async function fetchFreshTikTokDownloadUrl(
  videoUrl: string,
  customApiKey?: string
): Promise<string> {
  const info = await fetchTikTokVideoData(videoUrl, customApiKey);
  return info.playUrl || info.hdPlayUrl || info.downloadUrl;
}

/**
 * Fetch video Blob into memory ONLY (NEVER triggers browser file save).
 * Useful for preloading or explicit save preparation.
 */
export async function fetchTikTokBlobOnly(
  downloadUrl: string,
  onProgress?: (percent: number) => void,
  originalVideoUrl?: string
): Promise<Blob> {
  // Prefer backend stream proxy when available to avoid CORS issues on any TikTok CDN edge
  const proxyDownloadUrl = getTikTokInlineStreamUrl(downloadUrl, originalVideoUrl);
  let activeUrl = proxyDownloadUrl || downloadUrl;

  const attemptFetch = async (url: string) => {
    return await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'video/mp4,*/*',
      },
    });
  };

  let response: Response;
  try {
    response = await attemptFetch(activeUrl);
    if (!response.ok && activeUrl !== downloadUrl && downloadUrl) {
      response = await attemptFetch(downloadUrl);
    }
  } catch (err: any) {
    if (originalVideoUrl) {
      const freshUrl = await fetchFreshTikTokDownloadUrl(originalVideoUrl);
      response = await attemptFetch(getTikTokInlineStreamUrl(freshUrl, originalVideoUrl) || freshUrl);
    } else {
      throw err;
    }
  }

  if (!response.ok && originalVideoUrl) {
    const freshUrl = await fetchFreshTikTokDownloadUrl(originalVideoUrl);
    response = await attemptFetch(getTikTokInlineStreamUrl(freshUrl, originalVideoUrl) || freshUrl);
  }

  if (!response.ok) {
    throw new Error(`Không thể tải dữ liệu video (HTTP ${response.status})`);
  }

  const contentLength = response.headers.get('content-length');
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body || !totalBytes) {
    const blob = await response.blob();
    if (onProgress) onProgress(100);
    return blob;
  }

  const reader = response.body.getReader();
  let receivedBytes = 0;
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      receivedBytes += value.length;
      if (onProgress && totalBytes > 0) {
        const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
        onProgress(percent);
      }
    }
  }

  const blob = new Blob(chunks as any[], { type: 'video/mp4' });
  if (onProgress) onProgress(100);
  return blob;
}

/**
 * Trigger explicit file download of the TikTok MP4 with the Minh Hiếu naming convention.
 * ONLY call this when the user explicitly clicks a Download button!
 */
export async function downloadTikTokFile(
  downloadUrl: string,
  fileName: string,
  onProgress?: (percent: number) => void,
  originalVideoUrl?: string
): Promise<Blob> {
  const blob = await fetchTikTokBlobOnly(downloadUrl, onProgress, originalVideoUrl);
  triggerBlobDownload(blob, fileName);
  return blob;
}

export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}

/**
 * Download history helpers
 */
export function getSavedTikTokHistory(): TikTokHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TIKTOK_HISTORY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveTikTokHistoryItem(item: TikTokHistoryItem): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getSavedTikTokHistory();
    const filtered = current.filter((i) => String(i.id) !== String(item.id));
    const updated = [item, ...filtered].slice(0, 20);
    localStorage.setItem(STORAGE_KEY_TIKTOK_HISTORY, JSON.stringify(updated));
  } catch {}
}

export function clearTikTokHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_TIKTOK_HISTORY);
}
