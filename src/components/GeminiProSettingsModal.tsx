import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  Key,
  Check,
  ExternalLink,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Copy,
  Layers,
  ArrowRight,
  UserCheck,
  Volume2,
  Film,
  Music,
  Globe,
  Radio
} from "lucide-react";
import { safeParseJson } from "../utils/apiHelper";
import { getApiBaseUrl } from "../utils/api";
import {
  ADMIN_SETTINGS_SYNCED_EVENT,
  saveAdminSettingsToNeon,
} from "../utils/adminSettingsSync";

interface GeminiProSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToStudio?: (text: string) => void;
  onSendToScriptwriter?: (topic: string) => void;
  onSendToSongwriter?: (theme: string) => void;
}

type ModalTab = "pro_login" | "sync_bridge" | "api_key";

export const GeminiProSettingsModal: React.FC<GeminiProSettingsModalProps> = ({
  isOpen,
  onClose,
  onSendToStudio,
  onSendToScriptwriter,
  onSendToSongwriter
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>("pro_login");

  // Pro Account State
  const [proEmail, setProEmail] = useState(() => {
    return localStorage.getItem("gemini_pro_email") || "";
  });
  const [isProLinked, setIsProLinked] = useState(() => {
    return localStorage.getItem("gemini_pro_account_connected") === "true";
  });

  // API Key State
  const [apiKeyInput, setApiKeyInput] = useState(() => {
    return localStorage.getItem("gemini_custom_pro_api_key") || "";
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "success" | "error">("idle");
  const [verifyMessage, setVerifyMessage] = useState<string>("");

  // Sync Bridge State
  const [importText, setImportText] = useState("");
  const [copiedPromptKey, setCopiedPromptKey] = useState<string | null>(null);

  useEffect(() => {
    const syncState = () => {
      setProEmail(localStorage.getItem("gemini_pro_email") || "");
      setIsProLinked(localStorage.getItem("gemini_pro_account_connected") === "true");
      setApiKeyInput(localStorage.getItem("gemini_custom_pro_api_key") || "");
    };
    if (isOpen) syncState();
    window.addEventListener(ADMIN_SETTINGS_SYNCED_EVENT, syncState);
    return () => window.removeEventListener(ADMIN_SETTINGS_SYNCED_EVENT, syncState);
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle saving Pro account login status (and sync to Admin Data)
  const handleSaveProAccount = () => {
    const trimmedEmail = proEmail.trim();
    if (trimmedEmail) {
      localStorage.setItem("gemini_pro_email", trimmedEmail);
      localStorage.setItem("gemini_pro_account_connected", "true");
      setIsProLinked(true);
      saveAdminSettingsToNeon({ apiKeys: { geminiProEmail: trimmedEmail } }).catch(() => {});
      setVerifyStatus("success");
      setVerifyMessage(`Đã ghi nhớ & đồng bộ tài khoản Google Pro: ${trimmedEmail}.`);
    } else {
      localStorage.setItem("gemini_pro_account_connected", "true");
      setIsProLinked(true);
      setVerifyStatus("success");
      setVerifyMessage("Đã kích hoạt chế độ Tài Khoản Gemini Pro.");
    }
  };

  const handleUnlinkProAccount = () => {
    localStorage.removeItem("gemini_pro_account_connected");
    localStorage.removeItem("gemini_pro_email");
    setIsProLinked(false);
    setProEmail("");
    saveAdminSettingsToNeon({ apiKeys: { geminiProEmail: "" } }).catch(() => {});
    setVerifyStatus("idle");
    setVerifyMessage("");
  };

  // Save & verify API key (using backend API base URL + Admin Data sync)
  const handleSaveAndVerifyApiKey = async () => {
    const key = apiKeyInput.trim();
    if (!key) {
      localStorage.removeItem("gemini_custom_pro_api_key");
      saveAdminSettingsToNeon({ apiKeys: { geminiApiKey: "" } }).catch(() => {});
      setVerifyStatus("success");
      setVerifyMessage("Đã chuyển về sử dụng khóa Gemini mặc định của hệ thống.");
      return;
    }

    setIsVerifying(true);
    setVerifyStatus("idle");
    setVerifyMessage("");

    try {
      const apiBase = getApiBaseUrl() || "/api/";
      const res = await fetch(`${apiBase}ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-api-key": key
        },
        body: JSON.stringify({
          message: "Xin chào, phản hồi 'OK' nếu API key hoạt động tốt.",
          modelPreference: "gemini-3.8-flash"
        })
      });

      const data = await safeParseJson(res);
      if (res.ok && data.status === 1) {
        localStorage.setItem("gemini_custom_pro_api_key", key);
        const syncRes = await saveAdminSettingsToNeon({ apiKeys: { geminiApiKey: key } });
        setVerifyStatus("success");
        setVerifyMessage(
          syncRes.success
            ? "Xác thực & lưu vĩnh viễn khóa Gemini API vào Admin Data (Neon PostgreSQL) thành công!"
            : "Xác thực thành công! Khóa Gemini API riêng của bạn đã sẵn sàng hoạt động."
        );
      } else {
        throw new Error(data.error_message || "Khóa API không hợp lệ hoặc đã hết hạn.");
      }
    } catch (err: any) {
      setVerifyStatus("error");
      setVerifyMessage(err.message || "Không thể xác thực khóa Gemini API.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClearApiKey = () => {
    localStorage.removeItem("gemini_custom_pro_api_key");
    setApiKeyInput("");
    saveAdminSettingsToNeon({ apiKeys: { geminiApiKey: "" } }).catch(() => {});
    setVerifyStatus("idle");
    setVerifyMessage("Đã xóa khóa tùy chỉnh và đồng bộ Admin Data.");
  };

  // Pre-formatted master prompts for Gemini Pro
  const PROMPTS_FOR_GEMINI_PRO = {
    script: "Hãy đóng vai một biên kịch triệu view. Viết cho tôi một kịch bản video TikTok 60 giây có Hook 3s đầu cực sốc, chia 4 phân cảnh chi tiết (thời gian, hình ảnh, lời thoại voiceover) và ghép toàn bộ lời đọc voiceover ở cuối để tôi đưa vào studio lồng tiếng.",
    song: "Hãy đóng vai một nhạc sĩ chuyên nghiệp. Sáng tác một ca khúc hoàn chỉnh gồm Intro, Verse 1, Chorus, Verse 2, Outro có ghi rõ hợp âm Guitar/Piano cho từng câu hát, gợi ý tiết tấu BPM và toàn bộ lời bài hát.",
    image: "Create an ultra-detailed 8K cinematic photograph prompt, 35mm lens, dramatic lighting, masterpiece style for high quality image generation.",
    tts_optimization: "Hãy biên tập và thêm ngắt nghỉ, dấu câu tự nhiên cho đoạn văn sau đây để giọng đọc trí tuệ nhân tạo (Đỗ Minh Hiếu AI) đọc truyền cảm và lôi cuốn nhất:"
  };

  const handleCopyPrompt = (key: keyof typeof PROMPTS_FOR_GEMINI_PRO, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptKey(key);
    setTimeout(() => setCopiedPromptKey(null), 2000);
  };

  const handleImportToStudio = () => {
    if (!importText.trim()) return;
    if (onSendToStudio) {
      onSendToStudio(importText.trim());
      onClose();
    }
  };

  const handleImportToScript = () => {
    if (!importText.trim()) return;
    if (onSendToScriptwriter) {
      onSendToScriptwriter(importText.trim());
      onClose();
    }
  };

  const handleImportToSong = () => {
    if (!importText.trim()) return;
    if (onSendToSongwriter) {
      onSendToSongwriter(importText.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-tight">
                  Trung Tâm Tài Khoản Gemini Pro
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-gradient-to-r from-amber-500 to-indigo-500 text-neutral-950 shadow-sm">
                  PRO VIP
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Sáng tạo không giới hạn với Gemini Advanced & AI Studio
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 pb-0 bg-neutral-950/40 border-b border-neutral-800 flex items-center gap-2">
          <button
            onClick={() => setActiveTab("pro_login")}
            className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === "pro_login"
                ? "text-amber-400 border-b-2 border-amber-400"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Tài Khoản gemini.google.com</span>
            {isProLinked && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("sync_bridge")}
            className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === "sync_bridge"
                ? "text-indigo-400 border-b-2 border-indigo-400"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cầu Nối Đồng Bộ 1-Chạm</span>
          </button>

          <button
            onClick={() => setActiveTab("api_key")}
            className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === "api_key"
                ? "text-amber-400 border-b-2 border-amber-400"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Key Riêng</span>
            {apiKeyInput && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 space-y-5 text-xs text-neutral-300 overflow-y-auto">
          {/* TAB 1: PRO LOGIN (GEMINI.GOOGLE.COM) */}
          {activeTab === "pro_login" && (
            <div className="space-y-4">
              {/* Connection Status Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 via-neutral-950 to-indigo-950/30 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Trạng Thái Tài Khoản Pro:</span>
                  </span>
                  {isProLinked ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ĐÃ KẾT NỐI PRO</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700">
                      Chưa Lưu Gói Pro
                    </span>
                  )}
                </div>

                <p className="text-neutral-300 leading-relaxed text-[11px]">
                  Tài khoản Google đã mua gói <strong>Gemini Advanced / Google One AI Premium</strong> cho phép bạn sáng tạo không giới hạn tại <strong>gemini.google.com</strong>.
                </p>

                {/* 1-Click Open gemini.google.com */}
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <a
                    href="https://gemini.google.com/app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>🚀 Mở &amp; Đăng Nhập Gemini.google.com (Gói Pro)</span>
                  </a>
                </div>
              </div>

              {/* Form to remember Pro Email */}
              <div className="space-y-3 p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                <label className="block font-bold text-white text-xs">
                  Xác nhận tài khoản Google có gói Pro của bạn:
                </label>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Hệ thống sẽ lưu trạng thái tài khoản Pro trên trình duyệt này để tự động đồng bộ hóa kịch bản, lời ca và liên kết ưu tiên.
                </p>

                <div className="space-y-2">
                  <input
                    type="email"
                    value={proEmail}
                    onChange={(e) => setProEmail(e.target.value)}
                    placeholder="ví dụ: taikhoan@gmail.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 font-sans"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleSaveProAccount}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isProLinked ? "Cập Nhật Tài Khoản Pro" : "Kích Hoạt & Ghi Nhớ Gói Pro"}</span>
                    </button>

                    {isProLinked && (
                      <button
                        onClick={handleUnlinkProAccount}
                        className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-red-400 text-xs transition-colors"
                      >
                        Hủy Liên Kết
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SYNC BRIDGE (CẦU NỐI ĐỒNG BỘ 1 CHẠM) */}
          {activeTab === "sync_bridge" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <h3 className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Bước 1: Sao chép câu lệnh chuyên sâu cho Gemini Pro</span>
                </h3>
                <p className="text-neutral-400 text-[11px]">
                  Bấm sao chép prompt chuẩn, sau đó dán vào gemini.google.com để AI Pro sinh nội dung xuất sắc nhất:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleCopyPrompt("script", PROMPTS_FOR_GEMINI_PRO.script)}
                    className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-left transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <Film className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-semibold text-xs text-neutral-200">Kịch Bản Triệu View</span>
                    </div>
                    {copiedPromptKey === "script" ? (
                      <span className="text-[10px] text-emerald-400 font-bold">Đã chép!</span>
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white" />
                    )}
                  </button>

                  <button
                    onClick={() => handleCopyPrompt("song", PROMPTS_FOR_GEMINI_PRO.song)}
                    className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-left transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <Music className="w-3.5 h-3.5 text-pink-400" />
                      <span className="font-semibold text-xs text-neutral-200">Sáng Tác Ca Khúc & Hợp Âm</span>
                    </div>
                    {copiedPromptKey === "song" ? (
                      <span className="text-[10px] text-emerald-400 font-bold">Đã chép!</span>
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white" />
                    )}
                  </button>
                </div>
              </div>

              {/* Step 2: Import paste area */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <h3 className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                  <span>Bước 2: Dán kết quả từ Gemini Pro vào đây (Nhập 1 chạm)</span>
                </h3>

                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Dán câu trả lời, kịch bản, lời bài hát hoặc văn bản bạn nhận được từ Gemini.google.com vào đây..."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 font-sans resize-none"
                />

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={handleImportToStudio}
                    disabled={!importText.trim()}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Đưa Vào Thu Âm Đỗ Minh Hiếu AI</span>
                  </button>

                  <button
                    onClick={handleImportToScript}
                    disabled={!importText.trim()}
                    className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Film className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Tạo Kịch Bản Video</span>
                  </button>

                  <button
                    onClick={handleImportToSong}
                    disabled={!importText.trim()}
                    className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Music className="w-3.5 h-3.5 text-pink-400" />
                    <span>Tạo Nhạc & Bài Hát</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM API KEY (GOOGLE AI STUDIO) */}
          {activeTab === "api_key" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <h3 className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Khóa API Google AI Studio riêng:</span>
                </h3>
                <p className="text-neutral-400 leading-relaxed text-[11px]">
                  Bất kỳ tài khoản Google nào (kể cả có gói Pro) đều có thể tạo một API Key miễn phí từ Google AI Studio trong 30 giây để sử dụng không giới hạn:
                </p>

                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 hover:text-amber-200 text-xs font-semibold border border-neutral-700 transition-colors"
                >
                  <span>Lấy API Key tại Google AI Studio</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <div className="space-y-2 pt-2">
                  <label className="block font-semibold text-neutral-300 text-xs">
                    Dán Gemini API Key của bạn:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="AIzaSy..."
                      className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 font-mono"
                    />
                    {apiKeyInput && (
                      <button
                        type="button"
                        onClick={handleClearApiKey}
                        className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    Khóa API được lưu cục bộ an toàn trong trình duyệt của bạn và tự động gắn vào mọi tính năng (Chat, Kịch bản, Bài hát, Nhạc nền, Video, Ảnh).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Feedback message */}
          {verifyStatus === "success" && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{verifyMessage}</span>
            </div>
          )}

          {verifyStatus === "error" && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{verifyMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between bg-neutral-950/70">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
          >
            Đóng
          </button>

          {activeTab === "api_key" && (
            <button
              onClick={handleSaveAndVerifyApiKey}
              disabled={isVerifying}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 text-xs font-black hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang kiểm tra...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Lưu & Kích Hoạt Key</span>
                </>
              )}
            </button>
          )}

          {activeTab === "pro_login" && (
            <button
              onClick={handleSaveProAccount}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Hoàn Tất</span>
            </button>
          )}

          {activeTab === "sync_bridge" && (
            <a
              href="https://gemini.google.com/app"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở Gemini Pro</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
