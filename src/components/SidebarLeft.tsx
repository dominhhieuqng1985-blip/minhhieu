import React, { useState } from 'react';
import {
  Radio,
  Film,
  Tv,
  Video,
  Sparkles,
  Download,
  FileText,
  Mic,
  Heart,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Search,
  ExternalLink,
  Flame,
  Clapperboard,
  Users,
  Compass,
  Bookmark,
  ChevronDown,
  X,
  Shield,
  ShieldCheck,
  Lock,
  LogOut,
  KeyRound,
  GraduationCap,
} from 'lucide-react';
import { FilterOption } from '../types/movie';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdcashBanner } from './AdcashBanner';

interface SidebarLeftProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeSection: string;
  onNavigate: (section: string) => void;
  onOpenGlobalSearch?: () => void;
  onSelectMovieCategory?: (categorySlug: string) => void;
  onSelectMovieGenre?: (genreSlug: string) => void;
  onSelectMovieTab?: (tab: string) => void;
  categories?: FilterOption[];
  selectedGenreSlug?: string;
  channelInfo?: {
    name: string;
    avatar: string;
    handle: string;
    subscribers: string;
    youtubeUrl: string;
  };
  videoCounts?: {
    all: number;
    long: number;
    shorts: number;
  };
  favoritesCount?: number;
  historyCount?: number;
}

const POPULAR_GENRES = [
  { name: 'Hành Động', slug: 'hanh-dong' },
  { name: 'Cổ Trang', slug: 'co-trang' },
  { name: 'Tình Cảm', slug: 'tinh-cam' },
  { name: 'Võ Thuật', slug: 'vo-thuat' },
  { name: 'Tâm Lý', slug: 'tam-ly' },
  { name: 'Hoạt Hình', slug: 'hoat-hinh' },
  { name: 'Viễn Tưởng', slug: 'vien-tuong' },
  { name: 'Kinh Dị', slug: 'kinh-di' },
  { name: 'Hài Hước', slug: 'hai-huoc' },
  { name: 'Phiêu Lưu', slug: 'phieu-luu' },
];

