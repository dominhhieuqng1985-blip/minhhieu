
import React, { useState, useEffect } from 'react';
import { CloseIcon, MapPinIcon, CloudSunIcon } from './icons/Icons';
import { AIRPORTS } from '../constants';

interface VirtualWindowProps {
    destinationCode: string;
    onClose: () => void;
}

const getDestinationImage = (code: string) => {
    const map: Record<string, string> = {
        'SGN': 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80', // Saigon Night
        'HAN': 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80', // Hanoi
        'DAD': 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80', // Danang Golden Bridge
        'PQC': 'https://images.unsplash.com/photo-1589708668700-fb7360db937a?auto=format&fit=crop&w=800&q=80', // Phu Quoc
        'DLI': 'https://images.unsplash.com/photo-1621943260659-242334057635?auto=format&fit=crop&w=800&q=80', // Dalat
        'CXR': 'https://images.unsplash.com/photo-1532527290130-976ce4e76c0e?auto=format&fit=crop&w=800&q=80', // Nha Trang
        'HUI': 'https://images.unsplash.com/photo-1603789445244-da473449db33?auto=format&fit=crop&w=800&q=80', // Hue
        'UIH': 'https://images.unsplash.com/photo-1655887679376-7d6342646279?auto=format&fit=crop&w=800&q=80', // Quy Nhon
    };
    return map[code] || 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80'; // Default clouds
};

const getCityName = (id: string): string => {
  const airport = AIRPORTS.find(a => a.id === id);
  if (!airport) return id;
  const match = airport.name.match(/(.*?)\s*\(/);
  return match ? match[1] : airport.name;
};

const VirtualWindow: React.FC<VirtualWindowProps> = ({ destinationCode, onClose }) => {
    const [image, setImage] = useState('');
    const cityName = getCityName(destinationCode);

    useEffect(() => {
        setImage(getDestinationImage(destinationCode));
    }, [destinationCode]);

    return (
        <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2 bg-white/10 rounded-full">
                <CloseIcon className="w-8 h-8" />
            </button>

            <div className="relative w-full max-w-lg aspect-[3/4] sm:aspect-square flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                {/* Airplane Wall Texture */}
                <div className="absolute inset-0 bg-gray-100 rounded-[3rem] shadow-[inset_0_0_50px_rgba(0,0,0,0.2)] border-8 border-gray-200">
                    {/* Window Frame Outer */}
                    <div className="absolute inset-8 bg-[#e0e0e0] rounded-[45%] shadow-[inset_10px_10px_20px_rgba(0,0,0,0.1),_5px_5px_15px_rgba(255,255,255,0.8)] border border-gray-300">
                        {/* Window Frame Inner */}
                        <div className="absolute inset-4 bg-black rounded-[42%] overflow-hidden border-4 border-gray-400/50 shadow-inner group">
                            {/* The View */}
                            <img 
                                src={image} 
                                alt="View" 
                                className="w-full h-full object-cover scale-125 transition-transform duration-[20s] ease-linear group-hover:scale-110"
                            />
                            
                            {/* Cloud Animation Layer 1 */}
                            <div className="absolute inset-0 pointer-events-none opacity-40 animate-cloud-move-slow" 
                                 style={{ backgroundImage: 'url("https://png.pngtree.com/png-clipart/20220909/ourmid/pngtree-white-clouds-png-image_6146970.png")', backgroundSize: 'cover' }}>
                            </div>
                            
                            {/* Reflection/Glare */}
                            <div className="absolute top-10 right-10 w-20 h-32 bg-white/10 rounded-full blur-xl transform rotate-45 pointer-events-none"></div>
                            
                            {/* Scratches/Dirt texture (subtle) */}
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/scratched.png')] opacity-10 pointer-events-none"></div>

                            {/* Info Overlay (appears on hover) */}
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col items-center text-center">
                                <div className="text-yellow-400 font-bold text-xs uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <MapPinIcon className="w-3 h-3" /> Đang hạ cánh xuống
                                </div>
                                <div className="text-white font-black text-2xl font-serif">{cityName}</div>
                                <div className="text-white/70 text-xs mt-1">Nhiệt độ dự kiến: 28°C</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Window Shade Handle (Visual only) */}
                    <div className="absolute top-[45%] -right-1 w-2 h-16 bg-gray-300 rounded-l-lg shadow-sm border-l border-gray-400"></div>
                </div>
            </div>
            
            <div className="absolute bottom-10 text-white/40 text-sm font-mono animate-pulse">
                Click ra ngoài để đóng cửa sổ
            </div>
            
            <style>{`
                @keyframes cloud-move {
                    0% { transform: translateX(10%); }
                    100% { transform: translateX(-10%); }
                }
                .animate-cloud-move-slow {
                    animation: cloud-move 30s infinite alternate linear;
                }
            `}</style>
        </div>
    );
};

export default VirtualWindow;
