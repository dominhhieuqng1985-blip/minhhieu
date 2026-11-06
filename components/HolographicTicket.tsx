
import React, { useRef, useState, useEffect } from 'react';
import { FlightOption } from '../types';
import { PlaneIcon, SparklesIcon, CloseIcon } from './icons/Icons';
import { getHolographicFortune } from '../services/geminiService';

interface HolographicTicketProps {
    flight: FlightOption;
    onClose: () => void;
}

const HolographicTicket: React.FC<HolographicTicketProps> = ({ flight, onClose }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [fortune, setFortune] = useState<string>("Đang xin quẻ du lịch...");
    const [loadingFortune, setLoadingFortune] = useState(true);

    const firstFlight = flight.flights[0];
    const lastFlight = flight.flights[flight.flights.length - 1];

    useEffect(() => {
        const fetchFortune = async () => {
            try {
                const text = await getHolographicFortune(firstFlight.departure_airport.id, lastFlight.arrival_airport.id);
                setFortune(text);
            } catch (e) {
                setFortune("Hành trình vạn dặm bắt đầu từ một bước chân.");
            } finally {
                setLoadingFortune(false);
            }
        };
        fetchFortune();
    }, [flight]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -15; // Max rotation 15deg
        const rotateY = ((x - centerX) / centerX) * 15;

        setRotation({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setRotation({ x: 0, y: 0 });
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 perspective-1000 animate-fade-in" onClick={onClose}>
            <div 
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => e.stopPropagation()}
                style={{
                    transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                    transition: 'transform 0.1s ease-out',
                }}
                className="relative w-full max-w-md bg-gradient-to-br from-gray-900 to-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700 select-none cursor-default group"
            >
                {/* Holographic Shine Overlay */}
                <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none z-10"
                    style={{
                        background: `linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.3) ${50 + rotation.y * 1.5}%, transparent 100%)`
                    }}
                />
                
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-3 right-3 z-50 text-white/50 hover:text-white p-1 bg-black/20 rounded-full">
                    <CloseIcon className="w-6 h-6" />
                </button>

                {/* Ticket Content */}
                <div className="p-6 relative z-0">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-yellow-400 animate-pulse" />
                            <span className="text-yellow-400 font-bold tracking-widest text-sm uppercase">VÉ HẠNG SIÊU CẤP</span>
                        </div>
                        <img src={firstFlight.airline_logo} className="h-8 bg-white rounded p-0.5" alt="logo" />
                    </div>

                    {/* Main Flight Info */}
                    <div className="flex justify-between items-center mb-8">
                        <div className="text-center">
                            <div className="text-4xl font-black text-white tracking-wider">{firstFlight.departure_airport.id}</div>
                            <div className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Khởi hành</div>
                        </div>
                        
                        <div className="flex-1 px-4 flex flex-col items-center">
                            <div className="w-full h-0.5 bg-gray-600 relative">
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 px-2">
                                    <PlaneIcon className="w-6 h-6 text-blue-500 transform rotate-90" />
                                </div>
                            </div>
                            <div className="text-xs text-blue-400 font-mono mt-2">{flight.flights[0].flight_number}</div>
                        </div>

                        <div className="text-center">
                            <div className="text-4xl font-black text-white tracking-wider">{lastFlight.arrival_airport.id}</div>
                            <div className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Điểm đến</div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4 text-sm mb-6 bg-white/5 p-4 rounded-xl border border-white/10">
                        <div>
                            <div className="text-gray-500 text-xs uppercase">Ngày bay</div>
                            <div className="text-white font-bold">{new Date(firstFlight.departure_airport.time).toLocaleDateString('vi-VN')}</div>
                        </div>
                        <div>
                            <div className="text-gray-500 text-xs uppercase">Giờ bay</div>
                            <div className="text-white font-bold">{new Date(firstFlight.departure_airport.time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</div>
                        </div>
                        <div>
                            <div className="text-gray-500 text-xs uppercase">Hãng bay</div>
                            <div className="text-white font-bold truncate">{firstFlight.airline}</div>
                        </div>
                        <div>
                            <div className="text-gray-500 text-xs uppercase">Hạng vé</div>
                            <div className="text-yellow-400 font-bold">{firstFlight.class || 'Phổ thông'}</div>
                        </div>
                    </div>

                    {/* AI Fortune Footer */}
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-4 border border-purple-500/30 text-center">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
                        <p className="text-xs text-purple-300 font-bold uppercase mb-1 flex items-center justify-center gap-1">
                            <SparklesIcon className="w-3 h-3" /> Thông điệp từ vũ trụ
                        </p>
                        <p className="text-white italic text-sm leading-relaxed">
                            "{loadingFortune ? 'Đang kết nối với các vì sao...' : fortune}"
                        </p>
                    </div>

                    {/* Barcode Deco */}
                    <div className="mt-6 opacity-40">
                        <div className="h-8 w-full" style={{
                            backgroundImage: 'repeating-linear-gradient(90deg, white 0px, white 2px, transparent 2px, transparent 4px, white 4px, white 5px, transparent 5px, transparent 7px)'
                        }}></div>
                        <div className="text-center text-[10px] text-gray-500 mt-1 font-mono tracking-[0.5em]">{flight.booking_token?.substring(0, 16) || '837291004827'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HolographicTicket;
