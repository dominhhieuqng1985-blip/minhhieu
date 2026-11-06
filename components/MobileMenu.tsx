
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { User } from '../types';
import { CloseIcon, LoginIcon, LogoutIcon, TicketIcon, SearchIcon, CreditCardIcon, PhoneIcon, ChartBarIcon, RadarIcon } from './icons/Icons';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLoginClick: () => void;
  onLogout: () => void;
  onBookingLookupClick: () => void;
  onNavigateToAdmin: () => void;
  onMyBookingsClick: () => void;
  onLiveFlightClick?: () => void;
}

// SEO Optimized Mobile Logo
const MobileLogo: React.FC = () => (
  <svg width="200" height="45" viewBox="0 0 220 50" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <text x="5" y="28" fontFamily="Arial, Helvetica, sans-serif" fontSize="26" fontWeight="bold">
      <tspan className="fill-[#0056b3] dark:fill-blue-400">Nhã Uyên</tspan>
      <tspan className="fill-[#DA251D] dark:fill-red-500"> AIR</tspan>
    </text>
    <text x="5" y="45" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" className="fill-[#333] dark:fill-gray-300">
      vemaybaynhauyen.com
    </text>
  </svg>
);

const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginClick,
  onLogout,
  onBookingLookupClick,
  onNavigateToAdmin,
  onMyBookingsClick,
  onLiveFlightClick
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleAndClose = (action?: () => void) => () => {
    if(action) action();
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[9999] flex justify-end ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
        title="Đóng menu"
      />

      {/* Drawer Panel */}
      <div
        className={`relative w-[85%] max-w-sm h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-label="Mobile Navigation Menu"
      >
        {/* Header with Logo */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex-grow pt-1">
             <MobileLogo />
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Đóng menu"
            title="Đóng menu"
          >
            <CloseIcon className="w-7 h-7" />
          </button>
        </div>

        {/* Content - Scrollable Area */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-gray-900">
            <button
              onClick={handleAndClose(onLiveFlightClick)}
              className="flex items-center w-full p-3 rounded-xl text-left text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm hover:text-red-600 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
              title="Theo dõi chuyến bay thời gian thực"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 text-red-600 mr-4 shrink-0">
                <RadarIcon className="w-5 h-5" />
              </div>
              <span className="font-bold text-base">Live Flight Tracker</span>
            </button>

            <button
              onClick={handleAndClose(onBookingLookupClick)}
              className="flex items-center w-full p-3 rounded-xl text-left text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm hover:text-blue-600 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
              title="Kiểm tra tình trạng đơn hàng"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-600 mr-4 shrink-0">
                <SearchIcon className="w-5 h-5" />
              </div>
              <span className="font-bold text-base">Tra cứu đơn hàng</span>
            </button>

            <a
              href="https://vemaybaynhauyen.com/huong-dan-thanh-toan"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center w-full p-3 rounded-xl text-left text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm hover:text-green-600 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
              title="Xem hướng dẫn thanh toán"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 text-green-600 mr-4 shrink-0">
                <CreditCardIcon className="w-5 h-5" />
              </div>
              <span className="font-bold text-base">Hướng dẫn thanh toán</span>
            </a>

            <a
              href="https://vemaybaynhauyen.com/lien-he"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center w-full p-3 rounded-xl text-left text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm hover:text-orange-600 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
              title="Liên hệ với bộ phận hỗ trợ"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100 text-orange-600 mr-4 shrink-0">
                <PhoneIcon className="w-5 h-5" />
              </div>
              <span className="font-bold text-base">Liên hệ hỗ trợ</span>
            </a>

            <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>

            <button
              onClick={handleAndClose(onNavigateToAdmin)}
              className="flex items-center w-full p-3 rounded-xl text-left text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm hover:text-purple-600 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
              title="Truy cập trang quản trị"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 text-purple-600 mr-4 shrink-0">
                <ChartBarIcon className="w-5 h-5" />
              </div>
              <span className="font-bold text-base">Quản trị hệ thống</span>
            </button>
        </nav>

        {/* Footer / User Info */}
        <div className="p-5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {currentUser ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="font-bold text-gray-800 dark:text-white truncate text-base">{currentUser.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{currentUser.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleAndClose(onMyBookingsClick)}
                  className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                  title="Xem vé đã đặt của tôi"
                >
                  <TicketIcon className="w-6 h-6 mb-1 text-blue-500" />
                  <span className="text-xs font-bold">Vé của tôi</span>
                </button>
                <button
                  onClick={handleAndClose(onLogout)}
                  className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-red-500 hover:text-red-600 transition-all shadow-sm"
                  title="Đăng xuất khỏi tài khoản"
                >
                  <LogoutIcon className="w-6 h-6 mb-1 text-red-500" />
                  <span className="text-xs font-bold">Đăng xuất</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleAndClose(onLoginClick)}
              className="w-full flex items-center justify-center gap-3 p-4 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 active:scale-95 transition-all"
              title="Đăng nhập để quản lý đặt chỗ"
            >
              <LoginIcon className="w-6 h-6" />
              <span>Đăng nhập / Đăng ký</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MobileMenu;
