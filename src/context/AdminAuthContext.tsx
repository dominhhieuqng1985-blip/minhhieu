import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  isAdminAuthenticated,
  adminLogout as performLogout,
  subscribeAdminAuth
} from '../utils/adminAuth';
import { AdminAuthModal } from '../components/AdminAuthModal';

interface AdminAuthContextType {
  isAdmin: boolean;
  requireAdmin: (
    action: () => void,
    actionTitle?: string,
    actionDescription?: string
  ) => void;
  openAdminModal: (actionTitle?: string, actionDescription?: string) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

interface AdminAuthProviderProps {
  children: React.ReactNode;
  onShowToast?: (message: string) => void;
}

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({
  children,
  onShowToast
}) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminAuthenticated());
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [actionTitle, setActionTitle] = useState<string>('Khu Vực Quản Trị & Cài Đặt');
  const [actionDescription, setActionDescription] = useState<string>(
    'Thao tác này yêu cầu quyền Quản trị viên để bảo vệ hệ thống.'
  );

  useEffect(() => {
    setIsAdmin(isAdminAuthenticated());
    const unsubscribe = subscribeAdminAuth((loggedIn) => {
      setIsAdmin(loggedIn);
    });
    return () => unsubscribe();
  }, []);

  const requireAdmin = useCallback(
    (
      action: () => void,
      title: string = 'Khu Vực Cài Đặt & Cấu Hình Nhạy Cảm',
      desc: string = 'Vui lòng xác thực tài khoản Quản trị viên để tiếp tục.'
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
      title: string = 'Quản Lý Phiên Quản Trị Viên',
      desc: string = 'Đăng nhập hoặc quản lý bảo mật hệ thống.'
    ) => {
      setActionTitle(title);
      setActionDescription(desc);
      setPendingAction(null);
      setIsModalOpen(true);
    },
    []
  );

  const logout = useCallback(() => {
    performLogout();
    setIsAdmin(false);
    if (onShowToast) {
      onShowToast('🔒 Đã đăng xuất và khóa các khu vực nhạy cảm');
    }
  }, [onShowToast]);

  const handleModalSuccess = () => {
    setIsAdmin(true);
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
        requireAdmin,
        openAdminModal,
        logout
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
