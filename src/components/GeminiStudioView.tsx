import React, { useState, useEffect } from "react";
import {
  Sparkles,
  FileText,
  Music,
  Image as ImageIcon,
  Film,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  Sliders,
  Layers,
  Wand2,
  Clock,
  Volume2,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  Maximize2,
  Share2,
  Video,
  Scissors,
  ShieldCheck
} from "lucide-react";
import {
  GeneratedScript,
  GeneratedSong,
  GeneratedImage,
  GeneratedVideo,
  ScriptGenre,
  SongGenre,
  ImageStyle,
  ImageAspectRatio,
  MusicGenre
} from "../types/gemini";
import { VIETNAMESE_VOICES } from "../data/voices";
import { safeParseJson } from "../utils/apiHelper";
import { MusicStudioView } from "./MusicStudioView";

interface GeminiStudioViewProps {
  onSendToStudio: (text: string, voiceCode?: string) => void;
  onNavigateToDubbing?: (audioUrl?: string, videoTempId?: string) => void;
  initialSubTab?: GeminiSubTab;
  initialSongTheme?: string;
  initialScriptTopic?: string;
  onSwitchToMusicTab?: (prompt: string, genre?: MusicGenre) => void;
  onOpenProSettingsModal?: () => void;
}

export type GeminiSubTab = "script" | "song" | "music" | "image" | "video";

