
import React, { useState } from 'react';
import { PhoneIcon, CloseIcon } from './icons/Icons';

const FloatingContact: React.FC = () => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-8 left-8 z-[9999] flex flex-col items-start gap-4 font-sans">
             
             {/* Close Button - Allows user to hide the widget if it blocks content */}
             <button 
                onClick={() => setIsVisible(false)}
                className="absolute -top-8 left-1 bg-gray-600/50 hover:bg-gray-700/80 text-white rounded-full p-1.5 backdrop-blur-sm transition-colors shadow-sm"
                title="Tắt hiển thị"
             >
                <CloseIcon className="w-3 h-3" />
             </button>

             {/* Zalo Button - Circular */}
             <a 
                href="https://zalo.me/2064667175707987748"
                target="_blank"
                rel="noreferrer"
                className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform duration-300 hover:scale-110 hover:rotate-12 border-2 border-white/20 ml-1"
                title="Chat Zalo"
             >
                 <span className="font-black italic text-sm">Zalo</span>
             </a>

             {/* Hotline Button - Expandable Circle */}
             <a 
                href="tel:0961000240"
                className="group relative flex items-center bg-red-600 hover:bg-red-700 text-white rounded-full p-3.5 shadow-xl transition-all duration-500 ease-in-out w-14 hover:w-[170px] overflow-hidden border-2 border-white/20"
             >
                {/* Ping Animation (Only visible when closed/not hovered to avoid distraction) */}
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75 group-hover:opacity-0 transition-opacity"></span>
                
                {/* Icon Container */}
                <div className="relative z-10 flex-shrink-0 flex items-center justify-center w-6 h-6">
                    <PhoneIcon className="w-6 h-6 animate-bounce-short" />
                </div>

                {/* Text Content - Reveals on Hover */}
                <div className="flex flex-col leading-none ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 whitespace-nowrap">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-red-100">Hotline 24/7</span>
                    <span className="text-base font-black tracking-widest">0961 000 240</span>
                </div>
            </a>
             
             <style>{`
                @keyframes bounce-short {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }
                .animate-bounce-short {
                    animation: bounce-short 2s infinite;
                }
             `}</style>
        </div>
    );
};

export default FloatingContact;
