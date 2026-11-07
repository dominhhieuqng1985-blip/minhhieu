import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Flame,
  Sun,
  Moon,
  Sunset,
  Volume2,
  Heart,
  ShoppingBag,
  RotateCw,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { BuddhaStatue, TempleMemberRecord } from '../../data/buddhistTempleData';
import { speakViaStudioVoiceApi, stopSpeaking } from '../../utils/buddhistAudio';
import { MINH_HIEU_LE_CHUA_VOICE_ID } from '../../utils/everai';

interface RealisticBuddhaStatue3DModalProps {
  statue: BuddhaStatue | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenOfferings: (targetName: string) => void;
  onShowToast: (msg: string) => void;
  currentMember?: TempleMemberRecord | null;
}

export const RealisticBuddhaStatue3DModal: React.FC<RealisticBuddhaStatue3DModalProps> = ({
  statue,
  isOpen,
  onClose,
  onOpenOfferings,
  onShowToast,
  currentMember,
}) => {
  const [lightingMode, setLightingMode] = useState<'dawn' | 'noon' | 'dusk' | 'night'>('dusk');
  const [isIncenseBurning, setIsIncenseBurning] = useState(true);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isBowing, setIsBowing] = useState(false);
  const [bowCount, setBowCount] = useState(0);
  const [mantraPlaying, setMantraPlaying] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setBowCount(0);
      setIsBowing(false);
      setMantraPlaying(false);
    }
  }, [isOpen, statue]);

  if (!isOpen || !statue) return null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: (y / rect.height) * -14,
      y: (x / rect.width) * 14,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Play bell sound & bow
  const handleBow = () => {
    setIsBowing(true);
    const nextBows = bowCount + 1;
    setBowCount(nextBows);

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(432, audioCtx.currentTime); // 432 Hz Sacred tuning
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 2.5);
    } catch {}

    const memberGreeting = currentMember
      ? `Phật tử ${currentMember.fullName}${currentMember.dharmaName ? ` (Pháp danh ${currentMember.dharmaName})` : ''}`
      : 'Đạo hữu';

    onShowToast(`🙏 ${memberGreeting} vừa thành kính đảnh lễ ${statue.name} (${nextBows}/3 lạy)!`);
    setTimeout(() => {
      setIsBowing(false);
    }, 1000);
  };

  const handleReciteMantra = async () => {
    if (mantraPlaying) {
      stopSpeaking();
      setMantraPlaying(false);
      return;
    }
    setMantraPlaying(true);
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(261.63, audioCtx.currentTime); // C4 note
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3.0);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 3.0);
    } catch {}

    const memberIntro = currentMember
      ? `Nam Mô A Di Đà Phật. Phật tử ${currentMember.fullName}${currentMember.dharmaName ? `, pháp danh ${currentMember.dharmaName}` : ''} thành tâm quy y trước kim thân ${statue.name}. Chân ngôn trì tụng: ${statue.mantra}.`
      : `Nam Mô A Di Đà Phật. Thành tâm cung kính trước kim thân ${statue.name}. Chân ngôn trì tụng: ${statue.mantra}.`;

    const spoken = await speakViaStudioVoiceApi(memberIntro, {
      voiceId: MINH_HIEU_LE_CHUA_VOICE_ID,
      speedRate: 0.9,
      onEnd: () => setMantraPlaying(false),
      onError: () => {
        // Fallback to Web Speech synthesis
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(memberIntro);
          utter.lang = 'vi-VN';
          utter.rate = 0.88;
          utter.pitch = 0.95;
          utter.onend = () => setMantraPlaying(false);
          utter.onerror = () => setMantraPlaying(false);
          window.speechSynthesis.speak(utter);
        } else {
          setMantraPlaying(false);
        }
      },
    });

    if (!spoken && !('speechSynthesis' in window)) {
      setTimeout(() => setMantraPlaying(false), 3000);
    }

    onShowToast(`📿 Đang trì tụng chân ngôn: ${statue.mantra}`);
  };

  // Lighting classes
  const getLightingFilter = () => {
    switch (lightingMode) {
      case 'dawn':
        return 'brightness(1.08) contrast(1.05) saturate(1.15) hue-rotate(-5deg)';
      case 'noon':
        return 'brightness(1.18) contrast(1.12) saturate(1.25)';
      case 'dusk':
        return 'brightness(1.02) contrast(1.08) saturate(1.2) sepia(0.2)';
      case 'night':
        return 'brightness(0.85) contrast(1.15) saturate(0.95) hue-rotate(15deg)';
    }
  };

  const getAuraColor = () => {
    switch (lightingMode) {
      case 'dawn':
        return 'from-amber-400/40 via-yellow-500/20 to-transparent';
      case 'noon':
        return 'from-yellow-300/50 via-amber-400/30 to-transparent';
      case 'dusk':
        return 'from-orange-500/50 via-amber-600/30 to-transparent';
      case 'night':
        return 'from-cyan-400/30 via-indigo-500/20 to-transparent';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative max-w-4xl w-full bg-slate-900 border-2 border-amber-500/60 rounded-3xl overflow-hidden shadow-2xl shadow-amber-950/60 my-auto animate-fadeIn">
        {/* Top Bar with Lighting & Close Controls */}
        <div className="p-4 bg-slate-950/90 border-b border-amber-500/30 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                Không Gian Chiêm Bái 3D/4D Thần Diệu
              </span>
              <h3 className="text-base sm:text-lg font-black text-white">{statue.name}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Lighting Toggle */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setLightingMode('dawn')}
                className={`p-1.5 rounded-lg transition-all ${
                  lightingMode === 'dawn' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'hover:text-white'
                }`}
                title="Ánh Sáng Bình Minh"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLightingMode('noon')}
                className={`p-1.5 rounded-lg transition-all ${
                  lightingMode === 'noon' ? 'bg-yellow-400 text-slate-950 font-bold shadow' : 'hover:text-white'
                }`}
                title="Ánh Sáng Ban Trưa"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLightingMode('dusk')}
                className={`p-1.5 rounded-lg transition-all ${
                  lightingMode === 'dusk' ? 'bg-orange-500 text-slate-950 font-bold shadow' : 'hover:text-white'
                }`}
                title="Ánh Sáng Hoàng Hôn"
              >
                <Sunset className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLightingMode('night')}
                className={`p-1.5 rounded-lg transition-all ${
                  lightingMode === 'night' ? 'bg-indigo-600 text-white font-bold shadow' : 'hover:text-white'
                }`}
                title="Ánh Sáng Đêm Trăng Thanh Tịnh"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
              title="Đóng cửa sổ"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 3D Showcase & Statue Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
          {/* Left: 3D Holographic Parallax Altar Stage */}
          <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="lg:col-span-7 relative bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950/40 flex items-center justify-center p-6 overflow-hidden select-none cursor-grab active:cursor-grabbing min-h-[380px]"
            style={{ perspective: 1000 }}
          >
            {/* Concentric Pulsing Golden Halos behind head */}
            <div
              className={`absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-gradient-to-r ${getAuraColor()} blur-2xl animate-pulse pointer-events-none`}
            />

            {/* Rotating 3D Golden Dharmachakra / Halo Ring */}
            <div
              className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full border-4 border-dashed border-amber-400/50 animate-[spin_40s_linear_infinite] pointer-events-none shadow-[0_0_50px_rgba(251,191,36,0.35)]"
              style={{
                boxShadow: '0 0 45px rgba(245, 158, 11, 0.4), inset 0 0 25px rgba(251, 191, 36, 0.3)',
              }}
            />

            {/* Inner Radiating Sunburst Rays */}
            <div className="absolute w-52 h-52 rounded-full border-2 border-amber-300/40 animate-[spin_25s_linear_infinite_reverse] pointer-events-none" />

            {/* Floating Golden Sparks / Light Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(14)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#fde047] animate-ping"
                  style={{
                    top: `${15 + ((i * 37) % 70)}%`,
                    left: `${10 + ((i * 53) % 80)}%`,
                    animationDuration: `${2 + (i % 3)}s`,
                    animationDelay: `${(i * 0.4) % 2}s`,
                    opacity: 0.6,
                  }}
                />
              ))}
            </div>

            {/* 3D Realistic Statue Card with Depth Tilt & Shadow */}
            <div
              className={`relative z-10 transition-transform duration-200 ease-out flex flex-col items-center ${
                isBowing ? 'scale-95 translate-y-3' : ''
              }`}
              style={{
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transformStyle: 'preserve-3d',
              }}
            >
              <div className="relative rounded-3xl overflow-hidden border-2 border-amber-400/60 shadow-2xl shadow-amber-950/90 max-h-[380px] w-auto max-w-[280px] sm:max-w-[320px] bg-slate-950">
                <img
                  src={statue.imageUrl}
                  alt={statue.name}
                  style={{ filter: getLightingFilter() }}
                  className="w-full h-auto object-contain max-h-[360px] drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)] transition-all duration-500"
                />

                {/* Golden rim light overlay */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-amber-500/10" />

                {/* Title badge in corner */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/80 border border-amber-400/50 text-[10px] text-amber-300 font-bold">
                  3D Tôn Tượng Thật
                </div>
              </div>

              {/* Glowing Lotus Pedestal at bottom */}
              <div className="mt-2 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-400/40 text-[11px] text-amber-200 shadow-lg">
                  <span>🪷</span>
                  <span className="font-serif">Đài Sen Hoàng Kim Phát Quang</span>
                </div>
              </div>

              {/* Incense Burner & 3D Rising Smoke */}
              {isIncenseBurning && (
                <div className="mt-3 flex flex-col items-center">
                  <div className="relative w-16 h-4 flex justify-center gap-2">
                    {[-1, 0, 1].map((idx) => (
                      <div key={idx} className="relative flex flex-col items-center">
                        {/* Red burning ember */}
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
                        {/* Incense stick */}
                        <div className="w-0.5 h-6 bg-amber-800" />
                        {/* Smoke wave rising */}
                        <div
                          className="absolute bottom-2 w-1 h-14 bg-gradient-to-t from-slate-400/50 via-slate-300/20 to-transparent rounded-full blur-[1px] animate-[pulse_2s_infinite]"
                          style={{
                            transform: `rotate(${idx * 10}deg) translateY(-20px)`,
                            animationDelay: `${idx * 0.4}s`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-amber-300/70 italic mt-1">
                    Trầm hương thanh tịnh tỏa ngát
                  </span>
                </div>
              )}
            </div>

            <div className="absolute bottom-2 right-2 text-[10px] text-slate-500 flex items-center gap-1 pointer-events-none">
              <RotateCw className="w-3 h-3" />
              <span>Rê chuột để đổi góc nhìn 3D</span>
            </div>
          </div>

          {/* Right: Sacred Bio, Vows, Mantra & Ritual Action Hub */}
          <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between space-y-4 bg-slate-900 border-t lg:border-t-0 lg:border-l border-amber-500/30">
            <div className="space-y-3.5">
              <div>
                <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest block">
                  {statue.title}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">{statue.name}</h2>
              </div>

              {/* Description */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                {statue.description}
              </div>

              {/* Sacred Vow */}
              <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs space-y-1">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                  <span>Đại Nguyện Cứu Độ:</span>
                </span>
                <p className="font-serif italic text-amber-100/90 leading-relaxed">&ldquo;{statue.vow}&rdquo;</p>
              </div>

              {/* Mantra Recitation */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-400 text-[11px]">Chân Ngôn Trì Tụng:</span>
                  <button
                    type="button"
                    onClick={handleReciteMantra}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                      mantraPlaying
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{mantraPlaying ? 'Đang Tụng...' : 'Nghe Tụng'}</span>
                  </button>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 text-amber-300 font-serif font-bold text-center border border-amber-500/20">
                  {statue.mantra}
                </div>
              </div>
            </div>

            {/* Ritual Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                {/* Lạy Phật */}
                <button
                  type="button"
                  onClick={handleBow}
                  className="py-2.5 px-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <span>🙏</span>
                  <span>Đảnh Lễ ({bowCount}/3)</span>
                </button>

                {/* Thắp Hương */}
                <button
                  type="button"
                  onClick={() => {
                    setIsIncenseBurning(!isIncenseBurning);
                    onShowToast(isIncenseBurning ? 'Đã gác nén hương.' : '🔥 Đã thắp 3 nén tâm hương dâng Đức Phật!');
                  }}
                  className={`py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    isIncenseBurning
                      ? 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>{isIncenseBurning ? 'Đang Thắp Hương' : 'Thắp Nhang'}</span>
                </button>
              </div>

              {/* Dâng Lễ Vật & Hoa Quả */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOfferings(statue.name);
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all active:scale-98"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-200" />
                <span>Dâng Hoa Quả &amp; Lễ Vật Cúng Dường Tôn Tượng</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
