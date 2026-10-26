import { PodcastEpisode } from '../types/podcast';
import { getApiBaseUrl, hasBackend, isStaticHost } from './api';

export interface YouTubeSearchResult {
  youtubeId: string;
  title: string;
  channel: string;
  duration?: string;
  durationSeconds?: number;
  thumbnail: string;
  isShort?: boolean;
  publishedDate?: string;
  source: 'direct' | 'backend' | 'youtube_api' | 'piped' | 'catalog';
}

export const STORAGE_KEY_YT_API_KEY = 'minhhieu_youtube_api_key';

/**
 * Remove Vietnamese accents and convert to lowercase for forgiving fuzzy search
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Parse YouTube ID from query string or URL
 */
export function parseDirectYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match =
    trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/) ||
    (trimmed.length === 11 && trimmed.match(/^[a-zA-Z0-9_-]{11}$/) ? [, trimmed] : null);
  return match && match[1] ? match[1] : null;
}

/**
 * Get configured YouTube API Key (from localStorage or Vite env)
 */
export function getStoredYouTubeApiKey(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem(STORAGE_KEY_YT_API_KEY);
  if (stored && stored.trim()) return stored.trim();
  if (import.meta.env.VITE_YOUTUBE_API_KEY) {
    return String(import.meta.env.VITE_YOUTUBE_API_KEY).trim();
  }
  return '';
}

/**
 * Save user custom YouTube API key
 */
export function setStoredYouTubeApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (!key || !key.trim()) {
    localStorage.removeItem(STORAGE_KEY_YT_API_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY_YT_API_KEY, key.trim());
  }
}

/**
 * Resolve direct video metadata using noembed (works across domains with CORS)
 */
export async function fetchDirectVideoMeta(
  youtubeId: string
): Promise<{ title: string; channel: string; thumbnail: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${youtubeId}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.title && !data.error) {
        return {
          title: data.title,
          channel: data.author_name || 'YouTube Video',
          thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
        };
      }
    }
  } catch {
    // Timeout or network error
  }
  return null;
}

/**
 * Search via YouTube Data API v3 (if API key provided)
 */
async function searchViaYouTubeDataApi(query: string, apiKey: string): Promise<YouTubeSearchResult[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${encodeURIComponent(
      query
    )}&type=video&key=${apiKey}`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items)) {
        return data.items
          .filter((item: any) => item.id?.videoId)
          .map((item: any) => {
            const vidId = item.id.videoId;
            const snippet = item.snippet || {};
            const thumb =
              snippet.thumbnails?.high?.url ||
              snippet.thumbnails?.medium?.url ||
              `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;
            const title = snippet.title
              ?.replace(/&amp;/g, '&')
              ?.replace(/&quot;/g, '"')
              ?.replace(/&#39;/g, "'")
              ?.replace(/&lt;/g, '<')
              ?.replace(/&gt;/g, '>');

            return {
              youtubeId: vidId,
              title: title || `Video YouTube [${vidId}]`,
              channel: snippet.channelTitle || 'YouTube Creator',
              thumbnail: thumb,
              duration: '10:00',
              durationSeconds: 600,
              publishedDate: snippet.publishedAt ? snippet.publishedAt.split('T')[0] : 'YouTube',
              isShort: false,
              source: 'youtube_api' as const,
            };
          });
      }
    }
  } catch {}
  return [];
}

/**
 * Format seconds to mm:ss
 */
function formatSecondsToDuration(sec: number): string {
  if (!sec || isNaN(sec)) return '10:00';
  const mins = Math.floor(sec / 60);
  const remaining = Math.floor(sec % 60);
  return `${mins}:${String(remaining).padStart(2, '0')}`;
}

/**
 * Verified Piped instances supporting CORS and high uptime
 */
const PIPED_CORS_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.ducks.party',
];

/**
 * Search via live Piped mirrors with CORS
 */
