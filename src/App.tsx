/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  Bookmark,
  Heart,
  Radio,
  Plus,
  Play,
  Pause,
  ListMusic,
  Trash2,
  CheckCircle2,
  Clock,
  Compass,
  AlertCircle,
  ExternalLink,
  Tv,
  Film,
  Video,
  Layers,
  Check,
  Bell,
  RefreshCw,
  Loader2,
  ArrowRight,
  PlusCircle,
  Rss,
  Copy,
  Github,
  HelpCircle,
  Download,
  Settings,
} from 'lucide-react';
import { PodcastEpisode, PodcastNote, PodcastSeries, PodcastPlaylist } from './types/podcast';
import { Header } from './components/Header';
import { SidebarLeft } from './components/SidebarLeft';
import { CompanionRightSidebar, ActiveMovieState } from './components/CompanionRightSidebar';
import { MovieDetail, EpisodeData, EpisodeServer, FilterOption } from './types/movie';
import { getCategories } from './utils/movieApi';
import { YouTubePlayer } from './components/YouTubePlayer';
import { CurrentlyPlayingSidebar } from './components/CurrentlyPlayingSidebar';
import { AIPodcastCompanion } from './components/AIPodcastCompanion';
import { TimecodedNotesPanel } from './components/TimecodedNotesPanel';
import { FullPlaylistQueue } from './components/FullPlaylistQueue';
import { ConnectModal } from './components/ConnectModal';
import { AddVideoModal } from './components/AddVideoModal';
import { GithubSyncModal } from './components/GithubSyncModal';
import { ChannelSettingsModal } from './components/ChannelSettingsModal';
import { AdSettingsModal } from './components/AdSettingsModal';
import { VidKrakenDownloader } from './components/VidKrakenDownloader';
import { GlobalYouTubeSearchModal } from './components/GlobalYouTubeSearchModal';
import { TextToSpeechStudio } from './components/TextToSpeechStudio';
import { TikTokDownloaderStudio } from './components/TikTokDownloaderStudio';
import { TikTokVideoPlayer, PlayerErrorBoundary } from './components/TikTokVideoPlayer';
import { MovieCinemaView } from './components/MovieCinemaView';
import { KidsLearningStudio } from './components/KidsLearningStudio';
import {
  isTikTokEpisode,
  isTikTokUrl,
  fetchTikTokVideoData,
  convertTikTokDataToEpisode,
} from './utils/tiktokApi';
import {
  AdcashBanner,
  AdcashVideoSlider,
  AdcashRectangle336x280,
  AdcashRectangle300x250,
  ADCASH_RECTANGLE_336X280_ZONE_ID,
  ADCASH_RECTANGLE_300X250_ZONE_ID,
} from './components/AdcashBanner';
import { formatSeconds } from './utils/youtube';
import {
  checkUrlConfigParam,
  fetchRemoteAdSettings,
  AdSettings,
  WatermarkSettings,
  getStoredAdSettings,
  getStoredWatermarkSettings,
  saveStoredAdSettings,
  saveStoredWatermarkSettings,
} from './types/adConfig';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import {
  DEFAULT_CHANNEL_INFO,
  DEFAULT_VIDEOS,
  DEFAULT_PODCASTS,
  DEFAULT_PODCAST_SERIES,
  DEFAULT_CHANNEL_PLAYLISTS,
} from './data/minhhieuChannelData';
import {
  hasBackend,
  getApiBaseUrl,
  isStaticHost,
  getStaticChannelData,
} from './utils/api';

const STORAGE_KEY_USER_EPISODES = 'casttube_user_episodes_v2';
const STORAGE_KEY_FAVORITES = 'casttube_user_favorites';
const STORAGE_KEY_NOTES = 'casttube_user_notes';
const STORAGE_KEY_SUBS = 'casttube_user_subs';
const STORAGE_KEY_CHANNEL = 'casttube_current_channel_v2';
const STORAGE_KEY_DELETED_VIDEOS = 'casttube_deleted_video_ids_v1';

// Helper to get permanently blacklisted deleted video IDs
export function getBlacklistedDeletedIds(): Set<string> {
  const set = new Set<string>(['bMgyPch3IQs']);
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_DELETED_VIDEOS);
      if (stored) {
        const list: string[] = JSON.parse(stored);
        list.forEach((id) => set.add(id));
      }
    }
  } catch {}
  return set;
}

// Helper: Merge default indexed videos with any user custom/newly saved videos from localStorage, ALWAYS excluding deleted videos
export function getMergedInitialVideos(): PodcastEpisode[] {
  const deletedIds = getBlacklistedDeletedIds();
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('casttube_user_saved_videos');
      if (stored) {
        const custom: PodcastEpisode[] = JSON.parse(stored);
        const cleanedCustom = custom.filter((v) => !deletedIds.has(v.youtubeId) && !deletedIds.has(v.id));
        if (cleanedCustom.length !== custom.length) {
          localStorage.setItem('casttube_user_saved_videos', JSON.stringify(cleanedCustom));
        }
        const defIds = new Set(DEFAULT_VIDEOS.map((v) => v.youtubeId));
        const extra = cleanedCustom.filter((v) => !defIds.has(v.youtubeId));
        const combined = [...extra, ...DEFAULT_VIDEOS].filter((v) => !deletedIds.has(v.youtubeId) && !deletedIds.has(v.id));
        const seen = new Set<string>();
        return combined.filter((v) => {
          if (seen.has(v.youtubeId)) return false;
          seen.add(v.youtubeId);
          return true;
        });
      }
    }
  } catch {}
  return DEFAULT_VIDEOS.filter((v) => !deletedIds.has(v.youtubeId) && !deletedIds.has(v.id));
}

