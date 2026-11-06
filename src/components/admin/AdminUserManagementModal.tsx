import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Edit2,
  Key,
  Trash2,
  CheckCircle2,
  XCircle,
  Shield,
  ShieldAlert,
  Coins,
  MapPin,
  Phone,
  Mail,
  Lock,
  X,
  AlertCircle,
} from 'lucide-react';
import { TempleMemberRecord } from '../../data/buddhistTempleData';
import { resolveApiEndpoint, safeFetchJson } from '../../utils/api';
import { getAdminAuthHeaders } from '../../utils/adminAuth';

interface AdminUserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onMembersUpdated?: (members: TempleMemberRecord[]) => void;
}

export const AdminUserManagementModal: React.FC<AdminUserManagementModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onMembersUpdated,
}) => {
  const [members, setMembers] = useState<TempleMemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'member' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');

  // Create user modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createUsername, setCreateUsername] = useState<string>('');
  const [createPassword, setCreatePassword] = useState<string>('');
  const [createFullName, setCreateFullName] = useState<string>('');
  const [createDharmaName, setCreateDharmaName] = useState<string>('');
  const [createPhone, setCreatePhone] = useState<string>('');
  const [createEmail, setCreateEmail] = useState<string>('');
  const [createAddress, setCreateAddress] = useState<string>('');
  const [createRole, setCreateRole] = useState<'member' | 'admin'>('member');
  const [createMeritPoints, setCreateMeritPoints] = useState<number>(100);

  // Edit user modal state
  const [editingMember, setEditingMember] = useState<TempleMemberRecord | null>(null);
  const [editFullName, setEditFullName] = useState<string>('');
  const [editDharmaName, setEditDharmaName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editRole, setEditRole] = useState<'member' | 'admin'>('member');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editMeritPoints, setEditMeritPoints] = useState<number>(0);

  // Direct reset password modal state
  const [passwordTargetMember, setPasswordTargetMember] = useState<TempleMemberRecord | null>(null);
  const [newDirectPassword, setNewDirectPassword] = useState<string>('');

  // Delete confirmation
  const [deletingMember, setDeletingMember] = useState<TempleMemberRecord | null>(null);

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>('');

  const fetchMembers = async () => {
    setIsLoading(true);
    setModalError('');
    try {
      const headers = getAdminAuthHeaders();
      const res = await safeFetchJson<{ success: boolean; members: TempleMemberRecord[]; error?: string }>(
        resolveApiEndpoint('admin/temple-members'),
        {
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
        }
      );
      if (res.success && Array.isArray(res.members)) {
        setMembers(res.members);
        if (onMembersUpdated) onMembersUpdated(res.members);
      } else {
        throw new Error(res.error || 'Không thể tải danh sách tài khoản');
      }
    } catch (err: any) {
      setModalError(err?.message || 'Lỗi kết nối máy chủ Neon PostgreSQL');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (roleFilter !== 'all' && (m.role || 'member') !== roleFilter) return false;
      if (statusFilter === 'active' && m.isActive === false) return false;
      if (statusFilter === 'blocked' && m.isActive !== false) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.fullName?.toLowerCase().includes(q) ||
        m.username?.toLowerCase().includes(q) ||
        m.dharmaName?.toLowerCase().includes(q) ||
        m.phone?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.address?.toLowerCase().includes(q)
      );
    });
  }, [members, searchQuery, roleFilter, statusFilter]);

  // Handle Create Member
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFullName.trim()) {
      onShowToast('Vui lòng nhập họ và tên thành viên');
      return;
    }
    setActionLoading(true);
    try {
      const headers = getAdminAuthHeaders();
      const payload = {
        username: createUsername.trim() || undefined,
        password: createPassword || undefined,
        fullName: createFullName.trim(),
        dharmaName: createDharmaName.trim() || undefined,
        phone: createPhone.trim() || undefined,
        email: createEmail.trim() || undefined,
        address: createAddress.trim() || undefined,
        role: createRole,
        meritPoints: Number(createMeritPoints) || 100,
        isActive: true,
      };

      const res = await safeFetchJson<{ success: boolean; member: TempleMemberRecord; error?: string }>(
        resolveApiEndpoint('admin/temple-members'),
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (res.success && res.member) {
        onShowToast(`Đã tạo tài khoản thành công cho: ${res.member.fullName}`);
        setShowCreateModal(false);
        resetCreateForm();
        fetchMembers();
      } else {
        throw new Error(res.error || 'Không thể tạo tài khoản');
      }
    } catch (err: any) {
      onShowToast(err?.message || 'Lỗi khi tạo tài khoản');
    } finally {
      setActionLoading(false);
    }
  };

  const resetCreateForm = () => {
    setCreateUsername('');
    setCreatePassword('');
    setCreateFullName('');
    setCreateDharmaName('');
    setCreatePhone('');
    setCreateEmail('');
    setCreateAddress('');
    setCreateRole('member');
    setCreateMeritPoints(100);
  };

  // Open Edit Modal
  const openEditModal = (member: TempleMemberRecord) => {
    setEditingMember(member);
    setEditFullName(member.fullName || '');
    setEditDharmaName(member.dharmaName || '');
    setEditPhone(member.phone || '');
    setEditEmail(member.email || '');
    setEditAddress(member.address || '');
    setEditRole(member.role === 'admin' ? 'admin' : 'member');
    setEditIsActive(member.isActive !== false);
    setEditMeritPoints(member.meritPoints || 0);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setActionLoading(true);
    try {
      const headers = getAdminAuthHeaders();
      const payload = {
        fullName: editFullName.trim(),
        dharmaName: editDharmaName.trim() || undefined,
        phone: editPhone.trim() || undefined,
        email: editEmail.trim() || undefined,
        address: editAddress.trim() || undefined,
        role: editRole,
        isActive: editIsActive,
        meritPoints: Number(editMeritPoints) || 0,
      };

      const res = await safeFetchJson<{ success: boolean; member: TempleMemberRecord; error?: string }>(
        resolveApiEndpoint(`admin/temple-members/${encodeURIComponent(editingMember.id)}`),
        {
          method: 'PUT',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (res.success && res.member) {
        onShowToast(`Đã cập nhật thông tin thành viên: ${res.member.fullName}`);
        setEditingMember(null);
        fetchMembers();
      } else {
        throw new Error(res.error || 'Không thể cập nhật thành viên');
      }
    } catch (err: any) {
      onShowToast(err?.message || 'Lỗi cập nhật tài khoản');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Direct Password Change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetMember) return;
    if (!newDirectPassword || newDirectPassword.length < 4) {
      onShowToast('Mật khẩu mới phải từ 4 ký tự trở lên');
      return;
    }
    setActionLoading(true);
    try {
      const headers = getAdminAuthHeaders();
      const res = await safeFetchJson<{ success: boolean; error?: string }>(
        resolveApiEndpoint(`admin/temple-members/${encodeURIComponent(passwordTargetMember.id)}/password`),
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ newPassword: newDirectPassword }),
        }
      );

      if (res.success) {
        onShowToast(`Đã đổi mật khẩu thành công cho ${passwordTargetMember.fullName}`);
        setPasswordTargetMember(null);
        setNewDirectPassword('');
      } else {
        throw new Error(res.error || 'Không thể đổi mật khẩu');
      }
    } catch (err: any) {
      onShowToast(err?.message || 'Lỗi đổi mật khẩu');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Toggle Active Status
  const handleToggleActive = async (member: TempleMemberRecord) => {
    try {
      const nextStatus = !member.isActive;
      const headers = getAdminAuthHeaders();
      const res = await safeFetchJson<{ success: boolean; member: TempleMemberRecord; error?: string }>(
        resolveApiEndpoint(`admin/temple-members/${encodeURIComponent(member.id)}`),
        {
          method: 'PUT',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isActive: nextStatus }),
        }
      );
      if (res.success) {
        onShowToast(
          nextStatus
            ? `Đã kích hoạt tài khoản ${member.fullName}`
            : `Đã tạm khóa tài khoản ${member.fullName}`
        );
        fetchMembers();
      }
    } catch (err: any) {
      onShowToast(err?.message || 'Lỗi thay đổi trạng thái tài khoản');
    }
  };

  // Handle Delete Member
  const handleDeleteSubmit = async () => {
    if (!deletingMember) return;
    setActionLoading(true);
    try {
      const headers = getAdminAuthHeaders();
      const res = await safeFetchJson<{ success: boolean; error?: string }>(
        resolveApiEndpoint(`admin/temple-members/${encodeURIComponent(deletingMember.id)}`),
        {
          method: 'DELETE',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
        }
      );

      if (res.success) {
        onShowToast(`Đã xóa tài khoản ${deletingMember.fullName}`);
        setDeletingMember(null);
        fetchMembers();
      } else {
        throw new Error(res.error || 'Không thể xóa tài khoản');
      }
    } catch (err: any) {
      onShowToast(err?.message || 'Lỗi xóa tài khoản');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="max-w-5xl w-full max-h-[92vh] bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-amber-300">
                  Quản Lý Tài Khoản User &amp; Phật Tử (Admin)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Neon PostgreSQL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Thêm mới, thay đổi thông tin, đặt lại mật khẩu và phân quyền tài khoản thành viên
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-2 flex-1">
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm họ tên, pháp danh, user, sđt, email..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="member">Thành viên Phật tử</option>
              <option value="admin">Quản trị viên (Admin)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="blocked">Đã khóa</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchMembers}
              disabled={isLoading}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Làm mới danh sách từ cơ sở dữ liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={() => {
                resetCreateForm();
                setShowCreateModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tạo Mới Tài Khoản User</span>
            </button>
          </div>
        </div>

        {/* Error banner if any */}
        {modalError && (
          <div className="m-4 p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        {/* Users Table / List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {isLoading ? (
            <div className="py-20 text-center space-y-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400" />
              <p className="text-xs">Đang đồng bộ dữ liệu tài khoản từ Neon PostgreSQL...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-16 text-center space-y-2 border border-dashed border-slate-800 rounded-3xl">
              <Users className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Không tìm thấy tài khoản nào</p>
              <p className="text-xs text-slate-500">
                Hãy nhấn nút "Tạo Mới Tài Khoản User" để thêm thành viên đầu tiên.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredMembers.map((member) => {
                const isAdmin = member.role === 'admin';
                const isActive = member.isActive !== false;

                return (
                  <div
                    key={member.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isAdmin
                        ? 'bg-indigo-950/20 border-indigo-500/40 hover:border-indigo-500/70'
                        : 'bg-slate-950/60 border-slate-800 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isAdmin
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gradient-to-tr from-amber-600 to-yellow-600 text-slate-950'
                          }`}
                        >
                          {member.fullName ? member.fullName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-sm text-white">{member.fullName}</h3>
                            {isAdmin && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-0.5">
                                <Shield className="w-2.5 h-2.5" /> ADMIN
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                isActive
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {isActive ? 'Hoạt động' : 'Đã khóa'}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-400 font-medium">
                            {member.dharmaName ? `Pháp danh: ${member.dharmaName}` : 'Chưa có pháp danh'}
                          </p>
                        </div>
                      </div>

                      {/* Top Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(member)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white transition-colors"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordTargetMember(member);
                            setNewDirectPassword('');
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white transition-colors"
                          title="Đổi mật khẩu tài khoản"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingMember(member)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-colors"
                          title="Xóa tài khoản"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Meta info chips */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 py-2 border-t border-slate-800/80 my-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-slate-500 font-mono">User:</span>
                        <span className="text-slate-200 font-mono truncate">{member.username || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="text-slate-200 truncate">{member.phone || 'Chưa cập nhật'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="text-slate-200 truncate">{member.email || 'Chưa cập nhật'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="text-amber-300 font-bold">{member.meritPoints || 0} điểm</span>
                      </div>
                    </div>

                    {/* Bottom row: Tombs count + toggle active */}
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-slate-400">
                        Quản lý: <strong className="text-white">{member.tombsBuilt || 0}</strong> ngôi mộ
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(member)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${
                          isActive
                            ? 'bg-rose-950/40 border-rose-500/30 text-rose-300 hover:bg-rose-900/60'
                            : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60'
                        }`}
                      >
                        {isActive ? 'Khóa tài khoản' : 'Kích hoạt lại'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Tổng cộng: <strong className="text-amber-300">{members.length}</strong> tài khoản thành viên
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>

      {/* 1. SUB-MODAL: TẠO MỚI TÀI KHOẢN USER */}
      {showCreateModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Tạo Mới Tài Khoản User / Phật Tử</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Họ và tên thành viên: *
                </label>
                <input
                  type="text"
                  required
                  value={createFullName}
                  onChange={(e) => setCreateFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn Tâm"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Tên đăng nhập (Username):
                  </label>
                  <input
                    type="text"
                    value={createUsername}
                    onChange={(e) => setCreateUsername(e.target.value)}
                    placeholder="vantam2026"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Mật khẩu khởi tạo:
                  </label>
                  <input
                    type="password"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Mặc định: 123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Pháp danh:</label>
                  <input
                    type="text"
                    value={createDharmaName}
                    onChange={(e) => setCreateDharmaName(e.target.value)}
                    placeholder="Ví dụ: Nhuận Tâm"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Số điện thoại:
                  </label>
                  <input
                    type="tel"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Email (dùng nhận mã xác thực quên mật khẩu):
                </label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="vantam@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Địa chỉ / Quê quán:
                </label>
                <input
                  type="text"
                  value={createAddress}
                  onChange={(e) => setCreateAddress(e.target.value)}
                  placeholder="TP. Hồ Chí Minh"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Phân quyền:</label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="member">Thành viên Phật tử</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Điểm công đức tặng:
                  </label>
                  <input
                    type="number"
                    value={createMeritPoints}
                    onChange={(e) => setCreateMeritPoints(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  {actionLoading ? 'Đang tạo...' : 'Xác Nhận Tạo Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. SUB-MODAL: CHỈNH SỬA THÔNG TIN USER */}
      {editingMember && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Chỉnh Sửa Tài Khoản Thành Viên</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Họ và tên: *</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Pháp danh:</label>
                  <input
                    type="text"
                    value={editDharmaName}
                    onChange={(e) => setEditDharmaName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Số điện thoại:</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Email xác thực:
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Địa chỉ:</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Vai trò:</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="member">Thành viên</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Trạng thái:</label>
                  <select
                    value={editIsActive ? 'active' : 'blocked'}
                    onChange={(e) => setEditIsActive(e.target.value === 'active')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="blocked">Khóa</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Điểm công đức:</label>
                  <input
                    type="number"
                    value={editMeritPoints}
                    onChange={(e) => setEditMeritPoints(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  {actionLoading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. SUB-MODAL: ĐỔI MẬT KHẨU USER TRỰC TIẾP */}
      {passwordTargetMember && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Đổi Mật Khẩu User Trực Tiếp</h3>
              </div>
              <button
                type="button"
                onClick={() => setPasswordTargetMember(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Đang đổi mật khẩu cho tài khoản:{' '}
              <strong className="text-amber-300">{passwordTargetMember.fullName}</strong> (
              <span className="font-mono">{passwordTargetMember.username || passwordTargetMember.phone}</span>)
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Mật khẩu mới: *
                </label>
                <input
                  type="text"
                  required
                  value={newDirectPassword}
                  onChange={(e) => setNewDirectPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới (tối thiểu 4 ký tự)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordTargetMember(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  {actionLoading ? 'Đang cập nhật...' : 'Xác Nhận Đổi Mật Khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. SUB-MODAL: XÁC NHẬN XÓA TÀI KHOẢN */}
      {deletingMember && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-slate-900 border border-rose-500/50 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-base text-white">Xác Nhận Xóa Tài Khoản?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa tài khoản của{' '}
              <strong className="text-rose-300">{deletingMember.fullName}</strong>? Hành động này sẽ
              xóa vĩnh viễn trên Neon PostgreSQL.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteSubmit}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                {actionLoading ? 'Đang xóa...' : 'Xác Nhận Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
