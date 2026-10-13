import {
  DEFAULT_VIDKRAKEN_API_KEY,
  VIDKRAKEN_BASE_URL,
  VidKrakenFormat,
} from '../config/vidkraken';
import { isStaticHost, getCustomBackendUrl } from './api';

export const STORAGE_KEY_VIDKRAKEN_KEY = 'casttube_vidkraken_api_key';
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
 * Resolve whether to call server proxy or direct / fallback endpoint
 */
function resolveEndpoint(path: string): string {
  const customBackend = getCustomBackendUrl();
  if (customBackend) {
    return `${customBackend}/api/vidkraken${path}`;
  }
  // If not static (e.g. running local Express server), use server proxy
  if (!isStaticHost) {
    const base = import.meta.env.BASE_URL || '/';
    const normalized = base.endsWith('/') ? base : `${base}/`;
    return `${normalized}api/vidkraken${path}`;
  }
  // On static GitHub Pages, call VidKraken directly
  return `${VIDKRAKEN_BASE_URL}${path}`;
}

/**
 * Robust fetcher that tries server proxy or direct endpoint
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
    // If running on static host (like GitHub Pages) and direct fetch hit network/CORS error:
    if (isStaticHost && (error.name === 'TypeError' || error.message?.includes('fetch'))) {
      // Fallback attempt: if direct request failed, try via query relay or informative message
      console.warn('Direct fetch failed on static host, attempting fallback:', error);
    }
    throw error;
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
