import { PodcastEpisode } from '../types/podcast';
import {
  DEFAULT_CHANNEL_INFO,
  DEFAULT_VIDEOS,
  DEFAULT_PODCASTS,
  DEFAULT_PODCAST_SERIES,
  DEFAULT_CHANNEL_PLAYLISTS,
} from '../data/minhhieuChannelData';

// Storage key for optional remote backend URL
export const STORAGE_KEY_API_URL = 'casttube_custom_backend_url';

/**
 * Get configured custom backend URL if user deployed server.ts to Render, Railway, etc.
 */
export function getCustomBackendUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY_API_URL);
  if (stored && stored.trim()) {
    return stored.trim().replace(/\/$/, '');
  }
  // Optional Vite env var: VITE_BACKEND_URL
  if (import.meta.env.VITE_BACKEND_URL) {
    return String(import.meta.env.VITE_BACKEND_URL).trim().replace(/\/$/, '');
  }
  return null;
}

/**
 * Set custom backend URL
 */
export function setCustomBackendUrl(url: string | null): void {
  if (typeof window === 'undefined') return;
  if (!url || !url.trim()) {
    localStorage.removeItem(STORAGE_KEY_API_URL);
  } else {
    localStorage.setItem(STORAGE_KEY_API_URL, url.trim().replace(/\/$/, ''));
  }
}

/**
 * Check if running on a static host like GitHub Pages
 */
export const isStaticHost: boolean =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('github.io') ||
    window.location.protocol === 'file:' ||
    (!window.location.port && !window.location.hostname.includes('run.app')));

/**
 * Whether the application currently has a usable Node.js / Express backend
 */
export function hasBackend(): boolean {
  if (getCustomBackendUrl()) return true;
  // If we are on GitHub Pages without a remote backend, we do NOT have a backend
  if (isStaticHost) return false;
  return true;
}

/**
 * Dynamic API Base URL
 * - If user configured a custom backend (Render, Cloud Run, etc.): use that remote URL
 * - If running with local/embedded backend: use relative import.meta.env.BASE_URL + 'api/'
 * - If on GitHub Pages without backend: return null so code uses instant client-side data
 */
export function getApiBaseUrl(): string | null {
  const customUrl = getCustomBackendUrl();
  if (customUrl) {
    return `${customUrl}/api/`;
  }
  if (!hasBackend()) {
    return null;
  }
  const base = import.meta.env.BASE_URL || '/';
  return `${base.endsWith('/') ? base : base + '/'}api/`;
}

// Fallback constant for backwards compatibility
export const API_BASE = `${import.meta.env.BASE_URL || '/'}api/`;

/**
 * Safely fetches and parses JSON.
 * Throws clean errors if response is HTML (e.g. GitHub Pages 404.html).
 */
export async function safeFetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (contentType.includes('text/html') || text.trim().startsWith('<') || text.trim().startsWith('<!DOCTYPE')) {
    throw new Error(
      `Máy chủ trả về trang HTML thay vì JSON (Endpoint không tồn tại trên máy chủ tĩnh).`
    );
  }

  if (!response.ok) {
    try {
      const errJson = JSON.parse(text);
      throw new Error(errJson.error || `HTTP ${response.status}: ${response.statusText}`);
    } catch (e: any) {
      if (e.message?.startsWith('HTTP')) throw e;
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  try {
    return JSON.parse(text) as T;
  } catch (err: any) {
    throw new Error(`Dữ liệu không đúng định dạng JSON: ${err.message}`);
  }
}

/**
 * Client-side fallback AI generator for when backend /api/podcast/ai is unavailable (such as on GitHub Pages).
 */
export function generateClientAIAnalysis(
  action: 'summary' | 'chapters' | 'quotes' | 'qa',
  title: string,
  host: string = 'Minh Hiếu review phim',
  description?: string,
  question?: string
): string {
  if (action === 'summary') {
    return `💡 **Tổng quan nội dung**\nVideo/Podcast "${title}" từ kênh ${host} mang đến những phân tích sâu sắc, kịch tính và giàu cảm xúc về thông điệp nghệ thuật cũng như bài học cuộc sống.\n\n🔑 **3 Bài học đắt giá nhất (Key Takeaways)**:\n1. **Giá trị của sự kiên định**: Nhân vật chính luôn giữ vững niềm tin và la bàn đạo đức trước mọi cám dỗ và thử thách cam go.\n2. **Sự thấu cảm và lòng nhân ái**: Phim nhắc nhở chúng ta về sức mạnh của sự tha thứ và việc đặt mình vào vị trí của người khác.\n3. **Hành động vì lý tưởng**: Thành công thực sự không nằm ở hào quang bên ngoài mà ở sự thanh thản và giá trị để lại cho đời.\n\n🚀 **Hành động hôm nay**: Tự nhìn nhận lại một mục tiêu quan trọng và thực hiện 1 việc nhỏ cụ thể để tiến gần hơn tới mục tiêu đó.`;
  }

  if (action === 'chapters') {
    return `[00:00] Khởi đầu & Giới thiệu bối cảnh cốt truyện\n[03:45] Cao trào diễn biến & Những nút thắt kịch tính\n[08:20] Cú twist bất ngờ và bước ngoặt tâm lý nhân vật\n[14:10] Giải mã thông điệp ẩn dụ và triết lý nghệ thuật\n[18:30] Đúc kết bài học cuộc sống & Lời kết từ host`;
  }

  if (action === 'quotes') {
    return `1. *"Đừng để quá khứ định nghĩa bạn là ai trong ngày hôm nay, hãy để sự can đảm dẫn đường."*\n2. *"Có những mất mát không phải để kết thúc, mà để ta nhận ra điều gì thực sự đáng quý trọng."*\n3. *"Sức mạnh lớn nhất của con người không phải là không bao giờ gục ngã, mà là biết đứng lên sau mỗi lần vấp ngã."*`;
  }

  if (action === 'qa') {
    return `Về câu hỏi: "${question || 'Nội dung cốt lõi'}"\n\nDựa trên tập "${title}" của kênh ${host}: Tác phẩm nhấn mạnh rằng trong mọi tình huống éo le, yếu tố quyết định số phận luôn là bản lĩnh đối diện và sự tỉnh táo trong việc lựa chọn con đường đi đúng đắn.`;
  }

  return `Phân tích cho tập: "${title}" từ kênh ${host}.`;
}

/**
 * Helper to get default channel data for static environments
 */
export function getStaticChannelData() {
  return {
    channel: DEFAULT_CHANNEL_INFO,
    videos: DEFAULT_VIDEOS,
    podcasts: DEFAULT_PODCASTS,
    podcastSeries: DEFAULT_PODCAST_SERIES,
    playlists: DEFAULT_CHANNEL_PLAYLISTS,
    longVideosCount: DEFAULT_VIDEOS.filter((v) => !v.isShort).length,
    shortsCount: DEFAULT_VIDEOS.filter((v) => v.isShort).length,
    totalCount: DEFAULT_VIDEOS.length,
  };
}
