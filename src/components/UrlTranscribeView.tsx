import React, { useState, useEffect, useRef } from "react";
import {
  Youtube,
  Video,
  FileText,
  Copy,
  Download,
  Sparkles,
  ArrowRight,
  Clock,
  Check,
  RefreshCw,
  AlertCircle,
  Upload,
  Link as LinkIcon,
  Mic,
  Square,
  FileAudio,
  Trash2,
  Sliders,
  Volume2,
  Film,
  Languages,
  Globe,
  Columns,
  CheckCheck,
  Scissors
} from "lucide-react";
import { TranscribeResult } from "../types/stt";
import { DubbedVideoResult } from "../types/video";
import { safeParseJson } from "../utils/apiHelper";
import { uploadFileInChunks } from "../utils/chunkedUpload";

export type TranscribeTab = "vietnamese" | "original" | "srt_vi" | "srt_orig" | "bilingual";

interface UrlTranscribeViewProps {
  onSendToStudio: (text: string, voiceCode?: string) => void;
  onNavigateToDubbing?: (audioUrl?: string, videoTempId?: string) => void;
}

const SAMPLE_URLS = [
  {
    name: "YouTube: Kênh Tri Thức & Thời Sự",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    platform: "youtube"
  },
  {
    name: "YouTube Shorts: Review & Chia Sẻ",
    url: "https://www.youtube.com/shorts/5qap5aO4i9A",
    platform: "youtube"
  },
  {
    name: "TikTok: Video Ngắn Xu Hướng",
    url: "https://www.tiktok.com/@tiktok/video/7106594312292453678",
    platform: "tiktok"
  }
];

