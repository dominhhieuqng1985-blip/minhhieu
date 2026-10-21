import React, { useState, useRef, useEffect } from "react";
import {
  Music,
  Play,
  Pause,
  Download,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  Sliders,
  Radio,
  Layers,
  ArrowRight,
  RotateCcw,
  Film,
  Mic,
  FileText,
  Clock,
  Heart,
  Headphones,
  Check,
  Share2
} from "lucide-react";
import { MusicGenre, GeneratedMusicTrack } from "../types/gemini";
import { safeParseJson } from "../utils/apiHelper";

interface MusicStudioViewProps {
  onNavigateToDubbing?: (audioUrl?: string) => void;
  onSendToStudio?: (text: string) => void;
  onNavigateToSongwriter?: (theme: string, genre: string) => void;
  initialPrompt?: string;
  initialGenre?: MusicGenre;
  initialMood?: string;
}

// Preset musical chords for Web Audio synthesizer
const INTERACTIVE_CHORDS = [
  { name: "C", notes: [261.63, 329.63, 392.00], label: "Đô Trưởng (C)" },
  { name: "Dm", notes: [293.66, 349.23, 440.00], label: "Rê Thứ (Dm)" },
  { name: "Em", notes: [329.63, 392.00, 493.88], label: "Mi Thứ (Em)" },
  { name: "F", notes: [349.23, 440.00, 523.25], label: "Fa Trưởng (F)" },
  { name: "G", notes: [392.00, 493.88, 587.33], label: "Sol Trưởng (G)" },
  { name: "Am", notes: [220.00, 261.63, 329.63], label: "La Thứ (Am)" },
  { name: "Cmaj7", notes: [261.63, 329.63, 392.00, 493.88], label: "Cmaj7 (Lo-Fi)" },
  { name: "G7", notes: [196.00, 246.94, 293.66, 349.23], label: "Sol 7 (G7)" },
  { name: "Bb", notes: [233.08, 293.66, 349.23], label: "Si Giáng (Bb)" },
  { name: "D7", notes: [293.66, 369.99, 440.00, 523.25], label: "Rê 7 (D7)" }
];

// Sample showcase tracks ready to play
const SAMPLE_TRACKS: Array<{
  id: string;
  title: string;
  genre: string;
  mood: string;
  bpm: number;
  duration: string;
  audioUrl: string;
  description: string;
}> = [
  {
    id: "sample_lofi",
    title: "Mưa Thu Phố Cổ - Lo-Fi Chill Beats",
    genre: "lofi",
    mood: "Thư giãn, hoài niệm, êm dịu",
    bpm: 85,
    duration: "0:30",
    audioUrl: "/api/ai/music/file/sample_lofi.mp3",
    description: "Nhịp beat Lo-Fi ấm áp kết hợp hợp âm piano cổ điển và âm hưởng mưa rơi"
  },
  {
    id: "sample_piano",
    title: "Bản Tình Ca Mùa Đông - Piano Ballad",
    genre: "piano_ballad",
    mood: "Sâu lắng, lãng mạn, da diết",
    bpm: 76,
    duration: "0:45",
    audioUrl: "/api/ai/music/file/sample_piano.mp3",
    description: "Giai điệu Piano mượt mà cùng dàn dây vĩ cầm du dương dạt dào cảm xúc"
  },
  {
    id: "sample_acoustic",
    title: "Nắng Sớm Quê Hương - Acoustic Guitar",
    genre: "acoustic",
    mood: "Bình yên, tươi sáng, mộc mạc",
    bpm: 95,
    duration: "0:30",
    audioUrl: "/api/ai/music/file/sample_acoustic.mp3",
    description: "Tiếng đàn guitar acoustic gảy ngón mộc mạc mang lại cảm giác thư thái"
  },
  {
    id: "sample_cinematic",
    title: "Chinh Phục Đỉnh Cao - Cinematic Epic",
    genre: "cinematic",
    mood: "Hùng tráng, dồn dập, truyền cảm hứng",
    bpm: 115,
    duration: "0:30",
    audioUrl: "/api/ai/music/file/sample_cinematic.mp3",
    description: "Dàn giao hưởng điện ảnh hào hùng kết hợp tiếng trống trận dồn dập"
  },
  {
    id: "sample_bolero",
    title: "Chiều Bên Dòng Sông - Bolero Trữ Tình",
    genre: "bolero",
    mood: "Trữ tình quê hương, ngọt ngào",
    bpm: 72,
    duration: "0:40",
    audioUrl: "/api/ai/music/file/sample_bolero.mp3",
    description: "Tiết điệu Bolero guitar thùng quyện sáo trúc âm vang êm đềm"
  },
  {
    id: "sample_meditation",
    title: "Tĩnh Lặng Tâm Hồn - 432Hz Healing Zen",
    genre: "meditation",
    mood: "Thanh tịnh, chữa lành, an nhiên",
    bpm: 60,
    duration: "0:30",
    audioUrl: "/api/ai/music/file/sample_meditation.mp3",
    description: "Âm thanh sóng nước và chuông xoay Tây Tạng giúp thiền định thư giãn sâu"
  }
];

