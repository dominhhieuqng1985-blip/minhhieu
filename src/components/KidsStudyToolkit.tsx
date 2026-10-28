import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Volume2,
  Turtle,
  Calculator,
  Headphones,
  Clock,
  CheckCircle2,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Loader2,
  Award,
} from 'lucide-react';
import { SchoolTier } from '../data/kidsCurriculumData';
import { getApiBaseUrl } from '../utils/api';

export interface KidsStudyToolkitProps {
  activeTier: SchoolTier;
  onSpeakVi: (text: string) => void;
  onSpeakEnglish: (text: string, opts?: { slow?: boolean }) => void;
  viVoiceLabel: string;
  enVoiceLabel: string;
  onEarnReward: (xpDelta: number, starDelta: number) => void;
  soundFx: boolean;
  onPlayFeedbackTone: (kind: 'correct' | 'retry') => void;
}

interface SpeakingDrill {
  id: string;
  tier: SchoolTier;
  gradeLabel: string;
  topic: string;
  en: string;
  ipa: string;
  vi: string;
}

const SPEAKING_DRILLS: SpeakingDrill[] = [
  {
    id: 'sp-1',
    tier: 'tieu-hoc',
    gradeLabel: 'Lớp 1–3',
    topic: 'Chào hỏi & Giới thiệu',
    en: 'Good morning teacher! My name is Nam and I love learning English.',
    ipa: '/ɡʊd ˈmɔː.nɪŋ ˈtiː.tʃər! maɪ neɪm ɪz næm ænd aɪ lʌv ˈlɜː.nɪŋ ˈɪŋ.ɡlɪʃ/',
    vi: 'Chào cô buổi sáng ạ! Em tên là Nam và em rất thích học Tiếng Anh.',
  },
  {
    id: 'sp-2',
    tier: 'tieu-hoc',
    gradeLabel: 'Lớp 3–5',
    topic: 'Gia đình & Sở thích',
    en: 'On Sundays, I enjoy reading storybooks with my family in the garden.',
    ipa: '/ɒn ˈsʌn.deɪz, aɪ ɪnˈdʒɔɪ ˈriː.dɪŋ ˈstɔː.ri.bʊks wɪð maɪ ˈfæm.əl.i ɪn ðə ˈɡɑː.dən/',
    vi: 'Vào Chủ nhật, em thích đọc truyện tranh cùng gia đình trong khu vườn.',
  },
  {
    id: 'sp-3',
    tier: 'thcs',
    gradeLabel: 'Lớp 6–9',
    topic: 'Môi trường & Đời sống',
    en: 'Planting more trees and recycling plastic help protect our green planet.',
    ipa: '/ˈplɑːn.tɪŋ mɔːr triːz ænd ˌriːˈsaɪ.klɪŋ ˈplæs.tɪk help prəˈtekt aʊər ɡriːn ˈplæn.ɪt/',
    vi: 'Trồng thêm cây xanh và tái chế nhựa giúp bảo vệ hành tinh xanh của chúng ta.',
  },
  {
    id: 'sp-4',
    tier: 'thcs',
    gradeLabel: 'Lớp 7–9',
    topic: 'Phương pháp học tập',
    en: 'Practicing English pronunciation every day builds strong confidence.',
    ipa: '/ˈpræk.tɪ.sɪŋ ˈɪŋ.ɡlɪʃ prəˌnʌn.siˈeɪ.ʃən ˈev.ri deɪ bɪldz strɒŋ ˈkɒn.fɪ.dəns/',
    vi: 'Luyện phát âm Tiếng Anh mỗi ngày giúp xây dựng sự tự tin vững vàng.',
  },
  {
    id: 'sp-5',
    tier: 'thpt',
    gradeLabel: 'Lớp 10–12',
    topic: 'Khoa học & Tương lai (THPT/IELTS)',
    en: 'Critical thinking and lifelong curiosity empower students to solve complex challenges.',
    ipa: '/ˈkrɪt.ɪ.kəl ˈθɪŋ.kɪŋ ænd ˈlaɪf.lɒŋ ˌkjʊə.riˈɒs.ə.ti ɪmˈpaʊər ˈstjuː.dənts tuː sɒlv ˈkɒm.pleks ˈtʃæl.ɪn.dʒɪz/',
    vi: 'Tư duy phản biện và sự ham học hỏi suốt đời giúp học sinh giải quyết những thử thách phức tạp.',
  },
];

