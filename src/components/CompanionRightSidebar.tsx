import React, { useState } from 'react';
import {
  ListMusic,
  Sparkles,
  Bookmark,
  Tv,
  Film,
  X,
  Play,
  RotateCcw,
  Star,
  ChevronRight,
  ExternalLink,
  Heart,
  Share2,
  Check,
  Radio,
  Clock,
  Layers,
} from 'lucide-react';
import { PodcastEpisode, PodcastNote, PodcastPlaylist, PodcastSeries } from '../types/podcast';
import { MovieDetail, EpisodeData, EpisodeServer, MovieItem } from '../types/movie';
import { CurrentlyPlayingSidebar } from './CurrentlyPlayingSidebar';
import { AIPodcastCompanion } from './AIPodcastCompanion';
import { TimecodedNotesPanel } from './TimecodedNotesPanel';

export interface ActiveMovieState {
  movie: MovieDetail;
  activeEpisode: EpisodeData;
  activeServerIndex: number;
  episodes: EpisodeServer[];
}

interface CompanionRightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  // YouTube State
  currentEpisode: PodcastEpisode | null;
  activeQueue: PodcastEpisode[];
  activePlaylistTitle: string;
  currentIndex: number;
  isAutoplayNext: boolean;
  onToggleAutoplay: () => void;
  onPlayEpisode: (episode: PodcastEpisode) => void;
  onPrevEpisode: () => void;
  onNextEpisode: () => void;
  hasNextEpisode: boolean;
  hasPrevEpisode: boolean;
  channelVideosCount: number;
  podcastSeries: PodcastSeries[];
  channelPlaylists: PodcastPlaylist[];
  onSelectQueueSource: (type: 'videos' | 'series' | 'playlist', idOrTitle?: string) => void;
  onSeekToTime: (seconds: number) => void;
  // Notes
  notes: PodcastNote[];
  currentTimeSeconds?: number;
  onAddNote?: (timestamp: number, text: string) => void;
  onDeleteNote: (id: string) => void;
  // Movie State (if playing movie)
  activeMovie: ActiveMovieState | null;
  onSelectMovieEpisode?: (ep: EpisodeData) => void;
  onSelectMovieServer?: (index: number) => void;
  onCloseMoviePlayer?: () => void;
  onOpenMovieDetail?: (slug: string) => void;
}

