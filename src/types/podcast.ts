export interface PodcastEpisode {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  channelHandle?: string;
  channelAvatar?: string;
  channelUrl?: string;
  category: 'tam-ly-doi-song' | 'phat-trien-ban-than' | 'cong-nghe-ai' | 'kinh-doanh-khoi-nghiep' | 'suc-khoe-khoa-hoc' | 'nghe-thuat-sang-tao';
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  description: string;
  publishedDate?: string;
  views?: string;
  isCustom?: boolean;
  isShort?: boolean;
  seriesTitle?: string;
}

export interface PodcastChannel {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  coverImage?: string;
  subscribers: string;
  youtubeUrl: string;
  description: string;
  episodeCount: number;
}

export interface PodcastNote {
  id: string;
  episodeId: string;
  timestamp: number;
  formattedTime: string;
  content: string;
  createdAt: string;
}

export interface AIAnalysisResult {
  summary?: string;
  chapters?: string;
  quotes?: string;
  qaAnswers?: { question: string; answer: string }[];
}

export interface PodcastSeries {
  playlistId: string;
  title: string;
  url: string;
  episodeCount?: number;
  thumbnail?: string;
}

export interface PodcastPlaylist {
  playlistId: string;
  title: string;
  url: string;
  thumbnail?: string;
}
