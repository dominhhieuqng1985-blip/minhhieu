import React, { useState, useEffect } from "react";
import { X, Key, Check, ShieldCheck, Copy, Terminal, ExternalLink } from "lucide-react";
import { saveAdminSettingsToNeon } from "../utils/adminSettingsSync";

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customApiKey: string;
  onSaveApiKey: (key: string) => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  customApiKey,
  onSaveApiKey,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(customApiKey);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    setApiKeyInput(customApiKey);
  }, [customApiKey]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = apiKeyInput.trim();
    onSaveApiKey(trimmed);
    saveAdminSettingsToNeon({ apiKeys: { everaiApiKey: trimmed } }).catch(() => {});
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleClear = () => {
    setApiKeyInput("");
    onSaveApiKey("");
    saveAdminSettingsToNeon({ apiKeys: { everaiApiKey: "" } }).catch(() => {});
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const sampleCurl = `curl -X POST https://www.everai.vn/api/v1/tts \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKeyInput || "YOUR_API_KEY"}" \\
  -d '{
    "response_type": "indirect",
    "input_text": "Xin chào, đây là giọng đọc Đỗ Minh Hiếu AI.",
    "voice_code": "vi_female_kieunhi_mn",
    "model_id": "everai-v1.6",
    "audio_type": "mp3",
    "bitrate": 128,
    "speed_rate": 1.0,
    "pitch_rate": 1.0,
    "volume": 100,
    "generate_srt": false
  }'`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                <span>Cấu Hình API Key Đỗ Minh Hiếu AI</span>
              </h2>
              <p className="text-xs text-neutral-400">
                Ủy quyền kết nối và khởi tạo tệp âm thanh giọng đọc trí tuệ nhân tạo.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
                API Key Cá Nhân (Bearer Token)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ví dụ: BGAIHmiIRhVW8xU2x4YCU9fEydH5uRPbe"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700/80 font-mono text-sm text-amber-300 focus:outline-none focus:border-amber-500 placeholder:text-neutral-600"
                />
              </div>
              <div className="mt-2 text-xs text-neutral-400 flex items-center justify-between">
                <span>
                  API key của người dùng, được tạo trong giao diện tại <a href="https://everai.vn/api" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">https://everai.vn/api</a>
                </span>
                {apiKeyInput && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-neutral-400 hover:text-red-400 transition-colors"
                  >
                    Xóa key
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                {savedSuccess ? <Check className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{savedSuccess ? "Đã lưu thành công!" : "Lưu Cấu Hình Key"}</span>
              </button>

              <a
                href="https://everai.vn/api"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <span>Tạo Key tại everai.vn/api</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </form>

          {/* Technical cURL Guide */}
          <div className="pt-4 border-t border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>Mẫu cURL gọi API trực tiếp</span>
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sampleCurl);
                  setCopiedSnippet(true);
                  setTimeout(() => setCopiedSnippet(false), 2000);
                }}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                {copiedSnippet ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSnippet ? "Đã chép" : "Sao chép cURL"}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto leading-relaxed">
              {sampleCurl}
            </pre>
          </div>

          {/* Callback Note */}
          <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-xs text-neutral-300 space-y-1.5">
            <div className="font-semibold text-neutral-200">
              Cơ chế phản hồi bất đồng bộ (indirect) & Webhook:
            </div>
            <p className="text-neutral-400 leading-relaxed">
              Tài liệu EverAI quy định <code className="text-amber-300">response_type: "indirect"</code>. Khi yêu cầu được gửi đi, máy chủ trả về <code className="text-amber-300">request_id</code>. Bạn có thể truyền thêm <code className="text-amber-300">callback_url</code> để EverAI tự động POST thông báo hoàn thành khi file âm thanh đã sẵn sàng.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex justify-end bg-neutral-950/60">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
