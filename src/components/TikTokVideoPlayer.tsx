import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Download,
  Share2,
  Bookmark,
  BookmarkPlus,
  ExternalLink,
  RefreshCw,
  Repeat,
  Settings,
  Music,
  Check,
  Loader2,
  Sparkles,
  ThumbsUp,
  AlertCircle,
} from 'lucide-react';
import { PodcastEpisode } from '../types/podcast';
import {
  TikTokVideoData,
  fetchTikTokVideoData,
  getTikTokInlineStreamUrl,
  downloadTikTokFile,
  generateTikTokDownloadFileName,
  extractTikTokVideoId,
} from '../utils/tiktokApi';
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
import { hasBackend } from '../utils/api';
import {
  YouTubeSubscribeGateModal,
  isYouTubeSubUnlocked,
  subscribeYouTubeUnlockState,
} from './YouTubeSubscribeGateModal';

interface PlayerErrorBoundaryProps {
  resetKey?: string;
  children: React.ReactNode;
}

interface PlayerErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Prevents any unexpected media/DOM error inside a video player from white-screening the app
 */
export class PlayerErrorBoundary extends React.Component<
  PlayerErrorBoundaryProps,
  PlayerErrorBoundaryState
> {
  constructor(props: PlayerErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): PlayerErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Đã xảy ra lỗi hiển thị trình phát video.',
    };
  }

  componentDidUpdate(prevProps: PlayerErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3 shadow-xl">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">Đang khôi phục trình phát video</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">{this.state.errorMessage}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tải lại trình phát</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export interface TikTokVideoPlayerProps {
  variant?: 'full' | 'compact';
  episode?: PodcastEpisode;
  tiktokData?: TikTokVideoData | null;
  sourceUrl?: string;
  autoPlay?: boolean;
  onAddNoteAtCurrentTime?: (time: number) => void;
  seekTargetTime?: number | null;
  onSeekHandled?: () => void;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  onEnded?: () => void;
  hasNextEpisode?: boolean;
  hasPrevEpisode?: boolean;
  onToggleFavorite?: (episodeId: string) => void;
  isFavorite?: boolean;
  onShowToast?: (msg: string) => void;
}

