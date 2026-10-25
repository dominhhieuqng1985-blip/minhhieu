import React, { useState } from 'react';
import {
  X,
  Settings,
  PlusCircle,
  RefreshCw,
  Github,
  Trash2,
  Tv,
  Check,
  Rss,
  Copy,
  ExternalLink,
  Shield,
  ShieldCheck,
  Lock,
  LogOut,
  KeyRound,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

interface ChannelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Handlers for individual settings actions
  onOpenAddVideo: () => void;
  onCheckUpdates: () => void;
  isCheckingUpdates: boolean;
  lastCheckedTime: string;
  onOpenGithubSync: () => void;
  onScanDeletedVideos: () => void;
  isScanningDeleted: boolean;
  onOpenAdSettings: () => void;
  isAutoplayNext: boolean;
  onToggleAutoplay: () => void;
  rssFeedUrl?: string;
  onShowToast: (msg: string) => void;
}

export const ChannelSettingsModal: React.FC<ChannelSettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenAddVideo,
  onCheckUpdates,
  isCheckingUpdates,
  lastCheckedTime,
  onOpenGithubSync,
  onScanDeletedVideos,
  isScanningDeleted,
  onOpenAdSettings,
  isAutoplayNext,
  onToggleAutoplay,
  rssFeedUrl = 'https://www.vemaybaynhauyen.com/studo.xml',
  onShowToast,
}) => {
  const { isAdmin, requireAdmin, openAdminModal, logout } = useAdminAuth();
  const [copiedRss, setCopiedRss] = useState(false);

  if (!isOpen) return null;

  const handleCopyRss = () => {
    navigator.clipboard.writeText(rssFeedUrl);
    setCopiedRss(true);
    onShowToast('📋 Đã sao chép liên kết studo.xml vào clipboard!');
    setTimeout(() => setCopiedRss(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Trung Tâm Cài Đặt &amp; Quản Trị Kênh</span>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Admin
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Gộp tất cả công cụ quản trị dữ liệu, quảng cáo, RSS và đồng bộ kênh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content with neat groupings */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Group 1: Video Management */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Tv className="w-4 h-4" />
              <span>Quản Lý Video &amp; Cập Nhật Kênh</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Add New Video */}
              <button
                onClick={() => {
                  onClose();
                  requireAdmin(
                    onOpenAddVideo,
                    'Thêm Video Mới Vào Kênh',
                    'Thêm video hoặc Shorts YouTube mới vào kênh yêu cầu quyền Quản trị viên.'
                  );
                }}
                className="p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-left transition-all group flex items-start gap-3"
              >
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors shrink-0">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                    Thêm Video / Shorts Mới
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                    Dán URL video hoặc Shorts vừa tải lên YouTube để đưa vào kênh
                  </p>
                </div>
              </button>

              {/* Check Updates */}
              <button
                onClick={() => {
                  onCheckUpdates();
                }}
                disabled={isCheckingUpdates}
                className="p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group flex items-start gap-3 disabled:opacity-50"
              >
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors shrink-0">
                  <RefreshCw className={`w-4 h-4 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                      {isCheckingUpdates ? 'Đang Kiểm Tra...' : 'Kiểm Tra Video Mới'}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                    Lần kiểm tra gần nhất: {lastCheckedTime}
                  </p>
                </div>
              </button>

              {/* GitHub Sync */}
              <button
                onClick={() => {
                  onClose();
                  requireAdmin(
                    onOpenGithubSync,
                    'Cấu Hình & Đồng Bộ Kênh Lên GitHub',
                    'Truy cập công cụ đồng bộ GitHub Actions và quản lý dữ liệu yêu cầu quyền Quản trị viên.'
                  );
                }}
                className="p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-left transition-all group flex items-start gap-3"
              >
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-slate-950 transition-colors shrink-0">
                  <Github className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-100 group-hover:text-purple-300 transition-colors">
                    Đồng Bộ Tự Động Lên GitHub
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                    Cấu hình GitHub Actions, sao lưu và đồng bộ danh sách video
                  </p>
                </div>
              </button>

              {/* Scan & Purge Deleted */}
              <button
                onClick={() => {
                  requireAdmin(
                    onScanDeletedVideos,
                    'Quét & Dọn Dẹp Video Lỗi Trên YouTube',
                    'Thao tác quét và loại bỏ vĩnh viễn các video đã bị xóa hoặc đặt riêng tư yêu cầu quyền Quản trị viên.'
                  );
                }}
                disabled={isScanningDeleted}
                className="p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-red-500/40 text-left transition-all group flex items-start gap-3 disabled:opacity-50"
              >
                <div className="p-2 rounded-xl bg-red-500/10 text-red-400 group-hover:bg-red-500 group-hover:text-slate-950 transition-colors shrink-0">
                  {isScanningDeleted ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-100 group-hover:text-red-300 transition-colors">
                    {isScanningDeleted ? 'Đang Quét...' : 'Quét Video Đã Xóa Trên YT'}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                    Loại bỏ vĩnh viễn các video YouTube đã bị gỡ hoặc đặt riêng tư
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Group 2: Ad Settings & Watermark */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Quảng Cáo, Banner &amp; Nhận Diện Thương Hiệu</span>
            </h3>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-white">
                  Cài Đặt Quảng Cáo &amp; Logo Kênh
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tùy chỉnh video tài trợ góc phải, banner 728x90, 160x600, 336x280, 300x250 và watermark logo
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenAdSettings();
                }}
                className="px-4 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shrink-0 self-start sm:self-auto flex items-center gap-1.5 shadow"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Mở Cài Đặt QC</span>
              </button>
            </div>
          </div>

          {/* Group 3: Podcast RSS Feed (studo.xml) */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Rss className="w-4 h-4" />
              <span>Podcast RSS Feed (studo.xml)</span>
            </h3>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Nguồn cấp dữ liệu chuẩn để nạp vào <strong className="text-white">YouTube Studio</strong> (Tạo &gt; Podcast mới &gt; Gửi nguồn cấp dữ liệu RSS), Apple Podcasts và Spotify:
              </p>
              <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800 font-mono text-[11px] text-amber-300 break-all">
                <span className="flex-1 select-all">{rssFeedUrl}</span>
                <button
                  onClick={handleCopyRss}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold shrink-0 flex items-center gap-1 transition-colors"
                >
                  {copiedRss ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRss ? 'Đã chép' : 'Sao chép'}</span>
                </button>
                <a
                  href="./studo.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg shrink-0"
                  title="Mở xem trực tiếp studo.xml"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Group 4: Playback Experience */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span>Trải Nghiệm Phát Nhạc</span>
            </h3>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-white">Tự Động Phát Tập Tiếp Theo</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tự động chuyển tiếp sang tập kế tiếp khi video hiện tại xem hết
                </p>
              </div>
              <button
                onClick={onToggleAutoplay}
                className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
                  isAutoplayNext
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${isAutoplayNext ? 'opacity-100' : 'opacity-40'}`} />
                <span>{isAutoplayNext ? 'Đang BẬT' : 'Đang TẮT'}</span>
              </button>
            </div>
          </div>

          {/* Group 5: Admin Status */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white">
                  Tài khoản Quản trị: {isAdmin ? 'minhhieuvnbt (Đã đăng nhập)' : 'Chưa đăng nhập'}
                </span>
              </div>
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onClose();
                      openAdminModal('Đổi Mật Khẩu Admin', 'Thay đổi mật khẩu tài khoản quản trị minhhieuvnbt.');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3 text-amber-400" />
                    <span>Đổi mật khẩu</span>
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      onShowToast('🔒 Đã đăng xuất Admin và khóa các mục cài đặt!');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-medium flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onClose();
                    openAdminModal('Đăng Nhập Quản Trị Viên', 'Nhập thông tin quản trị để mở khóa cài đặt.');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Đăng Nhập Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
