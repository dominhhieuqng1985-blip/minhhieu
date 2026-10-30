import React from 'react';
import {
  Menu,
  Plus,
  FileText,
  Mic,
  Download,
  Film,
  Video,
  PanelRight,
  Radio,
  Play,
  Search,
  Shield,
  ShieldCheck,
  Lock,
  LogOut,
  KeyRound,
  Settings,
  GraduationCap,
  FolderDown,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

interface HeaderProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  onOpenConnectModal: () => void;
  onOpenSettings?: () => void;
  onOpenGlobalSearch?: () => void;
  onOpenDocuments?: () => void;
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
  onOpenSettings,
  onOpenGlobalSearch,
  onOpenDocuments,
  favoritesCount,
  onToggleLeftSidebar,
  isLeftSidebarOpen,
  onToggleRightSidebar,
  isRightSidebarOpen,
}) => {
  const { isAdmin, adminUser, requireAdmin, openAdminModal, logout } = useAdminAuth();

  const handleProtectedConnect = () => {
    requireAdmin(
      onOpenConnectModal,
      'Kết Nối & Thay Đổi Kênh YouTube',
      'Thao tác thay đổi ID kênh YouTube hoặc liên kết kênh mới yêu cầu quyền Quản trị viên.'
    );
  };

  const handleProtectedSettings = () => {
    if (!onOpenSettings) return;
    requireAdmin(
      onOpenSettings,
      'Trung Tâm Cài Đặt & Cơ Sở Dữ Liệu',
      'Chỉ Quản trị viên (Admin) đã xác thực mới được phép mở và thao tác trong Trung Tâm Cài Đặt.'
    );
  };

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

        {/* Center Section: Sleek Quick Search Bar */}
        <div className="flex-1 max-w-xl mx-2 sm:mx-4 flex items-center justify-center min-w-0">
          {onOpenGlobalSearch && (
            <button
              type="button"
              onClick={onOpenGlobalSearch}
              className="w-full flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded-full text-xs transition-all shadow-inner group"
              title="Tìm kiếm video, podcast, YouTube (Phím tắt: Ctrl+K / ⌘K)"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-400 transition-colors shrink-0" />
                <span className="truncate">Tìm kiếm video, podcast, rạp phim...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700 rounded group-hover:border-slate-600 transition-colors shrink-0">
                ⌘K
              </kbd>
            </button>
          )}
        </div>

        {/* Right Section: Actions, Admin Widget & Companion Sidebar Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Admin Status / Login Widget */}
          {isAdmin ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-300 text-xs font-semibold shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline font-mono">{adminUser?.username || 'minhhieuvnbt'}</span>
              <button
                onClick={() => openAdminModal('Cài Đặt Quản Trị Viên', `Đang đăng nhập với quyền Admin (${adminUser?.username || 'minhhieuvnbt'}).`)}
                className="p-1 text-slate-400 hover:text-amber-300 rounded hover:bg-amber-500/20 transition-colors ml-0.5"
                title="Đổi mật khẩu / Quản lý tài khoản Admin"
              >
                <KeyRound className="w-3 h-3 text-amber-400" />
              </button>
              <button
                onClick={logout}
                className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-red-500/20 transition-colors"
                title="Đăng xuất & Khóa các khu vực cài đặt"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAdminModal('Đăng Nhập Quản Trị Viên', 'Nhập tài khoản để mở khóa toàn bộ khu vực cài đặt và thiết lập.')}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-amber-400 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all flex items-center gap-1.5"
              title="Đăng nhập Quản trị viên (Khóa cài đặt)"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          {/* Quick Connect Button (Protected by Admin) */}
          <button
            onClick={handleProtectedConnect}
            className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95"
            title="Kết nối kênh YouTube tùy chỉnh (Yêu cầu quyền Admin)"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Thêm kênh</span>
          </button>

          {/* Unified Channel & App Settings Button (Admin-Only Protected) */}
          {onOpenSettings && (
            <button
              onClick={handleProtectedSettings}
              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-850 rounded-xl border border-slate-800/80 transition-all shrink-0"
              title="Trung tâm cài đặt & quản trị cơ sở dữ liệu (Yêu cầu quyền Admin)"
              aria-label="Cài đặt kênh"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

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

      {/* Permanent Horizontal Menu Bar: ALWAYS visible on all screen sizes & devices */}
      <div className="w-full border-t border-slate-800/80 bg-slate-950/95 px-3 sm:px-6 py-2 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none text-xs font-semibold shadow-inner">
        <nav className="flex items-center gap-1.5 sm:gap-2 shrink-0 overflow-x-auto scrollbar-none">
          <button
            onClick={() => onNavigate('catalog')}
            className={`transition-all whitespace-nowrap py-1.5 px-3 rounded-xl flex items-center gap-2 ${
              activeSection === 'catalog'
                ? 'text-white font-bold bg-red-600 shadow-md shadow-red-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Kênh &amp; Podcast</span>
          </button>

          <button
            onClick={() => onNavigate('movies')}
            className={`transition-all whitespace-nowrap py-1.5 px-3 rounded-xl flex items-center gap-2 ${
              activeSection === 'movies'
                ? 'text-white font-bold bg-gradient-to-r from-red-600 to-rose-600 shadow-md shadow-rose-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-rose-400" />
            <span>Rạp Cinema</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-yellow-400 text-slate-950 font-black uppercase">
              Hot
            </span>
          </button>

          <button
            onClick={() => onNavigate('downloader')}
            className={`transition-all whitespace-nowrap py-1.5 px-3 rounded-xl flex items-center gap-2 ${
              activeSection === 'downloader'
                ? 'text-white font-bold bg-amber-500 shadow-md shadow-amber-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>VidKraken</span>
          </button>

          <button
            onClick={() => onNavigate('tiktok')}
            className={`transition-all whitespace-nowrap py-1.5 px-3 rounded-xl flex items-center gap-2 ${
              activeSection === 'tiktok'
                ? 'text-white font-bold bg-gradient-to-r from-cyan-600 to-rose-600 shadow-md shadow-cyan-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-cyan-500/30'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tải TikTok HD</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-gradient-to-r from-cyan-400 to-rose-400 text-slate-950 font-black uppercase shadow-sm">
              Mới
            </span>
          </button>

          <button
            onClick={() => onNavigate('tts')}
            className={`transition-all whitespace-nowrap py-1.5 px-3 rounded-xl flex items-center gap-2 ${
              activeSection === 'tts'
                ? 'text-white font-bold bg-rose-600 shadow-md shadow-rose-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-rose-400" />
            <span>Studio Giọng Nói</span>
          </button>

          <button
            onClick={() => onNavigate('kids-learning')}
            className={`transition-all whitespace-nowrap py-1.5 px-3 rounded-xl flex items-center gap-2 ${
              activeSection === 'kids-learning'
                ? 'text-slate-950 font-extrabold bg-emerald-400 shadow-md shadow-emerald-500/30'
                : 'text-slate-200 hover:text-white hover:bg-slate-900 border border-emerald-500/30'
            }`}
            title="Chương trình vui học Tiếng Việt, Tiếng Anh, Toán từ Tiểu học đến Cấp 3"
          >
            <GraduationCap
              className={`w-3.5 h-3.5 ${
                activeSection === 'kids-learning' ? 'text-slate-950' : 'text-emerald-400'
              }`}
            />
            <span>Bé Vui Học (Cấp 1–3)</span>
          </button>

          {onOpenDocuments && (
            <button
              onClick={onOpenDocuments}
              className="transition-all whitespace-nowrap py-1.5 px-3 rounded-xl flex items-center gap-1.5 text-blue-300 hover:text-white bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30"
              title="Kho tài liệu số, kịch bản, âm thanh & tải file (Hỗ trợ PayPal)"
            >
              <FolderDown className="w-3.5 h-3.5 text-blue-400" />
              <span>Kho Tài Liệu</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-500/30 text-blue-200 font-bold uppercase">
                Tải Về
              </span>
            </button>
          )}

          {onOpenGlobalSearch && (
            <button
              onClick={onOpenGlobalSearch}
              className="transition-all whitespace-nowrap py-1.5 px-3 rounded-xl flex items-center gap-1.5 text-red-300 hover:text-white bg-red-600/15 hover:bg-red-600/25 border border-red-500/30"
              title="Tìm kiếm YouTube"
            >
              <Search className="w-3.5 h-3.5 text-red-400" />
              <span>Tìm YouTube</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
