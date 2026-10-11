/**
 * Extracts a YouTube Video ID from varied URL formats or directly.
 */
export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already standard 11-char alphanumeric ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex matching various YouTube URL patterns
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/live\/)([^"&?\/\s]{11})/i,
    /music\.youtube\.com\/watch\?v=([^"&?\/\s]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extracts a YouTube Playlist ID from a URL
 */
export function extractPlaylistId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) return match[1];
  if (/^(?:PL|UU|LL|FL|RD)[a-zA-Z0-9_-]+$/i.test(url.trim())) {
    return url.trim();
  }
  return null;
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
export function formatSeconds(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Parse MM:SS or HH:MM:SS to seconds
 */
export function parseTimeString(timeStr: string): number {
  const parts = timeStr.trim().replace(/[\[\]]/g, '').split(':').map(Number);
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  return 0;
}
