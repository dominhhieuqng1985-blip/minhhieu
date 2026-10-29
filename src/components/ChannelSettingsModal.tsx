import React, { useState, useEffect } from 'react';
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
  Database,
  CheckCircle2,
  Server,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { getAdminAuthHeaders } from '../utils/adminAuth';
import { getApiBaseUrl } from '../utils/api';
import {
  getStoredAdSettings,
  getStoredWatermarkSettings,
} from '../types/adConfig';

interface ChannelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddVideo: () => void;
  onCheckUpdates: () => void;
  isCheckingUpdates: boolean;
  lastCheckedTime: string;
  onOpenGithubSync: () => void;
  onScanDeletedVideos: () => void;
  isScanningDeleted: boolean;
  onOpenAdSettings: () => void;
  onOpenNeonManager?: () => void;
  isAutoplayNext: boolean;
  onToggleAutoplay: () => void;
  channelInfo?: {
    name: string;
    handle: string;
    avatar: string;
    subscribers: string;
    youtubeUrl: string;
    subscribeUrl: string;
  };
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
  onOpenNeonManager,
  isAutoplayNext,
  onToggleAutoplay,
  channelInfo,
  rssFeedUrl = 'https://www.vemaybaynhauyen.com/studo.xml',
  onShowToast,
}) => {
  const { isAdmin, adminUser, requireAdmin, openAdminModal, logout } = useAdminAuth();
  const [copiedRss, setCopiedRss] = useState(false);

  // Live Neon PostgreSQL status & 1-click Auto-Setup state inside Settings
  const [dbStatus, setDbStatus] = useState<{
    connected: boolean;
    database?: string;
    host?: string;
    latencyMs?: number;
    tables?: { name: string; rowCount: number }[];
  } | null>(null);
  const [isLoadingDbStatus, setIsLoadingDbStatus] = useState(false);
  const [isAutoProvisioning, setIsAutoProvisioning] = useState(false);
  const [lastProvisionMessage, setLastProvisionMessage] = useState<string | null>(null);

  const loadDbStatus = async () => {
    if (!isAdmin) return;
    setIsLoadingDbStatus(true);
    try {
      const apiBase = getApiBaseUrl() || '/api/';
      const resp = await fetch(`${apiBase}neon/status`, {
        headers: {
          Accept: 'application/json',
          ...getAdminAuthHeaders(),
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        setDbStatus(data);
      }
    } catch {
      // Ignore transient network issues
    } finally {
      setIsLoadingDbStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAdmin) {
      loadDbStatus();
      setLastProvisionMessage(null);
    }
  }, [isOpen, isAdmin]);

  if (!isOpen) return null;

  const handleCopyRss = () => {
    navigator.clipboard.writeText(rssFeedUrl);
    setCopiedRss(true);
    onShowToast('📋 Đã sao chép liên kết studo.xml vào clipboard!');
    setTimeout(() => setCopiedRss(false), 2000);
  };

  // 1-Click Auto-Create All Tables + Sync Credentials & All App Settings inside Settings
  const handleOneClickAutoSetupDb = async () => {
    if (!isAdmin) {
      openAdminModal(
        'Khởi Tạo Tự Động Cơ Sở Dữ Liệu',
        'Chỉ Quản trị viên (Admin) mới được phép khởi tạo bảng và đồng bộ cài đặt lên Neon PostgreSQL.'
      );
      return;
    }

    setIsAutoProvisioning(true);
    setLastProvisionMessage(null);
    try {
      let customVideos: any[] = [];
      let deletedVideoIds: string[] = [];
      try {
        const rawSaved = localStorage.getItem('casttube_user_saved_videos');
        if (rawSaved) customVideos = JSON.parse(rawSaved);
        const rawDel = localStorage.getItem('casttube_deleted_video_ids_v1');
        if (rawDel) deletedVideoIds = JSON.parse(rawDel);
      } catch {}

      const apiBase = getApiBaseUrl() || '/api/';
      const resp = await fetch(`${apiBase}admin/auto-setup-db`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...getAdminAuthHeaders(),
        },
        body: JSON.stringify({
          adSettings: getStoredAdSettings(),
          watermarkSettings: getStoredWatermarkSettings(),
          channelProfile: channelInfo
            ? { ...channelInfo, rssFeedUrl }
            : { rssFeedUrl },
          playbackPreferences: {
            autoplayNext: isAutoplayNext,
            defaultKidsVoice: 'le_hoang_nam',
            kidsStudioAdFree: true,
          },
          customVideos,
          deletedVideoIds,
        }),
      });

      const data = await resp.json();
      if (resp.ok && data.success) {
        if (data.status) {
          setDbStatus(data.status);
        } else {
          await loadDbStatus();
        }
        setLastProvisionMessage(
          data.message ||
            'Đã tự động tạo đủ 8 bảng dữ liệu (Tài khoản Admin, Mật khẩu mã hóa Scrypt, Cài đặt hệ thống, Video kênh) trên Neon PostgreSQL!'
        );
        onShowToast('✨ Đã tự động tạo bảng & lưu toàn bộ cài đặt vào Neon PostgreSQL!');
      } else {
        onShowToast('⚠️ ' + (data.error || data.message || 'Không thể khởi tạo cơ sở dữ liệu'));
      }
    } catch (err: any) {
      onShowToast('⚠️ Lỗi kết nối máy chủ: ' + (err?.message || 'Thử lại sau'));
    } finally {
      setIsAutoProvisioning(false);
    }
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
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Admin: {adminUser?.username || 'minhhieuvnbt'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Đã Khóa Bảo Mật
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tự động hóa cơ sở dữ liệu PostgreSQL, tài khoản mật khẩu, quảng cáo và đồng bộ kênh
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

        {/* STRICT ADMIN-ONLY GUARD: Non-admin users cannot operate ANY setting or DB control */}
        {!isAdmin ? (
          <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-base font-extrabold text-white">
                Khu Vực Cài Đặt &amp; Cơ Sở Dữ Liệu Chỉ Dành Cho Admin
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hệ thống lưu trữ dữ liệu và tài khoản trên <strong className="text-emerald-400">Neon PostgreSQL</strong> đã kích hoạt chế độ bảo vệ nghiêm ngặt. Vui lòng đăng nhập tài khoản Quản trị viên để mở khóa và thao tác cài đặt.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openAdminModal(
                    'Đăng Nhập Quản Trị Viên (Neon PostgreSQL)',
                    'Xác thực tài khoản & mật khẩu Admin từ cơ sở dữ liệu để mở khóa toàn bộ cài đặt.'
                  );
                }}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Đăng Nhập Admin Ngay</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        ) : (
          /* Body content exclusively for verified Admin */
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
            {/* Group 0: Automatic Neon PostgreSQL Provisioning & Credentials/Settings Storage */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span>Cơ Sở Dữ Liệu Neon PostgreSQL (Tự Động Trong Cài Đặt)</span>
                </h3>
                {dbStatus?.connected ? (
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      {dbStatus.database || 'neondb'} • {dbStatus.tables?.length || 8} bảng •{' '}
                      {dbStatus.latencyMs || 0}ms
                    </span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 font-mono text-[10px]">
                    {isLoadingDbStatus ? 'Đang kiểm tra DB...' : 'Sẵn sàng khởi tạo'}
                  </span>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-950 to-emerald-950/25 border border-emerald-500/30 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                      <Server className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Tự Động Tạo Bảng Đăng Nhập, Mật Khẩu &amp; Cài Đặt Hệ Thống</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Khởi tạo tự động 8 bảng chuẩn trên PostgreSQL (Tài khoản &amp; mật khẩu mã hóa Scrypt, Phiên đăng nhập SHA-256, Cấu hình quảng cáo, Logo, Video kênh, Nhật ký Admin &amp; Học tập) và đồng bộ toàn bộ cài đặt hiện tại chỉ với 1 lần nhấn.
                    </p>
                  </div>
                </div>

                {/* Active Tables Overview */}
                {dbStatus?.tables && dbStatus.tables.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                    {[
                      { key: 'neon_admin_accounts', label: 'Tài khoản Admin' },
                      { key: 'neon_app_settings', label: 'Cài đặt hệ thống' },
                      { key: 'neon_channel_videos', label: 'Video & Blacklist' },
                      { key: 'neon_admin_audit_logs', label: 'Nhật ký bảo mật' },
                    ].map((item) => {
                      const found = dbStatus.tables?.find((t) => t.name === item.key);
                      return (
                        <div
                          key={item.key}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-1"
                        >
                          <span className="text-[10px] text-slate-300 font-semibold truncate">
                            {item.label}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0">
                            {found ? `${found.rowCount}` : '✓'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {lastProvisionMessage && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-[11px] flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{lastProvisionMessage}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleOneClickAutoSetupDb}
                    disabled={isAutoProvisioning}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20"
                  >
                    {isAutoProvisioning ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    <span>
                      {isAutoProvisioning
                        ? 'Đang tự động tạo bảng & lưu cài đặt...'
                        : 'Tự Động Tạo Bảng & Lưu Toàn Bộ Cài Đặt'}
                    </span>
                  </button>

                  {onOpenNeonManager && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenNeonManager();
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Quản Lý Bảng &amp; Tài Khoản Admin</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Group 1: Video Management */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
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
                      Dán URL video hoặc Shorts vừa tải lên YouTube để lưu vào kênh &amp; PostgreSQL
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
                  <h4 className="font-bold text-white">Cài Đặt Quảng Cáo &amp; Logo Kênh</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tùy chỉnh VAST video, banner 728x90, 160x600, Video Slider và lưu trực tiếp lên Neon PostgreSQL
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    requireAdmin(
                      onOpenAdSettings,
                      'Cài Đặt Quảng Cáo & Logo Kênh',
                      'Chỉ Quản trị viên mới được phép chỉnh sửa quảng cáo và watermark.'
                    );
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
                  Nguồn cấp dữ liệu chuẩn để nạp vào <strong className="text-white">YouTube Studio</strong>, Apple Podcasts và Spotify:
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
                    Tự động chuyển tiếp sang tập kế tiếp và đồng bộ trạng thái trên PostgreSQL
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

            {/* Group 5: Admin Account Security */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white">
                    Quản trị viên: {adminUser?.username || 'minhhieuvnbt'} (Đã xác thực PostgreSQL)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onClose();
                      openAdminModal(
                        'Đổi Tài Khoản & Mật Khẩu Admin (PostgreSQL)',
                        'Cập nhật mật khẩu mã hóa Scrypt lưu trực tiếp vào bảng neon_admin_accounts.'
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3 text-amber-400" />
                    <span>Đổi mật khẩu DB</span>
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      onClose();
                      onShowToast('🔒 Đã đăng xuất Admin và khóa các mục cài đặt!');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-medium flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Đăng xuất &amp; Khóa</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Bảo vệ độc quyền bởi Admin • Neon Serverless PostgreSQL</span>
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