function AppContent() {
  const { isAdmin, requireAdmin, openAdminModal, logout } = useAdminAuth();
  const initialVideos = getMergedInitialVideos();
  const deletedIds = getBlacklistedDeletedIds();
  const initialPodcasts = DEFAULT_PODCASTS.filter((v) => !deletedIds.has(v.youtubeId) && !deletedIds.has(v.id));

  // Channel Profile State
  const [channelInfo, setChannelInfo] = useState<{
    name: string;
    handle: string;
    avatar: string;
    subscribers: string;
    youtubeUrl: string;
    subscribeUrl: string;
  }>({
    name: 'Minh Hiếu review phim',
    handle: '@minhhieureviewphim',
    avatar: 'https://yt3.googleusercontent.com/IAZc3hD-MjzJAtG3Eainm3ueaTvyalzFYEeBqHm-1rkIbUCmIz9--aemFtvSsV-eQIZS0AS0EQ=s900-c-k-c0x00ffffff-no-rj',
    subscribers: 'Kênh YouTube',
    youtubeUrl: 'https://www.youtube.com/@minhhieureviewphim',
    subscribeUrl: 'https://www.youtube.com/@minhhieureviewphim?sub_confirmation=1',
  });

  // Loaded Content Categorized: Videos, Podcasts, Playlists
  const [channelVideos, setChannelVideos] = useState<PodcastEpisode[]>(initialVideos);
  const [channelPodcasts, setChannelPodcasts] = useState<PodcastEpisode[]>(initialPodcasts);
  const [podcastSeries, setPodcastSeries] = useState<PodcastSeries[]>(DEFAULT_PODCAST_SERIES);
  const [selectedPodcastSeries, setSelectedPodcastSeries] = useState<string>('all');
  const [channelPlaylists, setChannelPlaylists] = useState<PodcastPlaylist[]>(DEFAULT_CHANNEL_PLAYLISTS);

  // Active Tab: 'videos' | 'podcasts' | 'playlists'
  const [activeTab, setActiveTab] = useState<'videos' | 'podcasts' | 'playlists'>('videos');
  const [videoFilter, setVideoFilter] = useState<'all' | 'long' | 'shorts'>('all');
  const [videoCounts, setVideoCounts] = useState<{ all: number; long: number; shorts: number }>({
    all: initialVideos.length,
    long: initialVideos.filter((v) => !v.isShort).length,
    shorts: initialVideos.filter((v) => v.isShort).length,
  });

  // Currently Active Playlist being played & its title
  const [activeQueue, setActiveQueue] = useState<PodcastEpisode[]>(initialVideos);
  const [activePlaylistTitle, setActivePlaylistTitle] = useState<string>('Tất cả Video');

  // Current playing episode
  const [currentEpisode, setCurrentEpisode] = useState<PodcastEpisode | null>(initialVideos[0] || null);

  // Auto-play next episode toggle (default: true)
  const [isAutoplayNext, setIsAutoplayNext] = useState<boolean>(true);

  // Loading state for automatic channel fetch
  const [isLoadingChannel, setIsLoadingChannel] = useState<boolean>(false);

  // Auto-sync & check for new YouTube video uploads
  const [isCheckingUpdates, setIsCheckingUpdates] = useState<boolean>(false);
  const [lastCheckedTime, setLastCheckedTime] = useState<string>('Vừa xong');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [newVideosAlert, setNewVideosAlert] = useState<string | null>(null);
  const [isGithubSyncModalOpen, setIsGithubSyncModalOpen] = useState<boolean>(false);
  const [isScanningDeleted, setIsScanningDeleted] = useState<boolean>(false);
  const [isChannelSettingsModalOpen, setIsChannelSettingsModalOpen] = useState<boolean>(false);
  const [isAdSettingsModalOpen, setIsAdSettingsModalOpen] = useState<boolean>(false);
  const [adSettings, setAdSettings] = useState<AdSettings>(getStoredAdSettings);
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>(getStoredWatermarkSettings);

  // Cross-device ad settings initialization
  useEffect(() => {
    checkUrlConfigParam();
    fetchRemoteAdSettings();
  }, []);

  // Auto filter out any videos marked as deleted/removed on YouTube
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DELETED_VIDEOS);
      const list: string[] = stored ? JSON.parse(stored) : [];
      if (!list.includes('bMgyPch3IQs')) {
        list.push('bMgyPch3IQs');
        localStorage.setItem(STORAGE_KEY_DELETED_VIDEOS, JSON.stringify(list));
      }
      const deletedIds = new Set(list);

      // Clean casttube_user_saved_videos
      const customStored = localStorage.getItem('casttube_user_saved_videos');
      if (customStored) {
        const customList: PodcastEpisode[] = JSON.parse(customStored);
        const cleaned = customList.filter((v) => !deletedIds.has(v.youtubeId) && !deletedIds.has(v.id));
        localStorage.setItem('casttube_user_saved_videos', JSON.stringify(cleaned));
      }

      const filterOut = (items: PodcastEpisode[]) =>
        items.filter((v) => !deletedIds.has(v.youtubeId) && !deletedIds.has(v.id));

      setChannelVideos(filterOut);
      setChannelPodcasts(filterOut);
      setActiveQueue(filterOut);
    } catch {}
  }, []);

  // Top URL input for instant channel/playlist loading
  const [urlInput, setUrlInput] = useState<string>('https://www.youtube.com/@minhhieureviewphim');

  // Subscriptions & Favorites & Notes
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SUBS);
      return saved ? JSON.parse(saved) : ['Minh Hiếu review phim'];
    } catch {
      return ['Minh Hiếu review phim'];
    }
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FAVORITES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [notes, setNotes] = useState<PodcastNote[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Navigation & Search
  const [activeNav, setActiveNav] = useState<string>('catalog');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [isAddVideoModalOpen, setIsAddVideoModalOpen] = useState<boolean>(false);
  const [isGlobalSearchModalOpen, setIsGlobalSearchModalOpen] = useState<boolean>(false);

  // 3-Column Layout States: Right sidebar defaults to HIDDEN (user request)
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(false);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState<boolean>(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(false);

  // Movie category & selection from sidebar
  const [movieTab, setMovieTab] = useState<string>('latest');
  const [movieGenreSlug, setMovieGenreSlug] = useState<string>('hanh-dong');
  const [movieActorSlug, setMovieActorSlug] = useState<string>('');
  const [movieCategories, setMovieCategories] = useState<FilterOption[]>([]);

  // Active movie being played (for sync with right sidebar & universal player)
  const [activeMovieState, setActiveMovieState] = useState<ActiveMovieState | null>(null);

  useEffect(() => {
    getCategories()
      .then((cats) => {
        if (Array.isArray(cats) && cats.length > 0) {
          setMovieCategories(cats);
        }
      })
      .catch(() => {});
  }, []);

  // Global search shortcut (Ctrl+K or ⌘K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Player seeking orchestration
  const [seekTargetTime, setSeekTargetTime] = useState<number | null>(null);
  const [playerCurrentSeconds, setPlayerCurrentSeconds] = useState<number>(0);

  // Player companion tab: 'queue' (Danh sách phát) | 'ai' (Trợ lý AI) | 'notes' (Ghi chú) | 'download' (Tải VidKraken)
  const [playerSidebarTab, setPlayerSidebarTab] = useState<'queue' | 'ai' | 'notes' | 'download'>('queue');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Local Channel Data Loader (Used for static hosts like GitHub Pages)
  const applyLocalChannelData = () => {
    const deletedIds = getBlacklistedDeletedIds();
    const allVids = getMergedInitialVideos().filter((v) => !deletedIds.has(v.youtubeId) && !deletedIds.has(v.id));
    const cleanPodcasts = DEFAULT_PODCASTS.filter((v) => !deletedIds.has(v.youtubeId) && !deletedIds.has(v.id));
    setChannelInfo(DEFAULT_CHANNEL_INFO);
    setChannelVideos(allVids);
    setChannelPodcasts(cleanPodcasts);
    setChannelPlaylists(DEFAULT_CHANNEL_PLAYLISTS);
    setPodcastSeries(DEFAULT_PODCAST_SERIES);
    setActiveQueue(allVids);
    if (allVids.length > 0) {
      setCurrentEpisode(allVids[0]);
    }
    setVideoCounts({
      all: allVids.length,
      long: allVids.filter((v) => !v.isShort).length,
      shorts: allVids.filter((v) => v.isShort).length,
    });
    const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setLastCheckedTime(nowTime);
  };

  // User manually adds a video, Shorts, or TikTok video via URL
  const handleAddCustomVideo = (rawEp: PodcastEpisode) => {
    const newEp: PodcastEpisode = {
      ...rawEp,
      id: String(rawEp.id || `custom-${Date.now()}`),
      youtubeId: String(rawEp.youtubeId || rawEp.id || Date.now()),
      title: String(rawEp.title || 'Video mới'),
      channel: String(rawEp.channel || 'Minh Hiếu TuBe'),
      description: String(rawEp.description || ''),
      duration: String(rawEp.duration || '00:30'),
      thumbnail: String(rawEp.thumbnail || ''),
    };

    // Ensure re-added custom video is removed from deleted blacklist if it was previously deleted
    try {
      const delStored = localStorage.getItem(STORAGE_KEY_DELETED_VIDEOS);
      if (delStored) {
        const delList: string[] = JSON.parse(delStored);
        const filteredDel = delList.filter((id) => id !== newEp.youtubeId && id !== newEp.id);
        if (filteredDel.length !== delList.length) {
          localStorage.setItem(STORAGE_KEY_DELETED_VIDEOS, JSON.stringify(filteredDel));
        }
      }
    } catch {}

    setChannelVideos((prev) => {
      const filtered = prev.filter((v) => v.youtubeId !== newEp.youtubeId);
      const nextList = [newEp, ...filtered];
      try {
        const stored = localStorage.getItem('casttube_user_saved_videos');
        const customList: PodcastEpisode[] = stored ? JSON.parse(stored) : [];
        const nextCustom = [newEp, ...customList.filter((v) => v.youtubeId !== newEp.youtubeId)];
        localStorage.setItem('casttube_user_saved_videos', JSON.stringify(nextCustom.slice(0, 50)));
      } catch {}
      return nextList;
    });

    setActiveQueue((prev) => [newEp, ...prev.filter((v) => v.youtubeId !== newEp.youtubeId)]);
    setCurrentEpisode(newEp);

    setVideoCounts((prev) => ({
      all: prev.all + 1,
      long: prev.long + (newEp.isShort ? 0 : 1),
      shorts: prev.shorts + (newEp.isShort ? 1 : 0),
    }));

    showToast(`🎉 Đã thêm & phát ngay: "${newEp.title}"!`);
  };

  // AUTOMATIC INITIAL FETCH ON STARTUP:
  // Automatically loads all videos, shorts, podcasts, and playlists of @minhhieureviewphim (and supports TikTok video URLs!)
  const fetchFullChannelData = async (targetUrl = 'https://www.youtube.com/@minhhieureviewphim') => {
    const trimmedUrl = targetUrl.trim();
    if (!trimmedUrl) return;

    // Direct TikTok video URL pasted in top bar -> resolve & play in dedicated TikTokVideoPlayer!
    if (isTikTokUrl(trimmedUrl)) {
      setIsLoadingChannel(true);
      try {
        const tkData = await fetchTikTokVideoData(trimmedUrl);
        const tkEpisode = convertTikTokDataToEpisode(tkData, trimmedUrl);
        handleAddCustomVideo(tkEpisode);
        setTimeout(() => {
          document.getElementById('player-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } catch (err: any) {
        showToast(`⚠️ Không thể đọc link TikTok: ${err?.message || 'Vui lòng kiểm tra lại link'}`);
      } finally {
        setIsLoadingChannel(false);
      }
      return;
    }

    setIsLoadingChannel(true);

    // If running on GitHub Pages without configured remote backend:
    // Instantly use pre-indexed channel data with ZERO network 404 errors!
    if (!hasBackend()) {
      applyLocalChannelData();
      setIsLoadingChannel(false);
      showToast(`Đã nạp toàn bộ ${DEFAULT_VIDEOS.length} video chính thức của kênh Minh Hiếu review phim.`);
      return;
    }

    try {
      const apiBase = getApiBaseUrl();
      if (!apiBase) {
        applyLocalChannelData();
        return;
      }

      const response = await fetch(`${apiBase}podcast/channel-full?url=${encodeURIComponent(targetUrl)}`);

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || contentType.includes('text/html')) {
        throw new Error(`Endpoint trả về status ${response.status} (GitHub Pages static)`);
      }

      const data = await response.json();

      // Update Channel Info
      if (data.channel) {
        setChannelInfo(data.channel);
      }

      const deletedIds = getBlacklistedDeletedIds();

      // Format Videos (all videos, excluding any permanently deleted on YouTube)
      const formattedVideos: PodcastEpisode[] = (data.videos || [])
        .filter((v: any) => !deletedIds.has(v.youtubeId) && !deletedIds.has(v.id))
        .map((v: any, idx: number) => ({
          id: `v-${idx}-${v.youtubeId}`,
          youtubeId: v.youtubeId,
          title: v.title,
          channel: v.channel || data.channel?.name || 'Minh Hiếu review phim',
          channelAvatar: v.channelAvatar || data.channel?.avatar,
          category: 'phat-trien-ban-than',
          duration: v.duration,
          durationSeconds: v.isShort ? 60 : 600,
          thumbnail: v.thumbnail,
          description: v.isShort
            ? `Shorts từ kênh ${data.channel?.name || 'Minh Hiếu review phim'}`
            : `Video #${idx + 1} từ kênh ${data.channel?.name || 'Minh Hiếu review phim'}`,
          publishedDate: v.isShort ? 'YouTube Shorts' : 'Video chính thức',
          isShort: v.isShort,
        }));

      // Format Podcasts (excluding any permanently deleted)
      const formattedPodcasts: PodcastEpisode[] = (data.podcasts || [])
        .filter((p: any) => !deletedIds.has(p.youtubeId) && !deletedIds.has(p.id))
        .map((p: any, idx: number) => ({
          id: `p-${idx}-${p.youtubeId}`,
          youtubeId: p.youtubeId,
          title: p.title,
          channel: p.channel || data.channel?.name || 'Minh Hiếu review phim',
          channelAvatar: p.channelAvatar || data.channel?.avatar,
          category: 'phat-trien-ban-than',
          duration: p.duration,
          durationSeconds: 900,
          thumbnail: p.thumbnail,
          description: p.seriesTitle ? `Series Podcast: ${p.seriesTitle}` : `Tập podcast từ ${data.channel?.name}`,
          publishedDate: p.seriesTitle || 'Podcast',
          seriesTitle: p.seriesTitle,
        }));

      const longCount = data.longVideosCount || formattedVideos.filter((v) => !v.isShort).length;
      const shortsCount = data.shortsCount || formattedVideos.filter((v) => v.isShort).length;

      setVideoCounts({
        all: formattedVideos.length,
        long: longCount,
        shorts: shortsCount,
      });

      setChannelVideos(formattedVideos);
      setChannelPodcasts(formattedPodcasts);
      setChannelPlaylists(data.playlists || []);
      if (data.podcastSeries) {
        setPodcastSeries(data.podcastSeries);
      }

      // Auto-route tabs based on targetUrl
      if (targetUrl.includes('/podcasts')) {
        setActiveTab('podcasts');
        setActiveQueue(formattedPodcasts);
        setActivePlaylistTitle('Toàn bộ Podcasts');
        if (formattedPodcasts.length > 0) setCurrentEpisode(formattedPodcasts[0]);
      } else if (targetUrl.includes('/playlists')) {
        setActiveTab('playlists');
      } else {
        setActiveTab('videos');
        setActiveQueue(formattedVideos);
        setActivePlaylistTitle('Tất cả Video');
        if (formattedVideos.length > 0) {
          setCurrentEpisode(formattedVideos[0]);
        }
      }

      const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setLastCheckedTime(nowTime);

      showToast(
        `Đã tải đầy đủ toàn bộ ${formattedVideos.length} video (${longCount} video dài + ${shortsCount} Shorts) của kênh!`
      );
    } catch (err: any) {
      console.warn('Backend API chưa sẵn sàng trên GitHub Pages, tự động nạp thư viện video kênh:', err);
      applyLocalChannelData();
      showToast(`Đã nạp ${DEFAULT_VIDEOS.length} video của kênh Minh Hiếu review phim.`);
      // Tự động kiểm tra studo.xml cho GitHub Pages
      setTimeout(() => {
        checkForNewVideos(false);
      }, 300);
    } finally {
      setIsLoadingChannel(false);
    }
  };

  // CHECK AND AUTO-SYNC NEW VIDEOS FROM YOUTUBE:
  // Detects if any new video or short was uploaded to YouTube (via backend or client-side RSS)
  const checkForNewVideos = async (isManual = false) => {
    setIsCheckingUpdates(true);

    // 1. Try Backend API if available
    if (hasBackend()) {
      try {
        const apiBase = getApiBaseUrl();
        if (apiBase) {
          const res = await fetch(
            `${apiBase}podcast/check-updates?url=https://www.youtube.com/@minhhieureviewphim&_nocache=${Date.now()}`
          );
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && !contentType.includes('text/html')) {
            const data = await res.json();
            if (data.success && Array.isArray(data.latestVideos)) {
              const deletedIds = getBlacklistedDeletedIds();
              const existingIds = new Set(channelVideos.map((v) => v.youtubeId));
              const newlyFound = data.latestVideos.filter((v: any) => !existingIds.has(v.youtubeId) && !deletedIds.has(v.youtubeId));

              if (newlyFound.length > 0) {
                const formattedNew: PodcastEpisode[] = newlyFound.map((v: any, idx: number) => ({
                  id: `new-${Date.now()}-${idx}-${v.youtubeId}`,
                  youtubeId: v.youtubeId,
                  title: v.title,
                  channel: v.channel || channelInfo.name,
                  category: 'tam-ly-doi-song',
                  duration: v.duration || (v.isShort ? '00:60' : '03:30'),
                  durationSeconds: v.isShort ? 60 : 210,
                  thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`,
                  description: `Video mới cập nhật từ kênh ${channelInfo.name}`,
                  publishedDate: 'Mới tải lên',
                  isShort: v.isShort,
                }));

                setChannelVideos((prev) => [...formattedNew, ...prev]);
                if (activeTab === 'videos') {
                  setActiveQueue((prev) => [...formattedNew, ...prev]);
                }

                const newLongs = formattedNew.filter((v) => !v.isShort).length;
                const newShorts = formattedNew.filter((v) => v.isShort).length;

                setVideoCounts((prev) => ({
                  all: prev.all + formattedNew.length,
                  long: prev.long + newLongs,
                  shorts: prev.shorts + newShorts,
                }));

                try {
                  const stored = localStorage.getItem('casttube_user_saved_videos');
                  const customList = stored ? JSON.parse(stored) : [];
                  const cleanCustom = customList.filter((v: any) => !deletedIds.has(v.youtubeId) && !deletedIds.has(v.id));
                  localStorage.setItem('casttube_user_saved_videos', JSON.stringify([...formattedNew, ...cleanCustom].slice(0, 50)));
                } catch {}

                const alertMsg = `Đã phát hiện và nạp ${formattedNew.length} video mới: "${formattedNew[0].title}"!`;
                setNewVideosAlert(alertMsg);
                showToast(`🎉 ${alertMsg}`);
                const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                setLastCheckedTime(nowStr);
                setIsCheckingUpdates(false);
                return;
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('Backend API update check skipped, trying client-side fallback...');
      }
    }

    // 2. Client-Side Check: Check studo.xml directly on GitHub Pages (Zero CORS issues!)
    try {
      const studoUrls = ['./studo.xml', '/minhhieu/studo.xml'];
      let xmlFeed = '';
      for (const sUrl of studoUrls) {
        try {
          const res = await fetch(`${sUrl}?_nocache=${Date.now()}`);
          if (res.ok) {
            const txt = await res.text();
            if (txt && txt.includes('<item>')) {
              xmlFeed = txt;
              break;
            }
          }
        } catch {}
      }

      if (xmlFeed) {
        const deletedIds = getBlacklistedDeletedIds();
        const items = xmlFeed.split('<item>');
        const existingIds = new Set(channelVideos.map((v) => v.youtubeId));
        const foundFromXml: PodcastEpisode[] = [];

        for (let i = 1; i < items.length; i++) {
          const itemText = items[i];
          const guidM = itemText.match(/<guid[^>]*>(.*?)<\/guid>/);
          const titleM = itemText.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
          const durM = itemText.match(/<itunes:duration>(.*?)<\/itunes:duration>/);
          const imgM = itemText.match(/<itunes:image href="([^"]+)"/);
          const descM = itemText.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);

          if (guidM && titleM) {
            const rawYId = guidM[1].trim();
            const match11 = rawYId.match(/([a-zA-Z0-9_-]{11})$/);
            const yId = (match11 && match11[1].length === 11) ? match11[1] : rawYId;
            if (!existingIds.has(yId) && !deletedIds.has(yId) && !deletedIds.has(rawYId)) {
              const t = titleM[1].trim();
              const dur = durM ? durM[1].trim() : '03:30';
              const isShort = t.toLowerCase().includes('#shorts') || dur === '00:60' || dur === '0:60';
              foundFromXml.push({
                id: `studo-${Date.now()}-${i}-${yId}`,
                youtubeId: yId,
              title: t,
              channel: 'Minh Hiếu review phim',
              category: t.includes('đức phật') ? 'tam-ly-doi-song' : 'nghe-thuat-sang-tao',
              duration: dur,
              durationSeconds: isShort ? 60 : 210,
              thumbnail: imgM ? imgM[1] : `https://i.ytimg.com/vi/${yId}/hqdefault.jpg`,
              description: descM ? descM[1].trim() : `Tập podcast từ kênh Minh Hiếu review phim`,
              publishedDate: 'Mới cập nhật từ studo.xml',
              isShort,
            });
          }
        }
      }

        if (foundFromXml.length > 0) {
          setChannelVideos((prev) => [...foundFromXml, ...prev]);
          if (activeTab === 'videos') {
            setActiveQueue((prev) => [...foundFromXml, ...prev]);
          }

          const newLongs = foundFromXml.filter((v) => !v.isShort).length;
          const newShorts = foundFromXml.filter((v) => v.isShort).length;
          setVideoCounts((prev) => ({
            all: prev.all + foundFromXml.length,
            long: prev.long + newLongs,
            shorts: prev.shorts + newShorts,
          }));

          try {
            const stored = localStorage.getItem('casttube_user_saved_videos');
            const customList = stored ? JSON.parse(stored) : [];
            const cleanCustom = customList.filter((v: any) => !deletedIds.has(v.youtubeId) && !deletedIds.has(v.id));
            localStorage.setItem('casttube_user_saved_videos', JSON.stringify([...foundFromXml, ...cleanCustom].slice(0, 50)));
          } catch {}

          const alertMsg = `Đã đồng bộ ${foundFromXml.length} video mới nhất từ studo.xml: "${foundFromXml[0].title}"!`;
          setNewVideosAlert(alertMsg);
          showToast(`🎉 ${alertMsg}`);
          const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          setLastCheckedTime(nowStr);
          setIsCheckingUpdates(false);
          return;
        }
      }
    } catch {}

    // 3. Fallback: Check YouTube official RSS feed via CORS proxies
    try {
      const rssFeed = `https://www.youtube.com/feeds/videos.xml?channel_id=UCUr78N1iiRNyg_UoBgtPPhw&_nocache=${Date.now()}`;
      const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(rssFeed)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rssFeed)}`,
      ];

      let xml = '';
      for (const pUrl of proxies) {
        try {
          const controller = new AbortController();
          const tId = setTimeout(() => controller.abort(), 3500);
          const pRes = await fetch(pUrl, { signal: controller.signal });
          clearTimeout(tId);
          if (pRes.ok) {
            const txt = await pRes.text();
            if (txt && txt.includes('<entry>')) {
              xml = txt;
              break;
            }
          }
        } catch {}
      }

      if (xml) {
        const deletedIds = getBlacklistedDeletedIds();
        const entries = xml.split('<entry>');
        const existingIds = new Set(channelVideos.map((v) => v.youtubeId));
        const foundNew: { id: string; title: string }[] = [];

        for (let i = 1; i < entries.length; i++) {
          const e = entries[i];
          const idM = e.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
          const titleM = e.match(/<title>(.*?)<\/title>/);
          if (idM && titleM && !existingIds.has(idM[1]) && !deletedIds.has(idM[1])) {
            foundNew.push({ id: idM[1], title: titleM[1] });
          }
        }

        if (foundNew.length > 0) {
          const formattedRss: PodcastEpisode[] = foundNew.map((item, idx) => {
            const isShort = item.title.toLowerCase().includes('#shorts') || item.title.toLowerCase().includes('video ngắn');
            return {
              id: `rss-${Date.now()}-${idx}-${item.id}`,
              youtubeId: item.id,
              title: item.title,
              channel: 'Minh Hiếu review phim',
              category: item.title.includes('đức phật') ? 'tam-ly-doi-song' : 'nghe-thuat-sang-tao',
              duration: isShort ? '00:60' : '03:30',
              durationSeconds: isShort ? 60 : 210,
              thumbnail: `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
              description: `Video mới cập nhật từ kênh Minh Hiếu review phim.`,
              publishedDate: 'Vừa tải lên',
              isShort,
            };
          });

          setChannelVideos((prev) => [...formattedRss, ...prev]);
          if (activeTab === 'videos') {
            setActiveQueue((prev) => [...formattedRss, ...prev]);
          }

          const newLongs = formattedRss.filter((v) => !v.isShort).length;
          const newShorts = formattedRss.filter((v) => v.isShort).length;
          setVideoCounts((prev) => ({
            all: prev.all + formattedRss.length,
            long: prev.long + newLongs,
            shorts: prev.shorts + newShorts,
          }));

          try {
            const stored = localStorage.getItem('casttube_user_saved_videos');
            const customList = stored ? JSON.parse(stored) : [];
            const cleanCustom = customList.filter((v: any) => !deletedIds.has(v.youtubeId) && !deletedIds.has(v.id));
            localStorage.setItem('casttube_user_saved_videos', JSON.stringify([...formattedRss, ...cleanCustom].slice(0, 50)));
          } catch {}

          const alertMsg = `Đã phát hiện và nạp ${formattedRss.length} video mới: "${formattedRss[0].title}"!`;
          setNewVideosAlert(alertMsg);
          showToast(`🎉 ${alertMsg}`);
          const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          setLastCheckedTime(nowStr);
          setIsCheckingUpdates(false);
          return;
        }
      }
    } catch {}

    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setLastCheckedTime(nowStr);
    setIsCheckingUpdates(false);
    if (isManual) {
      showToast(`✅ Đã kiểm tra: Kênh có đầy đủ ${channelVideos.length} video mới nhất!`);
    }
  };

  // Initial fetch on mount + background check for removed YouTube videos
  useEffect(() => {
    fetchFullChannelData('https://www.youtube.com/@minhhieureviewphim');
    const scanTimer = setTimeout(() => {
      handleScanDeletedVideos();
    }, 3500);
    return () => clearTimeout(scanTimer);
  }, []);

  // Periodic Auto-Check every 90 seconds (1.5 minutes)
  useEffect(() => {
    if (!autoSyncEnabled) return;
    const timer = setInterval(() => {
      checkForNewVideos(false);
    }, 90000);
    return () => clearInterval(timer);
  }, [autoSyncEnabled, channelVideos]);

  // Persist subscriptions & favorites
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SUBS, JSON.stringify(subscribedChannels));
    } catch {}
  }, [subscribedChannels]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
    } catch {}
  }, [notes]);

  // Playlist Navigation: Next & Previous in active queue
  const currentIndex = activeQueue.findIndex((e) => e.youtubeId === currentEpisode?.youtubeId);
  const hasNextEpisode = currentIndex >= 0 && currentIndex < activeQueue.length - 1;
  const hasPrevEpisode = currentIndex > 0;

  // AUTOMATICALLY PLAY NEXT EPISODE IN PLAYLIST
  const handleNextEpisode = () => {
    if (hasNextEpisode) {
      const nextEp = activeQueue[currentIndex + 1];
      setCurrentEpisode(nextEp);
      showToast(`Tự động phát tập #${currentIndex + 2}: ${nextEp.title}`);
    } else if (activeQueue.length > 0) {
      // Loop back to start if at end
      const firstEp = activeQueue[0];
      setCurrentEpisode(firstEp);
      showToast(`Lặp lại từ đầu danh sách tập #1: ${firstEp.title}`);
    }
  };

  const handlePrevEpisode = () => {
    if (hasPrevEpisode) {
      const prevEp = activeQueue[currentIndex - 1];
      setCurrentEpisode(prevEp);
      showToast(`Phát tập #${currentIndex}: ${prevEp.title}`);
    }
  };

  // Called when YouTube player finishes playing current video
  const handleEpisodeEnded = () => {
    if (isAutoplayNext) {
      handleNextEpisode();
    }
  };

  const handlePlayEpisode = (episode: PodcastEpisode) => {
    setCurrentEpisode(episode);
    document.getElementById('player-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Play a specific playlist
  const handlePlaySpecificPlaylist = async (playlistUrl: string, playlistTitle: string) => {
    showToast(`Đang tải toàn bộ video trong danh sách phát "${playlistTitle}"...`);

    if (!hasBackend()) {
      // Find matching items from local videos or series
      const matched = channelVideos.filter(
        (v) => v.seriesTitle === playlistTitle || (!v.isShort && String(v.description || '').includes(playlistTitle))
      );
      const epsToPlay = matched.length > 0 ? matched : channelVideos.slice(0, 15);
      setActiveQueue(epsToPlay);
      setActivePlaylistTitle(playlistTitle);
      if (epsToPlay.length > 0) setCurrentEpisode(epsToPlay[0]);
      setPlayerSidebarTab('queue');
      showToast(`Đang phát danh sách "${playlistTitle}" (${epsToPlay.length} video)`);
      document.getElementById('player-workspace')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    try {
      const apiBase = getApiBaseUrl();
      if (!apiBase) return;
      const res = await fetch(`${apiBase}podcast/playlist?url=${encodeURIComponent(playlistUrl)}`);
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || contentType.includes('text/html')) {
        throw new Error('Chế độ tĩnh GitHub Pages');
      }
      const data = await res.json();
      if (data.episodes && data.episodes.length > 0) {
        const eps: PodcastEpisode[] = data.episodes.map((v: any, idx: number) => ({
          id: `pl-${idx}-${v.youtubeId}`,
          youtubeId: v.youtubeId,
          title: v.title,
          channel: v.channel || channelInfo.name,
          category: 'phat-trien-ban-than',
          duration: v.duration,
          durationSeconds: 600,
          thumbnail: v.thumbnail,
          description: `Danh sách phát: ${playlistTitle}`,
          publishedDate: playlistTitle,
          seriesTitle: playlistTitle,
        }));
        setActiveQueue(eps);
        setActivePlaylistTitle(playlistTitle);
        setCurrentEpisode(eps[0]);
        setPlayerSidebarTab('queue');
        showToast(`Đang phát danh sách "${playlistTitle}" (${eps.length} video)`);
        document.getElementById('player-workspace')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    } catch {
      // Fallback cho GitHub Pages
      const fallbackEps = channelVideos.slice(0, 10).map((v, idx) => ({
        ...v,
        id: `pl-fb-${idx}-${v.youtubeId}`,
        seriesTitle: playlistTitle,
        description: `Danh sách phát: ${playlistTitle}`,
      }));
      setActiveQueue(fallbackEps);
      setActivePlaylistTitle(playlistTitle);
      if (fallbackEps.length > 0) setCurrentEpisode(fallbackEps[0]);
      setPlayerSidebarTab('queue');
      showToast(`Đang phát danh sách "${playlistTitle}" (${fallbackEps.length} video)`);
      document.getElementById('player-workspace')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Switch queue source directly: all channel videos, specific series, or playlist
  const handleSelectQueueSource = (type: 'videos' | 'series' | 'playlist', idOrTitle?: string) => {
    if (type === 'videos') {
      setActiveTab('videos');
      setActiveQueue(channelVideos);
      setActivePlaylistTitle('Tất cả Video');
      if (channelVideos.length > 0) setCurrentEpisode(channelVideos[0]);
      showToast(`Đang phát: Toàn bộ ${channelVideos.length} Video kênh`);
    } else if (type === 'series' && idOrTitle) {
      const eps = channelPodcasts.filter((p) => p.seriesTitle === idOrTitle);
      if (eps.length > 0) {
        setActiveTab('podcasts');
        setSelectedPodcastSeries(idOrTitle);
        setActiveQueue(eps);
        setActivePlaylistTitle(idOrTitle);
        setCurrentEpisode(eps[0]);
        showToast(`Đang phát trọn bộ Podcast: "${idOrTitle}" (${eps.length} tập)`);
      } else {
        showToast(`Không tìm thấy tập nào trong series "${idOrTitle}"`);
      }
    } else if (type === 'playlist' && idOrTitle) {
      const pl = channelPlaylists.find((p) => p.playlistId === idOrTitle);
      if (pl) {
        handlePlaySpecificPlaylist(pl.url, pl.title);
      }
    }
    setPlayerSidebarTab('queue');
    document.getElementById('player-workspace')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Switch tabs (Videos vs Podcasts vs Playlists)
  const handleTabChange = (tab: 'videos' | 'podcasts' | 'playlists') => {
    setActiveTab(tab);
    if (tab === 'videos') {
      setActiveQueue(channelVideos);
      setActivePlaylistTitle('Tất cả Video');
      if (channelVideos.length > 0 && (!currentEpisode || !channelVideos.some((v) => v.youtubeId === currentEpisode.youtubeId))) {
        setCurrentEpisode(channelVideos[0]);
      }
    } else if (tab === 'podcasts') {
      setActiveQueue(channelPodcasts);
      setActivePlaylistTitle('Toàn bộ Podcasts');
      if (channelPodcasts.length > 0 && (!currentEpisode || !channelPodcasts.some((p) => p.youtubeId === currentEpisode.youtubeId))) {
        setCurrentEpisode(channelPodcasts[0]);
      }
    }
  };

  const handleToggleSubscribe = (channelName: string) => {
    setSubscribedChannels((prev) => {
      const isSub = prev.includes(channelName);
      if (isSub) {
        showToast(`Đã hủy đăng ký kênh ${channelName}`);
        return prev.filter((c) => c !== channelName);
      } else {
        showToast(`Đã đăng ký kênh YouTube: ${channelName}!`);
        return [...prev, channelName];
      }
    });
  };

  const handleToggleFavorite = (episodeId: string) => {
    setFavorites((prev) => {
      const isFav = prev.includes(episodeId);
      if (isFav) {
        showToast('Đã xóa khỏi danh sách yêu thích');
        return prev.filter((id) => id !== episodeId);
      } else {
        showToast('Đã thêm vào danh sách yêu thích');
        return [...prev, episodeId];
      }
    });
  };

  // Permanently delete video from the entire application and blacklist its ID
  const handlePermanentlyDeleteVideo = (targetId: string, youtubeId?: string) => {
    const ep =
      channelVideos.find((v) => v.id === targetId || v.youtubeId === targetId || (youtubeId && v.youtubeId === youtubeId)) ||
      channelPodcasts.find((v) => v.id === targetId || v.youtubeId === targetId || (youtubeId && v.youtubeId === youtubeId)) ||
      activeQueue.find((v) => v.id === targetId || v.youtubeId === targetId || (youtubeId && v.youtubeId === youtubeId)) ||
      DEFAULT_VIDEOS.find((v) => v.id === targetId || v.youtubeId === targetId || (youtubeId && v.youtubeId === youtubeId));

    const rawYId = youtubeId || ep?.youtubeId || targetId;
    const match11 = rawYId.match(/([a-zA-Z0-9_-]{11})$/);
    const resolvedYId = (match11 && match11[1].length === 11) ? match11[1] : rawYId;
    const targetTitle = ep?.title || resolvedYId;

    // 1. Permanently blacklist this YouTube video ID in localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DELETED_VIDEOS);
      const list: string[] = stored ? JSON.parse(stored) : [];
      [resolvedYId, rawYId, targetId].forEach((id) => {
        if (id && !list.includes(id)) {
          list.push(id);
        }
      });
      localStorage.setItem(STORAGE_KEY_DELETED_VIDEOS, JSON.stringify(list));

      // 2. Remove permanently from custom saved videos
      const customStored = localStorage.getItem('casttube_user_saved_videos');
      if (customStored) {
        const customList: PodcastEpisode[] = JSON.parse(customStored);
        const cleaned = customList.filter(
          (v) => v.youtubeId !== resolvedYId && v.youtubeId !== rawYId && v.id !== targetId
        );
        localStorage.setItem('casttube_user_saved_videos', JSON.stringify(cleaned));
      }
    } catch {}

    // 3. Remove permanently from all state lists
    const isTarget = (v: PodcastEpisode) =>
      v.id === targetId || v.youtubeId === resolvedYId || v.youtubeId === rawYId || (youtubeId && v.youtubeId === youtubeId);

    setChannelVideos((prev) => prev.filter((v) => !isTarget(v)));
    setChannelPodcasts((prev) => prev.filter((v) => !isTarget(v)));
    setActiveQueue((prev) => prev.filter((v) => !isTarget(v)));

    // Update counts
    setVideoCounts((prev) => ({
      all: Math.max(0, prev.all - 1),
      long: ep?.isShort ? prev.long : Math.max(0, prev.long - 1),
      shorts: ep?.isShort ? Math.max(0, prev.shorts - 1) : prev.shorts,
    }));

    // If currently playing, move to next
    if (currentEpisode && isTarget(currentEpisode)) {
      handleNextEpisode();
    }

    showToast(`🗑️ Đã xóa vĩnh viễn video "${targetTitle}" khỏi danh sách!`);
  };

  const handleRemoveFromQueue = (episodeId: string, youtubeId?: string) => {
    handlePermanentlyDeleteVideo(episodeId, youtubeId);
  };

  const handleSaveNote = (timestamp: number, text: string) => {
    if (!currentEpisode) return;
    const newNote: PodcastNote = {
      id: `note-${Date.now()}`,
      episodeId: currentEpisode.id,
      timestamp,
      formattedTime: formatSeconds(timestamp),
      content: text,
      createdAt: new Date().toLocaleDateString('vi-VN'),
    };
    setNotes((prev) => [newNote, ...prev]);
    showToast(`Đã lưu ghi chú tại mốc [${newNote.formattedTime}]`);
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    showToast('Đã xóa ghi chú');
  };

  const handleSeek = (seconds: number) => {
    setSeekTargetTime(seconds);
  };

  // Automatically delete videos that are no longer available on YouTube
  const handleVideoUnavailable = (episodeId: string, youtubeId: string, reason: string) => {
    handlePermanentlyDeleteVideo(episodeId, youtubeId);
    showToast(`⚠️ Đã tự động loại bỏ video đã bị xóa trên YouTube! (${reason})`);
  };

  // Scan and clean up deleted videos from the entire channel (ONLY checks 11-char YouTube IDs, never TikTok videos!)
  const handleScanDeletedVideos = async () => {
    setIsScanningDeleted(true);
    showToast('🔍 Đang kiểm tra trạng thái video trên YouTube...');

    const deletedFound: string[] = [];
    const youtubeOnlyVideos = channelVideos.filter(
      (v) => !isTikTokEpisode(v) && /^[a-zA-Z0-9_-]{11}$/.test(String(v.youtubeId || ''))
    );
    const allIds = youtubeOnlyVideos.map((v) => v.youtubeId);

    // Try backend API first for fast bulk checking
    let checkedViaApi = false;
    try {
      const apiBase = getApiBaseUrl();
      if (apiBase && allIds.length > 0) {
        const res = await fetch(`${apiBase}youtube/check-alive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: allIds }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.dead)) {
            deletedFound.push(...data.dead);
            checkedViaApi = true;
          }
        }
      }
    } catch {}

    // Fallback: check client-side via noembed
    if (!checkedViaApi && youtubeOnlyVideos.length > 0) {
      const batch = youtubeOnlyVideos.slice(0, 30);
      for (const v of batch) {
        try {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 2000);
          const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${v.youtubeId}`, {
            signal: controller.signal,
          });
          clearTimeout(t);
          if (res.ok) {
            const json = await res.json();
            if (json.error || !json.title) {
              deletedFound.push(v.youtubeId);
            }
          }
        } catch {}
      }
    }

    if (deletedFound.length > 0) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_DELETED_VIDEOS);
        const list: string[] = stored ? JSON.parse(stored) : [];
        const merged = Array.from(new Set([...list, ...deletedFound]));
        localStorage.setItem(STORAGE_KEY_DELETED_VIDEOS, JSON.stringify(merged));

        const customStored = localStorage.getItem('casttube_user_saved_videos');
        if (customStored) {
          const customList: PodcastEpisode[] = JSON.parse(customStored);
          const cleaned = customList.filter((v) => !deletedFound.includes(v.youtubeId));
          localStorage.setItem('casttube_user_saved_videos', JSON.stringify(cleaned));
        }
      } catch {}

      setChannelVideos((prev) => prev.filter((v) => !deletedFound.includes(v.youtubeId)));
      setChannelPodcasts((prev) => prev.filter((p) => !deletedFound.includes(p.youtubeId)));
      setActiveQueue((prev) => prev.filter((p) => !deletedFound.includes(p.youtubeId)));

      showToast(`🗑️ Đã xóa ${deletedFound.length} video không còn tồn tại trên YouTube!`);
    } else {
      showToast('✅ Tất cả video trên kênh đều hoạt động bình thường trên YouTube!');
    }

    setIsScanningDeleted(false);
  };

  // Filter episodes based on activeTab, videoFilter, selectedPodcastSeries, search, and favorites
  const filteredQueue = (() => {
    let list = activeQueue;
    if (activeTab === 'videos') {
      if (videoFilter === 'long') {
        list = channelVideos.filter((v) => !v.isShort);
      } else if (videoFilter === 'shorts') {
        list = channelVideos.filter((v) => v.isShort);
      } else {
        list = channelVideos;
      }
    } else if (activeTab === 'podcasts') {
      if (selectedPodcastSeries !== 'all') {
        list = channelPodcasts.filter((p) => p.seriesTitle === selectedPodcastSeries);
      } else {
        list = channelPodcasts;
      }
    }
    const q = searchQuery.toLowerCase();
    return list.filter((ep) => {
      const matchesSearch =
        String(ep.title || '').toLowerCase().includes(q) ||
        String(ep.channel || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (activeNav === 'favorites') return favorites.includes(ep.id);
      return true;
    });
  })();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-slate-800 text-slate-100 border border-slate-700 rounded-xl shadow-2xl text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header with 3-Column Controls */}
      <Header
        activeSection={activeNav}
        onNavigate={(section) => {
          setActiveNav(section);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenConnectModal={() =>
          requireAdmin(
            () => setIsConnectModalOpen(true),
            'Kết Nối & Thay Đổi Kênh YouTube',
            'Kết nối kênh YouTube mới hoặc thay đổi ID kênh yêu cầu quyền Quản trị viên.'
          )
        }
        onOpenSettings={() => setIsChannelSettingsModalOpen(true)}
        onOpenGlobalSearch={() => setIsGlobalSearchModalOpen(true)}
        favoritesCount={favorites.length}
        onToggleLeftSidebar={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        isLeftSidebarOpen={isLeftSidebarOpen}
        onToggleRightSidebar={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        isRightSidebarOpen={isRightSidebarOpen}
      />

      {/* 3-Column Layout Container */}
      <div className="flex-1 flex w-full">
        {/* Column 1: Left Navigation Sidebar */}
        <SidebarLeft
          isOpen={isLeftSidebarOpen}
          onClose={() => setIsLeftSidebarOpen(false)}
          isCollapsed={isLeftSidebarCollapsed}
          onToggleCollapse={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
          activeSection={activeNav}
          onNavigate={(section) => {
            setActiveNav(section);
            if (section === 'movies' || section === 'kids-learning') {
              setIsRightSidebarOpen(false);
            }
            setIsLeftSidebarOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSelectMovieGenre={(slug) => {
            setActiveNav('movies');
            setIsRightSidebarOpen(false);
            setMovieGenreSlug(slug);
            setMovieTab('genre');
            setIsLeftSidebarOpen(false);
          }}
          onSelectMovieTab={(tab) => {
            setActiveNav('movies');
            setIsRightSidebarOpen(false);
            if (tab.startsWith('actor:')) {
              setMovieActorSlug(tab.replace('actor:', ''));
              setMovieTab('actors');
            } else {
              setMovieTab(tab);
            }
            setIsLeftSidebarOpen(false);
          }}
          categories={movieCategories}
          selectedGenreSlug={movieGenreSlug}
          channelInfo={channelInfo}
          videoCounts={videoCounts}
          favoritesCount={favorites.length}
          historyCount={channelVideos.length}
          onOpenGlobalSearch={() => setIsGlobalSearchModalOpen(true)}
        />

        {/* Column 2: Center Main Content Workspace */}
        <div className="flex-1 min-w-0 p-3 sm:p-5 lg:p-6 space-y-6">
          {/* Adcash Display Banner 728x90 (Zone 12358102) - Strictly hidden in Kids Learning */}
          {activeNav !== 'kids-learning' && (
            <AdcashBanner zoneId="12358102" format="728x90" />
          )}

          {activeNav === 'tiktok' ? (
            <TikTokDownloaderStudio
              onShowToast={showToast}
              onAddToQueue={handleAddCustomVideo}
              onPlayInMainPlayer={(ep) => {
                handleAddCustomVideo(ep);
                setActiveNav('catalog');
                setTimeout(() => {
                  document.getElementById('player-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
            />
          ) : activeNav === 'tts' ? (
            <TextToSpeechStudio onShowToast={showToast} />
          ) : activeNav === 'kids-learning' ? (
            <KidsLearningStudio onShowToast={showToast} />
          ) : activeNav === 'downloader' ? (
            <VidKrakenDownloader
              currentEpisode={currentEpisode}
              onAddToQueue={handleAddCustomVideo}
              onShowToast={showToast}
            />
          ) : activeNav === 'movies' ? (
            <MovieCinemaView
              initialTab={movieTab}
              initialGenreSlug={movieGenreSlug}
              initialActorSlug={movieActorSlug}
              isRightSidebarOpen={isRightSidebarOpen}
              onToggleRightSidebar={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              onPlayMovieInUniversalPlayer={(movie, ep, serverName, episodes) => {
                const sIndex = episodes.findIndex((s) => s.server_name === serverName);
                setActiveMovieState({
                  movie,
                  activeEpisode: ep,
                  activeServerIndex: sIndex >= 0 ? sIndex : 0,
                  episodes,
                });
                // In movie tab: Column 3 always stays hidden by default as requested:
                // "ở tab phim luôn luôn hiển thị 2 cột, cột 3 luôn ẩn khi nào cần thì nhấn chuột để mở ra"
              }}
              onSendToTTS={(text) => {
                setActiveNav('tts');
                showToast('Đã chuyển tóm tắt phim sang Studio Giọng Nói!');
              }}
              onShowToast={showToast}
            />
          ) : (
            /* Main Podcast Catalog & Player View */
            <div className="space-y-8">
        {/* Instant URL Search & Channel Banner Header */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
          {/* Top Channel Header: Avatar, Name, Stats & Primary Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={channelInfo.avatar}
                  alt={channelInfo.name}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/40 shadow-lg"
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-600 border-2 border-slate-900 flex items-center justify-center text-white text-[9px] font-bold">
                  ▶
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-extrabold text-white truncate">
                    {channelInfo.name}
                  </h1>
                  <span className="text-xs text-amber-400 font-mono hidden sm:inline">
                    {channelInfo.handle}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                  <span className="text-slate-300 font-medium">{channelInfo.subscribers}</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-bold">
                    {channelVideos.length} video ({videoCounts.long} dài + {videoCounts.shorts} Shorts)
                  </span>
                  <span>·</span>
                  <span className="text-amber-400 font-semibold">{channelPodcasts.length} podcast</span>
                </div>
              </div>
            </div>

            {/* Official Subscribe Button, Channel Settings & Auto-Play Toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={channelInfo.subscribeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleToggleSubscribe(channelInfo.name)}
                className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-950 font-bold rounded-full text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
                title="Mở xác nhận đăng ký chính thức trên YouTube"
              >
                <span className="text-red-600 font-black">▶</span>
                <span>{subscribedChannels.includes(channelInfo.name) ? 'Đã đăng ký 🔔' : 'Đăng ký kênh'}</span>
              </a>

              <button
                onClick={() => setIsChannelSettingsModalOpen(true)}
                className="px-3.5 py-2 rounded-full text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                title="Cài đặt kênh, quản trị video và quảng cáo"
              >
                <Settings className="w-3.5 h-3.5 text-amber-400" />
                <span>Cài Đặt</span>
              </button>

              <button
                onClick={() => {
                  const next = !isAutoplayNext;
                  setIsAutoplayNext(next);
                  showToast(next ? 'Đã BẬT tự động phát tập tiếp theo' : 'Đã TẮT tự động phát tập tiếp theo');
                }}
                className={`px-3 py-2 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                  isAutoplayNext
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
                title="Tự động phát tập kế tiếp khi video kết thúc"
              >
                <Check className={`w-3.5 h-3.5 ${isAutoplayNext ? 'text-amber-400' : 'opacity-40'}`} />
                <span className="hidden sm:inline">Tự động phát</span>
              </button>
            </div>
          </div>

          {/* Quick URL Input Bar & Global Search Trigger */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-slate-800/80">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Dán link video TikTok hoặc kênh/video/playlist YouTube..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchFullChannelData(urlInput);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              onClick={() => fetchFullChannelData(urlInput)}
              disabled={isLoadingChannel || !urlInput.trim()}
              className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 transition-all shrink-0 active:scale-95"
            >
              {isLoadingChannel ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>{isLoadingChannel ? 'Đang tải...' : 'Nạp Kênh'}</span>
            </button>

            <button
              onClick={() => setIsGlobalSearchModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 transition-all shrink-0 active:scale-95"
              title="Mở bảng tìm kiếm toàn diện (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
              <span>Tìm Kiếm Toàn YouTube</span>
            </button>
          </div>

          {/* New Videos Alert Banner */}
          {newVideosAlert && (
            <div className="p-3 bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/50 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-200 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-base">🎉</span>
                <span className="font-medium">{newVideosAlert}</span>
              </div>
              <button
                onClick={() => setNewVideosAlert(null)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          )}

          {/* Sleek Compact Podcast RSS Feed Pill */}
          <div className="px-3.5 py-2 bg-slate-950 border border-amber-500/25 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1 rounded-md bg-amber-500/15 text-amber-400 shrink-0">
                <Rss className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex items-center gap-2 flex-wrap text-[11px]">
                <span className="font-bold text-amber-300">Podcast RSS (studo.xml):</span>
                <span className="font-mono text-slate-300 truncate select-all">
                  https://www.vemaybaynhauyen.com/studo.xml
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  navigator.clipboard.writeText('https://www.vemaybaynhauyen.com/studo.xml');
                  showToast('📋 Đã sao chép link studo.xml!');
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1 transition-all active:scale-95"
                title="Sao chép link studo.xml"
              >
                <Copy className="w-3 h-3" />
                <span>Sao chép</span>
              </button>

              <a
                href="./studo.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-all"
                title="Mở file XML"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Mở</span>
              </a>
            </div>
          </div>
        </div>

        {/* Player Workspace */}
        {currentEpisode && (
          <section id="player-workspace" className="space-y-4">
            <div className="flex items-center justify-between pb-1 flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                    <span>Đang phát:</span>
                    <span className="text-amber-400 text-xs font-mono font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/30">
                      Tập #{currentIndex + 1} / {activeQueue.length}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-300 line-clamp-1 mt-0.5 font-medium">
                    {currentEpisode.title}
                  </p>
                </div>
              </div>

              {/* Sidebar Tab Switcher: Queue vs AI vs Notes */}
              <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setPlayerSidebarTab('queue')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    playerSidebarTab === 'queue'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Danh sách tất cả các tập đang phát"
                >
                  <ListMusic className="w-3.5 h-3.5" />
                  <span>Danh sách phát ({activeQueue.length})</span>
                </button>
                <button
                  onClick={() => setPlayerSidebarTab('ai')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    playerSidebarTab === 'ai'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Trợ lý AI</span>
                </button>
                <button
                  onClick={() => setPlayerSidebarTab('notes')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    playerSidebarTab === 'notes'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Ghi chú ({notes.filter((n) => n.episodeId === currentEpisode.id).length})</span>
                </button>
                <button
                  onClick={() => setPlayerSidebarTab('download')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    playerSidebarTab === 'download'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Tải tập này bằng VidKraken"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải Video/MP3</span>
                </button>
              </div>
            </div>

            {/* 2-Column Split: Dedicated TikTok Player or YouTube Player + Companion Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7">
                <PlayerErrorBoundary resetKey={currentEpisode.id}>
                  {isTikTokEpisode(currentEpisode) ? (
                    <TikTokVideoPlayer
                      key={currentEpisode.id}
                      variant="full"
                      episode={currentEpisode}
                      autoPlay={true}
                      onAddNoteAtCurrentTime={(t) => {
                        setPlayerCurrentSeconds(t);
                        setPlayerSidebarTab('notes');
                      }}
                      seekTargetTime={seekTargetTime}
                      onSeekHandled={() => setSeekTargetTime(null)}
                      onNextEpisode={handleNextEpisode}
                      onPrevEpisode={handlePrevEpisode}
                      onEnded={handleEpisodeEnded}
                      hasNextEpisode={hasNextEpisode}
                      hasPrevEpisode={hasPrevEpisode}
                      onToggleFavorite={handleToggleFavorite}
                      isFavorite={favorites.includes(currentEpisode.id)}
                      onShowToast={showToast}
                    />
                  ) : (
                    <YouTubePlayer
                      episode={currentEpisode}
                      onAddNoteAtCurrentTime={(t) => {
                        setPlayerCurrentSeconds(t);
                        setPlayerSidebarTab('notes');
                      }}
                      seekTargetTime={seekTargetTime}
                      onSeekHandled={() => setSeekTargetTime(null)}
                      isSubscribed={subscribedChannels.includes(channelInfo.name)}
                      onToggleSubscribe={handleToggleSubscribe}
                      onNextEpisode={handleNextEpisode}
                      onPrevEpisode={handlePrevEpisode}
                      onEnded={handleEpisodeEnded}
                      hasNextEpisode={hasNextEpisode}
                      hasPrevEpisode={hasPrevEpisode}
                      onVideoUnavailable={handleVideoUnavailable}
                      onToggleFavorite={handleToggleFavorite}
                      isFavorite={favorites.includes(currentEpisode.id)}
                      onOpenDownloader={() => setPlayerSidebarTab('download')}
                    />
                  )}
                </PlayerErrorBoundary>
              </div>

              <div className="lg:col-span-5">
                {playerSidebarTab === 'queue' ? (
                  <CurrentlyPlayingSidebar
                    currentEpisode={currentEpisode}
                    activeQueue={activeQueue}
                    activePlaylistTitle={activePlaylistTitle}
                    currentIndex={currentIndex}
                    isPlaying={true}
                    isAutoplayNext={isAutoplayNext}
                    onToggleAutoplay={() => {
                      const next = !isAutoplayNext;
                      setIsAutoplayNext(next);
                      showToast(next ? 'Đã BẬT tự động phát tập tiếp theo' : 'Đã TẮT tự động phát tập tiếp theo');
                    }}
                    onPlayEpisode={handlePlayEpisode}
                    onPrevEpisode={handlePrevEpisode}
                    onNextEpisode={handleNextEpisode}
                    hasNextEpisode={hasNextEpisode}
                    hasPrevEpisode={hasPrevEpisode}
                    channelVideosCount={channelVideos.length}
                    podcastSeries={podcastSeries}
                    channelPlaylists={channelPlaylists}
                    onSelectQueueSource={handleSelectQueueSource}
                  />
                ) : playerSidebarTab === 'ai' ? (
                  <AIPodcastCompanion
                    episode={currentEpisode}
                    onSeekToTime={handleSeek}
                  />
                ) : playerSidebarTab === 'download' ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                    <VidKrakenDownloader
                      currentEpisode={currentEpisode}
                      onAddToQueue={handleAddCustomVideo}
                      onShowToast={showToast}
                    />
                  </div>
                ) : (
                  <TimecodedNotesPanel
                    episode={currentEpisode}
                    notes={notes}
                    currentTimeSeconds={playerCurrentSeconds}
                    onAddNote={handleSaveNote}
                    onDeleteNote={handleDeleteNote}
                    onSeekToTime={handleSeek}
                  />
                )}

                {/* Adcash Medium Rectangle 300x250 (Zone 12358790) in Player Companion Area */}
                <div className="pt-3 flex justify-center">
                  <AdcashBanner zoneId="12358790" format="300x250" />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Categorized Content Shelves & Full Playlists */}
        <section id="playlist-section" className="space-y-5 pt-2">
          {/* Category Tabs: Tất cả Video | Podcasts | Playlists */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-2xl border border-slate-800 text-xs">
              <button
                onClick={() => handleTabChange('videos')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                  activeTab === 'videos'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Tất cả Video ({channelVideos.length})</span>
              </button>

              <button
                onClick={() => handleTabChange('podcasts')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                  activeTab === 'podcasts'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Film className="w-4 h-4" />
                <span>Podcasts ({channelPodcasts.length} tập)</span>
              </button>

              <button
                onClick={() => handleTabChange('playlists')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                  activeTab === 'playlists'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListMusic className="w-4 h-4" />
                <span>Danh sách phát ({channelPlaylists.length})</span>
              </button>
            </div>

            {/* In-list search input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tiêu đề video..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Adcash Sponsored Dual Placement: Large Rectangle 336x280 (Zone 12358782) & Medium Rectangle 300x250 (Zone 12358790) */}
          <div className="py-3 px-3 rounded-3xl bg-slate-900/40 border border-slate-800/80 flex flex-wrap items-center justify-center gap-6">
            <AdcashBanner zoneId="12358782" format="336x280" />
            <AdcashBanner zoneId="12358790" format="300x250" />
          </div>

          {/* VIEW TAB 1 & 2: FULL UNABRIDGED VIDEO LIST WITH POSITION & THUMBNAILS */}
          {activeTab !== 'playlists' ? (
            <div className="space-y-4">
              {/* Specialized Series Showcase for Podcasts Tab */}
              {activeTab === 'podcasts' && podcastSeries.length > 0 && (
                <div className="space-y-3 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5" />
                      <span>Các chuỗi Podcast trên kênh ({podcastSeries.length} bộ)</span>
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        onClick={() => setSelectedPodcastSeries('all')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          selectedPodcastSeries === 'all'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Tất cả ({channelPodcasts.length})
                      </button>
                      {podcastSeries.map((s) => (
                        <button
                          key={s.playlistId}
                          onClick={() => setSelectedPodcastSeries(s.title)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            selectedPodcastSeries === s.title
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {s.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                    {podcastSeries.map((s) => {
                      const seriesEps = channelPodcasts.filter((p) => p.seriesTitle === s.title);
                      const isCurrentPlaying = activePlaylistTitle === s.title;

                      return (
                        <div
                          key={s.playlistId}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                            isCurrentPlaying
                              ? 'bg-amber-500/15 border-amber-500/50 shadow-md'
                              : 'bg-slate-950/70 border-slate-800 hover:border-slate-750'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                                Series Podcast
                              </span>
                              <span className="text-[11px] font-mono text-slate-400 font-semibold">
                                {seriesEps.length || s.episodeCount} tập
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-100 line-clamp-1 mt-1">
                              {s.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSelectQueueSource('series', s.title)}
                              className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Phát trọn bộ series</span>
                            </button>
                            <button
                              onClick={() => setSelectedPodcastSeries(s.title)}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                            >
                              Xem tập
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredQueue.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl space-y-2">
                  <p className="text-xs text-slate-400">
                    Không tìm thấy video nào khớp với từ khóa tìm kiếm.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedPodcastSeries('all');
                    }}
                    className="text-xs text-amber-400 hover:underline font-semibold"
                  >
                    Xóa tìm kiếm
                  </button>
                </div>
              ) : (
                <FullPlaylistQueue
                  episodes={filteredQueue}
                  currentEpisodeId={currentEpisode?.id || ''}
                  favorites={favorites}
                  onPlayEpisode={handlePlayEpisode}
                  onRemoveEpisode={handleRemoveFromQueue}
                  onToggleFavorite={handleToggleFavorite}
                  videoFilter={activeTab === 'videos' ? videoFilter : undefined}
                  onFilterChange={activeTab === 'videos' ? setVideoFilter : undefined}
                  filterCounts={
                    activeTab === 'videos'
                      ? { all: channelVideos.length, long: videoCounts.long, shorts: videoCounts.shorts }
                      : undefined
                  }
                />
              )}
            </div>
          ) : (
            /* VIEW TAB 3: PLAYLISTS GRID */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {channelPlaylists.map((pl, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-900 border border-slate-800 hover:border-amber-500/80 rounded-2xl flex flex-col justify-between gap-4 transition-all shadow-md group"
                >
                  <div className="space-y-3">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                      <img
                        src={pl.thumbnail || 'https://i.ytimg.com/vi/P0MxHN62ZMs/hqdefault.jpg'}
                        alt={pl.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-2.5 bg-amber-500 text-slate-950 rounded-full shadow-lg">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute bottom-1 right-1 px-2 py-0.5 rounded bg-black/80 text-[10px] text-amber-300 font-semibold">
                        PLAYLIST #{idx + 1}
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-snug">
                      {pl.title}
                    </h4>
                  </div>

                  <button
                    onClick={() => handlePlaySpecificPlaylist(pl.url, pl.title)}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Phát toàn bộ playlist này</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Adcash Large Rectangle 336x280 (Zone 12358782) */}
        <div className="py-6 border-t border-slate-800/80 flex justify-center">
          <AdcashBanner zoneId="12358782" format="336x280" />
        </div>
        </div>
        )}

          {/* Adcash Display Banner 728x90 (Zone 12358102) - Strictly hidden in Kids Learning */}
          {activeNav !== 'kids-learning' && (
            <AdcashBanner zoneId="12358102" format="728x90" />
          )}
      </div>

      {/* Right Sticky Vertical Skyscraper Ad Rail 160x600 (Zone 12358110) when Right Sidebar is closed (hidden in Kids Learning) */}
      {!isRightSidebarOpen && activeNav !== 'kids-learning' && (
        <aside
          aria-label="Sponsored Skyscraper"
          className="hidden xl:flex flex-col items-center shrink-0 w-[184px] py-6 pr-3 sticky top-16 self-start"
        >
          <AdcashBanner zoneId="12358110" format="160x600" />
        </aside>
      )}

      {/* Column 3: Right Companion & Player Sidebar */}
      <CompanionRightSidebar
        isOpen={isRightSidebarOpen}
        onClose={() => setIsRightSidebarOpen(false)}
        currentEpisode={currentEpisode}
        activeQueue={activeQueue}
        activePlaylistTitle={activePlaylistTitle}
        currentIndex={currentIndex}
        isAutoplayNext={isAutoplayNext}
        onToggleAutoplay={() => {
          const next = !isAutoplayNext;
          setIsAutoplayNext(next);
          showToast(next ? 'Đã BẬT tự động phát tập tiếp theo' : 'Đã TẮT tự động phát tập tiếp theo');
        }}
        onPlayEpisode={handlePlayEpisode}
        onPrevEpisode={handlePrevEpisode}
        onNextEpisode={handleNextEpisode}
        hasNextEpisode={hasNextEpisode}
        hasPrevEpisode={hasPrevEpisode}
        channelVideosCount={channelVideos.length}
        podcastSeries={podcastSeries}
        channelPlaylists={channelPlaylists}
        onSelectQueueSource={handleSelectQueueSource}
        onSeekToTime={handleSeek}
        notes={notes}
        onDeleteNote={(id) => {
          setNotes((prev) => {
            const updated = prev.filter((n) => n.id !== id);
            try {
              localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(updated));
            } catch {}
            return updated;
          });
          showToast('Đã xóa ghi chú');
        }}
        activeMovie={activeMovieState}
        onSelectMovieEpisode={(ep) => {
          if (activeMovieState) {
            setActiveMovieState({
              ...activeMovieState,
              activeEpisode: ep,
            });
          }
        }}
        onSelectMovieServer={(sIdx) => {
          if (activeMovieState && activeMovieState.episodes[sIdx]?.server_data.length > 0) {
            setActiveMovieState({
              ...activeMovieState,
              activeServerIndex: sIdx,
              activeEpisode: activeMovieState.episodes[sIdx].server_data[0],
            });
          }
        }}
        onCloseMoviePlayer={() => setActiveMovieState(null)}
      />
    </div>

    {/* Footer with Minh Hiếu TuBe Branding */}
    <footer className="mt-8 border-t border-slate-800/80 bg-slate-950 py-8 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-300">
          <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white text-[10px] font-bold">
            ▶
          </div>
          <span className="font-extrabold text-white">Minh Hiếu TuBe</span>
          <span>· Kênh: {channelInfo.name}</span>
        </div>

        <div className="text-slate-400 flex items-center gap-4 flex-wrap">
          <a href={channelInfo.youtubeUrl} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 underline">
            Mở kênh trên YouTube
          </a>
          <span>·</span>
          <span>coppyright Đỗ Minh Hiếu chương trình thử nghiệm</span>
        </div>
      </div>
    </footer>

      {/* Connect Modal */}
      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onAddEpisode={(ep) => {
          handleAddCustomVideo(ep);
        }}
        onBatchAddEpisodes={(eps, replace) => {
          if (replace) {
            setActiveQueue(eps);
            if (eps.length > 0) setCurrentEpisode(eps[0]);
          } else {
            setActiveQueue((prev) => [...eps, ...prev]);
          }
        }}
        onSubscribeChannel={handleToggleSubscribe}
      />

      {/* Add Video Modal */}
      <AddVideoModal
        isOpen={isAddVideoModalOpen}
        onClose={() => setIsAddVideoModalOpen(false)}
        onAddVideo={handleAddCustomVideo}
      />

      {/* GitHub Sync Status & Guide Modal */}
      <GithubSyncModal
        isOpen={isGithubSyncModalOpen}
        onClose={() => setIsGithubSyncModalOpen(false)}
        onTriggerCheck={() => checkForNewVideos(true)}
        isChecking={isCheckingUpdates}
        totalVideos={channelVideos.length}
        lastCheckedTime={lastCheckedTime}
      />

      {/* Global YouTube Search Modal */}
      <GlobalYouTubeSearchModal
        isOpen={isGlobalSearchModalOpen}
        onClose={() => setIsGlobalSearchModalOpen(false)}
        onPlayEpisode={(ep) => {
          setActiveQueue((prev) => [ep, ...prev.filter((p) => p.youtubeId !== ep.youtubeId)]);
          setCurrentEpisode(ep);
          showToast(`Đang phát: "${ep.title}"`);
          // Scroll to player
          document.getElementById('player-workspace')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onAddToQueue={(ep) => {
          handleAddCustomVideo(ep);
        }}
        onOpenDownloader={(ep) => {
          setCurrentEpisode(ep);
          setPlayerSidebarTab('download');
          document.getElementById('player-workspace')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onShowToast={showToast}
        channelVideos={channelVideos}
        channelPodcasts={channelPodcasts}
      />

      {/* Consolidated Channel Settings & Utilities Modal */}
      <ChannelSettingsModal
        isOpen={isChannelSettingsModalOpen}
        onClose={() => setIsChannelSettingsModalOpen(false)}
        onOpenAddVideo={() => setIsAddVideoModalOpen(true)}
        onCheckUpdates={() => checkForNewVideos(true)}
        isCheckingUpdates={isCheckingUpdates}
        lastCheckedTime={lastCheckedTime}
        onOpenGithubSync={() => setIsGithubSyncModalOpen(true)}
        onScanDeletedVideos={() => {
          requireAdmin(
            handleScanDeletedVideos,
            'Quét & Dọn Dẹp Video Lỗi Trên YouTube',
            'Thao tác quét và loại bỏ vĩnh viễn các video đã bị xóa hoặc đặt riêng tư yêu cầu quyền Quản trị viên.'
          );
        }}
        isScanningDeleted={isScanningDeleted}
        onOpenAdSettings={() => setIsAdSettingsModalOpen(true)}
        isAutoplayNext={isAutoplayNext}
        onToggleAutoplay={() => {
          const next = !isAutoplayNext;
          setIsAutoplayNext(next);
          showToast(next ? 'Đã BẬT tự động phát tập tiếp theo' : 'Đã TẮT tự động phát tập tiếp theo');
        }}
        onShowToast={showToast}
      />

      {/* Cross-Device Ad & Watermark Settings Modal */}
      <AdSettingsModal
        isOpen={isAdSettingsModalOpen}
        onClose={() => setIsAdSettingsModalOpen(false)}
        adSettings={adSettings}
        watermarkSettings={watermarkSettings}
        onSaveAdSettings={(newAd) => {
          setAdSettings(newAd);
          saveStoredAdSettings(newAd);
        }}
        onSaveWatermarkSettings={(newWm) => {
          setWatermarkSettings(newWm);
          saveStoredWatermarkSettings(newWm);
        }}
      />

      {/* Floating Toggle Button for Right Sidebar when collapsed */}
      {!isRightSidebarOpen && (
        <button
          onClick={() => setIsRightSidebarOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-slate-900/90 hover:bg-amber-500 text-slate-300 hover:text-slate-950 border-l border-y border-slate-700/80 px-2 py-3 rounded-l-2xl shadow-2xl backdrop-blur-md transition-all flex flex-col items-center gap-1.5 group active:scale-95"
          title="Mở Bảng Phát & Trợ Lý AI Bên Phải"
        >
          <Radio className="w-4 h-4 text-amber-400 group-hover:text-slate-950" />
          <span className="text-[10px] font-bold [writing-mode:vertical-rl] tracking-wider uppercase">
            Bảng Phát
          </span>
        </button>
      )}
      {/* Adcash Video Slider (Zone 12358158) - Strictly hidden in Kids Learning */}
      {activeNav !== 'kids-learning' && <AdcashVideoSlider zoneId="12358158" />}
    </div>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <AppContent />
    </AdminAuthProvider>
  );
}

