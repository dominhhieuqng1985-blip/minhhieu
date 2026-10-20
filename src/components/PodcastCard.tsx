import React from 'react';
import { Play, Heart, Sparkles, Clock, Youtube, Trash2 } from 'lucide-react';
import { PodcastEpisode } from '../types/podcast';

interface PodcastCardProps {
  episode: PodcastEpisode;
  isActive: boolean;
  isFavorite: boolean;
  onPlay: (episode: PodcastEpisode) => void;
  onToggleFavorite: (episodeId: string) => void;
  onAnalyzeAI: (episode: PodcastEpisode) => void;
  onDeleteEpisode?: (episodeId: string, youtubeId: string) => void;
}

export const PodcastCard: React.FC<PodcastCardProps> = ({
  episode,
  isActive,
  isFavorite,
  onPlay,
  onToggleFavorite,
  onAnalyzeAI,
  onDeleteEpisode,
}) => {
  return (
    <div
      className={`group relative bg-slate-900/90 rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col ${
        isActive
          ? 'border-amber-500/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900'
      }`}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
        <img
          src={episode.thumbnail}
          alt={episode.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Hover play button overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={() => onPlay(episode)}
            className="p-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-full shadow-xl transform scale-90 hover:scale-100 transition-all"
            title="Nghe tập này"
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </button>
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[11px] font-mono tabular-nums text-slate-200">
          {episode.duration}
        </div>

        {/* Active listening indicator */}
        {isActive && (
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow-md">
            <span>Đang phát</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Metadata - Unboxed typography (zero-pill discipline) */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5 flex-wrap">
            <span className="text-amber-400/90 font-medium">{episode.channel}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-mono tabular-nums">{episode.duration}</span>
            {episode.views && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="tabular-nums">{episode.views} lượt xem</span>
              </>
            )}
          </div>

          {/* Episode Title */}
          <h4
            onClick={() => onPlay(episode)}
            className="text-sm font-semibold text-slate-100 group-hover:text-amber-300 transition-colors line-clamp-2 cursor-pointer leading-snug"
            title={episode.title}
          >
            {episode.title}
          </h4>

          {/* Short description */}
          <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
            {episode.description}
          </p>
        </div>

        {/* Actions row */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleFavorite(episode.id)}
              className={`p-2 rounded-lg transition-colors ${
                isFavorite
                  ? 'text-red-400 bg-red-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={isFavorite ? 'Bỏ lưu' : 'Lưu vào danh sách yêu thích'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={() => onAnalyzeAI(episode)}
              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1"
              title="Phân tích AI"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
            </button>

            <a
              href={`https://www.youtube.com/watch?v=${episode.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Xem trên YouTube"
            >
              <Youtube className="w-4 h-4" />
            </a>

            {onDeleteEpisode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Bạn có chắc muốn loại bỏ vĩnh viễn video "${episode.title}"? Video này sẽ không bao giờ tự động nạp lại.`)) {
                    onDeleteEpisode(episode.id, episode.youtubeId);
                  }
                }}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Xóa vĩnh viễn video khỏi danh sách (nếu đã xóa trên YouTube)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => onPlay(episode)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
              isActive
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isActive ? 'Đang phát' : 'Nghe ngay'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
