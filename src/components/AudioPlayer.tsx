import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Volume1,
  Download,
  FileText,
  Check,
  Share2,
  Zap,
  Info
} from "lucide-react";
import { parseSrtContent, SrtCue, downloadFile } from "../utils/srt";

interface AudioPlayerProps {
  audioUrl: string;
  audioType: "mp3" | "wav";
  title?: string;
  voiceName?: string;
  srtContent?: string;
  onOpenSrtModal?: () => void;
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  audioType,
  title = "Bản thu âm Đỗ Minh Hiếu AI",
  voiceName,
  srtContent,
  onOpenSrtModal,
  className = "",
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [volumeBoost, setVolumeBoost] = useState<number>(1.5); // Default 150% boost for loud and clear sound
  const [isMuted, setIsMuted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Parse SRT cues for real-time subtitle sync
  const cues: SrtCue[] = React.useMemo(() => {
    return srtContent ? parseSrtContent(srtContent) : [];
  }, [srtContent]);

  // Current active subtitle cue
  const activeCue = cues.find(
    (c) => currentTime >= c.startTime && currentTime <= c.endTime
  );

  // Setup Web Audio Gain Booster for amplifying audio volume up to 200%
  const ensureAudioGain = () => {
    if (typeof window === "undefined" || !audioRef.current) return;
    if (!audioCtxRef.current) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const source = ctx.createMediaElementSource(audioRef.current);
        const gain = ctx.createGain();
        gain.gain.value = volumeBoost;
        source.connect(gain);
        gain.connect(ctx.destination);
        audioCtxRef.current = ctx;
        gainNodeRef.current = gain;
      } catch (e) {
        // Fallback if media already connected or cross-origin policy
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  };

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volumeBoost;
    }
  }, [volumeBoost]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    ensureAudioGain();
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleRateChange = () => {
    const rates = [0.8, 1.0, 1.2, 1.5, 2.0];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const next = !isMuted;
    setIsMuted(next);
    audioRef.current.muted = next;
  };

  const handleReplay = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(console.error);
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(audioUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleDownloadAudio = () => {
    const filename = `everai_${Date.now()}.${audioType}`;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = filename;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadSrt = () => {
    if (!srtContent) return;
    downloadFile(srtContent, `everai_subtitle_${Date.now()}.srt`, "application/x-subrip");
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const mins = Math.floor(secs / 60);
    const remainSecs = Math.floor(secs % 60);
    return `${String(mins).padStart(2, "0")}:${String(remainSecs).padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Track Header */}
      <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-neutral-800/80">
        <div>
          <div className="text-sm font-semibold text-neutral-100 line-clamp-1">{title}</div>
          <div className="text-xs text-neutral-400 mt-0.5 flex items-center gap-2">
            {voiceName && <span>Giọng: <strong className="text-amber-400 font-medium">{voiceName}</strong></span>}
            <span aria-hidden="true">·</span>
            <span className="uppercase font-mono text-[11px] text-neutral-300">{audioType}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleCopyLink}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            title="Sao chép link audio"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>

          {srtContent && onOpenSrtModal && (
            <button
              onClick={onOpenSrtModal}
              className="p-2 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-neutral-800 transition-colors"
              title="Xem toàn bộ phụ đề SRT"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleDownloadAudio}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-medium text-xs shadow-md transition-colors"
            title={`Tải xuống file ${audioType.toUpperCase()}`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải {audioType.toUpperCase()}</span>
          </button>

          {srtContent && (
            <button
              onClick={handleDownloadSrt}
              className="px-2.5 py-1.5 rounded-lg border border-neutral-700 hover:border-neutral-600 bg-neutral-800 text-neutral-200 text-xs font-medium transition-colors"
              title="Tải phụ đề .SRT"
            >
              SRT
            </button>
          )}
        </div>
      </div>

      {/* Progress & Time */}
      <div className="space-y-1.5">
        <div className="relative group">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
            style={{
              background: `linear-gradient(to right, #f59e0b ${progressPercent}%, #262626 ${progressPercent}%)`,
            }}
          />
        </div>

        <div className="flex justify-between items-center text-xs font-mono tabular-nums text-neutral-400 px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between mt-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleReplay}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Nghe lại từ đầu"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-amber-500/20"
            title={isPlaying ? "Tạm dừng" : "Phát âm thanh"}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={handleRateChange}
            className="px-2 py-1 rounded text-xs font-mono font-medium text-neutral-300 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
            title="Đổi tốc độ phát"
          >
            {playbackRate}x
          </button>
        </div>

        {/* Volume slider & Boost */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="text-neutral-400 hover:text-neutral-200 transition-colors"
              title={isMuted ? "Bật âm" : "Tắt âm"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 sm:w-20 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              title={`Âm lượng: ${Math.round(volume * 100)}%`}
            />
          </div>

          {/* Volume Booster Selector */}
          <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => {
                setVolumeBoost(1.0);
                ensureAudioGain();
              }}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                volumeBoost === 1.0
                  ? "bg-neutral-800 text-neutral-200 font-bold"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
              title="Âm lượng gốc chuẩn (100%)"
            >
              100%
            </button>
            <button
              type="button"
              onClick={() => {
                setVolumeBoost(1.5);
                ensureAudioGain();
              }}
              className={`px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors ${
                volumeBoost === 1.5
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                  : "text-neutral-400 hover:text-amber-400"
              }`}
              title="Khuếch đại âm lượng to rõ (150%)"
            >
              <Zap className="w-2.5 h-2.5 text-amber-400" />
              <span>+150%</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setVolumeBoost(2.2);
                ensureAudioGain();
              }}
              className={`px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors ${
                volumeBoost === 2.2
                  ? "bg-amber-500 text-neutral-950 font-bold"
                  : "text-neutral-400 hover:text-amber-400"
              }`}
              title="Kích âm cực đại (220% Siêu to)"
            >
              <span>+220%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Synchronized Subtitle Highlight */}
      {srtContent && (
        <div className="mt-4 pt-3 border-t border-neutral-800/80">
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Phụ Đề Trực Tiếp (SRT Sync)</span>
            {activeCue && (
              <span className="font-mono text-amber-400/90 text-[10px]">
                {formatTime(activeCue.startTime)} - {formatTime(activeCue.endTime)}
              </span>
            )}
          </div>
          <div className="min-h-[44px] flex items-center justify-center p-2.5 rounded-lg bg-neutral-950/70 border border-neutral-800/60 text-center">
            {activeCue ? (
              <p className="text-sm text-amber-200 font-medium leading-relaxed transition-all">
                "{activeCue.text}"
              </p>
            ) : (
              <p className="text-xs text-neutral-500 italic">
                (Phát audio để hiển thị phụ đề đồng bộ theo dòng)
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
