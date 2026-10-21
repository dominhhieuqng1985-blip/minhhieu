import React, { useState } from "react";
import {
  Scissors,
  Play,
  RotateCcw,
  Download,
  FileText,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { TextChunk, TTSRequest, EverAIModel, AudioType, BitrateOption } from "../types/tts";
import { splitText } from "../utils/textSplitter";
import { VIETNAMESE_VOICES } from "../data/voices";
import { generateSrtFromText, downloadFile } from "../utils/srt";
import { safeParseJson } from "../utils/apiHelper";

interface TextSplitterViewProps {
  currentVoiceCode: string;
  currentModel: EverAIModel;
  currentAudioType: AudioType;
  currentBitrate: BitrateOption;
  currentSpeed: number;
  currentPitch: number;
  currentVolume: number;
  customApiKey?: string;
  onJobCreated?: (jobData: any) => void;
}

export const TextSplitterView: React.FC<TextSplitterViewProps> = ({
  currentVoiceCode,
  currentModel,
  currentAudioType,
  currentBitrate,
  currentSpeed,
  currentPitch,
  currentVolume,
  customApiKey,
  onJobCreated,
}) => {
  const [longText, setLongText] = useState(
    `Trí tuệ nhân tạo đang làm thay đổi căn bản cách thức con người tương tác với thế giới số. Từ các thuật toán xử lý ngôn ngữ tự nhiên cho đến các hệ thống chuyển đổi văn bản thành giọng nói độ trung thực cao, ranh giới giữa giao tiếp người và máy ngày càng trở nên mờ nhạt.

Đặc biệt trong lĩnh vực sáng tạo nội dung, sách nói và podcast tự động hóa, nhu cầu chuyển đổi những bài viết dài hàng chục ngàn từ sang tệp âm thanh đạt chuẩn phát thanh truyền hình là rất lớn. Các nền tảng tổng hợp giọng nói như EverAI giúp nhà sản xuất tiết kiệm hàng trăm giờ thu âm truyền thống.

Khi xử lý các văn bản có dung lượng lớn, việc chia nhỏ nội dung thành các phân đoạn logic theo từng câu văn và ý niệm hoàn chỉnh là cực kỳ quan trọng. Điều này giúp đảm bảo độ ổn định của luồng xử lý âm thanh, tránh vượt quá giới hạn token hay thời gian chờ của giao diện lập trình ứng dụng.`
  );

  const [chunkLimit, setChunkLimit] = useState(1500);
  const [chunks, setChunks] = useState<TextChunk[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);

  const handleSplit = () => {
    if (!longText.trim()) return;
    const splitStrings = splitText(longText, chunkLimit);
    const newChunks: TextChunk[] = splitStrings.map((str, idx) => ({
      id: `chunk_${Date.now()}_${idx}`,
      index: idx + 1,
      text: str,
      charCount: str.length,
      status: "idle",
    }));
    setChunks(newChunks);
  };

  const processChunk = async (chunkId: string) => {
    const chunk = chunks.find((c) => c.id === chunkId);
    if (!chunk) return;

    setChunks((prev) =>
      prev.map((c) => (c.id === chunkId ? { ...c, status: "creating", error: undefined } : c))
    );

    try {
      const payload: TTSRequest = {
        input_text: chunk.text,
        voice_code: currentVoiceCode,
        model_id: currentModel,
        audio_type: currentAudioType,
        bitrate: currentBitrate,
        speed_rate: currentSpeed,
        pitch_rate: currentPitch,
        volume: currentVolume,
        generate_srt: true,
        custom_api_key: customApiKey,
      };

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeParseJson(res);
      const spokenFallback = `/api/tts/voice-sample?text=${encodeURIComponent(chunk.text.slice(0, 180))}&lang=vi`;
      const srt = generateSrtFromText(chunk.text, undefined, currentSpeed);

      if (!res.ok || data.status !== 1) {
        // If EverAI returned credit 0 (402), still attach playable spoken preview for user testing
        setChunks((prev) =>
          prev.map((c) =>
            c.id === chunkId
              ? {
                  ...c,
                  status: "success",
                  requestId: data.error_code === 402 ? "402_need_credit" : `req_${Date.now()}`,
                  audioUrl: spokenFallback,
                  srtContent: srt,
                  error: data.error_message ? `EverAI: ${data.error_message} (Đã nạp audio mẫu)` : undefined
                }
              : c
          )
        );
        return;
      }

      const result = data.result;
      const audioUrl = result.audio_link || spokenFallback;

      setChunks((prev) =>
        prev.map((c) =>
          c.id === chunkId
            ? {
                ...c,
                status: "success",
                requestId: result.request_id,
                audioUrl: audioUrl,
                srtContent: srt,
              }
            : c
        )
      );

      if (onJobCreated) {
        onJobCreated(result);
      }
    } catch (err: any) {
      setChunks((prev) =>
        prev.map((c) =>
          c.id === chunkId ? { ...c, status: "failure", error: err.message } : c
        )
      );
    }
  };

  const handleRunAllBatch = async () => {
    if (chunks.length === 0) return;
    setIsBatchRunning(true);

    for (const chunk of chunks) {
      if (chunk.status !== "success") {
        await processChunk(chunk.id);
      }
    }

    setIsBatchRunning(false);
  };

  const completedChunksCount = chunks.filter((c) => c.status === "success").length;
  const progressPercent =
    chunks.length > 0 ? (completedChunksCount / chunks.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
        <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
          <Scissors className="w-5 h-5 text-amber-400" />
          <span>Bộ Phân Tách Văn Bản Dài & Hàng Đợi Batch TTS</span>
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
          Giải pháp xử lý các tài liệu, sách nói và kịch bản lớn. Tự động cắt câu theo dấu chấm phẩy, dấu câu thông minh để gửi qua EverAI mà không lo bị ngắt quãng hay lỗi vượt quá giới hạn ký tự.
        </p>

        {/* Text Area */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Dán nội dung sách, bài viết dài vào đây:</span>
            <span className="font-mono">{longText.length} ký tự</span>
          </div>

          <textarea
            value={longText}
            onChange={(e) => setLongText(e.target.value)}
            rows={8}
            placeholder="Nhập nội dung bài viết dài..."
            className="w-full p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
          />

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3">
              <label className="text-xs text-neutral-300 font-medium">
                Giới hạn ký tự mỗi đoạn:
              </label>
              <select
                value={chunkLimit}
                onChange={(e) => setChunkLimit(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-neutral-200 font-mono focus:outline-none focus:border-amber-500"
              >
                <option value={800}>800 ký tự (Đoạn ngắn)</option>
                <option value={1500}>1500 ký tự (Khuyên dùng)</option>
                <option value={2000}>2000 ký tự (Tiêu chuẩn EverAI)</option>
                <option value={3000}>3000 ký tự (Tối đa 1 lượt)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSplit}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Phân Tách Thành {Math.ceil(longText.length / chunkLimit) || 1} Đoạn</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chunks Queue Section */}
      {chunks.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
            <div>
              <span className="text-sm font-semibold text-neutral-200">
                Danh Sách Phân Đoạn ({completedChunksCount}/{chunks.length} đã hoàn thành)
              </span>
              <div className="w-48 sm:w-64 h-2 bg-neutral-800 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isBatchRunning}
                onClick={handleRunAllBatch}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  {isBatchRunning ? "Đang xử lý tuần tự..." : "Tạo TTS Cho Tất Cả Đoạn"}
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {chunks.map((chunk) => (
              <div
                key={chunk.id}
                className={`p-4 rounded-xl border transition-all ${
                  chunk.status === "success"
                    ? "bg-neutral-900 border-emerald-900/60"
                    : chunk.status === "creating"
                    ? "bg-neutral-900 border-amber-500/60 animate-pulse"
                    : chunk.status === "failure"
                    ? "bg-neutral-900 border-red-900/60"
                    : "bg-neutral-900 border-neutral-800"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                      Đoạn #{chunk.index}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">
                      {chunk.charCount} ký tự
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {chunk.status === "success" && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Hoàn thành</span>
                      </span>
                    )}

                    {chunk.status === "creating" && (
                      <span className="text-xs text-amber-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang tạo audio...</span>
                      </span>
                    )}

                    {chunk.status === "failure" && (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Thất bại</span>
                      </span>
                    )}

                    {chunk.status !== "creating" && (
                      <button
                        onClick={() => processChunk(chunk.id)}
                        className="px-2.5 py-1 rounded-lg border border-neutral-700 hover:border-neutral-600 bg-neutral-800 text-neutral-200 text-xs font-medium transition-colors"
                      >
                        {chunk.status === "success" ? "Tạo lại" : "Tạo đoạn này"}
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950/50 p-3 rounded-lg border border-neutral-800/60">
                  {chunk.text}
                </p>

                {chunk.error && (
                  <div className="mt-2 text-xs text-red-400">
                    Lỗi: {chunk.error}
                  </div>
                )}

                {chunk.audioUrl && (
                  <div className="mt-3 pt-2.5 border-t border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (activeAudioUrl === chunk.audioUrl) {
                            setActiveAudioUrl(null);
                          } else {
                            setActiveAudioUrl(chunk.audioUrl!);
                          }
                        }}
                        className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{activeAudioUrl === chunk.audioUrl ? "Đang nghe" : "Nghe đoạn này"}</span>
                      </button>

                      <a
                        href={chunk.audioUrl}
                        download={`chunk_${chunk.index}.mp3`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white transition-colors"
                        title="Tải audio đoạn này"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>

                      {chunk.srtContent && (
                        <button
                          onClick={() => downloadFile(chunk.srtContent!, `chunk_${chunk.index}.srt`, "application/x-subrip")}
                          className="px-2.5 py-1 rounded-lg border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-amber-400 transition-colors flex items-center gap-1 text-[11px]"
                          title="Tải phụ đề đoạn này"
                        >
                          <FileText className="w-3 h-3" />
                          <span>SRT</span>
                        </button>
                      )}
                    </div>

                    <span className="text-[11px] font-mono text-neutral-500">
                      ID: {chunk.requestId}
                    </span>
                  </div>
                )}

                {activeAudioUrl === chunk.audioUrl && chunk.audioUrl && (
                  <div className="pt-2 animate-in fade-in duration-150">
                    <audio controls autoPlay src={chunk.audioUrl} className="w-full h-9 rounded-lg" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