const POPULAR_ACTORS = [
  { name: 'Lee Min Ho', slug: 'lee-min-ho' },
  { name: 'Thành Long', slug: 'thanh-long' },
  { name: 'Cổ Thiên Lạc', slug: 'co-thien-lac' },
  { name: 'Dương Mịch', slug: 'duong-mich' },
  { name: 'Triệu Lệ Dĩnh', slug: 'trieu-le-dinh' },
  { name: 'Chân Tử Đan', slug: 'chan-tu-dan' },
];

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
  activeSection,
  onNavigate,
  onOpenGlobalSearch,
  onSelectMovieGenre,
  onSelectMovieTab,
  categories = [],
  selectedGenreSlug = '',
  channelInfo,
  videoCounts = { all: 0, long: 0, shorts: 0 },
  favoritesCount = 0,
  historyCount = 0,
}) => {
  const [isGenresOpen, setIsGenresOpen] = useState(true);
  const [isActorsOpen, setIsActorsOpen] = useState(true);
  const [isToolsOpen, setIsToolsOpen] = useState(true);
  const { isAdmin, adminUser, openAdminModal, logout } = useAdminAuth();

  const displayGenres = categories.length > 0 ? categories.slice(0, 12) : POPULAR_GENRES;

  const handleGenreClick = (slug: string) => {
    onNavigate('movies');
    if (onSelectMovieGenre) {
      onSelectMovieGenre(slug);
    }
  };

  const handleMovieTabClick = (tab: string) => {
    onNavigate('movies');
    if (onSelectMovieTab) {
      onSelectMovieTab(tab);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-16 z-50 lg:z-30 h-screen lg:h-[calc(100vh-4rem)] bg-slate-950 border-r border-slate-800/80 transition-all duration-300 flex flex-col shrink-0 ${
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-64'
        } ${isOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Mobile Header in Drawer */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-red-500/20">
              <Film className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5 font-black text-base tracking-tight text-white font-sans">
              <span>Minh Hiếu</span>
              <span className="text-red-500 font-extrabold px-1.5 py-0.5 rounded-md bg-red-500/10 border border-red-500/30 text-xs">
                TuBe
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {/* Section 1: Main Portals */}
          <div className="space-y-1">
            <button
              onClick={() => {
                onNavigate('catalog');
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeSection === 'catalog'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
              title="Kênh YouTube & Podcast Minh Hiếu"
            >
              <Radio className={`w-4 h-4 shrink-0 ${activeSection === 'catalog' ? 'text-white' : 'text-red-400'}`} />
              {!isCollapsed && (
                <div className="flex-1 text-left flex items-center justify-between">
                  <span>Kênh YouTube &amp; Podcast</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-300 font-mono">
                    {videoCounts.all}
                  </span>
                </div>
              )}
            </button>

            <button
              onClick={() => {
                onNavigate('movies');
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeSection === 'movies'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
              title="Rạp Phim Cinema Online"
            >
              <Film className={`w-4 h-4 shrink-0 ${activeSection === 'movies' ? 'text-white' : 'text-rose-400'}`} />
              {!isCollapsed && (
                <div className="flex-1 text-left flex items-center justify-between">
                  <span>Rạp Phim Cinema</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-yellow-400 text-slate-950 font-black tracking-wider uppercase">
                    HOT
                  </span>
                </div>
              )}
            </button>

            <button
              onClick={() => {
                onNavigate('kids-learning');
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeSection === 'kids-learning'
                  ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
              title="Bé Vui Học: Tiếng Việt, Tiếng Anh, Toán (Tiểu học đến Cấp 3)"
            >
              <GraduationCap
                className={`w-4 h-4 shrink-0 ${
                  activeSection === 'kids-learning' ? 'text-slate-950' : 'text-emerald-400'
                }`}
              />
              {!isCollapsed && (
                <div className="flex-1 text-left flex items-center justify-between">
                  <span>Bé Vui Học (Cấp 1–3)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold">
                    Lớp 1-12
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* Section 2: Movie Types & Categories */}
          {!isCollapsed && (
            <div className="space-y-1 border-t border-slate-900 pt-3">
              <div className="px-3 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Rạp Phim &amp; Series</span>
                <Clapperboard className="w-3.5 h-3.5 text-slate-600" />
              </div>

              <button
                onClick={() => {
                  handleMovieTabClick('latest');
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-amber-400 hover:bg-slate-900 transition-colors"
              >
                <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Phim Mới Cập Nhật</span>
              </button>

              <button
                onClick={() => {
                  handleMovieTabClick('series');
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-sky-400 hover:bg-slate-900 transition-colors"
              >
                <Tv className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Phim Bộ Tuyển Chọn</span>
              </button>

              <button
                onClick={() => {
                  handleMovieTabClick('single');
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-purple-400 hover:bg-slate-900 transition-colors"
              >
                <Film className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Phim Lẻ Điện Ảnh</span>
              </button>

              <button
                onClick={() => {
                  handleMovieTabClick('hoathinh');
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-emerald-400 hover:bg-slate-900 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Hoạt Hình Anime</span>
              </button>

              <button
                onClick={() => {
                  handleMovieTabClick('tvshows');
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>TV Shows Truyền Hình</span>
              </button>
            </div>
          )}

          {/* Section 3: Thể Loại Theo Bộ Lọc (/api/the-loai/[slug]) */}
          {!isCollapsed && (
            <div className="space-y-1.5 border-t border-slate-900 pt-3">
              <button
                onClick={() => setIsGenresOpen(!isGenresOpen)}
                className="w-full px-3 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between hover:text-slate-300"
              >
                <span>Thể Loại Phim</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isGenresOpen ? 'rotate-180' : ''}`} />
              </button>

              {isGenresOpen && (
                <div className="grid grid-cols-2 gap-1 px-1">
                  {displayGenres.map((genre) => (
                    <button
                      key={genre.slug}
                      onClick={() => {
                        handleGenreClick(genre.slug);
                        onClose();
                      }}
                      className={`text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all truncate ${
                        selectedGenreSlug === genre.slug
                          ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40 font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                      title={genre.name}
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 4: Diễn Viên Nổi Bật (/api/dien-vien) */}
          {!isCollapsed && (
            <div className="space-y-1.5 border-t border-slate-900 pt-3">
              <button
                onClick={() => setIsActorsOpen(!isActorsOpen)}
                className="w-full px-3 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between hover:text-slate-300"
              >
                <span>Diễn Viên Nổi Bật</span>
                <Users className="w-3.5 h-3.5 text-slate-600" />
              </button>

              {isActorsOpen && (
                <div className="space-y-0.5">
                  <button
                    onClick={() => {
                      handleMovieTabClick('actors');
                      onClose();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-amber-400 hover:bg-amber-500/10 transition-colors font-semibold"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Xem tất cả diễn viên</span>
                  </button>

                  {POPULAR_ACTORS.map((actor) => (
                    <button
                      key={actor.slug}
                      onClick={() => {
                        onNavigate('movies');
                        if (onSelectMovieTab) onSelectMovieTab(`actor:${actor.slug}`);
                        onClose();
                      }}
                      className="w-full text-left px-3 py-1 rounded-md text-[11px] text-slate-400 hover:text-white hover:bg-slate-900 transition-colors truncate"
                    >
                      {actor.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 5: AI & Multi-Functional Studios */}
          {!isCollapsed && (
            <div className="space-y-1.5 border-t border-slate-900 pt-3">
              <button
                onClick={() => setIsToolsOpen(!isToolsOpen)}
                className="w-full px-3 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between hover:text-slate-300"
              >
                <span>Công Cụ Tiện Ích</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </button>

              {isToolsOpen && (
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onNavigate('downloader');
                      onClose();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeSection === 'downloader'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Tải Media (VidKraken)</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('tiktok');
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeSection === 'tiktok'
                        ? 'bg-gradient-to-r from-cyan-500/20 to-rose-500/20 text-white border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Video className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">Tải TikTok Không Logo</span>
                    </div>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-gradient-to-r from-cyan-500 to-rose-500 text-white shadow-sm shrink-0">
                      MỚI
                    </span>
                  </button>

                  {onOpenGlobalSearch && (
                    <button
                      onClick={() => {
                        onOpenGlobalSearch();
                        onClose();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-300 hover:text-white bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 transition-all"
                    >
                      <Search className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>Tìm Kiếm Toàn YouTube</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onNavigate('tts');
                      onClose();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeSection === 'tts'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Văn Bản → Giọng Nói</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('kids-learning');
                      onClose();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeSection === 'kids-learning'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Góc Học Tập Cấp 1–3</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Section 6: User Library & Channel */}
          {!isCollapsed && (
            <div className="space-y-1 border-t border-slate-900 pt-3">
              <div className="px-3 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Thư Viện Của Bạn
              </div>

              <button
                onClick={() => {
                  handleMovieTabClick('favorites');
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>Yêu Thích</span>
                </div>
                {favoritesCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
                    {favoritesCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  handleMovieTabClick('history');
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-amber-400 hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Lịch Sử Xem</span>
                </div>
                {historyCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                    {historyCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Section 7: Admin Security & Protection */}
          {!isCollapsed && (
            <div className="space-y-1.5 border-t border-slate-900 pt-3">
              <div className="px-3 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Quản Trị Hệ Thống</span>
                <Shield className="w-3.5 h-3.5 text-amber-500" />
              </div>

              {isAdmin ? (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Admin: {adminUser?.username || 'minhhieuvnbt'}</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                      Đã mở
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      onClick={() => openAdminModal('Cài Đặt Quản Trị Viên', `Quản trị viên (${adminUser?.username || 'minhhieuvnbt'}) đang đăng nhập.`)}
                      className="flex-1 py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors border border-slate-800"
                    >
                      <KeyRound className="w-3 h-3 text-amber-400" />
                      <span>Đổi mật khẩu</span>
                    </button>
                    <button
                      onClick={logout}
                      className="py-1 px-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors border border-red-500/30"
                      title="Khóa lại toàn bộ cài đặt"
                    >
                      <LogOut className="w-3 h-3 text-red-400" />
                      <span>Khóa</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => openAdminModal('Đăng Nhập Quản Trị Viên', 'Đăng nhập để cấu hình quảng cáo, logo, đồng bộ GitHub và thêm video.')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Đăng Nhập Admin</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    Khóa
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Section 8: Adcash Vertical Skyscraper 160x600 (Zone 12358110) - Strictly hidden in Kids Learning */}
          {!isCollapsed && activeSection !== 'kids-learning' && (
            <div className="border-t border-slate-900 pt-3 flex justify-center">
              <AdcashBanner zoneId="12358110" format="160x600" />
            </div>
          )}
        </div>

        {/* Footer / Channel Badge & Collapse Toggle */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 shrink-0 flex items-center justify-between">
          {!isCollapsed && channelInfo && (
            <a
              href={channelInfo.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 group min-w-0"
              title="Xem kênh YouTube chính thức"
            >
              <img
                src={channelInfo.avatar}
                alt={channelInfo.name}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover border border-amber-500/50 shrink-0"
              />
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                  {channelInfo.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{channelInfo.handle}</p>
              </div>
            </a>
          )}

          {/* Desktop Collapse/Expand Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-auto"
            title={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
};
