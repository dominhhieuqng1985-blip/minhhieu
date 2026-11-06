
import React, { useMemo, useEffect } from 'react';
import ExchangeRateWidget from './ExchangeRateWidget';
import { PhoneIcon, MailIcon, ShieldCheckIcon, StarIcon, TicketIcon, CreditCardIcon, MapPinIcon, PlaneIcon } from './icons/Icons';
import { SearchParams } from '../types';

interface RightSidebarProps {
    onSearch: (params: SearchParams) => void;
}

const SupportWidget = () => {
    useEffect(() => {
        // Tải Zalo SDK
        if (!document.querySelector('script[src="https://sp.zalo.me/plugins/sdk.js"]')) {
            const script = document.createElement('script');
            script.src = "https://sp.zalo.me/plugins/sdk.js";
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 p-1.5 rounded-full">
                    <PhoneIcon className="w-4 h-4" />
                </span>
                Hỗ trợ nhanh
            </h3>
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <div className="mt-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Hotline 24/7</p>
                        <a href="tel:0961000240" className="text-xl font-bold text-red-600 hover:underline">0961 000 240</a>
                    </div>
                </div>
                
                {/* Zalo Chat Link */}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Chat Zalo</p>
                    <a 
                        href="https://zalo.me/2064667175707987748" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/40"
                    >
                         <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M42 24C42 14.0589 33.9411 6 24 6C14.0589 6 6 14.0589 6 24C6 33.9411 14.0589 42 24 42C33.9411 42 42 33.9411 42 24Z" fill="#0068FF"/>
                            <path d="M33 21H27V16.5C27 15.6716 26.3284 15 25.5 15C24.6716 15 24 15.6716 24 16.5V21H18C17.1716 21 16.5 21.6716 16.5 22.5C16.5 23.3284 17.1716 24 18 24H24V28.5C24 29.3284 24.6716 30 25.5 30C26.3284 30 27 29.3284 27 28.5V24H33C33.8284 24 34.5 23.3284 34.5 22.5C34.5 21.6716 33.8284 21 33 21Z" fill="white"/>
                            <path d="M26.25 15H18C16.3431 15 15 16.3431 15 18V28.5C15 30.1569 16.3431 31.5 18 31.5H23.5V34.5L28.5 30.5L29 30.5C30.6569 30.5 32 29.1569 32 27.5V18C32 16.3431 30.6569 15 29 15H26.25Z" fill="white"/>
                            <path d="M19.5 27.75H28.5" stroke="#0068FF" strokeWidth="2.5" strokeLinecap="round"/>
                            <path d="M19.5 22.5H28.5" stroke="#0068FF" strokeWidth="2.5" strokeLinecap="round"/>
                         </svg>
                         Chat với chúng tôi
                    </a>
                </div>

                 {/* Zalo Follow Widget */}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                     <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-2">Quan tâm Zalo OA</p>
                     <div 
                        className="zalo-follow-only-button" 
                        data-oaid="2064667175707987748"
                        style={{ display: 'flex', justifyContent: 'center' }}
                    ></div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Email hỗ trợ</p>
                    <a href="mailto:nha.uyen@vemaybaynhauyen.com" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-2">
                        <MailIcon className="w-4 h-4" /> nha.uyen@vemaybaynhauyen.com
                    </a>
                </div>
            </div>
        </div>
    );
};

const TrustBadgeWidget = () => (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 p-5">
        <h3 className="font-bold text-green-800 dark:text-green-400 mb-3 flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5" />
            Cam kết dịch vụ
        </h3>
        <ul className="space-y-3">
            <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <StarIcon className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span>Giá vé cạnh tranh nhất</span>
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <TicketIcon className="w-4 h-4 text-blue-500" />
                <span>Hỗ trợ hoàn/hủy vé nhanh</span>
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <CreditCardIcon className="w-4 h-4 text-purple-500" />
                <span>Thanh toán an toàn, linh hoạt</span>
            </li>
        </ul>
    </div>
);

interface TrendingDestinationsProps {
    onSearch: (params: SearchParams) => void;
}

const TrendingDestinations: React.FC<TrendingDestinationsProps> = ({ onSearch }) => {
    // Logic: Determine season based on month
    const currentMonth = new Date().getMonth() + 1;
    
    const destinations = useMemo(() => {
        // Fall / Winter (Oct - Feb): South for warmth, North for cold experience, Dalat for flowers
        if (currentMonth >= 10 || currentMonth <= 2) {
            return [
                { name: 'Phú Quốc', price: '799k', img: 'https://images.unsplash.com/photo-1589708668700-fb7360db937a?auto=format&fit=crop&w=300&q=80', code: 'PQC', desc: 'Tránh rét phương Nam' },
                { name: 'Đà Lạt', price: '490k', img: 'https://images.unsplash.com/photo-1621943260659-242334057635?auto=format&fit=crop&w=300&q=80', code: 'DLI', desc: 'Mùa hoa mai anh đào' },
                { name: 'Hà Nội', price: '990k', img: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=300&q=80', code: 'HAN', desc: 'Thủ đô ngàn năm' },
            ];
        }
        // Spring / Summer (Mar - Sep): Beach destinations
        return [
            { name: 'Đà Nẵng', price: '590k', img: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=300&q=80', code: 'DAD', desc: 'Thành phố đáng sống' },
            { name: 'Nha Trang', price: '650k', img: 'https://images.unsplash.com/photo-1532527290130-976ce4e76c0e?auto=format&fit=crop&w=300&q=80', code: 'CXR', desc: 'Thiên đường biển đảo' },
            { name: 'Quy Nhơn', price: '550k', img: 'https://images.unsplash.com/photo-1655887679376-7d6342646279?auto=format&fit=crop&w=300&q=80', code: 'UIH', desc: 'Maldives Việt Nam' },
        ];
    }, [currentMonth]);

    const handleDestinationClick = (destinationCode: string) => {
        // Auto select date: 14 days from now for hot deals
        const date = new Date();
        date.setDate(date.getDate() + 14);
        const dateStr = date.toISOString().split('T')[0];

        onSearch({
            departure_id: 'SGN', // Default to Saigon for hot deals from South
            arrival_id: destinationCode,
            outbound_date: dateStr,
            type: 'one_way',
            passengers: { adults: 1, children: 0, infants: 0 }
        });
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <span className="bg-red-100 text-red-600 p-1.5 rounded-full animate-pulse">
                    <MapPinIcon className="w-4 h-4" />
                </span>
                Điểm đến Hot tháng {currentMonth}
            </h3>
            <div className="space-y-4">
                {destinations.map((dest, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => handleDestinationClick(dest.code)}
                        className="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors -mx-2"
                    >
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative shadow-sm border border-gray-100 dark:border-gray-600">
                            <img 
                                src={dest.img} 
                                alt={dest.name} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                onError={(e) => {
                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=300&q=80';
                                }}
                            />
                        </div>
                        <div className="flex-grow">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-gray-800 dark:text-white text-sm group-hover:text-blue-600 transition-colors">{dest.name}</h4>
                                <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500">{dest.code}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 line-clamp-1 mb-1">{dest.desc}</p>
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">Chỉ từ</span>
                                <span className="text-sm font-bold text-red-600">{dest.price}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-center">
                <button 
                    onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 w-full py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                    <PlaneIcon className="w-3 h-3" /> Xem tất cả chặng bay
                </button>
            </div>
        </div>
    );
};

const RightSidebar: React.FC<RightSidebarProps> = ({ onSearch }) => {
    return (
        <aside className="space-y-6 sticky top-24">
            <SupportWidget />
            <TrendingDestinations onSearch={onSearch} />
            <ExchangeRateWidget />
            <TrustBadgeWidget />
        </aside>
    );
};

export default RightSidebar;
