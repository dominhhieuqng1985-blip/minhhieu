import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  BookmarkPlus,
  Headphones,
  Video,
  Moon,
  ExternalLink,
  Subtitles,
  Check,
  Bell,
  SkipBack,
  SkipForward,
  ThumbsUp,
  ThumbsDown,
  Share2,
  MessageSquare,
  Download,
  Bookmark,
  MoreHorizontal,
  Music,
  Send,
  Copy,
  AlertTriangle,
  MessageCircle,
  X,
  CheckCircle2,
  Tv,
  Settings,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { PodcastEpisode } from '../types/podcast';
import { formatSeconds } from '../utils/youtube';
import {
  AdSettings,
  WatermarkSettings,
  getStoredAdSettings,
  getStoredWatermarkSettings,
  fetchRemoteAdSettings,
  AD_SETTINGS_UPDATED_EVENT,
} from '../types/adConfig';
import { VideoAdOverlay, PreAdCountdownNotice } from './VideoAdOverlay';
import { WatermarkOverlay } from './WatermarkOverlay';
import { AdSettingsModal } from './AdSettingsModal';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useVideoAdScheduler } from '../hooks/useVideoAdScheduler';
import { AdcashBanner } from './AdcashBanner';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

/**
 * Validate that a string is a standard 11-character YouTube video ID.
 * Non-YouTube IDs (like 19-digit TikTok IDs) return false.
 */
export function isValidYouTubeId(id: unknown): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_-]{11}$/.test(id.trim());
}

interface CommentItem {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  timeAgo: string;
  likes: number;
  userLiked?: boolean;
}

interface YouTubePlayerProps {
  episode: PodcastEpisode;
  onAddNoteAtCurrentTime: (time: number) => void;
  seekTargetTime?: number | null;
  onSeekHandled?: () => void;
  isSubscribed?: boolean;
  onToggleSubscribe?: (channel: string) => void;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  onEnded?: () => void;
  hasNextEpisode?: boolean;
  hasPrevEpisode?: boolean;
  onVideoUnavailable?: (episodeId: string, youtubeId: string, reason: string) => void;
  onToggleFavorite?: (episodeId: string) => void;
  isFavorite?: boolean;
  onOpenDownloader?: () => void;
}

