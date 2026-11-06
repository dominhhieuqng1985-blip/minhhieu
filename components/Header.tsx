
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { SunIcon, MoonIcon, ChevronDownIcon, LoginIcon, LogoutIcon, TicketIcon, SearchIcon, CreditCardIcon, PhoneIcon, ChartBarIcon, RadarIcon, BellIcon, SparklesIcon } from './icons/Icons';
import MobileMenu from './MobileMenu';
import { getDailyGreeting } from '../services/geminiService';

// SEO Optimized Logo - Responsive Width
const Logo: React.FC = () => (
  <svg width="200" height="45" viewBox="0 0 220 50" fill="none" xmlns="http://www.w3.org/2000/svg" aria-labelledby="logoTitle logoDesc" role="img" className="w-32 sm:w-48 h-auto">
    <title id="logoTitle">Nhã Uyên Air - Đại lý vé máy bay giá rẻ uy tín</title>
    <desc id="logoDesc">Logo thương hiệu Nhã Uyên Air với màu xanh và đỏ chủ đạo</desc>
    <text x="5" y="28" fontFamily="Arial, Helvetica, sans-serif" fontSize="26" fontWeight="bold">
      <tspan className="fill-[#0056b3] dark:fill-blue-400">Nhã Uyên</tspan>
      <tspan className="fill-[#DA251D] dark:fill-red-500"> AIR</tspan>
    </text>
    <text x="5" y="45" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" className="fill-[#333] dark:fill-gray-300">
      vemaybaynhauyen.com
    </text>
  </svg>
);

const DarkModeToggle: React.FC<{ isDarkMode: boolean; onToggle: () => void; }> = ({ isDarkMode, onToggle }) => (
    <button 
        onClick={onToggle} 
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500" 
        aria-label={isDarkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
        title={isDarkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
    >
        {isDarkMode ? <SunIcon className="w-5 h-5"/> : <MoonIcon className="w-5 h-5" />}
    </button>
);

// SMART FEATURE: AI Daily Greeting
const SmartGreeting: React.FC = () => {
    const [time, setTime] = useState(new Date());
    const [aiMessage, setAiMessage] = useState<string>('');

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 60000); // Update every minute
        
        // AI Message Logic with Session Cache (1 day)
        const fetchDailyMessage = async () => {
            const todayKey = `ai_msg_${new Date().toISOString().split('T')[0]}`;
            const cached = sessionStorage.getItem(todayKey);
            
            if (cached) {
                setAiMessage(cached);
                return;
            }

            try {
                const msg = await getDailyGreeting();
                if (msg) {
                    setAiMessage(msg);
                    sessionStorage.setItem(todayKey, msg);
                }
            } catch (e) {
                console.warn("AI Greeting failed, using default.");
                setAiMessage("Chúc bạn có những chuyến đi tuyệt vời!");
            }
        };

        fetchDailyMessage();

        return () => clearInterval(timer);
    }, []);

    const hour = time.getHours();
    let greeting = "Xin chào";
    
    if (hour >= 5 && hour < 11) { greeting = "Chào buổi sáng"; }
    else if (hour >= 11 && hour < 14) { greeting = "Chào buổi trưa"; }
    else if (hour >= 14 && hour < 18) { greeting = "Chào buổi chiều"; }
    else { greeting = "Chào buổi tối"; }

    return (
        <div className="hidden md:flex flex-col items-end mr-4 text-right max-w-[200px] lg:max-w-xs" title={`Bây giờ là ${time.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}`}>
            <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-1 justify-end">
                <SparklesIcon className="w-3 h-3" />
                {greeting}, hôm nay {new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(time)}
            </div>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-300 italic truncate w-full">
                "{aiMessage || 'Hành trình vạn dặm bắt đầu từ đây'}"
            </div>
        </div>
    );
};

// SMART FEATURE: Notification Bell
const NotificationBell: React.FC = () => (
    <button 
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors group"
        aria-label="Thông báo"
        title="Thông báo: Có 3 vé khuyến mãi mới"
    >
        <BellIcon className="w-5 h-5 group-hover:text-blue-600 transition-colors" />
        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
        </span>
    </button>
);

interface NavButtonProps {
    onClick?: () => void;
    href?: string;
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    description?: string; // For Title attribute
}

const NavButton: React.FC<NavButtonProps> = ({ onClick, href, icon, label, isActive, description }) => {
    const className = `flex items-center gap-1.5 font-semibold text-sm transition-colors px-3 py-2 rounded-md whitespace-nowrap ${isActive ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`;
    const titleText = description || label;

    if (href) {
        return <a href={href} target="_blank" rel="noopener noreferrer" className={className} title={titleText} aria-label={label}>{icon} {label}</a>
    }
    return <button onClick={onClick} className={className} title={titleText} aria-label={label}>{icon} {label}</button>
};

