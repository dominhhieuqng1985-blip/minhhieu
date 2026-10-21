import React, { useState } from "react";
import { Search, Volume2, ArrowRight, Sparkles } from "lucide-react";
import { ALL_VOICES, VIETNAMESE_VOICES, INTERNATIONAL_VOICES } from "../data/voices";
import { VoiceItem } from "../types/tts";
import { playVoicePreview } from "../utils/clientAudio";

interface VoiceLibraryViewProps {
  onSelectAndGoToStudio: (voice: VoiceItem) => void;
  currentVoiceCode: string;
}

export const VoiceLibraryView: React.FC<VoiceLibraryViewProps> = ({
  onSelectAndGoToStudio,
  currentVoiceCode,
}) => {
  const [activeTab, setActiveTab] = useState<"all" | "vn" | "intl">("all");
  const [genderFilter, setGenderFilter] = useState<"all" | "Nam" | "Nữ">("all");
  const [search, setSearch] = useState("");
  const [playingCode, setPlayingCode] = useState<string | null>(null);

  const list =
    activeTab === "vn"
      ? VIETNAMESE_VOICES
      : activeTab === "intl"
      ? INTERNATIONAL_VOICES
      : ALL_VOICES;

  const filtered = list.filter((v) => {
    if (genderFilter !== "all" && v.gender !== genderFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        v.region.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.language.toLowerCase().includes(q) ||
        v.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handlePreview = async (voice: VoiceItem) => {
    try {
      setPlayingCode(voice.code);
      await playVoicePreview(voice.sampleText, voice.langCode, 1.0, 1.0, 1.0, voice.code, voice.sampleAudio);
    } catch (e) {
      console.error(e);
    } finally {
      setPlayingCode(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
        <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>Thư Viện Giọng Đọc Đỗ Minh Hiếu AI</span>
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
          Khám phá danh sách các giọng đọc trí tuệ nhân tạo bản quyền Đỗ Minh Hiếu AI được huấn luyện riêng biệt theo ngữ điệu vùng miền Việt Nam và tiêu chuẩn phát thanh đa ngôn ngữ cao cấp.
        </p>

        {/* Filters bar */}
        <div className="mt-5 pt-4 border-t border-neutral-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-1 p-1 bg-neutral-800/80 rounded-xl text-xs">
            <button
              onClick={() => setActiveTab("vn")}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                activeTab === "vn"
                  ? "bg-amber-500 text-neutral-950 font-semibold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Tiếng Việt ({VIETNAMESE_VOICES.length})
            </button>
            <button
              onClick={() => setActiveTab("intl")}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                activeTab === "intl"
                  ? "bg-amber-500 text-neutral-950 font-semibold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Quốc Tế ({INTERNATIONAL_VOICES.length})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                activeTab === "all"
                  ? "bg-amber-500 text-neutral-950 font-semibold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Tất Cả ({ALL_VOICES.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-neutral-800/80 rounded-xl text-xs">
              <button
                onClick={() => setGenderFilter("all")}
                className={`px-2.5 py-1 rounded-lg ${
                  genderFilter === "all" ? "bg-neutral-700 text-white font-medium" : "text-neutral-400"
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setGenderFilter("Nữ")}
                className={`px-2.5 py-1 rounded-lg ${
                  genderFilter === "Nữ" ? "bg-neutral-700 text-white font-medium" : "text-neutral-400"
                }`}
              >
                Nữ
              </button>
              <button
                onClick={() => setGenderFilter("Nam")}
                className={`px-2.5 py-1 rounded-lg ${
                  genderFilter === "Nam" ? "bg-neutral-700 text-white font-medium" : "text-neutral-400"
                }`}
              >
                Nam
              </button>
            </div>

            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Tìm giọng, miền, phong cách..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Voices */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((voice) => {
          const isSelected = voice.code === currentVoiceCode;
          const isPlaying = playingCode === voice.code;

          return (
            <div
              key={voice.code}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                isSelected
                  ? "bg-amber-950/20 border-amber-500/70"
                  : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base ${
                        voice.gender === "Nữ"
                          ? "bg-pink-950/70 text-pink-300 border border-pink-800/40"
                          : "bg-blue-950/70 text-blue-300 border border-blue-800/40"
                      }`}
                    >
                      {voice.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-base font-semibold text-neutral-100 flex items-center gap-2 flex-wrap">
                        <span>{voice.name}</span>
                        {voice.code === "vi_male_nhanvatnam_default" && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-neutral-950 shadow-sm shadow-amber-500/30">
                            MẶC ĐỊNH
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
                            voice.creditCost <= 100
                              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/40"
                              : "bg-neutral-800 text-neutral-300"
                          }`}
                        >
                          {voice.creditCost} credits / 1k
                        </span>
                        {isSelected && (
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500 text-neutral-950 font-bold">
                            Đang dùng
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        {voice.gender} · {voice.region} · {voice.language}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-neutral-300 mt-3.5 line-clamp-3 leading-relaxed">
                  {voice.description}
                </p>

                {/* Sample Sentence Quote */}
                <div className="mt-3 p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/60 text-[11px] text-neutral-400 italic">
                  "{voice.sampleText}"
                </div>

                {voice.tags && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-3 text-[11px] text-neutral-400">
                    {voice.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-neutral-800/80 text-neutral-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-neutral-800/70 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handlePreview(voice)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                    isPlaying
                      ? "border-amber-500 text-amber-300 bg-amber-950/40 animate-pulse"
                      : "border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isPlaying ? "Đang đọc..." : "Nghe thử"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectAndGoToStudio(voice)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm"
                >
                  <span>Dùng giọng này</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
