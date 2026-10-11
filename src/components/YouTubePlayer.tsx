import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  BookmarkPlus,
  Maximize2,
  Headphones,
  Video,
  Moon,
  ExternalLink,
  Subtitles,
  Check,
  Bell,
  Sparkles,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { PodcastEpisode } from '../types/podcast';
import { formatSeconds } from '../utils/youtube';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
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
}

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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

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

  // CC (Closed Captions) state: true = visible, false = hidden
  const [isCcActive, setIsCcActive] = useState<boolean>(false);

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

  // Initialize player or switch video with loadVideoById
  useEffect(() => {
    if (!isApiReady || !episode.youtubeId) return;

    // If player already exists, simply load the new video and play seamlessly
    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      try {
        playerRef.current.loadVideoById(episode.youtubeId);
        setIsPlaying(true);
        setCurrentTime(0);
        return;
      } catch (e) {
        console.warn('Error calling loadVideoById, will recreate player:', e);
      }
    }

    // Otherwise create initial player
    const playerId = 'casttube-yt-iframe';

    const player = new window.YT.Player(playerId, {
      videoId: episode.youtubeId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        fs: 1,
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
            if (!isCcActive) {
              if (typeof event.target.unloadModule === 'function') {
                event.target.unloadModule('captions');
              }
              if (typeof event.target.setOption === 'function') {
                event.target.setOption('captions', 'track', {});
              }
            } else {
              if (typeof event.target.loadModule === 'function') {
                event.target.loadModule('captions');
              }
            }
          } catch (e) {
            // ignore
          }

          try {
            event.target.playVideo();
            setIsPlaying(true);
          } catch (e) {
            // browser autoplay policy
          }
        },
        onStateChange: (event: any) => {
          if (event.data === 1) {
            setIsPlaying(true);
            const dur = event.target.getDuration();
            if (dur && dur > 0) setDuration(dur);
          } else if (event.data === 2) {
            setIsPlaying(false);
          } else if (event.data === 0) {
            // Track finished -> auto advance to next episode
            setIsPlaying(false);
            if (onEnded) onEnded();
          }
        },
      },
    });

    playerRef.current = player;

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [isApiReady, episode.youtubeId]);

  // Handle external seek requests
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

  // Sleep timer interval
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
        if (val === 0) {
          playerRef.current.mute();
        } else {
          playerRef.current.unMute();
        }
      } catch (e) {
        console.error(e);
      }
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
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle or Hide CC (Phụ đề)
  const toggleCC = () => {
    const nextCc = !isCcActive;
    setIsCcActive(nextCc);

    if (playerRef.current) {
      try {
        if (!nextCc) {
          // Hide / Disable captions
          if (typeof playerRef.current.unloadModule === 'function') {
            playerRef.current.unloadModule('captions');
          }
          if (typeof playerRef.current.setOption === 'function') {
            playerRef.current.setOption('captions', 'track', {});
          }
        } else {
          // Show / Load captions
          if (typeof playerRef.current.loadModule === 'function') {
            playerRef.current.loadModule('captions');
          }
          if (typeof playerRef.current.setOption === 'function') {
            playerRef.current.setOption('captions', 'track', { languageCode: 'vi' });
          }
        }
      } catch (e) {
        console.warn('Could not toggle CC directly:', e);
      }

      // Also dispatch postMessage to ensure iframe receives command
      try {
        const iframe = document.getElementById('casttube-yt-iframe') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'setOption',
              args: ['captions', 'track', nextCc ? { languageCode: 'vi' } : {}],
            }),
            '*'
          );
        }
      } catch (e) {
        // ignore
      }
    }
  };

  const setSleepMinutes = (minutes: number | null) => {
    setShowSleepMenu(false);
    if (minutes === null) {
      setSleepTimerRemaining(null);
    } else {
      setSleepTimerRemaining(minutes * 60);
    }
  };

  const channelUrl = episode.channelUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(episode.channel)}`;

  return (
    <div
      ref={containerRef}
      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
    >
      {/* Channel Header & Top Controls Toolbar */}
      <div className="px-5 py-3.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
        {/* Channel branding + Subscribe button */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
            {episode.channelAvatar ? (
              <img
                src={episode.channelAvatar}
                alt={episode.channel}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-amber-400 text-sm">
                {episode.channel.charAt(0)}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100 truncate">
                {episode.channel}
              </span>
              {episode.channelHandle && (
                <span className="hidden sm:inline text-xs text-slate-400">
                  {episode.channelHandle}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate max-w-xs md:max-w-md">
              {episode.title}
            </p>
          </div>

          {/* YouTube Official-Style Subscribe Button */}
          {onToggleSubscribe && (
            <div className="flex items-center gap-1.5 ml-1">
              <button
                onClick={() => onToggleSubscribe(episode.channel)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 active:scale-95 ${
                  isSubscribed
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    : 'bg-white hover:bg-slate-200 text-slate-950 hover:shadow-md'
                }`}
                title={isSubscribed ? 'Đã đăng ký kênh' : 'Nhấp để đăng ký kênh trên YouTube'}
              >
                {isSubscribed ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đã đăng ký</span>
                    <Bell className="w-3 h-3 text-amber-400 ml-0.5 fill-current" />
                  </>
                ) : (
                  <>
                    <span className="text-red-600 font-black">▶</span>
                    <span>Đăng ký</span>
                  </>
                )}
              </button>

              <a
                href={`${channelUrl}?sub_confirmation=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-slate-400 hover:text-amber-400 hover:underline hidden xl:inline"
                title="Mở xác nhận đăng ký trực tiếp trên YouTube"
              >
                Mở kênh
              </a>
            </div>
          )}
        </div>

        {/* View mode toggle + Direct YouTube link */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center p-0.5 bg-slate-800/80 rounded-lg border border-slate-700/50">
            <button
              onClick={() => setDisplayMode('video')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                displayMode === 'video'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Chế độ xem video YouTube"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Video</span>
            </button>
            <button
              onClick={() => setDisplayMode('audio')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                displayMode === 'audio'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Chế độ âm thanh phòng thu (Audio-first)"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Âm thanh</span>
            </button>
          </div>

          <a
            href={`https://www.youtube.com/watch?v=${episode.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Mở trực tiếp trên YouTube"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Main View Area: Video or Audio Ambient */}
      <div className="relative w-full bg-black aspect-video max-h-[460px] flex items-center justify-center overflow-hidden">
        {/* YouTube IFrame target */}
        <div
          className={`w-full h-full ${
            displayMode === 'video' ? 'block' : 'opacity-0 pointer-events-none absolute inset-0'
          }`}
        >
          <div id="casttube-yt-iframe" className="w-full h-full" />
        </div>

        {/* Ambient Audio View */}
        {displayMode === 'audio' && (
          <div className="absolute inset-0 z-10 flex flex-col md:flex-row items-center justify-center p-6 md:p-10 gap-6 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20">
            {/* Vinyl artwork */}
            <div className="relative group shrink-0">
              <div
                className={`w-36 h-36 md:w-52 md:h-52 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 transition-transform duration-500 ${
                  isPlaying ? 'scale-105 shadow-amber-500/10' : 'scale-100'
                }`}
              >
                <img
                  src={episode.thumbnail}
                  alt={episode.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-amber-500/10 blur-xl -z-10" />
            </div>

            {/* Audio Info & Waveform */}
            <div className="flex flex-col text-center md:text-left max-w-lg">
              <span className="text-xs font-semibold text-amber-400 tracking-wider uppercase mb-1">
                Phòng thu Podcast Ambient
              </span>
              <h2 className="text-lg md:text-xl font-bold text-slate-100 line-clamp-2 mb-1">
                {episode.title}
              </h2>
              <p className="text-sm text-slate-400 mb-4">{episode.channel}</p>

              <div className="flex items-center justify-center md:justify-start gap-1 h-8">
                {[40, 75, 55, 90, 65, 30, 85, 95, 50, 70, 45, 80, 60, 90, 35, 75].map(
                  (heightPercent, idx) => (
                    <div
                      key={idx}
                      className="w-1.5 bg-amber-500/80 rounded-full transition-all duration-300"
                      style={{
                        height: isPlaying ? `${Math.max(15, (heightPercent + (idx % 3) * 10) % 100)}%` : '20%',
                        opacity: isPlaying ? 0.9 : 0.4,
                      }}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Player Controls Bar */}
      <div className="p-4 md:px-6 md:py-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-3">
        {/* Progress Bar Slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono tabular-nums text-slate-400 w-12 text-right">
            {formatSeconds(currentTime)}
          </span>

          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={handleSliderSeek}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:h-2 transition-all"
            />
          </div>

          <span className="text-xs font-mono tabular-nums text-slate-400 w-12">
            {formatSeconds(duration)}
          </span>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left Controls: Bookmark Note & Sleep Timer */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddNoteAtCurrentTime(Math.floor(currentTime))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700/60"
              title="Lưu ghi chú tại thời điểm này"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>Ghi chú [{formatSeconds(currentTime)}]</span>
            </button>

            {/* Sleep Timer */}
            <div className="relative">
              <button
                onClick={() => setShowSleepMenu(!showSleepMenu)}
                className={`p-2 rounded-lg text-xs flex items-center gap-1 border transition-colors ${
                  sleepTimerRemaining !== null
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border-slate-700/60'
                }`}
                title="Hẹn giờ tắt tự động"
              >
                <Moon className="w-3.5 h-3.5" />
                {sleepTimerRemaining !== null && (
                  <span className="font-mono text-[11px] tabular-nums">
                    {Math.ceil(sleepTimerRemaining / 60)}m
                  </span>
                )}
              </button>

              {showSleepMenu && (
                <div className="absolute bottom-full mb-2 left-0 w-36 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-30">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-800">
                    Hẹn giờ tắt
                  </div>
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setSleepMinutes(mins)}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      {mins} phút
                    </button>
                  ))}
                  {sleepTimerRemaining !== null && (
                    <button
                      onClick={() => setSleepMinutes(null)}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-slate-800 border-t border-slate-800 transition-colors"
                    >
                      Hủy hẹn giờ
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center Controls: Skip Prev, Skip 15s back, Play/Pause, Skip 15s forward, Skip Next */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onPrevEpisode && (
              <button
                onClick={onPrevEpisode}
                disabled={!hasPrevEpisode}
                className="p-2 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 hover:bg-slate-800 rounded-full transition-colors"
                title="Tập trước đó"
              >
                <SkipBack className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => seekRelative(-15)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
              title="Lùi lại 15 giây"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlayPause}
              className="p-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-full shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
              title={isPlaying ? 'Tạm dừng' : 'Phát tiếp'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => seekRelative(15)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
              title="Tới 15 giây"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {onNextEpisode && (
              <button
                onClick={onNextEpisode}
                disabled={!hasNextEpisode}
                className="p-2 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 hover:bg-slate-800 rounded-full transition-colors"
                title="Tập kế tiếp trong danh sách"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right Controls: CC (Hide/Show Captions), Speed, Volume */}
          <div className="flex items-center gap-2.5">
            {/* NÚT ẨN / BẬT PHỤ ĐỀ CC */}
            <button
              onClick={toggleCC}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                isCcActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-700/60'
              }`}
              title={isCcActive ? 'Đang bật phụ đề CC (Nhấp để ẩn)' : 'Đang ẩn phụ đề CC (Nhấp để bật)'}
            >
              <Subtitles className="w-3.5 h-3.5" />
              <span>CC</span>
              <span className="text-[10px] font-normal opacity-80">
                {isCcActive ? 'Bật' : 'Ẩn'}
              </span>
            </button>

            {/* Playback speed selector */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              {[1, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleRateChange(rate)}
                  className={`px-2 py-1 text-[11px] font-mono tabular-nums rounded transition-colors ${
                    playbackRate === rate
                      ? 'bg-slate-800 text-amber-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Volume control */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
