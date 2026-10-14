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
 * Defaults to the user provided key: f71cd7b5-2fcd-42b4-a4b7-40e6ca96b6ba
 */
export function getStoredVidKrakenKey(): string {
  if (typeof window === 'undefined') return DEFAULT_VIDKRAKEN_API_KEY;
  const saved = localStorage.getItem(STORAGE_KEY_VIDKRAKEN_KEY);
  if (saved && saved.trim()) return saved.trim();
  // Automatically seed the user's provided key so it's always ready
  localStorage.setItem(STORAGE_KEY_VIDKRAKEN_KEY, DEFAULT_VIDKRAKEN_API_KEY);
  return DEFAULT_VIDKRAKEN_API_KEY;
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
      let parsedError: any;
      try {
        parsedError = JSON.parse(errText);
      } catch {
        parsedError = { message: errText };
      }
      throw new Error(
        parsedError.message ||
          parsedError.error ||
          `Lỗi VidKraken HTTP ${response.status}: ${response.statusText}`
      );
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