const DEFAULT_COMMENTS_POOL: Record<string, CommentItem[]> = {
  general: [
    {
      id: 'c1',
      author: 'Nguyễn Văn Hùng',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
      content: 'Giọng đọc truyền cảm và nội dung sâu sắc quá anh Hiếu ơi, nghe mỗi tối rất an yên 🙏',
      timeAgo: '3 giờ trước',
      likes: 42,
    },
    {
      id: 'c2',
      author: 'Trần Thị Mai',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      content: 'Bài học nhân văn rất ý nghĩa. Đã bấm like và đăng ký kênh ủng hộ tác giả!',
      timeAgo: '1 ngày trước',
      likes: 18,
    },
    {
      id: 'c3',
      author: 'Lê Hoàng Nam',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop',
      content: 'Chờ đợi tập này mãi, mong kênh ra thêm nhiều video về triết lý sống và Phật pháp nhé!',
      timeAgo: '2 ngày trước',
      likes: 29,
    },
  ],
};

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  episode,
  onAddNoteAtCurrentTime,
  seekTargetTime,
  onSeekHandled,
  isSubscribed = false,
  onToggleSubscribe,
  onNextEpisode,
  onPrevEpisode,
  onEnded,
  hasNextEpisode = false,
  hasPrevEpisode = false,
  onVideoUnavailable,
  onToggleFavorite,
  isFavorite = false,
  onOpenDownloader,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoAreaRef = useRef<HTMLDivElement>(null);
  const shortsAreaRef = useRef<HTMLDivElement>(null);
  const ytMountHostRef = useRef<HTMLDivElement>(null);
  const mountedHostElRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Fullscreen container handler ensuring Watermark and Video Ads are preserved
  const toggleFullscreen = () => {
    const targetEl = isShortView ? shortsAreaRef.current : videoAreaRef.current;
    if (!targetEl) return;

    const doc = document as any;
    const isCurrentlyFs = Boolean(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (!isCurrentlyFs) {
      if (targetEl.requestFullscreen) {
        targetEl.requestFullscreen().catch(() => setIsFullscreen(true));
      } else if ((targetEl as any).webkitRequestFullscreen) {
        (targetEl as any).webkitRequestFullscreen();
      } else if ((targetEl as any).mozRequestFullScreen) {
        (targetEl as any).mozRequestFullScreen();
      } else if ((targetEl as any).msRequestFullscreen) {
        (targetEl as any).msRequestFullscreen();
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as any;
      const fsEl =
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement;
      setIsFullscreen(Boolean(fsEl));
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  // Detect if video is Shorts
  const safeTitleLower = String(episode.title || '').toLowerCase();
  const isVideoShort = Boolean(
    episode.isShort ||
    (episode.durationSeconds && episode.durationSeconds <= 90) ||
    safeTitleLower.includes('#shorts') ||
    safeTitleLower.includes('shorts')
  );

  const [isShortView, setIsShortView] = useState<boolean>(isVideoShort);

  // Sync isShortView when episode changes
  useEffect(() => {
    setIsShortView(isVideoShort);
  }, [episode.id, isVideoShort]);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(episode.durationSeconds || 1800);
  const [volume, setVolume] = useState<number>(85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [displayMode, setDisplayMode] = useState<'video' | 'audio'>('video');
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [showSleepMenu, setShowSleepMenu] = useState<boolean>(false);
  const [isApiReady, setIsApiReady] = useState<boolean>(false);
  const [isCcActive, setIsCcActive] = useState<boolean>(false);
  const [isBrokenVideo, setIsBrokenVideo] = useState<boolean>(false);

  // Ad & Watermark states
  const [adSettings, setAdSettings] = useState<AdSettings>(getStoredAdSettings);
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>(getStoredWatermarkSettings);
  const [isAdSettingsModalOpen, setIsAdSettingsModalOpen] = useState<boolean>(false);
  const { requireAdmin } = useAdminAuth();

  const pauseMainYouTubeVideo = () => {
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      try {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } catch {}
    }
  };

  const resumeMainYouTubeVideo = () => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      try {
        playerRef.current.playVideo();
        setIsPlaying(true);
      } catch {}
    }
  };

  const {
    isAdOpen,
    adInstanceKey,
    preAdCountdown,
    preAdTotalSeconds,
    handleAdFinished,
    interceptVideoEnded,
    triggerManualAd,
  } = useVideoAdScheduler({
    mediaKey: episode.id,
    adSettings,
    scopeEnabled: Boolean(adSettings.enabled && adSettings.showInYouTube),
    currentTime,
    duration,
    isMainPlaying: isPlaying,
    onPauseMainVideo: pauseMainYouTubeVideo,
    onResumeMainVideo: resumeMainYouTubeVideo,
  });

  const isAdOpenRef = useRef<boolean>(isAdOpen);
  const interceptEndedRef = useRef(interceptVideoEnded);
  const onEndedPropRef = useRef(onEnded);
  useEffect(() => {
    isAdOpenRef.current = isAdOpen;
    interceptEndedRef.current = interceptVideoEnded;
    onEndedPropRef.current = onEnded;
  }, [isAdOpen, interceptVideoEnded, onEnded]);

  const handleOpenAdSettings = () => {
    requireAdmin(
      () => setIsAdSettingsModalOpen(true),
      'Cài Đặt Quảng Cáo & Watermark Logo',
      'Thay đổi cấu hình quảng cáo phủ video và logo thương hiệu yêu cầu quyền Quản trị viên.'
    );
  };

  useEffect(() => {
    // Cross-device sync: fetch remote settings from server or public json on mount
    fetchRemoteAdSettings().then((remote) => {
      if (remote) {
        setAdSettings(remote.adSettings);
        setWatermarkSettings(remote.watermarkSettings);
      }
    });

    const handleUpdate = (e: any) => {
      if (e.detail?.adSettings) setAdSettings(e.detail.adSettings);
      if (e.detail?.watermarkSettings) setWatermarkSettings(e.detail.watermarkSettings);
    };

    window.addEventListener(AD_SETTINGS_UPDATED_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(AD_SETTINGS_UPDATED_EVENT, handleUpdate);
    };
  }, []);

  // Like & Dislike state
  const [hasLiked, setHasLiked] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`yt_like_${episode.youtubeId}`);
      return stored === 'true';
    } catch {
      return false;
    }
  });
  const [hasDisliked, setHasDisliked] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(() => {
    // Generate a realistic view-based like count
    const seed = String(episode.youtubeId || 'A').charCodeAt(0) || 65;
    return 850 + (seed * 17) % 1200;
  });

  // Description expand/collapse
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);

  // Share Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareIncludeTime, setShareIncludeTime] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Comments state
  const [comments, setComments] = useState<CommentItem[]>(() => {
    try {
      const stored = localStorage.getItem(`yt_comments_${episode.youtubeId}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_COMMENTS_POOL.general;
  });
  const [commentInput, setCommentInput] = useState<string>('');
  const [commentSort, setCommentSort] = useState<'top' | 'newest'>('top');
  const [isShortCommentsOpen, setIsShortCommentsOpen] = useState<boolean>(false);
  const [directYoutubeTip, setDirectYoutubeTip] = useState<string | null>(null);

  // Load YouTube IFrame API script once
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevReady) prevReady();
      setIsApiReady(true);
    };
  }, []);

  // Reset broken state on episode change
  useEffect(() => {
    const isIdValid = isValidYouTubeId(episode.youtubeId);
    setIsBrokenVideo(!isIdValid);
    try {
      if (isIdValid) {
        const stored = localStorage.getItem(`yt_like_${episode.youtubeId}`);
        setHasLiked(stored === 'true');
      } else {
        setHasLiked(false);
      }
    } catch {}
  }, [episode.id, episode.youtubeId]);

  // Initialize player or switch video safely inside an isolated DOM host (prevents React removeChild crashes)
  useEffect(() => {
    // If not a valid 11-char YouTube ID (e.g. TikTok video or other custom media), NEVER pass to window.YT.Player!
    if (!isValidYouTubeId(episode.youtubeId)) {
      setIsBrokenVideo(true);
      return;
    }

    if (!isApiReady || !window.YT || !window.YT.Player) return;

    const host = ytMountHostRef.current;
    if (!host) return;

    try {
      // Fast-path: if player is already alive inside the exact same host container, switch video without recreating iframe
      if (
        playerRef.current &&
        mountedHostElRef.current === host &&
        typeof playerRef.current.loadVideoById === 'function'
      ) {
        try {
          playerRef.current.loadVideoById(episode.youtubeId);
          setIsPlaying(true);
          setCurrentTime(0);
          setIsBrokenVideo(false);
          return;
        } catch (e) {
          console.warn('Error calling loadVideoById, will recreate player:', e);
        }
      }

      // Destroy any previous player instance before mounting into a fresh imperative child node
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }

      host.innerHTML = '';
      const mountEl = document.createElement('div');
      mountEl.style.width = '100%';
      mountEl.style.height = '100%';
      host.appendChild(mountEl);
      mountedHostElRef.current = host;

      const player = new window.YT.Player(mountEl, {
        videoId: episode.youtubeId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          cc_load_policy: isCcActive ? 1 : 0,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            playerRef.current = event.target;
            event.target.setVolume(volume);
            const dur = event.target.getDuration();
            if (dur && dur > 0) setDuration(dur);

            try {
              if (isAdOpenRef.current) {
                event.target.pauseVideo();
                setIsPlaying(false);
              } else {
                event.target.playVideo();
                setIsPlaying(true);
              }
            } catch (e) {
              // Autoplay policy
            }
          },
          onStateChange: (event: any) => {
            if (event.data === 1) {
              const dur = event.target.getDuration();
              if (dur && dur > 0) setDuration(dur);
              if (isAdOpenRef.current) {
                try {
                  event.target.pauseVideo();
                } catch {}
                setIsPlaying(false);
              } else {
                setIsPlaying(true);
              }
            } else if (event.data === 2) {
              setIsPlaying(false);
            } else if (event.data === 0) {
              setIsPlaying(false);
              interceptEndedRef.current(() => {
                if (onEndedPropRef.current) onEndedPropRef.current();
              });
            }
          },
          onError: (event: any) => {
            console.warn('YouTube Player reported error event code:', event.data);
            if (event.data === 100 || event.data === 101 || event.data === 150 || event.data === 2) {
              setIsBrokenVideo(true);
              if (onVideoUnavailable) {
                const reason =
                  event.data === 100
                    ? 'Video đã bị xóa hoặc đặt riêng tư trên YouTube'
                    : event.data === 2
                    ? 'ID video không tồn tại trên YouTube'
                    : 'Video bị chủ sở hữu giới hạn nhúng';
                onVideoUnavailable(episode.id, episode.youtubeId, reason);
              }
            }
          },
        },
      });

      playerRef.current = player;
    } catch (err) {
      console.warn('Safely caught error during YouTube Player creation:', err);
      setIsBrokenVideo(true);
    }
  }, [isApiReady, episode.youtubeId, isShortView]);

  // Cleanly destroy YT.Player on component unmount so no orphaned iframe mutates React's DOM tree
  useEffect(() => {
    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
      if (mountedHostElRef.current) {
        mountedHostElRef.current.innerHTML = '';
        mountedHostElRef.current = null;
      }
    };
  }, []);

  // External seek
  useEffect(() => {
    if (seekTargetTime !== undefined && seekTargetTime !== null && playerRef.current) {
      try {
        playerRef.current.seekTo(seekTargetTime, true);
        setCurrentTime(seekTargetTime);
        if (!isPlaying) {
          playerRef.current.playVideo();
          setIsPlaying(true);
        }
        if (onSeekHandled) onSeekHandled();
      } catch (e) {
        console.error('Error seeking:', e);
      }
    }
  }, [seekTargetTime, onSeekHandled, isPlaying]);

  // Periodic poll to update current time while playing
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const curr = playerRef.current.getCurrentTime();
          if (curr !== undefined) setCurrentTime(curr);
        }
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // Sleep timer
  useEffect(() => {
    let timer: any = null;
    if (sleepTimerRemaining !== null && sleepTimerRemaining > 0) {
      timer = setInterval(() => {
        setSleepTimerRemaining((prev) => {
          if (prev === null || prev <= 1) {
            if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
              playerRef.current.pauseVideo();
            }
            setIsPlaying(false);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sleepTimerRemaining]);

  const togglePlayPause = () => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const seekRelative = (seconds: number) => {
    if (!playerRef.current) return;
    try {
      const nextTime = Math.max(0, Math.min(currentTime + seconds, duration));
      playerRef.current.seekTo(nextTime, true);
      setCurrentTime(nextTime);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSliderSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = parseFloat(e.target.value);
    setCurrentTime(nextTime);
    if (playerRef.current) {
      try {
        playerRef.current.seekTo(nextTime, true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      try {
        playerRef.current.setPlaybackRate(rate);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    if (isMuted && val > 0) setIsMuted(false);
    if (playerRef.current) {
      try {
        playerRef.current.setVolume(val);
        if (val === 0) playerRef.current.mute();
        else playerRef.current.unMute();
      } catch (e) {}
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    try {
      if (isMuted) {
        playerRef.current.unMute();
        playerRef.current.setVolume(volume || 80);
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    } catch (e) {}
  };

  const toggleCC = () => {
    const nextCc = !isCcActive;
    setIsCcActive(nextCc);
    if (playerRef.current) {
      try {
        if (!nextCc) {
          if (typeof playerRef.current.unloadModule === 'function') playerRef.current.unloadModule('captions');
        } else {
          if (typeof playerRef.current.loadModule === 'function') playerRef.current.loadModule('captions');
        }
      } catch (e) {}
    }
  };

  // Like handler with real YouTube sync trigger
  const handleLike = () => {
    if (hasLiked) {
      setHasLiked(false);
      setLikeCount((prev) => Math.max(0, prev - 1));
      try {
        localStorage.removeItem(`yt_like_${episode.youtubeId}`);
      } catch {}
      setDirectYoutubeTip(null);
    } else {
      setHasLiked(true);
      setHasDisliked(false);
      setLikeCount((prev) => prev + 1);
      try {
        localStorage.setItem(`yt_like_${episode.youtubeId}`, 'true');
      } catch {}
      // Show notice that user can also confirm on YouTube to count 1 like if logged in
      setDirectYoutubeTip('Đã ghi nhận lượt thích! Nếu đã đăng nhập YouTube, nhấn "Mở YouTube" để lưu like vào tài khoản của bạn.');
    }
  };

  const handleDislike = () => {
    if (hasDisliked) {
      setHasDisliked(false);
    } else {
      setHasDisliked(true);
      if (hasLiked) {
        setHasLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
        try {
          localStorage.removeItem(`yt_like_${episode.youtubeId}`);
        } catch {}
      }
    }
    setDirectYoutubeTip(null);
  };

  // Add Comment
  const handleAddComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentInput.trim()) return;

    const newC: CommentItem = {
      id: `c_${Date.now()}`,
      author: 'Bạn (Người dùng đã đăng nhập)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      content: commentInput.trim(),
      timeAgo: 'Vừa xong',
      likes: 1,
      userLiked: true,
    };

    const updated = [newC, ...comments];
    setComments(updated);
    try {
      localStorage.setItem(`yt_comments_${episode.youtubeId}`, JSON.stringify(updated));
    } catch {}
    setCommentInput('');
    setDirectYoutubeTip('Đã thêm bình luận! Để bình luận hiển thị công khai trên kênh YouTube của tác giả, hãy nhấn "Bình luận trên YouTube".');
  };

  // Share URL generation
  const getShareUrl = () => {
    const base = isShortView
      ? `https://www.youtube.com/shorts/${episode.youtubeId}`
      : `https://www.youtube.com/watch?v=${episode.youtubeId}`;
    if (shareIncludeTime && Math.floor(currentTime) > 0) {
      return `${base}&t=${Math.floor(currentTime)}s`;
    }
    return base;
  };

  const handleCopyLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    setCopyFeedback('Đã sao chép liên kết vào clipboard!');
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const channelUrl = episode.channelUrl || `https://www.youtube.com/@MinhHieuOfficialvn`;
  const officialYoutubeUrl = `https://www.youtube.com/watch?v=${episode.youtubeId}`;
  const officialShortsUrl = `https://www.youtube.com/shorts/${episode.youtubeId}`;
  const directTargetUrl = isShortView ? officialShortsUrl : officialYoutubeUrl;

  return (
    <div
      ref={containerRef}
      className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col font-sans"
    >
      {/* Top Bar: Mode Switcher & Real YouTube Badge */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          {/* YouTube Red Icon Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600/15 border border-red-500/30 text-red-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>YouTube 100% {isShortView ? 'Shorts' : 'Video'}</span>
          </div>

          {/* Toggle Shorts vs Long Video mode */}
          <button
            onClick={() => setIsShortView(!isShortView)}
            className={`px-2.5 py-1 rounded-md border font-medium transition-all flex items-center gap-1.5 ${
              isShortView
                ? 'bg-red-600 text-white border-red-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Chuyển đổi giao diện YouTube Shorts dọc hoặc Video ngang chuẩn"
          >
            <span>{isShortView ? '📱 Giao diện Shorts' : '🖥️ Video 16:9'}</span>
          </button>
        </div>

        {/* Real YouTube Direct Interaction Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAdSettings}
            className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold rounded-full flex items-center gap-1.5 text-xs transition-colors"
            title="Cài đặt quảng cáo phủ video và logo watermark"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Cài Đặt QC &amp; Logo</span>
          </button>

          <a
            href={directTargetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
            title="Mở trực tiếp trên YouTube để like, bình luận và đăng ký ghi nhận 100% vào tài khoản Google của bạn"
          >
            <span>▶ Mở trên YouTube</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Notice if video was removed/broken or not a YouTube video */}
      {isBrokenVideo && (
        <div className="p-3 bg-red-950/80 border-b border-red-600/50 flex items-center justify-between gap-3 text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              <strong>Thông báo:</strong>{' '}
              {!isValidYouTubeId(episode.youtubeId)
                ? episode.id?.startsWith('tiktok-')
                  ? 'Video TikTok từ nguồn ngoài. Để xem hoặc tải về máy chuẩn không logo, vui lòng mở mục Tải TikTok.'
                  : 'Video này không có mã ID YouTube 11 ký tự hợp lệ.'
                : 'Video này đã bị xóa hoặc đặt riêng tư trên YouTube. Ứng dụng đã tự động loại bỏ khỏi danh sách phát.'}
            </span>
          </div>
          {onNextEpisode && (
            <button
              onClick={onNextEpisode}
              className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold shrink-0 transition-colors"
            >
              Chuyển tập tiếp theo
            </button>
          )}
        </div>
      )}

      {/* Direct YouTube Interaction Tip */}
      {directYoutubeTip && (
        <div className="p-2.5 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-300">
          <span>{directYoutubeTip}</span>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={directTargetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-bold hover:text-white"
            >
              Mở YouTube ngay
            </a>
            <button
              onClick={() => setDirectYoutubeTip(null)}
              className="p-1 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CASE 1: YOUTUBE SHORTS VIEW (TỶ LỆ DỌC 9:16 + ACTION BUTTONS) */}
      {/* ============================================================== */}
      {isShortView ? (
        <div className="relative bg-black flex flex-col items-center justify-center p-2 sm:p-4 min-h-[560px] overflow-hidden">
          {/* Ambient background blur */}
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-20 scale-125 pointer-events-none"
            style={{ backgroundImage: `url(${episode.thumbnail})` }}
          />

          {/* Centered Shorts Card 9:16 */}
          <div
            ref={shortsAreaRef}
            className={`relative overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col transition-all duration-200 ${
              isFullscreen
                ? 'fixed inset-0 z-50 w-screen h-screen max-w-none max-h-none rounded-none border-0 aspect-auto items-center justify-center'
                : 'w-full max-w-[380px] sm:max-w-[400px] aspect-[9/16] rounded-2xl'
            }`}
          >
            {/* Watermark Logo */}
            <WatermarkOverlay settings={watermarkSettings} />

            {/* Pre-Ad Countdown Notice ("Quảng cáo sắp bắt đầu sau Xs") */}
            <PreAdCountdownNotice
              secondsRemaining={preAdCountdown}
              totalSeconds={preAdTotalSeconds}
            />

            {/* Video Ad Overlay */}
            {isAdOpen && (
              <VideoAdOverlay
                key={adInstanceKey}
                settings={adSettings}
                onAdFinished={handleAdFinished}
                onOpenSettings={handleOpenAdSettings}
                targetMediaTitle={episode.title}
              />
            )}

            {/* The actual YouTube iframe or Fallback Overlay */}
            <div className="relative flex-1 w-full h-full bg-black">
              {!isValidYouTubeId(episode.youtubeId) && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-950/95 text-center space-y-3">
                  <img
                    src={episode.thumbnail}
                    alt={episode.title}
                    className="w-24 h-24 rounded-2xl object-cover border border-slate-700 shadow-xl opacity-80"
                  />
                  <div className="max-w-xs space-y-1">
                    <h3 className="text-xs font-bold text-white line-clamp-2">{episode.title}</h3>
                    <p className="text-[11px] text-slate-400">
                      {episode.id?.startsWith('tiktok-')
                        ? 'Video TikTok từ nguồn ngoài.'
                        : 'Không tìm thấy ID YouTube hợp lệ.'}
                    </p>
                  </div>
                  {onNextEpisode && (
                    <button
                      onClick={onNextEpisode}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                    >
                      Phát video tiếp theo
                    </button>
                  )}
                </div>
              )}
              <div ref={ytMountHostRef} className="w-full h-full object-cover" />
            </div>

            {/* Shorts Right Action Bar (Overlayed) */}
            <div className="absolute right-2 sm:right-3 bottom-16 sm:bottom-20 z-20 flex flex-col items-center gap-3.5">
              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="flex flex-col items-center group active:scale-90 transition-transform"
                title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
              >
                <div className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md">
                  {isFullscreen ? <Minimize2 className="w-5 h-5 text-amber-400" /> : <Maximize2 className="w-5 h-5" />}
                </div>
                <span className="text-[10px] font-semibold text-white mt-1 drop-shadow">
                  {isFullscreen ? 'Thu nhỏ' : 'Phóng to'}
                </span>
              </button>

              {/* Like Button */}
              <button
                onClick={handleLike}
                className="flex flex-col items-center group active:scale-90 transition-transform"
                title="Thích Shorts"
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
                    hasLiked
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/40'
                      : 'bg-black/60 text-white hover:bg-black/80'
                  }`}
                >
                  <ThumbsUp className={`w-5 h-5 ${hasLiked ? 'fill-current' : ''}`} />
                </div>
                <span className="text-[11px] font-bold text-white mt-1 drop-shadow">
                  {likeCount}
                </span>
              </button>

              {/* Dislike Button */}
              <button
                onClick={handleDislike}
                className="flex flex-col items-center group active:scale-90 transition-transform"
                title="Không thích"
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
                    hasDisliked
                      ? 'bg-slate-700 text-white'
                      : 'bg-black/60 text-white hover:bg-black/80'
                  }`}
                >
                  <ThumbsDown className={`w-5 h-5 ${hasDisliked ? 'fill-current' : ''}`} />
                </div>
                <span className="text-[10px] font-semibold text-white mt-1 drop-shadow">
                  Không thích
                </span>
              </button>

              {/* Comments Button */}
              <button
                onClick={() => setIsShortCommentsOpen(true)}
                className="flex flex-col items-center group active:scale-90 transition-transform"
                title="Xem bình luận Shorts"
              >
                <div className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-white mt-1 drop-shadow">
                  {comments.length}
                </span>
              </button>

              {/* Share Button */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex flex-col items-center group active:scale-90 transition-transform"
                title="Chia sẻ Shorts"
              >
                <div className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md">
                  <Share2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold text-white mt-1 drop-shadow">
                  Chia sẻ
                </span>
              </button>

              {/* Sound / Remix Spinning Disc */}
              <div
                className="w-10 h-10 rounded-full border-2 border-white/80 overflow-hidden bg-slate-900 flex items-center justify-center animate-spin"
                style={{ animationDuration: '4s' }}
                title="Âm thanh gốc của Short"
              >
                <Music className="w-4 h-4 text-amber-400" />
              </div>
            </div>

            {/* Shorts Bottom Metadata (Channel + Title) */}
            <div className="absolute left-0 right-14 bottom-2 p-3 z-10 flex flex-col gap-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-auto">
              {/* Channel Row + Subscribe Button */}
              <div className="flex items-center gap-2">
                <img
                  src={episode.channelAvatar || 'https://yt3.googleusercontent.com/IAZc3hD-MjzJAtG3Eainm3ueaTvyalzFYEeBqHm-1rkIbUCmIz9--aemFtvSsV-eQIZS0AS0EQ=s900-c-k-c0x00ffffff-no-rj'}
                  alt={episode.channel}
                  className="w-9 h-9 rounded-full border border-white/40 object-cover shrink-0"
                />
                <span className="font-bold text-xs text-white truncate drop-shadow">
                  {episode.channel}
                </span>

                {onToggleSubscribe && (
                  <button
                    onClick={() => onToggleSubscribe(episode.channel)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 ${
                      isSubscribed
                        ? 'bg-white/20 text-white border border-white/30'
                        : 'bg-red-600 hover:bg-red-500 text-white shadow'
                    }`}
                  >
                    {isSubscribed ? 'Đã đăng ký' : 'Đăng ký'}
                  </button>
                )}
              </div>

              {/* Title */}
              <p className="text-xs font-medium text-white line-clamp-2 drop-shadow">
                {episode.title}
              </p>

              {/* Sound track info */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <Music className="w-3 h-3 text-white shrink-0" />
                <span className="truncate">Âm thanh gốc - {episode.channel}</span>
              </div>
            </div>

            {/* Shorts Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
              <div
                className="h-full bg-red-600 transition-all duration-300"
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* Drawer: Shorts Comments Modal */}
          {isShortCommentsOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">
                {/* Header */}
                <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-red-500" />
                    <h3 className="text-sm font-bold text-white">
                      Bình luận Shorts ({comments.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsShortCommentsOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Direct YouTube real comment sync banner */}
                <div className="p-3 bg-red-600/10 border-b border-red-500/20 flex items-center justify-between gap-2 text-xs text-red-300">
                  <span>Bạn đã đăng nhập YouTube? Bình luận trực tiếp trên YouTube để được ghi nhận 100%!</span>
                  <a
                    href={officialShortsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold shrink-0"
                  >
                    Mở YouTube
                  </a>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  {comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2.5 text-xs">
                      <img
                        src={c.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
                        alt={c.author}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{c.author}</span>
                          <span className="text-[10px] text-slate-400">{c.timeAgo}</span>
                        </div>
                        <p className="text-slate-300 mt-0.5">{c.content}</p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                          <button className="flex items-center gap-1 hover:text-white">
                            <ThumbsUp className="w-3 h-3" />
                            <span>{c.likes}</span>
                          </button>
                          <button className="hover:text-white">
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                          <button className="hover:text-white font-semibold">Trả lời</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add comment input */}
                <form onSubmit={handleAddComment} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Viết bình luận công khai..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    disabled={!commentInput.trim()}
                    className="px-3 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold"
                  >
                    Gửi
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* CASE 2: REGULAR 16:9 YOUTUBE VIDEO VIEW (100% YOUTUBE WATCH)   */
        /* ============================================================== */
        <div className="flex flex-col">
          {/* Main Video Screen */}
          <div
            ref={videoAreaRef}
            onDoubleClick={toggleFullscreen}
            className={`relative w-full bg-black flex items-center justify-center overflow-hidden transition-all duration-200 select-none ${
              isFullscreen
                ? 'fixed inset-0 z-50 w-screen h-screen max-w-none max-h-none rounded-none aspect-auto'
                : 'aspect-video max-h-[500px]'
            }`}
          >
            {/* Watermark Logo (Preserved inside Fullscreen DOM container) */}
            <WatermarkOverlay settings={watermarkSettings} />

            {/* Pre-Ad Countdown Notice ("Quảng cáo sắp bắt đầu sau Xs") */}
            <PreAdCountdownNotice
              secondsRemaining={preAdCountdown}
              totalSeconds={preAdTotalSeconds}
            />

            {/* Video Ad Overlay (Preserved inside Fullscreen DOM container) */}
            {isAdOpen && (
              <VideoAdOverlay
                key={adInstanceKey}
                settings={adSettings}
                onAdFinished={handleAdFinished}
                onOpenSettings={handleOpenAdSettings}
                targetMediaTitle={episode.title}
              />
            )}

            {/* Floating Fullscreen / Exit Fullscreen Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-30 p-2 rounded-xl bg-black/65 hover:bg-black/90 backdrop-blur-md text-white/90 hover:text-white border border-white/20 transition-all shadow-lg active:scale-95"
              title={isFullscreen ? 'Thu nhỏ (Thoát toàn màn hình)' : 'Phóng to toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <div
              className={`w-full h-full relative ${
                displayMode === 'video' ? 'block' : 'opacity-0 pointer-events-none absolute inset-0'
              }`}
            >
              {!isValidYouTubeId(episode.youtubeId) && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-950/95 text-center space-y-3">
                  <img
                    src={episode.thumbnail}
                    alt={episode.title}
                    className="w-28 h-28 rounded-2xl object-cover border border-slate-700 shadow-xl opacity-80"
                  />
                  <div className="max-w-md space-y-1">
                    <h3 className="text-sm font-bold text-white line-clamp-1">{episode.title}</h3>
                    <p className="text-xs text-slate-400">
                      {episode.id?.startsWith('tiktok-')
                        ? 'Đây là video TikTok từ nguồn ngoài. Để xem hoặc tải video MP4 gốc không logo, vui lòng mở mục Tải TikTok.'
                        : 'Video này không có mã ID YouTube 11 ký tự hợp lệ.'}
                    </p>
                  </div>
                  {onNextEpisode && (
                    <button
                      onClick={onNextEpisode}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                    >
                      Phát video tiếp theo
                    </button>
                  )}
                </div>
              )}
              <div ref={ytMountHostRef} className="w-full h-full" />
            </div>

            {/* Audio Ambient Fallback if user explicitly chose Audio Mode */}
            {displayMode === 'audio' && (
              <div className="absolute inset-0 z-10 flex flex-col md:flex-row items-center justify-center p-6 md:p-10 gap-6 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20">
                <div className="relative group shrink-0">
                  <div
                    className={`w-36 h-36 md:w-52 md:h-52 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 transition-transform duration-500 ${
                      isPlaying ? 'scale-105 shadow-amber-500/10' : 'scale-100'
                    }`}
                  >
                    <img
                      src={episode.thumbnail}
                      alt={episode.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="flex flex-col text-center md:text-left max-w-lg">
                  <span className="text-xs font-semibold text-amber-400 tracking-wider uppercase mb-1">
                    Chế độ Âm thanh Phòng thu
                  </span>
                  <h2 className="text-lg md:text-xl font-bold text-slate-100 line-clamp-2 mb-1">
                    {episode.title}
                  </h2>
                  <p className="text-sm text-slate-400 mb-4">{episode.channel}</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick scrubber & Controls toolbar */}
          <div className="p-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
            {/* Progress time */}
            <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-400">
              <span className="text-white font-bold">{formatSeconds(currentTime)}</span>
              <span>/</span>
              <span>{formatSeconds(duration)}</span>
            </div>

            {/* Slider */}
            <div className="flex-1 max-w-md hidden sm:block">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.5}
                value={currentTime}
                onChange={handleSliderSeek}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-600 hover:h-2 transition-all"
              />
            </div>

            {/* Central Controls: Prev, Seek -15, Play, Seek +15, Next */}
            <div className="flex items-center gap-2">
              {onPrevEpisode && (
                <button
                  onClick={onPrevEpisode}
                  disabled={!hasPrevEpisode}
                  className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30"
                  title="Tập trước"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => seekRelative(-15)}
                className="p-1.5 text-slate-400 hover:text-white"
                title="Lùi 15s"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlayPause}
                className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-full active:scale-95 transition-all shadow-md"
                title={isPlaying ? 'Tạm dừng' : 'Phát'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <button
                onClick={() => seekRelative(15)}
                className="p-1.5 text-slate-400 hover:text-white"
                title="Tới 15s"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              {onNextEpisode && (
                <button
                  onClick={onNextEpisode}
                  disabled={!hasNextEpisode}
                  className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30"
                  title="Tập sau"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Utility buttons: Speed, CC, Mute, Mode */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleCC}
                className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                  isCcActive
                    ? 'bg-red-600 text-white border-red-500'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
                title="Bật/Tắt phụ đề CC"
              >
                CC
              </button>

              <button
                onClick={() => handleRateChange(playbackRate === 1 ? 1.25 : playbackRate === 1.25 ? 1.5 : 1)}
                className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[11px] font-mono text-slate-300 hover:text-white"
              >
                {playbackRate}x
              </button>

              <button onClick={toggleMute} className="p-1.5 text-slate-400 hover:text-white">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setDisplayMode(displayMode === 'video' ? 'audio' : 'video')}
                className="p-1.5 text-slate-400 hover:text-white"
                title={displayMode === 'video' ? 'Chuyển sang chế độ Âm thanh' : 'Chuyển sang chế độ Video'}
              >
                {displayMode === 'video' ? <Headphones className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>

              <button
                onClick={toggleFullscreen}
                className={`p-1.5 rounded transition-colors ${
                  isFullscreen ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 hover:text-white'
                }`}
                title={isFullscreen ? 'Thu nhỏ (Thoát toàn màn hình)' : 'Phóng to toàn màn hình'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 100% YOUTUBE TITLE & CHANNEL BAR & ACTION PILLS & DESCRIPTION  */}
      {/* ============================================================== */}
      <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800/80 space-y-4">
        {/* YouTube Video Title */}
        <h1 className="text-base sm:text-lg md:text-xl font-bold text-white leading-snug tracking-tight">
          {episode.title}
        </h1>

        {/* YouTube Channel Row & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-1">
          {/* Channel branding + Subscribe button */}
          <div className="flex items-center gap-3 min-w-0">
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0 hover:opacity-90 transition-opacity"
            >
              <img
                src={episode.channelAvatar || 'https://yt3.googleusercontent.com/IAZc3hD-MjzJAtG3Eainm3ueaTvyalzFYEeBqHm-1rkIbUCmIz9--aemFtvSsV-eQIZS0AS0EQ=s900-c-k-c0x00ffffff-no-rj'}
                alt={episode.channel}
                className="w-full h-full object-cover"
              />
            </a>

            <div className="min-w-0">
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-sm text-white hover:text-amber-400 transition-colors flex items-center gap-1 truncate"
              >
                <span>{episode.channel}</span>
                <span className="w-3.5 h-3.5 rounded-full bg-slate-600 text-[10px] text-white flex items-center justify-center">✓</span>
              </a>
              <p className="text-xs text-slate-400 truncate">
                {episode.channelHandle || '@MinhHieuOfficialvn'} · Kênh chính thức
              </p>
            </div>

            {/* YouTube Standard Pill Subscribe Button */}
            {onToggleSubscribe && (
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  onClick={() => onToggleSubscribe(episode.channel)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 active:scale-95 ${
                    isSubscribed
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      : 'bg-white hover:bg-slate-200 text-slate-950 font-black hover:shadow-md'
                  }`}
                  title={isSubscribed ? 'Đã đăng ký kênh' : 'Đăng ký kênh trên YouTube'}
                >
                  {isSubscribed ? (
                    <>
                      <span>Đã đăng ký</span>
                      <Bell className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    </>
                  ) : (
                    <span>Đăng ký</span>
                  )}
                </button>

                {/* Direct YouTube Subscribe Link for 100% Google account synchronization */}
                <a
                  href={`${channelUrl}?sub_confirmation=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-slate-400 hover:text-red-400 hover:underline hidden xl:inline"
                  title="Nhấn để mở xác nhận đăng ký trực tiếp trên YouTube nếu đã đăng nhập"
                >
                  Xác nhận trên YouTube
                </a>
              </div>
            )}
          </div>

          {/* YouTube Action Buttons (Like/Dislike Pill, Share, Download, Save, Notes) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Split Pill: Like & Dislike */}
            <div className="flex items-center bg-slate-800/90 hover:bg-slate-800 rounded-full p-0.5 border border-slate-700/60 shadow-sm text-xs font-bold">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-full transition-colors active:scale-95 ${
                  hasLiked
                    ? 'text-red-400 font-black'
                    : 'text-slate-200 hover:text-white'
                }`}
                title="Thích video"
              >
                <ThumbsUp className={`w-4 h-4 ${hasLiked ? 'fill-current text-red-500' : ''}`} />
                <span>{likeCount}</span>
              </button>
              <div className="w-[1px] h-4 bg-slate-700" />
              <button
                onClick={handleDislike}
                className={`px-3 py-1.5 rounded-r-full transition-colors active:scale-95 ${
                  hasDisliked ? 'text-red-400' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Không thích video"
              >
                <ThumbsDown className={`w-4 h-4 ${hasDisliked ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Share Pill */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800/90 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-full border border-slate-700/60 transition-colors active:scale-95 shadow-sm"
              title="Chia sẻ video YouTube"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Chia sẻ</span>
            </button>

            {/* VidKraken Download Pill */}
            {onOpenDownloader && (
              <button
                onClick={onOpenDownloader}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800/90 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-full border border-slate-700/60 transition-colors active:scale-95 shadow-sm"
                title="Tải video hoặc audio về máy"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Tải về</span>
              </button>
            )}

            {/* Save / Favorite Pill */}
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(episode.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-bold transition-colors active:scale-95 shadow-sm ${
                  isFavorite
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800/90 hover:bg-slate-800 text-slate-200 border-slate-700/60'
                }`}
                title={isFavorite ? 'Đã lưu vào danh sách yêu thích' : 'Lưu video'}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current text-amber-400' : ''}`} />
                <span>{isFavorite ? 'Đã lưu' : 'Lưu'}</span>
              </button>
            )}

            {/* Add Note Button */}
            <button
              onClick={() => onAddNoteAtCurrentTime(Math.floor(currentTime))}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/90 hover:bg-slate-800 text-slate-200 text-xs font-medium rounded-full border border-slate-700/60 transition-colors"
              title="Ghi chú tại thời điểm này"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Ghi chú</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* YOUTUBE EXPANDABLE DESCRIPTION BOX                            */}
        {/* ============================================================== */}
        <div className="p-3.5 bg-slate-900/90 hover:bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2 transition-colors">
          <div className="flex items-center gap-3 font-bold text-slate-200 flex-wrap">
            <span>{episode.views || '15.420'} lượt xem</span>
            <span>·</span>
            <span>{episode.publishedDate || 'Đã phát hành'}</span>
            <span className="text-amber-400/90">#MinhHieuOfficialVN</span>
            <span className="text-amber-400/90">#Podcast</span>
            {episode.seriesTitle && (
              <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {episode.seriesTitle}
              </span>
            )}
          </div>

          <div className={`text-slate-300 leading-relaxed ${isDescriptionExpanded ? '' : 'line-clamp-2'}`}>
            {episode.description || 'Nội dung video chọn lọc từ kênh YouTube Minh Hiếu Official VN.'}
            <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <p>🔗 Kênh YouTube: <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="text-red-400 underline">{channelUrl}</a></p>
              <p>📻 Podcast RSS: <code className="text-amber-400">https://www.vemaybaynhauyen.com/studo.xml</code></p>
              <p>🎬 ID Video: <code className="text-slate-300">{episode.youtubeId}</code></p>
            </div>
          </div>

          <button
            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            className="font-bold text-slate-100 hover:text-amber-400 transition-colors"
          >
            {isDescriptionExpanded ? 'Ẩn bớt' : '...thêm'}
          </button>
        </div>

        {/* Adcash Large Rectangle 336x280 (Zone 12358782) */}
        <div className="py-2.5 flex justify-center">
          <AdcashBanner zoneId="12358782" format="336x280" />
        </div>

        {/* ============================================================== */}
        {/* KHUNG BÌNH LUẬN 100% YOUTUBE (COMMENTS SECTION)                */}
        {/* ============================================================== */}
        <div className="pt-3 border-t border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{comments.length} bình luận</span>
              </h2>

              {/* Sort selector */}
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setCommentSort('top')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    commentSort === 'top'
                      ? 'bg-slate-800 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Hàng đầu
                </button>
                <button
                  onClick={() => setCommentSort('newest')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    commentSort === 'newest'
                      ? 'bg-slate-800 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Mới nhất
                </button>
              </div>
            </div>

            {/* Direct YouTube Comments link */}
            <a
              href={`${officialYoutubeUrl}#comments`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-full text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
              title="Mở khung bình luận chính thức trên YouTube để tương tác trực tiếp với tài khoản Google của bạn"
            >
              <MessageCircle className="w-3.5 h-3.5 text-red-500" />
              <span>Bình luận trên YouTube (Tài khoản thật)</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>

          {/* Add Public Comment Form */}
          <form onSubmit={handleAddComment} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 font-bold flex items-center justify-center shrink-0 text-sm">
              YT
            </div>

            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Viết bình luận công khai..."
                className="w-full bg-transparent border-b border-slate-700 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 transition-colors"
              />

              {commentInput && (
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCommentInput('')}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-xs font-bold shadow-md transition-all active:scale-95"
                  >
                    Bình luận
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* Comment list */}
          <div className="space-y-4 pt-2">
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-3 text-xs group">
                <img
                  src={c.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
                  alt={c.author}
                  className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{c.author}</span>
                    <span className="text-[11px] text-slate-500">{c.timeAgo}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{c.content}</p>

                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                    <button className="flex items-center gap-1 hover:text-white">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{c.likes}</span>
                    </button>
                    <button className="hover:text-white">
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                    <button className="hover:text-white font-semibold">Trả lời</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 100% YOUTUBE SHARE MODAL DIALOG                                */}
      {/* ============================================================== */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-red-500" />
                <span>Chia sẻ {isShortView ? 'YouTube Shorts' : 'Video YouTube'}</span>
              </h3>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Social Share Buttons */}
            <div className="grid grid-cols-4 gap-2 text-center text-[11px] text-slate-300">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl flex flex-col items-center gap-1 border border-blue-500/30 transition-colors"
              >
                <span className="font-bold text-base">fb</span>
                <span>Facebook</span>
              </a>

              <a
                href={`https://zalo.me/share?url=${encodeURIComponent(getShareUrl())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 rounded-xl flex flex-col items-center gap-1 border border-sky-500/30 transition-colors"
              >
                <span className="font-bold text-base">Zalo</span>
                <span>Zalo</span>
              </a>

              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(episode.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex flex-col items-center gap-1 border border-slate-700 transition-colors"
              >
                <span className="font-bold text-base">𝕏</span>
                <span>Twitter / X</span>
              </a>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${episode.title} - ${getShareUrl()}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-xl flex flex-col items-center gap-1 border border-emerald-500/30 transition-colors"
              >
                <span className="font-bold text-base">WA</span>
                <span>WhatsApp</span>
              </a>
            </div>

            {/* URL Display with Copy button */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">Liên kết video:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getShareUrl()}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 select-all focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow active:scale-95 transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </button>
              </div>

              {copyFeedback && (
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{copyFeedback}</span>
                </p>
              )}
            </div>

            {/* Checkbox: Start at timestamp */}
            {!isShortView && (
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={shareIncludeTime}
                  onChange={(e) => setShareIncludeTime(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-red-600 focus:ring-0"
                />
                <span>Bắt đầu tại thời điểm <strong className="text-white font-mono">{formatSeconds(currentTime)}</strong></span>
              </label>
            )}
          </div>
        </div>
      )}

      {/* Ad & Watermark Settings Modal */}
      <AdSettingsModal
        isOpen={isAdSettingsModalOpen}
        onClose={() => setIsAdSettingsModalOpen(false)}
        adSettings={adSettings}
        watermarkSettings={watermarkSettings}
        onSaveAdSettings={(s) => setAdSettings(s)}
        onSaveWatermarkSettings={(w) => setWatermarkSettings(w)}
        onTriggerTestAd={triggerManualAd}
      />
    </div>
  );
};
