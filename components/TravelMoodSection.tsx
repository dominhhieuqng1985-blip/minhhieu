
import React from 'react';
import { SparklesIcon, CloudSunIcon, SimpleUtensilsIcon, LeafIcon } from './icons/Icons';
import { SearchParams } from '../types';

interface TravelMoodSectionProps {
    onSearch: (params: SearchParams) => void;
}

const moods = [
    {
        id: 1,
        title: "Chữa Lành & Thư Giãn",
        subtitle: "Đà Lạt, Sapa, Huế",
        bgClass: "from-green-400 to-teal-500",
        icon: <LeafIcon className="w-6 h-6 text-white" />,
        img: "https://images.unsplash.com/photo-1621943260659-242334057635?auto=format&fit=crop&w=600&q=80", // Dalat
        destinationCode: "DLI"
    },
    {
        id: 2,
        title: "Vitamin Sea",
        subtitle: "Phú Quốc, Nha Trang",
        bgClass: "from-blue-400 to-cyan-500",
        icon: <CloudSunIcon className="w-6 h-6 text-white" />,
        img: "https://images.unsplash.com/photo-1540202404-a671baf945a0?auto=format&fit=crop&w=600&q=80", // Phu Quoc
        destinationCode: "PQC"
    },
    {
        id: 3,
        title: "Food Tour Phố Thị",
        subtitle: "Sài Gòn, Hà Nội",
        bgClass: "from-orange-400 to-red-500",
        icon: <SimpleUtensilsIcon className="w-6 h-6 text-white" />,
        img: "https://images.unsplash.com/photo-1555921015-5532091f6026?auto=format&fit=crop&w=600&q=80", // Hanoi/Street Food
        destinationCode: "HAN"
    }
];

const TravelMoodSection: React.FC<TravelMoodSectionProps> = ({ onSearch }) => {
    
    const handleMoodClick = (destinationCode: string) => {
        // Auto select date: 30 days from now
        const date = new Date();
        date.setDate(date.getDate() + 30);
        const dateStr = date.toISOString().split('T')[0];

        const params: SearchParams = {
            departure_id: 'SGN', // Default origin (can be smarter in future)
            arrival_id: destinationCode,
            outbound_date: dateStr,
            type: 'one_way',
            passengers: { adults: 1, children: 0, infants: 0 }
        };
        onSearch(params);
        
        // Scroll to top to show results
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2 border-l-4 border-purple-500 pl-3">
                    <SparklesIcon className="w-6 h-6 text-purple-500" />
                    Khám phá theo cảm xúc
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {moods.map((mood) => (
                    <div 
                        key={mood.id}
                        onClick={() => handleMoodClick(mood.destinationCode)}
                        className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                    >
                        {/* Background Image */}
                        <div className="absolute inset-0 bg-gray-200">
                            <img 
                                src={mood.img} 
                                alt={mood.title} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                onError={(e) => {
                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80';
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                        </div>

                        {/* Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-5">
                            <div className={`absolute top-4 right-4 p-2 rounded-full bg-gradient-to-br ${mood.bgClass} shadow-lg group-hover:rotate-12 transition-transform duration-300`}>
                                {mood.icon}
                            </div>
                            
                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-yellow-300 transition-colors">
                                {mood.title}
                            </h3>
                            <p className="text-sm text-gray-200 opacity-90 group-hover:opacity-100 flex items-center gap-1">
                                {mood.subtitle} 
                                <span className="transform translate-x-0 group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100 font-bold text-yellow-400">→ Tìm vé ngay</span>
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TravelMoodSection;
