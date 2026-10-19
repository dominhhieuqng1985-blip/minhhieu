// Cấu hình VidKraken API v2
// API Key hoạt động chính (có lượt tải khả dụng): 276b76d3-a265-447d-8d32-1bcf2258290c
// API Key dự phòng: f71cd7b5-2fcd-42b4-a4b7-40e6ca96b6ba

export const DEFAULT_VIDKRAKEN_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_VIDKRAKEN_API_KEY) ||
  '276b76d3-a265-447d-8d32-1bcf2258290c';

export const BACKUP_VIDKRAKEN_API_KEYS = [
  '276b76d3-a265-447d-8d32-1bcf2258290c',
  'f71cd7b5-2fcd-42b4-a4b7-40e6ca96b6ba',
];

export const VIDKRAKEN_BASE_URL = 'https://vidkraken.com/api/v2';

export type VidKrakenFormat = '1080' | '720' | '480' | '360' | 'audio' | 'audio-aac' | 'audio-mp3';

export interface VidKrakenFormatOption {
  id: VidKrakenFormat;
  label: string;
  type: 'video' | 'audio';
  badge: string;
  description: string;
}

export const VIDKRAKEN_FORMATS: VidKrakenFormatOption[] = [
  {
    id: '1080',
    label: 'Video 1080p (Full HD)',
    type: 'video',
    badge: '1080p FHD',
    description: 'Độ nét cao nhất, phù hợp xem TV và máy tính',
  },
  {
    id: '720',
    label: 'Video 720p (HD)',
    type: 'video',
    badge: '720p HD',
    description: 'Chất lượng HD chuẩn, tối ưu dung lượng',
  },
  {
    id: '480',
    label: 'Video 480p (SD)',
    type: 'video',
    badge: '480p SD',
    description: 'Chất lượng tiêu chuẩn, tiết kiệm băng thông',
  },
  {
    id: '360',
    label: 'Video 360p',
    type: 'video',
    badge: '360p',
    description: 'Dung lượng nhẹ, phù hợp mạng yếu',
  },
  {
    id: 'audio-mp3',
    label: 'Âm thanh MP3 (Khuyên dùng)',
    type: 'audio',
    badge: 'MP3 Audio',
    description: 'Định dạng phổ biến nhất cho podcast, điện thoại, máy nghe nhạc',
  },
  {
    id: 'audio-aac',
    label: 'Âm thanh AAC',
    type: 'audio',
    badge: 'AAC Audio',
    description: 'Chuẩn âm thanh chất lượng cao Apple / YouTube',
  },
  {
    id: 'audio',
    label: 'Âm thanh Mặc định (WebM/Opus)',
    type: 'audio',
    badge: 'Audio Default',
    description: 'Track âm thanh gốc từ YouTube',
  },
];
