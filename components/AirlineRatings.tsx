
import React from 'react';
import { CheckIcon } from './icons/Icons';

const AIRLINE_DATA = [
    {
        name: 'Vietnam Airlines',
        logo: 'https://plugin.datacom.vn/Resources/Images/Airline/VN.gif',
        rating: 8.4,
        reviews: 38,
        isTop: true
    },
    {
        name: 'Pacific Airlines',
        logo: 'https://content.r9cdn.net/rimg/provider-logos/airlines/v/BL.png',
        rating: 8.8,
        reviews: 4,
        isTop: false
    },
    {
        name: 'Vietjet Air',
        logo: 'https://plugin.datacom.vn/Resources/Images/Airline/VJ.gif',
        rating: 8.3,
        reviews: 39,
        isTop: false
    },
    {
        name: 'Bamboo Airways',
        logo: 'https://plugin.datacom.vn/Resources/Images/Airline/QH.gif',
        rating: 8.6,
        reviews: 16,
        isTop: false
    },
    {
        name: 'Vietravel Airlines',
        logo: 'https://plugin.datacom.vn/Resources/Images/Airline/VU.gif',
        rating: 8.9,
        reviews: 4,
        isTop: false
    }
];

const RatingBar: React.FC<{ label: string, score: number }> = ({ label, score }) => (
    <div className="flex items-center justify-between text-sm mb-2 last:mb-0">
        <span className="text-gray-600 dark:text-gray-300 font-medium w-32">{label}</span>
        <div className="flex-grow mx-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
                className="h-full bg-[#e16018] rounded-full" 
                style={{ width: `${score * 10}%` }}
            ></div>
        </div>
        <span className="font-bold text-gray-800 dark:text-white w-6 text-right">{score}</span>
    </div>
);

const AirlineRatings: React.FC = () => {
    return (
        <div className="mt-12 bg-gray-100 dark:bg-gray-900 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <span className="bg-[#e16018] w-1.5 h-6 rounded-full block"></span>
                Đánh giá các hãng hàng không
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left List */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-2 space-y-2">
                    {AIRLINE_DATA.map((airline, index) => (
                        <div 
                            key={index}
                            className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer group border-b border-gray-100 dark:border-gray-700 last:border-0"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 flex items-center justify-center bg-white rounded-full border border-gray-100 p-1">
                                    <img src={airline.logo} alt={airline.name} className="w-full h-full object-contain" />
                                </div>
                                <span className="font-semibold text-gray-700 dark:text-gray-200 group-hover:text-[#0056b3] transition-colors">
                                    {airline.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[#0056b3] font-bold text-lg">{airline.rating}</span>
                                <span className="text-gray-400 text-xs">({airline.reviews} đánh giá)</span>
                                {airline.isTop && <CheckIcon className="w-4 h-4 text-[#e16018]" />}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Stats */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                        Điểm đánh giá trung bình
                    </h3>
                    <div className="space-y-4 max-w-md">
                        <RatingBar label="Đúng giờ" score={8.3} />
                        <RatingBar label="Dịch vụ" score={8.7} />
                        <RatingBar label="Tiếp viên hàng không" score={8.3} />
                    </div>
                    <div className="mt-6 text-xs text-gray-400 italic">
                        * Dựa trên đánh giá xác thực từ khách hàng đã bay trong 12 tháng qua.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AirlineRatings;
