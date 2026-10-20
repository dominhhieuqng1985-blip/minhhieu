import React from 'react';
import { Play, Pause, Trash2, Heart, ExternalLink, ListMusic, CheckCircle2, Clock } from 'lucide-react';
import { PodcastEpisode } from '../types/podcast';

interface FullPlaylistQueueProps {
  episodes: PodcastEpisode[];
  currentEpisodeId: string;
  isPlaying?: boolean;
  favorites: string[];
  onPlayEpisode: (episode: PodcastEpisode) => void;
  onRemoveEpisode: (episodeId: string) => void;
  onToggleFavorite: (episodeId: string) => void;
  onClearAll?: () => void;
  videoFilter?: 'all' | 'long' | 'shorts';
  onFilterChange?: (filter: 'all' | 'long' | 'shorts') => void;
  filterCounts?: { all: number; long: number; shorts: number };
}

export const FullPlaylistQueue: React.FC<FullPlaylistQueueProps> = ({
  episodes,
  currentEpisodeId,
  isPlaying = false,
  favorites,
  onPlayEpisode,
  onRemoveEpisode,
  onToggleFavorite,
  onClearAll,
  videoFilter,
  onFilterChange,
  filterCounts,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      {/* Playlist Header */}
      <div className="p-4 sm:px-6 sm:py-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ListMusic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Toàn bộ danh sách ({episodes.length} video)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Đầy đủ toàn bộ các video có trong kênh của bạn theo thứ tự chuẩn
            </p>
          </div>
        </div>

        {/* Filter sub-buttons if enabled */}
        {onFilterChange && filterCounts && (
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
            <button
              onClick={() => onFilterChange('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                videoFilter === 'all'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tất cả ({filterCounts.all})
            </button>
            <button
              onClick={() => onFilterChange('long')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                videoFilter === 'long'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Video dài ({filterCounts.long})
            </button>
            <button
              onClick={() => onFilterChange('shorts')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                videoFilter === 'shorts'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Shorts ({filterCounts.shorts})
            </button>
          </div>
        )}

        {episodes.length > 0 && onClearAll && (
          <button
            onClick={onClearAll}
            className="text-xs text-slate-400 hover:text-red-400 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800 transition-colors"
            title="Xóa toàn bộ danh sách để nhập mới"
          >
            Xóa danh sách
          </button>
        )}
      </div>

      {/* Playlist Items List */}
      <div className="divide-y divide-slate-800/60 max-h-[560px] overflow-y-auto">
        {episodes.map((ep, idx) => {
          const isActive = currentEpisodeId === ep.id;
          const isFav = favorites.includes(ep.id);

          return (
            <div
              key={`${ep.id}-${idx}`}
              className={`group p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 transition-all ${
                isActive
                  ? 'bg-amber-500/10 border-l-4 border-amber-500'
                  : 'hover:bg-slate-800/40 bg-transparent'
              }`}
            >
              {/* Left: Index + Full Cover Thumbnail */}
              <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                {/* Index number */}
                <span
                  className={`text-xs font-mono font-bold w-7 text-center tabular-nums shrink-0 ${
                    isActive ? 'text-amber-400' : 'text-slate-500'
                  }`}
                >
                  #{idx + 1}
                </span>

                {/* Video Cover Thumbnail */}
                <div
                  className="relative w-24 sm:w-32 aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 cursor-pointer shadow-sm group-hover:border-slate-700"
                  onClick={() => onPlayEpisode(ep)}
                >
                  <img
                    src={ep.thumbnail}
                    alt={ep.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Play overlay */}
                  <div
                    className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                      isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <div className="p-2 bg-amber-500 text-slate-950 rounded-full shadow-md">
                      {isActive && isPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </div>
                  </div>

                  {/* Duration or Shorts Badge */}
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-[10px] font-mono tabular-nums text-slate-200">
                    {ep.isShort ? 'Shorts ⚡' : ep.duration}
                  </div>
                </div>

                {/* Video Information: Full Title & Channel */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {ep.isShort && (
                      <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30 shrink-0">
                        Shorts
                      </span>
                    )}
                    <h4
                      onClick={() => onPlayEpisode(ep)}
                      className={`text-xs sm:text-sm font-semibold transition-colors cursor-pointer leading-snug line-clamp-2 ${
                        isActive ? 'text-amber-300 font-bold' : 'text-slate-200 hover:text-amber-300'
                      }`}
                      title={ep.title}
                    >
                      {ep.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                    <span className="text-amber-400/90 font-medium truncate max-w-[140px] sm:max-w-xs">
                      {ep.channel}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="font-mono tabular-nums text-slate-400">
                      {ep.isShort ? 'Video ngắn' : ep.duration}
                    </span>
                    {isActive && (
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Đang phát
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onToggleFavorite(ep.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isFav
                      ? 'text-red-400 bg-red-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title={isFav ? 'Bỏ lưu' : 'Lưu yêu thích'}
                >
                  <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                </button>

                <a
                  href={`https://www.youtube.com/watch?v=${ep.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors hidden sm:inline"
                  title="Xem trên YouTube"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  onClick={() => onPlayEpisode(ep)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">{isActive ? 'Đang phát' : 'Phát'}</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Bạn có chắc muốn xóa vĩnh viễn video "${ep.title}" khỏi danh sách? Video này sẽ không bao giờ tự động nạp lại.`)) {
                      onRemoveEpisode(ep.id);
                    }
                  }}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-70 sm:opacity-0 group-hover:opacity-100"
                  title="Xóa vĩnh viễn video này khỏi danh sách (đã xóa trên YouTube)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
