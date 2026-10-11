import { PodcastEpisode } from '../types/podcast';
import {
  DEFAULT_CHANNEL_INFO,
  DEFAULT_VIDEOS,
  DEFAULT_PODCASTS,
  DEFAULT_PODCAST_SERIES,
  DEFAULT_CHANNEL_PLAYLISTS,
} from '../data/minhhieuChannelData';

// Determine if we are hosted on a static host like GitHub Pages
export const isStaticHost =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('github.io') ||
    window.location.protocol === 'file:' ||
    !window.location.port);

// API Base matching Vite base URL
export const API_BASE = `${import.meta.env.BASE_URL}api/`;

/**
 * Safely fetches and parses JSON.
 * If the server returns HTML (e.g., GitHub Pages 404.html),
 * throws a clean descriptive error instead of `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`.
 */
export async function safeFetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  // If response is HTML or starts with '<'
  if (contentType.includes('text/html') || text.trim().startsWith('<') || text.trim().startsWith('<!DOCTYPE')) {
    throw new Error(
      `Máy chủ trả về trang HTML thay vì JSON (Endpoint có thể không tồn tại trên máy chủ tĩnh).`
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
    throw new Error(`Dữ liệu nhận được không đúng định dạng JSON: ${err.message}`);
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