export const GeminiStudioView: React.FC<GeminiStudioViewProps> = ({
  onSendToStudio,
  onNavigateToDubbing,
  initialSubTab,
  initialSongTheme,
  initialScriptTopic,
  onSwitchToMusicTab,
  onOpenProSettingsModal
}) => {
  const [activeSubTab, setActiveSubTab] = useState<GeminiSubTab>(initialSubTab || "script");
  const [musicInitialPrompt, setMusicInitialPrompt] = useState<string>("");
  const [musicInitialGenre, setMusicInitialGenre] = useState<MusicGenre>("lofi");
  const [musicInitialMood, setMusicInitialMood] = useState<string>("");

  const isProLinked = localStorage.getItem("gemini_pro_account_connected") === "true";
  const hasCustomKey = !!localStorage.getItem("gemini_custom_pro_api_key");

  const getAiHeaders = () => {
    const customKey = localStorage.getItem("gemini_custom_pro_api_key") || "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (customKey.trim()) {
      headers["x-gemini-api-key"] = customKey.trim();
    }
    return headers;
  };

  useEffect(() => {
    if (initialSubTab) setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    if (initialSongTheme) setSongTheme(initialSongTheme);
  }, [initialSongTheme]);

  useEffect(() => {
    if (initialScriptTopic) setScriptTopic(initialScriptTopic);
  }, [initialScriptTopic]);

  // ----------------------------------------------------------------------
  // TAB 1: SCRIPT STATE
  // ----------------------------------------------------------------------
  const [scriptTopic, setScriptTopic] = useState(
    "5 sự thật kinh ngạc về trí tuệ nhân tạo và tương lai loài người trong năm 2030"
  );
  const [scriptGenre, setScriptGenre] = useState<ScriptGenre>("tiktok_reels");
  const [scriptDuration, setScriptDuration] = useState("60s");
  const [scriptTone, setScriptTone] = useState("Lôi cuốn, giật gân, cuốn hút từng giây");
  const [scriptAudience, setScriptAudience] = useState("Khán giả trẻ, yêu thích công nghệ & tương lai");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptResult, setScriptResult] = useState<GeneratedScript | null>(null);
  const [scriptCopied, setScriptCopied] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  // ----------------------------------------------------------------------
  // TAB 2: SONG STATE
  // ----------------------------------------------------------------------
  const [songTheme, setSongTheme] = useState("Ký ức tình yêu dưới cơn mưa mùa thu Hà Nội, nỗi nhớ da diết và hy vọng ngày mai");
  const [songGenre, setSongGenre] = useState<SongGenre>("ballad");
  const [songMood, setSongMood] = useState("Sâu lắng, xúc động, da diết nhưng ấm áp");
  const [songVocalGender, setSongVocalGender] = useState("Nam");
  const [isGeneratingSong, setIsGeneratingSong] = useState(false);
  const [songResult, setSongResult] = useState<GeneratedSong | null>(null);
  const [songCopied, setSongCopied] = useState(false);
  const [songError, setSongError] = useState<string | null>(null);
  const [isPlayingSongAudio, setIsPlayingSongAudio] = useState(false);
  const songAudioRef = React.useRef<HTMLAudioElement | null>(null);

  // ----------------------------------------------------------------------
  // TAB 3: IMAGE STATE
  // ----------------------------------------------------------------------
  const [imagePrompt, setImagePrompt] = useState(
    "Góc phố cổ Hà Nội mùa thu với lá vàng rơi lãng mạn, cô gái trẻ mặc áo dài trắng duyên dáng cầm hoa sen, ánh nắng chiều tà ấm áp, phong cách điện ảnh 8K"
  );
  const [imageStyle, setImageStyle] = useState<ImageStyle>("cinematic");
  const [imageAspectRatio, setImageAspectRatio] = useState<ImageAspectRatio>("16:9");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageResult, setImageResult] = useState<GeneratedImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [copiedImagePrompt, setCopiedImagePrompt] = useState(false);

  // ----------------------------------------------------------------------
  // TAB 4: VIDEO STATE
  // ----------------------------------------------------------------------
  const [videoTitle, setVideoTitle] = useState("Hành Trình Khám Phá Trí Tuệ Nhân Tạo 2026");
  const [videoScriptText, setVideoScriptText] = useState(
    "Chào mừng bạn đến với thế giới trí tuệ nhân tạo. Nơi những ý tưởng táo bạo nhất trở thành hiện thực chỉ trong tích tắc với sức mạnh của công nghệ thế hệ mới."
  );
  const [videoVoiceCode, setVideoVoiceCode] = useState("vi_male_nhanvatnam_default");
  const [videoAspectRatio, setVideoAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [videoImageSource, setVideoImageSource] = useState<string>("");
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoResult, setVideoResult] = useState<GeneratedVideo | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // ----------------------------------------------------------------------
  // HANDLERS
  // ----------------------------------------------------------------------

  // 1. Script Handler
  const handleGenerateScript = async () => {
    if (!scriptTopic.trim()) return;
    setIsGeneratingScript(true);
    setScriptError(null);
    try {
      const res = await fetch("/api/ai/script", {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({
          topic: scriptTopic.trim(),
          genre: scriptGenre,
          targetDuration: scriptDuration,
          tone: scriptTone,
          targetAudience: scriptAudience
        })
      });
      const data = await safeParseJson(res);
      if (!res.ok || data.status !== 1 || !data.result) {
        throw new Error(data.error_message || "Không thể tạo kịch bản.");
      }
      setScriptResult(data.result);
      // Also automatically populate video script text for cross-studio synergy!
      setVideoScriptText(data.result.fullVoiceoverText || "");
      setVideoTitle(data.result.title || "");
    } catch (err: any) {
      setScriptError(err.message || "Lỗi tạo kịch bản.");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // 2. Song Handler
  const handleGenerateSong = async () => {
    if (!songTheme.trim()) return;
    setIsGeneratingSong(true);
    setSongError(null);
    try {
      const res = await fetch("/api/ai/song", {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({
          theme: songTheme.trim(),
          genre: songGenre,
          mood: songMood,
          vocalGender: songVocalGender
        })
      });
      const data = await safeParseJson(res);
      if (!res.ok || data.status !== 1 || !data.result) {
        throw new Error(data.error_message || "Không thể sáng tác bài hát.");
      }
      setSongResult(data.result);
    } catch (err: any) {
      setSongError(err.message || "Lỗi sáng tác bài hát.");
    } finally {
      setIsGeneratingSong(false);
    }
  };

  // 3. Image Handler
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    setImageError(null);
    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({
          prompt: imagePrompt.trim(),
          style: imageStyle,
          aspectRatio: imageAspectRatio
        })
      });
      const data = await safeParseJson(res);
      if (!res.ok || data.status !== 1 || !data.result) {
        throw new Error(data.error_message || "Không thể tạo ảnh.");
      }
      setImageResult(data.result);
      // Auto-assign as candidate background image for Video tab!
      setVideoImageSource(data.result.imageUrl);
    } catch (err: any) {
      setImageError(err.message || "Lỗi tạo ảnh.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 4. Video Handler
  const handleGenerateVideo = async () => {
    if (!videoScriptText.trim()) {
      setVideoError("Vui lòng nhập lời thoại / kịch bản cho video.");
      return;
    }
    setIsGeneratingVideo(true);
    setVideoError(null);
    try {
      const res = await fetch("/api/ai/video", {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({
          type: "storyboard",
          title: videoTitle.trim() || "Video AI",
          scriptText: videoScriptText.trim(),
          imageFilenameOrUrl: videoImageSource || undefined,
          voiceCode: videoVoiceCode,
          aspectRatio: videoAspectRatio
        })
      });
      const data = await safeParseJson(res);
      if (!res.ok || data.status !== 1 || !data.result) {
        throw new Error(data.error_message || "Không thể tạo video.");
      }
      setVideoResult(data.result);
    } catch (err: any) {
      setVideoError(err.message || "Lỗi tạo video.");
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Copy helper
  const copyText = (txt: string, cb: (v: boolean) => void) => {
    navigator.clipboard.writeText(txt);
    cb(true);
    setTimeout(() => cb(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Studio Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-950/40 via-neutral-900 to-indigo-950/30 border border-amber-500/20 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Gemini Pro Creative Studio • Đỗ Minh Hiếu AI</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500 text-neutral-950 text-[10px] font-black uppercase">
                {isProLinked ? "PRO VERIFIED" : hasCustomKey ? "CUSTOM KEY" : "ACTIVE"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Trung Tâm Sáng Tạo Kịch Bản, Bài Hát, Ảnh & Video AI
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
              Tích hợp sức mạnh của mô hình <strong className="text-amber-400">Gemini Pro</strong>: viết kịch bản triệu view,
              sáng tác trọn vẹn ca khúc với hợp âm, tạo bản nhạc nền & beat hòa tấu MP3, vẽ hình ảnh minh họa 8K và tự động đóng gói thành video hoàn chỉnh kèm giọng lồng tiếng Đỗ Minh Hiếu AI.
            </p>

            {/* Quick Action Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold transition-colors"
                title="Mở ứng dụng gemini.google.com với tài khoản Pro"
              >
                <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                <span>Mở gemini.google.com (Gói Pro)</span>
              </button>

              {onOpenProSettingsModal && (
                <button
                  onClick={onOpenProSettingsModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isProLinked ? "Tài Khoản Pro: Đã Kết Nối" : "Cấu Hình Gói Pro"}</span>
                </button>
              )}
            </div>
          </div>

          {/* 5 Creative Sub-Tabs */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 p-1.5 bg-neutral-950 rounded-2xl border border-neutral-800 shrink-0">
            <button
              onClick={() => setActiveSubTab("script")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === "script"
                  ? "bg-amber-500 text-neutral-950 shadow-md font-extrabold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Viết Kịch Bản</span>
            </button>

            <button
              onClick={() => setActiveSubTab("song")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === "song"
                  ? "bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-md font-extrabold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Music className="w-4 h-4" />
              <span>Tạo Bài Hát</span>
            </button>

            <button
              onClick={() => setActiveSubTab("music")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === "music"
                  ? "bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 text-white shadow-md font-extrabold"
                  : "text-pink-400/90 hover:text-pink-300"
              }`}
            >
              <Music className="w-4 h-4 text-pink-400" />
              <span>Tạo Nhạc AI</span>
              <span className="text-[9px] px-1 py-0.2 bg-pink-500/20 text-pink-300 rounded font-black border border-pink-500/30">
                MỚI
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab("image")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === "image"
                  ? "bg-gradient-to-r from-indigo-500 to-purple-400 text-white shadow-md font-extrabold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Tạo Ảnh AI</span>
            </button>

            <button
              onClick={() => setActiveSubTab("video")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === "video"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-neutral-950 shadow-md font-extrabold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Tạo Video AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1. VIẾT KỊCH BẢN (AI SCRIPTWRITER) */}
      {/* ==================================================================== */}
      {activeSubTab === "script" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <span>Biên Soạn Kịch Bản Video & Thuyết Minh Chuẩn Điện Ảnh</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Gemini Pro tự động thiết kế Hook 3 giây đầu, phân cảnh visual prompt cho từng giây, và tổng hợp lời đọc voiceover chuẩn xác.
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                GEMINI 3.1 PRO
              </span>
            </div>

            {/* Quick Sample Topics */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-neutral-400 font-semibold">Gợi ý chủ đề thịnh hành:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "🚀 5 Sự thật AI 2030", topic: "5 sự thật kinh ngạc về trí tuệ nhân tạo và tương lai loài người trong năm 2030" },
                  { label: "🎬 Phim ngắn Sài Gòn", topic: "Cuộc gặp gỡ định mệnh giữa cơn mưa chiều Sài Gòn và lá thư chưa kịp gửi sau 10 năm" },
                  { label: "🎙️ Podcast Tâm sự", topic: "Nghệ thuật buông bỏ muộn phiền để tìm lại sự an nhiên tĩnh lặng giữa dòng đời biến chuyển" },
                  { label: "🛍️ TVC Tai nghe công nghệ", topic: "Giới thiệu tai nghe chống ồn chủ động cao cấp thế hệ mới, âm thanh chuẩn phòng thu" },
                  { label: "👻 Truyện bí ẩn đêm khuya", topic: "Bí ẩn ngôi biệt thự cổ bỏ hoang trên đồi thông Đà Lạt và tiếng đàn dương cầm lúc nửa đêm" }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setScriptTopic(item.topic)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-amber-400 border border-neutral-700/60 text-xs transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Chủ Đề Hoặc Ý Tưởng Cần Viết Kịch Bản:
                </label>
                <textarea
                  value={scriptTopic}
                  onChange={(e) => setScriptTopic(e.target.value)}
                  rows={3}
                  placeholder="Nhập chi tiết chủ đề, nhân vật, thông điệp muốn truyền tải..."
                  className="w-full p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Genre */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Thể loại kịch bản:</label>
                  <select
                    value={scriptGenre}
                    onChange={(e) => setScriptGenre(e.target.value as ScriptGenre)}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="tiktok_reels">Video ngắn TikTok / Reels / Shorts</option>
                    <option value="short_film">Phim ngắn điện ảnh</option>
                    <option value="documentary">Thuyết minh tài liệu, lịch sử</option>
                    <option value="podcast">Podcast chia sẻ, tâm sự</option>
                    <option value="tvc_commercial">TVC Quảng cáo bán hàng</option>
                    <option value="storytelling">Kể chuyện đêm khuya, ngụ ngôn</option>
                    <option value="educational">Bài giảng, cẩm nang giáo dục</option>
                    <option value="news">Bản tin thời sự, kinh tế</option>
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Thời lượng mục tiêu:</label>
                  <select
                    value={scriptDuration}
                    onChange={(e) => setScriptDuration(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="30s">30 giây (TikTok siêu ngắn)</option>
                    <option value="60s">60 giây (Shorts tiêu chuẩn)</option>
                    <option value="3 phút">3 phút (Video vừa)</option>
                    <option value="5 phút">5 phút (Thuyết minh sâu)</option>
                    <option value="10 phút">10 phút (Phim/Podcast dài)</option>
                  </select>
                </div>

                {/* Tone */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Phong cách giọng điệu:</label>
                  <input
                    type="text"
                    value={scriptTone}
                    onChange={(e) => setScriptTone(e.target.value)}
                    placeholder="Lôi cuốn, hài hước, sâu sắc..."
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Audience */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Đối tượng khán giả:</label>
                  <input
                    type="text"
                    value={scriptAudience}
                    onChange={(e) => setScriptAudience(e.target.value)}
                    placeholder="Giới trẻ, đại chúng, doanh nhân..."
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {scriptError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-300">
                {scriptError}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleGenerateScript}
                disabled={isGeneratingScript || !scriptTopic.trim()}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 active:scale-[0.99] text-neutral-950 font-black text-sm shadow-xl shadow-amber-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isGeneratingScript ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-neutral-950" />
                    <span>Gemini Pro đang soạn kịch bản...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Viết Kịch Bản Với Gemini Pro</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Script Output Result */}
          {scriptResult && (
            <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-6 animate-in fade-in">
              {/* Header Box */}
              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                      {scriptResult.genre} • {scriptResult.targetDuration}
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white">{scriptResult.title}</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onSendToStudio(scriptResult.fullVoiceoverText, scriptResult.recommendedVoice)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 font-black text-xs hover:brightness-110 transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Đưa Vào Đọc TTS Ngay</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        setVideoScriptText(scriptResult.fullVoiceoverText);
                        setVideoTitle(scriptResult.title);
                        setActiveSubTab("video");
                      }}
                      className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs border border-neutral-700 transition-colors flex items-center gap-1.5"
                    >
                      <Film className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tạo Video Từ Kịch Bản</span>
                    </button>

                    <button
                      onClick={() => {
                        setMusicInitialPrompt(`Nhạc nền phong cách ${scriptGenre} cho kịch bản: "${scriptResult.title}". Giọng điệu: ${scriptTone}`);
                        setActiveSubTab("music");
                      }}
                      className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-pink-300 font-bold text-xs border border-neutral-700 transition-colors flex items-center gap-1.5"
                    >
                      <Music className="w-3.5 h-3.5 text-pink-400" />
                      <span>Tạo Nhạc Nền</span>
                    </button>

                    <button
                      onClick={() => copyText(scriptResult.fullVoiceoverText, setScriptCopied)}
                      className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors"
                      title="Sao chép toàn bộ lời thoại"
                    >
                      {scriptCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Hook quote */}
                {scriptResult.hook && (
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200">
                    <span className="font-bold text-amber-400">⚡ Hook 3 Giây Mở Đầu:</span> &ldquo;{scriptResult.hook}&rdquo;
                  </div>
                )}
                {scriptResult.summary && (
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    <strong>Tóm tắt:</strong> {scriptResult.summary}
                  </p>
                )}
              </div>

              {/* Scene-by-scene Timeline */}
              {scriptResult.scenes && scriptResult.scenes.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Chi Tiết Từng Phân Cảnh (Scene Breakdown):
                  </h4>

                  <div className="space-y-3">
                    {scriptResult.scenes.map((scene) => (
                      <div
                        key={scene.sceneNumber}
                        className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800 hover:border-neutral-700 transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="px-2.5 py-0.5 rounded-lg bg-neutral-800 font-bold font-mono text-amber-400">
                            Cảnh {scene.sceneNumber} ({scene.timeCode})
                          </span>
                          {scene.soundEffect && (
                            <span className="text-[11px] text-neutral-500 italic">
                              SFX: {scene.soundEffect}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {/* Visual prompt */}
                          <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center justify-between">
                              <span>Mô Tả Hình Ảnh (Visual Prompt)</span>
                              <button
                                onClick={() => {
                                  setImagePrompt(scene.visualPrompt);
                                  setActiveSubTab("image");
                                }}
                                className="text-indigo-400 hover:underline flex items-center gap-0.5 text-[10px]"
                              >
                                <ImageIcon className="w-3 h-3" />
                                <span>Tạo ảnh cảnh này</span>
                              </button>
                            </span>
                            <p className="text-neutral-300 leading-relaxed font-sans">{scene.visualPrompt}</p>
                          </div>

                          {/* Voiceover */}
                          <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                              <Volume2 className="w-3 h-3" />
                              <span>Lời Thuyết Minh (Voiceover)</span>
                            </span>
                            <p className="text-neutral-100 font-medium leading-relaxed">&ldquo;{scene.voiceoverText}&rdquo;</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Voiceover Box */}
              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    <span>Toàn Bộ Lời Thoại Liền Mạch (Sẵn Sàng Cho TTS):</span>
                  </span>
                  <button
                    onClick={() => onSendToStudio(scriptResult.fullVoiceoverText, scriptResult.recommendedVoice)}
                    className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>Mở Trong TTS Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs sm:text-sm text-neutral-200 leading-relaxed whitespace-pre-line font-sans">
                  {scriptResult.fullVoiceoverText}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. SÁNG TÁC BÀI HÁT & LỜI NHẠC (AI SONG & MUSIC STUDIO) */}
      {/* ==================================================================== */}
      {activeSubTab === "song" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Music className="w-5 h-5 text-pink-400" />
                  <span>Sáng Tác Bài Hát & Hòa Âm Lời Nhạc Với Gemini Pro</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Tự động phối hợp vần điệu, điệp khúc bắt tai, hợp âm Guitar/Piano, nhịp BPM và tạo bản nghe thử giọng ca tức thì.
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-pink-500/10 text-pink-400 border border-pink-500/30">
                AI SONGWRITER
              </span>
            </div>

            {/* Quick Song Prompts */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-neutral-400 font-semibold">Gợi ý phong cách ca khúc:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "🎸 Ballad Mùa Thu Hà Nội", theme: "Ký ức tình yêu dưới cơn mưa mùa thu Hà Nội, nỗi nhớ da diết và hy vọng ngày mai", genre: "ballad" as SongGenre },
                  { label: "🎤 Rap Khát Vọng Tuổi Trẻ", theme: "Khát vọng tuổi trẻ vươn tới đỉnh vinh quang, vượt qua chông gai thất bại để thành công", genre: "rap" as SongGenre },
                  { label: "🌸 Bolero Sông Quê", theme: "Chiều qua bến sông quê xưa, nhớ bóng hình người mẹ tảo tần và câu hò ru ấu thơ", genre: "bolero" as SongGenre },
                  { label: "⚡ Pop Dance Bùng Cháy", theme: "Năng lượng bùng cháy ngày mới, tự tin tỏa sáng giữa thành phố rực rỡ sắc màu", genre: "pop" as SongGenre },
                  { label: "🧸 Thiếu Nhi Vui Tươi", theme: "Chú mèo con lười biếng bắt bướm trong vườn hoa đón ánh bình minh rạng rỡ", genre: "children" as SongGenre }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSongTheme(item.theme);
                      setSongGenre(item.genre);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-pink-400 border border-neutral-700/60 text-xs transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Chủ Đề Hoặc Cảm Hứng Bài Hát:
                </label>
                <textarea
                  value={songTheme}
                  onChange={(e) => setSongTheme(e.target.value)}
                  rows={3}
                  placeholder="Nhập câu chuyện, cảm xúc hoặc từ khóa bạn muốn gửi gắm vào bài hát..."
                  className="w-full p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Genre */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Thể loại âm nhạc:</label>
                  <select
                    value={songGenre}
                    onChange={(e) => setSongGenre(e.target.value as SongGenre)}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-pink-500"
                  >
                    <option value="ballad">Ballad ngọt ngào, sâu lắng</option>
                    <option value="pop">Pop hiện đại, bắt tai</option>
                    <option value="rap">Rap / Hip-hop vần điệu</option>
                    <option value="rnb">R&B / Soul mượt mà</option>
                    <option value="acoustic">Acoustic / Indie mộc mạc</option>
                    <option value="bolero">Bolero trữ tình quê hương</option>
                    <option value="rock">Rock mạnh mẽ, nhiệt huyết</option>
                    <option value="edm">EDM sôi động, sôi nổi</option>
                    <option value="folk">Dân ca đương đại</option>
                    <option value="children">Nhạc thiếu nhi vui nhộn</option>
                  </select>
                </div>

                {/* Mood */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Tâm trạng & Cảm xúc:</label>
                  <input
                    type="text"
                    value={songMood}
                    onChange={(e) => setSongMood(e.target.value)}
                    placeholder="Sâu lắng, hạnh phúc, hào hùng..."
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-pink-500"
                  />
                </div>

                {/* Vocal Gender */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Giọng hát chính:</label>
                  <select
                    value={songVocalGender}
                    onChange={(e) => setSongVocalGender(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-pink-500"
                  >
                    <option value="Nam">Giọng Nam (Trầm ấm, nội lực)</option>
                    <option value="Nữ">Giọng Nữ (Ngọt ngào, trong trẻo)</option>
                    <option value="Song ca">Song ca Nam Nữ</option>
                  </select>
                </div>
              </div>
            </div>

            {songError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-300">
                {songError}
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleGenerateSong}
                disabled={isGeneratingSong || !songTheme.trim()}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-400 hover:brightness-110 active:scale-[0.99] text-white font-black text-sm shadow-xl shadow-pink-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isGeneratingSong ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Gemini Pro đang soạn nhạc & hòa âm...</span>
                  </>
                ) : (
                  <>
                    <Music className="w-4 h-4" />
                    <span>Sáng Tác Bài Hát Ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Song Output Result */}
          {songResult && (
            <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-6 animate-in fade-in">
              {/* Song Header & Music Meta */}
              <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 uppercase tracking-wider">
                      {songResult.genre} • {songResult.musicalKey} • BPM {songResult.bpm}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white">{songResult.songTitle}</h3>
                    <p className="text-xs text-neutral-400">{songResult.vocalStyle}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Audio Preview Button */}
                    {songResult.audioPreviewUrl && (
                      <button
                        onClick={() => {
                          if (songAudioRef.current) {
                            if (isPlayingSongAudio) {
                              songAudioRef.current.pause();
                              setIsPlayingSongAudio(false);
                            } else {
                              songAudioRef.current.play();
                              setIsPlayingSongAudio(true);
                            }
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white font-black text-xs hover:brightness-110 transition-all flex items-center gap-1.5 shadow-md shadow-pink-500/20"
                      >
                        {isPlayingSongAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>{isPlayingSongAudio ? "Tạm dừng" : "Nghe Thử Giọng Ca"}</span>
                      </button>
                    )}

                    <button
                      onClick={() => onSendToStudio(songResult.fullLyrics, songResult.vocalVoiceCode)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs transition-colors flex items-center gap-1.5"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Đưa Vào Thu Âm TTS</span>
                    </button>

                    <button
                      onClick={() => {
                        const mPrompt = `Bản hòa tấu giai điệu bài hát "${songResult.songTitle}", thể loại ${songResult.genre}, nhịp ${songResult.bpm} BPM, cảm xúc ${songResult.mood}`;
                        const mGenre: MusicGenre =
                          songResult.genre === "ballad" ? "piano_ballad" :
                          songResult.genre === "acoustic" ? "acoustic" :
                          songResult.genre === "bolero" ? "bolero" :
                          songResult.genre === "edm" ? "edm" :
                          songResult.genre === "rnb" ? "rnb" : "lofi";
                        setMusicInitialPrompt(mPrompt);
                        setMusicInitialGenre(mGenre);
                        setMusicInitialMood(songResult.mood);
                        setActiveSubTab("music");
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white font-black text-xs hover:brightness-110 transition-all flex items-center gap-1.5 shadow-md shadow-pink-500/20"
                    >
                      <Music className="w-3.5 h-3.5" />
                      <span>Tạo Nhạc & Beat AI</span>
                    </button>

                    <button
                      onClick={() => copyText(songResult.fullLyrics, setSongCopied)}
                      className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors"
                      title="Sao chép toàn bộ lời bài hát"
                    >
                      {songCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Hidden Audio element */}
                {songResult.audioPreviewUrl && (
                  <audio
                    ref={songAudioRef}
                    src={songResult.audioPreviewUrl}
                    onEnded={() => setIsPlayingSongAudio(false)}
                    className="hidden"
                  />
                )}

                {songResult.compositionNotes && (
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
                    <strong className="text-pink-400">Gợi ý phối khí:</strong> {songResult.compositionNotes}
                  </div>
                )}
              </div>

              {/* Sections Breakdown with Chords */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Cấu Trúc Từng Đoạn & Hợp Âm Đệm (Lyrics & Chords):
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {songResult.sections?.map((sec, idx) => (
                    <div
                      key={idx}
                      className={`p-5 rounded-2xl border transition-all space-y-2.5 ${
                        sec.name.toLowerCase().includes("chorus")
                          ? "bg-pink-950/20 border-pink-500/40 shadow-lg shadow-pink-950/10"
                          : "bg-neutral-950/60 border-neutral-800"
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                        <span className={`text-xs font-black uppercase tracking-wider ${
                          sec.name.toLowerCase().includes("chorus") ? "text-pink-400" : "text-amber-400"
                        }`}>
                          [{sec.name}]
                        </span>
                        {sec.chords && (
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                            {sec.chords}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-xs sm:text-sm text-neutral-200 leading-relaxed font-sans">
                        {sec.lines.map((line, lIdx) => (
                          <p key={lIdx} className="hover:text-white transition-colors">{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2.1 TẠO NHẠC & BEAT AI (AI MUSIC & BEAT STUDIO) */}
      {/* ==================================================================== */}
      {activeSubTab === "music" && (
        <MusicStudioView
          initialPrompt={musicInitialPrompt}
          initialGenre={musicInitialGenre}
          initialMood={musicInitialMood}
          onNavigateToDubbing={onNavigateToDubbing}
          onSendToStudio={onSendToStudio}
          onNavigateToSongwriter={(theme, genre) => {
            setSongTheme(theme);
            if (genre === "piano_ballad") setSongGenre("ballad");
            else if (genre === "acoustic") setSongGenre("acoustic");
            else if (genre === "bolero") setSongGenre("bolero");
            else if (genre === "edm") setSongGenre("edm");
            else if (genre === "rnb") setSongGenre("rnb");
            setActiveSubTab("song");
          }}
        />
      )}

      {/* ==================================================================== */}
      {/* 3. TẠO ẢNH AI (AI IMAGE STUDIO) */}
      {/* ==================================================================== */}
      {activeSubTab === "image" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-400" />
                  <span>Tạo Ảnh Nghệ Thuật & Thumbnail Điện Ảnh 8K</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Tạo hình ảnh minh họa chất lượng cao theo tỷ lệ 16:9, 9:16 để làm phông nền video hoặc bìa thumbnail YouTube/TikTok.
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                GEMINI IMAGE ENGINE
              </span>
            </div>

            {/* Quick Image Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-neutral-400 font-semibold">Gợi ý phong cách ảnh:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "🍂 Phố Cổ Hà Nội Mùa Thu", prompt: "Góc phố cổ Hà Nội mùa thu với lá vàng rơi lãng mạn, cô gái trẻ mặc áo dài trắng duyên dáng cầm hoa sen, ánh nắng chiều tà ấm áp, phong cách điện ảnh 8K", style: "cinematic" as ImageStyle, ratio: "16:9" as ImageAspectRatio },
                  { label: "🌃 Cyberpunk Thành Phố Tương Lai", prompt: "Thành phố tương lai Cyberpunk rực rỡ ánh đèn neon tím và xanh, xe bay lướt qua các tòa nhà chọc trời, đường phố ẩm ướt phản chiếu ánh sáng", style: "cyberpunk" as ImageStyle, ratio: "16:9" as ImageAspectRatio },
                  { label: "🌸 Anime Nhật Bản Tuyệt Đẹp", prompt: "Khung cảnh cánh đồng hoa anh đào nở rộ dưới bầu trời hoàng hôn rực rỡ, phong cách hoạt hình Makoto Shinkai lung linh huyền ảo", style: "anime" as ImageStyle, ratio: "16:9" as ImageAspectRatio },
                  { label: "📱 Dọc TikTok: Chân Dung Phong Cách", prompt: "Chân dung nghệ thuật người sáng tạo nội dung hiện đại đứng trong studio ánh sáng neon rực rỡ, góc máy cận cảnh sắc nét, tỷ lệ dọc 9:16", style: "photorealistic" as ImageStyle, ratio: "9:16" as ImageAspectRatio }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setImagePrompt(item.prompt);
                      setImageStyle(item.style);
                      setImageAspectRatio(item.ratio);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-indigo-400 border border-neutral-700/60 text-xs transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt input */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Mô Tả Chi Tiết Bức Ảnh (Prompt):
                </label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  rows={3}
                  placeholder="Mô tả bối cảnh, nhân vật, ánh sáng, góc chụp..."
                  className="w-full p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Style */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Phong cách hội họa / Nhiếp ảnh:</label>
                  <select
                    value={imageStyle}
                    onChange={(e) => setImageStyle(e.target.value as ImageStyle)}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="cinematic">Điện ảnh 8K (Cinematic Film Still)</option>
                    <option value="photorealistic">Chân dung thực tế (Photorealistic)</option>
                    <option value="anime">Anime Nhật Bản (Makoto Shinkai)</option>
                    <option value="cyberpunk">Cyberpunk Tương lai rực rỡ</option>
                    <option value="3d_render">3D Render Pixar / Unreal Engine</option>
                    <option value="oil_painting">Tranh sơn dầu cổ điển</option>
                    <option value="watercolor">Tranh màu nước nghệ thuật</option>
                    <option value="vintage">Cổ điển Vintage 1970s</option>
                  </select>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Tỷ lệ khung hình:</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "16:9", label: "16:9 (Ngang TV/YouTube)" },
                      { id: "9:16", label: "9:16 (Dọc TikTok/Shorts)" },
                      { id: "1:1", label: "1:1 (Vuông Insta)" },
                      { id: "4:3", label: "4:3 (Chuẩn)" }
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setImageAspectRatio(r.id as ImageAspectRatio)}
                        className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all ${
                          imageAspectRatio === r.id
                            ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                            : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700"
                        }`}
                      >
                        {r.id}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {imageError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-300">
                {imageError}
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || !imagePrompt.trim()}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:brightness-110 active:scale-[0.99] text-white font-black text-sm shadow-xl shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isGeneratingImage ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Gemini đang vẽ hình ảnh 8K...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    <span>Tạo Ảnh Với Gemini AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Image Output Result */}
          {imageResult && (
            <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                    {imageResult.style} • Tỷ lệ {imageResult.aspectRatio}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white mt-1">Ảnh Đã Được Tạo Hoàn Tất</h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={imageResult.downloadUrl}
                    download={`gemini_image_${Date.now()}.png`}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-xs hover:brightness-110 transition-all flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải Ảnh Về Máy</span>
                  </a>

                  <button
                    onClick={() => {
                      setVideoImageSource(imageResult.imageUrl);
                      setActiveSubTab("video");
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-colors flex items-center gap-1.5 shadow-md"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Dùng Làm Phông Nền Video</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Image Frame */}
              <div className="flex justify-center p-4 rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden">
                <img
                  src={imageResult.imageUrl}
                  alt={imageResult.prompt}
                  className="max-h-[550px] w-auto object-contain rounded-xl shadow-2xl"
                />
              </div>

              <p className="text-xs text-neutral-400 italic text-center">
                &ldquo;{imageResult.prompt}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. TẠO VIDEO AI (AI VIDEO & STORYBOARD STUDIO) */}
      {/* ==================================================================== */}
      {activeSubTab === "video" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Film className="w-5 h-5 text-emerald-400" />
                  <span>Tạo Video AI Hoàn Chỉnh (Hình Ảnh Điện Ảnh + Giọng Lồng Tiếng)</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Tự động chuyển kịch bản và hình ảnh thành video MP4 chất lượng cao với chuyển động mượt mà (Ken-Burns Motion) và giọng thuyết minh AI.
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                AI VIDEO ENGINE
              </span>
            </div>

            {/* Inputs Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">Tiêu Đề Video:</label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Tiêu đề video..."
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-neutral-300">
                    Nội Dung Lời Thoại / Thuyết Minh Video:
                  </label>
                  {scriptResult && (
                    <button
                      type="button"
                      onClick={() => setVideoScriptText(scriptResult.fullVoiceoverText)}
                      className="text-amber-400 hover:underline text-xs flex items-center gap-1"
                    >
                      <span>Lấy kịch bản vừa viết</span>
                    </button>
                  )}
                </div>
                <textarea
                  value={videoScriptText}
                  onChange={(e) => setVideoScriptText(e.target.value)}
                  rows={4}
                  placeholder="Nhập nội dung người thuyết minh sẽ đọc trong video..."
                  className="w-full p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Voice Selection */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Giọng đọc lồng tiếng:</label>
                  <select
                    value={videoVoiceCode}
                    onChange={(e) => setVideoVoiceCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                  >
                    {VIETNAMESE_VOICES.map((v) => (
                      <option key={v.code} value={v.code}>
                        {v.name} ({v.gender} - {v.region})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Tỷ lệ khung hình video:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVideoAspectRatio("16:9")}
                      className={`py-2 px-2 text-center rounded-xl border text-xs font-bold transition-all ${
                        videoAspectRatio === "16:9"
                          ? "bg-emerald-500 text-neutral-950 border-emerald-500 shadow-md"
                          : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      16:9 (Ngang TV/YouTube)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoAspectRatio("9:16")}
                      className={`py-2 px-2 text-center rounded-xl border text-xs font-bold transition-all ${
                        videoAspectRatio === "9:16"
                          ? "bg-emerald-500 text-neutral-950 border-emerald-500 shadow-md"
                          : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      9:16 (Dọc TikTok/Shorts)
                    </button>
                  </div>
                </div>

                {/* Image source preview if any */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Ảnh phông nền minh họa:</label>
                  {videoImageSource ? (
                    <div className="flex items-center gap-2 p-1.5 rounded-xl bg-neutral-950 border border-neutral-800">
                      <img
                        src={videoImageSource}
                        alt="Background"
                        className="w-10 h-7 object-cover rounded-lg border border-neutral-700"
                      />
                      <span className="text-[11px] text-emerald-400 font-semibold truncate flex-1">
                        Đã chọn ảnh AI
                      </span>
                      <button
                        type="button"
                        onClick={() => setVideoImageSource("")}
                        className="text-neutral-500 hover:text-red-400 text-xs px-1"
                      >
                        Bỏ
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveSubTab("image")}
                      className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-dashed border-neutral-700 hover:border-emerald-500 text-xs text-neutral-400 hover:text-white transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Chọn ảnh tại Tab Tạo Ảnh</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {videoError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-300">
                {videoError}
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleGenerateVideo}
                disabled={isGeneratingVideo || !videoScriptText.trim()}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 active:scale-[0.99] text-neutral-950 font-black text-sm shadow-xl shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isGeneratingVideo ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-neutral-950" />
                    <span>Đang render video MP4 & lồng tiếng...</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                    <span>Tạo Video MP4 Hoàn Chỉnh</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Video Output Result */}
          {videoResult && (
            <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                    {videoResult.durationFormatted} • {videoResult.aspectRatio}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white mt-1">{videoResult.title}</h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={videoResult.downloadUrl}
                    download={`video_${Date.now()}.mp4`}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-neutral-950 font-black text-xs hover:brightness-110 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải Video MP4 Về Máy</span>
                  </a>

                  {onNavigateToDubbing && (
                    <button
                      onClick={() => onNavigateToDubbing(videoResult.audioUrl)}
                      className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs border border-neutral-700 transition-colors flex items-center gap-1.5"
                    >
                      <Scissors className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cắt Chia 10 Phút / Ghép Lại</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Video Player */}
              <div className="flex justify-center p-4 rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden">
                <video
                  controls
                  autoPlay
                  src={videoResult.videoUrl}
                  className={`max-h-[550px] w-auto rounded-xl shadow-2xl ${
                    videoResult.aspectRatio === "9:16" ? "max-w-xs" : "max-w-3xl w-full"
                  }`}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
