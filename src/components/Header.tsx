import React from 'react';
import { Radio, Plus } from 'lucide-react';

interface HeaderProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  onOpenConnectModal: () => void;
  favoritesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  onNavigate,
  onOpenConnectModal,
  favoritesCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => onNavigate('catalog')}
          className="flex items-center gap-2.5 text-slate-100 hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 group"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Radio className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white font-sans">
            CastTube
          </span>
        </button>

        {/* Zone 2: 4-5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => onNavigate('catalog')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeSection === 'catalog' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            Khám phá
          </button>
          <button
            onClick={() => onNavigate('player')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeSection === 'player' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            Đang nghe
          </button>
          <button
            onClick={() => onNavigate('notes')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeSection === 'notes' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            Ghi chú
          </button>
          <button
            onClick={() => onNavigate('favorites')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 flex items-center gap-1.5 ${
              activeSection === 'favorites' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            <span>Yêu thích</span>
            {favoritesCount > 0 && (
              <span className="text-xs font-mono tabular-nums text-amber-400 font-bold">
                ({favoritesCount})
              </span>
            )}
          </button>
          <button
            onClick={() => onNavigate('downloader')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 flex items-center gap-1.5 ${
              activeSection === 'downloader' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            <span>Tải Video / MP3</span>
            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              VidKraken
            </span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenConnectModal}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Kết nối YouTube</span>
          </button>
        </div>
      </div>
    </header>
  );
};