export const MusicStudioView: React.FC<MusicStudioViewProps> = ({
  onNavigateToDubbing,
  onSendToStudio,
  onNavigateToSongwriter,
  initialPrompt,
  initialGenre,
  initialMood
}) => {
  // Generation inputs
  const [prompt, setPrompt] = useState(
    initialPrompt || "Giai điệu Lo-Fi thư giãn ấm áp với tiếng piano êm đềm, tiếng mưa rơi nhẹ và nhịp beat chậm rãi cho video học tập đọc sách"
  );
  const [genre, setGenre] = useState<MusicGenre>(initialGenre || "lofi");
  const [mood, setMood] = useState(initialMood || "Thư giãn, êm dịu, ấm áp");
  const [durationSeconds, setDurationSeconds] = useState<number>(30);
  const [tempoBpm, setTempoBpm] = useState<number>(85);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([
    "Piano",
    "Acoustic Guitar",
    "Trống / Beat Percussion",
    "Bass trầm"
  ]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<GeneratedMusicTrack | null>(null);
  const [trackHistory, setTrackHistory] = useState<GeneratedMusicTrack[]>([]);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Web Audio Context for Interactive Chord Synthesizer
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [activeChordName, setActiveChordName] = useState<string | null>(null);

  // Play chord function with Web Audio
  const playInteractiveChord = (notes: number[], chordName: string) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      setActiveChordName(chordName);
      setTimeout(() => setActiveChordName(null), 1200);

      const now = ctx.currentTime;
      notes.forEach((freq) => {
        // Multi-oscillator synthesis for warm acoustic instrument tone
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(freq, now);

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(freq * 1.002, now); // slight detune for warmth

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.22, now + 0.05); // Attack
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.4); // Decay
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4); // Release

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.4);
        osc2.stop(now + 1.4);
      });
    } catch (e) {
      console.warn("Interactive chord synthesis notice:", e);
    }
  };

  // Generate music handler
  const handleGenerateMusic = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const customKey = localStorage.getItem("gemini_custom_pro_api_key") || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (customKey.trim()) {
        headers["x-gemini-api-key"] = customKey.trim();
      }

      const res = await fetch("/api/ai/music", {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: prompt.trim(),
          genre,
          mood,
          durationSeconds,
          tempoBpm,
          instruments: selectedInstruments
        })
      });

      const data = await safeParseJson(res);
      if (!res.ok || data.status !== 1 || !data.result) {
        throw new Error(data.error_message || "Không thể tạo bản nhạc.");
      }

      const newTrack: GeneratedMusicTrack = data.result;
      setCurrentTrack(newTrack);
      setTrackHistory((prev) => [newTrack, ...prev.filter((t) => t.id !== newTrack.id)]);

      // Auto play the new track
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }, 300);
    } catch (err: any) {
      setGenerationError(err.message || "Lỗi tạo bản nhạc với AI.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Select sample track
  const handlePlaySample = (sample: typeof SAMPLE_TRACKS[0]) => {
    const trackObj: GeneratedMusicTrack = {
      id: sample.id,
      title: sample.title,
      genre: sample.genre,
      mood: sample.mood,
      bpm: sample.bpm,
      duration: 30,
      durationFormatted: sample.duration,
      audioUrl: sample.audioUrl,
      downloadUrl: sample.audioUrl,
      description: sample.description,
      musicalKey: "C Major / A Minor",
      instrumentsUsed: ["Piano", "Acoustic Guitar", "Strings", "Lo-Fi Beats"],
      createdAt: new Date().toISOString()
    };
    setCurrentTrack(trackObj);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }, 200);
  };

  // Audio element events
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    if (val === 0) setIsMuted(true);
    else setIsMuted(false);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const toggleInstrument = (inst: string) => {
    if (selectedInstruments.includes(inst)) {
      if (selectedInstruments.length > 1) {
        setSelectedInstruments(selectedInstruments.filter((i) => i !== inst));
      }
    } else {
      setSelectedInstruments([...selectedInstruments, inst]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Studio Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-pink-950/40 via-neutral-900 to-purple-950/30 border border-pink-500/30 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>AI Music & Beat Studio • Đỗ Minh Hiếu AI</span>
              <span className="px-1.5 py-0.2 rounded bg-pink-500 text-neutral-950 text-[10px] font-black uppercase">
                HOT
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Tạo Nhạc AI, Hòa Âm Hòa Tấu & Beatmaker Chuyên Nghiệp
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed">
              Tạo bản nhạc nền (Background Music), beat lofi, ballad piano, acoustic guitar, bolero, cinematic hoặc EDM chỉ với một câu miêu tả.
              Tự do tùy chỉnh nhịp điệu BPM, nhạc cụ, hợp âm và xuất file MP3 chất lượng cao để lồng ghép video hoặc lồng tiếng.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-center">
              <div className="text-xl font-black text-pink-400 font-mono">320kbps</div>
              <div className="text-[10px] text-neutral-400 uppercase font-semibold">Chuẩn Stereo MP3</div>
            </div>
            <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-center">
              <div className="text-xl font-black text-purple-400 font-mono">100% AI</div>
              <div className="text-[10px] text-neutral-400 uppercase font-semibold">Bản Quyền Tự Do</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Music Creator Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 sm:p-7 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-pink-400" />
                <h2 className="text-base font-bold text-white">Soạn Nhạc & Hòa Âm Bằng Trí Tuệ Nhân Tạo</h2>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                HARMONIC ENGINE
              </span>
            </div>

            {/* Quick Prompt Presets */}
            <div className="space-y-2">
              <span className="text-[11px] text-neutral-400 font-semibold flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5 text-pink-400" />
                <span>Gợi ý phong cách phổ biến:</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    label: "☕ Lo-Fi Chill Beats",
                    prompt: "Giai điệu Lo-Fi thư giãn ấm áp kèm tiếng mưa rơi nhẹ nhàng, thích hợp đọc sách học tập",
                    genre: "lofi" as MusicGenre,
                    mood: "Thư giãn, êm dịu, ấm áp",
                    bpm: 85
                  },
                  {
                    label: "🎹 Piano Ballad Du Dương",
                    prompt: "Bản hòa tấu Piano lãng mạn sâu lắng kết hợp dàn dây vĩ cầm du dương cho video kỷ niệm",
                    genre: "piano_ballad" as MusicGenre,
                    mood: "Sâu lắng, lãng mạn, da diết",
                    bpm: 76
                  },
                  {
                    label: "🎸 Acoustic Guitar Mộc",
                    prompt: "Tiếng đàn Acoustic Guitar trong trẻo vui tươi như buổi sáng bình yên trên đồng cỏ quê hương",
                    genre: "acoustic" as MusicGenre,
                    mood: "Bình yên, tươi sáng, mộc mạc",
                    bpm: 95
                  },
                  {
                    label: "🎬 Cinematic Trailer",
                    prompt: "Nhạc nền điện ảnh trailer hùng tráng, trống dồn dập kịch tính với âm thanh hào hùng",
                    genre: "cinematic" as MusicGenre,
                    mood: "Hùng tráng, dồn dập, truyền cảm hứng",
                    bpm: 115
                  },
                  {
                    label: "🌸 Bolero Quê Hương",
                    prompt: "Giai điệu Bolero trữ tình quê hương mượt mà, da diết với tiếng guitar và sáo trúc",
                    genre: "bolero" as MusicGenre,
                    mood: "Trữ tình quê hương, ngọt ngào",
                    bpm: 72
                  },
                  {
                    label: "🔥 EDM Bùng Cháy",
                    prompt: "Nhịp điệu EDM hiện đại tràn đầy năng lượng, drop cuốn hút bùng nổ ngày mới",
                    genre: "edm" as MusicGenre,
                    mood: "Sôi động, nhiệt huyết, bùng nổ",
                    bpm: 128
                  },
                  {
                    label: "🧘 Thiền & Spa 432Hz",
                    prompt: "Âm thanh chữa lành tần số 432Hz êm dịu, chuông gió thanh tịnh giúp thư giãn tâm hồn",
                    genre: "meditation" as MusicGenre,
                    mood: "Thanh tịnh, chữa lành, an nhiên",
                    bpm: 60
                  }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(item.prompt);
                      setGenre(item.genre);
                      setMood(item.mood);
                      setTempoBpm(item.bpm);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-pink-950/40 text-neutral-300 hover:text-pink-300 border border-neutral-800 hover:border-pink-500/40 text-xs transition-all font-medium"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Textarea */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                Mô tả ý tưởng giai điệu, không gian hoặc nhạc cụ mong muốn:
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Nhập mô tả bản nhạc bạn muốn tạo (VD: Tiếng guitar acoustic mộc mạc và sáo trúc êm đềm buổi chiều tà...)"
                className="w-full p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>

            {/* Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Genre */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                  Thể loại âm nhạc:
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value as MusicGenre)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-pink-500 font-medium"
                >
                  <option value="lofi">Lo-Fi Chill Beats (Thư giãn, học tập)</option>
                  <option value="piano_ballad">Piano Ballad & Strings (Lãng mạn, sâu lắng)</option>
                  <option value="acoustic">Acoustic Guitar (Mộc mạc, bình yên)</option>
                  <option value="cinematic">Cinematic Epic (Điện ảnh, hùng tráng)</option>
                  <option value="bolero">Bolero Trữ Tình (Quê hương, da diết)</option>
                  <option value="edm">EDM / Electronic (Sôi động, cuồng nhiệt)</option>
                  <option value="rnb">R&B / Soul Melodic (Mượt mà, êm ái)</option>
                  <option value="meditation">Thiền Định & Spa (Thanh tịnh, chữa lành)</option>
                </select>
              </div>

              {/* Mood */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                  Tâm trạng / Cảm xúc:
                </label>
                <input
                  type="text"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  placeholder="Thư giãn, ấm áp, sâu lắng..."
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-pink-500 font-medium"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5 flex items-center justify-between">
                  <span>Thời lượng bản nhạc:</span>
                  <span className="text-pink-400 font-mono font-bold">{durationSeconds} giây</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 60, 120].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setDurationSeconds(sec)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        durationSeconds === sec
                          ? "bg-pink-500/20 border-pink-500 text-pink-300 shadow-sm"
                          : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Tempo BPM Slider */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5 flex items-center justify-between">
                  <span>Nhịp điệu (Tempo BPM):</span>
                  <span className="text-pink-400 font-mono font-bold">{tempoBpm} BPM</span>
                </label>
                <input
                  type="range"
                  min="60"
                  max="150"
                  step="1"
                  value={tempoBpm}
                  onChange={(e) => setTempoBpm(parseInt(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer h-2 bg-neutral-950 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1">
                  <span>60 (Chậm)</span>
                  <span>85 (Lo-Fi)</span>
                  <span>110 (Vừa)</span>
                  <span>150 (Nhanh)</span>
                </div>
              </div>
            </div>

            {/* Instruments Checklist */}
            <div className="space-y-2 pt-1 border-t border-neutral-800">
              <label className="block text-xs font-semibold text-neutral-300">
                Nhạc cụ phối khí mong muốn:
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  "Piano",
                  "Acoustic Guitar",
                  "Trống / Beat Percussion",
                  "Bass trầm",
                  "Dàn dây (Strings)",
                  "Saxophone",
                  "Synth điện tử",
                  "Sáo trúc quê hương"
                ].map((inst) => {
                  const isChecked = selectedInstruments.includes(inst);
                  return (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => toggleInstrument(inst)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
                        isChecked
                          ? "bg-purple-950/60 border-purple-500/50 text-purple-200"
                          : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isChecked ? "bg-purple-400" : "bg-neutral-600"}`} />
                      <span>{inst}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {generationError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-300">
                {generationError}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGenerateMusic}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:brightness-110 active:scale-[0.99] text-white font-black text-sm shadow-xl shadow-pink-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-white" />
                    <span>AI đang tạo beat & hòa âm bản nhạc ({durationSeconds}s)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-white" />
                    <span>Tạo Bản Nhạc AI Ngay ({durationSeconds}s)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Web Audio Synthesizer Chord Keyboard */}
          <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-pink-400 animate-pulse" />
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  Bàn Phím Thử Hợp Âm Trực Tiếp (Live Chord Pad)
                </h3>
              </div>
              <span className="text-[10px] text-neutral-400">Chạm hoặc click để nghe nốt</span>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Bạn có thể bấm thử các hợp âm mẫu bên dưới để nghe thử màu sắc âm thanh hòa âm acoustic trước khi tạo nhạc:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {INTERACTIVE_CHORDS.map((chord) => {
                const isActive = activeChordName === chord.name;
                return (
                  <button
                    key={chord.name}
                    type="button"
                    onClick={() => playInteractiveChord(chord.notes, chord.name)}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      isActive
                        ? "bg-gradient-to-t from-pink-500 to-rose-400 text-white border-pink-400 shadow-lg shadow-pink-500/30 scale-105"
                        : "bg-neutral-950 border-neutral-800 hover:border-pink-500/40 text-neutral-200 hover:text-white"
                    }`}
                  >
                    <div className="text-sm font-black font-mono">{chord.name}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5 truncate">{chord.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Audio Player & Preset Showcase (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Audio Player Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border border-pink-500/30 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Music className="w-4 h-4 text-pink-400" />
                <span>Trình Phát Âm Thanh Bản Nhạc</span>
              </span>
              {currentTrack && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 font-mono">
                  {currentTrack.bpm} BPM
                </span>
              )}
            </div>

            {currentTrack ? (
              <div className="space-y-4">
                {/* Track Info */}
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                    {currentTrack.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                    <span className="px-2 py-0.5 rounded bg-neutral-800 text-pink-300 font-semibold uppercase text-[10px]">
                      {currentTrack.genre}
                    </span>
                    <span>•</span>
                    <span>{currentTrack.mood}</span>
                  </div>
                  {currentTrack.description && (
                    <p className="text-xs text-neutral-400 italic mt-1 leading-relaxed">
                      &ldquo;{currentTrack.description}&rdquo;
                    </p>
                  )}
                </div>

                {/* Animated Waveform Visualizer */}
                <div className="h-16 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-center px-4 gap-1 overflow-hidden">
                  {Array.from({ length: 36 }).map((_, idx) => {
                    const isCenter = Math.abs(idx - 18) < 10;
                    const heightPercent = isPlaying
                      ? Math.max(15, ((idx * 37 + Math.floor(currentTime * 10)) % 85) + (isCenter ? 15 : 0))
                      : 20;
                    return (
                      <div
                        key={idx}
                        className={`flex-1 rounded-full transition-all duration-150 ${
                          isPlaying
                            ? idx % 2 === 0
                              ? "bg-gradient-to-t from-pink-500 to-purple-400"
                              : "bg-gradient-to-t from-rose-400 to-pink-500"
                            : "bg-neutral-800"
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    );
                  })}
                </div>

                {/* Hidden HTML5 Audio Element */}
                <audio
                  ref={audioRef}
                  src={currentTrack.audioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => {
                    if (isLooping && audioRef.current) {
                      audioRef.current.currentTime = 0;
                      audioRef.current.play();
                    } else {
                      setIsPlaying(false);
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (audioRef.current) setDuration(audioRef.current.duration);
                  }}
                  className="hidden"
                />

                {/* Seek Bar */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.1"
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full accent-pink-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration || currentTrack.duration)}</span>
                  </div>
                </div>

                {/* Player Controls */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.currentTime = 0;
                          setCurrentTime(0);
                        }
                      }}
                      className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                      title="Phát lại từ đầu"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsLooping(!isLooping)}
                      className={`p-2.5 rounded-xl border transition-colors ${
                        isLooping
                          ? "bg-pink-500/20 border-pink-500 text-pink-300"
                          : "bg-neutral-800 border-transparent text-neutral-400 hover:text-white"
                      }`}
                      title={isLooping ? "Đang bật lặp lại" : "Bật lặp lại"}
                    >
                      <RepeatIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Main Play / Pause Button */}
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 hover:brightness-110 active:scale-95 text-white shadow-lg shadow-pink-500/30 flex items-center justify-center transition-all"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current ml-1" />
                    )}
                  </button>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="p-2 text-neutral-400 hover:text-white transition-colors"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-red-400" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 accent-pink-500 h-1 bg-neutral-800 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Actions & Export to Dubbing / TTS */}
                <div className="pt-3 border-t border-neutral-800/80 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Download MP3 */}
                    <a
                      href={currentTrack.downloadUrl}
                      download={`${currentTrack.title}.mp3`}
                      className="px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-all flex items-center justify-center gap-2 border border-neutral-700"
                    >
                      <Download className="w-4 h-4 text-pink-400" />
                      <span>Tải File MP3</span>
                    </a>

                    {/* Copy Link */}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin + currentTrack.audioUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-all flex items-center justify-center gap-2 border border-neutral-700"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                      <span>{copiedLink ? "Đã chép link" : "Chia sẻ link"}</span>
                    </button>
                  </div>

                  {/* Send to Video Dubbing */}
                  {onNavigateToDubbing && (
                    <button
                      type="button"
                      onClick={() => onNavigateToDubbing(currentTrack.audioUrl)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-neutral-950 font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20"
                    >
                      <Film className="w-4 h-4" />
                      <span>Đưa Vào Lồng Tiếng Video Làm Nhạc Nền</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Send to Songwriter */}
                  {onNavigateToSongwriter && (
                    <button
                      type="button"
                      onClick={() => onNavigateToSongwriter(currentTrack.title, currentTrack.genre)}
                      className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-pink-300 font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-neutral-700"
                    >
                      <FileText className="w-4 h-4 text-pink-400" />
                      <span>Sáng Tác Lời Bài Hát Cho Bản Nhạc Này</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-500 flex items-center justify-center mx-auto">
                  <Music className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-neutral-300">Chưa có bản nhạc nào đang phát</h4>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                  Hãy nhấn <strong>&ldquo;Tạo Bản Nhạc AI Ngay&rdquo;</strong> ở bảng bên trái hoặc chọn một bản nhạc mẫu bên dưới để nghe thử ngay lập tức.
                </p>
              </div>
            )}
          </div>

          {/* Sample Showcase Library */}
          <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white">Thư Viện Nhạc Mẫu (Nghe Thử Tức Thì)</h3>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">6 Bản Mẫu</span>
            </div>

            <div className="space-y-2">
              {SAMPLE_TRACKS.map((sample) => {
                const isThisPlaying = currentTrack?.id === sample.id && isPlaying;
                return (
                  <div
                    key={sample.id}
                    onClick={() => handlePlaySample(sample)}
                    className="p-3 rounded-2xl bg-neutral-950/80 hover:bg-neutral-950 border border-neutral-800 hover:border-pink-500/40 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/30 group-hover:bg-pink-500 text-pink-400 group-hover:text-neutral-950 flex items-center justify-center shrink-0 transition-all">
                        {isThisPlaying ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-neutral-200 group-hover:text-pink-300 transition-colors truncate">
                          {sample.title}
                        </div>
                        <div className="text-[10px] text-neutral-500 flex items-center gap-2 mt-0.5">
                          <span className="text-pink-400 font-mono font-semibold">{sample.bpm} BPM</span>
                          <span>•</span>
                          <span>{sample.mood}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono font-semibold text-neutral-400 shrink-0">
                      {sample.duration}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Session History */}
          {trackHistory.length > 0 && (
            <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-pink-400" />
                <span>Bản Nhạc Đã Tạo Trong Phiên ({trackHistory.length}):</span>
              </h4>

              <div className="space-y-2">
                {trackHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setCurrentTrack(item);
                      setTimeout(() => {
                        if (audioRef.current) {
                          audioRef.current.currentTime = 0;
                          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                        }
                      }, 200);
                    }}
                    className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-pink-500/40 transition-all cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div className="truncate mr-2">
                      <div className="font-semibold text-neutral-200 truncate">{item.title}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        {item.bpm} BPM • {item.durationFormatted}
                      </div>
                    </div>
                    <Play className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Repeat icon helper
function RepeatIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
