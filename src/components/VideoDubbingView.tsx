import React, { useState, useRef, useEffect } from "react";
import {
  Film,
  Music,
  Sliders,
  Play,
  Pause,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
  Check,
  AlertCircle,
  Clock,
  Layers,
  Repeat,
  FileVideo,
  FileAudio,
  Scissors,
  Globe,
  Wand2,
  CheckCircle2,
  ChevronRight,
  PlayCircle,
  Loader2,
  Link2,
  ExternalLink,
  Split,
  FileText,
  RotateCcw,
  CheckCheck
} from "lucide-react";
import { DubbedVideoResult, VideoPartItem, SplitPartsResult } from "../types/video";
import { TTSJob } from "../types/tts";
import { ALL_VOICES, VIETNAMESE_VOICES, INTERNATIONAL_VOICES } from "../data/voices";
import { safeParseJson } from "../utils/apiHelper";
import { uploadFileInChunks, formatFileSize } from "../utils/chunkedUpload";

interface VideoDubbingViewProps {
  initialAudioUrl?: string;
  initialVideoTempId?: string;
  historyJobs?: TTSJob[];
  customApiKey?: string;
}

export const VideoDubbingView: React.FC<VideoDubbingViewProps> = ({
  initialAudioUrl,
  initialVideoTempId,
  historyJobs = [],
  customApiKey
}) => {
  // Main view mode: "split_parts" (10-minute auto splitting) or "single" (single video)
  const [activeDubMode, setActiveDubMode] = useState<"split_parts" | "single">("split_parts");

  // ==========================================
  // SPLIT 10-MINUTE PARTS STATE
  // ==========================================
  const [splitSourceType, setSplitSourceType] = useState<"upload" | "url">("upload");
  const [splitUrl, setSplitUrl] = useState<string>("");
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [splitPartDurationSec, setSplitPartDurationSec] = useState<number>(600); // 10 minutes default (600s)

  // Splitting & Upload Progress State
  const [isSplitting, setIsSplitting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadProgressText, setUploadProgressText] = useState<string>("");
  const [splitStepMessage, setSplitStepMessage] = useState<string>("");
  const [splitError, setSplitError] = useState<string | null>(null);

  const [splitResult, setSplitResult] = useState<SplitPartsResult | null>(null);
  const [parts, setParts] = useState<VideoPartItem[]>([]);
  const [selectedBatchVoice, setSelectedBatchVoice] = useState<string>("vi_male_nhanvatnam_default");

  // Batch actions state
  const [isBatchTranscribing, setIsBatchTranscribing] = useState<boolean>(false);
  const [isBatchDubbing, setIsBatchDubbing] = useState<boolean>(false);
  const [isMergingAll, setIsMergingAll] = useState<boolean>(false);
  const [mergedFullVideo, setMergedFullVideo] = useState<{
    video_url: string;
    download_url: string;
    duration: number;
    durationFormatted: string;
    fileSizeFormatted: string;
  } | null>(null);

  // ==========================================
  // SINGLE VIDEO DUBBING STATE
  // ==========================================
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoBase64, setVideoBase64] = useState<string | null>(null);
  const [videoTempId, setVideoTempId] = useState<string | undefined>(initialVideoTempId);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isVideoUploading, setIsVideoUploading] = useState<boolean>(false);

  // Audio state
  const [audioSourceType, setAudioSourceType] = useState<"preset" | "upload" | "history">("preset");
  const [selectedAudioUrl, setSelectedAudioUrl] = useState<string>(initialAudioUrl || "");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioTempId, setAudioTempId] = useState<string | null>(null);
  const [isAudioUploading, setIsAudioUploading] = useState<boolean>(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  // Quick synth state for Preset tab
  const [quickSynthText, setQuickSynthText] = useState<string>(
    "Chào các bạn, hôm nay tôi sẽ hướng dẫn các bạn cách lồng tiếng video chuẩn và hay nhất."
  );
  const [dubVoiceCode, setDubVoiceCode] = useState<string>("vi_male_nhanvatnam_default");
  const [isQuickSynthing, setIsQuickSynthing] = useState<boolean>(false);

  // Merge options
  const [mergeMode, setMergeMode] = useState<"replace" | "ducking">("replace");
  const [timeSync, setTimeSync] = useState<"loop_video" | "shortest" | "keep_video">("loop_video");
  const [voiceVolume, setVoiceVolume] = useState<number>(1.0);
  const [bgVolume, setBgVolume] = useState<number>(0.15);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("Đang khởi tạo FFmpeg...");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DubbedVideoResult | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Update if initialAudioUrl changes
  useEffect(() => {
    if (initialAudioUrl) {
      setSelectedAudioUrl(initialAudioUrl);
      setAudioSourceType("preset");
    }
  }, [initialAudioUrl]);

  useEffect(() => {
    if (initialVideoTempId) {
      setVideoTempId(initialVideoTempId);
    }
  }, [initialVideoTempId]);

  // Format file size utility
  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Upload file with live real-time progress tracking
  const uploadFileWithProgress = (
    file: File,
    onProgress: (percent: number, loadedStr: string, totalStr: string) => void
  ): Promise<{ tempId: string; size: number }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/video/upload-asset", true);
      xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
      xhr.setRequestHeader("x-filename", encodeURIComponent(file.name));

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          onProgress(percent, formatFileSize(event.loaded), formatFileSize(event.total));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.status === 1 && data.tempId) {
              resolve({ tempId: data.tempId, size: data.size });
            } else {
              reject(new Error(data.error_message || "Máy chủ không trả về mã tệp video."));
            }
          } catch {
            reject(new Error("Dữ liệu phản hồi từ máy chủ không đúng định dạng JSON."));
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            reject(new Error(data.error_message || `Tải tệp thất bại với mã lỗi ${xhr.status}`));
          } catch {
            reject(new Error(`Tải tệp thất bại (HTTP ${xhr.status})`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error("Lỗi kết nối mạng khi tải tệp video. Vui lòng kiểm tra lại mạng."));
      };

      xhr.ontimeout = () => {
        reject(new Error("Thời gian tải tệp quá lâu (Timeout)."));
      };

      xhr.send(file);
    });
  };

  // ==========================================
  // 10-MINUTE VIDEO SPLIT HANDLERS
  // ==========================================

  // Step 1: User picks file (just selects it, does NOT auto-submit)
  const handleSelectSplitFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSplitError(null);
    setSplitFile(file);
    setMergedFullVideo(null);
    setSplitResult(null);
    setParts([]);
    setUploadProgress(0);
    setUploadProgressText("");
    e.target.value = "";
  };

  // Step 2: User explicitly clicks "NỘP VÀ BẮT ĐẦU CẮT VIDEO"
  const handleStartSplitFromFile = async () => {
    if (!splitFile) {
      setSplitError("Vui lòng chọn tệp video trước khi bấm Nộp để cắt.");
      return;
    }

    setSplitError(null);
    setIsSplitting(true);
    setUploadProgress(0);
    setUploadProgressText(`0% (0 MB / ${formatFileSize(splitFile.size)})`);
    setSplitStepMessage(`[Bước 1/2] Đang chia nhỏ tệp video "${splitFile.name}" thành các mảnh 8MB để truyền tải an toàn (không bao giờ bị lỗi 413)...`);

    try {
      // 1. Upload file in 8MB chunks (safely bypasses Cloud Run 32MB HTTP 413 limit)
      const uploadResult = await uploadFileInChunks(splitFile, (p) => {
        setUploadProgress(p.percent);
        setUploadProgressText(`${p.percent}% (Mảnh ${p.currentChunk}/${p.totalChunks} · ${p.loadedFormatted} / ${p.totalFormatted})`);
        setSplitStepMessage(`[Bước 1/2] Đang truyền tải mảnh ${p.currentChunk}/${p.totalChunks}: ${p.percent}% (${p.loadedFormatted} / ${p.totalFormatted}${p.speedFormatted ? ` - ${p.speedFormatted}` : ""})...`);
      });

      // 2. FFmpeg cut into 10-minute parts
      setUploadProgress(100);
      setSplitStepMessage("[Bước 2/2] Đã nạp video hoàn tất! Đang dùng FFmpeg phân tích độ dài & tự động cắt thành các phần 10 phút không suy hao chất lượng...");

      await executeSplitRequest({ videoTempId: uploadResult.tempId });
    } catch (err: any) {
      setSplitError(err.message || "Lỗi khi tải hoặc xử lý cắt video.");
      setIsSplitting(false);
    }
  };

  // Start split from URL
  const handleStartSplitFromUrl = async () => {
    if (!splitUrl.trim()) {
      setSplitError("Vui lòng nhập đường link video (YouTube, TikTok, Facebook, Drive, MP4).");
      return;
    }

    setSplitError(null);
    setIsSplitting(true);
    setUploadProgress(30);
    setMergedFullVideo(null);
    setSplitResult(null);
    setParts([]);
    setSplitStepMessage("[Bước 1/2] Đang kết nối và tải stream video tốc độ cao qua yt-dlp...");

    try {
      await executeSplitRequest({ url: splitUrl.trim() });
    } catch (err: any) {
      setSplitError(err.message || "Lỗi khi tải video từ link.");
      setIsSplitting(false);
    }
  };

  const executeSplitRequest = async (payload: { videoTempId?: string; url?: string }) => {
    try {
      const res = await fetch("/api/video/split-parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          partDurationSec: splitPartDurationSec
        })
      });

      const data = await safeParseJson(res);

      if (!res.ok || data.status !== 1 || !data.result) {
        throw new Error(data.error_message || "Không thể cắt chia video thành các phần 10 phút.");
      }

      const resObj: SplitPartsResult = data.result;
      setSplitResult(resObj);
      setParts(resObj.parts || []);
      setSplitStepMessage(`[Hoàn tất 100%] Đã cắt thành công ${resObj.totalParts} phần (mỗi phần 10 phút)!`);
      setUploadProgress(100);

      // Auto scroll to generated parts list
      setTimeout(() => {
        const el = document.getElementById("split-parts-list-anchor");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 250);
    } catch (err: any) {
      setSplitError(err.message || "Đã xảy ra lỗi khi cắt chia video.");
    } finally {
      setIsSplitting(false);
    }
  };

  // Transcribe & translate a single 10-minute part
  const handleTranscribePart = async (partIndex: number) => {
    const targetPart = parts.find((p) => p.partIndex === partIndex);
    if (!targetPart) return;

    setSplitError(null);
    setParts((prev) =>
      prev.map((p) => (p.partIndex === partIndex ? { ...p, status: "transcribing", error: undefined } : p))
    );

    try {
      const res = await fetch("/api/stt/transcribe-part", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioFilename: targetPart.audioFilename,
          videoTempId: targetPart.videoTempId
        })
      });

      const data = await safeParseJson(res);

      if (!res.ok || data.status !== 1 || !data.result) {
        throw new Error(data.error_message || `Không thể bóc băng Phần ${partIndex}.`);
      }

      const r = data.result;
      setParts((prev) =>
        prev.map((p) =>
          p.partIndex === partIndex
            ? {
                ...p,
                status: "transcribed",
                transcribedText: r.originalText || r.text,
                translatedText: r.translatedText || r.text,
                detectedLanguage: r.detectedLanguage,
                detectedLanguageCode: r.detectedLanguageCode,
                isTranslatedToVietnamese: r.isTranslatedToVietnamese
              }
            : p
        )
      );
    } catch (err: any) {
      setParts((prev) =>
        prev.map((p) =>
          p.partIndex === partIndex
            ? { ...p, status: "error", error: err.message || "Lỗi bóc băng" }
            : p
        )
      );
    }
  };

  // Update voice code for a specific part
  const handleUpdatePartVoice = (partIndex: number, voiceCode: string) => {
    setParts((prev) =>
      prev.map((p) => (p.partIndex === partIndex ? { ...p, voiceCode } : p))
    );
  };

  // Change default batch voice and propagate to parts that haven't been manually assigned
  const handleSelectBatchVoice = (voiceCode: string) => {
    setSelectedBatchVoice(voiceCode);
    setParts((prev) =>
      prev.map((p) => (p.voiceCode ? p : { ...p, voiceCode }))
    );
  };

  // Dub a single 10-minute part with exact chosen voice and custom API key
  const handleDubPart = async (partIndex: number, customVoice?: string) => {
    const targetPart = parts.find((p) => p.partIndex === partIndex);
    if (!targetPart) return;

    const textToDub = targetPart.translatedText || targetPart.transcribedText;
    if (!textToDub || !textToDub.trim()) {
      setSplitError(`Phần ${partIndex} chưa có nội dung lời thoại để lồng tiếng. Hãy bấm 'Bóc băng & Dịch' trước.`);
      return;
    }

    setSplitError(null);
    setParts((prev) =>
      prev.map((p) => (p.partIndex === partIndex ? { ...p, status: "dubbing", error: undefined } : p))
    );

    try {
      const voiceToUse = customVoice || targetPart.voiceCode || selectedBatchVoice;
      const effectiveApiKey = customApiKey || localStorage.getItem("everai_custom_api_key") || "";
      const res = await fetch("/api/video/dub-part", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoTempId: targetPart.videoTempId,
          textToDub: textToDub.trim(),
          voiceCode: voiceToUse,
          customApiKey: effectiveApiKey
        })
      });

      const data = await safeParseJson(res);

      if (!res.ok || data.status !== 1 || !data.result) {
        throw new Error(data.error_message || `Không thể ghép lồng tiếng Phần ${partIndex}.`);
      }

      setParts((prev) =>
        prev.map((p) =>
          p.partIndex === partIndex
            ? {
                ...p,
                status: "completed",
                dubbedVideoUrl: data.result.dubbedVideoUrl,
                downloadUrl: data.result.downloadUrl
              }
            : p
        )
      );
    } catch (err: any) {
      setParts((prev) =>
        prev.map((p) =>
          p.partIndex === partIndex
            ? { ...p, status: "error", error: err.message || "Lỗi lồng tiếng" }
            : p
        )
      );
    }
  };

  // Batch transcribe all parts sequentially
  const handleBatchTranscribeAll = async () => {
    if (parts.length === 0) return;
    setIsBatchTranscribing(true);
    setSplitError(null);

    for (const part of parts) {
      if (!part.translatedText) {
        await handleTranscribePart(part.partIndex);
      }
    }
    setIsBatchTranscribing(false);
  };

  // Batch dub all parts sequentially using each part's chosen voice
  const handleBatchDubAll = async () => {
    if (parts.length === 0) return;
    setIsBatchDubbing(true);
    setSplitError(null);

    for (const part of parts) {
      if (part.translatedText || part.transcribedText) {
        await handleDubPart(part.partIndex, part.voiceCode || selectedBatchVoice);
      }
    }
    setIsBatchDubbing(false);
  };

  // Concatenate all parts back into 1 complete video
  const handleMergeAllParts = async () => {
    if (parts.length === 0) return;
    setIsMergingAll(true);
    setSplitError(null);
    setMergedFullVideo(null);

    try {
      const filenames = parts.map((p) => {
        if (p.dubbedVideoUrl) {
          const m = p.dubbedVideoUrl.match(/\/stream\/(.+)$/);
          return m ? m[1] : p.videoTempId;
        }
        return p.videoTempId;
      });

      const res = await fetch("/api/video/merge-parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoFilenames: filenames })
      });

      const data = await safeParseJson(res);

      if (!res.ok || data.status !== 1 || !data.result) {
        throw new Error(data.error_message || "Không thể ghép các phần lại thành 1 video.");
      }

      setMergedFullVideo(data.result);
    } catch (err: any) {
      setSplitError(err.message || "Lỗi khi ghép nối các phần video.");
    } finally {
      setIsMergingAll(false);
    }
  };

  const handleUpdatePartText = (partIndex: number, newText: string) => {
    setParts((prev) =>
      prev.map((p) => (p.partIndex === partIndex ? { ...p, translatedText: newText } : p))
    );
  };

  // ==========================================
  // SINGLE VIDEO DUBBING HANDLERS
  // ==========================================
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setVideoFile(file);
    setVideoTempId(undefined);
    setVideoBase64(null);
    setResult(null);

    const localUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(localUrl);

    setIsVideoUploading(true);
    try {
      const uploadRes = await uploadFileInChunks(file, () => {});
      setVideoTempId(uploadRes.tempId);
    } catch (vErr: any) {
      console.warn("[Video Dubbing] Video upload notice:", vErr.message);
    } finally {
      setIsVideoUploading(false);
    }

    e.target.value = "";
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setAudioFile(file);
    setAudioTempId(null);
    setAudioBase64(null);

    const localUrl = URL.createObjectURL(file);
    setSelectedAudioUrl(localUrl);

    setIsAudioUploading(true);
    try {
      const uploadRes = await uploadFileInChunks(file, () => {});
      setAudioTempId(uploadRes.tempId);
    } catch (aErr: any) {
      console.warn("[Video Dubbing] Audio upload notice:", aErr.message);
    } finally {
      setIsAudioUploading(false);
    }

    e.target.value = "";
  };

  const handleQuickSynthesize = async () => {
    if (!quickSynthText.trim()) return;
    setIsQuickSynthing(true);
    setError(null);
    try {
      const resp = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_text: quickSynthText.trim(),
          voice_code: dubVoiceCode,
          model_id: "everai-v1.6",
          audio_type: "mp3"
        })
      });
      const data = await safeParseJson(resp);
      if (resp.ok && data.status === 1 && data.result?.audio_link) {
        setSelectedAudioUrl(data.result.audio_link);
        setAudioSourceType("preset");
      } else {
        throw new Error(data.error_message || "Không thể tạo giọng đọc nhanh.");
      }
    } catch (err: any) {
      setError(err.message || "Lỗi tạo giọng đọc.");
    } finally {
      setIsQuickSynthing(false);
    }
  };

  const handleStartMerge = async () => {
    let effectiveVideoTempId = videoTempId;
    let effectiveVideoBase64 = videoBase64;

    if (!effectiveVideoTempId && !effectiveVideoBase64 && videoFile) {
      setIsProcessing(true);
      setProcessingStep("Đang tải video lên máy chủ (chia nhỏ 8MB)...");
      try {
        const uploadRes = await uploadFileInChunks(videoFile, () => {});
        effectiveVideoTempId = uploadRes.tempId;
        setVideoTempId(uploadRes.tempId);
      } catch (err: any) {
        console.warn("Video upload retry error:", err);
      }
    }

    if (!effectiveVideoTempId && !effectiveVideoBase64) {
      setError("Vui lòng tải lên tệp video cần ghép âm thanh.");
      return;
    }

    const isUploadMode = audioSourceType === "upload";
    let effectiveAudioTempId = isUploadMode ? audioTempId : null;
    let effectiveAudioBase64 = isUploadMode ? audioBase64 : null;
    let effectiveAudioUrl =
      !isUploadMode && selectedAudioUrl && !selectedAudioUrl.startsWith("blob:")
        ? selectedAudioUrl
        : undefined;

    if (isUploadMode && !effectiveAudioTempId && !effectiveAudioBase64 && audioFile) {
      setIsProcessing(true);
      setProcessingStep("Đang nạp file âm thanh...");
      try {
        const uploadRes = await uploadFileInChunks(audioFile, () => {});
        effectiveAudioTempId = uploadRes.tempId;
        setAudioTempId(uploadRes.tempId);
      } catch (err: any) {
        console.warn("Audio upload retry error:", err);
      }
    }

    if (!effectiveAudioTempId && !effectiveAudioBase64 && !effectiveAudioUrl) {
      if (isUploadMode) {
        setError("Vui lòng chọn tệp âm thanh (MP3, WAV, M4A) từ máy tính.");
      } else {
        setError("Vui lòng chọn hoặc bấm 'Tạo Giọng Đọc Nhanh' để lồng tiếng vào video.");
      }
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessingStep("Đang nạp video và âm thanh vào FFmpeg...");

    const stepTimer = setInterval(() => {
      setProcessingStep((prev) => {
        if (prev.includes("Đang nạp video") || prev.includes("Đang nạp file"))
          return "Đang tách luồng & đồng bộ dải âm...";
        if (prev.includes("Đang tách")) return "Đang hòa âm & tái nén video MP4 chất lượng cao...";
        return "Đang đóng gói file video hoàn chỉnh...";
      });
    }, 2000);

    try {
      const response = await fetch("/api/video/merge-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoBase64: effectiveVideoBase64 || undefined,
          videoTempId: effectiveVideoTempId || undefined,
          audioTempId: effectiveAudioTempId || undefined,
          audioUrl: effectiveAudioUrl,
          audioBase64: effectiveAudioBase64 || undefined,
          mode: mergeMode,
          timeSync,
          voiceVolume,
          bgVolume,
          customApiKey: customApiKey || localStorage.getItem("everai_custom_api_key") || undefined
        })
      });

      const data = await safeParseJson(response);

      if (!response.ok || data.status !== 1 || !data.result) {
        throw new Error(data.error_message || "Không thể ghép âm thanh vào video.");
      }

      setResult(data.result);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi ghép video.");
    } finally {
      clearInterval(stepTimer);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/40 via-neutral-900 to-neutral-900 border border-amber-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Studio Lồng Tiếng Phim & Video Chuẩn AI EverAI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Cắt Video 10 Phút & Lồng Tiếng Từng Phần
            </h1>
            <p className="text-sm text-neutral-400 max-w-2xl leading-relaxed">
              Tự động chia video dài (hoặc dung lượng lớn tới 5GB) thành đúng từng phần 10 phút,
              bóc băng & dịch thuật sang Tiếng Việt chuẩn phát thanh, lồng tiếng AI cho từng phần và
              ghép lại thành video hoàn chỉnh. Hỗ trợ văn bản tối đa 25,000 ký tự.
            </p>
          </div>

          {/* Quick Mode Toggle */}
          <div className="flex flex-col sm:flex-row gap-2 bg-neutral-950/80 p-1.5 rounded-2xl border border-neutral-800 self-start md:self-center shrink-0">
            <button
              onClick={() => setActiveDubMode("split_parts")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeDubMode === "split_parts"
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 shadow-lg shadow-amber-500/20"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Scissors className="w-4 h-4" />
              <span>Cắt 10 Phút & Tách Lồng Tiếng</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-neutral-950/20 text-neutral-900 uppercase">
                Khuyên Dùng
              </span>
            </button>

            <button
              onClick={() => setActiveDubMode("single")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeDubMode === "single"
                  ? "bg-neutral-800 text-white shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Ghép Video Đơn</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-950/50 border border-red-800/60 text-red-200 text-sm flex items-start gap-3 shadow-lg animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Thông báo lỗi:</p>
            <p className="text-xs leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 1: 10-MINUTE VIDEO SPLITTING & PART-BY-PART DUBBING */}
      {/* ======================================================== */}
      {activeDubMode === "split_parts" && (
        <div className="space-y-8">
          {/* Step 1: Input Video (Upload or URL) */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-amber-400" />
                  <span>Bước 1: Nạp Video & Tự Động Chia Đúng 10 Phút Mỗi Phần</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Hỗ trợ video dung lượng lớn (tới 5GB) hoặc thời lượng trên 10 phút. FFmpeg cắt không suy hao chất lượng.
                </p>
              </div>

              {/* Source tabs: File vs URL */}
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
                <button
                  onClick={() => setSplitSourceType("upload")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    splitSourceType === "upload"
                      ? "bg-amber-500 text-neutral-950 font-bold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Tải Video từ máy
                </button>
                <button
                  onClick={() => setSplitSourceType("url")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    splitSourceType === "url"
                      ? "bg-amber-500 text-neutral-950 font-bold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Dán Link URL
                </button>
              </div>
            </div>

            {/* Input by Upload */}
            {splitSourceType === "upload" && (
              <div className="space-y-6">
                {!splitFile ? (
                  <div className="border-2 border-dashed border-neutral-700 hover:border-amber-500/60 rounded-3xl p-8 sm:p-12 text-center bg-neutral-950/40 transition-all group">
                    <input
                      type="file"
                      id="split-video-file-input"
                      accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/*"
                      onChange={handleSelectSplitFile}
                      className="hidden"
                    />
                    <label
                      htmlFor="split-video-file-input"
                      className="cursor-pointer flex flex-col items-center justify-center gap-4"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 group-hover:scale-105 transition-transform flex items-center justify-center text-amber-400 shadow-inner">
                        <Film className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-bold text-neutral-100 group-hover:text-amber-400 transition-colors">
                          Nhấp để chọn tệp video từ máy tính (Hỗ trợ tới 5GB)
                        </p>
                        <p className="text-xs text-neutral-400 max-w-md mx-auto">
                          Hỗ trợ MP4, MOV, WebM, MKV... Sau khi chọn tệp, bạn sẽ thấy thông tin video và nút <strong className="text-amber-400">Nộp để cắt</strong> rõ ràng.
                        </p>
                      </div>
                      <span className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 text-xs font-black shadow-lg shadow-amber-500/20">
                        Chọn Tệp Video Ngay
                      </span>
                    </label>
                  </div>
                ) : (
                  /* Selected File Showcase & Dedicated SUBMIT Button */
                  <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                          <Film className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm sm:text-base truncate max-w-xs sm:max-w-md">
                              {splitFile.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-[11px] font-mono text-amber-400 border border-neutral-700">
                              {formatFileSize(splitFile.size)}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            Đã sẵn sàng tải lên và cắt chia thành các phần 10 phút.
                          </p>
                        </div>
                      </div>

                      {/* Change file button */}
                      <label
                        htmlFor="split-video-file-reselect"
                        className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer border border-neutral-700 flex items-center gap-1.5 transition-colors self-start sm:self-center"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Đổi tệp khác</span>
                        <input
                          type="file"
                          id="split-video-file-reselect"
                          accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/*"
                          onChange={handleSelectSplitFile}
                          disabled={isSplitting}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Part Duration Selector */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="text-neutral-400 font-semibold">Quy chuẩn thời lượng mỗi phần:</span>
                      <button
                        type="button"
                        onClick={() => setSplitPartDurationSec(600)}
                        className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${
                          splitPartDurationSec === 600
                            ? "bg-amber-500 text-neutral-950 border-amber-500 shadow-md"
                            : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700"
                        }`}
                      >
                        Đúng 10 Phút / Phần (Khuyên dùng)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitPartDurationSec(300)}
                        className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${
                          splitPartDurationSec === 300
                            ? "bg-amber-500 text-neutral-950 border-amber-500 shadow-md"
                            : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700"
                        }`}
                      >
                        5 Phút / Phần
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitPartDurationSec(900)}
                        className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${
                          splitPartDurationSec === 900
                            ? "bg-amber-500 text-neutral-950 border-amber-500 shadow-md"
                            : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700"
                        }`}
                      >
                        15 Phút / Phần
                      </button>
                    </div>

                    {/* DEDICATED PROMINENT SUBMIT BUTTON */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleStartSplitFromFile}
                        disabled={isSplitting}
                        className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-xl transition-all ${
                          isSplitting
                            ? "bg-neutral-800 text-neutral-400 border border-neutral-700 cursor-not-allowed opacity-90"
                            : "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-neutral-950 hover:brightness-110 active:scale-[0.99] shadow-amber-500/25 ring-2 ring-amber-400/50"
                        }`}
                      >
                        {isSplitting ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                            <span>ĐANG XỬ LÝ NỘP & CẮT VIDEO ({uploadProgressText || `${uploadProgress}%`})...</span>
                          </>
                        ) : (
                          <>
                            <Scissors className="w-5 h-5 text-neutral-950" />
                            <span>🚀 NỘP VÀ BẮT ĐẦU CẮT VIDEO THÀNH CÁC PHẦN 10 PHÚT</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input by URL */}
            {splitSourceType === "url" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Link2 className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={splitUrl}
                      onChange={(e) => setSplitUrl(e.target.value)}
                      placeholder="Dán đường dẫn YouTube, TikTok, Facebook, Drive, MP4 trực tiếp..."
                      className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleStartSplitFromUrl}
                    disabled={isSplitting || !splitUrl.trim()}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 font-black text-xs sm:text-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 whitespace-nowrap"
                  >
                    {isSplitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang tải & cắt...</span>
                      </>
                    ) : (
                      <>
                        <Scissors className="w-4 h-4" />
                        <span>Nộp Link & Cắt 10 Phút</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Hệ thống dùng yt-dlp và FFmpeg tải stream video tốc độ cao, sau đó chia nhỏ chính xác mỗi 10 phút.
                </p>
              </div>
            )}

            {/* LIVE REAL-TIME PROGRESS BAR & STEP INDICATOR */}
            {isSplitting && (
              <div className="p-6 rounded-2xl bg-neutral-950 border border-amber-500/50 space-y-4 shadow-2xl animate-in fade-in ring-1 ring-amber-500/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-300 font-bold">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>{splitStepMessage || "Đang xử lý tải lên và cắt video..."}</span>
                  </div>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {uploadProgressText || `${uploadProgress}%`}
                  </span>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full h-3.5 rounded-full bg-neutral-900 overflow-hidden border border-neutral-800 relative">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-300 rounded-full"
                    style={{ width: `${Math.max(5, uploadProgress)}%` }}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-neutral-400">
                  <span>⚡ Đang sử dụng cơ chế chia mảnh 8MB & FFmpeg stream copy không bao giờ suy hao chất lượng.</span>
                  <span className="text-amber-400 font-semibold">Vui lòng giữ tab này mở</span>
                </div>
              </div>
            )}

            {/* Splitting Error Alert with Retry button */}
            {splitError && (
              <div className="p-5 rounded-2xl bg-red-950/60 border border-red-700/80 text-red-100 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in shadow-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-red-200 text-sm">Chưa thể hoàn tất cắt video:</p>
                    <p className="text-xs text-red-300 leading-relaxed">{splitError}</p>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Mẹo: Tệp video của bạn vẫn được giữ nguyên. Hãy nhấn nút "Thử Lại Ngay", hoặc nếu tệp quá lớn hãy dán link video tại tab "Dán Link URL".
                    </p>
                  </div>
                </div>

                {splitFile && (
                  <button
                    onClick={handleStartSplitFromFile}
                    className="px-5 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs border border-red-600 flex items-center gap-2 transition-all shrink-0 shadow-lg"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Thử Lại Ngay</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div id="split-parts-list-anchor" />

          {/* Step 2: Parts Management & Dubbing */}
          {parts.length > 0 && splitResult && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Batch Actions Toolbar */}
              <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        Đã Cắt Thành Công {splitResult.totalParts} Phần (Mỗi Phần 10 Phút)
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      Danh Sách Các Đoạn Video 10 Phút Cần Dịch & Lồng Tiếng
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Tổng thời lượng video gốc: <strong className="text-amber-400">{splitResult.originalDurationFormatted}</strong> · Hỗ trợ tối đa 25,000 ký tự mỗi phần.
                    </p>
                  </div>

                  {/* Batch Voice Selector */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-400 whitespace-nowrap">Giọng AI mặc định:</span>
                    <select
                      value={selectedBatchVoice}
                      onChange={(e) => handleSelectBatchVoice(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-amber-300 focus:outline-none focus:border-amber-500 font-semibold max-w-xs truncate"
                    >
                      <optgroup label="🌟 Giọng Việt Nam độc quyền & phát thanh">
                        {VIETNAMESE_VOICES.filter(v => !v.tags?.includes("Tiết kiệm 90%")).map((v) => (
                          <option key={v.code} value={v.code}>
                            {v.name} ({v.gender} - {v.region})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="⚡ Giọng Việt Nam tiết kiệm (Echo, Nova, Onyx)">
                        {VIETNAMESE_VOICES.filter(v => v.tags?.includes("Tiết kiệm 90%")).map((v) => (
                          <option key={v.code} value={v.code}>
                            {v.name} ({v.gender} - Tiết kiệm)
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🌍 Giọng Quốc tế (Anh, Trung, Nhật, Hàn, Pháp, TBN)">
                        {INTERNATIONAL_VOICES.map((v) => (
                          <option key={v.code} value={v.code}>
                            {v.name} ({v.language} - {v.gender})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>

                {/* Batch Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={handleBatchTranscribeAll}
                    disabled={isBatchTranscribing}
                    className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-bold border border-neutral-700 flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isBatchTranscribing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                    )}
                    <span>Bóc Băng & Dịch TẤT CẢ ({parts.length} phần)</span>
                  </button>

                  <button
                    onClick={handleBatchDubAll}
                    disabled={isBatchDubbing}
                    className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-bold border border-neutral-700 flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isBatchDubbing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>Lồng Tiếng AI TẤT CẢ Các Phần</span>
                  </button>

                  <button
                    onClick={handleMergeAllParts}
                    disabled={isMergingAll}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 font-black text-xs hover:brightness-110 flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 ml-auto"
                  >
                    {isMergingAll ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang ghép nối toàn bộ video...</span>
                      </>
                    ) : (
                      <>
                        <Split className="w-4 h-4" />
                        <span>Ghép Tất Cả Thành 1 Video Full Hoàn Chỉnh</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Merged Full Video Banner (if created) */}
              {mergedFullVideo && (
                <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/40 shadow-2xl space-y-4 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          Đã Ghép Nối Hoàn Thành Toàn Bộ Video Full!
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white">
                        Video Dài Đầy Đủ Tất Cả Các Phần Đã Lồng Tiếng
                      </h4>
                      <p className="text-xs text-neutral-400">
                        Thời lượng: <strong className="text-white">{mergedFullVideo.durationFormatted}</strong> · Dung lượng: <strong className="text-white">{mergedFullVideo.fileSizeFormatted}</strong>
                      </p>
                    </div>

                    <a
                      href={mergedFullVideo.download_url}
                      download="video_full_long_tieng_ai.mp4"
                      className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      <Download className="w-4 h-4" />
                      <span>Tải Toàn Bộ Video MP4 Về Máy</span>
                    </a>
                  </div>

                  <div className="rounded-2xl overflow-hidden bg-black aspect-video max-w-2xl mx-auto border border-neutral-800">
                    <video
                      key={mergedFullVideo.video_url}
                      src={mergedFullVideo.video_url}
                      controls
                      preload="metadata"
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Individual Part Cards */}
              <div className="space-y-6">
                {parts.map((part) => (
                  <div
                    key={part.id}
                    className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700/80 transition-all shadow-xl space-y-5"
                  >
                    {/* Part Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-sm">
                          P{part.partIndex}
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white flex items-center gap-2">
                            <span>{part.title}</span>
                            <span className="text-xs font-mono text-neutral-400">({part.durationFormatted})</span>
                          </h4>
                          <p className="text-[11px] text-neutral-500">
                            Khung giờ: {part.startSec}s - {part.endSec}s
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        {part.status === "transcribing" && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1.5 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Đang bóc băng & dịch...
                          </span>
                        )}
                        {part.status === "transcribed" && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
                            <Check className="w-3 h-3" />
                            Đã có bản dịch tiếng Việt
                          </span>
                        )}
                        {part.status === "dubbing" && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Đang lồng tiếng AI...
                          </span>
                        )}
                        {part.status === "completed" && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3" />
                            Đã lồng tiếng xong
                          </span>
                        )}
                        {part.status === "error" && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3" />
                            Lỗi xử lý
                          </span>
                        )}
                        {part.status === "idle" && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
                            Chưa xử lý
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Part Error notice if any */}
                    {part.error && (
                      <p className="text-xs text-red-400 bg-red-950/30 p-2.5 rounded-xl border border-red-800/40">
                        {part.error}
                      </p>
                    )}

                    {/* Two-Column Grid: Preview & Controls */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left: Video / Audio Player of this Part (5 cols) */}
                      <div className="lg:col-span-5 space-y-3">
                        <div className="rounded-2xl overflow-hidden bg-black aspect-video border border-neutral-800 shadow-inner relative group">
                          <video
                            key={part.dubbedVideoUrl || part.videoUrl || part.id}
                            src={part.dubbedVideoUrl || part.videoUrl}
                            controls
                            preload="metadata"
                            playsInline
                            className="w-full h-full object-contain"
                          />
                          {part.dubbedVideoUrl && (
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-500/90 text-neutral-950 font-extrabold text-[10px] uppercase shadow">
                              Đã lồng tiếng AI
                            </div>
                          )}
                        </div>

                        {/* Audio track preview & Download MP4 of this part */}
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-neutral-400">
                            <a
                              href={part.dubbedVideoUrl || part.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-neutral-300 hover:text-amber-400 flex items-center gap-1 transition-colors"
                              title="Mở video trong tab mới nếu trình duyệt giới hạn phát"
                            >
                              <Play className="w-3 h-3 text-amber-400" />
                              <span>Mở tab mới</span>
                            </a>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={part.downloadUrl || `/api/video/download/${part.videoTempId}`}
                              download={`phan_${part.partIndex}_${part.dubbedVideoUrl ? "long_tieng" : "goc"}.mp4`}
                              className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Download className="w-3 h-3 text-emerald-400" />
                              <span>{part.dubbedVideoUrl ? `Tải MP4 Lồng Tiếng P${part.partIndex}` : `Tải MP4 Phần ${part.partIndex}`}</span>
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Right: Speech-to-Text & Dubbing Controls (7 cols) */}
                      <div className="lg:col-span-7 space-y-4">
                        {/* STT Trigger & Language Tag */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTranscribePart(part.partIndex)}
                              disabled={part.status === "transcribing" || part.status === "dubbing"}
                              className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-bold border border-neutral-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                              <Globe className="w-3.5 h-3.5 text-blue-400" />
                              <span>{part.translatedText ? "Bóc băng & Dịch lại" : "1. Bóc băng & Dịch sang Tiếng Việt"}</span>
                            </button>
                            {part.detectedLanguage && (
                              <span className="text-[11px] font-medium text-neutral-400 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800">
                                Phát hiện: <strong className="text-amber-400">{part.detectedLanguage}</strong>
                              </span>
                            )}
                          </div>

                          {/* Character counter (up to 25,000 chars) */}
                          <span className="text-[11px] font-mono text-neutral-500">
                            {((part.translatedText || part.transcribedText)?.length || 0).toLocaleString()} / 25,000 ký tự
                          </span>
                        </div>

                        {/* Editable Translation Textarea */}
                        <div className="relative">
                          <textarea
                            rows={4}
                            value={part.translatedText || part.transcribedText || ""}
                            onChange={(e) => handleUpdatePartText(part.partIndex, e.target.value)}
                            placeholder="Lời thoại tiếng Việt sau khi bóc băng & dịch thuật sẽ hiển thị ở đây (hỗ trợ tối đa 25,000 ký tự). Bạn có thể tự do chỉnh sửa câu từ trước khi lồng tiếng..."
                            className="w-full p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 leading-relaxed font-sans transition-colors resize-y"
                          />
                        </div>

                        {/* Dubbing Controls */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-neutral-400 text-[11px] whitespace-nowrap">Giọng đọc phần này:</span>
                            <select
                              value={part.voiceCode || selectedBatchVoice}
                              onChange={(e) => handleUpdatePartVoice(part.partIndex, e.target.value)}
                              className="px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-amber-300 font-semibold max-w-[200px] truncate"
                            >
                              <optgroup label="🌟 Giọng Việt Nam độc quyền & phát thanh">
                                {VIETNAMESE_VOICES.filter(v => !v.tags?.includes("Tiết kiệm 90%")).map((v) => (
                                  <option key={v.code} value={v.code}>
                                    {v.name} ({v.gender} - {v.region})
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="⚡ Giọng Việt Nam tiết kiệm (Echo, Nova, Onyx)">
                                {VIETNAMESE_VOICES.filter(v => v.tags?.includes("Tiết kiệm 90%")).map((v) => (
                                  <option key={v.code} value={v.code}>
                                    {v.name} ({v.gender} - Tiết kiệm)
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="🌍 Giọng Quốc tế (Anh, Trung, Nhật, Hàn, Pháp, TBN)">
                                {INTERNATIONAL_VOICES.map((v) => (
                                  <option key={v.code} value={v.code}>
                                    {v.name} ({v.language} - {v.gender})
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </div>

                          <button
                            onClick={() => handleDubPart(part.partIndex)}
                            disabled={
                              part.status === "dubbing" ||
                              part.status === "transcribing" ||
                              (!part.translatedText && !part.transcribedText)
                            }
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 font-bold text-xs hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                          >
                            {part.status === "dubbing" ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Đang lồng tiếng...</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>2. Tạo Giọng & Ghép Vào Video</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 2: SINGLE VIDEO DUBBING (STANDARD WORKFLOW)         */}
      {/* ======================================================== */}
      {activeDubMode === "single" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Step 1: Video Input */}
            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileVideo className="w-4 h-4 text-amber-400" />
                    <span>Bước 1: Chọn Video Cần Lồng Tiếng</span>
                  </h3>
                  {videoDuration > 600 && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Video dài &gt; 10 phút
                    </span>
                  )}
                </div>

                {videoPreviewUrl ? (
                  <div className="space-y-3">
                    <div className="rounded-xl overflow-hidden bg-black aspect-video border border-neutral-800 relative group shadow-md">
                      <video
                        ref={videoRef}
                        src={videoPreviewUrl}
                        controls
                        onLoadedMetadata={(e) => {
                          const dur = e.currentTarget.duration;
                          setVideoDuration(dur);
                        }}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span>{videoFile ? videoFile.name : "Đã nạp video từ hệ thống"}</span>
                      <label
                        htmlFor="reupload-video-single"
                        className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer transition-colors"
                      >
                        Đổi video khác
                        <input
                          type="file"
                          id="reupload-video-single"
                          accept="video/mp4,video/quicktime,video/webm,video/*"
                          onChange={handleVideoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Notice if video > 10 min */}
                    {videoDuration > 600 && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300">
                        <span>Video dài hơn 10 phút. Bạn nên dùng tính năng cắt chia 10 phút để xử lý nhanh hơn!</span>
                        <button
                          onClick={() => setActiveDubMode("split_parts")}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 text-neutral-950 font-bold whitespace-nowrap text-[11px]"
                        >
                          Chuyển sang Chia 10 Phút
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-neutral-700 hover:border-amber-500/60 rounded-2xl p-8 text-center bg-neutral-950/50 transition-all group">
                    <input
                      type="file"
                      id="main-video-upload-single"
                      accept="video/mp4,video/quicktime,video/webm,video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="main-video-upload-single"
                      className="cursor-pointer flex flex-col items-center justify-center gap-3"
                    >
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 group-hover:scale-105 transition-transform flex items-center justify-center text-amber-400 shadow-inner">
                        <Film className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-neutral-100 group-hover:text-amber-400 transition-colors">
                          Nhấp để tải lên video MP4 / MOV / WebM
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          Kéo thả video tải từ TikTok hoặc YouTube vào đây
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-semibold border border-neutral-700">
                        Chọn tệp Video
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Audio Voice Input */}
            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileAudio className="w-4 h-4 text-emerald-400" />
                    <span>Bước 2: Chọn Giọng Đọc / Âm Thanh MP3</span>
                  </h3>
                </div>

                {/* Source Type Selector */}
                <div className="flex items-center gap-1.5 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800 mb-4">
                  <button
                    onClick={() => setAudioSourceType("preset")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      audioSourceType === "preset"
                        ? "bg-amber-500 text-neutral-950 font-bold shadow-md"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Tạo Giọng Đỗ Minh Hiếu AI
                  </button>

                  <button
                    onClick={() => setAudioSourceType("upload")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      audioSourceType === "upload"
                        ? "bg-amber-500 text-neutral-950 font-bold shadow-md"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Tải MP3 từ máy
                  </button>

                  {historyJobs.length > 0 && (
                    <button
                      onClick={() => setAudioSourceType("history")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        audioSourceType === "history"
                          ? "bg-amber-500 text-neutral-950 font-bold shadow-md"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Từ lịch sử ({historyJobs.length})
                    </button>
                  )}
                </div>

                {/* Source 1: Preset from STT / TTS */}
                {audioSourceType === "preset" && (
                  <div className="space-y-3">
                    {selectedAudioUrl ? (
                      <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" />
                            Đã nạp file âm thanh giọng đọc
                          </span>
                          <button
                            onClick={() => setSelectedAudioUrl("")}
                            className="text-neutral-400 hover:text-red-400 transition-colors"
                          >
                            Xóa
                          </button>
                        </div>
                        <audio
                          ref={audioRef}
                          src={selectedAudioUrl}
                          controls
                          onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
                          className="w-full h-8"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3 p-4 rounded-xl bg-neutral-950/60 border border-neutral-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-neutral-400 font-medium">Tạo giọng đọc mẫu nhanh:</span>
                          <select
                            value={dubVoiceCode}
                            onChange={(e) => setDubVoiceCode(e.target.value)}
                            className="px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-amber-300 font-semibold max-w-[200px] truncate"
                          >
                            <optgroup label="🌟 Giọng Việt Nam độc quyền & phát thanh">
                              {VIETNAMESE_VOICES.filter(v => !v.tags?.includes("Tiết kiệm 90%")).map((v) => (
                                <option key={v.code} value={v.code}>
                                  {v.name} ({v.gender} - {v.region})
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="⚡ Giọng Việt Nam tiết kiệm (Echo, Nova, Onyx)">
                              {VIETNAMESE_VOICES.filter(v => v.tags?.includes("Tiết kiệm 90%")).map((v) => (
                                <option key={v.code} value={v.code}>
                                  {v.name} ({v.gender} - Tiết kiệm)
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="🌍 Giọng Quốc tế (Anh, Trung, Nhật, Hàn, Pháp, TBN)">
                              {INTERNATIONAL_VOICES.map((v) => (
                                <option key={v.code} value={v.code}>
                                  {v.name} ({v.language} - {v.gender})
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>

                        <textarea
                          rows={3}
                          value={quickSynthText}
                          onChange={(e) => setQuickSynthText(e.target.value)}
                          placeholder="Nhập nội dung bạn muốn lồng tiếng vào video..."
                          className="w-full p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                        />

                        <button
                          type="button"
                          onClick={handleQuickSynthesize}
                          disabled={isQuickSynthing || !quickSynthText.trim()}
                          className="w-full py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-bold text-xs border border-neutral-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                          {isQuickSynthing ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang tạo giọng đọc...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Tạo Giọng Đọc Ngay</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Source 2: Custom Upload */}
                {audioSourceType === "upload" && (
                  <div className="border-2 border-dashed border-neutral-700 hover:border-emerald-500/60 rounded-2xl p-6 text-center bg-neutral-950/50 transition-all group">
                    <input
                      type="file"
                      id="custom-audio-upload-single"
                      accept="audio/mp3,audio/wav,audio/m4a,audio/*"
                      onChange={handleAudioUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="custom-audio-upload-single"
                      className="cursor-pointer flex flex-col items-center justify-center gap-2.5"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 group-hover:scale-105 transition-transform flex items-center justify-center text-emerald-400 shadow-inner">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-neutral-100 group-hover:text-emerald-400 transition-colors">
                          {audioFile ? audioFile.name : "Tải lên tệp MP3 / WAV từ máy tính"}
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          Hỗ trợ mọi định dạng âm thanh chất lượng cao
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {/* Source 3: History */}
                {audioSourceType === "history" && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {historyJobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => {
                          if (job.audioUrl) setSelectedAudioUrl(job.audioUrl);
                        }}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          selectedAudioUrl === job.audioUrl
                            ? "bg-amber-500/10 border-amber-500/50 text-amber-300"
                            : "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="font-semibold truncate">{job.inputText}</p>
                          <span className="text-[10px] text-neutral-500">{job.voiceName}</span>
                        </div>
                        {selectedAudioUrl === job.audioUrl && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Merge Controls Card */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Bước 3: Tùy Chỉnh Chế Độ Lồng Tiếng & Hòa Âm</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => setMergeMode("replace")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  mergeMode === "replace"
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md"
                    : "bg-neutral-950 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-neutral-200">Thay thế âm thanh gốc</span>
                  <input
                    type="radio"
                    name="mergeMode"
                    checked={mergeMode === "replace"}
                    onChange={() => setMergeMode("replace")}
                    className="accent-amber-500"
                  />
                </div>
                <p className="text-[11px] text-neutral-400">
                  Xóa toàn bộ tiếng gốc của video, chỉ giữ lại lời thoại lồng tiếng AI trong trẻo.
                </p>
              </div>

              <div
                onClick={() => setMergeMode("ducking")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  mergeMode === "ducking"
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md"
                    : "bg-neutral-950 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-neutral-200">Giữ nhạc nền (Audio Ducking)</span>
                  <input
                    type="radio"
                    name="mergeMode"
                    checked={mergeMode === "ducking"}
                    onChange={() => setMergeMode("ducking")}
                    className="accent-amber-500"
                  />
                </div>
                <p className="text-[11px] text-neutral-400">
                  Hạ nhỏ tiếng nhạc nền gốc khi có giọng nói Đỗ Minh Hiếu vang lên chuẩn TVC.
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-xs text-neutral-400 space-y-0.5">
                <div className="flex items-center gap-1.5 font-medium">
                  <Film className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {videoFile
                      ? `Video: ${videoFile.name}`
                      : videoTempId
                      ? "Đã chọn video từ hệ thống"
                      : "Chưa chọn video"}
                  </span>
                </div>
                {isVideoUploading && (
                  <p className="text-[11px] text-amber-400 animate-pulse">Đang tải video lên máy chủ...</p>
                )}
                {isAudioUploading && (
                  <p className="text-[11px] text-amber-400 animate-pulse">Đang nạp file âm thanh...</p>
                )}
              </div>

              <button
                onClick={handleStartMerge}
                disabled={
                  isProcessing ||
                  isVideoUploading ||
                  isAudioUploading ||
                  (!videoBase64 && !videoTempId && !videoFile) ||
                  (audioSourceType === "upload" && !audioFile && !audioTempId && !audioBase64) ||
                  (audioSourceType !== "upload" && !selectedAudioUrl)
                }
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 font-black text-sm hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>{processingStep}</span>
                  </>
                ) : (
                  <>
                    <Film className="w-5 h-5" />
                    <span>Bắt Đầu Ghép Lồng Tiếng Vào Video</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result Section */}
          {result && (
            <div className="p-6 rounded-3xl bg-neutral-900 border border-emerald-500/30 shadow-2xl space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <Check className="w-4 h-4" />
                      Đã Ghép Lồng Tiếng Thành Công!
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Video MP4 Đã Hoàn Chỉnh Giọng Đọc Đỗ Minh Hiếu AI
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href={result.download_url}
                    download="video_da_long_tieng_dominhhieu.mp4"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-neutral-950 font-bold text-xs hover:brightness-110 flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải Video MP4 Về Máy ({result.fileSizeFormatted})</span>
                  </a>
                </div>
              </div>

              {/* Video Player */}
              <div className="rounded-2xl overflow-hidden bg-black border border-neutral-800 aspect-video max-w-3xl mx-auto shadow-2xl relative">
                <video src={result.video_url} controls autoPlay className="w-full h-full object-contain" />
              </div>

              {/* Stats Bar */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-neutral-400 max-w-3xl mx-auto">
                <div>
                  <span className="text-neutral-500 block text-[10px]">Thời lượng:</span>
                  <span className="text-white font-bold">{result.durationFormatted}</span>
                </div>

                <div>
                  <span className="text-neutral-500 block text-[10px]">Dung lượng tệp:</span>
                  <span className="text-white font-bold">{result.fileSizeFormatted}</span>
                </div>

                <div>
                  <span className="text-neutral-500 block text-[10px]">Chế độ hòa âm:</span>
                  <span className="text-amber-400 font-bold">
                    {result.mode === "replace" ? "Thay thế hoàn toàn" : "Audio Ducking"}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-500 block text-[10px]">Đồng bộ:</span>
                  <span className="text-emerald-400 font-bold">
                    {result.timeSync === "loop_video" ? "Lặp video khớp thoại" : "Khớp ngắn nhất"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
