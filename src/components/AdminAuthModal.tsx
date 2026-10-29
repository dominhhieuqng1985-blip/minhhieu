import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  AlertCircle,
  LogOut,
  RefreshCw,
  Sparkles,
  Database,
} from 'lucide-react';
import {
  authenticateAdmin,
  isAdminAuthenticated,
  getAdminSessionInfo,
  adminLogout,
  changeAdminPassword,
} from '../utils/adminAuth';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  actionTitle?: string;
  actionDescription?: string;
  onShowToast?: (message: string) => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = 'Khu Vực Cài Đặt & Cơ Sở Dữ Liệu Bảo Mật',
  actionDescription = 'Chỉ Quản trị viên (Admin) đã xác thực cơ sở dữ liệu mới được phép thao tác chức năng này.',
  onShowToast,
}) => {
  const [username, setUsername] = useState('minhhieuvnbt');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionProfile, setSessionProfile] = useState(() => getAdminSessionInfo());

  // Tab for changing credentials stored in PostgreSQL
  const [activeTab, setActiveTab] = useState<'login' | 'change_password'>('login');
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [changeMsg, setChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const info = getAdminSessionInfo();
      setIsLoggedIn(isAdminAuthenticated());
      setSessionProfile(info);
      if (info.username) {
        setUsername(info.username);
        setNewUsername(info.username);
        setNewDisplayName(info.displayName || info.username);
      }
      setErrorMessage(null);
      setChangeMsg(null);
      setPassword('');
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await authenticateAdmin(username, password, rememberMe);
      if (result.success) {
        const info = getAdminSessionInfo();
        setIsLoggedIn(true);
        setSessionProfile(info);
        if (onShowToast) {
          onShowToast('🔓 Đã xác thực Quản trị viên từ Neon PostgreSQL thành công!');
        }
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setErrorMessage(result.message);
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi trong quá trình xác thực!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = (allDevices = false) => {
    adminLogout(allDevices);
    setIsLoggedIn(false);
    setPassword('');
    if (onShowToast) {
      onShowToast(
        allDevices
          ? '🔒 Đã hủy mọi phiên đăng nhập trên tất cả thiết bị và khóa cài đặt!'
          : '🔒 Đã khóa lại toàn bộ các khu vực cài đặt!'
      );
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeMsg(null);

    if (newPass !== confirmPass) {
      setChangeMsg({ type: 'error', text: 'Mật khẩu mới và xác nhận mật khẩu không khớp!' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changeAdminPassword(currentPass, newPass, newUsername, newDisplayName);
      if (res.success) {
        setChangeMsg({ type: 'success', text: res.message });
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
        const updatedInfo = getAdminSessionInfo();
        setSessionProfile(updatedInfo);
        if (onShowToast) {
          onShowToast('✅ Đã lưu mật khẩu & tài khoản Admin vào Neon PostgreSQL!');
        }
      } else {
        setChangeMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setChangeMsg({ type: 'error', text: err.message || 'Lỗi khi đổi mật khẩu!' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col transition-transform duration-200 ${
          shake ? 'animate-bounce' : ''
        }`}
      >
        {/* Header with security shield */}
        <div className="p-6 border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Xác Thực Quản Trị</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Database className="w-2.5 h-2.5" />
                  <span>PostgreSQL</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Chỉ Admin mới thao tác được cài đặt &amp; bảng dữ liệu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action description banner */}
        <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-200/90 leading-relaxed">
          <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300">{actionTitle}</span>
            <p className="text-[11px] text-slate-400 mt-0.5">{actionDescription}</p>
          </div>
        </div>

        {/* Tab switcher if logged in */}
        {isLoggedIn && (
          <div className="flex border-b border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                activeTab === 'login'
                  ? 'border-amber-500 text-amber-400 font-bold bg-slate-950/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Trạng Thái Phiên
            </button>
            <button
              onClick={() => setActiveTab('change_password')}
              className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                activeTab === 'change_password'
                  ? 'border-amber-500 text-amber-400 font-bold bg-slate-950/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Đổi Tài Khoản &amp; Mật Khẩu
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isLoggedIn && activeTab === 'login' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-emerald-300">
                    Đã xác thực Quản trị viên (Neon PostgreSQL)
                  </p>
                  <p className="text-slate-400 mt-0.5">
                    Tài khoản:{' '}
                    <strong className="text-white">
                      {sessionProfile.username || 'minhhieuvnbt'}
                    </strong>{' '}
                    ({sessionProfile.displayName || 'Toàn quyền quản trị'})
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onSuccess) onSuccess();
                  }}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-transform active:scale-98"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Tiếp Tục Mở Cài Đặt Quản Trị</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('change_password')}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Đổi Mật Khẩu DB</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLogout(false)}
                    className="py-2.5 px-4 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-semibold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors"
                    title="Khóa lại toàn bộ cài đặt"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-400" />
                    <span>Đăng Xuất</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleLogout(true)}
                  className="w-full py-2 text-[11px] font-medium text-slate-400 hover:text-rose-300 transition-colors"
                >
                  Đăng xuất &amp; thu hồi phiên trên tất cả thiết bị khác
                </button>
              </div>
            </div>
          ) : activeTab === 'change_password' ? (
            <form onSubmit={handleChangePassword} className="space-y-3">
              {changeMsg && (
                <div
                  className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                    changeMsg.type === 'success'
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/15 border border-red-500/30 text-red-300'
                  }`}
                >
                  {changeMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{changeMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tên đăng nhập Admin
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="minhhieuvnbt"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tên hiển thị
                  </label>
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Quản Trị Viên"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="Nhập mật khẩu đang lưu trong DB"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mật khẩu mới (Mã hóa Scrypt lưu PostgreSQL)
                </label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Đang lưu vào PostgreSQL...' : 'Lưu Vào PostgreSQL'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl text-xs"
                >
                  Quay lại
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tên đăng nhập hoặc Email Admin
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="minhhieuvnbt / admin / email"
                    required
                    autoComplete="username"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">Mật khẩu bảo vệ</label>
                  <span className="text-[11px] text-emerald-400 font-medium">
                    Xác thực Neon DB (Scrypt)
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu Admin"
                    required
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Lưu phiên bảo mật 30 ngày trên máy này</span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-98 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang xác thực trên PostgreSQL...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Xác Nhận &amp; Mở Cài Đặt Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Neon PostgreSQL • Scrypt &amp; SHA-256</span>
          </span>
          <span>© Minh Hiếu TuBe</span>
        </div>
      </div>
    </div>
  );
};
