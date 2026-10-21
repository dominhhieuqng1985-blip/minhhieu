import React, { useState } from "react";
import {
  Play,
  RotateCcw,
  Trash2,
  Download,
  FileText,
  Search,
  Volume2,
  Clock,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { TTSJob } from "../types/tts";
import { downloadFile } from "../utils/srt";

interface HistoryViewProps {
  history: TTSJob[];
  onSelectJob: (job: TTSJob) => void;
  onDeleteJob: (id: string) => void;
  onClearHistory: () => void;
  onLoadIntoEditor: (job: TTSJob) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onSelectJob,
  onDeleteJob,
  onClearHistory,
  onLoadIntoEditor,
}) => {
  const [search, setSearch] = useState("");
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);

  const filteredHistory = history.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.inputText.toLowerCase().includes(q) ||
      item.voiceName.toLowerCase().includes(q) ||
      item.voiceCode.toLowerCase().includes(q) ||
      item.requestId.toLowerCase().includes(q)
    );
  });

  const totalCharacters = history.reduce((acc, curr) => acc + (curr.characters || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div>
          <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <span>Lịch Sử Tạo Giọng Nói</span>
          </h2>
          <div className="text-xs text-neutral-400 mt-1 flex items-center gap-3">
            <span>Tổng cộng: <strong className="text-neutral-200">{history.length}</strong> bản thu</span>
            <span aria-hidden="true">·</span>
            <span>Ký tự đã tạo: <strong className="text-amber-400 font-mono">{totalCharacters.toLocaleString()}</strong> ký tự</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-xs text-neutral-400 hover:text-red-400 px-3 py-1.5 rounded-lg border border-neutral-800 hover:border-red-900/60 hover:bg-red-950/20 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa toàn bộ</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      {history.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Tìm theo nội dung, giọng đọc, request_id..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      )}

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-neutral-900/40 border border-neutral-800/80">
          <Volume2 className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-300">
            {history.length === 0 ? "Chưa có bản ghi âm nào" : "Không tìm thấy kết quả phù hợp"}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Các tệp âm thanh được tạo từ màn hình Studio sẽ tự động lưu trữ tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item) => {
            const dateStr = new Date(item.createdAt).toLocaleString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700/80 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm text-neutral-100">
                      {item.voiceName}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">
                      {item.modelId}
                    </span>
                    <span className="text-[11px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                      {item.audioType} {item.bitrate ? `· ${item.bitrate}k` : ""}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">
                      {dateStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      onClick={() => onLoadIntoEditor(item)}
                      className="px-2.5 py-1 text-xs text-neutral-300 hover:text-amber-400 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1"
                      title="Nạp lại vào Studio"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Nạp vào Studio</span>
                    </button>

                    <button
                      onClick={() => onDeleteJob(item.id)}
                      className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Xóa bản ghi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Text excerpt */}
                <p className="text-xs sm:text-sm text-neutral-300 line-clamp-3 leading-relaxed bg-neutral-950/40 p-3 rounded-xl border border-neutral-800/60 font-sans">
                  "{item.inputText}"
                </p>

                {/* Request info & quick actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                  <div className="flex items-center gap-2 text-neutral-400 font-mono text-[11px]">
                    <span>ID: {item.requestId}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.characters} ký tự</span>
                    <span aria-hidden="true">·</span>
                    <span>Tốc độ {item.speedRate}x</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.audioUrl && (
                      <>
                        <button
                          onClick={() => {
                            if (activeAudioUrl === item.audioUrl) {
                              setActiveAudioUrl(null);
                            } else {
                              setActiveAudioUrl(item.audioUrl || null);
                            }
                          }}
                          className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{activeAudioUrl === item.audioUrl ? "Đang nghe" : "Nghe"}</span>
                        </button>

                        <a
                          href={item.audioUrl}
                          download={`everai_${item.id}.${item.audioType}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white transition-colors"
                          title="Tải audio"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </>
                    )}

                    {item.srtContent && (
                      <button
                        onClick={() => downloadFile(item.srtContent!, `subtitle_${item.id}.srt`, "application/x-subrip")}
                        className="px-2.5 py-1 rounded-lg border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-amber-400 transition-colors flex items-center gap-1 text-[11px]"
                        title="Tải file SRT"
                      >
                        <FileText className="w-3 h-3" />
                        <span>SRT</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline active audio player */}
                {activeAudioUrl === item.audioUrl && item.audioUrl && (
                  <div className="pt-2 animate-in fade-in duration-150">
                    <audio controls autoPlay src={item.audioUrl} className="w-full h-10 rounded-lg" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
