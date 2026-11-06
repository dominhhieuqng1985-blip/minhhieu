
import React, { useEffect, useState } from 'react';
import { PlaneIcon } from './icons/Icons';

interface IntroAnimationProps {
    onComplete: () => void;
}

const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
    const [phase, setPhase] = useState(0); // 0: Flying/Clouds, 1: Approach/Runway, 2: Landed/Door, 3: Exit
    const [loadingProgress, setLoadingProgress] = useState(0);

    useEffect(() => {
        // Phase 0: Loading bar logic (kéo dài 3.5s)
        const duration = 3500; 
        const interval = 30;
        const steps = duration / interval;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const progress = Math.min(100, Math.round((currentStep / steps) * 100));
            setLoadingProgress(progress);

            if (currentStep >= steps) {
                clearInterval(timer);
                setPhase(1); // Chuyển sang hạ cánh
            }
        }, interval);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (phase === 1) {
            // Phase 1: Landing (3s)
            const t = setTimeout(() => setPhase(2), 3000);
            return () => clearTimeout(t);
        }
        if (phase === 2) {
            // Phase 2: Door open & Welcome
            // Tự động vào sau 5s nếu không nhấn nút
            const t = setTimeout(() => setPhase(3), 5000);
            return () => clearTimeout(t);
        }
        if (phase === 3) {
            // Phase 3: Fade out and complete
            const t = setTimeout(onComplete, 1000);
            return () => clearTimeout(t);
        }
    }, [phase, onComplete]);

    const handleEnter = () => {
        setPhase(3);
    };

    return (
        <div className={`fixed inset-0 z-[9999] bg-[#0f172a] overflow-hidden font-sans transition-opacity duration-1000 ${phase === 3 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            
            {/* 3D Viewport */}
            <div className="absolute inset-0 perspective-2000 overflow-hidden">
                
                {/* --- SKY & CLOUDS LAYERS --- */}
                <div className={`absolute inset-0 bg-gradient-to-b from-[#020617] via-[#1e3a8a] to-[#60a5fa] transition-transform duration-[3000ms] ease-in-out ${phase >= 1 ? 'translate-y-[-30%]' : 'translate-y-0'}`}></div>
                
                {/* Moving Stars/Clouds (Phase 0) */}
                <div className={`absolute inset-0 ${phase === 0 ? 'opacity-100' : 'opacity-0 transition-opacity duration-1000'}`}>
                    {[...Array(40)].map((_, i) => (
                        <div 
                            key={i}
                            className="absolute bg-white/20 rounded-full blur-md animate-warp-speed"
                            style={{
                                width: Math.random() * 100 + 50 + 'px',
                                height: Math.random() * 2 + 1 + 'px',
                                top: Math.random() * 100 + '%',
                                left: Math.random() * 100 + '%',
                                animationDuration: Math.random() * 0.5 + 0.2 + 's',
                                animationDelay: Math.random() * 2 + 's'
                            }}
                        ></div>
                    ))}
                </div>

                {/* --- RUNWAY (Visible in Phase 1+) --- */}
                <div 
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] md:w-[1000px] h-[3000px] bg-[#1a1a1a] origin-bottom transform-style-3d transition-all duration-[3000ms] ease-out 
                    ${phase === 0 ? 'rotate-x-90 translate-y-[2000px] opacity-0' : 'rotate-x-[75deg] translate-y-[400px] opacity-100'}`}
                >
                    {/* Runway Lights */}
                    <div className="absolute left-[10%] top-0 bottom-0 w-2 bg-yellow-400/60 shadow-[0_0_20px_yellow] animate-pulse"></div>
                    <div className="absolute right-[10%] top-0 bottom-0 w-2 bg-yellow-400/60 shadow-[0_0_20px_yellow] animate-pulse"></div>
                    {/* Center Stripes */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-6 border-l-8 border-dashed border-white/70"></div>
                    {/* Touchdown Zone */}
                    <div className="absolute bottom-[20%] left-[20%] right-[20%] h-[50px] bg-white/20"></div>
                </div>

                {/* --- THE PLANE --- */}
                <div 
                    className={`absolute top-1/2 left-1/2 transition-all duration-[2500ms] ease-in-out transform-style-3d
                    ${phase === 0 ? 'scale-50 translate-y-[-100px] -translate-x-1/2 rotate-z-2' : ''}
                    ${phase === 1 ? 'scale-90 translate-y-[50px] -translate-x-1/2 rotate-x-5' : ''}
                    ${phase >= 2 ? 'scale-[1.8] translate-y-[150px] -translate-x-1/2 rotate-x-0' : ''}
                    `}
                >
                    {/* Shadow */}
                    <div className={`absolute top-[280px] left-1/2 -translate-x-1/2 w-[300px] h-[60px] bg-black/60 blur-xl rounded-[50%] transition-all duration-3000 ${phase === 0 ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`}></div>

                    {/* FUSELAGE STRUCTURE */}
                    <div className="relative w-[700px] h-[200px]">
                        {/* Main Body Shape */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-100 to-gray-300 rounded-[80px_250px_250px_90px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-b-4 border-gray-400 overflow-hidden z-20">
                            
                            {/* Glossy Reflection */}
                            <div className="absolute top-2 left-10 right-20 h-12 bg-gradient-to-b from-white/90 to-transparent rounded-full blur-[2px]"></div>

                            {/* Branding Strip */}
                            <div className="absolute top-[45%] w-full h-4 bg-[#0056b3]"></div>
                            <div className="absolute top-[49%] w-full h-16 bg-[#DA251D] flex items-center justify-end pr-40 shadow-sm">
                                <span className="text-white font-black italic text-2xl tracking-tighter drop-shadow-md">NHÃ UYÊN AIR</span>
                            </div>

                            {/* Windows */}
                            <div className="absolute top-[32%] left-[160px] flex gap-8">
                                {[...Array(7)].map((_, i) => (
                                    <div key={i} className="w-8 h-12 bg-gradient-to-b from-[#1e293b] to-black rounded-lg border border-gray-400 shadow-[inset_0_0_8px_black]"></div>
                                ))}
                            </div>
                        </div>

                        {/* Wings (CSS Perspective Trick) */}
                        <div className="absolute top-[110px] left-[280px] w-[350px] h-[80px] bg-gradient-to-r from-gray-300 to-gray-400 transform skew-x-[-45deg] rounded-lg border-t border-white z-30 shadow-[0_10px_20px_rgba(0,0,0,0.3)] origin-top"></div>
                        <div className="absolute top-[-40px] left-[280px] w-[280px] h-[60px] bg-gray-400 transform skew-x-[45deg] rounded-lg z-10 brightness-75"></div>

                        {/* Vertical Stabilizer (Tail) */}
                        <div className="absolute top-[-70px] right-[40px] w-[120px] h-[100px] bg-[#DA251D] transform skew-x-[20deg] rounded-tr-[40px] z-10 border-2 border-white overflow-hidden shadow-lg">
                             <div className="absolute bottom-2 right-2 text-white/20 font-bold text-xs">VNA-888</div>
                             <div className="absolute top-4 left-2 w-10 h-10 bg-yellow-400 rounded-full opacity-80"></div>
                        </div>

                        {/* Engine */}
                        <div className="absolute top-[130px] left-[340px] w-[130px] h-[60px] bg-gray-800 rounded-[30px] border-l-8 border-gray-400 z-40 shadow-2xl overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-gray-600 to-black rounded-[30px] opacity-90"></div>
                            {/* Spinning Fan Effect */}
                            <div className="absolute left-1 top-1 bottom-1 w-3 bg-gray-900 rounded-full animate-pulse"></div>
                        </div>

                        {/* --- DOOR & STAIRS (Phase 2) --- */}
                        <div className="absolute top-[40px] left-[180px] w-[80px] h-[140px] z-50 perspective-500">
                            {/* Dark Void inside */}
                            <div className={`absolute inset-0 bg-[#1a0f0f] rounded-xl shadow-[inset_0_0_20px_black] border-2 border-gray-500 flex items-center justify-center transition-opacity duration-300 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                                <div className="text-center animate-pulse">
                                    <p className="text-[8px] text-yellow-400 font-bold uppercase tracking-widest">Welcome</p>
                                </div>
                            </div>

                            {/* The Door Leaf (Rotates Open) */}
                            <div 
                                className={`absolute inset-0 bg-white rounded-xl border-2 border-gray-300 shadow-lg transform-origin-left transition-transform duration-[2000ms] ease-in-out ${phase >= 2 ? 'rotate-y-[-120deg]' : 'rotate-y-0'}`}
                            >
                                <div className="absolute top-[45%] w-full h-4 bg-[#0056b3]"></div>
                                <div className="absolute top-[49%] w-full h-16 bg-[#DA251D]"></div>
                                <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-8 h-10 bg-[#1e293b] rounded-lg border border-gray-400"></div>
                                {/* Handle */}
                                <div className="absolute top-[50%] right-2 w-2 h-10 bg-gray-400 rounded-full shadow-sm"></div>
                            </div>

                            {/* Red Carpet Stairs (Slides Down Phase 2) */}
                            <div className={`absolute top-[135px] left-[-25px] w-[130px] h-[180px] transition-all duration-[1500ms] ease-out origin-top ${phase >= 2 ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`}>
                                <div className="w-full h-full bg-gradient-to-b from-red-600 to-red-900 transform skew-x-[30deg] shadow-2xl border-x-4 border-yellow-400 flex flex-col justify-end items-center pb-2">
                                     <span className="text-yellow-200 text-[10px] font-bold uppercase transform -skew-x-[30deg] animate-bounce">Mời vào</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- LOADER UI (Phase 0) - CENTERED & FADE OUT --- */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 z-[60] ${phase > 0 ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
                    <div className="text-white font-black text-3xl sm:text-5xl mb-8 tracking-[0.2em] drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] text-center">
                        <span className="text-[#0056b3] bg-white/10 px-2 rounded backdrop-blur-sm">NHÃ UYÊN</span> <span className="text-[#DA251D] bg-white/10 px-2 rounded backdrop-blur-sm">AIR</span>
                    </div>
                    
                    <div className="w-64 sm:w-96 h-2 bg-gray-800/50 backdrop-blur rounded-full overflow-hidden border border-gray-600/50 shadow-inner relative">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-600 via-white to-blue-600 transition-all duration-100 ease-out shadow-[0_0_15px_white]" 
                            style={{ width: `${loadingProgress}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between w-64 sm:w-96 mt-3 px-1">
                        <div className="text-blue-200 text-xs font-mono tracking-wide">System initializing...</div>
                        <div className="text-white text-xs font-bold font-mono">{loadingProgress}%</div>
                    </div>
                </div>

                {/* --- WELCOME MESSAGE (Phase 2) --- */}
                <div className={`absolute top-[15%] left-0 right-0 text-center transition-all duration-1000 z-[100] ${phase === 2 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-20 scale-90'}`}>
                    <h1 className="text-5xl md:text-7xl font-black text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] tracking-tight">
                        XIN CHÀO
                    </h1>
                    <p className="text-lg md:text-2xl text-yellow-400 mt-4 font-light tracking-widest uppercase drop-shadow-md">
                        Chuyến đi của bạn bắt đầu tại đây
                    </p>
                    
                    <button 
                        onClick={handleEnter}
                        className="mt-12 group relative px-10 py-4 bg-white/95 hover:bg-white backdrop-blur-md rounded-full shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.6)] animate-bounce-slow border-2 border-transparent hover:border-blue-200"
                    >
                        <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
                            <span className="text-gray-500 uppercase text-sm font-semibold mr-1 tracking-widest">Mời vào</span>
                            <span className="text-[#0056b3]">Nhã Uyên</span>
                            <span className="text-[#DA251D]">Air</span>
                            <PlaneIcon className="w-5 h-5 text-[#0056b3] transform -rotate-45 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>
                </div>

            </div>

            <style>{`
                .perspective-2000 { perspective: 2000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .transform-origin-left { transform-origin: left; }
                .perspective-500 { perspective: 500px; }
                
                @keyframes warp-speed {
                    0% { transform: translateX(1000px) scaleX(0.1); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateX(-1000px) scaleX(1); opacity: 0; }
                }
                .animate-warp-speed { animation: warp-speed linear infinite; }
                
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(-5%); }
                    50% { transform: translateY(5%); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default IntroAnimation;
