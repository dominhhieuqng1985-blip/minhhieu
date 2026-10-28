import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Send,
  Volume2,
  Turtle,
  Sparkles,
  Loader2,
  Trash2,
  MessageCircle,
  Globe,
  Check,
  X,
} from 'lucide-react';
import { SubjectId, SUBJECTS_META } from '../data/kidsCurriculumData';
import { getApiBaseUrl } from '../utils/api';

export interface TutorChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  spokenVi?: string;
  englishPhrase?: string;
  phoneticIpa?: string;
  englishExamples?: { en: string; ipa?: string; vi: string }[];
  followUps?: string[];
  viaVoice?: boolean;
}

export interface KidsVoiceTutorChatProps {
  compact?: boolean;
  onCloseCompact?: () => void;
  defaultGrade: number;
  defaultSubject: SubjectId | 'all';
  onSpeakVi: (text: string) => void;
  onSpeakEnglish: (text: string, opts?: { slow?: boolean }) => void;
  viVoiceLabel: string;
  enVoiceLabel: string;
  onStopSpeaking: () => void;
}

const STARTER_QUESTIONS = [
  'Con mèo và quả táo tiếng Anh đọc sao cho chuẩn bản xứ ạ?',
  'Giải thích giúp em cách phân biệt s/x và dấu hỏi/ngã dễ nhớ!',
  'Chỉ em cách giải bài toán tìm X: 3x + 12 = 27 từng bước ạ',
  'Dạy em 5 câu giao tiếp Tiếng Anh chào hỏi tự nhiên mỗi ngày!',
  'Thì hiện tại đơn (Present Simple) dùng khi nào và có mẹo gì nhớ nhanh?',
];