export const UrlTranscribeView: React.FC<UrlTranscribeViewProps> = ({
  onSendToStudio,
  onNavigateToDubbing
}) => {
  const [inputMode, setInputMode] = useState<"url" | "file" | "mic">("file");
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("vi");
  const [autoTranslate, setAutoTranslate] = useState<boolean>(true);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("Đang khởi tạo...");
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<TranscribeResult | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<TranscribeTab>("vietnamese");
  const [copied, setCopied] = useState(false);
  const [selectedVoiceForSend, setSelectedVoiceForSend] = useState("vi_male_nhanvatnam_default");
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [voiceGenError, setVoiceGenError] = useState<string | null>(null);

  // Direct video merging states
  const [isMergingVideo, setIsMergingVideo] = useState(false);
  const [mergedVideoResult, setMergedVideoResult] = useState<DubbedVideoResult | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);

  // Microphone recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Local history of transcribed files/URLs
  const [history, setHistory] = useState<TranscribeResult[]>(() => {
    try {
      const saved = localStorage.getItem("dmh_stt_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("dmh_stt_history", JSON.stringify(history));
    } catch (e) {
      console.warn("Failed to persist STT history:", e);
    }
  }, [history]);

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Detect platform from URL
  const detectedPlatform = React.useMemo(() => {
    if (!url.trim()) return null;
    const lower = url.toLowerCase();
    if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
    if (lower.includes("tiktok.com") || lower.includes("douyin.com")) return "tiktok";
    if (lower.match(/\.(mp3|wav|m4a|mp4|ogg|aac)(\?|$)/i)) return "media";
    return "url";
  }, [url]);

  const handleTranscribeUrl = async (targetUrl?: string) => {
    const urlToUse = targetUrl || url;
    if (!urlToUse.trim()) {
      setError("Vui lòng nhập đường dẫn URL YouTube hoặc TikTok.");
      return;
    }

    setIsLoading(true);
    setLoadingStep("Đang tải luồng âm thanh thực tế từ video...");
    setError(null);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev.includes("tải luồng")) return "FFmpeg đang lọc dải tần giọng nói...";
        if (prev.includes("FFmpeg")) return "AI đang lắng nghe và bóc băng lời nói tiếng Việt...";
        return "Đang tạo phụ đề SRT theo mốc thời gian...";
      });
    }, 2800);

    try {
      const response = await fetch("/api/stt/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: urlToUse.trim(),
          language,
          auto_translate: autoTranslate,
          generate_srt: true
        })
      });

      const data = await safeParseJson(response);

      if (!response.ok || data.status === 0 || !data.result) {
        throw new Error(data.error_message || "Không thể phân tích âm thanh từ đường dẫn này.");
      }

      const result: TranscribeResult = data.result;
      setCurrentResult(result);
      if (result.translatedText && result.isTranslatedToVietnamese) {
        setActiveResultTab("vietnamese");
      } else if (result.detectedLanguageCode === "vi") {
        setActiveResultTab("vietnamese");
      } else {
        setActiveResultTab("original");
      }
      setHistory((prev) => [result, ...prev.filter((h) => h.id !== result.id)].slice(0, 30));
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi phân tích âm thanh.");
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeFormatted = file.size > 1024 * 1024 * 1024
      ? (file.size / (1024 * 1024 * 1024)).toFixed(2) + " GB"
      : (file.size / (1024 * 1024)).toFixed(1) + " MB";

    setIsLoading(true);
    setLoadingStep(`Đang nạp tệp "${file.name}" (${sizeFormatted})...`);
    setError(null);

    const stepTimer = setTimeout(() => {
      setLoadingStep("AI đang phân tích sóng âm & nhận diện giọng nói...");
    }, 3000);

    try {
      // Chunked 8MB upload to completely bypass 32MB proxy limits & HTTP 413 (supports files up to 5GB)
      const uploadData = await uploadFileInChunks(file, (p) => {
        setLoadingStep(
          `Đang truyền tải tệp "${file.name}": ${p.percent}% (Mảnh ${p.currentChunk}/${p.totalChunks} · ${p.loadedFormatted} / ${p.totalFormatted}${p.speedFormatted ? ` · ${p.speedFormatted}` : ""})...`
        );
      });

      setLoadingStep(`AI đang tách luồng âm thanh và nhận diện giọng nói chuẩn xác...`);

      const res = await fetch("/api/stt/transcribe-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempId: uploadData.tempId,
          mimeType: file.type || "video/mp4",
          fileName: file.name,
          auto_translate: autoTranslate
        })
      });

      const data = await safeParseJson(res);
      if (!res.ok || data.status === 0 || !data.result) {
        throw new Error(data.error_message || "Không thể nhận diện giọng nói trong tệp này.");
      }

      const result: TranscribeResult = data.result;
      setCurrentResult(result);
      if (result.translatedText && result.isTranslatedToVietnamese) {
        setActiveResultTab("vietnamese");
      } else if (result.detectedLanguageCode === "vi") {
        setActiveResultTab("vietnamese");
      } else {
        setActiveResultTab("original");
      }
      setHistory((prev) => [result, ...prev.filter((h) => h.id !== result.id)].slice(0, 30));
    } catch (err: any) {
      setError(err.message || "Lỗi khi xử lý video hoặc file âm thanh.");
    } finally {
      clearTimeout(stepTimer);
      setIsLoading(false);
      e.target.value = "";
    }
  };

  // Microphone recording functions
  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await handleRecordedBlob(audioBlob);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError("Không thể mở micro: Vui lòng cho phép quyền truy cập micro trong trình duyệt.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const handleRecordedBlob = async (blob: Blob) => {
    setIsLoading(true);
    setLoadingStep("AI đang lắng nghe và bóc băng lời nói từ Micro...");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch("/api/stt/transcribe-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Data,
            mimeType: "audio/webm",
            fileName: `Thu_Am_${new Date().toISOString().slice(11, 19).replace(/:/g, "-")}.webm`,
            auto_translate: autoTranslate
          })
        });

        const data = await safeParseJson(res);
        if (!res.ok || data.status === 0 || !data.result) {
          throw new Error(data.error_message || "Không thể bóc băng đoạn ghi âm.");
        }

        const result: TranscribeResult = data.result;
        setCurrentResult(result);
        if (result.translatedText && result.isTranslatedToVietnamese) {
          setActiveResultTab("vietnamese");
        } else if (result.detectedLanguageCode === "vi") {
          setActiveResultTab("vietnamese");
        } else {
          setActiveResultTab("original");
        }
        setHistory((prev) => [result, ...prev.filter((h) => h.id !== result.id)].slice(0, 30));
      } catch (err: any) {
        setError(err.message || "Lỗi khi xử lý giọng nói thu âm.");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(blob);
  };

  // On-demand Vietnamese Translation with AI
  const handleTranslateToVietnamese = async () => {
    if (!currentResult) return;
    setIsTranslating(true);
    setError(null);
    try {
      const srcText = currentResult.originalText || currentResult.text;
      const srcSegments = currentResult.originalSegments || currentResult.segments;

      const res = await fetch("/api/stt/detect-and-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: srcText,
          segments: srcSegments
        })
      });

      const data = await safeParseJson(res);
      if (!res.ok || data.status === 0 || !data.result) {
        throw new Error(data.error_message || "Không thể dịch sang Tiếng Việt.");
      }

      const trans = data.result;
      const updated: TranscribeResult = {
        ...currentResult,
        detectedLanguage: trans.detectedLanguage,
        detectedLanguageCode: trans.detectedLanguageCode,
        translatedText: trans.translatedText,
        translatedSegments: trans.translatedSegments,
        translatedSrtContent: trans.translatedSrtContent,
        isTranslatedToVietnamese: true,
        text: trans.translatedText,
        segments: trans.translatedSegments,
        srtContent: trans.translatedSrtContent
      };

      setCurrentResult(updated);
      setActiveResultTab("vietnamese");
      setHistory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (e: any) {
      setError(e.message || "Lỗi khi dịch văn bản sang Tiếng Việt.");
    } finally {
      setIsTranslating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text);
    } catch {
      // ignore
    }
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => prev.filter((item) => item.id !== id));
    if (currentResult?.id === id) {
      setCurrentResult(null);
    }
  };

  const handleDirectGenerateVoice = async () => {
    if (!currentResult) return;
    const textToSpeak = (activeResultTab === "original" && currentResult.originalText)
      ? currentResult.originalText
      : (currentResult.translatedText || currentResult.text);
    if (!textToSpeak || !textToSpeak.trim()) return;

    setIsGeneratingVoice(true);
    setVoiceGenError(null);
    setGeneratedAudioUrl(null);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_text: textToSpeak,
          voice_code: selectedVoiceForSend,
          model_id: "everai-v1.6",
          audio_type: "mp3",
          speed_rate: 1.0,
          pitch_rate: 1.0,
          volume: 100,
          generate_srt: false
        })
      });
      const data = await safeParseJson(response);
      if (!response.ok || data.status !== 1 || !data.result?.audio_link) {
        throw new Error(data.error_message || "Không thể tạo giọng nói từ nội dung này.");
      }
      setGeneratedAudioUrl(data.result.audio_link);
    } catch (err: any) {
      setVoiceGenError(err.message || "Lỗi tạo giọng nói.");
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleMergeIntoVideo = async () => {
    if (!generatedAudioUrl) return;

    if (!currentResult?.videoTempId) {
      if (onNavigateToDubbing) {
        onNavigateToDubbing(generatedAudioUrl);
      }
      return;
    }

    setIsMergingVideo(true);
    setMergeError(null);
    setMergedVideoResult(null);

    try {
      const res = await fetch("/api/video/merge-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoTempId: currentResult.videoTempId,
          audioUrl: generatedAudioUrl,
          mode: "replace",
          timeSync: "loop_video"
        })
      });

      const data = await safeParseJson(res);
      if (!res.ok || data.status !== 1 || !data.result) {
        throw new Error(data.error_message || "Không thể ghép âm thanh vào video.");
      }

      setMergedVideoResult(data.result);
    } catch (err: any) {
      setMergeError(err.message || "Lỗi khi ghép âm thanh vào video.");
    } finally {
      setIsMergingVideo(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/20 border border-neutral-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Phân Tích Âm Thanh Thực Tế
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-neutral-400 bg-neutral-800 border border-neutral-700">
                Speech-To-Text AI
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Phân Tích Âm Thanh & Chuyển Giọng Nói Video Thành Văn Bản
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
              Hệ thống dùng <span className="text-amber-400 font-semibold">FFmpeg tách riêng luồng âm thanh</span> trong video và sử dụng trí tuệ nhân tạo lắng nghe phổ giọng nói thực tế để chuyển thành văn bản tiếng Việt chính xác 100%, tự động tạo file phụ đề SRT cho CapCut / Premiere.
            </p>
          </div>

          {/* Three Clean Mode Switchers */}
          <div className="flex items-center gap-1.5 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800 shrink-0">
            <button
              onClick={() => setInputMode("file")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                inputMode === "file"
                  ? "bg-amber-500 text-neutral-950 shadow-md font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Tải Video / Audio</span>
            </button>

            <button
              onClick={() => setInputMode("url")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                inputMode === "url"
                  ? "bg-amber-500 text-neutral-950 shadow-md font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Dán Link Video</span>
            </button>

            <button
              onClick={() => setInputMode("mic")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                inputMode === "mic"
                  ? "bg-amber-500 text-neutral-950 shadow-md font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Ghi Âm Micro</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Action Box */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
        {/* MODE 1: FILE UPLOAD (Recommended for 100% reliability on any video) */}
        {inputMode === "file" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-300 font-medium mb-1">
              <span className="flex items-center gap-2">
                <Video className="w-4 h-4 text-amber-400" />
                <span>Kéo thả video TikTok, YouTube tải về, hoặc file ghi âm để tách âm thanh</span>
              </span>
              <span className="text-[11px] text-amber-400 font-semibold">Hỗ trợ video lớn (lên đến 5GB, tự động tách âm thanh bằng FFmpeg)</span>
            </div>

            <div className="border-2 border-dashed border-neutral-700 hover:border-amber-500/60 rounded-2xl p-8 text-center bg-neutral-950/50 transition-all group">
              <input
                type="file"
                id="audio-file-input"
                accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/*,audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="audio-file-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-3.5"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 group-hover:scale-105 transition-transform flex items-center justify-center text-amber-400 shadow-inner">
                  <Video className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-100 group-hover:text-amber-400 transition-colors">
                    Nhấp để chọn video hoặc kéo thả tệp vào đây
                  </p>
                  <p className="text-xs text-neutral-400 mt-1 max-w-lg mx-auto">
                    Hệ thống sẽ dùng <span className="text-amber-400 font-mono">FFmpeg</span> tách riêng luồng âm thanh từ video, lọc tạp âm và AI bóc băng giọng nói thành văn bản chuẩn từng từ.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <span className="px-3 py-1 rounded-lg bg-neutral-800 text-neutral-200 text-xs font-semibold border border-neutral-700 group-hover:bg-neutral-700 transition-colors">
                    Chọn tệp Video / Âm Thanh
                  </span>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    .MP4 • .MOV • .WEBM • .MP3 • .WAV • .M4A
                  </span>
                </div>
              </label>
            </div>

            {/* Split 10-minute banner shortcut */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-neutral-900 to-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">
                    Tự Động Cắt Chia Video 10 Phút / Phần (Hỗ trợ tệp 5GB)
                  </p>
                  <p className="text-neutral-400 text-[11px]">
                    Tự động chia nhỏ video dài thành các phần 10 phút, bóc băng, dịch tiếng Việt chuẩn và lồng tiếng AI trơn tru.
                  </p>
                </div>
              </div>
              {onNavigateToDubbing && (
                <button
                  type="button"
                  onClick={() => onNavigateToDubbing()}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-md"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Mở Trình Cắt 10 Phút</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* MODE 2: URL PASTE (YouTube & TikTok) */}
        {inputMode === "url" && (
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-300 font-medium mb-2">
              <label htmlFor="url-input" className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-amber-400" />
                <span>Nhập đường link URL YouTube hoặc TikTok</span>
              </label>

              {detectedPlatform && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                  {detectedPlatform === "youtube" && (
                    <span className="flex items-center gap-1 text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-800/40">
                      <Youtube className="w-3 h-3" /> YouTube Video
                    </span>
                  )}
                  {detectedPlatform === "tiktok" && (
                    <span className="flex items-center gap-1 text-pink-400 bg-pink-950/40 px-2 py-0.5 rounded border border-pink-800/40">
                      <Video className="w-3 h-3" /> TikTok Video
                    </span>
                  )}
                  {detectedPlatform === "media" && (
                    <span className="flex items-center gap-1 text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-800/40">
                      <FileAudio className="w-3 h-3" /> Direct Audio
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="url-input"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/@... hoặc https://www.youtube.com/watch?v=..."
                  className="w-full pl-3.5 pr-20 py-3 rounded-xl bg-neutral-950 border border-neutral-700 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isLoading) handleTranscribeUrl();
                  }}
                />
                <button
                  type="button"
                  onClick={handlePaste}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs rounded-md bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
                >
                  Dán link
                </button>
              </div>

              <button
                onClick={() => handleTranscribeUrl()}
                disabled={isLoading || !url.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 font-bold text-sm hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-amber-500/20"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang bóc băng...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Phân tích âm thanh</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Sample Links */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-neutral-500">Mẫu thử nhanh:</span>
              {SAMPLE_URLS.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setUrl(sample.url);
                    handleTranscribeUrl(sample.url);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-amber-400 border border-neutral-700 text-[11px] transition-colors flex items-center gap-1.5"
                >
                  {sample.platform === "youtube" ? (
                    <Youtube className="w-3 h-3 text-red-400" />
                  ) : (
                    <Video className="w-3 h-3 text-pink-400" />
                  )}
                  <span>{sample.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MODE 3: DIRECT MICROPHONE RECORDING */}
        {inputMode === "mic" && (
          <div className="p-8 rounded-2xl bg-neutral-950/60 border border-neutral-800 text-center space-y-4">
            <div className="flex flex-col items-center justify-center">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? "bg-red-500/20 border-2 border-red-500 animate-pulse text-red-400 shadow-lg shadow-red-500/20"
                    : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                }`}
              >
                <Mic className="w-8 h-8" />
              </div>

              {isRecording ? (
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                    <span className="text-base font-mono font-bold text-red-400">
                      {Math.floor(recordingSeconds / 60)}:
                      {recordingSeconds % 60 < 10 ? "0" : ""}
                      {recordingSeconds % 60}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">Đang lắng nghe giọng nói của bạn qua micro...</p>
                </div>
              ) : (
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-bold text-white">Thu âm giọng nói trực tiếp qua micro</p>
                  <p className="text-xs text-neutral-400">
                    Bấm nút bắt đầu để đọc lời thoại, AI sẽ nhận diện tiếng Việt và chuyển thành văn bản tức thì.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-3 pt-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-red-500/20"
                >
                  <Mic className="w-4 h-4" />
                  <span>Bắt đầu thu âm</span>
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-6 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs border border-neutral-700 transition-all flex items-center gap-2"
                >
                  <Square className="w-4 h-4 text-red-400 fill-current" />
                  <span>Hoàn tất & Phân tích giọng nói</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Options Bar */}
        <div className="pt-3 border-t border-neutral-800/70 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-neutral-400 flex items-center gap-1.5">
              <span>Ngôn ngữ nhận diện:</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-neutral-950 border border-neutral-700 text-neutral-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="auto">🌐 Tự động nhận diện (Tất cả ngôn ngữ)</option>
                <option value="vi">Tiếng Việt (Chuẩn âm)</option>
                <option value="en">Tiếng Anh (English)</option>
                <option value="zh">Tiếng Trung (中文)</option>
                <option value="ja">Tiếng Nhật (日本語)</option>
                <option value="ko">Tiếng Hàn (한국어)</option>
                <option value="fr">Tiếng Pháp (Français)</option>
              </select>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none px-2.5 py-1 rounded-lg bg-neutral-950 border border-amber-500/40 text-amber-300 hover:bg-neutral-900 transition-colors">
              <input
                type="checkbox"
                checked={autoTranslate}
                onChange={(e) => setAutoTranslate(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-amber-500 bg-neutral-900 border-neutral-700 focus:ring-0 cursor-pointer accent-amber-500"
              />
              <span className="font-semibold flex items-center gap-1">
                <Languages className="w-3.5 h-3.5 text-amber-400" />
                <span>Tự động phát hiện ngôn ngữ & dịch sang Tiếng Việt</span>
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Phân tích trực tiếp sóng âm & dịch phụ đề SRT chuẩn phát thanh</span>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-red-200 text-xs flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <p className="font-semibold">Không thể xử lý yêu cầu:</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Loading Progress State */}
      {isLoading && (
        <div className="p-8 rounded-2xl bg-neutral-900 border border-neutral-800 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {loadingStep}
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Hệ thống đang trích xuất sóng âm thanh thực tế, khử tạp âm và chuyển đổi giọng nói thành văn bản.
            </p>
          </div>
          <div className="max-w-md mx-auto bg-neutral-950 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 animate-pulse w-3/4 rounded-full"></div>
          </div>
        </div>
      )}

      {/* Result Display */}
      {currentResult && !isLoading && (
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-6 animate-in fade-in duration-300">
          {/* Metadata Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center gap-3.5 min-w-0">
              {currentResult.thumbnail && (
                <img
                  src={currentResult.thumbnail}
                  alt={currentResult.title}
                  className="w-20 h-14 object-cover rounded-lg border border-neutral-800 shrink-0"
                />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    currentResult.platform === "youtube"
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : currentResult.platform === "tiktok"
                      ? "bg-pink-500/10 text-pink-400 border border-pink-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}>
                    {currentResult.platform === "youtube" && <Youtube className="w-3 h-3" />}
                    {currentResult.platform === "tiktok" && <Video className="w-3 h-3" />}
                    {currentResult.platform.includes("file") && <FileAudio className="w-3 h-3" />}
                    {currentResult.platform}
                  </span>
                  {currentResult.durationFormatted && (
                    <span className="text-xs font-mono text-neutral-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-neutral-500" />
                      {currentResult.durationFormatted}
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-xl">
                  {currentResult.title}
                </h3>
                {currentResult.author && (
                  <p className="text-xs text-neutral-400 truncate mt-0.5">
                    Nguồn: <span className="text-neutral-200">{currentResult.author}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-4 text-xs font-mono text-neutral-400 shrink-0 border-t sm:border-t-0 sm:border-l border-neutral-800 pt-3 sm:pt-0 sm:pl-4">
              <div>
                <span className="text-neutral-500 block text-[10px]">Ký tự</span>
                <span className="text-white font-bold">{currentResult.characterCount}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Số từ</span>
                <span className="text-white font-bold">{currentResult.wordCount}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Đoạn phụ đề</span>
                <span className="text-amber-400 font-bold">{currentResult.segments.length}</span>
              </div>
            </div>
          </div>

          {/* Language Detection & Full Vietnamese Translation Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-amber-950/30 border border-neutral-800 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25 flex items-center gap-1.5 shadow-sm">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>Phát hiện ngôn ngữ:</span>
                  <strong className="text-white font-extrabold">{currentResult.detectedLanguage || "Tự động"}</strong>
                  {currentResult.detectedLanguageCode && (
                    <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300 font-mono border border-neutral-700">
                      {currentResult.detectedLanguageCode.toUpperCase()}
                    </span>
                  )}
                </span>

                {currentResult.isTranslatedToVietnamese ? (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1.5">
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đã dịch toàn bộ sang Tiếng Việt chuẩn xác</span>
                  </span>
                ) : currentResult.detectedLanguageCode === "vi" ? (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center gap-1.5">
                    <span>🇻🇳 Giọng nói gốc là Tiếng Việt chuẩn</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-amber-400" />
                    <span>Đang hiển thị ngôn ngữ gốc</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Hệ thống AI tự động phát hiện ngôn ngữ của video/âm thanh và dịch toàn bộ nội dung cùng phụ đề SRT sang tiếng Việt chuẩn truyền hình (hỗ trợ tối đa 25,000 ký tự).
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleTranslateToVietnamese}
                disabled={isTranslating}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
                  isTranslating
                    ? "bg-neutral-800 text-neutral-400 cursor-not-allowed border border-neutral-700"
                    : "bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 hover:brightness-110 active:scale-[0.98] shadow-amber-500/20"
                }`}
              >
                {isTranslating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Đang phát hiện & dịch sang Tiếng Việt...</span>
                  </>
                ) : (
                  <>
                    <Languages className="w-4 h-4" />
                    <span>{currentResult.isTranslatedToVietnamese ? "Dịch lại toàn bộ sang Tiếng Việt" : "🌐 Phát hiện ngôn ngữ & Dịch toàn bộ sang Tiếng Việt"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 10-Minute Video Split Recommendation Banner */}
          {onNavigateToDubbing && (
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-200">
                    Video dài trên 10 phút hoặc dung lượng lớn?
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    Tự động chia thành các phần 10 phút, bóc băng, dịch thuật và tách chia đoạn lồng tiếng AI theo đúng từng phần.
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigateToDubbing(undefined, currentResult.videoTempId)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 hover:from-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1.5 transition-all shrink-0"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Chia 10 Phút & Lồng Tiếng Từng Phần →</span>
              </button>
            </div>
          )}

          {/* Action Toolbar & Send to Studio */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Lồng tiếng lại bằng giọng Đỗ Minh Hiếu AI:
              </span>
              <select
                value={selectedVoiceForSend}
                onChange={(e) => setSelectedVoiceForSend(e.target.value)}
                className="bg-neutral-950 border border-amber-500/40 text-amber-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none font-medium"
              >
                <option value="vi_male_dominhhieu_mn">Đỗ Minh Hiếu (Miền Nam)</option>
                <option value="vi_male_dominhhieu_mb">Đỗ Minh Hiếu (Miền Bắc)</option>
                <option value="vi_male_namhongkong_mn">Đỗ Minh Hiếu HK (Hong Kong)</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDirectGenerateVoice}
                disabled={isGeneratingVoice}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-neutral-950 font-bold text-xs hover:brightness-110 active:scale-[0.98] disabled:opacity-60 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                {isGeneratingVoice ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tạo giọng đọc...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Tạo Giọng Đọc AI Ngay</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  const textToSend = (activeResultTab === "original" && currentResult.originalText)
                    ? currentResult.originalText
                    : (currentResult.translatedText || currentResult.text);
                  onSendToStudio(textToSend, selectedVoiceForSend);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 font-bold text-xs hover:brightness-110 transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <span>Chỉnh trong TTS Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  let textToCopy = "";
                  if (activeResultTab === "vietnamese") textToCopy = currentResult.translatedText || currentResult.text;
                  else if (activeResultTab === "original") textToCopy = currentResult.originalText || currentResult.text;
                  else if (activeResultTab === "srt_vi") textToCopy = currentResult.translatedSrtContent || currentResult.srtContent;
                  else if (activeResultTab === "srt_orig") textToCopy = currentResult.originalSrtContent || currentResult.srtContent;
                  else if (activeResultTab === "bilingual") {
                    const viSegs = currentResult.translatedSegments || currentResult.segments;
                    const origSegs = currentResult.originalSegments || currentResult.segments;
                    textToCopy = viSegs.map((s, idx) => {
                      const o = origSegs[idx]?.text || "";
                      return `[${s.startTime} --> ${s.endTime}]\n${currentResult.detectedLanguage || "Gốc"}: ${o}\nTiếng Việt: ${s.text}\n`;
                    }).join("\n");
                  }
                  copyToClipboard(textToCopy);
                }}
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors flex items-center gap-1.5"
                title="Sao chép nội dung tab hiện tại"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Đã chép" : "Sao chép"}</span>
              </button>

              <button
                onClick={() => {
                  const isOrig = activeResultTab === "original" || activeResultTab === "srt_orig";
                  const content = isOrig ? (currentResult.originalText || currentResult.text) : (currentResult.translatedText || currentResult.text);
                  const suffix = isOrig ? "goc" : "tieng_viet";
                  downloadTextFile(content, `${currentResult.title || "transcript"}_${suffix}.txt`);
                }}
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors flex items-center gap-1.5"
                title="Tải văn bản .TXT"
              >
                <Download className="w-3.5 h-3.5" />
                <span>File .TXT</span>
              </button>

              <button
                onClick={() => {
                  const isOrig = activeResultTab === "original" || activeResultTab === "srt_orig";
                  const content = isOrig ? (currentResult.originalSrtContent || currentResult.srtContent) : (currentResult.translatedSrtContent || currentResult.srtContent);
                  const suffix = isOrig ? "goc" : "tieng_viet";
                  downloadTextFile(content, `${currentResult.title || "subtitles"}_${suffix}.srt`);
                }}
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-semibold border border-neutral-700 transition-colors flex items-center gap-1.5"
                title="Tải phụ đề .SRT cho CapCut, Premiere"
              >
                <Download className="w-3.5 h-3.5" />
                <span>File .SRT</span>
              </button>
            </div>
          </div>

          {/* Generated Speech Player Card (if generated directly) */}
          {generatedAudioUrl && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Đã tạo thành công giọng đọc Đỗ Minh Hiếu AI
                  </span>
                </div>

                <a
                  href={generatedAudioUrl}
                  download="do_minh_hieu_voice.mp3"
                  className="px-3 py-1 rounded-lg bg-emerald-500 text-neutral-950 font-bold text-xs hover:brightness-110 flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải File Âm Thanh .MP3</span>
                </a>
              </div>

              <audio
                controls
                autoPlay
                src={generatedAudioUrl}
                className="w-full h-10 rounded-lg filter invert hue-rotate-180 brightness-90"
              />

              <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleMergeIntoVideo}
                    disabled={isMergingVideo}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 font-bold text-xs hover:brightness-110 active:scale-[0.98] disabled:opacity-60 transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                  >
                    {isMergingVideo ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>FFmpeg đang ghép giọng đọc vào video...</span>
                      </>
                    ) : (
                      <>
                        <Film className="w-3.5 h-3.5" />
                        <span>🎬 Ghép Giọng Này Vào Video Vừa Tải Lên</span>
                      </>
                    )}
                  </button>

                  {onNavigateToDubbing && (
                    <button
                      onClick={() => onNavigateToDubbing(generatedAudioUrl, currentResult?.videoTempId)}
                      className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors flex items-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>Mở Xưởng Lồng Tiếng Chuyên Sâu</span>
                    </button>
                  )}
                </div>

                <span className="text-[11px] text-neutral-400">
                  Tự động đồng bộ thời lượng & thay thế âm thanh gốc bằng FFmpeg
                </span>
              </div>

              {/* Dubbed Video Preview inside STT tab */}
              {mergedVideoResult && (
                <div className="mt-3 p-4 rounded-xl bg-neutral-950 border border-amber-500/40 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5 text-amber-400" />
                        Video Đã Lồng Tiếng Thành Công ({mergedVideoResult.durationFormatted})
                      </span>
                    </div>

                    <a
                      href={mergedVideoResult.download_url}
                      download="video_da_long_tieng_dominhhieu.mp4"
                      className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 font-bold text-xs hover:brightness-110 flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải Video MP4 Về Máy ({mergedVideoResult.fileSizeFormatted})</span>
                    </a>
                  </div>

                  <div className="rounded-xl overflow-hidden bg-black border border-neutral-800 aspect-video max-w-xl mx-auto shadow-xl">
                    <video
                      src={mergedVideoResult.video_url}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {mergeError && (
                <div className="mt-2 p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{mergeError}</span>
                </div>
              )}
            </div>
          )}

          {voiceGenError && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{voiceGenError}</span>
            </div>
          )}

          {/* 5-Tab Content Navigation & Subtitle Suite */}
          <div>
            <div className="flex flex-wrap items-center gap-1.5 border-b border-neutral-800 mb-4 pb-2.5">
              <button
                onClick={() => setActiveResultTab("vietnamese")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeResultTab === "vietnamese"
                    ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 font-extrabold"
                    : "text-neutral-400 hover:text-white bg-neutral-950/60 hover:bg-neutral-800 border border-neutral-800"
                }`}
              >
                <span>🇻🇳</span>
                <span>Bản Dịch Tiếng Việt</span>
                {currentResult.isTranslatedToVietnamese && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${activeResultTab === "vietnamese" ? "bg-neutral-900 text-amber-300" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"}`}>
                    AI
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveResultTab("original")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeResultTab === "original"
                    ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 font-extrabold"
                    : "text-neutral-400 hover:text-white bg-neutral-950/60 hover:bg-neutral-800 border border-neutral-800"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Lời Thoại Gốc ({currentResult.detectedLanguageCode?.toUpperCase() || "GỐC"})</span>
              </button>

              <button
                onClick={() => setActiveResultTab("srt_vi")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeResultTab === "srt_vi"
                    ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 font-extrabold"
                    : "text-neutral-400 hover:text-white bg-neutral-950/60 hover:bg-neutral-800 border border-neutral-800"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Phụ Đề SRT Tiếng Việt</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeResultTab === "srt_vi" ? "bg-neutral-900 text-amber-300" : "bg-neutral-800 text-neutral-400"}`}>
                  {(currentResult.translatedSegments || currentResult.segments).length}
                </span>
              </button>

              <button
                onClick={() => setActiveResultTab("srt_orig")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeResultTab === "srt_orig"
                    ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 font-extrabold"
                    : "text-neutral-400 hover:text-white bg-neutral-950/60 hover:bg-neutral-800 border border-neutral-800"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Phụ Đề SRT Gốc</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeResultTab === "srt_orig" ? "bg-neutral-900 text-amber-300" : "bg-neutral-800 text-neutral-400"}`}>
                  {(currentResult.originalSegments || currentResult.segments).length}
                </span>
              </button>

              <button
                onClick={() => setActiveResultTab("bilingual")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeResultTab === "bilingual"
                    ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 font-extrabold"
                    : "text-neutral-400 hover:text-white bg-neutral-950/60 hover:bg-neutral-800 border border-neutral-800"
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>So Sánh Song Ngữ</span>
              </button>
            </div>

            {/* TAB 1: VIETNAMESE TRANSLATION */}
            {activeResultTab === "vietnamese" && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                      <span>🇻🇳</span> Bản dịch Tiếng Việt toàn diện
                    </span>
                    {currentResult.isTranslatedToVietnamese && (
                      <span className="text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 flex items-center gap-1">
                        <CheckCheck className="w-3 h-3" /> Đã tối ưu cho lồng tiếng
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono">
                    {(currentResult.translatedText || currentResult.text).length} ký tự • {(currentResult.translatedText || currentResult.text).split(/\s+/).filter(Boolean).length} từ
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm sm:text-base leading-relaxed whitespace-pre-wrap max-h-[460px] overflow-y-auto selection:bg-amber-500/30 font-sans shadow-inner">
                  {currentResult.translatedText || currentResult.text}
                </div>
              </div>
            )}

            {/* TAB 2: ORIGINAL TRANSCRIPTION */}
            {activeResultTab === "original" && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-amber-400" />
                      Ngôn ngữ gốc ({currentResult.detectedLanguage || "Chưa xác định"})
                    </span>
                    {currentResult.detectedLanguageCode && (
                      <span className="text-[10px] font-mono uppercase bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-300">
                        {currentResult.detectedLanguageCode}
                      </span>
                    )}
                  </div>

                  {!currentResult.isTranslatedToVietnamese && currentResult.detectedLanguageCode !== "vi" && (
                    <button
                      onClick={handleTranslateToVietnamese}
                      disabled={isTranslating}
                      className="text-xs text-amber-300 hover:text-amber-200 font-semibold underline flex items-center gap-1"
                    >
                      <Languages className="w-3 h-3" />
                      <span>Dịch văn bản này sang Tiếng Việt ngay</span>
                    </button>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap max-h-[460px] overflow-y-auto selection:bg-amber-500/30 font-sans shadow-inner">
                  {currentResult.originalText || currentResult.text}
                </div>
              </div>
            )}

            {/* TAB 3: TIMED VIETNAMESE SRT SUBTITLES */}
            {activeResultTab === "srt_vi" && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                  <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Phụ đề SRT Tiếng Việt theo từng mốc thời gian chuẩn
                  </span>
                  <span className="text-[11px] font-mono text-neutral-500">
                    Sẵn sàng nhập trực tiếp vào CapCut, Premiere, DaVinci
                  </span>
                </div>

                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {(currentResult.translatedSegments || currentResult.segments).map((seg) => (
                    <div
                      key={seg.index}
                      className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800/80 hover:border-amber-500/40 flex items-start justify-between gap-3 text-xs transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono text-[10px] font-bold">
                            #{seg.index}
                          </span>
                          <span className="font-mono text-[11px] text-amber-400/90 font-medium bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                            {seg.startTime} ➔ {seg.endTime}
                          </span>
                        </div>
                        <p className="text-neutral-100 font-medium leading-relaxed">{seg.text}</p>
                      </div>

                      <button
                        onClick={() => copyToClipboard(seg.text)}
                        className="text-neutral-500 hover:text-amber-400 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors shrink-0"
                        title="Sao chép đoạn này"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: TIMED ORIGINAL SRT SUBTITLES */}
            {activeResultTab === "srt_orig" && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                  <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-neutral-400" />
                    Phụ đề SRT gốc theo ngôn ngữ người nói
                  </span>
                  <span className="text-[11px] font-mono text-neutral-500">
                    {(currentResult.originalSegments || currentResult.segments).length} đoạn mốc thời gian
                  </span>
                </div>

                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {(currentResult.originalSegments || currentResult.segments).map((seg) => (
                    <div
                      key={seg.index}
                      className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700 flex items-start justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono text-[10px] font-bold">
                            #{seg.index}
                          </span>
                          <span className="font-mono text-[11px] text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                            {seg.startTime} ➔ {seg.endTime}
                          </span>
                        </div>
                        <p className="text-neutral-300 leading-relaxed font-sans">{seg.text}</p>
                      </div>

                      <button
                        onClick={() => copyToClipboard(seg.text)}
                        className="text-neutral-500 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors shrink-0"
                        title="Sao chép đoạn gốc này"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: BILINGUAL SIDE-BY-SIDE COMPARISON */}
            {activeResultTab === "bilingual" && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                  <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Columns className="w-3.5 h-3.5 text-amber-400" />
                    So sánh song ngữ từng câu khớp mốc thời gian
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {currentResult.detectedLanguage || "Ngôn ngữ gốc"} ➔ Tiếng Việt
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {(currentResult.translatedSegments || currentResult.segments).map((viSeg, idx) => {
                    const origSeg = (currentResult.originalSegments && currentResult.originalSegments[idx]) || currentResult.segments[idx];
                    return (
                      <div
                        key={viSeg.index}
                        className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-500/30 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-neutral-900 pb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono text-[10px] font-bold">
                              #{viSeg.index}
                            </span>
                            <span className="font-mono text-[11px] text-amber-400/90 font-medium">
                              {viSeg.startTime} ➔ {viSeg.endTime}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => copyToClipboard(`Gốc: ${origSeg?.text || ""}\nDịch: ${viSeg.text}`)}
                              className="text-neutral-500 hover:text-amber-400 p-1 rounded hover:bg-neutral-800 transition-colors"
                              title="Sao chép cặp song ngữ này"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                          {/* Original Left Column */}
                          <div className="p-2.5 rounded-lg bg-neutral-900/70 border border-neutral-800/80">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1 flex items-center gap-1">
                              <Globe className="w-3 h-3 text-neutral-400" />
                              <span>{currentResult.detectedLanguage || "Ngôn ngữ gốc"}</span>
                            </div>
                            <p className="text-neutral-300 leading-relaxed font-sans">{origSeg?.text || "—"}</p>
                          </div>

                          {/* Vietnamese Right Column */}
                          <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1">
                              <span>🇻🇳 Tiếng Việt dịch thuật</span>
                            </div>
                            <p className="text-white font-medium leading-relaxed font-sans">{viSeg.text}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Section */}
      {history.length > 0 && (
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Lịch sử bóc băng gần đây ({history.length})</span>
            </h3>

            <button
              onClick={() => setHistory([])}
              className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
            >
              Xóa lịch sử
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.slice(0, 6).map((item) => (
              <div
                key={item.id}
                onClick={() => setCurrentResult(item)}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all hover:border-amber-500/50 ${
                  currentResult?.id === item.id
                    ? "bg-neutral-800 border-amber-500/60 shadow-md"
                    : "bg-neutral-950 border-neutral-800 hover:bg-neutral-900"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      item.platform === "youtube"
                        ? "bg-red-500/10 text-red-400"
                        : item.platform === "tiktok"
                        ? "bg-pink-500/10 text-pink-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {item.platform}
                    </span>
                    {item.detectedLanguageCode && item.detectedLanguageCode !== "vi" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {item.detectedLanguageCode.toUpperCase()} ➔ VI
                      </span>
                    )}
                    {item.detectedLanguageCode === "vi" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        VI
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => deleteHistoryItem(item.id, e)}
                    className="text-neutral-500 hover:text-red-400 p-0.5 transition-colors"
                    title="Xóa bản ghi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h4 className="text-xs font-bold text-neutral-200 line-clamp-1 mb-1">
                  {item.title}
                </h4>
                <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                  {item.text}
                </p>

                <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                  <span>{item.wordCount} từ</span>
                  <span>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
