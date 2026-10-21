import React, { useState } from "react";
import { X, Search, Volume2, Check } from "lucide-react";
import { ALL_VOICES, VIETNAMESE_VOICES, INTERNATIONAL_VOICES } from "../data/voices";
import { VoiceItem } from "../types/tts";
import { playVoicePreview } from "../utils/clientAudio";

interface VoicePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoiceCode: string;
  onSelectVoice: (voice: VoiceItem) => void;
}

export const VoicePickerModal: React.FC<VoicePickerModalProps> = ({
  isOpen,
  onClose,
  selectedVoiceCode,
  onSelectVoice,
}) => {
  const [activeTab, setActiveTab] = useState<"all" | "vn" | "intl">("all");
  const [genderFilter, setGenderFilter] = useState<"all" | "Nam" | "Nữ">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [playingVoiceCode, setPlayingVoiceCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentList =
    activeTab === "vn"
      ? VIETNAMESE_VOICES
      : activeTab === "intl"
      ? INTERNATIONAL_VOICES
      : ALL_VOICES;

  const filteredVoices = currentList.filter((v) => {
    if (genderFilter !== "all" && v.gender !== genderFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = v.name.toLowerCase().includes(q);
      const matchDesc = v.description.toLowerCase().includes(q);
      const matchRegion = v.region.toLowerCase().includes(q);
      const matchLang = v.language.toLowerCase().includes(q);
      const matchTags = v.tags?.some((t) => t.toLowerCase().includes(q));
      return matchName || matchDesc || matchRegion || matchLang || matchTags;
    }
    return true;
  });

  const handlePreviewVoice = async (voice: VoiceItem) => {
    try {
      setPlayingVoiceCode(voice.code);
      await playVoicePreview(voice.sampleText, voice.langCode, 1.0, 1.0, 1.0, voice.code, voice.sampleAudio);
    } catch (err) {
      console.error(err);
    } finally {
      setPlayingVoiceCode(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
              <span>Chọn Giọng Đọc Đỗ Minh Hiếu AI</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Studio Edition
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Hệ thống độc quyền hỗ trợ 10 giọng Tiếng Việt đa vùng miền cùng các giọng quốc tế chuẩn phòng thu.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b border-neutral-800/80 bg-neutral-950/40 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-neutral-800/80 rounded-xl overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "all"
                  ? "bg-amber-500 text-neutral-950 font-semibold shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Tất Cả ({ALL_VOICES.length} giọng)
            </button>
            <button
              onClick={() => setActiveTab("vn")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "vn"
                  ? "bg-amber-500 text-neutral-950 font-semibold shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Tiếng Việt ({VIETNAMESE_VOICES.length})
            </button>
            <button
              onClick={() => setActiveTab("intl")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "intl"
                  ? "bg-amber-500 text-neutral-950 font-semibold shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Quốc Tế ({INTERNATIONAL_VOICES.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Gender filter */}
            <div className="flex items-center gap-1 p-1 bg-neutral-800/80 rounded-xl text-xs">
              <button
                onClick={() => setGenderFilter("all")}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  genderFilter === "all"
                    ? "bg-neutral-700 text-white font-medium"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Cả Nam & Nữ
              </button>
              <button
                onClick={() => setGenderFilter("Nữ")}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  genderFilter === "Nữ"
                    ? "bg-neutral-700 text-white font-medium"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Nữ
              </button>
              <button
                onClick={() => setGenderFilter("Nam")}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  genderFilter === "Nam"
                    ? "bg-neutral-700 text-white font-medium"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Nam
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Tìm tên, vùng miền..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700/60 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Voice Grid */}
        <div className="p-4 overflow-y-auto max-h-[60vh] grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredVoices.map((voice) => {
            const isSelected = voice.code === selectedVoiceCode;
            const isPlaying = playingVoiceCode === voice.code;

            return (
              <div
                key={voice.code}
                onClick={() => onSelectVoice(voice)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-amber-950/20 border-amber-500/80 shadow-md shadow-amber-950/20"
                    : "bg-neutral-950/50 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/40"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                          voice.gender === "Nữ"
                            ? "bg-pink-950/60 text-pink-300 border border-pink-800/40"
                            : "bg-blue-950/60 text-blue-300 border border-blue-800/40"
                        }`}
                      >
                        {voice.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-neutral-100 text-sm">
                            {voice.name}
                          </span>
                          {voice.code === "vi_male_nhanvatnam_default" && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-neutral-950 shadow-sm shadow-amber-500/30">
                              MẶC ĐỊNH
                            </span>
                          )}
                          <span className="text-[11px] text-neutral-400 font-normal">
                            {voice.gender} · {voice.region}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-medium ${
                              voice.creditCost <= 100
                                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/40"
                                : "bg-neutral-800 text-neutral-300"
                            }`}
                          >
                            {voice.creditCost} cr/1k
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono">
                          {voice.code}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="p-1 rounded-full bg-amber-500 text-neutral-950">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-neutral-300 mt-2.5 line-clamp-2 leading-relaxed">
                    {voice.description}
                  </p>

                  {voice.tags && (
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-neutral-400">
                      {voice.tags.map((tag, i) => (
                        <React.Fragment key={tag}>
                          {i > 0 && <span aria-hidden="true">·</span>}
                          <span>{tag}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-neutral-800/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewVoice(voice);
                    }}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                      isPlaying
                        ? "border-amber-500 text-amber-300 bg-amber-950/40 animate-pulse"
                        : "border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800"
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isPlaying ? "Đang đọc mẫu..." : "Nghe thử"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectVoice(voice);
                      onClose();
                    }}
                    className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                      isSelected
                        ? "bg-amber-500 text-neutral-950 font-semibold"
                        : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                    }`}
                  >
                    {isSelected ? "Đang chọn" : "Chọn giọng"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex justify-between items-center bg-neutral-950/60 text-xs text-neutral-400">
          <span>Tìm thấy {filteredVoices.length} giọng đọc phù hợp</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
