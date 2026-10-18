import React, { useState } from 'react';
import {
  X,
  Server,
  Cloud,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Volume2,
  Terminal,
  RefreshCw,
  HelpCircle,
  FileCode,
} from 'lucide-react';
import {
  getCustomBackendUrl,
  setCustomBackendUrl,
  isStaticHost,
  hasBackend,
} from '../utils/api';
import { testEverAiBackendConnection } from '../utils/everai';

interface EverAiProxyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToWebSpeech?: () => void;
  onShowToast: (msg: string) => void;
}

export const EverAiProxyModal: React.FC<EverAiProxyModalProps> = ({
  isOpen,
  onClose,
  onSwitchToWebSpeech,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'backend' | 'cloudflare' | 'explain'>('backend');
  const [backendUrlInput, setBackendUrlInput] = useState<string>(getCustomBackendUrl() || '');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copiedWorker, setCopiedWorker] = useState<boolean>(false);
  const [copiedRenderYaml, setCopiedRenderYaml] = useState<boolean>(false);

  if (!isOpen) return null;

  // Cloudflare Worker Script Code
  const cloudflareWorkerCode = `// Cloudflare Worker Reverse Proxy cho EverAI TTS
// Giúp vượt qua lỗi CORS 405 Method Not Allowed trên GitHub Pages
export default {
  async fetch(request) {
    // 1. Xử lý preflight CORS OPTIONS từ trình duyệt
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const url = new URL(request.url);
    // Health check endpoint
    if (url.pathname === "/api/health" || url.pathname === "/api/everai/health") {
      return new Response(JSON.stringify({ status: "ok", service: "EverAI Cloudflare Proxy" }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // 2. Chuyển tiếp tới máy chủ EverAI
    let target = "https://www.everai.vn/api/v1/tts";
    if (url.pathname.includes("/tts/")) {
      const id = url.pathname.split("/tts/")[1];
      target = \`https://www.everai.vn/api/v1/tts/\${id}\`;
    }

    const modifiedHeaders = new Headers(request.headers);
    modifiedHeaders.set("Host", "www.everai.vn");
    modifiedHeaders.set("Origin", "https://www.everai.vn");

    try {
      const response = await fetch(target, {
        method: request.method,
        headers: modifiedHeaders,
        body: request.method !== "GET" && request.method !== "HEAD" ? await request.text() : undefined,
      });

      const resHeaders = new Headers(response.headers);
      resHeaders.set("Access-Control-Allow-Origin", "*");
      resHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

      return new Response(response.body, {
        status: response.status,
        headers: resHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};`;

  const handleTestConnection = async () => {
    if (!backendUrlInput.trim()) {
      setTestResult({ ok: false, message: 'Vui lòng nhập URL backend trước khi kiểm tra' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    const res = await testEverAiBackendConnection(backendUrlInput.trim());
    setIsTesting(false);
    setTestResult(res);

    if (res.ok) {
      onShowToast('🎉 Kết nối thành công! Đã sẵn sàng tạo giọng nói không lỗi CORS.');
    } else {
      onShowToast(`⚠️ ${res.message}`);
    }
  };

  const handleSaveBackendUrl = () => {
    const clean = backendUrlInput.trim();
    setCustomBackendUrl(clean || null);
    onShowToast(clean ? '✅ Đã lưu cấu hình Backend URL!' : '🔄 Đã xóa Backend URL, sử dụng chế độ mặc định.');
    onClose();
  };

  const handleCopyWorker = () => {
    navigator.clipboard.writeText(cloudflareWorkerCode);
    setCopiedWorker(true);
    onShowToast('📋 Đã chép mã nguồn Cloudflare Worker vào Clipboard!');
    setTimeout(() => setCopiedWorker(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Khắc Phục Lỗi 405 OPTIONS & Cấu Hình Backend</span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold bg-amber-500/20 text-amber-300 rounded-full">
                  GitHub Pages
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Giải pháp máy chủ proxy chuyển tiếp request EverAI để bảo mật API key và vượt lỗi CORS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cause Banner */}
        <div className="p-4 bg-amber-950/20 border-b border-amber-900/30 flex items-start gap-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-slate-300">
            <div className="font-semibold text-amber-300">
              Vì sao xuất hiện lỗi 405 Method Not Allowed trên GitHub Pages?
            </div>
            <p className="text-[11px] text-slate-300/90 leading-relaxed">
              Trình duyệt khi gửi kèm header <code className="text-amber-200 bg-amber-950/60 px-1 py-0.5 rounded">Authorization: Bearer</code> và <code className="text-amber-200 bg-amber-950/60 px-1 py-0.5 rounded">Content-Type: application/json</code> bắt buộc phải gửi phương thức <strong className="text-white">OPTIONS</strong> kiểm tra trước (preflight). Máy chủ EverAI không hỗ trợ OPTIONS nên trả về <strong className="text-red-400">405</strong> và chặn request POST tiếp theo. GitHub Pages lại là máy chủ tĩnh nên không tự chạy Node.js server được.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('backend')}
            className={`pb-2.5 px-3 font-semibold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'backend'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>1. Kết Nối Backend Node.js</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-normal">
              Khuyên dùng
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cloudflare')}
            className={`pb-2.5 px-3 font-semibold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'cloudflare'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>2. Cloudflare Worker (1 phút - Miễn phí)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('explain')}
            className={`pb-2.5 px-3 font-semibold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'explain'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>3. Dùng Ngay Không Cần Server</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {activeTab === 'backend' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Địa Chỉ URL Máy Chủ Backend Của Bạn:
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Hỗ trợ Render, Railway, Koyeb, Vercel, VPS...
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://your-podcast-api.onrender.com"
                    value={backendUrlInput}
                    onChange={(e) => {
                      setBackendUrlInput(e.target.value);
                      setTestResult(null);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Đang test...' : 'Kiểm tra'}</span>
                  </button>
                </div>

                {/* Test Result Message */}
                {testResult && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      testResult.ok
                        ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                        : 'bg-red-950/40 border border-red-800/60 text-red-300'
                    }`}
                  >
                    {testResult.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Instructions to Deploy server.ts to Render */}
              <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-2.5 text-slate-300">
                <h4 className="font-bold text-slate-100 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  Cách Deploy file <code className="text-amber-300">server.ts</code> lên Render.com (Miễn phí 100%):
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
                  <li>
                    Đăng nhập <strong className="text-slate-200">render.com</strong> và kết nối repository GitHub của bạn.
                  </li>
                  <li>
                    Chọn <strong className="text-slate-200">New Web Service</strong> và chọn repository dự án này.
                  </li>
                  <li>
                    Cấu hình Build & Start command:
                    <div className="bg-slate-900 p-2 rounded-lg my-1.5 font-mono text-[11px] text-amber-200 border border-slate-800 space-y-1">
                      <div>Build Command: <span className="text-slate-300">npm install && npm run build</span></div>
                      <div>Start Command: <span className="text-slate-300">npm run start</span> (hoặc <span className="text-slate-300">tsx server.ts</span>)</div>
                    </div>
                  </li>
                  <li>
                    Thêm biến môi trường <code className="text-amber-300 font-mono">EVERAI_API_KEY</code> (mã key của bạn).
                  </li>
                  <li>
                    Sau khi Render build xong, copy URL (ví dụ: <code className="text-amber-200">https://casttube-backend.onrender.com</code>) dán vào ô trên và bấm <strong>Lưu Cấu Hình</strong>!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'cloudflare' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-950/30 border border-blue-800/50 rounded-xl text-blue-200 text-xs leading-relaxed flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Cloudflare Worker:</strong> Miễn phí 100.000 requests/ngày, thiết lập chưa đầy 1 phút. Worker sẽ tự động trả về <strong>200 OK cho preflight OPTIONS</strong> và chuyển tiếp POST sang EverAI mà không bao giờ gặp lỗi CORS 405!
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-amber-400" />
                    Mã Nguồn Cloudflare Worker (Copy & Paste):
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyWorker}
                    className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    {copiedWorker ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWorker ? 'Đã sao chép!' : 'Sao chép mã'}</span>
                  </button>
                </div>

                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48 leading-relaxed">
                  {cloudflareWorkerCode}
                </pre>
              </div>

              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 text-[11px] text-slate-400">
                <div className="font-bold text-slate-200">3 Bước kích hoạt trên Cloudflare:</div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Truy cập <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" className="text-amber-400 underline">dash.cloudflare.com</a> → Chọn <strong>Workers & Pages</strong> → <strong>Create Worker</strong>.</li>
                  <li>Xóa mã mặc định, dán mã ở trên vào và bấm <strong>Deploy</strong>.</li>
                  <li>Copy URL của Worker (ví dụ: <code className="text-amber-300">https://everai-proxy.abc.workers.dev</code>), chuyển về Tab 1 dán vào và bấm <strong>Lưu URL</strong>!</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'explain' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm">
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                  <span>Giải Pháp Ngay Lập Tức: Giọng Đọc Trình Duyệt Web Speech</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Nếu bạn không muốn thiết lập máy chủ backend hoặc Cloudflare Worker, ứng dụng đã tích hợp sẵn công nghệ <strong>Web Speech API</strong> chạy trực tiếp 100% trên trình duyệt (Chrome, Safari, Edge, Cốc Cốc trên cả Máy tính & Điện thoại).
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                    <span className="text-emerald-400 font-bold block mb-0.5">✓ Ưu điểm:</span>
                    <span>Hoàn toàn miễn phí, không giới hạn ký tự, phát tức thì không cần chờ đợi mạng.</span>
                  </div>
                  <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                    <span className="text-emerald-400 font-bold block mb-0.5">✓ Không lỗi CORS:</span>
                    <span>Hoạt động hoàn hảo trên GitHub Pages không cần bất kỳ máy chủ nào.</span>
                  </div>
                </div>
                {onSwitchToWebSpeech && (
                  <button
                    type="button"
                    onClick={() => {
                      onSwitchToWebSpeech();
                      onClose();
                      onShowToast('🎙️ Đã chuyển sang chế độ Giọng Đọc Trình Duyệt Web Speech!');
                    }}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <Volume2 className="w-4 h-4 fill-current" />
                    <span>Chuyển Sang Giọng Đọc Trình Duyệt Ngay</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span
              className={`w-2 h-2 rounded-full ${
                hasBackend() ? 'bg-emerald-400' : isStaticHost ? 'bg-amber-400' : 'bg-blue-400'
              }`}
            />
            <span>
              {hasBackend()
                ? 'Backend Proxy đã kích hoạt'
                : 'Chưa có Backend Proxy (Chế độ GitHub Pages Tĩnh)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveBackendUrl}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Lưu Cấu Hình</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
