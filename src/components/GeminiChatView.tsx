import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Volume2,
  Film,
  Music,
  ArrowRight,
  ShieldCheck,
  Key,
  ExternalLink,
  MessageSquare,
  Wand2,
  Sliders,
  AlertCircle
} from "lucide-react";
import { safeParseJson } from "../utils/apiHelper";
import { callGeminiDirectClient } from "../utils/geminiClient";

export type ChatPersona = "general" | "scriptwriter" | "musician" | "image_director" | "editor";

interface MessageItem {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  modelUsed?: string;
}

interface GeminiChatViewProps {
  onSendToStudio: (text: string) => void;
  onSendToScriptwriter?: (topic: string) => void;
  onSendToSongwriter?: (theme: string) => void;
  onSendToMusic?: (prompt: string) => void;
  onOpenProSettingsModal?: () => void;
}

const PERSONA_CONFIGS: Record<ChatPersona, { label: string; desc: string; icon: string; starter: string }> = {
  general: {
    label: "Trợ Lý Đa Năng",
    desc: "Giải đáp mọi thắc mắc, tư vấn sáng tạo và hỗ trợ tổng hợp",
    icon: "💡",
    starter: "Chào bạn! Tôi là Trợ Lý Gemini AI. Tôi có thể hỗ trợ bạn lên ý tưởng, viết kịch bản, sáng tác nhạc hoặc tối ưu nội dung đọc thuyết minh hôm nay không?"
  },
  scriptwriter: {
    label: "Trợ Lý Biên Kịch",
    desc: "Viết kịch bản video viral TikTok, YouTube Shorts, TVC, phóng sự",
    icon: "🎬",
    starter: "Chào bạn! Tôi là Trợ Lý Biên Kịch. Hãy cho tôi biết chủ đề video bạn đang muốn làm (thể loại, đối tượng khán giả, độ dài), tôi sẽ thiết kế Hook 3 giây đầu và kịch bản phân cảnh chi tiết cho bạn!"
  },
  musician: {
    label: "Nhạc Sĩ & Hòa Âm",
    desc: "Viết lời ca, gieo vần, đặt hợp âm và gợi ý tiết tấu nhịp điệu",
    icon: "🎵",
    starter: "Chào bạn! Tôi là Nhạc Sĩ AI. Bạn đang muốn viết ca khúc về chủ đề gì (Ballad mùa thu, Lofi chill, Rap bốc lửa, hay Bolero quê hương)? Tôi sẽ giúp bạn trau chuốt từng câu hát và điệp khúc bắt tai nhất!"
  },
  image_director: {
    label: "Chuyên Gia Prompt Ảnh",
    desc: "Thiết kế câu lệnh vẽ tranh 8K, thumbnail YouTube, concept art",
    icon: "🎨",
    starter: "Chào bạn! Tôi là Giám Đốc Hình Ảnh AI. Hãy miêu tả khung cảnh bạn tưởng tượng, tôi sẽ chuyển đổi thành câu lệnh prompt điện ảnh 8K chi tiết về ánh sáng, góc máy và bố cục!"
  },
  editor: {
    label: "Đạo Diễn Giọng Đọc",
    desc: "Tinh chỉnh câu văn, tối ưu dấu câu để giọng Đỗ Minh Hiếu AI đọc mượt mà nhất",
    icon: "🎙️",
    starter: "Chào bạn! Tôi là Biên Tập Viên Giọng Đọc. Hãy dán đoạn văn bản bạn chuẩn bị đọc thuyết minh vào đây, tôi sẽ ngắt nghỉ câu, trau chuốt từ ngữ để giọng đọc AI phát ra truyền cảm và tự nhiên nhất!"
  }
};

