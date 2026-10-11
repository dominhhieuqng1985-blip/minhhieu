import React, { useEffect, useRef, useState } from 'react';
import {
  ListMusic,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Repeat,
  Shuffle,
  Sparkles,
  ChevronDown,
  Check,
  Radio,
  Clock,
  Film,
  Flame,
} from 'lucide-react';
import { PodcastEpisode, PodcastPlaylist, PodcastSeries } from '../types/podcast';

interface CurrentlyPlayingSidebarProps {
  currentEpisode: PodcastEpisode;
  activeQueue: PodcastEpisode[];
  activePlaylistTitle: string;
  currentIndex: number;
  isPlaying?: boolean;
  isAutoplayNext: boolean;
  onToggleAutoplay: () => void;
  onPlayEpisode: (episode: PodcastEpisode) => void;
  onPrevEpisode: () => void;
  onNextEpisode: () => void;
  hasNextEpisode: boolean;
  hasPrevEpisode: boolean;
  // Available playlists and series to switch directly
  channelVideosCount: number;
  podcastSeries: PodcastSeries[];
  channelPlaylists: PodcastPlaylist[];
  onSelectQueueSource: (type: 'videos' | 'series' | 'playlist', idOrTitle?: string) => void;
}

export const CurrentlyPlayingSidebar: React.FC<CurrentlyPlayingSidebarProps> = ({
  currentEpisode,
  activeQueue,
  activePlaylistTitle,
  currentIndex,
  isPlaying = true,
  isAutoplayNext,
  onToggleAutoplay,
  onPlayEpisode,
  onPrevEpisode,
  onNextEpisode,
  hasNextEpisode,
  hasPrevEpisode,
  channelVideosCount,
  podcastSeries,
  channelPlaylists,
  onSelectQueueSource,
}) => {
  const activeItemRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  // Auto-scroll to currently playing episode when currentIndex changes
  useEffect(() => {
    if (activeItemRef.current && listContainerRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentIndex, currentEpisode?.youtubeId]);

  const nextEpisode = hasNextEpisode ? activeQueue[currentIndex + 1] : isLooping ? activeQueue[0] : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[520px] overflow-hidden shadow-xl">
      {/* Top Header: Playlist Info & Source Switcher */}
      <div className="p-3.5 bg-slate-950/70 border-b border-slate-800 shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <ListMusic className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-100 truncate flex items-center gap-1.5">
                <span className="truncate">{activePlaylistTitle || 'Danh sách phát'}</span>
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Tập <span className="text-amber-400 font-mono font-bold">#{currentIndex + 1}</span> / {activeQueue.length}
                {currentEpisode?.seriesTitle && (
                  <span className="ml-1.5 text-amber-300/80">· {currentEpisode.seriesTitle}</span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Playlist Switcher Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg border border-slate-700 flex items-center gap-1 transition-colors"
              title="Đổi danh sách phát hoặc podcast series"
            >
              <span>Đổi danh sách</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-30 text-xs space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    Chọn danh sách phát
                  </div>

                  {/* All Videos */}
                  <button
                    onClick={() => {
                      onSelectQueueSource('videos');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                      activePlaylistTitle === 'Tất cả Video'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">🎬 Tất cả Video kênh</span>
                    <span className="text-[10px] opacity-75">{channelVideosCount}</span>
                  </button>

                  {/* Podcast Series */}
                  {podcastSeries.map((s) => (
                    <button
                      key={s.playlistId}
                      onClick={() => {
                        onSelectQueueSource('series', s.title);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                        activePlaylistTitle === s.title
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">🌸 {s.title}</span>
                      <span className="text-[10px] opacity-75">
                        {s.episodeCount ? `${s.episodeCount} tập` : 'Series'}
                      </span>
                    </button>
                  ))}

                  {/* Other Playlists */}
                  {channelPlaylists
                    .filter((p) => !podcastSeries.some((s) => s.playlistId === p.playlistId))
                    .map((pl) => (
                      <button
                        key={pl.playlistId}
                        onClick={() => {
                          onSelectQueueSource('playlist', pl.playlistId);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                          activePlaylistTitle === pl.title
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">📋 {pl.title}</span>
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Playlist Quick Controls: Autoplay, Loop, Prev/Next */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleAutoplay}
              className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors ${
                isAutoplayNext
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
              title="Tự động phát video tiếp theo khi video hiện tại kết thúc"
            >
              <Check className={`w-3 h-3 ${isAutoplayNext ? 'text-amber-400' : 'opacity-40'}`} />
              <span>Tự động phát</span>
            </button>

            <button
              onClick={() => setIsLooping((prev) => !prev)}
              className={`p-1 rounded-md transition-colors ${
                isLooping ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              title={isLooping ? 'Đang bật lặp lại danh sách' : 'Lặp lại danh sách'}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onPrevEpisode}
              disabled={!hasPrevEpisode}
              className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Tập trước đó"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onNextEpisode}
              disabled={!hasNextEpisode && !isLooping}
              className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Tập kế tiếp"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Center: Scrollable Episode List */}
      <div
        ref={listContainerRef}
        className="flex-1 overflow-y-auto divide-y divide-slate-800/40 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
      >
        {activeQueue.map((episode, idx) => {
          const isActive = episode.youtubeId === currentEpisode?.youtubeId;

          return (
            <div
              key={episode.id || `${idx}-${episode.youtubeId}`}
              ref={isActive ? activeItemRef : undefined}
              onClick={() => onPlayEpisode(episode)}
              className={`p-2.5 flex items-center gap-3 cursor-pointer transition-all ${
                isActive
                  ? 'bg-amber-500/15 border-l-4 border-amber-500 text-slate-100 shadow-inner'
                  : 'hover:bg-slate-800/50 text-slate-300'
              }`}
            >
              {/* Index Number or Playing Equalizer Animation */}
              <div className="w-6 shrink-0 flex items-center justify-center text-center">
                {isActive ? (
                  <div className="flex items-end justify-center gap-0.5 h-3.5 w-3.5">
                    <span className="w-1 bg-amber-400 rounded-full animate-bounce [animation-delay:0ms] h-full" />
                    <span className="w-1 bg-amber-400 rounded-full animate-bounce [animation-delay:150ms] h-3/4" />
                    <span className="w-1 bg-amber-400 rounded-full animate-bounce [animation-delay:300ms] h-1/2" />
                  </div>
                ) : (
                  <span className="text-xs font-mono text-slate-500 font-semibold">{idx + 1}</span>
                )}
              </div>

              {/* Video Thumbnail with duration badge */}
              <div className="relative w-16 h-10 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                <img
                  src={episode.thumbnail || `https://i.ytimg.com/vi/${episode.youtubeId}/hqdefault.jpg`}
                  alt={episode.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/85 text-[9px] font-mono text-slate-200">
                  {episode.duration}
                </div>
                {episode.isShort && (
                  <div className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-red-600/90 text-[8px] font-bold text-white uppercase tracking-tighter">
                    Shorts
                  </div>
                )}
              </div>

              {/* Title and metadata */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4
                    className={`text-xs font-semibold leading-snug line-clamp-2 ${
                      isActive ? 'text-amber-300 font-bold' : 'text-slate-200'
                    }`}
                  >
                    {episode.title}
                  </h4>
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                  {isActive ? (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <span>▶ Đang phát</span>
                    </span>
                  ) : (
                    <span>{episode.channel}</span>
                  )}
                  {episode.seriesTitle && (
                    <>
                      <span>·</span>
                      <span className="text-slate-400 truncate max-w-[120px]">{episode.seriesTitle}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Footer: Next Up Preview */}
      {nextEpisode && (
        <div
          onClick={() => onPlayEpisode(nextEpisode)}
          className="p-2.5 bg-slate-950/80 border-t border-slate-800 shrink-0 flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-slate-950 transition-colors group"
        >
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Tập kế tiếp (#{currentIndex + 2}):
            </span>
            <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-amber-300 transition-colors">
              {nextEpisode.title}
            </p>
          </div>
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
};
