import React from 'react';
import {
  Radio,
  Plus,
  FileText,
  Mic,
  Video,
  Music,
  Download,
  Sparkles,
  Film,
} from 'lucide-react';

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
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Logo */}
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

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-3 text-xs font-medium text-slate-400 overflow-x-auto py-1 scrollbar-none">
          <button
            onClick={() => onNavigate('catalog')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1.5 px-2.5 rounded-lg ${
              activeSection === 'catalog' ? 'text-amber-400 font-bold bg-amber-500/10' : ''
            }`}
          >
            Video &amp; Podcast
          </button>

          {/* Prominent Movie Tab right next to Podcast */}
          <button
            onClick={() => onNavigate('movies')}
            className={`hover:text-white transition-all whitespace-nowrap shrink-0 py-1.5 px-3 rounded-lg flex items-center gap-1.5 border shadow-sm ${
              activeSection === 'movies'
                ? 'text-rose-300 font-bold bg-rose-600/25 border-rose-500 ring-1 ring-rose-500/40'
                : 'text-rose-300 font-semibold bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/60'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-rose-400" />
            <span>Xem Phim (Rạp Chiếu)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-extrabold uppercase animate-pulse">
              Mới
            </span>
          </button>

          <button
            onClick={() => onNavigate('downloader')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1.5 px-2.5 rounded-lg flex items-center gap-1.5 ${
              activeSection === 'downloader' ? 'text-amber-400 font-bold bg-amber-500/10' : ''
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải Media (VidKraken)</span>
          </button>

          <button
            onClick={() => onNavigate('converter')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1.5 px-2.5 rounded-lg flex items-center gap-1.5 ${
              activeSection === 'converter' ? 'text-amber-400 font-bold bg-amber-500/10' : ''
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Word ↔ PDF &amp; OCR</span>
          </button>

          <button
            onClick={() => onNavigate('tts')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1.5 px-2.5 rounded-lg flex items-center gap-1.5 ${
              activeSection === 'tts' ? 'text-amber-400 font-bold bg-amber-500/10' : ''
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Văn Bản → Giọng Nói</span>
          </button>

          <button
            onClick={() => onNavigate('video-ai')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1.5 px-2.5 rounded-lg flex items-center gap-1.5 ${
              activeSection === 'video-ai' ? 'text-amber-400 font-bold bg-amber-500/10' : ''
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Tạo Video AI (30s)</span>
          </button>

          <button
            onClick={() => onNavigate('song-ai')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1.5 px-2.5 rounded-lg flex items-center gap-1.5 ${
              activeSection === 'song-ai' ? 'text-amber-400 font-bold bg-amber-500/10' : ''
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Sáng Tác Dân Ca</span>
          </button>
        </nav>

        {/* Zone 3: Actions - Always visible on desktop, tablet, and mobile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Quick Access Xem Phim Button */}
          <button
            onClick={() => onNavigate('movies')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-md active:scale-95 border ${
              activeSection === 'movies'
                ? 'bg-rose-600 text-white border-rose-400 shadow-rose-600/30 ring-2 ring-rose-400/50'
                : 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white border-rose-400/40 shadow-rose-950/50'
            }`}
            title="Xem Phim Online (VSMov API) - Phim mới cập nhật, tìm kiếm, xem tập"
          >
            <Film className="w-3.5 h-3.5 fill-white/20" />
            <span>Xem Phim</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-yellow-400 text-slate-950 font-black tracking-wider uppercase animate-pulse">
              HOT
            </span>
          </button>

          <button
            onClick={onOpenConnectModal}
            className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Kết nối kênh</span>
          </button>
        </div>
      </div>

      {/* Subnav for Mobile & Tablet */}
      <div className="lg:hidden border-t border-slate-800/80 bg-slate-950/90 px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs text-slate-400">
        {/* Highlighted Mobile Xem Phim right upfront */}
        <button
          onClick={() => onNavigate('movies')}
          className={`whitespace-nowrap px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold border shrink-0 ${
            activeSection === 'movies'
              ? 'text-white bg-rose-600 border-rose-400 shadow-sm'
              : 'text-rose-300 bg-rose-950/60 border-rose-800/80 hover:bg-rose-900/50'
          }`}
        >
          <Film className="w-3.5 h-3.5 text-rose-400" />
          <span>Xem Phim (Rạp Chiếu)</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-extrabold uppercase">
            Mới
          </span>
        </button>

        <button
          onClick={() => onNavigate('catalog')}
          className={`whitespace-nowrap px-2.5 py-1.5 rounded-md shrink-0 ${
            activeSection === 'catalog' ? 'text-amber-400 font-bold bg-amber-500/10' : ''
          }`}
        >
          Kênh YouTube
        </button>
        <button
          onClick={() => onNavigate('downloader')}
          className={`whitespace-nowrap px-2.5 py-1.5 rounded-md shrink-0 ${
            activeSection === 'downloader' ? 'text-amber-400 font-bold bg-amber-500/10' : ''
          }`}
        >
          Tải VidKraken
        </button>
        <button
          onClick={() => onNavigate('converter')}
          className={`whitespace-nowrap px-2.5 py-1.5 rounded-md shrink-0 ${
            activeSection === 'converter' ? 'text-amber-400 font-bold bg-amber-500/10' : ''
          }`}
        >
          Word ↔ PDF &amp; OCR
        </button>
        <button
          onClick={() => onNavigate('tts')}
          className={`whitespace-nowrap px-2.5 py-1.5 rounded-md shrink-0 ${
            activeSection === 'tts' ? 'text-amber-400 font-bold bg-amber-500/10' : ''
          }`}
        >
          Giọng Nói (TTS)
        </button>
        <button
          onClick={() => onNavigate('video-ai')}
          className={`whitespace-nowrap px-2.5 py-1.5 rounded-md shrink-0 ${
            activeSection === 'video-ai' ? 'text-amber-400 font-bold bg-amber-500/10' : ''
          }`}
        >
          Video AI 30s
        </button>
        <button
          onClick={() => onNavigate('song-ai')}
          className={`whitespace-nowrap px-2.5 py-1.5 rounded-md shrink-0 ${
            activeSection === 'song-ai' ? 'text-amber-400 font-bold bg-amber-500/10' : ''
          }`}
        >
          Dân Ca Nam Bộ
        </button>
      </div>
    </header>
  );
};