interface DictationItem {
  id: string;
  lang: 'vi' | 'en';
  tier: SchoolTier;
  title: string;
  text: string;
  hint: string;
}

const DICTATION_ITEMS: DictationItem[] = [
  {
    id: 'dic-vi-1',
    lang: 'vi',
    tier: 'tieu-hoc',
    title: 'Chính tả Tiểu học (s/x & ch/tr)',
    text: 'Mùa xuân sang, chim sẻ ríu rít trên cành cây xanh mát.',
    hint: 'Chú ý phân biệt "xuân / xanh" (x) với "sang / sẻ" (s), và "chim" (ch) với "trên" (tr).',
  },
  {
    id: 'dic-en-1',
    lang: 'en',
    tier: 'tieu-hoc',
    title: 'Listening Spelling (Elementary)',
    text: 'The clever rabbit eats a sweet carrot.',
    hint: '7 words: The ... rabbit eats a sweet carrot.',
  },
  {
    id: 'dic-vi-2',
    lang: 'vi',
    tier: 'thcs',
    title: 'Chính tả Ngữ văn THCS',
    text: 'Tri thức là chiếc chìa khóa mở ra cánh cửa tương lai tươi sáng.',
    hint: 'Chú ý viết hoa đầu câu và dấu chấm cuối câu, phân biệt "Tri thức" (tr) và "chìa khóa" (ch).',
  },
  {
    id: 'dic-en-2',
    lang: 'en',
    tier: 'thcs',
    title: 'English Listening Dictation (THCS)',
    text: 'Knowledge grows when we ask great questions every day.',
    hint: 'Starts with "Knowledge" (silent K) and ends with "every day."',
  },
  {
    id: 'dic-en-3',
    lang: 'en',
    tier: 'thpt',
    title: 'IELTS / THPT Academic Listening',
    text: 'Sustainable energy plays an essential role in modern society.',
    hint: 'Key spelling words: Sustainable, essential, society.',
  },
];

