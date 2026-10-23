import React from 'react';
import {
  Menu,
  Plus,
  FileText,
  Mic,
  Download,
  Film,
  PanelRight,
  Radio,
  Play,
  Search,
} from 'lucide-react';

interface HeaderProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  onOpenConnectModal: () => void;
  onOpenGlobalSearch?: () => void;
  favoritesCount: number;
  onToggleLeftSidebar?: () => void;
  isLeftSidebarOpen?: boolean;
  onToggleRightSidebar?: () => void;
  isRightSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  onNavigate,
  onOpenConnectModal,
  onOpenGlobalSearch,
  favoritesCount,
  onToggleLeftSidebar,
  isLeftSidebarOpen,
  onToggleRightSidebar,
  isRightSidebarOpen,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
      <div className="w-full px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left Section: Menu Toggle + Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onToggleLeftSidebar && (
            <button
              onClick={onToggleLeftSidebar}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors"
              title="Đóng / mở danh mục bên trái"
              aria-label="Toggle Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Logo: Minh Hiếu TuBe */}
          <button
            onClick={() => onNavigate('catalog')}
            className="flex items-center gap-2 text-slate-100 hover:opacity-95 transition-all whitespace-nowrap shrink-0 group text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-red-600/30 group-hover:scale-105 transition-transform">
              <Play className="w-4 h-4 fill-white translate-x-0.5" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black tracking-tight text-white font-sans">
                Minh Hiếu
              </span>
              <span className="text-red-500 font-black px-1.5 py-0.2 rounded-md bg-red-500/15 border border-red-500/30 text-xs uppercase tracking-wider">
                TuBe
              </span>
            </div>
          </button>
        </div>

        {/* Center Section: Primary Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-400 overflow-x-auto py-1 scrollbar-none">
          <button
            onClick={() => onNavigate('catalog')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap py-1.5 px-3 rounded-lg flex items-center gap-1.5 ${
              activeSection === 'catalog' ? 'text-red-400 font-bold bg-red-500/10 border border-red-500/20' : ''
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Kênh YouTube &amp; Podcast</span>
          </button>

          <button
            onClick={() => onNavigate('movies')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap py-1.5 px-3 rounded-lg flex items-center gap-1.5 ${
              activeSection === 'movies'
                ? 'text-rose-400 font-bold bg-rose-500/15 border border-rose-500/30 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-rose-400" />
            <span>Rạp Phim Cinema</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black uppercase">
              Hot
            </span>
          </button>

          <button
            onClick={() => onNavigate('downloader')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap py-1.5 px-3 rounded-lg flex items-center gap-1.5 ${
              activeSection === 'downloader' ? 'text-amber-400 font-bold bg-amber-500/10' : ''
            }`}
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Tải VidKraken</span>
          </button>

          {onOpenGlobalSearch && (
            <button
              onClick={onOpenGlobalSearch}
              className="hover:text-slate-100 transition-colors whitespace-nowrap py-1.5 px-3 rounded-lg flex items-center gap-1.5 bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-300 shadow-sm"
              title="Tìm kiếm trên toàn bộ mạng YouTube"
            >
              <Search className="w-3.5 h-3.5 text-red-400" />
              <span>Tìm Toàn YouTube</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('tts')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap py-1.5 px-3 rounded-lg flex items-center gap-1.5 ${
              activeSection === 'tts' ? 'text-rose-400 font-bold bg-rose-500/10' : ''
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-rose-400" />
            <span>Studio Giọng Nói</span>
          </button>
        </nav>

        {/* Right Section: Actions & Companion Sidebar Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Connect Button */}
          <button
            onClick={onOpenConnectModal}
            className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95"
            title="Kết nối kênh YouTube tùy chỉnh"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Thêm kênh</span>
          </button>

          {/* Toggle Right Companion Sidebar */}
          {onToggleRightSidebar && (
            <button
              onClick={onToggleRightSidebar}
              className={`p-2 rounded-xl border transition-all ${
                isRightSidebarOpen
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Đóng / mở khung phát & trợ lý AI bên phải"
              aria-label="Toggle Companion Sidebar"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Subnav for Mobile */}
      <div className="md:hidden border-t border-slate-800/80 bg-slate-950/90 px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs text-slate-400">
        <button
          onClick={() => onNavigate('movies')}
          className={`whitespace-nowrap px-3 py-1 rounded-lg flex items-center gap-1.5 font-bold border shrink-0 ${
            activeSection === 'movies'
              ? 'text-white bg-rose-600 border-rose-400'
              : 'text-rose-300 bg-rose-950/60 border-rose-800/80'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Rạp Phim</span>
        </button>

        <button
          onClick={() => onNavigate('catalog')}
          className={`whitespace-nowrap px-2.5 py-1 rounded-md shrink-0 ${
            activeSection === 'catalog' ? 'text-red-400 font-bold bg-red-500/10' : ''
          }`}
        >
          YouTube &amp; Podcast
        </button>

        <button
          onClick={() => onNavigate('downloader')}
          className={`whitespace-nowrap px-2.5 py-1 rounded-md shrink-0 ${
            activeSection === 'downloader' ? 'text-amber-400 font-bold bg-amber-500/10' : ''
          }`}
        >
          Tải Media
        </button>

        {onOpenGlobalSearch && (
          <button
            onClick={onOpenGlobalSearch}
            className="whitespace-nowrap px-2.5 py-1 rounded-md shrink-0 text-red-400 font-bold bg-red-500/10 border border-red-500/20 flex items-center gap-1"
          >
            <Search className="w-3 h-3" />
            <span>Tìm YouTube</span>
          </button>
        )}

        <button
          onClick={() => onNavigate('tts')}
          className={`whitespace-nowrap px-2.5 py-1 rounded-md shrink-0 ${
            activeSection === 'tts' ? 'text-rose-400 font-bold bg-rose-500/10' : ''
          }`}
        >
          Giọng Nói
        </button>
      </div>
    </header>
  );
};
