import {
  DEFAULT_VIDKRAKEN_API_KEY,
  VIDKRAKEN_BASE_URL,
  VidKrakenFormat,
} from '../config/vidkraken';
import { isStaticHost, getCustomBackendUrl } from './api';

export const STORAGE_KEY_VIDKRAKEN_KEY = 'casttube_vidkraken_api_key';
export const STORAGE_KEY_VIDKRAKEN_PROXY = 'casttube_vidkraken_proxy_url';
export const STORAGE_KEY_VIDKRAKEN_HISTORY = 'casttube_vidkraken_download_history_v1';

export interface VidKrakenBalanceItem {
  granted: number;
  used: number;
  remaining: number;
  unlimited: boolean;
  resetsAt: string | null;
}

export interface VidKrakenAccountInfo {
  name?: string;
  email?: string;
  plan?: {
    id: string;
    renewsAt: string | null;
    canceledAt: string | null;
  };
  balances?: {
    download_count?: VidKrakenBalanceItem;
    bandwidth_mb?: VidKrakenBalanceItem;
    info?: VidKrakenBalanceItem;
  };
  error?: string;
}

export interface VidKrakenVideoInfoResult {
  jobId: string;
  status: 'pending' | 'success' | 'failed' | string;
  result?: {
    title?: string;
    duration?: number;
    url?: string;
    thumbnail?: string;
    formats?: string[];
  };
  error?: string;
}

export interface VidKrakenDownloadJob {
  jobId: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | string;
  url?: string;
  format?: string;
  actualFormat?: string;
  language?: string | null;
  downloadUrl?: string;
  title?: string;
  duration?: number;
  fileSize?: number;
  createdAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  message?: string;
  pollToken?: string;
  pollUrl?: string;
  error?: string;
  progress?: {
    stage?: string;
    percent?: number;
    bytesDownloaded?: number;
    totalBytes?: number;
    totalBytesIsEstimate?: boolean;
    updatedAt?: string;
  };
}

export interface DownloadHistoryItem {
  id: string;
  jobId: string;
  title: string;
  youtubeUrl: string;
  downloadUrl: string;
  format: VidKrakenFormat;
  duration: number;
  fileSize?: number;
  completedAt: string;
}

/**
 * Get the currently active VidKraken API Key
 * Defaults to the active key with available quota: 276b76d3-a265-447d-8d32-1bcf2258290c
 */
export function getStoredVidKrakenKey(): string {
  if (typeof window === 'undefined') return DEFAULT_VIDKRAKEN_API_KEY;
  const saved = localStorage.getItem(STORAGE_KEY_VIDKRAKEN_KEY);
  // Automatically migrate from depleted key f71cd7b5... to active key 276b76d3...
  if (!saved || !saved.trim() || saved.trim() === 'f71cd7b5-2fcd-42b4-a4b7-40e6ca96b6ba') {
    localStorage.setItem(STORAGE_KEY_VIDKRAKEN_KEY, DEFAULT_VIDKRAKEN_API_KEY);
    return DEFAULT_VIDKRAKEN_API_KEY;
  }
  return saved.trim();
}

/**
 * Save custom VidKraken key
 */
export function setStoredVidKrakenKey(key: string): void {
  if (typeof window === 'undefined') return;
  const cleaned = key.trim();
  if (!cleaned) {
    localStorage.setItem(STORAGE_KEY_VIDKRAKEN_KEY, DEFAULT_VIDKRAKEN_API_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY_VIDKRAKEN_KEY, cleaned);
  }
}

/**
 * Get configured VidKraken Proxy URL (e.g. Cloudflare Worker or CORS proxy)
 */
export function getStoredVidKrakenProxy(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY_VIDKRAKEN_PROXY)?.trim() || '';
}

/**
 * Save custom VidKraken Proxy URL
 */
export function setStoredVidKrakenProxy(url: string): void {
  if (typeof window === 'undefined') return;
  const cleaned = url.trim().replace(/\/$/, '');
  if (!cleaned) {
    localStorage.removeItem(STORAGE_KEY_VIDKRAKEN_PROXY);
  } else {
    localStorage.setItem(STORAGE_KEY_VIDKRAKEN_PROXY, cleaned);
  }
}

/**
 * Resolve whether to call custom proxy, server proxy or direct endpoint
 */
