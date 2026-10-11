import React from 'react';
import { Play, Heart, ChevronRight, Check, Bell, ExternalLink, Sparkles } from 'lucide-react';
import { PodcastEpisode, PodcastChannel } from '../types/podcast';

interface PodcastShelfProps {
  channel: PodcastChannel;
  episodes: PodcastEpisode[];
  currentEpisodeId: string;
  isSubscribed: boolean;
  favorites: string[];
  onPlayEpisode: (episode: PodcastEpisode) => void;
  onPlayAll: (episodes: PodcastEpisode[]) => void;
  onToggleFavorite: (episodeId: string) => void;
  onToggleSubscribe: (channelName: string) => void;
  onAnalyzeAI: (episode: PodcastEpisode) => void;
}

export const PodcastShelf: React.FC<PodcastShelfProps> = ({
  channel,
  episodes,
  currentEpisodeId,
  isSubscribed,
  favorites,
  onPlayEpisode,
  onPlayAll,
  onToggleFavorite,
  onToggleSubscribe,
  onAnalyzeAI,
}) => {
  if (episodes.length === 0) return null;

  return (
    <div className="space-y-3.5">
      {/* Channel Shelf Header like YouTube Podcasts */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <img
            src={channel.avatar}
            alt={channel.name}
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full object-cover border border-slate-700 shadow-sm shrink-0"
          />

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100 hover:text-amber-400 transition-colors">
                {channel.name}
              </h3>
              <span className="text-xs text-slate-400 hidden sm:inline">
                {channel.handle}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-amber-400 font-medium">{channel.subscribers} người đăng ký</span>
              <span>·</span>
              <span>{episodes.length} tập podcast</span>
            </div>
          </div>

          {/* YouTube Official-Style Subscribe Button */}
          <button
            onClick={() => onToggleSubscribe(channel.name)}
            className={`ml-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 active:scale-95 ${
              isSubscribed
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                : 'bg-white hover:bg-slate-200 text-slate-950'
            }`}
            title={isSubscribed ? 'Đã đăng ký kênh' : 'Đăng ký kênh trên YouTube'}
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
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPlayAll(episodes)}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Phát danh sách</span>
          </button>

          <a
            href={channel.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Xem trang YouTube chính thức"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Horizontal Visual Cover Art Carousel / Shelf (as on YouTube Podcasts tab) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {episodes.map((ep, idx) => {
          const isActive = currentEpisodeId === ep.id;
          const isFav = favorites.includes(ep.id);

          return (
            <div
              key={ep.id}
              className={`group relative bg-slate-900 rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col ${
                isActive
                  ? 'border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                  : 'border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              {/* Cover Art Image with YouTube aspect ratio */}
              <div className="relative aspect-video w-full bg-slate-950 overflow-hidden cursor-pointer" onClick={() => onPlayEpisode(ep)}>
                <img
                  src={ep.thumbnail}
                  alt={ep.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Cover Overlay on Hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="p-3 bg-amber-500 text-slate-950 rounded-full shadow-xl transform scale-90 group-hover:scale-100 transition-all">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[11px] font-mono tabular-nums text-slate-200">
                  {ep.duration}
                </div>

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[10px] tracking-wide uppercase shadow-md">
                    Đang phát
                  </div>
                )}
              </div>

              {/* Cover Info */}
              <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-amber-400/90">Tập #{idx + 1}</span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">{ep.duration}</span>
                    {ep.views && (
                      <>
                        <span>·</span>
                        <span className="tabular-nums">{ep.views} lượt xem</span>
                      </>
                    )}
                  </div>

                  <h4
                    onClick={() => onPlayEpisode(ep)}
                    className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors line-clamp-2 cursor-pointer leading-snug"
                    title={ep.title}
                  >
                    {ep.title}
                  </h4>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggleFavorite(ep.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isFav
                          ? 'text-red-400 bg-red-500/10'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title={isFav ? 'Bỏ lưu' : 'Lưu tập'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      onClick={() => onAnalyzeAI(ep)}
                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Phân tích AI"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>

                  <button
                    onClick={() => onPlayEpisode(ep)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors ${
                      isActive
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isActive ? 'Đang phát' : 'Nghe'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