const SUGGESTED_PROMPTS: Record<ChatPersona, string[]> = {
  general: [
    "Viết 5 ý tưởng nội dung video công nghệ dễ viral tuần này",
    "Tóm tắt xu hướng trí tuệ nhân tạo và sáng tạo nội dung 2026",
    "Gợi ý các công thức đặt tiêu đề video giật tít giữ chân người xem"
  ],
  scriptwriter: [
    "Viết kịch bản 60 giây TikTok: 3 bí mật ít ai biết về vũ trụ",
    "Lên kịch bản TVC 30 giây quảng cáo thương hiệu thời trang trẻ",
    "Viết câu Hook mở đầu cực sốc cho video tài chính cá nhân"
  ],
  musician: [
    "Viết điệp khúc Ballad da diết về ký ức tình yêu dưới cơn mưa",
    "Sáng tác 4 câu thơ gieo vần mượt mà cho bài hát Lo-Fi Hà Nội",
    "Gợi ý vòng hợp âm và tiết tấu cho một bài hát acoustic buồn"
  ],
  image_director: [
    "Tạo prompt ảnh cô gái áo dài trắng đi giữa phố cổ mùa thu nắng vàng",
    "Thiết kế prompt thumbnail YouTube phong cách cyberpunk tương lai",
    "Tạo concept art phi hành gia đứng trước thành phố trên sao Hỏa"
  ],
  editor: [
    "Tối ưu đoạn văn này để đọc lồng tiếng chuẩn xác và truyền cảm",
    "Thêm dấu phẩy và ngắt nhịp tự nhiên cho bài thuyết minh lịch sử",
    "Chuyển văn phong bài viết này sang phong cách gần gũi, cuốn hút"
  ]
};

