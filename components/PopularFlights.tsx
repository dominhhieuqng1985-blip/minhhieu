
import React from 'react';
import { type SearchParams } from '../types';
import { ArrowLeftIcon, PlaneIcon } from './icons/Icons';

interface PopularFlightsProps {
  onSearch: (params: SearchParams) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN').format(amount);
};

// Updated Mock data with reliable Unsplash Images
const PROMO_FLIGHTS = [
    {
        id: 1,
        from: 'SGN',
        to: 'HAN',
        fromName: 'Tp. Hồ Chí Minh',
        toName: 'Hà Nội',
        // Hanoi: Temple of Literature / Street vibe
        image: 'https://images.unsplash.com/photo-1599708153386-52e2a84a4f89?auto=format&fit=crop&w=800&q=80', 
        date: '2026-02-23',
        price: 962000,
        seen: '2 ngày trước'
    },
    {
        id: 2,
        from: 'SGN',
        to: 'UIH',
        fromName: 'Tp. Hồ Chí Minh',
        toName: 'Quy Nhơn',
        // Quy Nhon: Coastal/Beach
        image: 'https://images.unsplash.com/photo-1596627991545-39c735d5d547?auto=format&fit=crop&w=800&q=80', 
        date: '2025-12-09',
        price: 672000,
        seen: '23 giờ trước'
    },
    {
        id: 3,
        from: 'HAN',
        to: 'SGN',
        fromName: 'Hà Nội',
        toName: 'Tp. Hồ Chí Minh',
        // Saigon: Landmark 81 / Skyline
        image: 'https://images.unsplash.com/photo-1567092869889-5c36f5042070?auto=format&fit=crop&w=800&q=80',
        date: '2026-02-14',
        price: 962000,
        seen: '2 ngày trước'
    },
    {
        id: 4,
        from: 'SGN',
        to: 'THD',
        fromName: 'Tp. Hồ Chí Minh',
        toName: 'Thanh Hóa',
        // Thanh Hoa: Pu Luong / Nature / Rice Fields
        image: 'https://images.unsplash.com/photo-1523590765294-6c39858f9d35?auto=format&fit=crop&w=800&q=80',
        date: '2026-02-25',
        price: 692000,
        seen: '4 giờ trước'
    }
];

const PopularFlights: React.FC<PopularFlightsProps> = ({ onSearch }) => {

    const handleRouteSelect = (from: string, to: string, date: string) => {
        const params: SearchParams = {
            departure_id: from,
            arrival_id: to,
            outbound_date: date,
            type: 'one_way',
            passengers: { adults: 1, children: 0, infants: 0 },
        };
        onSearch(params);
    };

    return (
        <div className="mt-12">
            <div className="flex items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <PlaneIcon className="w-6 h-6 text-red-600" />
                    Vé ưu đãi từ các hãng hàng không
                </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {PROMO_FLIGHTS.map((flight) => (
                    <div
                        key={flight.id}
                        onClick={() => handleRouteSelect(flight.from, flight.to, flight.date)}
                        className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-gray-100 dark:border-gray-700 flex flex-col h-full"
                    >
                        {/* Image Section */}
                        <div className="relative h-40 overflow-hidden bg-gray-200">
                            <img 
                                src={flight.image} 
                                alt={`${flight.toName}`} 
                                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                                onError={(e) => {
                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80'; // Fallback plane wing
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>

                        {/* Content Section */}
                        <div className="p-4 flex flex-col flex-grow">
                            <div className="mb-3">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Đã xem: {flight.seen}</div>
                                <h3 className="font-bold text-gray-800 dark:text-white text-md leading-snug min-h-[48px]">
                                    {flight.fromName} ({flight.from}) đến {flight.toName} ({flight.to})
                                </h3>
                            </div>
                            
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                Ngày đi: {new Date(flight.date).toLocaleDateString('vi-VN')}
                            </div>

                            <div className="mt-auto flex items-center justify-between pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                                <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">chỉ từ (VND)</div>
                                    <div className="text-xl font-bold text-[#0056b3] dark:text-blue-400">
                                        {formatCurrency(flight.price)}<span className="text-red-500">*</span>
                                    </div>
                                    <div className="text-xs text-gray-400">Một chiều</div>
                                </div>
                                <button className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
                                    <ArrowLeftIcon className="w-5 h-5 transform rotate-180" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PopularFlights;
