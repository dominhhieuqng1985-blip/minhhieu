import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Sparkles,
  Download,
  Copy,
  RotateCcw,
  Sliders,
  Radio,
  FileText,
  CheckCircle2,
  AlertCircle,
  Mic,
  Key,
  Clock,
  Layers,
  ChevronDown,
  Loader2,
  Music,
  FileAudio,
  Subtitles,
  ExternalLink,
  ShieldCheck,
  Zap,
  PlusCircle,
  Trash2,
  Settings,
  Plus,
  Server,
  AlertTriangle,
  Cloud,
  HelpCircle,
} from 'lucide-react';
import {
  EVERAI_VOICES,
  EVERAI_MODELS,
  EverAiVoice,
  createEverAiTtsJob,
  pollEverAiTtsJob,
  getStoredEverAiKey,
  setStoredEverAiKey,
  getSavedEverAiHistory,
  saveEverAiHistoryItem,
  getCustomVoices,
  saveCustomVoice,
  deleteCustomVoice,
  getAllEverAiVoices,
  EverAiTtsHistoryItem,
  EverAiCorsError,
  DEFAULT_EVERAI_API_KEY,
  STORAGE_KEY_EVERAI_HISTORY,
} from '../utils/everai';
import { hasBackend, isStaticHost, getCustomBackendUrl } from '../utils/api';
import { VoiceManagerModal } from './VoiceManagerModal';
import { EverAiProxyModal } from './EverAiProxyModal';

interface TextToSpeechStudioProps {
  initialText?: string;
  onShowToast: (msg: string) => void;
}

