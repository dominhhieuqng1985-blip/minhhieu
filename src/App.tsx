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
} from 'lucide-react';
import { PodcastEpisode, PodcastNote, PodcastSeries, PodcastPlaylist } from './types/podcast';
import { Header } from './components/Header';
import { YouTubePlayer } from './components/YouTubePlayer';
import { CurrentlyPlayingSidebar } from './components/CurrentlyPlayingSidebar';
import { AIPodcastCompanion } from './components/AIPodcastCompanion';
import { TimecodedNotesPanel } from './components/TimecodedNotesPanel';
import { FullPlaylistQueue } from './components/FullPlaylistQueue';
import { ConnectModal } from './components/ConnectModal';
import { formatSeconds } from './utils/youtube';

const STORAGE_KEY_USER_EPISODES = 'casttube_user_episodes_v2';
const STORAGE_KEY_FAVORITES = 'casttube_user_favorites';
const STORAGE_KEY_NOTES = 'casttube_user_notes';
const STORAGE_KEY_SUBS = 'casttube_user_subs';
const STORAGE_KEY_CHANNEL = 'casttube_current_channel_v2';

export default function App() {
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
  const [channelVideos, setChannelVideos] = useState<PodcastEpisode[]>([]);
  const [channelPodcasts, setChannelPodcasts] = useState<PodcastEpisode[]>([]);
  const [podcastSeries, setPodcastSeries] = useState<PodcastSeries[]>([]);
  const [selectedPodcastSeries, setSelectedPodcastSeries] = useState<string>('all');
  const [channelPlaylists, setChannelPlaylists] = useState<PodcastPlaylist[]>([]);

  // Active Tab: 'videos' | 'podcasts' | 'playlists'
  const [activeTab, setActiveTab] = useState<'videos' | 'podcasts' | 'playlists'>('videos');
  const [videoFilter, setVideoFilter] = useState<'all' | 'long' | 'shorts'>('all');
  const [videoCounts, setVideoCounts] = useState<{ all: number; long: number; shorts: number }>({
    all: 65,
    long: 45,
    shorts: 20,
  });

  // Currently Active Playlist being played & its title
  const [activeQueue, setActiveQueue] = useState<PodcastEpisode[]>([]);
  const [activePlaylistTitle, setActivePlaylistTitle] = useState<string>('Tất cả Video');

  // Current playing episode
  const [currentEpisode, setCurrentEpisode] = useState<PodcastEpisode | null>(null);

  // Auto-play next episode toggle (default: true)
  const [isAutoplayNext, setIsAutoplayNext] = useState<boolean>(true);

  // Loading state for automatic channel fetch
  const [isLoadingChannel, setIsLoadingChannel] = useState<boolean>(false);

  // Auto-sync & check for new YouTube video uploads
  const [isCheckingUpdates, setIsCheckingUpdates] = useState<boolean>(false);
  const [lastCheckedTime, setLastCheckedTime] = useState<string>('Vừa xong');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [newVideosAlert, setNewVideosAlert] = useState<string | null>(null);

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
  const [activeNav, setActiveNav] = useState<string>('playlist');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);

  // Player seeking orchestration
  const [seekTargetTime, setSeekTargetTime] = useState<number | null>(null);
  const [playerCurrentSeconds, setPlayerCurrentSeconds] = useState<number>(0);

  // Player companion tab: 'queue' (Danh sách phát bên phải) | 'ai' (Trợ lý AI) | 'notes' (Ghi chú)
  const [playerSidebarTab, setPlayerSidebarTab] = useState<'queue' | 'ai' | 'notes'>('queue');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // AUTOMATIC INITIAL FETCH ON STARTUP:
  // Automatically loads all videos, shorts, podcasts, and playlists of @minhhieureviewphim
  const fetchFullChannelData = async (targetUrl = 'https://www.youtube.com/@minhhieureviewphim') => {
    setIsLoadingChannel(true);
    try {
      const response = await fetch(`/api/podcast/channel-full?url=${encodeURIComponent(targetUrl)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Lỗi khi tải thông tin kênh');
      }

      // Update Channel Info
      if (data.channel) {
        setChannelInfo(data.channel);
      }

      // Format Videos (all 64 videos: 44 long videos + 20 shorts)
      const formattedVideos: PodcastEpisode[] = (data.videos || []).map((v: any, idx: number) => ({
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

      // Format Podcasts
      const formattedPodcasts: PodcastEpisode[] = (data.podcasts || []).map((p: any, idx: number) => ({
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
      console.error(err);
      showToast(err.message || 'Lỗi khi tải kênh tự động');
    } finally {
      setIsLoadingChannel(false);
    }
  };

  // CHECK AND AUTO-SYNC NEW VIDEOS FROM YOUTUBE:
  // Detects if any new video or short was uploaded to YouTube
  const checkForNewVideos = async (isManual = false) => {
    setIsCheckingUpdates(true);
    try {
      const res = await fetch(
        `/api/podcast/check-updates?url=https://www.youtube.com/@minhhieureviewphim&_nocache=${Date.now()}`
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi kiểm tra video mới');
      }

      const existingIds = new Set(channelVideos.map((v) => v.youtubeId));
      const newlyFound = (data.latestVideos || []).filter((v: any) => !existingIds.has(v.youtubeId));

      const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setLastCheckedTime(nowStr);

      if (newlyFound.length > 0) {
        // Format newly found videos
        const formattedNew: PodcastEpisode[] = newlyFound.map((v: any, idx: number) => ({
          id: `new-${Date.now()}-${idx}-${v.youtubeId}`,
          youtubeId: v.youtubeId,
          title: v.title,
          channel: v.channel || channelInfo.name,
          category: 'phat-trien-ban-than',
          duration: v.duration,
          durationSeconds: v.isShort ? 60 : 600,
          thumbnail: v.thumbnail,
          description: `Video mới cập nhật từ kênh ${channelInfo.name}`,
          publishedDate: 'Mới tải lên',
          isShort: v.isShort,
        }));

        // Prepend new videos to channel videos
        setChannelVideos((prev) => [...formattedNew, ...prev]);

        // If on videos tab, prepend to active queue as well
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

        const alertMsg = `Đã phát hiện và tự động nạp ${formattedNew.length} video mới: "${formattedNew[0].title}"!`;
        setNewVideosAlert(alertMsg);
        showToast(`🎉 ${alertMsg}`);
      } else {
        if (isManual) {
          showToast(`✅ Kênh đã ở trạng thái mới nhất! Đã kiểm tra và chưa có video mới.`);
        }
      }
    } catch (err: any) {
      console.warn('Check updates error:', err);
      if (isManual) {
        showToast('Không thể kết nối YouTube để kiểm tra video mới.');
      }
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchFullChannelData('https://www.youtube.com/@minhhieureviewphim');
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
    try {
      const res = await fetch(`/api/podcast/playlist?url=${encodeURIComponent(playlistUrl)}`);
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
      }
    } catch {
      showToast('Lỗi khi tải danh sách phát');
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

  const handleRemoveFromQueue = (episodeId: string) => {
    setActiveQueue((prev) => prev.filter((e) => e.id !== episodeId));
    showToast('Đã xóa video khỏi danh sách phát');
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
    return list.filter((ep) => {
      const matchesSearch =
        ep.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.channel.toLowerCase().includes(searchQuery.toLowerCase());
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

      {/* Header */}
      <Header
        activeSection={activeNav}
        onNavigate={(section) => {
          setActiveNav(section);
          if (section === 'player') {
            document.getElementById('player-workspace')?.scrollIntoView({ behavior: 'smooth' });
          } else if (section === 'notes') {
            document.getElementById('player-workspace')?.scrollIntoView({ behavior: 'smooth' });
            setPlayerSidebarTab('notes');
          } else {
            document.getElementById('playlist-section')?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        favoritesCount={favorites.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Instant URL Search & Channel Banner Header */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-7 shadow-2xl space-y-5">
          {/* Top URL Input: Allows pasting any link and auto-fetches */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Dán link kênh, podcasts hoặc video YouTube (ví dụ: https://www.youtube.com/@minhhieureviewphim)..."
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
              className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/10 transition-all shrink-0 active:scale-95"
            >
              {isLoadingChannel ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>{isLoadingChannel ? 'Đang tải tự động...' : 'Tải lại toàn bộ'}</span>
            </button>
          </div>

          {/* Channel Info Card with Subscribe Button */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-3.5 min-w-0">
              <img
                src={channelInfo.avatar}
                alt={channelInfo.name}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover border-2 border-amber-500/40 shadow-lg shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-extrabold text-white truncate">
                    {channelInfo.name}
                  </h1>
                  <span className="text-xs text-amber-400 font-mono hidden sm:inline">
                    {channelInfo.handle}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                  <span>{channelInfo.subscribers}</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-bold">
                    {channelVideos.length} video ({videoCounts.long} video dài + {videoCounts.shorts} Shorts)
                  </span>
                  <span>·</span>
                  <span className="text-amber-400 font-semibold">{channelPodcasts.length} tập podcast</span>
                  <span>·</span>
                  <span>{channelPlaylists.length} danh sách phát</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Tự động kiểm tra video mới (mỗi 90s)
                  </span>
                  <span>·</span>
                  <span>Lần kiểm tra gần nhất: {lastCheckedTime}</span>
                </div>
              </div>
            </div>

            {/* Official Subscribe Button, Check Updates & Auto-Play Toggle */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Check & Auto-Sync New Videos Button */}
              <button
                onClick={() => checkForNewVideos(true)}
                disabled={isCheckingUpdates}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                title="Kiểm tra ngay xem kênh có video mới nào vừa tải lên không"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{isCheckingUpdates ? 'Đang kiểm tra...' : 'Kiểm tra video mới'}</span>
              </button>

              {/* Autoplay Next Toggle */}
              <button
                onClick={() => {
                  const next = !isAutoplayNext;
                  setIsAutoplayNext(next);
                  showToast(next ? 'Đã BẬT tự động phát tập tiếp theo' : 'Đã TẮT tự động phát tập tiếp theo');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                  isAutoplayNext
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
                title="Tự động phát tập kế tiếp khi video kết thúc"
              >
                <Check className={`w-3.5 h-3.5 ${isAutoplayNext ? 'text-amber-400' : 'opacity-40'}`} />
                <span>Tự động phát tập tiếp theo</span>
              </button>

              {/* YouTube Official-Style Subscribe Button */}
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
            </div>
          </div>

          {/* New Videos Alert Banner */}
          {newVideosAlert && (
            <div className="mt-3 p-3.5 bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/50 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-200 shadow-lg">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🎉</span>
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
              </div>
            </div>

            {/* 2-Column Split: YouTube Player + Currently Playing Sidebar / AI / Notes */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7">
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
                />
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
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-800/80 bg-slate-950 py-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Radio className="w-4 h-4 text-amber-400" />
            <span className="font-bold">CastTube</span>
            <span>· Kênh: {channelInfo.name}</span>
          </div>

          <div className="text-slate-400 flex items-center gap-4">
            <a href={channelInfo.youtubeUrl} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 underline">
              Mở kênh trên YouTube
            </a>
            <span>·</span>
            <span>Chỉ hiển thị các video & podcast của kênh bạn chọn</span>
          </div>
        </div>
      </footer>

      {/* Connect Modal */}
      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onAddEpisode={(ep) => {
          setActiveQueue((prev) => [ep, ...prev]);
          setCurrentEpisode(ep);
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
    </div>
  );
}