async function searchViaPipedMirrors(query: string): Promise<YouTubeSearchResult[]> {
  for (const baseUrl of PIPED_CORS_INSTANCES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const url = `${baseUrl}/search?q=${encodeURIComponent(query)}&filter=all`;

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timer);

      if (!res.ok) continue;

      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        const results: YouTubeSearchResult[] = [];

        for (const item of data.items) {
          if (!item.url) continue;
          // Extract videoId from /watch?v=...
          const idMatch = item.url.match(/v=([a-zA-Z0-9_-]{11})/);
          if (!idMatch) continue;
          const vidId = idMatch[1];

          const isShort = Boolean(item.isShort || (item.duration && item.duration <= 60));
          const durationStr = item.duration ? formatSecondsToDuration(item.duration) : '10:00';

          // Use reliable i.ytimg.com thumbnail directly
          const thumb = `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;

          results.push({
            youtubeId: vidId,
            title: item.title || `Video [${vidId}]`,
            channel: item.uploaderName || 'YouTube Creator',
            duration: durationStr,
            durationSeconds: item.duration || 600,
            thumbnail: thumb,
            isShort,
            publishedDate: item.uploadedDate || 'YouTube',
            source: 'piped',
          });

          if (results.length >= 25) break;
        }

        if (results.length > 0) {
          return results;
        }
      }
    } catch {
      // Try next mirror
      continue;
    }
  }
  return [];
}

/**
 * Search full-stack backend if available (does not run on static GitHub Pages)
 */
async function searchViaBackend(query: string): Promise<YouTubeSearchResult[]> {
  const apiBase = getApiBaseUrl();
  // If no backend configured or we are on static host without custom backend, don't ping /api
  if (!apiBase || (isStaticHost && !hasBackend())) {
    return [];
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${apiBase}youtube/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          return data.results.map((r: any) => ({
            ...r,
            source: 'backend' as const,
          }));
        }
      }
    }
  } catch {}
  return [];
}

/**
 * Search local catalog with accent-tolerant matching
 */
export function searchLocalCatalogWithScores(
  rawQuery: string,
  catalog: { episode: PodcastEpisode; type: 'video' | 'podcast' }[]
): { episode: PodcastEpisode; type: 'video' | 'podcast'; score: number }[] {
  const qClean = rawQuery.trim();
  if (!qClean) return [];

  const qLower = qClean.toLowerCase();
  const qNoTone = removeVietnameseTones(qClean);
  const qTokens = qNoTone.split(/\s+/).filter(Boolean);

  const matched: { episode: PodcastEpisode; type: 'video' | 'podcast'; score: number }[] = [];

  for (const item of catalog) {
    const ep = item.episode;
    const titleLower = ep.title.toLowerCase();
    const titleNoTone = removeVietnameseTones(ep.title);
    const descLower = (ep.description || '').toLowerCase();
    const descNoTone = removeVietnameseTones(ep.description || '');
    const channelLower = (ep.channel || '').toLowerCase();
    const idLower = ep.youtubeId.toLowerCase();

    let score = 0;

    // Exact video ID match
    if (idLower === qLower) {
      score += 100;
    }

    // Exact title match
    if (titleLower.includes(qLower)) {
      score += 50;
    } else if (titleNoTone.includes(qNoTone)) {
      score += 40;
    }

    // Token matching
    if (qTokens.length > 0) {
      let matchedTokens = 0;
      for (const token of qTokens) {
        if (titleNoTone.includes(token)) {
          matchedTokens++;
          score += 10;
        } else if (descNoTone.includes(token)) {
          matchedTokens++;
          score += 3;
        } else if (channelLower.includes(token)) {
          matchedTokens++;
          score += 5;
        }
      }
      if (matchedTokens === qTokens.length) {
        score += 15; // Bonus for full token coverage
      }
    }

    // Description match
    if (descLower.includes(qLower)) {
      score += 5;
    }

    if (score > 0) {
      matched.push({ episode: ep, type: item.type, score });
    }
  }

  return matched.sort((a, b) => b.score - a.score);
}

/**
 * Main external YouTube search runner with complete fallback hierarchy:
 * 1. Direct ID / URL with live metadata
 * 2. Backend search endpoint (if running on Node.js)
 * 3. YouTube Data API v3 (if API key present)
 * 4. Resilient Piped CORS mirrors
 */
export async function searchExternalYouTube(
  query: string
): Promise<{ results: YouTubeSearchResult[]; source: 'direct' | 'backend' | 'youtube_api' | 'piped' | 'none' }> {
  const q = query.trim();
  if (!q) return { results: [], source: 'none' };

  // 1. Direct link / ID
  const directId = parseDirectYouTubeId(q);
  if (directId) {
    const meta = await fetchDirectVideoMeta(directId);
    const single: YouTubeSearchResult = {
      youtubeId: directId,
      title: meta?.title || `Video YouTube [${directId}]`,
      channel: meta?.channel || 'Link Trực Tiếp',
      duration: '10:00',
      durationSeconds: 600,
      thumbnail: meta?.thumbnail || `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
      isShort: q.includes('shorts'),
      source: 'direct',
    };
    return { results: [single], source: 'direct' };
  }

  // 2. Full-stack backend (if available)
  const backendResults = await searchViaBackend(q);
  if (backendResults.length > 0) {
    return { results: backendResults, source: 'backend' };
  }

  // 3. YouTube Data API v3 (if user/app provided key)
  const apiKey = getStoredYouTubeApiKey();
  if (apiKey) {
    const apiResults = await searchViaYouTubeDataApi(q, apiKey);
    if (apiResults.length > 0) {
      return { results: apiResults, source: 'youtube_api' };
    }
  }

  // 4. Live Piped CORS mirrors
  const pipedResults = await searchViaPipedMirrors(q);
  if (pipedResults.length > 0) {
    return { results: pipedResults, source: 'piped' };
  }

  return { results: [], source: 'none' };
}
