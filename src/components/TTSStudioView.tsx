import React, { useState } from "react";
import {
  Mic,
  Sliders,
  Volume2,
  Sparkles,
  FileText,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Clipboard,
  Upload,
  Trash2,
  Layers,
  ChevronDown,
  Info,
  ExternalLink
} from "lucide-react";
import {
  EverAIModel,
  AudioType,
  BitrateOption,
  VoiceItem,
  TTSJob,
  TTSRequest
} from "../types/tts";
import { ALL_VOICES, VIETNAMESE_VOICES, SAMPLE_TEXT_PRESETS } from "../data/voices";
import { AudioPlayer } from "./AudioPlayer";
import { safeParseJson } from "../utils/apiHelper";
import { playVoicePreview } from "../utils/clientAudio";
import { generateSrtFromText } from "../utils/srt";

interface TTSStudioViewProps {
  selectedVoice: VoiceItem;
  onOpenVoicePicker: () => void;
  onJobSuccess: (job: TTSJob) => void;
  customApiKey?: string;
  onOpenApiKeySettings?: () => void;
  onNavigateToSplitter: () => void;
  onOpenSrtModal: (srt: string) => void;
  initialText?: string;
  onClearInitialText?: () => void;
  onNavigateToChat?: () => void;
}

export const TTSStudioView: React.FC<TTSStudioViewProps> = ({
  selectedVoice,
  onOpenVoicePicker,
  onJobSuccess,
  customApiKey,
  onOpenApiKeySettings,
  onNavigateToSplitter,
  onOpenSrtModal,
  initialText,
  onClearInitialText,
  onNavigateToChat,
}) => {
  // Studio form state
  const [inputText, setInputText] = useState(
    initialText || "Nam mô A Di Đà Phật. Nguyện đem công đức này, hướng về khắp tất cả, đệ tử và chúng sinh, đều trọn thành Phật đạo."
  );

  React.useEffect(() => {
    if (initialText) {
      setInputText(initialText);
      onClearInitialText?.();
    }
  }, [initialText, onClearInitialText]);
  const [model, setModel] = useState<EverAIModel>("everai-v1.6");
  const [audioType, setAudioType] = useState<AudioType>("mp3");
  const [bitrate, setBitrate] = useState<BitrateOption>(128);
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(100);
  const [generateSrt, setGenerateSrt] = useState<boolean>(true);
  const [callbackUrl, setCallbackUrl] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Execution states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [everaiNotice, setEveraiNotice] = useState<{
    error_code?: number;
    error_message?: string;
    is_fallback?: boolean;
  } | null>(null);
  const [currentJob, setCurrentJob] = useState<TTSJob | null>(null);
  const [previewingVoice, setPreviewingVoice] = useState(false);
  const [stepStatus, setStepStatus] = useState<string>("");

  const charCount = inputText.length;
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  // Estimate speaking time in seconds: roughly 3 words/sec at 1.0 speed
  const estimatedSeconds = Math.max(1, Math.round(wordCount / (2.8 * speed)));

  const handleCreateDemoPreview = () => {
    setError(null);
    setErrorCode(null);
    const cleanLang = selectedVoice.langCode.startsWith("vi") ? "vi" : selectedVoice.langCode.split("-")[0];
    const spokenUrl = `/api/tts/voice-sample?text=${encodeURIComponent(inputText.slice(0, 180))}&lang=${cleanLang}&voice_code=${encodeURIComponent(selectedVoice.code)}`;
    const srt = generateSrt ? generateSrtFromText(inputText, estimatedSeconds, speed) : undefined;
    const demoJob: TTSJob = {
      id: `demo_${Date.now()}`,
      requestId: `demo_req_${Date.now()}`,
      inputText: inputText.trim(),
      voiceCode: selectedVoice.code,
      voiceName: selectedVoice.name,
      modelId: model,
      audioType,
      bitrate,
      speedRate: speed,
      pitchRate: pitch,
      volume,
      generateSrt,
      status: "SUCCESS",
      audioUrl: spokenUrl,
      srtContent: srt,
      characters: charCount,
      wordCount,
      estimatedDurationSeconds: estimatedSeconds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSimulated: true,
    };
    setCurrentJob(demoJob);
    onJobSuccess(demoJob);
  };

  const handleApplyPreset = (preset: typeof SAMPLE_TEXT_PRESETS[0]) => {
    setInputText(preset.text);
    // Find voice if available
    const matched = ALL_VOICES.find((v) => v.code === preset.recommendedVoice);
    if (matched) {
      // voice selection handled if needed
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setInputText((prev) => (prev ? `${prev}\n${clipText}` : clipText));
      }
    } catch {
      // fallback
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setInputText(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const handlePreviewVoice = async () => {
    try {
      setPreviewingVoice(true);
      await playVoicePreview(
        selectedVoice.sampleText,
        selectedVoice.langCode,
        speed,
        pitch,
        volume,
        selectedVoice.code,
        selectedVoice.sampleAudio
      );
    } catch (e) {
      console.error(e);
    } finally {
      setPreviewingVoice(false);
    }
  };

  // Submit TTS to EverAI API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!inputText.trim()) {
      setError("Vui lòng nhập nội dung văn bản cần chuyển thành giọng nói.");
      return;
    }

    try {
      setLoading(true);
      setStepStatus("Đang gửi yêu cầu tới máy chủ EverAI...");

      const payload: TTSRequest = {
        response_type: "indirect",
        input_text: inputText.trim(),
        voice_code: selectedVoice.code,
        model_id: model,
        audio_type: audioType,
        bitrate: audioType === "mp3" ? bitrate : undefined,
        speed_rate: Number(speed.toFixed(1)),
        pitch_rate: Number(pitch.toFixed(1)),
        volume: Math.round(volume),
        generate_srt: generateSrt,
        callback_url: callbackUrl.trim() || undefined,
        custom_api_key: customApiKey,
      };

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await safeParseJson(response);

      if (!response.ok || data.status !== 1) {
        if (data.error_code) {
          setErrorCode(data.error_code);
        }
        throw new Error(data.error_message || "Không thể khởi tạo yêu cầu TTS.");
      }

      // If response includes notice about fallback
      if (data.everai_notice) {
        setEveraiNotice(data.everai_notice);
      } else {
        setEveraiNotice(null);
      }

      setError(null);
      setErrorCode(null);

      const result = data.result;
      setStepStatus(`Đã nhận request_id: ${result.request_id}. Đang nạp âm thanh...`);

      // Construct job record
      const cleanLang = selectedVoice.langCode.startsWith("vi") ? "vi" : selectedVoice.langCode.split("-")[0];
      const srt = generateSrt ? generateSrtFromText(inputText, estimatedSeconds, speed) : undefined;
      const audioUrl = result.audio_link || `/api/tts/voice-sample?text=${encodeURIComponent(inputText.slice(0, 180))}&lang=${cleanLang}&voice_code=${encodeURIComponent(selectedVoice.code)}`;

      const newJob: TTSJob = {
        id: result.request_id || `job_${Date.now()}`,
        requestId: result.request_id,
        inputText: inputText.trim(),
        voiceCode: selectedVoice.code,
        voiceName: selectedVoice.name,
        modelId: model,
        audioType,
        bitrate,
        speedRate: speed,
        pitchRate: pitch,
        volume,
        generateSrt,
        status: "SUCCESS",
        audioUrl,
        srtContent: srt,
        characters: charCount,
        wordCount,
        estimatedDurationSeconds: estimatedSeconds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSimulated: result.is_simulated,
      };

      setCurrentJob(newJob);
      onJobSuccess(newJob);
      setStepStatus("Tạo audio thành công!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi trong quá trình kết nối với EverAI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT COLUMN: Text Editor & Presets (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Editor Box */}
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <Mic className="w-4 h-4 text-amber-400" />
              <span>Nội Dung Cần Đọc</span>
            </h2>

            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors flex items-center gap-1"
                title="Dán từ khay nhớ tạm"
              >
                <Clipboard className="w-3 h-3" />
                <span className="hidden sm:inline">Dán văn bản</span>
              </button>

              <label
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="Tải tệp .txt lên"
              >
                <Upload className="w-3 h-3" />
                <span className="hidden sm:inline">Nhập file .txt</span>
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText("")}
                  className="p-1 rounded-lg text-neutral-500 hover:text-red-400 transition-colors"
                  title="Xóa trắng"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Sample Text Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-neutral-500 text-[11px] pr-1">Mẫu nhanh:</span>
            {SAMPLE_TEXT_PRESETS.map((preset) => (
              <button
                key={preset.title}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-amber-400 border border-neutral-700/50 transition-colors text-[11px] whitespace-nowrap"
              >
                {preset.title}
              </button>
            ))}

            {onNavigateToChat && (
              <button
                type="button"
                onClick={onNavigateToChat}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors text-[11px] flex items-center gap-1 font-bold sm:ml-auto"
                title="Nhờ Gemini AI sáng tạo hoặc hoàn thiện nội dung"
              >
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Chat Cùng Gemini AI</span>
              </button>
            )}
          </div>

          {/* Text Area */}
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={9}
              placeholder="Nhập hoặc dán nội dung văn bản bạn muốn chuyển thành giọng nói tại đây..."
              className="w-full p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 leading-relaxed font-sans transition-colors resize-y"
            />
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400 pt-1">
            <div className="flex items-center gap-3 font-mono tabular-nums">
              <span>{charCount.toLocaleString()} ký tự</span>
              <span aria-hidden="true">·</span>
              <span>{wordCount} từ</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400/90">~{estimatedSeconds} giây đọc</span>
            </div>

            {charCount > 2000 && (
              <button
                type="button"
                onClick={onNavigateToSplitter}
                className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>Văn bản dài? Dùng chia đoạn tự động</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Selected Voice Card */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Giọng Đọc Đang Chọn
            </span>
            <button
              type="button"
              onClick={onOpenVoicePicker}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              Thay Đổi Giọng Đọc →
            </button>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                  selectedVoice.gender === "Nữ"
                    ? "bg-pink-950/70 text-pink-300 border border-pink-800/40"
                    : "bg-blue-950/70 text-blue-300 border border-blue-800/40"
                }`}
              >
                {selectedVoice.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-100 text-sm sm:text-base">
                    {selectedVoice.name}
                  </span>
                  <span className="text-xs text-neutral-400">
                    ({selectedVoice.gender} · {selectedVoice.region})
                  </span>
                </div>
                <div className="text-xs text-neutral-400 font-mono mt-0.5">
                  {selectedVoice.code}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handlePreviewVoice}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  previewingVoice
                    ? "border-amber-500 text-amber-300 bg-amber-950/40 animate-pulse"
                    : "border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800"
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{previewingVoice ? "Đang phát..." : "Nghe thử"}</span>
              </button>

              <button
                type="button"
                onClick={onOpenVoicePicker}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
              >
                Xem 30+ giọng
              </button>
            </div>
          </div>

          <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
            {selectedVoice.description}
          </p>
        </div>

        {/* Generated Audio Showcase */}
        {currentJob && currentJob.audioUrl && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {everaiNotice && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-xs text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-300">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {everaiNotice.error_code === 402
                      ? "Giải thích: Lý do chưa đọc đúng giọng gốc của EverAI (Lê Hoàng, Kiều Nhi...)"
                      : "Thông báo từ EverAI"}
                  </span>
                </div>
                <div className="text-neutral-300 text-[11px] leading-relaxed space-y-1.5">
                  <p>
                    • <strong>Nguyên nhân:</strong> Khóa API của bạn chính xác, nhưng máy chủ EverAI báo:{" "}
                    <span className="text-amber-300 font-mono">&ldquo;{everaiNotice.error_message}&rdquo;</span> (Mã lỗi 402 = Hết credit).
                  </p>
                  <p>
                    • <strong>Giọng đang phát:</strong> Vì tài khoản có 0 credit, EverAI chưa xuất file giọng AI gốc độc quyền. Studio đã phát tạm bản mô phỏng trực tiếp kèm bộ kích âm (+150%) để bạn nghe nội dung ngay mà không bị gián đoạn.
                  </p>
                  <p>
                    • <strong>Để nghe đúng 100% chất giọng EverAI:</strong> Bạn cần nạp Credit cho tài khoản trên EverAI (gói Echo chỉ 100 credits/1k ký tự, Lê Hoàng/Kiều Nhi là 1.000 credits/1k ký tự).
                  </p>
                </div>
                <div className="pt-1 flex items-center gap-3">
                  <a
                    href="https://everai.vn/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors"
                  >
                    <span>Nạp Credit tại everai.vn/api</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Audio đã được tạo thành công và sẵn sàng phát</span>
              </span>
              <span className="font-mono text-neutral-500">
                Mã: {currentJob.requestId}
              </span>
            </div>

            <AudioPlayer
              audioUrl={currentJob.audioUrl}
              audioType={currentJob.audioType}
              title={`Audio: ${currentJob.inputText.slice(0, 40)}...`}
              voiceName={currentJob.voiceName}
              srtContent={currentJob.srtContent}
              onOpenSrtModal={
                currentJob.srtContent
                  ? () => onOpenSrtModal(currentJob.srtContent!)
                  : undefined
              }
            />
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Model & Audio Controls (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-sm space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Cấu Hình Giọng & Model</span>
            </h2>
            <span className="text-[11px] font-mono text-neutral-400">
              API v1.0
            </span>
          </div>

          {/* 1. Model Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-300">
              Mô Hình AI (EverAI Model)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "everai-v1.6", name: "v1.6 (Mới nhất)", desc: "Đa ngôn ngữ, chuẩn TV & Anh" },
                { id: "everai-v1.5", name: "v1.5 (Ổn định)", desc: "Mượt mà cho tiếng Việt" },
                { id: "everai-v1.5-turbo", name: "v1.5 Turbo", desc: "Nhanh 2x, tiết kiệm 50%" },
                { id: "everai-v1", name: "v1 (Nền tảng)", desc: "Model chuẩn cơ bản" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModel(m.id as EverAIModel)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    model === m.id
                      ? "bg-amber-950/30 border-amber-500 text-neutral-100"
                      : "bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                  }`}
                >
                  <div className="font-semibold text-xs text-neutral-200">{m.name}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Audio Format & Bitrate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Định Dạng Âm Thanh
              </label>
              <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-xl border border-neutral-800 text-xs">
                <button
                  type="button"
                  onClick={() => setAudioType("mp3")}
                  className={`flex-1 py-1.5 rounded-lg transition-colors font-semibold ${
                    audioType === "mp3"
                      ? "bg-amber-500 text-neutral-950"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  MP3
                </button>
                <button
                  type="button"
                  onClick={() => setAudioType("wav")}
                  className={`flex-1 py-1.5 rounded-lg transition-colors font-semibold ${
                    audioType === "wav"
                      ? "bg-amber-500 text-neutral-950"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  WAV
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Bitrate (kbps)
              </label>
              <select
                disabled={audioType !== "mp3"}
                value={bitrate}
                onChange={(e) => setBitrate(Number(e.target.value) as BitrateOption)}
                className="w-full py-2 px-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 disabled:opacity-40 focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value={8}>8 kbps (Siêu nhẹ)</option>
                <option value={16}>16 kbps</option>
                <option value={32}>32 kbps (Radio)</option>
                <option value={64}>64 kbps (Thoại chuẩn)</option>
                <option value={128}>128 kbps (Khuyên dùng)</option>
                <option value={160}>160 kbps (Studio HQ)</option>
              </select>
            </div>
          </div>

          {/* 3. Speed Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-neutral-300">Tốc Độ Đọc (Speed)</span>
              <span className="font-mono tabular-nums text-amber-400 font-bold">{speed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between items-center text-[10px] text-neutral-400">
              <button type="button" onClick={() => setSpeed(0.8)} className="hover:text-amber-400">0.8x Chậm</button>
              <button type="button" onClick={() => setSpeed(1.0)} className="hover:text-amber-400">1.0x Chuẩn</button>
              <button type="button" onClick={() => setSpeed(1.2)} className="hover:text-amber-400">1.2x Nhanh</button>
              <button type="button" onClick={() => setSpeed(1.5)} className="hover:text-amber-400">1.5x Nhanh 2</button>
            </div>
          </div>

          {/* 4. Pitch Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-neutral-300">Cao Độ Giọng (Pitch)</span>
              <span className="font-mono tabular-nums text-amber-400 font-bold">{pitch.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between items-center text-[10px] text-neutral-400">
              <button type="button" onClick={() => setPitch(0.8)} className="hover:text-amber-400">0.8 Trầm</button>
              <button type="button" onClick={() => setPitch(1.0)} className="hover:text-amber-400">1.0 Tự nhiên</button>
              <button type="button" onClick={() => setPitch(1.2)} className="hover:text-amber-400">1.2 Thanh</button>
            </div>
          </div>

          {/* 5. Volume */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-neutral-300">Âm Lượng (Volume)</span>
              <span className="font-mono tabular-nums text-amber-400 font-bold">{volume}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={150}
              step={1}
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between items-center text-[10px] text-neutral-400">
              <span>50%</span>
              <button type="button" onClick={() => setVolume(100)} className="hover:text-amber-400">100% Gốc</button>
              <span>150%</span>
            </div>
          </div>

          {/* 6. Subtitles SRT checkbox */}
          <label className="flex items-center gap-3 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 cursor-pointer hover:border-neutral-700 transition-colors">
            <input
              type="checkbox"
              checked={generateSrt}
              onChange={(e) => setGenerateSrt(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 bg-neutral-800 border-neutral-700 focus:ring-amber-500 focus:ring-offset-neutral-950"
            />
            <div className="flex-1 text-xs">
              <div className="font-medium text-neutral-200">
                Tạo File Phụ Đề SRT (Subtitles)
              </div>
              <div className="text-neutral-400 text-[11px] mt-0.5">
                Đồng bộ phụ đề theo từng câu để dựng video CapCut, Premiere.
              </div>
            </div>
          </label>

          {/* Advanced collapsible */}
          <div className="pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <span>Tùy chọn Webhook & Callback</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  showAdvanced ? "rotate-180" : ""
                }`}
              />
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">
                    Callback Webhook URL (EverAI POST kết quả):
                  </label>
                  <input
                    type="url"
                    placeholder="https://your-domain.com/api/tts/callback"
                    value={callbackUrl}
                    onChange={(e) => setCallbackUrl(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 font-mono focus:outline-none focus:border-amber-500 placeholder:text-neutral-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/80 text-xs text-red-300 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="font-bold text-red-200 text-sm">
                    {errorCode === 402
                      ? "Phản hồi từ API EverAI: Số dư Credit = 0 (Mã 402)"
                      : errorCode === 406
                      ? "Phản hồi từ API EverAI: Giọng chưa hỗ trợ model này (Mã 406)"
                      : "Phản hồi từ máy chủ EverAI:"}
                  </div>
                  <div className="leading-relaxed text-red-300/90 font-mono text-[11px] bg-black/40 p-2 rounded-lg border border-red-900/40">
                    &ldquo;{error}&rdquo;
                  </div>
                </div>
              </div>

              {errorCode === 402 && (
                <div className="p-3 rounded-lg bg-black/30 border border-neutral-800 text-[11px] text-neutral-300 space-y-1.5">
                  <p className="font-semibold text-amber-300">
                    Hệ thống chỉ lấy âm thanh từ API EverAI chứ không dùng giọng đọc máy:
                  </p>
                  <p className="text-neutral-400">
                    Vì số dư credit của key hiện tại là 0, máy chủ EverAI từ chối tạo file âm thanh mới cho đoạn văn này. Bạn có thể nạp credit, đổi sang API key khác có credit, hoặc nghe file mẫu giọng thật của EverAI bên dưới:
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-red-900/40 flex flex-wrap items-center gap-2">
                {errorCode === 402 && (
                  <a
                    href="https://everai.vn/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-red-900/80 hover:bg-red-800 text-red-100 font-semibold transition-colors flex items-center gap-1"
                  >
                    <span>Nạp Credit tại EverAI.vn</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                {onOpenApiKeySettings && (
                  <button
                    type="button"
                    onClick={onOpenApiKeySettings}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition-colors"
                  >
                    Đổi API Key Khác Có Credit
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePreviewVoice}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Nghe File Giọng Thật Của {selectedVoice.name} (EverAI Gốc)</span>
                </button>
              </div>
            </div>
          )}

          {/* Status Step Notice */}
          {loading && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 text-xs text-amber-300 flex items-center gap-2 animate-pulse">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
              <span>{stepStatus || "Đang tổng hợp giọng nói..."}</span>
            </div>
          )}

          {/* Primary Submit CTA */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-neutral-950 font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                <span>Đang Xử Lý TTS ({charCount} ký tự)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Tạo Giọng Nói EverAI</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