function resolveEndpoint(path: string): string {
  // 1. User-configured custom VidKraken proxy (Cloudflare Worker or CORS proxy)
  const userProxy = getStoredVidKrakenProxy();
  if (userProxy) {
    if (userProxy.includes('/api/v2')) {
      return `${userProxy}${path}`;
    }
    return `${userProxy}/api/v2${path}`;
  }

  // 2. Custom backend URL (Express server deployed on Render, Railway, Fly.io, etc.)
  const customBackend = getCustomBackendUrl();
  if (customBackend) {
    return `${customBackend}/api/vidkraken${path}`;
  }

  // 3. If running with Node.js backend (local dev / cloud container), use server proxy
  if (!isStaticHost) {
    const base = import.meta.env.BASE_URL || '/';
    const normalized = base.endsWith('/') ? base : `${base}/`;
    return `${normalized}api/vidkraken${path}`;
  }

  // 4. On static GitHub Pages without custom proxy, direct call to VidKraken
  return `${VIDKRAKEN_BASE_URL}${path}`;
}

/**
 * Robust fetcher that tries server proxy, custom proxy, or direct endpoint
 */
async function callVidKrakenApi<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST';
    body?: any;
    apiKey?: string;
  } = {}
): Promise<T> {
  const apiKey = options.apiKey || getStoredVidKrakenKey();
  const method = options.method || 'GET';
  const url = resolveEndpoint(path);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const reqOptions: RequestInit = {
    method,
    headers,
  };

  if (options.body && method === 'POST') {
    reqOptions.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, reqOptions);

    if (!response.ok) {
      const errText = await response.text();
      let errorMessage = '';
      if (errText.trim().startsWith('<') || errText.includes('405 Not Allowed') || errText.includes('<html')) {
        errorMessage =
          response.status === 405
            ? 'Máy chủ tĩnh GitHub Pages không hỗ trợ API POST trực tiếp. Vui lòng sử dụng Custom Cloudflare Proxy hoặc GitHub Actions để tải.'
            : `Máy chủ phản hồi mã HTTP ${response.status}.`;
      } else {
        try {
          const parsedError = JSON.parse(errText);
          errorMessage = parsedError.message || parsedError.error || `Lỗi VidKraken HTTP ${response.status}`;
        } catch {
          errorMessage = errText.slice(0, 150);
        }
      }
      throw new Error(errorMessage || `Lỗi VidKraken HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as T;
    return data;
  } catch (error: any) {
    const isCorsOrNetwork =
      error.name === 'TypeError' ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError') ||
      error.message?.includes('Provisional headers') ||
      error.message?.includes('provisional header') ||
      error.message?.includes('fetch');

    // On static hosts like GitHub Pages, explain the CORS restriction clearly
    if (isCorsOrNetwork && isStaticHost && !getStoredVidKrakenProxy() && !getCustomBackendUrl()) {
      throw new Error(
        'CORS_BLOCKED: Trình duyệt Chrome chặn yêu cầu trực tiếp đến vidkraken.com trên GitHub Pages (Lỗi "Provisional headers are shown"). Vui lòng xem 3 giải pháp bên dưới: (1) Cài Cloudflare Worker Proxy miễn phí 1 phút, hoặc (2) Tải trực tiếp qua GitHub Actions, hoặc (3) Dùng Terminal CLI.'
      );
    }
    throw error;
  }
}

/**
 * Test VidKraken API connection with latency and CORS check
 */
export async function testVidKrakenConnection(
  apiKey?: string,
  testProxyUrl?: string
): Promise<{ success: boolean; latencyMs: number; account?: VidKrakenAccountInfo; error?: string }> {
  const start = Date.now();
  try {
    let endpoint = resolveEndpoint('/me');
    if (testProxyUrl) {
      const cleanProxy = testProxyUrl.trim().replace(/\/$/, '');
      endpoint = cleanProxy.includes('/api/v2') ? `${cleanProxy}/me` : `${cleanProxy}/api/v2/me`;
    }

    const key = apiKey || getStoredVidKrakenKey();
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        latencyMs,
        error: `Máy chủ phản hồi HTTP ${res.status}: ${errText.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as VidKrakenAccountInfo;
    return {
      success: true,
      latencyMs,
      account: data,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const isCors =
      err.name === 'TypeError' ||
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('Provisional headers');

    return {
      success: false,
      latencyMs,
      error: isCors
        ? 'Lỗi CORS / Provisional headers are shown: Trình duyệt chặn kết nối cross-origin. Hãy dùng Cloudflare Worker Proxy hoặc GitHub Actions.'
        : err.message || 'Không thể kết nối đến máy chủ.',
    };
  }
}

/**
 * Check Account and balances via GET /me
 */
export async function getVidKrakenAccount(apiKey?: string): Promise<VidKrakenAccountInfo> {
  return callVidKrakenApi<VidKrakenAccountInfo>('/me', {
    method: 'GET',
    apiKey,
  });
}

/**
 * Submit Video Info request via POST /info
 */
export async function submitVideoInfo(
  url: string,
  apiKey?: string
): Promise<{ jobId: string; status: string }> {
  return callVidKrakenApi<{ jobId: string; status: string }>('/info', {
    method: 'POST',
    body: { url },
    apiKey,
  });
}

/**
 * Poll Video Info by jobId via GET /info/{jobId}
 */
export async function checkVideoInfo(
  jobId: string,
  apiKey?: string
): Promise<VidKrakenVideoInfoResult> {
  return callVidKrakenApi<VidKrakenVideoInfoResult>(`/info/${encodeURIComponent(jobId)}`, {
    method: 'GET',
    apiKey,
  });
}

/**
 * Submit Download Request via POST /download
 */
export async function submitDownload(
  params: {
    url: string;
    format?: VidKrakenFormat;
    startTime?: number;
    endTime?: number;
    language?: string;
    webhookUrl?: string;
  },
  apiKey?: string
): Promise<VidKrakenDownloadJob> {
  const body: any = {
    url: params.url,
    format: params.format || 'audio',
  };
  if (typeof params.startTime === 'number' && params.startTime >= 0) {
    body.startTime = params.startTime;
  }
  if (typeof params.endTime === 'number' && params.endTime > 0) {
    body.endTime = params.endTime;
  }
  if (params.language && params.language.trim()) {
    body.language = params.language.trim();
  }
  if (params.webhookUrl && params.webhookUrl.trim()) {
    body.webhookUrl = params.webhookUrl.trim();
  }

  return callVidKrakenApi<VidKrakenDownloadJob>('/download', {
    method: 'POST',
    body,
    apiKey,
  });
}

/**
 * Check Download Status by jobId via GET /download/{jobId}
 */
export async function checkDownloadStatus(
  jobId: string,
  apiKey?: string
): Promise<VidKrakenDownloadJob> {
  return callVidKrakenApi<VidKrakenDownloadJob>(`/download/${encodeURIComponent(jobId)}`, {
    method: 'GET',
    apiKey,
  });
}

/**
 * Helpers: Format bytes into KB/MB/GB
 */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (mb > 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

/**
 * Helpers: Format seconds into MM:SS or HH:MM:SS
 */
export function formatDurationSeconds(sec?: number): string {
  if (!sec || isNaN(sec) || sec <= 0) return '00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Local download history storage
 */
export function getSavedDownloadHistory(): DownloadHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VIDKRAKEN_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDownloadHistoryItem(item: DownloadHistoryItem): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getSavedDownloadHistory();
    const updated = [item, ...list.filter((x) => x.jobId !== item.jobId)].slice(0, 30);
    localStorage.setItem(STORAGE_KEY_VIDKRAKEN_HISTORY, JSON.stringify(updated));
  } catch {}
}

export function clearDownloadHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_VIDKRAKEN_HISTORY);
}

export const STORAGE_KEY_VIDKRAKEN_AUTO_DOWNLOAD = 'casttube_vidkraken_auto_download';
export const STORAGE_KEY_VIDKRAKEN_ACTIVE_JOB = 'casttube_vidkraken_active_job_v1';

export function getStoredAutoDownload(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(STORAGE_KEY_VIDKRAKEN_AUTO_DOWNLOAD);
  if (val === null) return true; // Default auto download enabled
  return val === 'true';
}

export function setStoredAutoDownload(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_VIDKRAKEN_AUTO_DOWNLOAD, String(enabled));
}

