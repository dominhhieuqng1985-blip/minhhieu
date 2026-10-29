import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AdminProfile,
  isAdminAuthenticated,
  getAdminSessionInfo,
  verifyAdminSessionRemote,
  adminLogout as performLogout,
  subscribeAdminAuth,
} from '../utils/adminAuth';
import { AdminAuthModal } from '../components/AdminAuthModal';

interface AdminAuthContextType {
  isAdmin: boolean;
  adminUser: AdminProfile | null;
  dbConnected: boolean;
  dbInitialized: boolean;
  requireAdmin: (
    action: () => void,
    actionTitle?: string,
    actionDescription?: string
  ) => void;
  openAdminModal: (actionTitle?: string, actionDescription?: string) => void;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

interface AdminAuthProviderProps {
  children: React.ReactNode;
  onShowToast?: (message: string) => void;
}

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({
  children,
  onShowToast,
}) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminAuthenticated());
  const [adminUser, setAdminUser] = useState<AdminProfile | null>(() => {
    const info = getAdminSessionInfo();
    return info.loggedIn
      ? { username: info.username, displayName: info.displayName, role: info.role }
      : null;
  });
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [dbInitialized, setDbInitialized] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [actionTitle, setActionTitle] = useState<string>('Khu Vực Quản Trị & Cài Đặt');
  const [actionDescription, setActionDescription] = useState<string>(
    'Thao tác này chỉ dành riêng cho Quản trị viên (Admin) đã xác thực cơ sở dữ liệu.'
  );

  const refreshSession = useCallback(async () => {
    const status = await verifyAdminSessionRemote();
    setIsAdmin(status.authenticated);
    setAdminUser(status.admin);
    if (status.dbConnected !== undefined) setDbConnected(status.dbConnected);
    if (status.dbInitialized !== undefined) setDbInitialized(status.dbInitialized);
  }, []);

  useEffect(() => {
    refreshSession();

    const syncLocal = () => {
      const info = getAdminSessionInfo();
      setIsAdmin(info.loggedIn);
      setAdminUser(
        info.loggedIn
          ? { username: info.username, displayName: info.displayName, role: info.role }
          : null
      );
    };

    const unsubscribe = subscribeAdminAuth(() => {
      syncLocal();
    });
    return () => unsubscribe();
  }, [refreshSession]);

  const requireAdmin = useCallback(
    (
      action: () => void,
      title: string = 'Khu Vực Cài Đặt & Cơ Sở Dữ Liệu Bảo Mật',
      desc: string = 'Chỉ Quản trị viên (Admin) đã đăng nhập mới được phép thao tác chức năng này.'
    ) => {
      if (isAdminAuthenticated()) {
        action();
      } else {
        setActionTitle(title);
        setActionDescription(desc);
        setPendingAction(() => action);
        setIsModalOpen(true);
      }
    },
    []
  );

  const openAdminModal = useCallback(
    (
      title: string = 'Quản Lý Phiên Quản Trị Viên (PostgreSQL)',
      desc: string = 'Đăng nhập, đổi mật khẩu hoặc quản lý bảo mật cơ sở dữ liệu Neon PostgreSQL.'
    ) => {
      setActionTitle(title);
      setActionDescription(desc);
      setPendingAction(null);
      setIsModalOpen(true);
    },
    []
  );

  const logout = useCallback(() => {
    performLogout(false);
    setIsAdmin(false);
    setAdminUser(null);
    if (onShowToast) {
      onShowToast('🔒 Đã đăng xuất Admin và khóa toàn bộ khu vực cài đặt!');
    }
  }, [onShowToast]);

  const handleModalSuccess = () => {
    const info = getAdminSessionInfo();
    setIsAdmin(true);
    setAdminUser(
      info.loggedIn
        ? { username: info.username, displayName: info.displayName, role: info.role }
        : { username: 'minhhieuvnbt', displayName: 'Quản trị viên', role: 'super_admin' }
    );
    refreshSession();
    if (pendingAction) {
      const act = pendingAction;
      setPendingAction(null);
      act();
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAdmin,
        adminUser,
        dbConnected,
        dbInitialized,
        requireAdmin,
        openAdminModal,
        logout,
        refreshSession,
      }}
    >
      {children}

      <AdminAuthModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPendingAction(null);
        }}
        onSuccess={handleModalSuccess}
        actionTitle={actionTitle}
        actionDescription={actionDescription}
        onShowToast={onShowToast}
      />
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