export const TextToSpeechStudio: React.FC<TextToSpeechStudioProps> = ({
  initialText = '',
  onShowToast,
}) => {
  // Engine Mode: 'everai' (Studio Cloud API) | 'browser' (Offline Web Speech)
  const [engineMode, setEngineMode] = useState<'everai' | 'browser'>('everai');

  // Text State
  const [text, setText] = useState<string>(
    initialText ||
      `Chào mừng bạn đến với kênh Minh Hiếu review phim. Hôm nay, chúng ta cùng lắng đọng tâm hồn qua câu chuyện sâu sắc về chữ hiếu, đạo lý làm người và triết lý sống an nhiên giữa cuộc đời bề bộn.`
  );

  // EverAI Settings
  const [apiKey, setApiKey] = useState<string>(getStoredEverAiKey());
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);
  const [selectedEverAiVoice, setSelectedEverAiVoice] = useState<string>('vi_female_kieunhi_mn');
  const [selectedModel, setSelectedModel] = useState<string>('everai-v1.6');
  const [audioType, setAudioType] = useState<'mp3' | 'wav'>('mp3');
  const [bitrate, setBitrate] = useState<number>(128);
  const [speedRate, setSpeedRate] = useState<number>(1.0);
  const [pitchRate, setPitchRate] = useState<number>(1.0);
  const [volumeRate, setVolumeRate] = useState<number>(100);
  const [generateSrt, setGenerateSrt] = useState<boolean>(false);

  // EverAI Generation & Polling State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentRequestId, setCurrentRequestId] = useState<string>('');
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationStatusText, setGenerationStatusText] = useState<string>('');
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string>('');
  const [generatedSrtUrl, setGeneratedSrtUrl] = useState<string>('');
  const [audioHistory, setAudioHistory] = useState<EverAiTtsHistoryItem[]>([]);

  // Browser SpeechSynthesis State
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoiceURI, setSelectedBrowserVoiceURI] = useState<string>('');
  const [isBrowserSpeaking, setIsBrowserSpeaking] = useState<boolean>(false);
  const [isBrowserPaused, setIsBrowserPaused] = useState<boolean>(false);

  // Custom Voices State (persisted permanently in localStorage)
  const [customVoices, setCustomVoices] = useState<EverAiVoice[]>([]);
  const [isVoiceManagerOpen, setIsVoiceManagerOpen] = useState<boolean>(false);

  // Backend Proxy Modal for GitHub Pages & 405 CORS Resolution
  const [isProxyModalOpen, setIsProxyModalOpen] = useState<boolean>(false);
  const [lastCorsError, setLastCorsError] = useState<boolean>(false);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load history, custom voices & browser voices
  useEffect(() => {
    setAudioHistory(getSavedEverAiHistory());
    setCustomVoices(getCustomVoices());

    const updateBrowserVoices = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      const allVoices = window.speechSynthesis.getVoices();
      setBrowserVoices(allVoices);

      const viVoice = allVoices.find(
        (v) => v.lang.toLowerCase().includes('vi') || v.name.toLowerCase().includes('vietnam')
      );
      if (viVoice) {
        setSelectedBrowserVoiceURI(viVoice.voiceURI);
      } else if (allVoices.length > 0 && !selectedBrowserVoiceURI) {
        setSelectedBrowserVoiceURI(allVoices[0].voiceURI);
      }
    };

    updateBrowserVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateBrowserVoices;
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Save API key
  const handleSaveApiKey = () => {
    setStoredEverAiKey(apiKey);
    setShowApiKeyInput(false);
    onShowToast('🔑 Đã lưu cấu hình API Key EverAI!');
  };

  // Sample texts
  const sampleTexts = [
    {
      title: 'Giảng Đạo & Chữ Hiếu (Minh Hiếu)',
      text: `Đức Phật đã từng dạy rằng, trong muôn vàn hạnh lành trên thế gian, chữ Hiếu là đứng đầu. Cha mẹ như hai vị Phật sống trong gia đình, một đời bươn chải sớm hôm vì đàn con thơ. Khi tóc mẹ ngả màu sương, lưng cha thêm còng theo năm tháng, phận làm con xin hãy khắc ghi ơn nghĩa sinh thành.`,
      recommendedVoice: 'voice-ab888766-b59f-402b',
    },
    {
      title: 'Review Phim Kịch Tính',
      text: `Chào mừng các bạn đã quay trở lại với Minh Hiếu review phim! Ngay trong tập phim ngày hôm nay, chúng ta sẽ bước chân vào một hành trình nghẹt thở nơi ranh giới giữa chính nghĩa và tội ác bị xóa nhòa. Liệu cái thiện có chiến thắng được bóng tối? Đừng rời mắt khỏi màn hình!`,
      recommendedVoice: 'voice-f9ae90f1-12e4-470d',
    },
    {
      title: 'Dân Ca & Tình Người Miền Tây',
      text: `Về miền Tây sông nước Cửu Long, lắng nghe tiếng đờn kìm réo rắt bên bến lở bến bồi. Cánh lục bình tím ngát trôi lững lờ trên dòng Cổ Chiên, mang theo cái tình mộc mạc, hào sảng mà trĩu nặng nghĩa ân của người dân Nam Bộ.`,
      recommendedVoice: 'vi_female_kieunhi_mn',
    },
    {
      title: 'Bản Tin Phát Thanh Chuẩn Bắc',
      text: `Kính chào quý thính giả, đây là bản tin tổng hợp đặc biệt. Bản tin hôm nay cập nhật những thông tin thời sự mới nhất, những câu chuyện truyền cảm hứng và các góc nhìn văn hóa đặc sắc trong ngày. Cảm ơn quý vị đã luôn đồng hành cùng kênh.`,
      recommendedVoice: 'vi_male_lehoang_mb',
    },
  ];

  // Combined voice list (custom voices first, then system voices)
  const allEverAiVoices = [...customVoices, ...EVERAI_VOICES];
  const currentVoiceObj =
    allEverAiVoices.find((v) => v.id.toLowerCase() === selectedEverAiVoice.toLowerCase()) ||
    allEverAiVoices.find((v) => v.id === selectedEverAiVoice);

  // Custom Voice Management Handlers
  const handleSaveCustomVoice = (voiceData: Partial<EverAiVoice> & { id: string; name: string }) => {
    const updated = saveCustomVoice(voiceData);
    setCustomVoices(updated);
    setSelectedEverAiVoice(voiceData.id.trim());
  };

  const handleDeleteCustomVoice = (id: string) => {
    const updated = deleteCustomVoice(id);
    setCustomVoices(updated);
    if (selectedEverAiVoice.toLowerCase() === id.trim().toLowerCase()) {
      setSelectedEverAiVoice(updated[0]?.id || EVERAI_VOICES[0].id);
    }
  };

  const handleImportCustomVoices = (imported: EverAiVoice[]) => {
    setCustomVoices(imported);
    if (imported.length > 0) {
      setSelectedEverAiVoice(imported[0].id);
    }
  };

  // 1. Generate Voice via EverAI API
  const handleGenerateEverAiSpeech = async () => {
    if (!text.trim()) {
      onShowToast('⚠️ Vui lòng nhập nội dung văn bản');
      return;
    }

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    setIsGenerating(true);
    setLastCorsError(false);
    setGenerationProgress(5);
    setGenerationStatusText('Đang gửi yêu cầu tạo audio đến máy chủ EverAI...');
    setGeneratedAudioUrl('');
    setGeneratedSrtUrl('');

    try {
      const job = await createEverAiTtsJob({
        inputText: text.trim(),
        voiceCode: selectedEverAiVoice,
        modelId: selectedModel,
        audioType,
        bitrate,
        speedRate,
        pitchRate,
        volume: volumeRate,
        generateSrt,
        apiKey: apiKey.trim(),
      });

      setCurrentRequestId(job.requestId);
      setGenerationStatusText(`Đã nhận Request ID: ${job.requestId.slice(0, 8)}... Đang tổng hợp audio AI...`);
      setGenerationProgress(20);
      onShowToast(`🚀 Đã gửi yêu cầu (${job.characters} ký tự). Đang xử lý giọng đọc AI...`);

      // Start polling
      let attempts = 0;
      pollIntervalRef.current = setInterval(async () => {
        attempts++;
        try {
          const statusResult = await pollEverAiTtsJob(job.requestId, apiKey.trim());
          setGenerationProgress(Math.max(20, Math.min(98, statusResult.progress || attempts * 10)));
          setGenerationStatusText(
            `Trạng thái: ${statusResult.status.toUpperCase()} (${statusResult.progress || 0}%)`
          );

          if (statusResult.isDone && statusResult.audioLink) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setGenerationProgress(100);
            setIsGenerating(false);
            setGeneratedAudioUrl(statusResult.audioLink);
            if (statusResult.srtLink) setGeneratedSrtUrl(statusResult.srtLink);

            const voiceObj = allEverAiVoices.find((v) => v.id === selectedEverAiVoice);
            const historyItem: EverAiTtsHistoryItem = {
              id: Date.now().toString(),
              requestId: job.requestId,
              text: text.trim(),
              voiceCode: selectedEverAiVoice,
              voiceName: voiceObj ? voiceObj.name : selectedEverAiVoice,
              audioLink: statusResult.audioLink,
              srtLink: statusResult.srtLink,
              createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              characters: job.characters,
              modelId: selectedModel,
              audioType,
            };

            saveEverAiHistoryItem(historyItem);
            setAudioHistory(getSavedEverAiHistory());
            onShowToast('🎉 Tạo audio thành công! Bạn có thể nghe thử hoặc tải về.');
          } else if (statusResult.status === 'FAILURE' || attempts > 60) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsGenerating(false);
            onShowToast('❌ Không thể hoàn thành xử lý audio. Vui lòng thử lại!');
          }
        } catch (pollErr: any) {
          console.warn('Poll error:', pollErr);
          if (pollErr instanceof EverAiCorsError || pollErr.isCorsBlocked) {
            setLastCorsError(true);
          }
          if (attempts > 40) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsGenerating(false);
            onShowToast('⚠️ Mất kết nối kiểm tra tiến trình. Vui lòng tải lại.');
          }
        }
      }, 1800);
    } catch (err: any) {
      console.error('EverAI create error:', err);
      setIsGenerating(false);
      const isCors =
        err instanceof EverAiCorsError ||
        err.isCorsBlocked ||
        err.message?.includes('405') ||
        err.message?.includes('CORS') ||
        err.message?.includes('OPTIONS') ||
        err.message?.includes('Failed to fetch');

      if (isCors) {
        setLastCorsError(true);
        onShowToast('⚠️ Lỗi 405 Method Not Allowed (OPTIONS CORS): Cần kết nối Backend Proxy hoặc chuyển sang Web Speech.');
      } else {
        onShowToast(`❌ Lỗi EverAI: ${err.message || 'Không thể tạo audio'}`);
      }
    }
  };

  // 2. Play via Browser Web Speech
  const handleBrowserSpeak = () => {
    if (!text.trim()) {
      onShowToast('⚠️ Vui lòng nhập nội dung văn bản');
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onShowToast('❌ Trình duyệt không hỗ trợ Web Speech');
      return;
    }

    if (isBrowserPaused) {
      window.speechSynthesis.resume();
      setIsBrowserPaused(false);
      setIsBrowserSpeaking(true);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const chosen = browserVoices.find((v) => v.voiceURI === selectedBrowserVoiceURI);
    if (chosen) {
      utterance.voice = chosen;
      utterance.lang = chosen.lang;
    } else {
      utterance.lang = 'vi-VN';
    }

    utterance.rate = speedRate;
    utterance.pitch = pitchRate;
    utterance.volume = volumeRate / 100;

    utterance.onstart = () => {
      setIsBrowserSpeaking(true);
      setIsBrowserPaused(false);
    };

    utterance.onend = () => {
      setIsBrowserSpeaking(false);
      setIsBrowserPaused(false);
    };

    utterance.onerror = () => {
      setIsBrowserSpeaking(false);
      setIsBrowserPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    onShowToast('🔊 Đang phát giọng đọc trình duyệt...');
  };

  const handleBrowserPause = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
      setIsBrowserPaused(true);
    }
  };

  const handleBrowserStop = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsBrowserSpeaking(false);
      setIsBrowserPaused(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phòng Thu Chuyển Văn Bản Thành Giọng Nói AI (TTS)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>Chuyển Đổi Text-to-Speech Chuyên Nghiệp</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Tích hợp chuẩn API EverAI v1.6 với đầy đủ dàn giọng đọc Nam/Nữ Bắc - Nam, giọng giảng đạo Phật pháp kênh Minh Hiếu, cùng cơ chế đọc miễn phí tức thì qua Web Speech.
            </p>
          </div>

          {/* Engine Selector */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800 shrink-0">
            <button
              onClick={() => setEngineMode('everai')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                engineMode === 'everai'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>EverAI Studio (Chuẩn API)</span>
            </button>
            <button
              onClick={() => setEngineMode('browser')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                engineMode === 'browser'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              <span>Trình Duyệt (Miễn phí)</span>
            </button>
          </div>
        </div>

        {/* API Key & Custom Voice Bar for EverAI */}
        {engineMode === 'everai' && (
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Backend:{' '}
                <code className="text-indigo-300 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800 font-mono text-[11px]">
                  {getCustomBackendUrl() ? `${getCustomBackendUrl()}/api/everai/tts` : hasBackend() ? '/api/everai/tts (Node.js)' : 'https://www.everai.vn/api/v1/tts'}
                </code>
              </span>
              <span className="text-slate-500">•</span>
              {hasBackend() ? (
                <button
                  type="button"
                  onClick={() => setIsProxyModalOpen(true)}
                  className="px-2.5 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60 text-[11px] font-semibold flex items-center gap-1 transition-all"
                  title="Nhấn để cấu hình hoặc kiểm tra Backend"
                >
                  <Server className="w-3 h-3 text-emerald-400" />
                  <span>Backend Proxy: Đã kết nối</span>
                </button>
              ) : isStaticHost ? (
                <button
                  type="button"
                  onClick={() => setIsProxyModalOpen(true)}
                  className="px-2.5 py-0.5 rounded-lg bg-amber-950/70 border border-amber-600/80 text-amber-300 hover:bg-amber-900/70 text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm shadow-amber-500/20 animate-pulse"
                  title="Trình duyệt trên GitHub Pages bị lỗi 405 OPTIONS khi gọi trực tiếp EverAI. Nhấn để kết nối proxy."
                >
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>Cần Proxy GitHub Pages (Sửa 405)</span>
                </button>
              ) : (
                <span className="text-emerald-400 font-medium">Đã kết nối Token</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsProxyModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
                title="Khắc phục lỗi 405 OPTIONS và cấu hình Backend URL cho GitHub Pages"
              >
                <Server className="w-3.5 h-3.5 text-amber-400" />
                <span>Cấu Hình Backend Proxy</span>
              </button>

              <button
                type="button"
                onClick={() => setIsVoiceManagerOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all border border-indigo-400/30"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-300" />
                <span>Cài Đặt Giọng Nói ({customVoices.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 underline underline-offset-4"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{showApiKeyInput ? 'Ẩn Key' : 'Tùy chỉnh Key'}</span>
              </button>
            </div>
          </div>
        )}

        {/* API Key Modal / Expander */}
        {showApiKeyInput && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-950/90 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>EverAI Bearer Token (Tạo tại everai.vn/api)</span>
              </label>
              <button
                onClick={() => setApiKey(DEFAULT_EVERAI_API_KEY)}
                className="text-[11px] text-slate-400 hover:text-amber-400 transition-colors"
              >
                Đặt lại Key mặc định
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Nhập Bearer Token EverAI của bạn..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                Lưu Token
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Text Input & Sample Scripts (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Nội Dung Văn Bản Cần Tổng Hợp Giọng Đọc</span>
              </label>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-mono text-indigo-300 font-semibold">{text.length}</span> ký tự
                {engineMode === 'everai' && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px]">
                    Ước tính: {Math.ceil((text.length / 1000) * (currentVoiceObj?.cost.includes('100 ') ? 100 : 1000))} credits
                  </span>
                )}
              </div>
            </div>

            <textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập hoặc dán nội dung bài viết, review phim, kinh kệ, lời bình kịch bản vào đây..."
              className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500 transition-all resize-y leading-relaxed"
            />

            {/* Quick Sample Presets */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Mẫu kịch bản có sẵn:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sampleTexts.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setText(sample.text);
                      if (engineMode === 'everai') {
                        setSelectedEverAiVoice(sample.recommendedVoice);
                      }
                      onShowToast(`📝 Đã nạp mẫu "${sample.title}"!`);
                    }}
                    className="text-left p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 text-xs transition-all group"
                  >
                    <div className="font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                      {sample.title}
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {sample.text}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Clear / Reset action */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(text);
                  onShowToast('📋 Đã sao chép văn bản vào clipboard!');
                }}
                className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Sao chép chữ</span>
              </button>

              <button
                onClick={() => setText('')}
                className="text-rose-400/80 hover:text-rose-300 transition-colors"
              >
                Xóa sạch văn bản
              </button>
            </div>
          </div>

          {/* Action Trigger Box */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-4">
            {engineMode === 'everai' ? (
              <div className="space-y-3">
                {/* 405 OPTIONS CORS Alert Banner */}
                {lastCorsError && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/70 via-slate-900 to-amber-950/40 border border-amber-500/70 flex flex-col gap-3 text-xs shadow-xl animate-in fade-in">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-bold text-amber-300 text-xs flex items-center gap-2">
                          <span>Phát hiện lỗi 405 Method Not Allowed (OPTIONS Preflight)</span>
                          <span className="px-1.5 py-0.2 bg-red-500/20 text-red-300 rounded text-[10px] font-mono">
                            CORS Blocked
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          Do máy chủ EverAI không hỗ trợ phương thức <strong>OPTIONS</strong> từ trình duyệt trên GitHub Pages. Hãy kết nối máy chủ <strong>Backend Proxy</strong> hoặc chuyển sang <strong>Giọng Đọc Trình Duyệt Web Speech</strong> để sử dụng ngay.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
                      <button
                        type="button"
                        onClick={() => setIsProxyModalOpen(true)}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                      >
                        <Server className="w-3.5 h-3.5" />
                        <span>⚙️ Mở Cấu Hình Backend Proxy / Cloudflare</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEngineMode('browser');
                          setLastCorsError(false);
                          onShowToast('🎙️ Đã chuyển sang Giọng Đọc Trình Duyệt Web Speech (Không cần server)!');
                        }}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all"
                      >
                        <Mic className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Dùng Ngay Web Speech (Miễn phí)</span>
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleGenerateEverAiSpeech}
                  disabled={isGenerating || !text.trim()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Đang tổng hợp giọng đọc EverAI... ({generationProgress}%)</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" />
                      <span>Tổng Hợp Audio Studio (EverAI API POST)</span>
                    </>
                  )}
                </button>

                {/* Progress Indicator */}
                {isGenerating && (
                  <div className="space-y-2 p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/30">
                    <div className="flex justify-between text-xs">
                      <span className="text-indigo-300 font-medium">{generationStatusText}</span>
                      <span className="text-white font-bold">{generationProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-amber-400 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      <span>Hệ thống đang tự động thăm dò GET /api/v1/tts/{currentRequestId ? currentRequestId.slice(0, 8) : '...'}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Browser Speech Controls */
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleBrowserSpeak}
                  className="flex-1 py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>{isBrowserPaused ? 'Tiếp tục đọc' : 'Đọc Ngay (Offline)'}</span>
                </button>

                {isBrowserSpeaking && !isBrowserPaused && (
                  <button
                    onClick={handleBrowserPause}
                    className="py-3.5 px-5 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-bold text-sm transition-all flex items-center gap-1.5"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Tạm dừng</span>
                  </button>
                )}

                {isBrowserSpeaking && (
                  <button
                    onClick={handleBrowserStop}
                    className="py-3.5 px-5 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold text-sm transition-all flex items-center gap-1.5"
                  >
                    <Square className="w-4 h-4" />
                    <span>Dừng</span>
                  </button>
                )}
              </div>
            )}

            {/* Generated Audio Player & Download (EverAI) */}
            {generatedAudioUrl && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-950 border border-emerald-500/30 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Audio Đã Sẵn Sàng</span>
                  </div>
                  <span className="text-[11px] text-slate-400 uppercase font-mono">{audioType.toUpperCase()} • {bitrate}kbps</span>
                </div>

                <audio
                  ref={audioPlayerRef}
                  src={generatedAudioUrl}
                  controls
                  className="w-full h-11 accent-indigo-500 rounded-lg"
                  autoPlay
                />

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <a
                    href={generatedAudioUrl}
                    download={`everai_tts_${selectedEverAiVoice}_${Date.now()}.${audioType}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải File Audio ({audioType.toUpperCase()})</span>
                  </a>

                  {generatedSrtUrl && (
                    <a
                      href={generatedSrtUrl}
                      download={`subtitle_${Date.now()}.srt`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-slate-700"
                    >
                      <Subtitles className="w-4 h-4 text-amber-400" />
                      <span>Tải Phụ Đề (.SRT)</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Voice Selection & Detailed Parameters (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-5">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Cấu Hình Giọng Đọc &amp; Thông Số</span>
            </h2>

            {/* EverAI Voices List */}
            {engineMode === 'everai' ? (
              <div className="space-y-4">
                {/* Voice Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Mã Giọng Đọc (voice_code):
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsVoiceManagerOpen(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 transition-colors group"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                      <span>+ Cài giọng mới / Quản lý ({customVoices.length})</span>
                    </button>
                  </div>

                  <select
                    value={selectedEverAiVoice}
                    onChange={(e) => setSelectedEverAiVoice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {/* User's Permanently Saved Custom Voices */}
                    {customVoices.length > 0 && (
                      <optgroup label={`⭐ Giọng Nói Tùy Chỉnh Của Bạn (${customVoices.length} giọng đã lưu vĩnh viễn)`}>
                        {customVoices.map((v) => (
                          <option key={v.id} value={v.id}>
                            ⭐ [Tùy chỉnh] {v.name} ({v.gender} - {v.region}) - {v.id}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <optgroup label="🌟 Giọng Kênh Minh Hiếu & Đạo Lý (Special)">
                      {EVERAI_VOICES.filter((v) => v.isSpecial).map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.region}) - {v.cost}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🇻🇳 Tiếng Việt - Nữ & Nam Miền Bắc / Nam">
                      {EVERAI_VOICES.filter((v) => !v.isSpecial && v.language === 'Việt Nam').map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.gender} - {v.region}) - {v.cost}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🇺🇸 Tiếng Anh (English US / UK / AU / IN)">
                      {EVERAI_VOICES.filter((v) => v.language === 'English').map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.region}) - {v.cost}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🌏 Quốc Tế (Trung, Nhật, Hàn, Pháp, TBN)">
                      {EVERAI_VOICES.filter(
                        (v) => !v.isSpecial && v.language !== 'Việt Nam' && v.language !== 'English'
                      ).map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.region})
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  {/* Active Voice Card */}
                  {currentVoiceObj && (
                    currentVoiceObj.isCustom ? (
                      <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/90 to-purple-950/80 border border-indigo-500/40 space-y-2 text-xs shadow-inner">
                        <div className="flex items-start justify-between font-bold text-slate-200">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="text-amber-300 font-bold">{currentVoiceObj.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Đã lưu vĩnh viễn
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn giọng "${currentVoiceObj.name}" (${currentVoiceObj.id})?`)) {
                                handleDeleteCustomVoice(currentVoiceObj.id);
                                onShowToast(`🗑️ Đã xóa giọng "${currentVoiceObj.name}"!`);
                              }
                            }}
                            className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 transition-colors shrink-0"
                            title="Xóa vĩnh viễn giọng này"
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                            <span>Xóa giọng</span>
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          <span className="px-2 py-0.5 rounded-md bg-slate-900/90 text-blue-300 border border-slate-700/60 font-medium">
                            {currentVoiceObj.gender === 'Nữ' || currentVoiceObj.gender === 'Female' ? '👩 Nữ' : '👨 Nam'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-900/90 text-slate-300 border border-slate-700/60">
                            📍 {currentVoiceObj.region}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-900/90 text-slate-300 border border-slate-700/60">
                            🌐 {currentVoiceObj.language}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300/90 leading-relaxed">
                          {currentVoiceObj.description}
                        </p>
                        <div className="pt-1 text-[11px] text-slate-400 font-mono flex items-center justify-between border-t border-indigo-500/20">
                          <span>voice_code: <span className="text-amber-400 font-bold select-all">{currentVoiceObj.id}</span></span>
                          <button
                            type="button"
                            onClick={() => setIsVoiceManagerOpen(true)}
                            className="text-[11px] text-indigo-300 hover:text-white underline underline-offset-2 font-sans"
                          >
                            Quản lý tất cả
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
                        <div className="flex justify-between font-bold text-slate-200">
                          <span className="text-amber-400">{currentVoiceObj.name}</span>
                          <span className="text-[11px] text-slate-400">{currentVoiceObj.cost}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {currentVoiceObj.description}
                        </p>
                        <div className="pt-1 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                          <span>voice_code: <span className="text-indigo-400">{currentVoiceObj.id}</span></span>
                          <button
                            type="button"
                            onClick={() => setIsVoiceManagerOpen(true)}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-sans font-medium"
                          >
                            + Cài giọng mới
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Model ID Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Mã Mô Hình (model_id):
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {EVERAI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Audio Type & Bitrate */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Định dạng (audio_type):</label>
                    <select
                      value={audioType}
                      onChange={(e) => setAudioType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    >
                      <option value="mp3">MP3 (Chuẩn)</option>
                      <option value="wav">WAV (Không nén)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Bitrate (bps):</label>
                    <select
                      value={bitrate}
                      onChange={(e) => setBitrate(Number(e.target.value))}
                      disabled={audioType !== 'mp3'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white disabled:opacity-50"
                    >
                      <option value={160}>160 kbps (Cao cấp)</option>
                      <option value={128}>128 kbps (Mặc định)</option>
                      <option value={64}>64 kbps (Tiết kiệm)</option>
                      <option value={32}>32 kbps (Nhẹ)</option>
                    </select>
                  </div>
                </div>

                {/* Sliders: Speed, Pitch, Volume */}
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  {/* Speed */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Tốc độ đọc (speed_rate):</span>
                      <span className="font-mono text-indigo-400 font-bold">{speedRate.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={speedRate}
                      onChange={(e) => setSpeedRate(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  {/* Pitch */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Cao độ giọng (pitch_rate):</span>
                      <span className="font-mono text-indigo-400 font-bold">{pitchRate.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={pitchRate}
                      onChange={(e) => setPitchRate(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  {/* Volume */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Âm lượng (volume):</span>
                      <span className="font-mono text-indigo-400 font-bold">{volumeRate}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      step="5"
                      value={volumeRate}
                      onChange={(e) => setVolumeRate(parseInt(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                </div>

                {/* SRT Subtitle Toggle */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-200">Tạo phụ đề (generate_srt)</div>
                    <div className="text-[11px] text-slate-400">Tự động xuất tệp .SRT khớp với giọng đọc</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={generateSrt}
                    onChange={(e) => setGenerateSrt(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-500"
                  />
                </div>
              </div>
            ) : (
              /* Browser Voices List */
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300">
                  Giọng đọc có sẵn trên thiết bị / trình duyệt:
                </label>
                <select
                  value={selectedBrowserVoiceURI}
                  onChange={(e) => setSelectedBrowserVoiceURI(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {browserVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Tốc độ:</span>
                    <span className="font-mono text-indigo-400 font-bold">{speedRate.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speedRate}
                    onChange={(e) => setSpeedRate(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* History of Audios */}
          {audioHistory.length > 0 && (
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Lịch Sử Đã Tạo ({audioHistory.length})
                </span>
                <button
                  onClick={() => {
                    localStorage.removeItem(STORAGE_KEY_EVERAI_HISTORY);
                    setAudioHistory([]);
                    onShowToast('Đã xóa lịch sử audio!');
                  }}
                  className="text-[11px] text-slate-500 hover:text-rose-400"
                >
                  Xóa lịch sử
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {audioHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 text-xs space-y-1.5 transition-all"
                  >
                    <div className="flex justify-between text-slate-300">
                      <span className="font-semibold text-indigo-300">{item.voiceName}</span>
                      <span className="text-[10px] text-slate-500">{item.createdAt}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                      "{item.text}"
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => {
                          setGeneratedAudioUrl(item.audioLink);
                          if (item.srtLink) setGeneratedSrtUrl(item.srtLink);
                          setText(item.text);
                          onShowToast(`🎵 Đã mở lại bản thu "${item.voiceName}"!`);
                        }}
                        className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 text-[11px]"
                      >
                        <Play className="w-3 h-3" />
                        <span>Phát lại</span>
                      </button>

                      <a
                        href={item.audioLink}
                        download={`audio_${item.id}.mp3`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                      >
                        <Download className="w-3 h-3" />
                        <span>Tải về</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voice Manager Modal */}
      <VoiceManagerModal
        isOpen={isVoiceManagerOpen}
        onClose={() => setIsVoiceManagerOpen(false)}
        customVoices={customVoices}
        onSaveVoice={handleSaveCustomVoice}
        onDeleteVoice={handleDeleteCustomVoice}
        onSelectVoice={(id) => setSelectedEverAiVoice(id)}
        onImportVoices={handleImportCustomVoices}
        currentSelectedVoiceId={selectedEverAiVoice}
        onShowToast={onShowToast}
      />

      {/* EverAI Backend & Proxy Modal for GitHub Pages */}
      <EverAiProxyModal
        isOpen={isProxyModalOpen}
        onClose={() => setIsProxyModalOpen(false)}
        onSwitchToWebSpeech={() => {
          setEngineMode('browser');
          setLastCorsError(false);
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
};
