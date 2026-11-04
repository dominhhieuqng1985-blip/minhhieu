import React, { useState, useEffect } from 'react';
import {
  User,
  LogIn,
  UserPlus,
  LogOut,
  Save,
  Eye,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  TempleMemberRecord,
  MemorialTombRecord,
  TempleMeritRecord,
} from '../../data/buddhistTempleData';
import { resolveApiEndpoint, safeFetchJson } from '../../utils/api';
import {
  saveMemberSession,
  updateStoredMemberProfileOnly,
  clearMemberSession,
  getMemberAuthHeaders,
} from '../../utils/templeMemberAuth';

interface TempleMemberAuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register' | 'profile';
  currentMember: TempleMemberRecord | null;
  tombs: MemorialTombRecord[];
  meritRecords: TempleMeritRecord[];
  onClose: () => void;
  onAuthSuccess: (member: TempleMemberRecord, isNewRegistration?: boolean) => void;
  onLogoutSuccess: () => void;
  onJumpToTomb?: (plotCode: string) => void;
  onViewCertificate?: (record: TempleMeritRecord) => void;
  onShowToast: (msg: string) => void;
}

export const TempleMemberAuthModal: React.FC<TempleMemberAuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  currentMember,
  tombs,
  meritRecords,
  onClose,
  onAuthSuccess,
  onLogoutSuccess,
  onJumpToTomb,
  onViewCertificate,
  onShowToast,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'profile'>(
    currentMember ? 'profile' : initialMode === 'profile' ? 'login' : initialMode
  );

  // Login state
  const [identifier, setIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Register state
  const [regFullName, setRegFullName] = useState<string>('');
  const [regDharmaName, setRegDharmaName] = useState<string>('');
  const [regUsername, setRegUsername] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regAddress, setRegAddress] = useState<string>('');

  // Profile edit state
  const [editFullName, setEditFullName] = useState<string>('');
  const [editDharmaName, setEditDharmaName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editNewPassword, setEditNewPassword] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setSuccessMsg('');
    if (currentMember) {
      setMode('profile');
      setEditFullName(currentMember.fullName || '');
      setEditDharmaName(currentMember.dharmaName || '');
      setEditPhone(currentMember.phone || '');
      setEditEmail(currentMember.email || '');
      setEditAddress(currentMember.address || '');
      setEditNewPassword('');
    } else {
      setMode(initialMode === 'profile' ? 'login' : initialMode);
    }
  }, [isOpen, initialMode, currentMember]);

  if (!isOpen) return null;

  const memberTombs = currentMember
    ? tombs.filter(
        (t) => !t.isDraft && Boolean(t.memberId) && String(t.memberId) === String(currentMember.id)
      )
    : [];

  const memberMerits = currentMember
    ? meritRecords.filter(
        (m) =>
          m.memberId === currentMember.id ||
          (currentMember.phone && m.phone === currentMember.phone) ||
          m.donorName.trim().toLowerCase() === currentMember.fullName.trim().toLowerCase()
      )
    : [];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!identifier.trim() || !loginPassword) {
      setErrorMsg('Vui lòng nhập Tên đăng nhập / Số điện thoại / Email và Mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        token: string;
        member: TempleMemberRecord;
        error?: string;
      }>(resolveApiEndpoint('temple/members/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password: loginPassword,
        }),
      });

      if (!res.success || !res.member) {
        throw new Error(res.error || 'Đăng nhập không thành công.');
      }

      saveMemberSession(res.token, res.member);
      onAuthSuccess(res.member, false);
      onShowToast(`Chào mừng Phật tử ${res.member.fullName} đã đăng nhập!`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Tên đăng nhập hoặc mật khẩu chưa đúng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regFullName.trim()) {
      setErrorMsg('Vui lòng nhập Họ và tên thành viên Phật tử.');
      return;
    }
    if (!regUsername.trim() && !regPhone.trim() && !regEmail.trim()) {
      setErrorMsg('Vui lòng nhập Tên đăng nhập hoặc Số điện thoại để dùng khi đăng nhập.');
      return;
    }
    if (!regPassword || regPassword.trim().length < 4) {
      setErrorMsg('Mật khẩu cần tối thiểu 4 ký tự.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        token: string;
        member: TempleMemberRecord;
        error?: string;
      }>(resolveApiEndpoint('temple/members/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regFullName.trim(),
          dharmaName: regDharmaName.trim() || undefined,
          username: regUsername.trim() || regPhone.trim() || regEmail.trim(),
          password: regPassword,
          phone: regPhone.trim() || undefined,
          email: regEmail.trim() || undefined,
          address: regAddress.trim() || undefined,
        }),
      });

      if (!res.success || !res.member) {
        throw new Error(res.error || 'Đăng ký thành viên không thành công.');
      }

      saveMemberSession(res.token, res.member);
      onAuthSuccess(res.member, true);
      onShowToast(
        `Đăng ký thành công thành viên ${res.member.fullName} (+100 Điểm Công Đức)! Đã lưu vào Neon PostgreSQL.`
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể đăng ký thành viên. Vui lòng thử tên đăng nhập khác.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const res = await safeFetchJson<{
        success: boolean;
        member: TempleMemberRecord;
        error?: string;
      }>(resolveApiEndpoint('temple/members/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getMemberAuthHeaders(),
        },
        body: JSON.stringify({
          fullName: editFullName.trim(),
          dharmaName: editDharmaName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim(),
          address: editAddress.trim(),
          newPassword: editNewPassword.trim() || undefined,
        }),
      });

      if (res.member) {
        updateStoredMemberProfileOnly(res.member);
        onAuthSuccess(res.member, false);
        setEditNewPassword('');
        setSuccessMsg('Đã cập nhật hồ sơ thành viên lên cơ sở dữ liệu Neon PostgreSQL!');
        onShowToast('Đã lưu thông tin thành viên!');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể cập nhật hồ sơ thành viên.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoutClick = async () => {
    setIsSubmitting(true);
    try {
      await safeFetchJson(resolveApiEndpoint('temple/members/logout'), {
        method: 'POST',
        headers: {
          ...getMemberAuthHeaders(),
        },
      }).catch(() => {});
    } finally {
      clearMemberSession();
      setIsSubmitting(false);
      onLogoutSuccess();
      onShowToast('Đã đăng xuất tài khoản thành viên.');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="text-xs text-amber-400 font-medium">
               Đại Bi Tự &amp; Hoa Viên Tâm Linh 3D · Cơ Sở Dữ Liệu Neon PostgreSQL
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5">
              {currentMember
                ? `Hồ Sơ Thành Viên: ${currentMember.fullName}`
                : mode === 'register'
                ? 'Đăng Ký Tài Khoản Thành Viên Phật Tử'
                : 'Đăng Nhập Thành Viên Chùa & Khu Mộ 3D'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold"
          >
            ✕
          </button>
        </div>

        {/* Mode Switcher when logged out */}
        {!currentMember && (
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng Nhập Thành Viên</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Đăng Ký Thành Viên Mới</span>
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {!currentMember && mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Tên đăng nhập / Số điện thoại / Email: *
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Nhập tên đăng nhập, số điện thoại hoặc email..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Mật khẩu thành viên: *
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang xác thực trên Neon DB...' : 'Đăng Nhập Tài Khoản Thành Viên'}</span>
            </button>

            <p className="text-xs text-slate-400 text-center">
              Chưa có tài khoản Phật tử?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-amber-300 hover:text-amber-200 font-semibold underline"
              >
                Đăng ký miễn phí ngay
              </button>
            </p>
          </form>
        )}

        {/* 2. REGISTER FORM */}
        {!currentMember && mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-amber-300 block mb-1">
                  Họ và tên Phật tử / Gia chủ: *
                </label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Bình"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Pháp danh (nếu có):
                </label>
                <input
                  type="text"
                  value={regDharmaName}
                  onChange={(e) => setRegDharmaName(e.target.value)}
                  placeholder="VD: Minh Tâm, Diệu Hiền..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-amber-300 block mb-1">
                  Tên đăng nhập (viết liền): *
                </label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="VD: nguyenvanbinh"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-amber-300 block mb-1">
                  Mật khẩu (tối thiểu 4 ký tự): *
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Nhập mật khẩu bảo mật..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Số điện thoại (cũng dùng để đăng nhập):
                </label>
                <input
                  type="text"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="VD: 0905123456"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Email liên hệ:
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="VD: phattu@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Quê quán / Địa chỉ gia đình:
              </label>
              <input
                type="text"
                value={regAddress}
                onChange={(e) => setRegAddress(e.target.value)}
                placeholder="VD: Quảng Ngãi / TP. Hồ Chí Minh"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Đang tạo hồ sơ trên Neon PostgreSQL...'
                  : 'Hoàn Tất Đăng Ký Thành Viên (+100 Điểm Công Đức)'}
              </span>
            </button>
          </form>
        )}

        {/* 3. LOGGED-IN MEMBER PROFILE & BUILT TOMBS / MERITS */}
        {currentMember && (
          <div className="space-y-5">
            {/* Summary Metrics */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs tabular-nums">
              <div>
                <span className="text-slate-400">Mã TV:</span>{' '}
                <strong className="text-amber-300 font-mono">{currentMember.id}</strong>
                {currentMember.username && (
                  <>
                    {' · '}
                    <span className="text-slate-400">Tài khoản:</span>{' '}
                    <strong className="text-white font-mono">{currentMember.username}</strong>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span>
                  Công đức:{' '}
                  <strong className="text-emerald-400">
                    {currentMember.meritPoints.toLocaleString('vi-VN')}
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Khu mộ đã lập: <strong className="text-amber-300">{memberTombs.length}</strong>
                </span>
              </div>
            </div>

            {/* Profile Edit Form */}
            <form onSubmit={handleProfileSave} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Họ và tên thành viên:
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Pháp danh:
                  </label>
                  <input
                    type="text"
                    value={editDharmaName}
                    onChange={(e) => setEditDharmaName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Số điện thoại:
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Quê quán / Địa chỉ:
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Đổi mật khẩu mới (để trống nếu giữ nguyên):
                </label>
                <input
                  type="password"
                  value={editNewPassword}
                  onChange={(e) => setEditNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới nếu muốn thay đổi..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Đang lưu...' : 'Lưu Hồ Sơ Thành Viên'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/70 text-rose-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng Xuất</span>
                </button>
              </div>
            </form>

            {/* Member's Built 3D Tombs */}
            <div className="border-t border-slate-800 pt-4 space-y-2">
              <div className="text-xs font-bold text-amber-300">
                Khu Mộ Gia Tộc Đã Lập Trong Hoa Viên 3D ({memberTombs.length}):
              </div>
              {memberTombs.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Bạn chưa lập ngôi mộ nào. Vào mục Hoa Viên Khu Mộ 3D và nhấn "+ Lập Mộ Mới 3D" để chọn ô đất trống.
                </p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {memberTombs.map((tomb) => (
                    <div
                      key={tomb.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-amber-400">Ô {tomb.plotCode}</span>
                        {' · '}
                        <strong className="text-white">{tomb.deceasedFullName}</strong>
                        <div className="text-[11px] text-slate-400">
                          Sinh: {tomb.birthSolar} · Mất: {tomb.deathSolar}
                        </div>
                      </div>
                      {onJumpToTomb && (
                        <button
                          type="button"
                          onClick={() => {
                            onJumpToTomb(tomb.plotCode);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-semibold text-[11px] flex items-center gap-1 shrink-0"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Viếng 3D</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Member's Merit Certificates */}
            {memberMerits.length > 0 && (
              <div className="border-t border-slate-800 pt-4 space-y-2">
                <div className="text-xs font-bold text-emerald-300">
                  Sổ Vàng Công Đức Đã Ghi Danh ({memberMerits.length}):
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {memberMerits.map((mr) => (
                    <div
                      key={mr.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-mono text-amber-400">{mr.id}</span> ·{' '}
                        <span className="text-white font-semibold">{mr.donorName}</span>
                        <div className="text-[11px] text-slate-400 truncate">{mr.prayerText}</div>
                      </div>
                      {onViewCertificate && (
                        <button
                          type="button"
                          onClick={() => {
                            onViewCertificate(mr);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-[11px] flex items-center gap-1 shrink-0"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Điệp</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