export interface StoredActiveJob {
  jobId: string;
  youtubeUrl: string;
  title: string;
  format: string;
  startedAt: number;
}

export function getStoredActiveJob(): StoredActiveJob | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VIDKRAKEN_ACTIVE_JOB);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredActiveJob;
    // Expire stored active job after 2 hours
    if (Date.now() - parsed.startedAt > 2 * 3600 * 1000) {
      localStorage.removeItem(STORAGE_KEY_VIDKRAKEN_ACTIVE_JOB);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredActiveJob(job: StoredActiveJob | null): void {
  if (typeof window === 'undefined') return;
  if (!job) {
    localStorage.removeItem(STORAGE_KEY_VIDKRAKEN_ACTIVE_JOB);
  } else {
    localStorage.setItem(STORAGE_KEY_VIDKRAKEN_ACTIVE_JOB, JSON.stringify(job));
  }
}

/**
 * Detect episode tag from title (e.g. "Tập 12", "Ep 05", "Phần 2", etc.)
 */
export function extractEpisodeTag(title?: string): string {
  if (!title) return '';
  const tapMatch = title.match(/(?:t[ậa]p|ep(?:isode)?\.?)\s*([0-9]+)/i);
  if (tapMatch && tapMatch[1]) {
    const num = parseInt(tapMatch[1], 10);
    return `tap_${num < 10 ? '0' + num : num}`;
  }
  const phanMatch = title.match(/(?:ph[ầa]n|p\.?)\s*([0-9]+)/i);
  if (phanMatch && phanMatch[1]) {
    const num = parseInt(phanMatch[1], 10);
    return `phan_${num < 10 ? '0' + num : num}`;
  }
  return '';
}

/**
 * Clean title for safe cross-platform filesystem filename
 */
export function sanitizeTitleForFileName(rawTitle?: string): string {
  if (!rawTitle) return 'video';
  let clean = rawTitle
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/#\S+/gi, '')
    .replace(/[|•–—\-_/\\:;*?"<>!@#$%^&*()+=[\]{}~`']/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  if (clean.length > 70) {
    clean = clean.slice(0, 70);
    const lastUnderscore = clean.lastIndexOf('_');
    if (lastUnderscore > 30) {
      clean = clean.slice(0, lastUnderscore);
    }
  }

  return clean || 'video';
}

/**
 * Build professional Minh Hiếu standard filename:
 * minhhieu_[tap_XX_]tieu_de_[dinh_dang].[ext]
 */
export function buildMinhHieuDownloadFileName(
  title?: string,
  format?: VidKrakenFormat | string,
  explicitEpisode?: string | number
): string {
  const epTag = explicitEpisode
    ? typeof explicitEpisode === 'number'
      ? `tap_${explicitEpisode < 10 ? '0' + explicitEpisode : explicitEpisode}`
      : String(explicitEpisode).trim().toLowerCase().replace(/\s+/g, '_')
    : extractEpisodeTag(title);

  const cleanTitle = sanitizeTitleForFileName(title);

  let formatSuffix = '';
  let ext = 'mp4';

  const fmt = (format || '1080').toLowerCase();
  if (fmt.includes('1080')) {
    formatSuffix = '1080p';
    ext = 'mp4';
  } else if (fmt.includes('720')) {
    formatSuffix = '720p';
    ext = 'mp4';
  } else if (fmt.includes('480')) {
    formatSuffix = '480p';
    ext = 'mp4';
  } else if (fmt.includes('360')) {
    formatSuffix = '360p';
    ext = 'mp4';
  } else if (fmt.includes('aac')) {
    formatSuffix = 'audio_aac';
    ext = 'm4a';
  } else if (fmt.includes('audio') || fmt.includes('mp3')) {
    formatSuffix = 'audio';
    ext = 'mp3';
  } else {
    formatSuffix = fmt;
    ext = 'mp4';
  }

  const parts = ['minhhieu'];
  if (epTag) parts.push(epTag);
  if (cleanTitle) parts.push(cleanTitle);
  if (formatSuffix) parts.push(formatSuffix);

  return `${parts.join('_')}.${ext}`;
}

/**
 * Get direct stream URL or download URL
 */
export function getMinhHieuDownloadStreamUrl(downloadUrl: string, filename: string): string {
  if (typeof window === 'undefined' || !downloadUrl) return '';

  const base = import.meta.env.BASE_URL || '/';
  const normalized = base.endsWith('/') ? base : `${base}/`;

  if (!isStaticHost || getCustomBackendUrl()) {
    const customBackend = getCustomBackendUrl();
    const endpointBase = customBackend ? `${customBackend}/api/vidkraken-stream` : `${normalized}api/vidkraken-stream`;
    return `${endpointBase}?url=${encodeURIComponent(downloadUrl)}&filename=${encodeURIComponent(filename)}`;
  }

  return downloadUrl;
}

/**
 * Trigger file download directly using streaming pipe if backend available,
 * blob fetch fallback, or direct link
 */
export function triggerMinhHieuDownload(downloadUrl: string, filename: string): void {
  if (typeof window === 'undefined' || !downloadUrl) return;

  const base = import.meta.env.BASE_URL || '/';
  const normalized = base.endsWith('/') ? base : `${base}/`;

  // 1. If backend exists, use the streaming attachment pipe:
  if (!isStaticHost || getCustomBackendUrl()) {
    const customBackend = getCustomBackendUrl();
    const endpointBase = customBackend ? `${customBackend}/api/vidkraken-stream` : `${normalized}api/vidkraken-stream`;
    const fullStreamUrl = `${endpointBase}?url=${encodeURIComponent(downloadUrl)}&filename=${encodeURIComponent(filename)}`;

    const a = document.createElement('a');
    a.href = fullStreamUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 2000);
    return;
  }

  // 2. On static host: Try fetching as Blob first to enforce exact filename & prevent browser media tab
  fetch(downloadUrl, { mode: 'cors' })
    .then((res) => {
      if (!res.ok) throw new Error('Fetch failed');
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 30000);
    })
    .catch(() => {
      // 3. Fallback to direct navigation / anchor click
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 2000);
    });
}
