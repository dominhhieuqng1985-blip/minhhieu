import React, { useState } from "react";
import { X, Download, Copy, Check, FileText } from "lucide-react";
import { parseSrtContent, downloadFile } from "../utils/srt";

interface SrtViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  srtContent: string;
  title?: string;
}

export const SrtViewerModal: React.FC<SrtViewerModalProps> = ({
  isOpen,
  onClose,
  srtContent,
  title = "Phụ Đề SRT",
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"cues" | "raw">("cues");

  if (!isOpen) return null;

  const cues = parseSrtContent(srtContent);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(srtContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    downloadFile(srtContent, `subtitle_${Date.now()}.srt`, "application/x-subrip");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-100">{title}</h2>
              <div className="text-xs text-neutral-400">
                {cues.length} phân đoạn thời gian (Subrip SRT format)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-0.5 bg-neutral-800 rounded-lg text-xs">
              <button
                onClick={() => setViewMode("cues")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === "cues"
                    ? "bg-neutral-700 text-white font-medium"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Dòng thời gian
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === "raw"
                    ? "bg-neutral-700 text-white font-medium"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Mã nguồn SRT
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[60vh]">
          {viewMode === "cues" ? (
            <div className="space-y-3">
              {cues.map((cue) => (
                <div
                  key={cue.id}
                  className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex items-start gap-4"
                >
                  <span className="font-mono text-xs text-neutral-500 w-6 shrink-0 pt-0.5">
                    #{cue.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono tabular-nums text-amber-400/90 mb-1">
                      {cue.startTime.toFixed(2)}s ➔ {cue.endTime.toFixed(2)}s
                    </div>
                    <div className="text-sm text-neutral-200 leading-relaxed">
                      {cue.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <pre className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300 whitespace-pre-wrap overflow-x-auto leading-relaxed">
              {srtContent}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="text-xs text-neutral-400">
            Tương thích phần mềm CapCut, Premiere, DaVinci Resolve, VLC
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-200 hover:text-white hover:border-neutral-600 text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Đã sao chép" : "Sao chép SRT"}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-medium shadow-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file .SRT</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
