import React, { useState } from "react";
import {
  Terminal,
  Copy,
  Check,
  ExternalLink,
  Code2,
  BookOpen,
  Layers,
  Search,
  CheckCircle2,
  Clock,
  Radio
} from "lucide-react";
import { ALL_VOICES } from "../data/voices";

export const ApiDocsView: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [voiceSearch, setVoiceSearch] = useState("");
  const [voiceFilterLang, setVoiceFilterLang] = useState<string>("all");

  const copyToClipboard = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const sampleCurlPost = `curl --location 'https://everai.vn/api/v1/tts' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: Bearer BGAIHmiIRhVW8xU2x4YCU9fEydH5uRPbe' \\
--data '{
    "response_type": "indirect",
    "callback_url": "https://mydomain/callback",
    "input_text": "Chào mừng đén với EverAI",
    "voice_code": "vi_female_kieunhi_mn",
    "audio_type": "mp3",
    "bitrate": 128,
    "speed_rate": 1.0,
    "pitch_rate": 1.0
}'`;

  const samplePostResponse = `{
    "result": {
        "request_id": "0e7ee265-34ff-4807-b9ae-a4eb3ef24573",
        "characters": 24,
        "voice_code": "vi_female_kieunhi_mn",
        "audio_type": "mp3",
        "speed_rate": 1.0,
        "pitch_rate": 1.0,
        "bitrate": 128,
        "create_at": "2024-09-13",
        "status": "new"
    },
    "status": 1
}`;

  const sampleGetRequestCurl = `curl --location 'https://www.everai.vn/api/v1/tts/0e7ee265-34ff-4807-b9ae-a4eb3ef24573' \\
--header 'Authorization: Bearer BGAIHmiIRhVW8xU2x4YCU9fEydH5uRPbe'`;

  const sampleGetRequestResponse = `{
    "result": {
        "request_id": "0e7ee265-34ff-4807-b9ae-a4eb3ef24573",
        "bitrate": 128,
        "characters": 24,
        "voice_code": "vi_female_kieunhi_mn",
        "audio_type": "mp3",
        "speed_rate": 1.0,
        "create_at": "2024-09-13T09:40:48.502Z",
        "progress": 100.0,
        "status": "done",
        "srt_link": "https://everai.vn/media/audio/0e0e0ca6-ec85-4ced-b9b9-2350c6faa777_fsiPSVu.srt",
        "audio_link": "https://everai.vn/media/audio/0e0e0ca6-ec85-4ced-b9b9-2350c6faa777_fsiPSVu.mp3",
        "audio_expired": false
    },
    "status": 1
}`;

  const sampleGetCallbackResultCurl = `curl --location 'https://www.everai.vn/api/v1/tts/0e7ee265-34ff-4807-b9ae-a4eb3ef24573/callback-result' \\
--header 'Authorization: Bearer BGAIHmiIRhVW8xU2x4YCU9fEydH5uRPbe'`;

  const sampleGetCallbackResultResponse = `{
    "result": {
        "request_id": "0e7ee265-34ff-4807-b9ae-a4eb3ef24573",
        "callback_url": "https://mydomain/callback",
        "created_at": "2024-09-13T09:40:48.543Z",
        "payload": {
            "request_id": "0e7ee265-34ff-4807-b9ae-a4eb3ef24573",
            "characters": 24,
            "voice_code": "vi_female_kieunhi_mn",
            "audio_type": "mp3",
            "speed_rate": 1.0,
            "pitch_rate": 1.0,
            "bitrate": 128,
            "created_at": "2024-09-13",
            "status": "SUCCESS",
            "audio_link": "https://everai.vn/media/audio/0e0e0ca6-ec85-4ced-b9b9-2350c6faa777_fsiPSVu.mp3"
        },
        "status_code": null,
        "result": "OK"
    },
    "status": 1
}`;

  const filteredVoices = ALL_VOICES.filter((v) => {
    if (voiceFilterLang !== "all" && v.language !== voiceFilterLang) return false;
    if (voiceSearch.trim()) {
      const q = voiceSearch.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        v.code.toLowerCase().includes(q) ||
        v.region.toLowerCase().includes(q) ||
        v.language.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
        <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          <span>Tài Liệu Kỹ Thuật Tích Hợp EverAI TTS API (Chính Thức)</span>
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-3xl leading-relaxed">
          Tài liệu chuẩn từ EverAI hỗ trợ các phương thức khởi tạo TTS (`POST`), theo dõi trạng thái `request_id` (`GET`), webhook callback và kiểm tra kết quả callback.
        </p>
      </div>

      {/* Official Voices & Pricing Table */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-200">
              Danh Sách Mã Giọng Đọc Có Sẵn & Bảng Giá Credit
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Giá tính theo mỗi 1.000 ký tự đầu vào. Các giọng Echo, Nova, Onyx có giá tiết kiệm 100 credits/1k ký tự.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={voiceFilterLang}
              onChange={(e) => setVoiceFilterLang(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Tất cả ngôn ngữ</option>
              <option value="Việt Nam">Việt Nam</option>
              <option value="English">English</option>
              <option value="Chinese">Chinese</option>
              <option value="Japanese">Japanese</option>
              <option value="Korean">Korean</option>
              <option value="French">French</option>
              <option value="Spanish">Spanish</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Tìm mã hoặc tên giọng..."
                value={voiceSearch}
                onChange={(e) => setVoiceSearch(e.target.value)}
                className="pl-7 pr-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 w-44 sm:w-56"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[420px] rounded-xl border border-neutral-800/80">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-950 sticky top-0 z-10 border-b border-neutral-800">
              <tr className="text-neutral-400">
                <th className="py-2.5 px-3 font-semibold">Ngôn ngữ</th>
                <th className="py-2.5 px-3 font-semibold">Mã giọng (voice_code)</th>
                <th className="py-2.5 px-3 font-semibold">Tên</th>
                <th className="py-2.5 px-3 font-semibold">Giới tính & Vùng</th>
                <th className="py-2.5 px-3 font-semibold text-right">Giá / 1000 ký tự</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 bg-neutral-900/50">
              {filteredVoices.map((voice) => (
                <tr key={voice.code} className="hover:bg-neutral-800/40 transition-colors">
                  <td className="py-2.5 px-3 text-neutral-300 font-medium">
                    {voice.language}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-amber-400 select-all">
                    {voice.code}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-neutral-100">
                    {voice.name}
                  </td>
                  <td className="py-2.5 px-3 text-neutral-400">
                    {voice.gender} - {voice.region}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span
                      className={`inline-block font-mono text-[11px] px-2 py-0.5 rounded font-semibold ${
                        voice.creditCost <= 100
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800/50"
                          : "bg-neutral-800 text-neutral-300"
                      }`}
                    >
                      {voice.creditCost.toLocaleString()} credits
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* HTTP Request Structure */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-200 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-amber-400" />
            <span>1. Khởi Tạo Yêu Cầu TTS (POST /api/v1/tts)</span>
          </span>
          <span className="text-xs text-neutral-400 font-mono">response_type: indirect</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80">
            <div className="text-[11px] text-neutral-500 uppercase font-mono">Method</div>
            <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">POST</div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80">
            <div className="text-[11px] text-neutral-500 uppercase font-mono">URL Endpoint</div>
            <div className="text-xs font-bold text-neutral-200 font-mono mt-0.5 truncate">https://www.everai.vn/api/v1/tts</div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80">
            <div className="text-[11px] text-neutral-500 uppercase font-mono">Content Type</div>
            <div className="text-xs font-bold text-amber-400 font-mono mt-0.5">application/json</div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80">
            <div className="text-[11px] text-neutral-500 uppercase font-mono">Response Type</div>
            <div className="text-xs font-bold text-cyan-400 font-mono mt-0.5">text/json</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          {/* POST cURL */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-400">Request cURL:</span>
              <button
                onClick={() => copyToClipboard(sampleCurlPost, "curl_post")}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                {copiedCode === "curl_post" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode === "curl_post" ? "Đã sao chép" : "Sao chép"}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono text-neutral-300 overflow-x-auto leading-relaxed">
              {sampleCurlPost}
            </pre>
          </div>

          {/* POST Response */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-400">Response (status 1):</span>
              <button
                onClick={() => copyToClipboard(samplePostResponse, "res_post")}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                {copiedCode === "res_post" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode === "res_post" ? "Đã sao chép" : "Sao chép"}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono text-neutral-300 overflow-x-auto leading-relaxed">
              {samplePostResponse}
            </pre>
          </div>
        </div>
      </div>

      {/* 2. GET /api/v1/tts/{{request_id}} */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>2. Tra Cứu Trạng Thái Bằng Request ID (GET /api/v1/tts/&#123;&#123;request_id&#125;&#125;)</span>
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
            GET Method
          </span>
        </div>

        <p className="text-xs text-neutral-400 leading-relaxed">
          Gọi API này để lấy thông tin tiến độ tổng hợp (`progress`), trạng thái (`status: "done"`), đường dẫn tệp âm thanh (`audio_link`) và phụ đề đồng bộ (`srt_link`).
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-400">Request cURL:</span>
              <button
                onClick={() => copyToClipboard(sampleGetRequestCurl, "curl_get_req")}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                {copiedCode === "curl_get_req" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode === "curl_get_req" ? "Đã sao chép" : "Sao chép"}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono text-neutral-300 overflow-x-auto leading-relaxed">
              {sampleGetRequestCurl}
            </pre>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-400">Response (Hoàn tất):</span>
              <button
                onClick={() => copyToClipboard(sampleGetRequestResponse, "res_get_req")}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                {copiedCode === "res_get_req" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode === "res_get_req" ? "Đã sao chép" : "Sao chép"}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono text-neutral-300 overflow-x-auto leading-relaxed">
              {sampleGetRequestResponse}
            </pre>
          </div>
        </div>
      </div>

      {/* 3. Callback API Webhook Specification */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" />
          <span>3. Cơ Chế Callback Webhook (POST callback_url)</span>
        </h3>

        <p className="text-xs text-neutral-400 leading-relaxed">
          Khi audio được tạo thành công, hệ thống EverAI TTS sẽ tự động gửi một HTTP POST đến `callback_url` của bạn với cấu trúc JSON sau:
        </p>

        <div className="overflow-x-auto rounded-xl border border-neutral-800/80">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400">
              <tr>
                <th className="py-2 px-3 font-semibold">Thuộc tính</th>
                <th className="py-2 px-3 font-semibold">Kiểu dữ liệu</th>
                <th className="py-2 px-3 font-semibold">Mô tả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-mono text-neutral-300">
              <tr>
                <td className="py-2 px-3 text-amber-400">request_id</td>
                <td className="py-2 px-3 text-neutral-400">String</td>
                <td className="py-2 px-3 font-sans">ID của request đã hoàn tất.</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-amber-400">characters</td>
                <td className="py-2 px-3 text-neutral-400">Number</td>
                <td className="py-2 px-3 font-sans">Số ký tự của đoạn văn bản đầu vào.</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-amber-400">voice_code</td>
                <td className="py-2 px-3 text-neutral-400">String</td>
                <td className="py-2 px-3 font-sans">Mã giọng đọc đã sử dụng.</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-amber-400">audio_type</td>
                <td className="py-2 px-3 text-neutral-400">String</td>
                <td className="py-2 px-3 font-sans">Định dạng file audio đầu ra (mp3 / wav).</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-amber-400">speed_rate</td>
                <td className="py-2 px-3 text-neutral-400">Number</td>
                <td className="py-2 px-3 font-sans">Tốc độ đọc.</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-amber-400">pitch_rate</td>
                <td className="py-2 px-3 text-neutral-400">Number</td>
                <td className="py-2 px-3 font-sans">Cao độ đọc.</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-amber-400">bitrate</td>
                <td className="py-2 px-3 text-neutral-400">Number</td>
                <td className="py-2 px-3 font-sans">Bitrate của file audio đầu ra (128, 160...).</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-amber-400">created_at</td>
                <td className="py-2 px-3 text-neutral-400">String</td>
                <td className="py-2 px-3 font-sans">Thời gian khởi tạo request.</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-amber-400">status</td>
                <td className="py-2 px-3 text-neutral-400">String</td>
                <td className="py-2 px-3 font-sans">SUCCESS (Thành công) hoặc FAILURE (Thất bại).</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-amber-400">audio_link</td>
                <td className="py-2 px-3 text-neutral-400">String</td>
                <td className="py-2 px-3 font-sans">Đường dẫn tải file audio tổng hợp hoàn chỉnh.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. GET /api/v1/tts/{{request_id}}/callback-result */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>4. Tra Cứu Kết Quả Gọi Callback (GET /api/v1/tts/&#123;&#123;request_id&#125;&#125;/callback-result)</span>
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
            GET Method
          </span>
        </div>

        <p className="text-xs text-neutral-400 leading-relaxed">
          Cho phép máy chủ kiểm tra xem webhook callback gửi tới endpoint của bạn có thành công không, mã phản hồi status code và nội dung payload đã gửi.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-400">Request cURL:</span>
              <button
                onClick={() => copyToClipboard(sampleGetCallbackResultCurl, "curl_cb_res")}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                {copiedCode === "curl_cb_res" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode === "curl_cb_res" ? "Đã sao chép" : "Sao chép"}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono text-neutral-300 overflow-x-auto leading-relaxed">
              {sampleGetCallbackResultCurl}
            </pre>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-400">Response mẫu:</span>
              <button
                onClick={() => copyToClipboard(sampleGetCallbackResultResponse, "res_cb_res")}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                {copiedCode === "res_cb_res" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode === "res_cb_res" ? "Đã sao chép" : "Sao chép"}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono text-neutral-300 overflow-x-auto leading-relaxed">
              {sampleGetCallbackResultResponse}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
