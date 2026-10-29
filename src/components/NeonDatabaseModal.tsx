import React, { useState, useEffect } from 'react';
import {
  Database,
  X,
  RefreshCw,
  Check,
  ExternalLink,
  ShieldCheck,
  Search,
  Trash2,
  Plus,
  Play,
  Table as TableIcon,
  Users,
  BookOpen,
  Film,
  Settings,
  Eye,
  EyeOff,
  Loader2,
  Clock,
  Server,
  CloudUpload,
  Lock,
  KeyRound,
  UserPlus,
  Shield,
  FileText,
  Tv,
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { getAdminAuthHeaders } from '../utils/adminAuth';
import { getStoredAdSettings, getStoredWatermarkSettings } from '../types/adConfig';

export interface NeonDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

interface NeonStatusData {
  connected: boolean;
  initialized?: boolean;
  adminCount?: number;
  host?: string;
  database?: string;
  version?: string;
  latencyMs?: number;
  tables?: { name: string; rowCount: number }[];
  error?: string;
  configuredUrlMasked?: string;
}

export const NeonDatabaseModal: React.FC<NeonDatabaseModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { isAdmin, adminUser, openAdminModal } = useAdminAuth();

  const [activeTab, setActiveTab] = useState<'tables' | 'accounts' | 'settings' | 'sql'>('tables');
  const [connectionString, setConnectionString] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [status, setStatus] = useState<NeonStatusData | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isInitializingSchema, setIsInitializingSchema] = useState<boolean>(false);
  const [isSyncingLocal, setIsSyncingLocal] = useState<boolean>(false);

  // Table Browser State
  const [selectedTable, setSelectedTable] = useState<string>('neon_app_settings');
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingTable, setIsLoadingTable] = useState<boolean>(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState<any | null>(null);
  const [confirmDeleteRowId, setConfirmDeleteRowId] = useState<string | null>(null);

  // Admin Accounts Management State
  const [adminAccounts, setAdminAccounts] = useState<any[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState<boolean>(false);
  const [newAdminUsername, setNewAdminUsername] = useState<string>('');
  const [newAdminDisplayName, setNewAdminDisplayName] = useState<string>('');
  const [newAdminPassword, setNewAdminPassword] = useState<string>('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'super_admin'>('admin');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState<boolean>(false);
  const [confirmDeleteAdminId, setConfirmDeleteAdminId] = useState<number | null>(null);

  // SQL Console State
  const [customSql, setCustomSql] = useState<string>(
    'SELECT setting_key, category, is_public, updated_by, updated_at FROM neon_app_settings ORDER BY updated_at DESC;'
  );
  const [sqlResult, setSqlResult] = useState<any | null>(null);
  const [isExecutingSql, setIsExecutingSql] = useState<boolean>(false);

  const apiRoot = () => getApiBaseUrl() || '/api/';

  // Fetch Neon status on open (Admin authenticated)
  const fetchStatus = async () => {
    if (!isAdmin) return;
    setIsLoadingStatus(true);
    try {
      const resp = await fetch(`${apiRoot()}neon/status`, {
        headers: {
          Accept: 'application/json',
          ...getAdminAuthHeaders(),
        },
      });
      const data = await resp.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false, error: 'Không thể kết nối API máy chủ.' });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const fetchAdminAccounts = async () => {
    if (!isAdmin) return;
    setIsLoadingAccounts(true);
    try {
      const resp = await fetch(`${apiRoot()}admin/accounts`, {
        headers: {
          Accept: 'application/json',
          ...getAdminAuthHeaders(),
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        setAdminAccounts(data.accounts || []);
      }
    } catch {
      setAdminAccounts([]);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchStatus();
    }
  }, [isOpen, isAdmin]);

  // Load Table Data
  const loadTableData = async (tblName = selectedTable, page = 1, search = searchQuery) => {
    if (!isAdmin) return;
    setIsLoadingTable(true);
    setConfirmDeleteRowId(null);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '15',
        search: search.trim(),
      });
      const resp = await fetch(`${apiRoot()}neon/table/${tblName}?${queryParams.toString()}`, {
        headers: {
          Accept: 'application/json',
          ...getAdminAuthHeaders(),
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        setTableRows(data.rows || []);
        setTotalRows(data.total || 0);
        setCurrentPage(page);
      } else {
        setTableRows([]);
        setTotalRows(0);
      }
    } catch {
      setTableRows([]);
    } finally {
      setIsLoadingTable(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAdmin && activeTab === 'tables' && status?.connected) {
      loadTableData(selectedTable, 1, searchQuery);
    }
    if (isOpen && isAdmin && activeTab === 'accounts') {
      fetchAdminAccounts();
    }
  }, [isOpen, isAdmin, activeTab, selectedTable, status?.connected]);

  if (!isOpen) return null;

  // Strict Admin Guard UI
  if (!isAdmin) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in select-none"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-base font-extrabold text-white">
            Quản Lý Cơ Sở Dữ Liệu Đã Khóa Bảo Mật
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Chỉ Quản trị viên (Admin) đã xác thực mới được phép xem các bảng dữ liệu, tài khoản đăng nhập và cấu hình Neon PostgreSQL.
          </p>
          <div className="flex items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                openAdminModal(
                  'Mở Khóa Quản Lý Cơ Sở Dữ Liệu Neon PostgreSQL',
                  'Xác thực tài khoản Admin để quản lý các bảng dữ liệu và thông tin cài đặt.'
                );
              }}
              className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Đăng Nhập Admin</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Test & Save Connection String + Auto-Create All Tables
  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!connectionString.trim()) {
      onShowToast('Vui lòng nhập chuỗi kết nối PostgreSQL từ https://neon.tech');
      return;
    }

    setIsConnecting(true);
    try {
      const resp = await fetch(`${apiRoot()}neon/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders(),
        },
        body: JSON.stringify({ connectionString: connectionString.trim() }),
      });
      const data = await resp.json();
      if (resp.ok) {
        onShowToast('🎉 Đã kết nối & tự động khởi tạo đầy đủ bảng dữ liệu trên Neon.tech!');
        setStatus(data.details);
        setConnectionString('');
        loadTableData();
      } else {
        onShowToast('Lỗi kết nối: ' + (data.error || 'Kiểm tra lại connection string'));
      }
    } catch (err: any) {
      onShowToast('Lỗi: ' + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  // Initialize Tables Schema
  const handleInitSchema = async () => {
    setIsInitializingSchema(true);
    try {
      const resp = await fetch(`${apiRoot()}neon/init-tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders(),
        },
      });
      const data = await resp.json();
      if (resp.ok) {
        onShowToast('✨ Đã tự động tạo đầy đủ 8 bảng dữ liệu trên Neon PostgreSQL!');
        await fetchStatus();
        loadTableData();
      } else {
        onShowToast('Lỗi tạo bảng: ' + (data.error || 'Từ chối truy cập'));
      }
    } catch (err: any) {
      onShowToast('Lỗi: ' + err.message);
    } finally {
      setIsInitializingSchema(false);
    }
  };

  // Execute Custom SQL
  const handleExecuteSql = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customSql.trim()) return;

    setIsExecutingSql(true);
    try {
      const resp = await fetch(`${apiRoot()}neon/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders(),
        },
        body: JSON.stringify({ sql: customSql.trim() }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setSqlResult(data);
        onShowToast(`Đã thực thi SQL xong trong ${data.executionTimeMs}ms!`);
      } else {
        setSqlResult({ error: data.error || 'Lỗi thực thi SQL' });
      }
    } catch (err: any) {
      setSqlResult({ error: err.message });
    } finally {
      setIsExecutingSql(false);
    }
  };

  // Delete Row (2-step inline confirmation without window.confirm)
  const handleDeleteRow = async (id: string) => {
    if (confirmDeleteRowId !== id) {
      setConfirmDeleteRowId(id);
      return;
    }

    try {
      const resp = await fetch(
        `${apiRoot()}neon/table/${selectedTable}/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
          headers: {
            ...getAdminAuthHeaders(),
          },
        }
      );
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data.success) {
        onShowToast('Đã xóa bản ghi thành công!');
        setConfirmDeleteRowId(null);
        fetchStatus();
        loadTableData(selectedTable, currentPage);
      } else {
        onShowToast(data.error || 'Không thể xóa bản ghi này.');
        setConfirmDeleteRowId(null);
      }
    } catch {
      onShowToast('Lỗi kết nối máy chủ.');
      setConfirmDeleteRowId(null);
    }
  };

  // 1-Click Sync Local Settings, Videos & Study Data Up to Neon
  const handleSyncLocalData = async () => {
    setIsSyncingLocal(true);
    try {
      let localTiktok: any[] = [];
      let customVideos: any[] = [];
      let deletedVideoIds: string[] = [];
      try {
        const raw = localStorage.getItem('minhhieu_tiktok_download_history');
        if (raw) localTiktok = JSON.parse(raw);
        const rawVids = localStorage.getItem('casttube_user_saved_videos');
        if (rawVids) customVideos = JSON.parse(rawVids);
        const rawDel = localStorage.getItem('casttube_deleted_video_ids_v1');
        if (rawDel) deletedVideoIds = JSON.parse(rawDel);
      } catch {}

      const localUsers = [
        {
          id: 'user-default-1',
          name: 'Học sinh Minh Hiếu',
          grade: 4,
          xp: 150,
          stars: 12,
        },
      ];

      const resp = await fetch(`${apiRoot()}neon/sync-local`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders(),
        },
        body: JSON.stringify({
          appSettings: {
            ad_settings: getStoredAdSettings(),
            watermark_settings: getStoredWatermarkSettings(),
          },
          customVideos,
          deletedVideoIds,
          users: localUsers,
          tiktokHistory: localTiktok,
        }),
      });

      const data = await resp.json();
      if (resp.ok) {
        onShowToast('🚀 ' + (data.message || 'Đồng bộ hóa toàn bộ cài đặt & dữ liệu lên Neon thành công!'));
        await fetchStatus();
        loadTableData();
      } else {
        onShowToast('Lỗi đồng bộ: ' + (data.error || 'Từ chối truy cập'));
      }
    } catch (err: any) {
      onShowToast('Lỗi: ' + err.message);
    } finally {
      setIsSyncingLocal(false);
    }
  };

  // Create New Admin Account in PostgreSQL
  const handleCreateAdminAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUsername.trim() || !newAdminPassword.trim()) return;

    setIsCreatingAdmin(true);
    try {
      const resp = await fetch(`${apiRoot()}admin/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders(),
        },
        body: JSON.stringify({
          username: newAdminUsername.trim(),
          displayName: newAdminDisplayName.trim() || newAdminUsername.trim(),
          password: newAdminPassword,
          role: newAdminRole,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        onShowToast('✅ ' + data.message);
        setNewAdminUsername('');
        setNewAdminDisplayName('');
        setNewAdminPassword('');
        fetchAdminAccounts();
        fetchStatus();
      } else {
        onShowToast('⚠️ ' + (data.message || data.error || 'Không thể tạo tài khoản Admin'));
      }
    } catch (err: any) {
      onShowToast('⚠️ Lỗi: ' + err.message);
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleDeleteAdminAccount = async (targetId: number) => {
    if (confirmDeleteAdminId !== targetId) {
      setConfirmDeleteAdminId(targetId);
      return;
    }

    try {
      const resp = await fetch(`${apiRoot()}admin/accounts/${targetId}`, {
        method: 'DELETE',
        headers: {
          ...getAdminAuthHeaders(),
        },
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        onShowToast('✅ ' + data.message);
        setConfirmDeleteAdminId(null);
        fetchAdminAccounts();
        fetchStatus();
      } else {
        onShowToast('⚠️ ' + (data.message || data.error || 'Không thể xóa tài khoản'));
        setConfirmDeleteAdminId(null);
      }
    } catch {
      onShowToast('⚠️ Lỗi kết nối máy chủ.');
      setConfirmDeleteAdminId(null);
    }
  };

  const tableDefinitions = [
    {
      name: 'neon_app_settings',
      label: 'Cài Đặt Hệ Thống',
      icon: Settings,
    },
    {
      name: 'neon_admin_accounts',
      label: 'Tài Khoản Admin',
      icon: Shield,
    },
    {
      name: 'neon_channel_videos',
      label: 'Video & Blacklist',
      icon: Tv,
    },
    {
      name: 'neon_admin_audit_logs',
      label: 'Nhật Ký Bảo Mật',
      icon: FileText,
    },
    {
      name: 'neon_study_records',
      label: 'Bài Tập Bảng Đen',
      icon: BookOpen,
    },
    {
      name: 'neon_app_users',
      label: 'Học Sinh & XP',
      icon: Users,
    },
    {
      name: 'neon_tiktok_history',
      label: 'Lịch Sử TikTok',
      icon: Film,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in select-none font-sans"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-slate-950/95 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-600 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 shrink-0">
              <Database className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Quản Trị Cơ Sở Dữ Liệu Neon PostgreSQL
                </h2>
                {status?.connected ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ĐÃ KẾT NỐI ({status.database || 'neondb'})</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    {isLoadingStatus ? 'Đang kiểm tra...' : 'Chưa kết nối'}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Admin: {adminUser?.username || 'minhhieuvnbt'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tự động hóa bảng đăng nhập mật khẩu (Scrypt), cài đặt hệ thống, quảng cáo &amp; dữ liệu kênh (Chỉ Admin thao tác)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://console.neon.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Neon Console</span>
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 pb-2 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('tables')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'tables'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Các Bảng Dữ Liệu ({status?.tables?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'accounts'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Tài Khoản &amp; Mật Khẩu Admin</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'settings'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Chuỗi Kết Nối DB</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sql')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'sql'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>SQL Console</span>
            </button>
          </div>

          {/* Quick Actions (Schema Init & Sync) */}
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleInitSchema}
              disabled={isInitializingSchema || !status?.connected}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-700 text-slate-200 font-bold flex items-center gap-1.5 transition-all"
              title="Tự động tạo đầy đủ 8 bảng dữ liệu trên Neon PostgreSQL"
            >
              {isInitializingSchema ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Tạo Bảng Tự Động</span>
            </button>

            <button
              type="button"
              onClick={handleSyncLocalData}
              disabled={isSyncingLocal || !status?.connected}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 shadow-sm transition-all"
              title="Đồng bộ tất cả cài đặt, quảng cáo, video & dữ liệu học tập lên Neon"
            >
              {isSyncingLocal ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CloudUpload className="w-3.5 h-3.5" />
              )}
              <span>Đồng Bộ Cài Đặt Lên DB</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs text-slate-300">
          {/* TAB 1: TABLE BROWSER */}
          {activeTab === 'tables' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {tableDefinitions.map((tbl) => {
                  const Icon = tbl.icon;
                  const isSelected = selectedTable === tbl.name;
                  const rowCnt = status?.tables?.find((t) => t.name === tbl.name)?.rowCount ?? 0;
                  return (
                    <button
                      key={tbl.name}
                      type="button"
                      onClick={() => {
                        setSelectedTable(tbl.name);
                        setCurrentPage(1);
                      }}
                      className={`p-2.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-slate-950 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                          : 'bg-slate-950/60 hover:bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon
                          className={`w-3.5 h-3.5 ${
                            isSelected ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        />
                        <span className="font-mono text-[10px] font-bold text-amber-300">
                          {rowCnt}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-[11px] mt-1.5 truncate">
                        {tbl.label}
                      </h4>
                      <p className="text-[9px] text-slate-500 font-mono truncate">{tbl.name}</p>
                    </button>
                  );
                })}
              </div>

              {/* Table Search & Pagination Header */}
              <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') loadTableData(selectedTable, 1, searchQuery);
                    }}
                    placeholder={`Tìm kiếm trong ${selectedTable}...`}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadTableData(selectedTable, currentPage, searchQuery)}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 transition-colors"
                    title="Tải lại bảng"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isLoadingTable ? 'animate-spin text-emerald-400' : ''}`}
                    />
                  </button>
                  <span className="text-slate-400 text-xs font-mono">
                    Tổng: <strong className="text-white">{totalRows}</strong> dòng
                  </span>
                </div>
              </div>

              {/* Table Rows View */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                <div className="overflow-x-auto max-h-[370px]">
                  {isLoadingTable ? (
                    <div className="p-8 text-center space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto" />
                      <p className="text-slate-400 text-xs">Đang truy vấn Neon PostgreSQL...</p>
                    </div>
                  ) : tableRows.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <TableIcon className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-slate-400 text-xs font-medium">
                        Chưa có bản ghi nào trong bảng {selectedTable}.
                      </p>
                      {status?.connected && (
                        <p className="text-[11px] text-slate-500">
                          Nhấn &quot;Tạo Bảng Tự Động&quot; hoặc &quot;Đồng Bộ Cài Đặt Lên DB&quot; để khởi tạo dữ liệu.
                        </p>
                      )}
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-mono text-[11px]">
                          <th className="p-3">ID / Khóa</th>
                          {selectedTable === 'neon_app_settings' && (
                            <>
                              <th className="p-3">Nhóm</th>
                              <th className="p-3">Mô tả</th>
                              <th className="p-3">Dữ liệu JSON</th>
                              <th className="p-3">Người lưu</th>
                            </>
                          )}
                          {selectedTable === 'neon_admin_accounts' && (
                            <>
                              <th className="p-3">Tên đăng nhập</th>
                              <th className="p-3">Tên hiển thị</th>
                              <th className="p-3">Quyền</th>
                              <th className="p-3">Mã hóa mật khẩu</th>
                            </>
                          )}
                          {selectedTable === 'neon_channel_videos' && (
                            <>
                              <th className="p-3">YouTube/TikTok ID</th>
                              <th className="p-3">Tiêu đề</th>
                              <th className="p-3">Trạng thái</th>
                              <th className="p-3">Nguồn</th>
                            </>
                          )}
                          {selectedTable === 'neon_admin_audit_logs' && (
                            <>
                              <th className="p-3">Admin</th>
                              <th className="p-3">Hành động</th>
                              <th className="p-3">Đối tượng</th>
                              <th className="p-3">Thời gian</th>
                            </>
                          )}
                          {selectedTable === 'neon_study_records' && (
                            <>
                              <th className="p-3">Học sinh</th>
                              <th className="p-3">Lớp/Môn</th>
                              <th className="p-3">Tiêu đề bảng</th>
                              <th className="p-3">Đáp số</th>
                            </>
                          )}
                          {selectedTable === 'neon_app_users' && (
                            <>
                              <th className="p-3">Tên học sinh</th>
                              <th className="p-3">Lớp</th>
                              <th className="p-3">Số Sao</th>
                              <th className="p-3">XP</th>
                            </>
                          )}
                          {selectedTable === 'neon_tiktok_history' && (
                            <>
                              <th className="p-3">Tác giả</th>
                              <th className="p-3">Mô tả</th>
                              <th className="p-3">File Name</th>
                              <th className="p-3">Thời gian</th>
                            </>
                          )}
                          <th className="p-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {tableRows.map((row, idx) => {
                          const rowKey = String(row.id ?? row.setting_key ?? idx);
                          return (
                            <tr key={rowKey} className="hover:bg-slate-900/40 transition-colors">
                              <td className="p-3 font-mono text-cyan-300 text-[11px] truncate max-w-[140px]">
                                {rowKey}
                              </td>

                              {selectedTable === 'neon_app_settings' && (
                                <>
                                  <td className="p-3">
                                    <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[10px]">
                                      {row.category || 'general'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-300 max-w-[200px] truncate">
                                    {row.description || '-'}
                                  </td>
                                  <td className="p-3 font-mono text-[10px] text-slate-400 truncate max-w-[200px]">
                                    {JSON.stringify(row.setting_value)}
                                  </td>
                                  <td className="p-3 font-mono text-[11px] text-emerald-300">
                                    {row.updated_by || 'admin'}
                                  </td>
                                </>
                              )}

                              {selectedTable === 'neon_admin_accounts' && (
                                <>
                                  <td className="p-3 font-mono font-bold text-white">
                                    {row.username}
                                  </td>
                                  <td className="p-3 text-slate-300">{row.display_name}</td>
                                  <td className="p-3">
                                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                                      {row.role}
                                    </span>
                                  </td>
                                  <td className="p-3 font-mono text-[10px] text-emerald-400">
                                    {row.password_security || '[SCRYPT PROTECTED]'}
                                  </td>
                                </>
                              )}

                              {selectedTable === 'neon_channel_videos' && (
                                <>
                                  <td className="p-3 font-mono text-slate-300">{row.youtube_id}</td>
                                  <td className="p-3 text-white font-medium max-w-[220px] truncate">
                                    {row.title}
                                  </td>
                                  <td className="p-3">
                                    {row.is_deleted ? (
                                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                                        Đã chặn (Deleted)
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                        Đang hiển thị
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 font-mono text-[10px] text-slate-400">
                                    {row.source_type}
                                  </td>
                                </>
                              )}

                              {selectedTable === 'neon_admin_audit_logs' && (
                                <>
                                  <td className="p-3 font-mono text-amber-300">
                                    {row.admin_username}
                                  </td>
                                  <td className="p-3 font-mono font-bold text-white">
                                    {row.action}
                                  </td>
                                  <td className="p-3 text-slate-400 truncate max-w-[160px]">
                                    {row.target || '-'}
                                  </td>
                                  <td className="p-3 font-mono text-slate-400 text-[11px]">
                                    {row.created_at
                                      ? new Date(row.created_at).toLocaleString('vi-VN')
                                      : '-'}
                                  </td>
                                </>
                              )}

                              {selectedTable === 'neon_study_records' && (
                                <>
                                  <td className="p-3 font-bold text-white">{row.student_name}</td>
                                  <td className="p-3">
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-mono font-bold text-[10px]">
                                      Lớp {row.grade} • {row.subject}
                                    </span>
                                  </td>
                                  <td className="p-3 font-medium text-slate-200 max-w-[180px] truncate">
                                    {row.board_title || row.prompt}
                                  </td>
                                  <td className="p-3 text-amber-300 font-bold max-w-[160px] truncate">
                                    {row.final_answer || '-'}
                                  </td>
                                </>
                              )}

                              {selectedTable === 'neon_app_users' && (
                                <>
                                  <td className="p-3 font-bold text-white">{row.full_name}</td>
                                  <td className="p-3 font-mono text-amber-300">Lớp {row.grade}</td>
                                  <td className="p-3 font-bold text-amber-400">{row.stars} ⭐</td>
                                  <td className="p-3 font-bold text-emerald-400">{row.xp} XP</td>
                                </>
                              )}

                              {selectedTable === 'neon_tiktok_history' && (
                                <>
                                  <td className="p-3 font-bold text-white">{row.author_name}</td>
                                  <td className="p-3 text-slate-300 max-w-[200px] truncate">
                                    {row.description}
                                  </td>
                                  <td className="p-3 font-mono text-slate-400 text-[11px] truncate max-w-[160px]">
                                    {row.file_name}
                                  </td>
                                  <td className="p-3 font-mono text-slate-400 text-[11px]">
                                    {row.downloaded_at
                                      ? new Date(row.downloaded_at).toLocaleDateString('vi-VN')
                                      : '-'}
                                  </td>
                                </>
                              )}

                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRowDetail(row)}
                                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white"
                                    title="Xem chi tiết JSON"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  {selectedTable !== 'neon_admin_accounts' && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRow(rowKey)}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                                        confirmDeleteRowId === rowKey
                                          ? 'bg-rose-600 text-white'
                                          : 'bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400'
                                      }`}
                                      title="Xóa bản ghi"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      {confirmDeleteRowId === rowKey && <span>Xác nhận</span>}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADMIN ACCOUNTS & PASSWORDS IN POSTGRESQL */}
          {activeTab === 'accounts' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left: Existing Admin Accounts in PostgreSQL */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>Danh Sách Tài Khoản Quản Trị (`neon_admin_accounts`)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={fetchAdminAccounts}
                    className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAccounts ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {adminAccounts.map((acc) => {
                    const isSelf =
                      acc.username?.toLowerCase() === (adminUser?.username || '').toLowerCase();
                    return (
                      <div
                        key={acc.id}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 flex-wrap"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-xs">
                              {acc.username}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                              {acc.role}
                            </span>
                            {isSelf && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                                Đang đăng nhập
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {acc.display_name} • Phiên hoạt động: {acc.active_sessions || 0} • Đăng nhập gần nhất:{' '}
                            {acc.last_login_at
                              ? new Date(acc.last_login_at).toLocaleString('vi-VN')
                              : 'Chưa ghi nhận'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isSelf ? (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                openAdminModal(
                                  'Đổi Mật Khẩu & Tên Đăng Nhập Admin',
                                  'Cập nhật mật khẩu mã hóa Scrypt trực tiếp trên Neon PostgreSQL.'
                                );
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Đổi mật khẩu</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteAdminAccount(acc.id)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors ${
                                confirmDeleteAdminId === acc.id
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>
                                {confirmDeleteAdminId === acc.id ? 'Xác nhận xóa' : 'Xóa'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Create Additional Admin Account */}
              <div className="lg:col-span-5">
                <form
                  onSubmit={handleCreateAdminAccount}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                >
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                    <span>Tạo Thêm Tài Khoản Admin Mới</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Mật khẩu được băm một chiều bằng thuật toán <strong className="text-emerald-300">Scrypt + Salt ngẫu nhiên</strong> trước khi lưu vào Neon PostgreSQL.
                  </p>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Tên đăng nhập (Username)
                    </label>
                    <input
                      type="text"
                      value={newAdminUsername}
                      onChange={(e) => setNewAdminUsername(e.target.value)}
                      placeholder="vd: admin_phu"
                      required
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Tên hiển thị
                    </label>
                    <input
                      type="text"
                      value={newAdminDisplayName}
                      onChange={(e) => setNewAdminDisplayName(e.target.value)}
                      placeholder="vd: Quản trị viên phụ"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Mật khẩu bảo vệ (Tối thiểu 6 ký tự)
                    </label>
                    <input
                      type="password"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mạnh..."
                      required
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Cấp quyền
                    </label>
                    <select
                      value={newAdminRole}
                      onChange={(e) =>
                        setNewAdminRole(e.target.value as 'admin' | 'super_admin')
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="admin">Quản trị viên (Admin)</option>
                      <option value="super_admin">Quản trị cấp cao (Super Admin)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingAdmin}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {isCreatingAdmin ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>Lưu Tài Khoản Vào PostgreSQL</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: SETTINGS & CONNECTION STRING CONFIG */}
          {activeTab === 'settings' && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    Chuỗi Kết Nối Cơ Sở Dữ Liệu Neon PostgreSQL (Chỉ Admin)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Khi lưu chuỗi kết nối mới, hệ thống sẽ tự động kiểm tra kết nối SSL và tự động tạo đầy đủ 8 bảng dữ liệu trên cơ sở dữ liệu đó.
                </p>

                {status?.configuredUrlMasked && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-[11px] font-mono text-slate-300">
                    <span className="truncate">Đang hoạt động: {status.configuredUrlMasked}</span>
                    <span className="text-emerald-400 font-bold shrink-0">✓ Đã bảo mật</span>
                  </div>
                )}

                <form onSubmit={handleConnect} className="space-y-3 pt-1">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={connectionString}
                      onChange={(e) => setConnectionString(e.target.value)}
                      placeholder="Dán chuỗi kết nối postgresql://... mới nếu muốn chuyển đổi DB"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isConnecting || !connectionString.trim()}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      {isConnecting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Lưu, Kết Nối &amp; Tự Tạo Bảng</span>
                    </button>

                    <button
                      type="button"
                      onClick={fetchStatus}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Kiểm Tra Trạng Thái</span>
                    </button>
                  </div>
                </form>
              </div>

              {status && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <h4 className="font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>Thông Số Máy Chủ PostgreSQL:</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500">Host:</span>{' '}
                      <span className="text-slate-200">{status.host || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Database:</span>{' '}
                      <span className="text-slate-200">{status.database || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Độ trễ:</span>{' '}
                      <span className="text-amber-300 font-bold">{status.latencyMs || 0} ms</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Phiên bản:</span>{' '}
                      <span className="text-emerald-300">{status.version || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SQL CONSOLE */}
          {activeTab === 'sql' && (
            <div className="space-y-3">
              <form onSubmit={handleExecuteSql} className="space-y-2">
                <textarea
                  rows={4}
                  value={customSql}
                  onChange={(e) => setCustomSql(e.target.value)}
                  placeholder="Nhập câu lệnh SQL (SELECT, UPDATE, INSERT)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Mọi truy vấn SQL đều yêu cầu phiên Admin hợp lệ và được ghi nhận vào `neon_admin_audit_logs`.
                  </span>
                  <button
                    type="submit"
                    disabled={isExecutingSql || !customSql.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
                  >
                    {isExecutingSql ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    <span>Chạy SQL (Admin)</span>
                  </button>
                </div>
              </form>

              {sqlResult && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold text-slate-300">
                      Kết quả: {sqlResult.rowCount !== undefined ? `${sqlResult.rowCount} dòng` : ''}
                    </span>
                    {sqlResult.executionTimeMs !== undefined && (
                      <span className="text-amber-400">{sqlResult.executionTimeMs} ms</span>
                    )}
                  </div>
                  {sqlResult.error ? (
                    <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono">
                      {sqlResult.error}
                    </div>
                  ) : (
                    <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-56">
                      {JSON.stringify(sqlResult.rows || sqlResult, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Row Detail View Modal */}
      {selectedRowDetail && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setSelectedRowDetail(null)}
        >
          <div
            className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-bold text-white">
                Chi Tiết Bản Ghi ({selectedTable})
              </span>
              <button
                type="button"
                onClick={() => setSelectedRowDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(selectedRowDetail, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