export const KidsVoiceTutorChat: React.FC<KidsVoiceTutorChatProps> = ({
  compact = false,
  onCloseCompact,
  defaultGrade,
  defaultSubject,
  onSpeakVi,
  onSpeakEnglish,
  viVoiceLabel,
  enVoiceLabel,
  onStopSpeaking,
}) => {
  const [grade, setGrade] = useState<number>(defaultGrade);
  const [subject, setSubject] = useState<SubjectId | 'all'>(defaultSubject);
  const [micLang, setMicLang] = useState<'vi-VN' | 'en-US'>('vi-VN');
  const [autoSpeakReply, setAutoSpeakReply] = useState<boolean>(true);

  const [messages, setMessages] = useState<TutorChatMessage[]>([
    {
      id: 'welcome-tutor',
      role: 'assistant',
      text: 'Xin chào em! Thầy/Cô là Gia Sư Thông Thái đây 🌟. Em có thể **gõ câu hỏi** hoặc nhấn nút **🎤 Nói Trực Tiếp** để hỏi bài Toán, Tiếng Việt, Khoa học hoặc hỏi cách phát âm & giải đáp Tiếng Anh chuẩn giọng bản xứ nhé!',
      spokenVi:
        'Xin chào em! Em có thể gõ câu hỏi hoặc nhấn nút Micro để nói trực tiếp hỏi bài Toán, Tiếng Việt, hoặc giải đáp Tiếng Anh chuẩn bản xứ nhé!',
      englishPhrase: 'Hello! Ask me anything in Vietnamese or English!',
      phoneticIpa: '/həˈləʊ! ɑːsk miː ˈen.i.θɪŋ/',
      followUps: STARTER_QUESTIONS.slice(0, 3),
    },
  ]);

  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isTranscribingMic, setIsTranscribingMic] = useState<boolean>(false);
  const [micStatusNote, setMicStatusNote] = useState<string>('');
  const [micVolumeLevel, setMicVolumeLevel] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const meterAnimRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setGrade(defaultGrade);
  }, [defaultGrade]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isSending]);

  const cleanupMicResources = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (meterAnimRef.current) {
      cancelAnimationFrame(meterAnimRef.current);
      meterAnimRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setMicVolumeLevel(0);
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanupMicResources();
    };
  }, [cleanupMicResources]);

  const sendQuestion = useCallback(
    async (rawQuestion: string, viaVoice = false) => {
      const trimmed = rawQuestion.trim();
      if (!trimmed || isSending) return;

      onStopSpeaking();
      const userMsg: TutorChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: trimmed,
        viaVoice,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setIsSending(true);
      setMicStatusNote('');

      try {
        const apiBase = getApiBaseUrl();
        const endpoint = apiBase
          ? `${apiBase.replace(/\/+$/, '')}/api/kids-learning/chat`
          : '/api/kids-learning/chat';

        const historyPayload = messages.slice(-6).map((m) => ({
          role: m.role,
          text: m.text,
        }));

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            grade,
            subject,
            history: historyPayload,
          }),
        });

        const data = await res.json();
        const replyVi = String(
          data?.replyVi ||
            'Thầy đã nhận được câu hỏi của em! Em hãy xem hướng dẫn bên dưới nhé.'
        );
        const spokenVi = String(data?.spokenVi || replyVi);
        const englishPhrase = data?.englishPhrase ? String(data.englishPhrase).trim() : '';
        const phoneticIpa = data?.phoneticIpa ? String(data.phoneticIpa).trim() : '';
        const englishExamples = Array.isArray(data?.englishExamples) ? data.englishExamples : [];
        const followUps = Array.isArray(data?.followUps) ? data.followUps : [];

        const assistantMsg: TutorChatMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: replyVi,
          spokenVi,
          englishPhrase: englishPhrase || undefined,
          phoneticIpa: phoneticIpa || undefined,
          englishExamples,
          followUps,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // Smart Voice Auto-Read: If user asked an English pronunciation question or spoke in English,
        // prioritize crisp Native English pronunciation; otherwise read the Vietnamese explanation!
        if (autoSpeakReply || viaVoice) {
          if (micLang === 'en-US' && englishPhrase) {
            onSpeakEnglish(englishPhrase);
          } else if (
            englishPhrase &&
            /tiếng anh|đọc sao|phát âm|pronounce|english|nghĩa là gì/i.test(trimmed)
          ) {
            onSpeakEnglish(englishPhrase);
          } else {
            onSpeakVi(spokenVi);
          }
        }
      } catch {
        const fallbackMsg: TutorChatMessage = {
          id: `a-err-${Date.now()}`,
          role: 'assistant',
          text: 'Hiện kết nối mạng hơi chậm một chút, em hãy bấm gửi lại câu hỏi nhé!',
          spokenVi: 'Kết nối mạng hơi chậm một chút, em hãy bấm gửi lại câu hỏi nhé!',
        };
        setMessages((prev) => [...prev, fallbackMsg]);
      } finally {
        setIsSending(false);
      }
    },
    [
      isSending,
      onStopSpeaking,
      messages,
      grade,
      subject,
      autoSpeakReply,
      micLang,
      onSpeakEnglish,
      onSpeakVi,
    ]
  );

  // Fallback / Universal Microphone Recorder -> Server Gemini 3.5 Transcribe
  const startMediaRecorderFallback = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Attach live volume meter so kid sees responsive voice bars while speaking
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          src.connect(analyser);
          const dataArr = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            analyser.getByteFrequencyData(dataArr);
            let sum = 0;
            for (let i = 0; i < dataArr.length; i++) sum += dataArr[i];
            const avg = sum / dataArr.length;
            setMicVolumeLevel(Math.min(100, Math.round((avg / 90) * 100)));
            meterAnimRef.current = requestAnimationFrame(tick);
          };
          tick();
        }
      } catch {}

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (meterAnimRef.current) {
          cancelAnimationFrame(meterAnimRef.current);
          meterAnimRef.current = null;
        }
        setMicVolumeLevel(0);

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (audioBlob.size < 250) {
          setIsListening(false);
          return;
        }

        setIsTranscribingMic(true);
        setMicStatusNote('Đang nhận diện giọng nói của bé...');
        try {
          const base64Audio = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const s = String(reader.result || '');
              const comma = s.indexOf(',');
              resolve(comma >= 0 ? s.slice(comma + 1) : s);
            };
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
          });

          const apiBase = getApiBaseUrl();
          const endpoint = apiBase
            ? `${apiBase.replace(/\/+$/, '')}/api/kids-learning/transcribe`
            : '/api/kids-learning/transcribe';

          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64Audio,
              mimeType: audioBlob.type || 'audio/webm',
              language: micLang,
            }),
          });
          const data = await resp.json();
          if (resp.ok && data?.transcript && String(data.transcript).trim()) {
            const spokenText = String(data.transcript).trim();
            setMicStatusNote('');
            sendQuestion(spokenText, true);
          } else {
            setMicStatusNote(
              data?.error || 'Chưa nghe rõ câu hỏi, bé hãy bấm Micro và nói gần hơn nhé!'
            );
          }
        } catch {
          setMicStatusNote('Không thể chuyển giọng nói lúc này, bé thử lại hoặc gõ câu hỏi nhé!');
        } finally {
          setIsTranscribingMic(false);
          setIsListening(false);
        }
      };

      recorder.start();
      setIsListening(true);
      setMicStatusNote(
        micLang === 'en-US'
          ? '🎙️ Speak your question in English now — tap Stop when finished!'
          : '🎙️ Bé hãy nói câu hỏi trực tiếp vào Micro — nói xong nhấn Dừng để gửi nhé!'
      );
    } catch {
      setMicStatusNote(
        '⚠️ Chưa mở được Micro. Hãy nhấn biểu tượng ổ khóa trên trình duyệt để cho phép quyền Micro nhé!'
      );
      setIsListening(false);
    }
  };

  const handleToggleVoiceAsk = async () => {
    if (isListening) {
      cleanupMicResources();
      return;
    }

    onStopSpeaking();
    setMicStatusNote('');

    const SpeechRec =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        recognitionRef.current = rec;
        rec.lang = micLang;
        rec.interimResults = true;
        rec.continuous = false;
        let finalTranscript = '';
        let latestInterim = '';
        let switchedFallback = false;

        rec.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const piece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += piece + ' ';
            } else {
              interim += piece;
            }
          }
          latestInterim = interim;
          setInputText((finalTranscript + interim).trim());
        };

        rec.onerror = (ev: any) => {
          const errCode = String(ev?.error || '');
          if (
            errCode === 'network' ||
            errCode === 'service-not-allowed' ||
            errCode === 'not-allowed'
          ) {
            switchedFallback = true;
            recognitionRef.current = null;
            startMediaRecorderFallback();
          } else {
            setIsListening(false);
            setMicStatusNote('');
          }
        };

        rec.onend = () => {
          if (switchedFallback) return;
          setIsListening(false);
          setMicStatusNote('');
          const spoken = (finalTranscript || latestInterim).trim();
          if (spoken) {
            sendQuestion(spoken, true);
          }
        };

        rec.start();
        setIsListening(true);
        setMicStatusNote(
          micLang === 'en-US'
            ? '🎙️ Listening in English... Speak clearly!'
            : '🎙️ Đang lắng nghe bé nói trực tiếp... (Nói xong tự động gửi câu hỏi!)'
        );
        return;
      } catch {
        // Fallback to MediaRecorder
      }
    }

    await startMediaRecorderFallback();
  };

  // Render simple bold markdown (**...**) safely without extra libs
  const renderFormattedText = (raw: string) => {
    const segments = raw.split(/(\*\*[^*]+\*\*)/g);
    return segments.map((seg, i) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        return (
          <strong key={i} className="text-amber-300 font-extrabold">
            {seg.slice(2, -2)}
          </strong>
        );
      }
      return <span key={i}>{seg}</span>;
    });
  };

  return (
    <div
      className={`rounded-3xl bg-slate-900 border border-indigo-500/40 shadow-2xl flex flex-col overflow-hidden ${
        compact ? 'h-[560px]' : 'min-h-[620px]'
      }`}
    >
      {/* Top Chat Tutor Header */}
      <div className="p-4 sm:px-5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white">
                Khung Chat Hỏi Bài &amp; Nói Trực Tiếp Với Gia Sư
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                Tiếng Anh Bản Xứ Chuẩn
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Giảng Tiếng Việt: <strong className="text-amber-300">{viVoiceLabel}</strong> • Phát âm Anh:{' '}
              <strong className="text-sky-300">{enVoiceLabel}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            aria-label="Chọn lớp học để hỏi bài"
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold"
          >
            {Array.from({ length: 12 }, (_, idx) => idx + 1).map((g) => (
              <option key={g} value={g}>
                Lớp {g}
              </option>
            ))}
          </select>

          {!compact && (
            <select
              aria-label="Chọn môn học"
              value={subject}
              onChange={(e) => setSubject(e.target.value as SubjectId | 'all')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
            >
              <option value="all">Tất cả môn</option>
              {SUBJECTS_META.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shortName}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setAutoSpeakReply((v) => !v)}
            className={`px-2.5 py-1.5 rounded-xl border font-bold flex items-center gap-1 transition-colors ${
              autoSpeakReply
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title="Tự động đọc to câu trả lời"
          >
            <Check className={`w-3.5 h-3.5 ${autoSpeakReply ? 'text-emerald-400' : 'opacity-40'}`} />
            <span>Tự đọc đáp án</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setMessages((prev) => [prev[0]])
            }
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white"
            title="Xóa lịch sử trò chuyện"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {compact && onCloseCompact && (
            <button
              type="button"
              onClick={onCloseCompact}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              title="Thu gọn khung chat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[92%] sm:max-w-[84%] rounded-2xl p-4 space-y-3 ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-sm shadow-md'
                    : 'bg-slate-950 border border-slate-800 text-slate-100 rounded-bl-sm'
                }`}
              >
                {isUser && msg.viaVoice && (
                  <div className="text-[10px] font-bold text-indigo-200 flex items-center gap-1">
                    <Mic className="w-3 h-3" />
                    <span>Hỏi trực tiếp bằng giọng nói</span>
                  </div>
                )}

                <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                  {renderFormattedText(msg.text)}
                </div>

                {/* Native English Pronunciation Spotlight Card inside Assistant Reply */}
                {!isUser && msg.englishPhrase && (
                  <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/40 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="text-[10px] uppercase tracking-wider font-extrabold text-sky-300 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span>Phát Âm Tiếng Anh Chuẩn Bản Xứ</span>
                        </div>
                        <div className="text-sm sm:text-base font-black text-white">
                          {msg.englishPhrase}
                        </div>
                        {msg.phoneticIpa && (
                          <div className="text-xs font-mono text-amber-300">{msg.phoneticIpa}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSpeakEnglish(msg.englishPhrase!)}
                          className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-sm active:scale-95"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Giọng Chuẩn US/UK</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSpeakEnglish(msg.englishPhrase!, { slow: true })}
                          className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1"
                          title="Nghe phát âm chậm từng chữ"
                        >
                          <Turtle className="w-3.5 h-3.5" />
                          <span>Chậm</span>
                        </button>
                      </div>
                    </div>

                    {msg.englishExamples && msg.englishExamples.length > 0 && (
                      <div className="pt-2 border-t border-sky-500/20 space-y-2">
                        {msg.englishExamples.map((ex, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white">{ex.en}</div>
                              {ex.ipa && (
                                <div className="text-[11px] font-mono text-sky-300">{ex.ipa}</div>
                              )}
                              <div className="text-[11px] text-slate-400">{ex.vi}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onSpeakEnglish(ex.en)}
                              className="p-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 shrink-0"
                              title="Nghe câu ví dụ giọng bản xứ"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Read Vietnamese Explanation Button */}
                {!isUser && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onSpeakVi(msg.spokenVi || msg.text)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Nghe lời giảng ({viVoiceLabel})</span>
                    </button>
                  </div>
                )}

                {/* Suggested Follow-up Chips */}
                {!isUser && msg.followUps && msg.followUps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.followUps.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={isSending}
                        onClick={() => sendQuestion(sug, false)}
                        className="text-left px-3 py-1.5 rounded-xl bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-500/30 text-[11px] text-indigo-200 font-semibold transition-colors"
                      >
                        ✨ {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-indigo-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Gia sư đang suy nghĩ lời giải dễ hiểu nhất cho Lớp {grade}...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Voice + Text Input Bar */}
      <div className="p-3.5 sm:p-4 bg-slate-950 border-t border-slate-800 space-y-2.5">
        {/* Mic Status / Live Volume Feedback */}
        {(micStatusNote || isListening || isTranscribingMic) && (
          <div className="px-3.5 py-2 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-between gap-3 text-xs text-indigo-200">
            <div className="flex items-center gap-2">
              {isTranscribingMic ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300 shrink-0" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
              )}
              <span>{micStatusNote || 'Đang lắng nghe...'}</span>
            </div>
            {isListening && micVolumeLevel > 0 && (
              <div className="w-20 h-2 rounded-full bg-slate-800 overflow-hidden shrink-0">
                <div
                  className="h-full bg-emerald-400 transition-all duration-75"
                  style={{ width: `${micVolumeLevel}%` }}
                />
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendQuestion(inputText, false);
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        >
          {/* Direct Voice Speak Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setMicLang((l) => (l === 'vi-VN' ? 'en-US' : 'vi-VN'))}
              className="px-2.5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-extrabold text-slate-200 shrink-0"
              title="Đổi ngôn ngữ nói vào Micro (Tiếng Việt / Tiếng Anh)"
            >
              {micLang === 'vi-VN' ? '🇻🇳 Mic Việt' : '🇺🇸 Mic Anh'}
            </button>

            <button
              type="button"
              disabled={isTranscribingMic || isSending}
              onClick={handleToggleVoiceAsk}
              className={`px-4 py-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-95 ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
              title="Nhấn để nói trực tiếp câu hỏi bằng giọng nói"
            >
              {isListening ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Dừng &amp; Gửi</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Nói Để Hỏi</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-1 items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập câu hỏi bài tập, từ Tiếng Anh cần đọc chuẩn, hoặc nhấn Nói Để Hỏi..."
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-extrabold text-xs flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Hỏi Ngay</span>
            </button>
          </div>
        </form>

        {!compact && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Hỏi nhanh:
            </span>
            {STARTER_QUESTIONS.slice(0, 4).map((q, i) => (
              <button
                key={i}
                type="button"
                disabled={isSending}
                onClick={() => sendQuestion(q, false)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white truncate max-w-[260px] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