export const TikTokVideoPlayer: React.FC<TikTokVideoPlayerProps> = ({
  variant = 'full',
  episode,
  tiktokData,
  sourceUrl,
  autoPlay = false,
  onAddNoteAtCurrentTime,
  seekTargetTime,
  onSeekHandled,
  onNextEpisode,
  onPrevEpisode,
  onEnded,
  hasNextEpisode = false,
  hasPrevEpisode = false,
  onToggleFavorite,
  isFavorite = false,
  onShowToast,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerBoxRef = useRef<HTMLDivElement | null>(null);

  // Derive normalized metadata from either `tiktokData` or `episode`
  const videoId = String(
    tiktokData?.id ||
      extractTikTokVideoId(episode?.tiktokUrl) ||
      extractTikTokVideoId(sourceUrl) ||
      episode?.youtubeId ||
      ''
  );
  const canonicalTikTokUrl =
    tiktokData?.videoUrl ||
    episode?.tiktokUrl ||
    sourceUrl ||
    (videoId ? `https://www.tiktok.com/@tiktok/video/${videoId}` : 'https://www.tiktok.com');

  const title =
    tiktokData?.description ||
    episode?.title ||
    (tiktokData?.author?.username ? `TikTok @${tiktokData.author.username}` : 'Video TikTok HD');
  const authorName =
    tiktokData?.author?.nickname || episode?.channel || tiktokData?.author?.username || 'TikTok Creator';
  const authorHandle = tiktokData?.author?.username
    ? `@${tiktokData.author.username}`
    : episode?.channelHandle || '@tiktok';
  const authorAvatar = tiktokData?.author?.avatar || episode?.channelAvatar || episode?.thumbnail || '';
  const posterUrl = tiktokData?.cover || episode?.thumbnail || '';

  const [resolvedInfo, setResolvedInfo] = useState<TikTokVideoData | null>(tiktokData || null);
  const [useHd, setUseHd] = useState<boolean>(false);
  const [forceTranscode, setForceTranscode] = useState<boolean>(Boolean(tiktokData?.needsTranscode));
  const [streamStage, setStreamStage] = useState<'proxy' | 'direct' | 'embed'>('proxy');
  const [isRefreshingStream, setIsRefreshingStream] = useState<boolean>(false);
  const hasRetriedFreshRef = useRef<boolean>(false);

  // Playback UI states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(
    tiktokData?.duration || episode?.durationSeconds || 30
  );
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(variant === 'compact');
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isVerticalView, setIsVerticalView] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);

  // Explicit user-initiated download state & YouTube subscribe gate
  const [isDownloadingFile, setIsDownloadingFile] = useState<boolean>(false);
  const [downloadPct, setDownloadPct] = useState<number>(0);
  const [isSubGateOpen, setIsSubGateOpen] = useState<boolean>(false);
  const [isSubUnlocked, setIsSubUnlocked] = useState<boolean>(() => isYouTubeSubUnlocked());
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [hasLiked, setHasLiked] = useState<boolean>(false);

  // Ad & Watermark states (for full workspace player)
  const [adSettings, setAdSettings] = useState<AdSettings>(getStoredAdSettings);
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>(
    getStoredWatermarkSettings
  );
  const [isAdSettingsModalOpen, setIsAdSettingsModalOpen] = useState<boolean>(false);
  const { isAdmin, requireAdmin, openAdminModal } = useAdminAuth();

  useEffect(() => {
    return subscribeYouTubeUnlockState((unlocked) => setIsSubUnlocked(unlocked));
  }, []);

  // Sync incoming tiktokData or episode changes
  useEffect(() => {
    hasRetriedFreshRef.current = false;
    setStreamStage('proxy');
    setUseHd(false);
    setForceTranscode(Boolean(tiktokData?.needsTranscode));
    setCurrentTime(0);
    setIsPlaying(false);

    if (tiktokData) {
      setResolvedInfo(tiktokData);
      if (tiktokData.duration && tiktokData.duration > 0) {
        setDuration(tiktokData.duration);
      }
      return;
    }

    // In full episode mode, if we don't have a fresh MP4 URL or want fresh metadata, resolve silently
    if (episode) {
      setResolvedInfo(null);
      if (episode.durationSeconds && episode.durationSeconds > 0) {
        setDuration(episode.durationSeconds);
      }
      if (canonicalTikTokUrl.includes('tiktok.com')) {
        setIsRefreshingStream(true);
        fetchTikTokVideoData(canonicalTikTokUrl)
          .then((fresh) => {
            setResolvedInfo(fresh);
            setForceTranscode(Boolean(fresh.needsTranscode));
            if (fresh.duration && fresh.duration > 0) setDuration(fresh.duration);
          })
          .catch(() => {
            if (!episode.videoUrl) setStreamStage('embed');
          })
          .finally(() => {
            setIsRefreshingStream(false);
          });
      }
    }
  }, [tiktokData, episode?.id, episode?.youtubeId, canonicalTikTokUrl]);

  // Ad & Watermark remote sync (full mode)
  useEffect(() => {
    if (variant !== 'full') return;
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
    return () => window.removeEventListener(AD_SETTINGS_UPDATED_EVENT, handleUpdate);
  }, [variant]);

  const pauseMainTikTokVideo = () => {
    if (videoRef.current && !videoRef.current.paused) {
      try {
        videoRef.current.pause();
        setIsPlaying(false);
      } catch {}
    }
  };

  const resumeMainTikTokVideo = () => {
    if (videoRef.current) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
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
    mediaKey: `tiktok-${videoId || episode?.id || 'preview'}`,
    adSettings,
    scopeEnabled: Boolean(variant === 'full' && adSettings.enabled && adSettings.showInYouTube),
    currentTime,
    duration,
    isMainPlaying: isPlaying,
    isEmbedWithoutTimeline: streamStage === 'embed',
    onPauseMainVideo: pauseMainTikTokVideo,
    onResumeMainVideo: resumeMainTikTokVideo,
  });

  // External seek support
  useEffect(() => {
    if (seekTargetTime !== undefined && seekTargetTime !== null && videoRef.current) {
      try {
        videoRef.current.currentTime = seekTargetTime;
        setCurrentTime(seekTargetTime);
        videoRef.current.play().catch(() => {});
        if (onSeekHandled) onSeekHandled();
      } catch {}
    }
  }, [seekTargetTime, onSeekHandled]);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => {
      const doc = document as any;
      setIsFullscreen(
        Boolean(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement)
      );
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const el = playerBoxRef.current;
    if (!el) return;
    const doc = document as any;
    const activeFs = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (!activeFs) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => setIsFullscreen(true));
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Compute active inline MP4 source (prioritize H.264 playUrl so video frames always decode)
  const rawMp4Candidate = useHd
    ? resolvedInfo?.hdPlayUrl ||
      resolvedInfo?.playUrl ||
      episode?.videoUrl ||
      episode?.hdVideoUrl ||
      resolvedInfo?.downloadUrl ||
      ''
    : resolvedInfo?.playUrl ||
      episode?.videoUrl ||
      resolvedInfo?.hdPlayUrl ||
      resolvedInfo?.downloadUrl ||
      '';

  const activeVideoSrc =
    streamStage === 'proxy'
      ? getTikTokInlineStreamUrl(rawMp4Candidate, canonicalTikTokUrl, forceTranscode)
      : streamStage === 'direct'
      ? rawMp4Candidate
      : '';

  const embedIframeUrl = /^\d{15,22}$/.test(videoId)
    ? `https://www.tiktok.com/player/v1/${videoId}?music_info=1&description=0&autoplay=${
        autoPlay ? '1' : '0'
      }&loop=${isLooping ? '1' : '0'}`
    : '';

  // Detect audio-only HEVC decode failure (videoWidth === 0) and auto-recover to H.264 / FFmpeg transcode
  const handleLoadedMetadataCheck = (el: HTMLVideoElement) => {
    const d = el.duration;
    if (d && !Number.isNaN(d) && d > 0) setDuration(d);
    el.volume = volume;
    el.playbackRate = playbackRate;

    if (el.videoWidth === 0 || el.videoHeight === 0) {
      if (useHd) {
        setUseHd(false);
        return;
      }
      if (!forceTranscode && hasBackend()) {
        setForceTranscode(true);
        setStreamStage('proxy');
        return;
      }
      if (embedIframeUrl) {
        setStreamStage('embed');
      }
    }
  };

  // Automatic stream recovery if CDN URL fails or expired
  const handleVideoError = async () => {
    if (!forceTranscode && hasBackend() && rawMp4Candidate) {
      setForceTranscode(true);
      setStreamStage('proxy');
      return;
    }

    if (streamStage === 'proxy' && rawMp4Candidate && !forceTranscode) {
      setStreamStage('direct');
      return;
    }

    if (!hasRetriedFreshRef.current && canonicalTikTokUrl.includes('tiktok.com')) {
      hasRetriedFreshRef.current = true;
      setIsRefreshingStream(true);
      try {
        const fresh = await fetchTikTokVideoData(canonicalTikTokUrl);
        setResolvedInfo(fresh);
        setForceTranscode(Boolean(fresh.needsTranscode));
        setStreamStage('proxy');
        setIsRefreshingStream(false);
        return;
      } catch {
        setIsRefreshingStream(false);
      }
    }

    if (embedIframeUrl) {
      setStreamStage('embed');
    }
  };

  const togglePlayPause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const seekBy = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    const next = Math.max(0, Math.min((v.currentTime || 0) + delta, duration || 30));
    v.currentTime = next;
    setCurrentTime(next);
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = parseFloat(e.target.value);
    setCurrentTime(next);
    if (videoRef.current) {
      videoRef.current.currentTime = next;
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (v) {
      v.muted = nextMuted;
    }
  };

  const handleVolumeSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const cycleSpeed = () => {
    const nextRate = playbackRate === 1 ? 1.25 : playbackRate === 1.25 ? 1.5 : 1;
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  const executeVideoDownload = async () => {
    if (isDownloadingFile) return;
    const dlUrl =
      resolvedInfo?.playUrl ||
      resolvedInfo?.hdPlayUrl ||
      resolvedInfo?.downloadUrl ||
      episode?.videoUrl ||
      episode?.hdVideoUrl ||
      '';
    if (!dlUrl && !canonicalTikTokUrl) return;

    const fileName = generateTikTokDownloadFileName(title, videoId);
    setIsDownloadingFile(true);
    setDownloadPct(0);
    try {
      await downloadTikTokFile(dlUrl, fileName, (pct) => setDownloadPct(pct), canonicalTikTokUrl);
      if (onShowToast) onShowToast(`Đã lưu video thành công: ${fileName}`);
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('Không thể tải tệp lúc này: ' + (err?.message || 'Vui lòng thử lại'));
      }
    } finally {
      setIsDownloadingFile(false);
    }
  };

  // Explicit Download Handler - Admin bypasses subscription gate; regular users unlock via @minhhieureviewphim
  const handleExplicitDownload = () => {
    if (isDownloadingFile) return;
    if (!isAdmin && !isSubUnlocked && !isYouTubeSubUnlocked()) {
      setIsSubGateOpen(true);
      return;
    }
    executeVideoDownload();
  };

  const handleOpenAdSettings = () => {
    requireAdmin(
      () => setIsAdSettingsModalOpen(true),
      'Cài Đặt Quảng Cáo & Watermark Logo',
      'Thay đổi cấu hình quảng cáo phủ video và logo thương hiệu yêu cầu quyền Quản trị viên.'
    );
  };

  // ============================================================================
  // COMPACT MODE (Used inside TikTokDownloaderStudio for pure inline preview)
  // ============================================================================
  if (variant === 'compact') {
    return (
      <div
        ref={playerBoxRef}
        className={`relative bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl select-none group ${
          isFullscreen
            ? 'fixed inset-0 z-50 w-screen h-screen max-w-none max-h-none rounded-none border-0'
            : 'h-[470px] sm:h-[490px] mx-auto w-full max-w-[285px]'
        }`}
      >
        {/* Top Floating Quality & Fullscreen Controls */}
        <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between gap-1.5 pointer-events-auto">
          <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-cyan-500/30 text-[10px] font-bold text-cyan-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>TikTok HD</span>
          </span>

          <div className="flex items-center gap-1">
            {embedIframeUrl && (
              <button
                type="button"
                onClick={() => setStreamStage(streamStage === 'embed' ? 'proxy' : 'embed')}
                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/65 hover:bg-black/85 text-slate-200 border border-white/15 transition-colors"
                title="Đổi chế độ trình phát"
              >
                {streamStage === 'embed' ? 'MP4' : 'Nhúng'}
              </button>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-black/65 hover:bg-black/85 text-white border border-white/15 transition-colors"
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Center Video Stage with explicit inset-0 geometry so video frames always render */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black overflow-hidden">
          {streamStage === 'embed' && embedIframeUrl ? (
            <iframe
              src={embedIframeUrl}
              title={title}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : activeVideoSrc ? (
            <>
              <video
                ref={videoRef}
                key={`${activeVideoSrc}-${forceTranscode ? 'tx' : 'raw'}-${useHd ? 'hd' : 'sd'}`}
                src={activeVideoSrc}
                poster={posterUrl}
                playsInline
                preload="auto"
                loop={isLooping}
                muted={isMuted}
                autoPlay={autoPlay}
                onClick={togglePlayPause}
                onPlay={() => {
                  setIsPlaying(true);
                  setIsBuffering(false);
                }}
                onPause={() => setIsPlaying(false)}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                onLoadedMetadata={(e) => handleLoadedMetadataCheck(e.currentTarget)}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onEnded={() => {
                  if (!isLooping) setIsPlaying(false);
                }}
                onError={handleVideoError}
                className="w-full h-full object-contain bg-black cursor-pointer"
              />

              {/* Center Play Button Overlay when paused */}
              {!isPlaying && !isBuffering && !isRefreshingStream && (
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="absolute z-10 w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-rose-500 text-white shadow-xl shadow-cyan-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                  title="Phát video"
                >
                  <Play className="w-6 h-6 fill-white translate-x-0.5" />
                </button>
              )}

              {(isBuffering || isRefreshingStream) && (
                <div className="absolute z-10 flex flex-col items-center gap-2 pointer-events-none">
                  <Loader2 className="w-9 h-9 text-cyan-400 animate-spin" />
                  <span className="text-[11px] font-semibold text-white bg-black/75 px-2.5 py-0.5 rounded-full">
                    Đang tải khung hình...
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 text-center space-y-2">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-300">Đang kết nối trình phát...</p>
            </div>
          )}
        </div>

        {/* Bottom Custom Controls Bar (for HTML5 <video> stage) */}
        {streamStage !== 'embed' && activeVideoSrc && (
          <div className="absolute bottom-0 inset-x-0 z-20 px-3 pt-6 pb-2.5 bg-gradient-to-t from-black/95 via-black/75 to-transparent space-y-1.5">
            <input
              type="range"
              min={0}
              max={duration || 30}
              step={0.1}
              value={Math.min(currentTime, duration || 30)}
              onChange={handleScrub}
              className="w-full h-1 bg-white/25 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex items-center justify-between text-[11px] text-white">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="p-1 hover:text-cyan-300 transition-colors"
                  title={isPlaying ? 'Tạm dừng' : 'Phát'}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                </button>
                <span className="font-mono text-[10px] text-slate-200 tabular-nums">
                  {formatSeconds(currentTime)} / {formatSeconds(duration)}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsLooping(!isLooping)}
                  className={`p-1 rounded transition-colors ${
                    isLooping ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
                  }`}
                  title={isLooping ? 'Đang bật lặp lại' : 'Bật lặp lại'}
                >
                  <Repeat className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1 hover:text-cyan-300 transition-colors"
                  title={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // FULL WORKSPACE MODE (Dedicated TikTok Player for Channel / Queue Playback)
  // ============================================================================
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col font-sans">
      {/* Top Header Bar */}
      <div className="px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-r from-cyan-500/15 to-rose-500/15 border border-cyan-500/30 text-cyan-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Trình Phát TikTok HD</span>
          </div>

          <button
            type="button"
            onClick={() => setIsVerticalView(!isVerticalView)}
            className={`px-2.5 py-1 rounded-md border font-medium transition-all flex items-center gap-1.5 ${
              isVerticalView
                ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Chuyển đổi khung dọc 9:16 hoặc khung ngang 16:9"
          >
            <span>{isVerticalView ? '📱 Khung Dọc 9:16' : '🖥️ Khung Ngang 16:9'}</span>
          </button>

          {embedIframeUrl && (
            <button
              type="button"
              onClick={() => setStreamStage(streamStage === 'embed' ? 'proxy' : 'embed')}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition-colors"
              title="Đổi nguồn phát MP4 gốc hoặc trình nhúng TikTok chính thức"
            >
              {streamStage === 'embed' ? '⚡ Đổi sang MP4 Gốc' : '🌐 Nguồn Nhúng Dự Phòng'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAdSettings}
            className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold rounded-full flex items-center gap-1.5 text-xs transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Cài Đặt QC &amp; Logo</span>
          </button>

          <a
            href={canonicalTikTokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-gradient-to-r from-cyan-600 to-rose-600 hover:opacity-95 text-white font-bold rounded-full flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
          >
            <span>Mở trên TikTok</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Main Video Stage */}
      <div className="relative bg-black flex flex-col items-center justify-center overflow-hidden">
        {posterUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20 scale-125 pointer-events-none"
            style={{ backgroundImage: `url(${posterUrl})` }}
          />
        )}

        <div
          ref={playerBoxRef}
          onDoubleClick={toggleFullscreen}
          className={`relative overflow-hidden bg-black flex items-center justify-center transition-all duration-200 select-none ${
            isFullscreen
              ? 'fixed inset-0 z-50 w-screen h-screen max-w-none max-h-none rounded-none border-0'
              : isVerticalView
              ? 'my-3 w-full max-w-[360px] sm:max-w-[390px] h-[540px] sm:h-[600px] rounded-2xl border border-slate-800 shadow-2xl'
              : 'w-full h-[280px] sm:h-[460px] max-h-[520px]'
          }`}
        >
          {/* Brand Watermark */}
          <WatermarkOverlay settings={watermarkSettings} />

          {/* Pre-Ad Countdown Notice */}
          <PreAdCountdownNotice
            secondsRemaining={preAdCountdown}
            totalSeconds={preAdTotalSeconds}
          />

          {/* In-Stream Video Ad Overlay */}
          {isAdOpen && (
            <VideoAdOverlay
              key={adInstanceKey}
              settings={adSettings}
              onAdFinished={handleAdFinished}
              onOpenSettings={handleOpenAdSettings}
              targetMediaTitle={title}
            />
          )}

          {streamStage === 'embed' && embedIframeUrl ? (
            <iframe
              src={embedIframeUrl}
              title={title}
              className="absolute inset-0 w-full h-full border-0 z-10"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : activeVideoSrc ? (
            <>
              <video
                ref={videoRef}
                key={`${activeVideoSrc}-${forceTranscode ? 'tx' : 'raw'}-${useHd ? 'hd' : 'sd'}`}
                src={activeVideoSrc}
                poster={posterUrl}
                playsInline
                preload="auto"
                autoPlay={!isAdOpen}
                loop={isLooping}
                muted={isMuted}
                onClick={togglePlayPause}
                onPlay={() => {
                  if (isAdOpen) {
                    videoRef.current?.pause();
                    setIsPlaying(false);
                    return;
                  }
                  setIsPlaying(true);
                  setIsBuffering(false);
                }}
                onPause={() => setIsPlaying(false)}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                onLoadedMetadata={(e) => handleLoadedMetadataCheck(e.currentTarget)}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onEnded={() => {
                  if (isLooping) return;
                  setIsPlaying(false);
                  interceptVideoEnded(() => {
                    if (onEnded) onEnded();
                  });
                }}
                onError={handleVideoError}
                className="absolute inset-0 w-full h-full object-contain bg-black cursor-pointer z-10"
              />

              {!isPlaying && !isBuffering && !isRefreshingStream && !isAdOpen && (
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="absolute z-20 w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-rose-500 text-white shadow-2xl shadow-cyan-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                  title="Phát video TikTok"
                >
                  <Play className="w-7 h-7 fill-white translate-x-0.5" />
                </button>
              )}

              {(isBuffering || isRefreshingStream) && !isAdOpen && (
                <div className="absolute z-20 flex flex-col items-center gap-2 pointer-events-none">
                  <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                  <span className="text-xs font-semibold text-white bg-black/75 px-3 py-1 rounded-full border border-cyan-500/30">
                    Đang nạp video TikTok HD...
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="relative z-10 p-6 text-center space-y-3">
              <Loader2 className="w-9 h-9 text-cyan-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-300">Đang kết nối luồng phát TikTok...</p>
            </div>
          )}
        </div>
      </div>

      {/* Transport Controls Bar */}
      {streamStage !== 'embed' && (
        <div className="p-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-400">
            <span className="text-white font-bold">{formatSeconds(currentTime)}</span>
            <span>/</span>
            <span>{formatSeconds(duration)}</span>
          </div>

          <div className="flex-1 min-w-[140px] max-w-md">
            <input
              type="range"
              min={0}
              max={duration || 30}
              step={0.1}
              value={Math.min(currentTime, duration || 30)}
              onChange={handleScrub}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {onPrevEpisode && (
              <button
                type="button"
                onClick={onPrevEpisode}
                disabled={!hasPrevEpisode}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30"
                title="Video trước"
              >
                <SkipBack className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => seekBy(-5)}
              className="p-1.5 text-slate-400 hover:text-white"
              title="Lùi 5s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={togglePlayPause}
              className="p-2 bg-gradient-to-r from-cyan-500 to-rose-500 hover:opacity-90 text-white rounded-full active:scale-95 transition-all shadow-md"
              title={isPlaying ? 'Tạm dừng' : 'Phát'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => seekBy(5)}
              className="p-1.5 text-slate-400 hover:text-white"
              title="Tới 5s"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            {onNextEpisode && (
              <button
                type="button"
                onClick={onNextEpisode}
                disabled={!hasNextEpisode}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30"
                title="Video tiếp theo"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setUseHd(!useHd)}
              className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                useHd
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
              title="Chất lượng video"
            >
              {useHd ? 'HD' : 'SD'}
            </button>

            <button
              type="button"
              onClick={() => setIsLooping(!isLooping)}
              className={`p-1.5 rounded border transition-colors ${
                isLooping
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title={isLooping ? 'Đang bật lặp lại' : 'Lặp lại video'}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={cycleSpeed}
              className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[11px] font-mono text-slate-300 hover:text-white"
              title="Tốc độ phát"
            >
              {playbackRate}x
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 text-slate-400 hover:text-white"
              title={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeSlider}
              className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hidden sm:block"
            />

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 text-slate-400 hover:text-white"
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Metadata & Explicit Action Pills */}
      <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800/80 space-y-4">
        <h1 className="text-base sm:text-lg font-bold text-white leading-snug">{title}</h1>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {authorAvatar ? (
              <img
                src={authorAvatar}
                alt={authorName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border border-slate-700 bg-slate-800 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-rose-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                TT
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm text-white truncate">{authorName}</p>
              <p className="text-xs text-cyan-400 font-mono truncate flex items-center gap-1.5">
                <span>{authorHandle}</span>
                {resolvedInfo?.musicTitle && (
                  <>
                    <span className="text-slate-600">·</span>
                    <Music className="w-3 h-3 text-rose-400 inline" />
                    <span className="text-slate-400 font-sans truncate max-w-[180px]">
                      {resolvedInfo.musicTitle}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setHasLiked(!hasLiked)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-bold transition-colors ${
                hasLiked
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-800/90 hover:bg-slate-800 text-slate-200 border-slate-700/60'
              }`}
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? 'fill-current text-rose-400' : ''}`} />
              <span>Thích</span>
            </button>

            {/* Download Button with YouTube Subscribe Gate (Admin bypassed) */}
            <button
              type="button"
              onClick={handleExplicitDownload}
              disabled={isDownloadingFile}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-600 to-rose-600 hover:opacity-95 disabled:opacity-50 text-white text-xs font-extrabold shadow-md transition-all active:scale-95"
              title="Tải video chất lượng cao sạch watermark"
            >
              {isDownloadingFile ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tải {downloadPct > 0 ? `${downloadPct}%` : '...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải Video Không Logo</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(canonicalTikTokUrl);
                setCopiedShare(true);
                setTimeout(() => setCopiedShare(false), 2000);
                if (onShowToast) onShowToast('Đã sao chép link video TikTok!');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800/90 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-full border border-slate-700/60 transition-colors"
            >
              {copiedShare ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>{copiedShare ? 'Đã chép' : 'Chia sẻ'}</span>
            </button>

            {onToggleFavorite && episode && (
              <button
                type="button"
                onClick={() => onToggleFavorite(episode.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-bold transition-colors ${
                  isFavorite
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800/90 hover:bg-slate-800 text-slate-200 border-slate-700/60'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current text-amber-400' : ''}`} />
                <span>{isFavorite ? 'Đã lưu' : 'Lưu'}</span>
              </button>
            )}

            {onAddNoteAtCurrentTime && (
              <button
                type="button"
                onClick={() => onAddNoteAtCurrentTime(Math.floor(currentTime))}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/90 hover:bg-slate-800 text-slate-200 text-xs font-medium rounded-full border border-slate-700/60 transition-colors"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Ghi chú</span>
              </button>
            )}
          </div>
        </div>

        {/* Adcash Large Rectangle 336x280 */}
        <div className="py-2 flex justify-center">
          <AdcashBanner zoneId="12358782" format="336x280" />
        </div>
      </div>

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

      {/* YouTube Subscription Unlock Modal for non-Admin users */}
      <YouTubeSubscribeGateModal
        isOpen={isSubGateOpen}
        onClose={() => setIsSubGateOpen(false)}
        onUnlocked={() => {
          setIsSubUnlocked(true);
          executeVideoDownload();
        }}
        onOpenAdminLogin={() =>
          openAdminModal(
            'Đăng Nhập Quản Trị Viên',
            'Tài khoản Admin có thể tải video trực tiếp không cần qua bước đăng ký kênh.'
          )
        }
        onShowToast={onShowToast}
      />
    </div>
  );
};