export const CompanionRightSidebar: React.FC<CompanionRightSidebarProps> = ({
  isOpen,
  onClose,
  currentEpisode,
  activeQueue,
  activePlaylistTitle,
  currentIndex,
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
  onSeekToTime,
  notes,
  currentTimeSeconds = 0,
  onAddNote,
  onDeleteNote,
  activeMovie,
  onSelectMovieEpisode,
  onSelectMovieServer,
  onCloseMoviePlayer,
  onOpenMovieDetail,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'ai' | 'notes'>('queue');

  if (!isOpen) return null;

  const isPlayingMovie = !!activeMovie;

  // Virtual podcast episode object if movie is playing so AIPodcastCompanion can generate movie analysis
  const movieAsEpisode: PodcastEpisode | null = activeMovie
    ? {
        id: `movie-${activeMovie.movie.slug}`,
        youtubeId: activeMovie.movie.slug,
        title: `[Phim] ${activeMovie.movie.name} (${activeMovie.activeEpisode.name})`,
        channel: activeMovie.movie.director?.join(', ') || 'Rạp Chiếu Phim',
        duration: activeMovie.movie.time || '120 phút',
        durationSeconds: 7200,
        thumbnail: activeMovie.movie.poster_url || activeMovie.movie.thumb_url || '',
        description: activeMovie.movie.content || '',
        category: 'nghe-thuat-sang-tao',
      }
    : null;

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 lg:static lg:w-96 lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16 bg-slate-950/98 lg:bg-slate-950/95 border-l border-slate-800/80 flex flex-col shadow-2xl shrink-0 animate-in slide-in-from-right duration-200">
      {/* Top Header Card */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isPlayingMovie ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            {isPlayingMovie ? <Film className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 truncate">
              {isPlayingMovie ? 'Đang Chiếu Phim' : 'Đang Phát Video / Podcast'}
            </p>
            <h3 className="text-xs font-bold text-white truncate">
              {isPlayingMovie
                ? activeMovie.movie.name
                : currentEpisode?.title || 'Chưa chọn nội dung'}
            </h3>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          title="Thu gọn bảng điều khiển bên phải"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs Selector */}
      <div className="p-2 border-b border-slate-800 bg-slate-950 flex items-center gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'queue'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          {isPlayingMovie ? <Tv className="w-3.5 h-3.5 text-rose-400" /> : <ListMusic className="w-3.5 h-3.5 text-amber-400" />}
          <span>{isPlayingMovie ? 'Tập Phim' : 'Danh Sách'}</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'ai'
              ? 'bg-slate-800 text-amber-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Trợ Lý AI</span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'notes'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 text-sky-400" />
          <span>Ghi Chú</span>
          {notes.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300 font-mono">
              {notes.length}
            </span>
          )}
        </button>
      </div>

      {/* Content Area according to active tab */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
        {activeTab === 'queue' && (
          <>
            {isPlayingMovie && activeMovie ? (
              /* Movie Episodes & Servers list */
              <div className="space-y-4">
                {/* Active Movie Summary Card */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex gap-3">
                  <div className="w-16 h-24 rounded-xl overflow-hidden shrink-0 border border-slate-700 bg-slate-950">
                    <img
                      src={activeMovie.movie.poster_url || activeMovie.movie.thumb_url || ''}
                      alt={activeMovie.movie.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                      {activeMovie.activeEpisode.name}
                    </span>
                    <h4 className="text-xs font-bold text-white line-clamp-2">
                      {activeMovie.movie.name}
                    </h4>
                    {activeMovie.movie.origin_name && (
                      <p className="text-[11px] text-slate-400 truncate">
                        {activeMovie.movie.origin_name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
                      <span>{activeMovie.movie.year || '2024'}</span>
                      <span>·</span>
                      <span className="text-emerald-400">{activeMovie.movie.quality || 'FHD'}</span>
                      <span>·</span>
                      <span className="text-amber-400">{activeMovie.movie.lang || 'Vietsub'}</span>
                    </div>
                  </div>
                </div>

                {/* Server Switcher */}
                {activeMovie.episodes.length > 1 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Chọn Nguồn Phát
                    </p>
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                      {activeMovie.episodes.map((server, idx) => (
                        <button
                          key={idx}
                          onClick={() => onSelectMovieServer && onSelectMovieServer(idx)}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                            activeMovie.activeServerIndex === idx
                              ? 'bg-rose-600 text-white font-bold'
                              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {server.server_name || `Nguồn #${idx + 1}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Episode Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                    <span>Danh Sách Tập ({activeMovie.episodes[activeMovie.activeServerIndex]?.server_data?.length || 0} tập)</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 max-h-72 overflow-y-auto pr-1">
                    {activeMovie.episodes[activeMovie.activeServerIndex]?.server_data?.map((ep) => {
                      const isActive = activeMovie.activeEpisode.slug === ep.slug;
                      return (
                        <button
                          key={ep.slug}
                          onClick={() => onSelectMovieEpisode && onSelectMovieEpisode(ep)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all truncate text-center ${
                            isActive
                              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {ep.name.startsWith('Tập') ? ep.name : `Tập ${ep.name}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : currentEpisode ? (
              /* YouTube Queue */
              <CurrentlyPlayingSidebar
                currentEpisode={currentEpisode}
                activeQueue={activeQueue}
                activePlaylistTitle={activePlaylistTitle}
                currentIndex={currentIndex}
                isAutoplayNext={isAutoplayNext}
                onToggleAutoplay={onToggleAutoplay}
                onPlayEpisode={onPlayEpisode}
                onPrevEpisode={onPrevEpisode}
                onNextEpisode={onNextEpisode}
                hasNextEpisode={hasNextEpisode}
                hasPrevEpisode={hasPrevEpisode}
                channelVideosCount={channelVideosCount}
                podcastSeries={podcastSeries}
                channelPlaylists={channelPlaylists}
                onSelectQueueSource={onSelectQueueSource}
              />
            ) : (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <ListMusic className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs">Chưa có nội dung nào đang phát.</p>
                <p className="text-[11px] text-slate-500">Hãy chọn một video hoặc bộ phim từ danh mục để bắt đầu.</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'ai' && (
          <>
            {isPlayingMovie && movieAsEpisode ? (
              <AIPodcastCompanion episode={movieAsEpisode} onSeekToTime={onSeekToTime} />
            ) : currentEpisode ? (
              <AIPodcastCompanion episode={currentEpisode} onSeekToTime={onSeekToTime} />
            ) : (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Sparkles className="w-8 h-8 mx-auto text-amber-500/60" />
                <p className="text-xs">Hãy chọn một video hoặc phim để kích hoạt Trợ Lý AI.</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'notes' && (currentEpisode || movieAsEpisode) && (
          <TimecodedNotesPanel
            episode={currentEpisode || movieAsEpisode!}
            notes={notes}
            currentTimeSeconds={currentTimeSeconds}
            onAddNote={onAddNote || ((_t, _txt) => {})}
            onSeekToTime={onSeekToTime}
            onDeleteNote={onDeleteNote}
          />
        )}
      </div>
    </aside>
  );
};