function cleanWords(sentence: string): string[] {
  return sentence
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u1EF9\s']/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export const KidsStudyToolkit: React.FC<KidsStudyToolkitProps> = ({
  activeTier,
  onSpeakVi,
  onSpeakEnglish,
  viVoiceLabel,
  enVoiceLabel,
  onEarnReward,
  soundFx,
  onPlayFeedbackTone,
}) => {
  const [toolTab, setToolTab] = useState<'speaking' | 'multiplication' | 'dictation' | 'pomodoro'>('speaking');

  // ==================== 1. ENGLISH SPEAKING COACH STATE ====================
  const tierDrills = SPEAKING_DRILLS.filter((d) => d.tier === activeTier);
  const [selectedDrillIdx, setSelectedDrillIdx] = useState<number>(0);
  const [customEnglishSentence, setCustomEnglishSentence] = useState<string>('');
  const [isRecordingPronun, setIsRecordingPronun] = useState<boolean>(false);
  const [isTranscribingPronun, setIsTranscribingPronun] = useState<boolean>(false);
  const [spokenResult, setSpokenResult] = useState<string>('');
  const [pronunError, setPronunError] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setSelectedDrillIdx(0);
    setSpokenResult('');
    setPronunError('');
  }, [activeTier]);

  const currentDrill = tierDrills[selectedDrillIdx % Math.max(1, tierDrills.length)] || SPEAKING_DRILLS[0];
  const targetEnglishText = customEnglishSentence.trim() || currentDrill.en;

  const stopPronunciationCapture = useCallback(() => {
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
    setIsRecordingPronun(false);
  }, []);

  useEffect(() => {
    return () => {
      stopPronunciationCapture();
    };
  }, [stopPronunciationCapture]);

  const evaluatePronunciation = useCallback(
    (transcript: string) => {
      const cleaned = transcript.trim();
      setSpokenResult(cleaned);
      const targetTokens = cleanWords(targetEnglishText);
      const spokenTokens = cleanWords(cleaned);
      if (targetTokens.length === 0) return;

      let matched = 0;
      targetTokens.forEach((tw) => {
        if (spokenTokens.includes(tw)) matched += 1;
      });
      const ratio = Math.round((matched / targetTokens.length) * 100);
      if (ratio >= 75) {
        onEarnReward(15, ratio >= 90 ? 1 : 0);
        if (soundFx) onPlayFeedbackTone('correct');
      } else if (soundFx) {
        onPlayFeedbackTone('retry');
      }
    },
    [targetEnglishText, onEarnReward, soundFx, onPlayFeedbackTone]
  );

  const startServerRecorderFallback = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordedChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        if (blob.size < 200) {
          setIsRecordingPronun(false);
          return;
        }
        setIsTranscribingPronun(true);
        try {
          const base64Audio = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const resStr = String(reader.result || '');
              const idx = resStr.indexOf(',');
              resolve(idx >= 0 ? resStr.slice(idx + 1) : resStr);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
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
              mimeType: blob.type || 'audio/webm',
              language: 'en-US',
            }),
          });
          const data = await resp.json();
          if (resp.ok && data?.transcript) {
            evaluatePronunciation(String(data.transcript));
          } else {
            setPronunError(data?.error || 'Chưa nghe rõ câu Tiếng Anh, em hãy nhấn Mic và đọc to hơn nhé!');
          }
        } catch {
          setPronunError('Không thể phân tích âm thanh lúc này. Em hãy thử lại nhé!');
        } finally {
          setIsTranscribingPronun(false);
          setIsRecordingPronun(false);
        }
      };

      mr.start();
      setIsRecordingPronun(true);
    } catch {
      setPronunError('Trình duyệt chưa cấp quyền Micro. Em hãy cho phép quyền Micro trên thanh địa chỉ nhé!');
      setIsRecordingPronun(false);
    }
  };

  const handleTogglePronunMic = async () => {
    if (isRecordingPronun) {
      stopPronunciationCapture();
      return;
    }

    setPronunError('');
    setSpokenResult('');

    const SpeechRec =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        recognitionRef.current = rec;
        rec.lang = 'en-US';
        rec.interimResults = true;
        rec.continuous = false;
        let finalStr = '';
        let switchedToFallback = false;

        rec.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) finalStr += t + ' ';
            else interim += t;
          }
          setSpokenResult((finalStr + interim).trim());
        };

        rec.onerror = (ev: any) => {
          const code = String(ev?.error || '');
          if (code === 'network' || code === 'service-not-allowed' || code === 'not-allowed') {
            switchedToFallback = true;
            recognitionRef.current = null;
            startServerRecorderFallback();
          } else {
            setIsRecordingPronun(false);
          }
        };

        rec.onend = () => {
          if (switchedToFallback) return;
          setIsRecordingPronun(false);
          if (finalStr.trim()) {
            evaluatePronunciation(finalStr);
          }
        };

        rec.start();
        setIsRecordingPronun(true);
        return;
      } catch {
        // Fall through to MediaRecorder + server transcribe
      }
    }

    await startServerRecorderFallback();
  };

  const targetWordsDisplay = targetEnglishText.split(/\s+/).filter(Boolean);
  const spokenTokenSet = new Set(cleanWords(spokenResult));
  const pronunAccuracy = (() => {
    if (!spokenResult.trim()) return null;
    const tClean = cleanWords(targetEnglishText);
    if (tClean.length === 0) return 0;
    const hits = tClean.filter((w) => spokenTokenSet.has(w)).length;
    return Math.round((hits / tClean.length) * 100);
  })();

  // ==================== 2. MULTIPLICATION & SPEED SPRINT ====================
  const [multTable, setMultTable] = useState<number>(7);
  const [multOp, setMultOp] = useState<'mul' | 'div'>('mul');
  const [sprintRunning, setSprintRunning] = useState<boolean>(false);
  const [sprintSeconds, setSprintSeconds] = useState<number>(60);
  const [sprintScore, setSprintScore] = useState<number>(0);
  const [sprintTask, setSprintTask] = useState<{ a: number; b: number; ans: number; input: string }>({
    a: 6,
    b: 7,
    ans: 42,
    input: '',
  });

  useEffect(() => {
    if (!sprintRunning) return;
    if (sprintSeconds <= 0) {
      setSprintRunning(false);
      if (sprintScore > 0) {
        onEarnReward(sprintScore * 4, sprintScore >= 5 ? 1 : 0);
        if (soundFx) onPlayFeedbackTone('correct');
      }
      return;
    }
    const id = setTimeout(() => setSprintSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [sprintRunning, sprintSeconds, sprintScore, onEarnReward, soundFx, onPlayFeedbackTone]);

  const spawnNextSprintTask = () => {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 2;
    setSprintTask({ a, b, ans: a * b, input: '' });
  };

  const handleSprintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sprintRunning) return;
    if (Number(sprintTask.input.trim()) === sprintTask.ans) {
      setSprintScore((s) => s + 1);
      if (soundFx) onPlayFeedbackTone('correct');
      spawnNextSprintTask();
    } else {
      if (soundFx) onPlayFeedbackTone('retry');
      setSprintTask((prev) => ({ ...prev, input: '' }));
    }
  };

  // ==================== 3. DICTATION STATE ====================
  const [dictIndex, setDictIndex] = useState<number>(0);
  const [dictInput, setDictInput] = useState<string>('');
  const [dictChecked, setDictChecked] = useState<boolean>(false);
  const activeDictation = DICTATION_ITEMS[dictIndex % DICTATION_ITEMS.length];

  const dictAccuracy = (() => {
    if (!dictChecked) return 0;
    const expected = cleanWords(activeDictation.text);
    const actual = cleanWords(dictInput);
    if (expected.length === 0) return 0;
    let ok = 0;
    expected.forEach((w, idx) => {
      if (actual[idx] === w) ok += 1;
    });
    return Math.round((ok / expected.length) * 100);
  })();

  // ==================== 4. STUDY POMODORO TIMER ====================
  const [pomoMinutes, setPomoMinutes] = useState<number>(15);
  const [pomoRemaining, setPomoRemaining] = useState<number>(15 * 60);
  const [pomoRunning, setPomoRunning] = useState<boolean>(false);

  useEffect(() => {
    if (!pomoRunning) return;
    if (pomoRemaining <= 0) {
      setPomoRunning(false);
      onEarnReward(25, 1);
      if (soundFx) onPlayFeedbackTone('correct');
      onSpeakVi('Chúc mừng em đã hoàn thành phiên học tập trung tuyệt vời! Hãy nghỉ giải lao uống nước nhé!');
      return;
    }
    const id = setTimeout(() => setPomoRemaining((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [pomoRunning, pomoRemaining, onEarnReward, soundFx, onPlayFeedbackTone, onSpeakVi]);

  const formatClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-5">
      {/* Toolkit Switcher */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-3.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setToolTab('speaking')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            toolTab === 'speaking'
              ? 'bg-sky-500 text-slate-950 shadow-md'
              : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>Luyện Nói Tiếng Anh Bản Xứ</span>
        </button>

        <button
          type="button"
          onClick={() => setToolTab('multiplication')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            toolTab === 'multiplication'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Bảng Cửu Chương Đọc To &amp; Đua 60s</span>
        </button>

        <button
          type="button"
          onClick={() => setToolTab('dictation')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            toolTab === 'dictation'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span>Nghe – Viết Chính Tả (Việt &amp; Anh)</span>
        </button>

        <button
          type="button"
          onClick={() => setToolTab('pomodoro')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            toolTab === 'pomodoro'
              ? 'bg-indigo-500 text-white shadow-md'
              : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Đồng Hồ Tập Trung Học Bài</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* TOOL 1: NATIVE ENGLISH PRONUNCIATION & SPEAKING LAB                 */}
      {/* =================================================================== */}
      {toolTab === 'speaking' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 rounded-3xl bg-slate-900 border border-sky-500/40 p-6 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  🇺🇸🇬🇧 Phòng Luyện Phát Âm Tiếng Anh Chuẩn Bản Xứ
                </h3>
                <p className="text-xs text-slate-400">
                  Nghe mẫu bằng giọng <strong className="text-sky-300">{enVoiceLabel}</strong>, chạm vào từng từ để nghe lẻ, sau đó nhấn Mic nói trực tiếp để chấm điểm!
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-bold">
                {customEnglishSentence.trim() ? 'Câu tự nhập' : `${currentDrill.gradeLabel} • ${currentDrill.topic}`}
              </span>
            </div>

            {/* Interactive Word-by-Word Sentence Display */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {targetWordsDisplay.map((word, i) => {
                  const cleanW = word.toLowerCase().replace(/[^a-z0-9']/gi, '');
                  const hasAttempt = spokenResult.trim().length > 0;
                  const isHit = hasAttempt && spokenTokenSet.has(cleanW);
                  return (
                    <button
                      key={`${word}-${i}`}
                      type="button"
                      onClick={() => onSpeakEnglish(cleanW || word)}
                      className={`px-3 py-1.5 rounded-xl text-base sm:text-lg font-extrabold border transition-all active:scale-95 ${
                        !hasAttempt
                          ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-white'
                          : isHit
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                          : 'bg-amber-950/60 border-amber-500/60 text-amber-200'
                      }`}
                      title="Chạm để nghe phát âm chuẩn của riêng từ này"
                    >
                      {word}
                    </button>
                  );
                })}
              </div>

              {!customEnglishSentence.trim() && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <div className="text-xs font-mono text-sky-300">{currentDrill.ipa}</div>
                  <div className="text-xs text-slate-300">🇻🇳 Nghĩa: {currentDrill.vi}</div>
                </div>
              )}
            </div>

            {/* Audio Listen + Direct Mic Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onSpeakEnglish(targetEnglishText)}
                className="px-4 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Volume2 className="w-4 h-4" />
                <span>Nghe Giọng Chuẩn Bản Xứ (1.0x)</span>
              </button>

              <button
                type="button"
                onClick={() => onSpeakEnglish(targetEnglishText, { slow: true })}
                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs flex items-center gap-2 transition-all active:scale-95"
              >
                <Turtle className="w-4 h-4" />
                <span>Nghe Chậm Rõ Từng Từ (0.8x)</span>
              </button>

              <button
                type="button"
                disabled={isTranscribingPronun}
                onClick={handleTogglePronunMic}
                className={`px-5 py-3 rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 ${
                  isRecordingPronun
                    ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                }`}
              >
                {isTranscribingPronun ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang chấm phát âm...</span>
                  </>
                ) : isRecordingPronun ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Đang nghe... Nhấn để dừng</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Nhấn Để Đọc Theo (Chấm Điểm)</span>
                  </>
                )}
              </button>
            </div>

            {pronunError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200">
                ⚠️ {pronunError}
              </div>
            )}

            {spokenResult && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-slate-300">
                    🎙️ Hệ thống nghe em đọc: <strong className="text-white">“{spokenResult}”</strong>
                  </span>
                  {pronunAccuracy !== null && (
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black tabular-nums ${
                        pronunAccuracy >= 80
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      Độ chuẩn xác: {pronunAccuracy}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Các từ tô <span className="text-emerald-300 font-bold">màu xanh</span> là em đã phát âm chuẩn! Chạm vào bất kỳ từ <span className="text-amber-300 font-bold">màu vàng</span> nào để nghe lại phát âm bản xứ nhé.
                </p>
              </div>
            )}
          </div>

          {/* Right Panel: Drill Picker & Custom English Phrase */}
          <div className="lg:col-span-4 rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
            <div className="space-y-2">
              <label htmlFor="custom-en-practice" className="text-xs font-bold text-white block">
                ✍️ Hoặc tự nhập từ / câu Tiếng Anh em muốn nghe &amp; luyện nói:
              </label>
              <input
                id="custom-en-practice"
                type="text"
                value={customEnglishSentence}
                onChange={(e) => {
                  setCustomEnglishSentence(e.target.value);
                  setSpokenResult('');
                }}
                placeholder="Nhập bất kỳ câu Tiếng Anh nào..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
              />
              {customEnglishSentence && (
                <button
                  type="button"
                  onClick={() => setCustomEnglishSentence('')}
                  className="text-[11px] text-sky-400 hover:underline font-semibold"
                >
                  ← Quay lại danh sách câu mẫu theo lớp
                </button>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-xs font-bold text-slate-300">Danh sách câu mẫu gợi ý:</div>
              {SPEAKING_DRILLS.map((d, idx) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setCustomEnglishSentence('');
                    const tierMatchIdx = tierDrills.findIndex((item) => item.id === d.id);
                    if (tierMatchIdx >= 0) setSelectedDrillIdx(tierMatchIdx);
                    else {
                      setCustomEnglishSentence(d.en);
                    }
                    setSpokenResult('');
                  }}
                  className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs space-y-1 transition-colors"
                >
                  <div className="flex items-center justify-between text-[10px] text-sky-300 font-bold">
                    <span>{d.topic}</span>
                    <span>{d.gradeLabel}</span>
                  </div>
                  <div className="text-slate-200 font-semibold line-clamp-1">{d.en}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TOOL 2: MULTIPLICATION AUDIO BOARD & 60S MENTAL SPRINT              */}
      {/* =================================================================== */}
      {toolTab === 'multiplication' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Interactive Audio Table 2..9 */}
          <div className="lg:col-span-7 rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMultOp('mul')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold ${
                    multOp === 'mul'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-950 text-slate-300 border border-slate-800'
                  }`}
                >
                  Bảng Nhân
                </button>
                <button
                  type="button"
                  onClick={() => setMultOp('div')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold ${
                    multOp === 'div'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-950 text-slate-300 border border-slate-800'
                  }`}
                >
                  Bảng Chia
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const lines = Array.from({ length: 10 }, (_, idx) => {
                    const i = idx + 1;
                    return multOp === 'mul'
                      ? `${multTable} nhân ${i} bằng ${multTable * i}`
                      : `${multTable * i} chia ${multTable} bằng ${i}`;
                  }).join('. ');
                  onSpeakVi(`Bảng ${multOp === 'mul' ? 'nhân' : 'chia'} ${multTable}. ${lines}.`);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1.5"
              >
                <Volume2 className="w-4 h-4 text-amber-300" />
                <span>Đọc cả bảng ({viVoiceLabel})</span>
              </button>
            </div>

            {/* Number selector 2..9 */}
            <div className="grid grid-cols-8 gap-2">
              {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMultTable(n)}
                  className={`py-2.5 rounded-xl text-sm font-black tabular-nums border transition-all ${
                    multTable === n
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* 10 Rows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 tabular-nums">
              {Array.from({ length: 10 }, (_, idx) => {
                const i = idx + 1;
                const display =
                  multOp === 'mul'
                    ? `${multTable} × ${i} = ${multTable * i}`
                    : `${multTable * i} : ${multTable} = ${i}`;
                const spoken =
                  multOp === 'mul'
                    ? `${multTable} nhân ${i} bằng ${multTable * i}`
                    : `${multTable * i} chia ${multTable} bằng ${i}`;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSpeakVi(spoken)}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-sm font-bold text-white transition-colors"
                  >
                    <span className="font-mono">{display}</span>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right 60-Second Speed Race */}
          <div className="lg:col-span-5 rounded-3xl bg-slate-900 border border-emerald-500/40 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span>Đua Toán Siêu Tốc 60 Giây</span>
              </h3>
              <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs font-black text-amber-300 tabular-nums">
                ⏱ {sprintSeconds}s
              </span>
            </div>

            {!sprintRunning ? (
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Thử tài phản xạ bảng cửu chương trong 60 giây! Mỗi câu đúng giúp em rèn trí nhớ siêu tốc và nhận điểm thưởng XP.
                </p>
                {sprintSeconds === 0 && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-sm font-extrabold text-emerald-300">
                    🏆 Hoàn thành! Em giải đúng {sprintScore} phép tính trong 60 giây!
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSprintSeconds(60);
                    setSprintScore(0);
                    spawnNextSprintTask();
                    setSprintRunning(true);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Bắt Đầu Đua 60 Giây Ngay!</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSprintSubmit} className="space-y-4">
                <div className="p-6 rounded-2xl bg-slate-950 border border-emerald-500/40 text-center space-y-2 tabular-nums">
                  <div className="text-xs text-emerald-400 font-bold">
                    Đã giải đúng: {sprintScore} câu
                  </div>
                  <div className="text-4xl font-black text-white font-mono">
                    {sprintTask.a} × {sprintTask.b} = ?
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    autoFocus
                    value={sprintTask.input}
                    onChange={(e) =>
                      setSprintTask((prev) => ({ ...prev, input: e.target.value }))
                    }
                    placeholder="Nhập đáp số..."
                    className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white font-mono text-base focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="submit"
                    className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs"
                  >
                    Chốt!
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TOOL 3: DICTATION (CHÍNH TẢ TIẾNG VIỆT & LISTENING SPELLING ANH)    */}
      {/* =================================================================== */}
      {toolTab === 'dictation' && (
        <div className="max-w-3xl mx-auto rounded-3xl bg-slate-900 border border-amber-500/40 p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                🎧 Luyện Nghe – Viết Chính Tả Chuẩn (Việt &amp; Anh)
              </h3>
              <p className="text-xs text-slate-400">{activeDictation.title}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDictIndex((i) => i + 1);
                setDictInput('');
                setDictChecked(false);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Đổi bài nghe khác</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                activeDictation.lang === 'en'
                  ? onSpeakEnglish(activeDictation.text)
                  : onSpeakVi(activeDictation.text)
              }
              className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-md"
            >
              <Volume2 className="w-4 h-4" />
              <span>
                {activeDictation.lang === 'en'
                  ? `Nghe Câu Tiếng Anh (${enVoiceLabel})`
                  : `Nghe Đọc Chính Tả (${viVoiceLabel})`}
              </span>
            </button>

            {activeDictation.lang === 'en' && (
              <button
                type="button"
                onClick={() => onSpeakEnglish(activeDictation.text, { slow: true })}
                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold flex items-center gap-1.5"
              >
                <Turtle className="w-4 h-4" />
                <span>Nghe Chậm (0.8x)</span>
              </button>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
            💡 Gợi ý: {activeDictation.hint}
          </div>

          <textarea
            rows={3}
            value={dictInput}
            onChange={(e) => {
              setDictInput(e.target.value);
              if (dictChecked) setDictChecked(false);
            }}
            placeholder="Nghe kỹ và gõ lại đúng câu vừa nghe vào đây..."
            className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
          />

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={!dictInput.trim()}
              onClick={() => {
                setDictChecked(true);
                const expected = cleanWords(activeDictation.text);
                const actual = cleanWords(dictInput);
                const ok = expected.filter((w, i) => actual[i] === w).length;
                if (expected.length > 0 && ok / expected.length >= 0.8) {
                  onEarnReward(15, 1);
                  if (soundFx) onPlayFeedbackTone('correct');
                } else if (soundFx) {
                  onPlayFeedbackTone('retry');
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Chấm Chính Tả</span>
            </button>

            {dictChecked && (
              <span className="text-xs font-black text-amber-300 tabular-nums">
                Độ chính xác: {dictAccuracy}%
              </span>
            )}
          </div>

          {dictChecked && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-1.5 text-xs">
              <div className="font-bold text-emerald-300">Đáp án chuẩn:</div>
              <div className="text-sm font-semibold text-white">{activeDictation.text}</div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TOOL 4: FOCUS POMODORO STUDY CLOCK                                  */}
      {/* =================================================================== */}
      {toolTab === 'pomodoro' && (
        <div className="max-w-xl mx-auto rounded-3xl bg-slate-900 border border-indigo-500/40 p-6 sm:p-8 shadow-xl text-center space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-white">⏰ Đồng Hồ Tập Trung Học Tập</h3>
            <p className="text-xs text-slate-400">
              Rèn thói quen tự giác học tập không xao nhãng — hoàn thành phiên học nhận ngay <strong>+25 XP &amp; +1 Sao</strong>!
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            {[10, 15, 25].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setPomoRunning(false);
                  setPomoMinutes(m);
                  setPomoRemaining(m * 60);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold tabular-nums ${
                  pomoMinutes === m
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                {m} phút
              </button>
            ))}
          </div>

          <div className="py-6 rounded-3xl bg-slate-950 border border-slate-800 text-5xl sm:text-6xl font-black text-amber-300 font-mono tabular-nums">
            {formatClock(pomoRemaining)}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setPomoRunning((r) => !r)}
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-2"
            >
              {pomoRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{pomoRunning ? 'Tạm dừng' : 'Bắt đầu tập trung'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPomoRunning(false);
                setPomoRemaining(pomoMinutes * 60);
              }}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Đặt lại</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