const UserMenu: React.FC<{ user: User, onLogout: () => void, onMyBookingsClick: () => void }> = ({ user, onLogout, onMyBookingsClick }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const walletBalance = user.balance ? Number(user.balance) : 0;
    const isValidBalance = !isNaN(walletBalance) && walletBalance > 0;

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="flex items-center space-x-2 px-3 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-expanded={isOpen}
                aria-haspopup="true"
                title="Menu tài khoản cá nhân"
            >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col items-start leading-none">
                    <span className="font-semibold text-sm text-gray-700 dark:text-gray-200 max-w-[100px] truncate">{user.name}</span>
                    {(user.role_level === 'admin' || user.role_level === 'f1' || user.role_level === 'f2' || isValidBalance) && (
                        <span className="text-[10px] text-green-600 dark:text-green-400 font-bold font-mono">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(isNaN(walletBalance) ? 0 : walletBalance)}
                        </span>
                    )}
                </div>
                <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[var(--card-bg-color)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in">
                    <div className="p-4 border-b border-[var(--border-color)] bg-gray-50 dark:bg-gray-800">
                         <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{user.name}</p>
                         <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                         <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <span className="text-xs text-gray-500">Ví của tôi:</span>
                            <span className="text-sm font-bold text-green-600">{new Intl.NumberFormat('vi-VN').format(isNaN(walletBalance) ? 0 : walletBalance)} đ</span>
                         </div>
                    </div>
                    <div className="p-1">
                        <button onClick={() => { setIsOpen(false); onMyBookingsClick(); }} className="w-full text-left flex items-center space-x-3 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md transition-colors" title="Xem danh sách vé đã đặt">
                            <TicketIcon className="w-4 h-4 text-blue-500" />
                            <span>Vé của tôi</span>
                        </button>
                        <button onClick={onLogout} className="w-full text-left flex items-center space-x-3 px-4 py-2.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md transition-colors" title="Đăng xuất khỏi hệ thống">
                            <LogoutIcon className="w-4 h-4" />
                            <span>Đăng xuất</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


interface HeaderProps {
  onNavigateHome: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  currentUser: User | null;
  onLoginClick: () => void;
  onLogout: () => void;
  onBookingLookupClick: () => void;
  onNavigateToAdmin: () => void;
  onMyBookingsClick: () => void;
  onLiveFlightClick: () => void;
  currentView: 'main' | 'admin' | 'live-flight';
}

const Header: React.FC<HeaderProps> = ({ onNavigateHome, isDarkMode, onToggleDarkMode, currentUser, onLoginClick, onLogout, onBookingLookupClick, onNavigateToAdmin, onMyBookingsClick, onLiveFlightClick, currentView }) => {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onNavigateHome();
  };

  return (
    <header className="bg-[var(--card-bg-color)]/95 backdrop-blur-md shadow-md sticky top-0 z-50 border-b border-[var(--border-color)] transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16 lg:h-20">
          {/* Logo Section */}
          <a 
            href="/" 
            onClick={handleHomeClick} 
            aria-label="Trang chủ Nhã Uyên Air" 
            title="Về trang chủ tìm kiếm vé"
            className="cursor-pointer flex-shrink-0 transform hover:scale-105 transition-transform"
          >
            <Logo />
          </a>
          
          {/* Desktop Navigation & Actions */}
          <div className="flex items-center gap-2 lg:gap-4">
            
            {/* Main Menu - Visible on Large Screens */}
            <nav className="hidden lg:flex items-center gap-1 mr-2" role="navigation" aria-label="Main Navigation">
                <NavButton onClick={onLiveFlightClick} isActive={currentView === 'live-flight'} icon={<RadarIcon className="w-4 h-4"/>} label="Live Flight" description="Theo dõi chuyến bay thời gian thực" />
                <NavButton onClick={onBookingLookupClick} icon={<SearchIcon className="w-4 h-4"/>} label="Tra cứu" description="Kiểm tra tình trạng đơn hàng" />
                <NavButton href="https://vemaybaynhauyen.com/huong-dan-thanh-toan" icon={<CreditCardIcon className="w-4 h-4"/>} label="Thanh toán" description="Hướng dẫn thanh toán vé" />
                <NavButton href="https://vemaybaynhauyen.com/lien-he" icon={<PhoneIcon className="w-4 h-4"/>} label="Liên hệ" description="Thông tin liên hệ hỗ trợ" />
                
                {/* Admin Link hidden unless needed/accessed */}
                <NavButton onClick={onNavigateToAdmin} icon={<ChartBarIcon className="w-4 h-4"/>} label="Admin" description="Trang quản trị hệ thống" />
            </nav>
            
            {/* Smart Greeting (Changed to MD+ to be more visible) */}
            <SmartGreeting />

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1 hidden lg:block"></div>

            {/* Notification & Dark Mode */}
            <div className="flex items-center gap-1">
                <NotificationBell />
                <DarkModeToggle isDarkMode={isDarkMode} onToggle={onToggleDarkMode} />
            </div>
            
            {/* User Auth */}
            {currentUser ? (
                <UserMenu user={currentUser} onLogout={onLogout} onMyBookingsClick={onMyBookingsClick} />
            ) : (
                <button 
                    onClick={onLoginClick} 
                    className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 rounded-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-xs sm:text-sm shadow-lg transition-all transform hover:scale-105 ml-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    aria-label="Đăng nhập hoặc Đăng ký tài khoản"
                    title="Đăng nhập để quản lý vé và tích điểm"
                >
                   <LoginIcon className="w-4 h-4" />
                   <span className="hidden sm:inline">Đăng nhập</span>
                </button>
            )}
            
             {/* Mobile Menu Toggle - Hidden on Large Screens */}
             <button 
                onClick={() => setMobileMenuOpen(true)} 
                className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ml-1 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Mở menu chính"
                aria-expanded={isMobileMenuOpen}
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu Component */}
      <MobileMenu 
        isOpen={isMobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        currentUser={currentUser}
        onLoginClick={onLoginClick}
        onLogout={onLogout}
        onBookingLookupClick={onBookingLookupClick}
        onNavigateToAdmin={onNavigateToAdmin}
        onMyBookingsClick={onMyBookingsClick}
        onLiveFlightClick={onLiveFlightClick}
      />
    </header>
  );
};

export default Header;
