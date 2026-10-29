import { PodcastEpisode } from '../types/podcast';
import {
  DEFAULT_CHANNEL_INFO,
  DEFAULT_VIDEOS,
  DEFAULT_PODCASTS,
  DEFAULT_PODCAST_SERIES,
  DEFAULT_CHANNEL_PLAYLISTS,
} from './minhhieuChannelData';

export interface PodcastCategoryItem {
  id: PodcastEpisode['category'] | 'all';
  label: string;
}

export const PODCAST_CATEGORIES: PodcastCategoryItem[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'tam-ly-doi-song', label: 'Phật Pháp & Đời Sống' },
  { id: 'nghe-thuat-sang-tao', label: 'Review Phim & Kể Chuyện' },
  { id: 'phat-trien-ban-than', label: 'Phát Triển Bản Thân' },
  { id: 'cong-nghe-ai', label: 'Công Nghệ & AI' },
  { id: 'kinh-doanh-khoi-nghiep', label: 'Kinh Doanh' },
  { id: 'suc-khoe-khoa-hoc', label: 'Sức Khỏe & Khoa Học' },
];

export {
  DEFAULT_CHANNEL_INFO,
  DEFAULT_VIDEOS,
  DEFAULT_PODCASTS,
  DEFAULT_PODCAST_SERIES,
  DEFAULT_CHANNEL_PLAYLISTS,
};