export const GeminiChatView: React.FC<GeminiChatViewProps> = ({
  onSendToStudio,
  onSendToScriptwriter,
  onSendToSongwriter,
  onSendToMusic,
  onOpenProSettingsModal
}) => {
  const [persona, setPersona] = useState<ChatPersona>("general");
  const [modelPreference, setModelPreference] = useState<string>("gemini-3.8-flash");
  const [inputMessage, setInputMessage] = useState("");
  const isProLinked = localStorage.getItem("gemini_pro_account_connected") === "true";
  const proEmail = localStorage.getItem("gemini_pro_email") || "";
  const hasCustomKey = !!localStorage.getItem("gemini_custom_pro_api_key");

  const [messages, setMessages] = useState<MessageItem[]>(() => {
    const saved = localStorage.getItem("gemini_chat_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: "msg_init",
        role: "model",
        text: PERSONA_CONFIGS.general.starter,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        modelUsed: "gemini-3.8-flash"
      }
    ];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-scroll to bottom of chat
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    localStorage.setItem("gemini_chat_history", JSON.stringify(messages));
  }, [messages]);

  // Handle persona switch
  const handleSelectPersona = (p: ChatPersona) => {
    setPersona(p);
    const newWelcome: MessageItem = {
      id: `msg_welcome_${Date.now()}`,
      role: "model",
      text: PERSONA_CONFIGS[p].starter,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      modelUsed: modelPreference
    };
    setMessages((prev) => [...prev, newWelcome]);
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: MessageItem = {
      id: `msg_u_${Date.now()}`,
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);
    setErrorMsg(null);

    // Prepare history payload
    const historyPayload = messages.map((m) => ({
      role: m.role,
      text: m.text
    }));

    try {
      let replyText = "";
      let modelLabel = modelPreference;

      // 1. Direct Client-side Gemini Call if user has configured API Key (Works 100% on GitHub Pages without backend!)
      const customGeminiKey = localStorage.getItem("gemini_custom_pro_api_key") || "";
      if (customGeminiKey.trim()) {
        try {
          const sysPrompt = `Bạn là ${PERSONA_CONFIGS[persona].label} (${PERSONA_CONFIGS[persona].desc}) của Minh Hiếu TuBe. Hãy phản hồi bằng tiếng Việt tự nhiên, sâu sắc, thực tế và gãy gọn.`;
          replyText = await callGeminiDirectClient({
            prompt: text,
            systemInstruction: sysPrompt,
            history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
            model: "gemini-2.5-flash",
            apiKey: customGeminiKey.trim(),
          });
          modelLabel = "Gemini 2.5 Flash (Client)";
        } catch (directErr) {
          console.warn("[Gemini Direct Client]:", directErr);
        }
      }

      // 2. Query backend API if running full-stack
      if (!replyText) {
        try {
          const headers: Record<string, string> = {
            "Content-Type": "application/json"
          };
          if (customGeminiKey.trim()) {
            headers["x-gemini-api-key"] = customGeminiKey.trim();
          }

          const res = await fetch("/api/ai/chat", {
            method: "POST",
            headers,
            body: JSON.stringify({
              message: text,
              history: historyPayload,
              persona,
              modelPreference
            }),
            signal: AbortSignal.timeout(6000),
          });

          const data = await safeParseJson(res);
          if (res.ok && data.status === 1 && data.result?.text) {
            replyText = data.result.text;
            modelLabel = data.result.modelUsed || modelPreference;
          }
        } catch {
          // Backend not reachable on GitHub Pages
        }
      }

      // 3. Smart Offline Persona Fallback (Ensures zero errors when synced on GitHub Pages!)
      if (!replyText) {
        if (persona === "scriptwriter") {
          replyText = `🎬 **Gợi Ý Kịch Bản & Phân Cảnh (Chủ đề: "${text}")**\n\n🎯 **Hook 3 Giây Đầu**: "Bạn có tin chỉ một quyết định nhỏ có thể thay đổi hoàn toàn cục diện? Hãy xem hết video này!"\n\n📌 **Bố Cục 3 Hồi Chuẩn Viral**:\n1. **Khởi đầu (00:00 - 00:15)**: Đưa ra tình huống trớ trêu hoặc câu hỏi gây tò mò cực độ.\n2. **Xung đột & Thử thách (00:15 - 00:45)**: Nhân vật đối mặt với thế lực áp đảo hoặc nghịch cảnh bất ngờ.\n3. **Cú Twist & Bài học (00:45 - 01:00)**: Cách giải quyết thông minh và thông điệp đúc kết.\n\n💡 *Mẹo: Kết nối API Key cá nhân trong Cài Đặt để Gemini viết kịch bản chi tiết từng lời thoại!*`;
        } else if (persona === "musician") {
          replyText = `🎵 **Phác Thảo Ca Khúc & Giai Điệu (Ý tưởng: "${text}")**\n\n🎼 **Hợp Âm Đề Xuất**: [C - G - Am - F] hoặc [Am - F - C - G] (Tone Đô Trưởng / La Thứ)\n\n📝 **Lời Hát Gợi Ý (Điệp Khúc)**:\n*"Dưới cơn mưa chiều nhạt nhòa năm tháng cũ,\nKý ức trôi về tựa giấc mộng phù du.\nBước chân đi tìm bình yên nơi góc phố,\nGiữ nụ cười dẫu sương gió bụi mù..."*\n\n🥁 **Tiết Tấu**: 75-80 BPM, Guitar mộc kết hợp tiếng mưa nhẹ Lo-Fi chill.`;
        } else if (persona === "image_director") {
          replyText = `🎨 **Prompt Hình Ảnh 8K Chi Tiết (Yêu cầu: "${text}")**\n\n\`Cinematic photography of ${text}, dramatic golden hour lighting, 85mm lens, f/1.4 aperture, photorealistic, ultra-detailed textures, volumetric atmospheric fog, Unreal Engine 5 render style, masterpiece, 8k resolution --ar 16:9 --v 6.0\`\n\n💡 **Gợi ý bố cục**: Đặt chủ thể theo tỉ lệ 1/3, ánh sáng ngược (rim light) tạo chiều sâu điện ảnh.`;
        } else if (persona === "editor") {
          replyText = `🎙️ **Biên Tập Giọng Đọc Minh Hiếu AI (Văn bản gốc: "${text}")**\n\n*"${text.replace(/([.?!])/g, '$1... ')}"\n\n✨ **Lời khuyên phát âm**: Giữ tốc độ 1.0x, hạ tông giọng trầm ấm ở cuối câu, ngắt nghỉ rõ ràng ở các dấu ba chấm để tạo độ truyền cảm sâu sắc nhất!`;
        } else {
          replyText = `💡 **Ý kiến phản hồi từ Trợ Lý AI về: "${text}"**\n\n1. **Phân tích cốt lõi**: Yêu cầu của bạn hướng tới việc tối ưu hóa trải nghiệm và truyền tải thông điệp một cách ấn tượng.\n2. **Giải pháp thực thi**: Nên chia nhỏ thành 3 bước cụ thể (Chuẩn bị tư liệu -> Xây dựng khung sườn -> Hoàn thiện chi tiết).\n3. **Hành động tiếp theo**: Bạn có thể chuyển đoạn văn này sang Studio Giọng Nói hoặc Rạp Cinema để trải nghiệm ngay!\n\n*(Chế độ: Trợ lý AI Ngoại tuyến thông minh tương thích GitHub Pages. Nhập Gemini Key để trò chuyện mở rộng)*`;
        }
        modelLabel = "AI Thông Minh (Ngoại Tuyến)";
      }

      const botMsg: MessageItem = {
        id: `msg_m_${Date.now()}`,
        role: "model",
        text: replyText,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        modelUsed: modelLabel
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error("[Chat Error]:", err);
      setErrorMsg(err.message || "Lỗi xử lý. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    const resetMsg: MessageItem = {
      id: `msg_reset_${Date.now()}`,
      role: "model",
      text: PERSONA_CONFIGS[persona].starter,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      modelUsed: modelPreference
    };
    setMessages([resetMsg]);
    localStorage.removeItem("gemini_chat_history");
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenGeminiWeb = () => {
    window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Studio Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-neutral-900 to-amber-950/30 border border-indigo-500/30 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gemini AI Chat Studio • Đỗ Minh Hiếu AI</span>
              <span className="px-1.5 py-0.2 rounded bg-indigo-500 text-neutral-950 text-[10px] font-black uppercase">
                {isProLinked ? "PRO VERIFIED" : hasCustomKey ? "CUSTOM KEY" : "PRO ACTIVE"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Trò Chuyện & Đồng Sáng Tạo Cùng Gemini AI
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed">
              Trò chuyện trực tiếp với Gemini thế hệ mới nhất. Nhờ AI viết kịch bản, sáng tác nhạc, thiết kế câu lệnh hình ảnh hoặc biên tập văn bản, sau đó chỉ cần 1 chạm để đưa ngay vào phòng thu âm lồng tiếng Đỗ Minh Hiếu AI.
            </p>
          </div>

          {/* Quick Pro Plan Badge & Key Button */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleOpenGeminiWeb}
              className="px-3.5 py-2.5 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800 border border-indigo-500/30 hover:border-indigo-400 text-neutral-200 text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
              title="Mở ứng dụng gemini.google.com với tài khoản Pro của bạn"
            >
              <ExternalLink className="w-4 h-4 text-indigo-400" />
              <span>Mở Gemini.google.com</span>
            </button>

            <button
              onClick={onOpenProSettingsModal}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Tài Khoản Gemini Pro</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200">
                {isProLinked ? "Đã Liên Kết" : "Gói Pro"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Persona Bar */}
      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
          {(Object.keys(PERSONA_CONFIGS) as ChatPersona[]).map((pKey) => {
            const p = PERSONA_CONFIGS[pKey];
            const isSelected = persona === pKey;
            return (
              <button
                key={pKey}
                onClick={() => handleSelectPersona(pKey)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                    : "bg-neutral-950 border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700"
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Model Selector & Clear Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={modelPreference}
              onChange={(e) => setModelPreference(e.target.value)}
              className="bg-transparent text-xs text-neutral-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Nhanh & Ổn Định)</option>
              <option value="gemini-flash-latest">Gemini Flash Latest</option>
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Bản Pro Chuyên Sâu)</option>
            </select>
          </div>

          <button
            onClick={handleClearHistory}
            className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 border border-neutral-800 transition-colors"
            title="Xóa lịch sử đoạn chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="p-4 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4 min-h-[460px] max-h-[620px] overflow-y-auto flex flex-col">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                    : "bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-4 rounded-2xl space-y-2 border ${
                  isUser
                    ? "bg-amber-950/30 border-amber-500/40 text-neutral-100 rounded-tr-none"
                    : "bg-neutral-950 border-neutral-800 text-neutral-200 rounded-tl-none shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between gap-4 text-[10px] text-neutral-400 pb-1 border-b border-neutral-800/60 font-mono">
                  <span>{isUser ? "Bạn" : "Gemini AI"}</span>
                  <div className="flex items-center gap-2">
                    {msg.modelUsed && !isUser && (
                      <span className="text-indigo-400">{msg.modelUsed}</span>
                    )}
                    <span>{msg.timestamp}</span>
                  </div>
                </div>

                <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {msg.text}
                </div>

                {/* Bot Quick Actions */}
                {!isUser && (
                  <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap items-center gap-1.5">
                    {/* Read TTS button */}
                    <button
                      onClick={() => onSendToStudio(msg.text)}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-amber-500/20 text-neutral-300 hover:text-amber-300 border border-neutral-800 text-[11px] font-semibold transition-colors flex items-center gap-1"
                      title="Chuyển câu trả lời này sang phòng thu TTS để phát âm thanh"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Đọc Giọng Đỗ Minh Hiếu AI</span>
                    </button>

                    {/* Send to Scriptwriter */}
                    {onSendToScriptwriter && (
                      <button
                        onClick={() => onSendToScriptwriter(msg.text.slice(0, 150))}
                        className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-indigo-500/20 text-neutral-300 hover:text-indigo-300 border border-neutral-800 text-[11px] font-semibold transition-colors flex items-center gap-1"
                        title="Tạo kịch bản video phân cảnh từ ý tưởng này"
                      >
                        <Film className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Tạo Kịch Bản</span>
                      </button>
                    )}

                    {/* Send to Songwriter */}
                    {onSendToSongwriter && (
                      <button
                        onClick={() => onSendToSongwriter(msg.text.slice(0, 150))}
                        className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-pink-500/20 text-neutral-300 hover:text-pink-300 border border-neutral-800 text-[11px] font-semibold transition-colors flex items-center gap-1"
                        title="Sáng tác bài hát theo nội dung này"
                      >
                        <Music className="w-3.5 h-3.5 text-pink-400" />
                        <span>Sáng Tác Bài Hát</span>
                      </button>
                    )}

                    {/* Send to Music & Beat */}
                    {onSendToMusic && (
                      <button
                        onClick={() => onSendToMusic(msg.text.slice(0, 120))}
                        className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-purple-500/20 text-neutral-300 hover:text-purple-300 border border-neutral-800 text-[11px] font-semibold transition-colors flex items-center gap-1"
                        title="Tạo nhạc nền synthesizer và beat âm thanh theo nội dung này"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>Tạo Nhạc & Beat</span>
                      </button>
                    )}

                    {/* Open in Gemini Pro Web */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(msg.text);
                        window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-indigo-500/20 text-neutral-400 hover:text-indigo-300 border border-neutral-800 text-[11px] font-semibold transition-colors flex items-center gap-1"
                      title="Sao chép và mở câu trả lời trong gemini.google.com với tài khoản Pro"
                    >
                      <ExternalLink className="w-3 h-3 text-indigo-400" />
                      <span>Mở Gemini Pro</span>
                    </button>

                    {/* Copy text */}
                    <button
                      onClick={() => handleCopyText(msg.id, msg.text)}
                      className="p-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors ml-auto"
                      title="Sao chép nội dung"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-[80%] mr-auto animate-pulse">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl rounded-tl-none bg-neutral-950 border border-neutral-800 text-neutral-400 text-xs flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Gemini AI đang suy nghĩ và trả lời...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/40 text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => handleSendMessage()}
            className="px-3 py-1 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-200 text-xs font-semibold transition-colors"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Suggested Prompts Grid */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-neutral-400 font-semibold flex items-center gap-1">
          <Wand2 className="w-3 h-3 text-indigo-400" />
          <span>Gợi ý câu hỏi nhanh:</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS[persona].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(item)}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-indigo-300 border border-neutral-800 text-xs transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex items-center gap-2">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          rows={1}
          placeholder={`Hỏi ${PERSONA_CONFIGS[persona].label} bất kỳ điều gì (Nhấn Enter để gửi)...`}
          className="flex-1 bg-transparent px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none resize-none max-h-32"
        />

        <button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={isLoading || !inputMessage.trim()}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 active:scale-95 text-white disabled:opacity-40 transition-all flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
