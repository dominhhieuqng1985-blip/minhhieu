import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  GraduationCap,
  BookOpen,
  Calculator,
  Globe,
  Atom,
  Compass,
  Volume2,
  VolumeX,
  Square,
  Sparkles,
  Trophy,
  Star,
  Flame,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  Loader2,
  Sliders,
  Layers,
  Brain,
  Mic,
  RefreshCw,
  Check,
  Wand2,
  MessageCircle,
  ShieldCheck,
  Headphones,
  Type as TypeIcon,
  Turtle,
} from 'lucide-react';
import {
  SCHOOL_TIERS,
  SUBJECTS_META,
  CURRICULUM_QUESTIONS,
  CURRICULUM_FLASHCARDS,
  SchoolTier,
  SubjectId,
  LearningQuestion,
} from '../data/kidsCurriculumData';
import { KidsVisualSandbox } from './KidsVisualSandbox';
import { KidsAlphabetModule } from './KidsAlphabetModule';
import { KidsStudyToolkit } from './KidsStudyToolkit';
import { KidsVoiceTutorChat } from './KidsVoiceTutorChat';
import {
  EverAiVoice,
  getAllEverAiVoices,
  createEverAiTtsJob,
  pollEverAiTtsJob,
  getStoredEverAiKey,
} from '../utils/everai';
import { getApiBaseUrl } from '../utils/api';

interface KidsLearningStudioProps {
  onShowToast: (msg: string) => void;
}

type StudioMode =
  | 'quiz'
  | 'alphabet'
  | 'chat-tutor'
  | 'toolkit'
  | 'sandbox'
  | 'flashcards'
  | 'ai-tutor';

type NativeEnglishVoiceId = 'Kore' | 'Puck' | 'Zephyr';

const NATIVE_ENGLISH_VOICES: {
  id: NativeEnglishVoiceId;
  label: string;
  everAiFallbackId: string;
  langCode: 'en-US' | 'en-GB';
}[] = [
  {
    id: 'Kore',
    label: 'Cô Kore (Chuẩn Mỹ US)',
    everAiFallbackId: 'en_female_emily_us',
    langCode: 'en-US',
  },
  {
    id: 'Puck',
    label: 'Thầy Puck (Chuẩn Mỹ US)',
    everAiFallbackId: 'en_male_echo_default',
    langCode: 'en-US',
  },
  {
    id: 'Zephyr',
    label: 'Cô Zephyr (Chuẩn Anh UK)',
    everAiFallbackId: 'en_female_elara_br',
    langCode: 'en-GB',
  },
];

interface StoredKidsProgress {
  xp: number;
  stars: number;
  bestStreak: number;
  solvedIds: string[];
  masteredCardIds: string[];
  preferredVoiceId?: string;
  preferredEnVoiceId?: NativeEnglishVoiceId;
  speedRate?: number;
  autoRead?: boolean;
  soundFx?: boolean;
}

const STORAGE_KEY_KIDS_PROGRESS = 'minhhieu_kids_learning_progress_v1';
const DEFAULT_LE_HOANG_NAM_VOICE_ID = 'vi_male_lehoang_mb';

function loadStoredProgress(): StoredKidsProgress {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_KIDS_PROGRESS);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          xp: Number(parsed.xp) || 0,
          stars: Number(parsed.stars) || 0,
          bestStreak: Number(parsed.bestStreak) || 0,
          solvedIds: Array.isArray(parsed.solvedIds) ? parsed.solvedIds : [],
          masteredCardIds: Array.isArray(parsed.masteredCardIds) ? parsed.masteredCardIds : [],
          preferredVoiceId: typeof parsed.preferredVoiceId === 'string' ? parsed.preferredVoiceId : undefined,
          preferredEnVoiceId:
            parsed.preferredEnVoiceId === 'Kore' ||
            parsed.preferredEnVoiceId === 'Puck' ||
            parsed.preferredEnVoiceId === 'Zephyr'
              ? parsed.preferredEnVoiceId
              : 'Kore',
          speedRate: typeof parsed.speedRate === 'number' ? parsed.speedRate : 1.0,
          autoRead: typeof parsed.autoRead === 'boolean' ? parsed.autoRead : false,
          soundFx: typeof parsed.soundFx === 'boolean' ? parsed.soundFx : true,
        };
      }
    }
  } catch {}
  return {
    xp: 0,
    stars: 0,
    bestStreak: 0,
    solvedIds: [],
    masteredCardIds: [],
    speedRate: 1.0,
    autoRead: false,
    soundFx: true,
  };
}

/** Gentle Web Audio chime for instant celebration or hint without external assets */
function playFeedbackTone(kind: 'correct' | 'retry') {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (kind === 'correct') {
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5 - E5 - G5 - C6
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.07);
        gain.gain.setValueAtTime(0.001, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.25);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.linearRampToValueAtTime(277, now + 0.18);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.23);
    }
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {}
}

/** Deterministic shuffle based on question id + seed so word tokens don't jump on re-render */
function shuffleTokens(tokens: string[], seedStr: string): { id: string; text: string }[] {
  const indexed = tokens.map((t, idx) => ({ id: `${seedStr}-${idx}`, text: t }));
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) | 0;
  }
  const copy = [...indexed];
  for (let i = copy.length - 1; i > 0; i--) {
    hash = (hash * 1664525 + 1013904223) | 0;
    const j = Math.abs(hash) % (i + 1);
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  // Ensure shuffled order differs from original when length > 1
  if (copy.length > 1 && copy.every((item, idx) => item.text === tokens[idx])) {
    const first = copy[0];
    copy[0] = copy[1];
    copy[1] = first;
  }
  return copy;
}

/** Generate an instant endless mental-math question tailored to the chosen school tier */
function createDynamicMathQuestion(tier: SchoolTier): LearningQuestion {
  const stamp = Date.now();
  if (tier === 'tieu-hoc') {
    const mode = Math.floor(Math.random() * 3);
    if (mode === 0) {
      const a = Math.floor(Math.random() * 35) + 12;
      const b = Math.floor(Math.random() * 28) + 9;
      const ans = a + b;
      const wrongs = [ans + 2, ans - 3, ans + 10];
      const options = [String(ans), ...wrongs.map(String)].sort(() => Math.random() - 0.5);
      return {
        id: `dyn-math-${stamp}`,
        tier: 'tieu-hoc',
        grade: 2,
        subject: 'toan',
        topic: 'Tính nhẩm siêu tốc Tiểu học',
        type: 'multiple-choice',
        prompt: `Tính nhẩm nhanh kết quả phép cộng: ${a} + ${b} = ?`,
        visualFormulaOrHint: `${a} + ${b} = ?`,
        spokenPrompt: `Đố bé tính nhẩm nhanh: ${a} cộng ${b} bằng bao nhiêu?`,
        options,
        correctIndex: options.indexOf(String(ans)),
        hint: `Cộng hàng đơn vị (${a % 10} + ${b % 10}) trước, sau đó cộng hàng chục nhé!`,
        explanation: `Kết quả chính xác là: ${a} + ${b} = ${ans}.`,
        points: 15,
      };
    } else if (mode === 1) {
      const a = Math.floor(Math.random() * 8) + 2;
      const b = Math.floor(Math.random() * 8) + 3;
      const ans = a * b;
      return {
        id: `dyn-math-${stamp}`,
        tier: 'tieu-hoc',
        grade: 3,
        subject: 'toan',
        topic: 'Bảng cửu chương vui nhộn',
        type: 'fill-blank',
        prompt: `Mỗi hộp có ${a} chiếc bút màu. Hỏi ${b} hộp như thế có tất cả bao nhiêu chiếc bút màu?`,
        visualFormulaOrHint: `${a} × ${b} = ?`,
        spokenPrompt: `Mỗi hộp có ${a} chiếc bút màu. Hỏi ${b} hộp như thế có tất cả bao nhiêu chiếc bút màu?`,
        acceptedAnswers: [String(ans), `${ans} chiếc`],
        hint: `Áp dụng bảng nhân ${a}: lấy ${a} nhân ${b}.`,
        explanation: `Số bút màu trong ${b} hộp là: ${a} × ${b} = ${ans} (chiếc).`,
        points: 15,
      };
    } else {
      const w = Math.floor(Math.random() * 6) + 4;
      const l = w + Math.floor(Math.random() * 6) + 2;
      const area = l * w;
      const options = [`${area} cm²`, `${(l + w) * 2} cm²`, `${l + w} cm²`, `${area + w} cm²`].sort(
        () => Math.random() - 0.5
      );
      return {
        id: `dyn-math-${stamp}`,
        tier: 'tieu-hoc',
        grade: 4,
        subject: 'toan',
        topic: 'Diện tích hình chữ nhật',
        type: 'multiple-choice',
        prompt: `Một tấm thiệp hình chữ nhật có chiều dài ${l} cm và chiều rộng ${w} cm. Diện tích tấm thiệp là:`,
        visualFormulaOrHint: 'S = Chiều dài × Chiều rộng',
        spokenPrompt: `Một tấm thiệp hình chữ nhật có chiều dài ${l} xen ti mét và chiều rộng ${w} xen ti mét. Diện tích tấm thiệp bằng bao nhiêu?`,
        options,
        correctIndex: options.indexOf(`${area} cm²`),
        hint: `Lấy chiều dài (${l}) nhân với chiều rộng (${w}).`,
        explanation: `Diện tích hình chữ nhật là: ${l} × ${w} = ${area} cm².`,
        points: 15,
      };
    }
  } else if (tier === 'thcs') {
    const xVal = Math.floor(Math.random() * 9) + 2;
    const a = Math.floor(Math.random() * 5) + 2;
    const b = Math.floor(Math.random() * 12) + 3;
    const c = a * xVal + b;
    return {
      id: `dyn-math-${stamp}`,
      tier: 'thcs',
      grade: 7,
      subject: 'toan',
      topic: 'Giải phương trình bậc nhất nhanh',
      type: 'fill-blank',
      prompt: `Tìm giá trị của x thỏa mãn phương trình: ${a}x + ${b} = ${c}`,
      visualFormulaOrHint: `${a}x = ${c} - ${b}`,
      spokenPrompt: `Tìm x biết: ${a} nhân x cộng ${b} bằng ${c}.`,
      acceptedAnswers: [String(xVal), `x=${xVal}`, `x = ${xVal}`],
      hint: `Chuyển vế đổi dấu: ${a}x = ${c} - ${b} = ${c - b}, rồi chia hai vế cho ${a}.`,
      explanation: `Ta có ${a}x = ${c} - ${b} = ${c - b} ⇒ x = ${c - b} : ${a} = ${xVal}.`,
      points: 20,
    };
  } else {
    const k = Math.floor(Math.random() * 4) + 2;
    const x0 = Math.floor(Math.random() * 3) + 1;
    const derivAtX0 = 2 * k * x0;
    const options = [
      String(derivAtX0),
      String(k * x0 * x0),
      String(derivAtX0 + k),
      String(2 * x0),
    ];
    const uniqueOpts = Array.from(new Set(options));
    while (uniqueOpts.length < 4) {
      uniqueOpts.push(String(derivAtX0 + uniqueOpts.length * 3));
    }
    const shuffled = uniqueOpts.sort(() => Math.random() - 0.5);
    return {
      id: `dyn-math-${stamp}`,
      tier: 'thpt',
      grade: 11,
      subject: 'toan',
      topic: 'Tính nhanh Đạo hàm tại một điểm',
      type: 'multiple-choice',
      prompt: `Cho hàm số f(x) = ${k}x² + 5. Giá trị đạo hàm f'(${x0}) bằng:`,
      visualFormulaOrHint: `f'(x) = (${k}x² + 5)' = ${2 * k}x`,
      spokenPrompt: `Cho hàm số f x bằng ${k} nhân x bình phương cộng 5. Đạo hàm f phẩy tại x bằng ${x0} có giá trị bao nhiêu?`,
      options: shuffled,
      correctIndex: shuffled.indexOf(String(derivAtX0)),
      hint: `Đạo hàm của ${k}x² là ${2 * k}x, đạo hàm hằng số 5 bằng 0. Thay x = ${x0}.`,
      explanation: `Ta có f'(x) = ${2 * k}x. Tại x = ${x0}, f'(${x0}) = ${2 * k} × ${x0} = ${derivAtX0}.`,
      points: 25,
    };
  }
}

export const KidsLearningStudio: React.FC<KidsLearningStudioProps> = ({ onShowToast }) => {
  const initialProgress = useMemo(() => loadStoredProgress(), []);

  // Load full Studio Giọng Nói voice catalog & default to Lê Hoàng Nam (vi_male_lehoang_mb)
  const studioVoices = useMemo<EverAiVoice[]>(() => getAllEverAiVoices(), []);

  const defaultLeHoangNamVoiceId = useMemo(() => {
    const customMatch = studioVoices.find((v) =>
      v.name.toLowerCase().includes('lê hoàng nam')
    );
    if (customMatch) return customMatch.id;
    const stdMatch = studioVoices.find((v) => v.id === DEFAULT_LE_HOANG_NAM_VOICE_ID);
    if (stdMatch) return stdMatch.id;
    return studioVoices[0]?.id || DEFAULT_LE_HOANG_NAM_VOICE_ID;
  }, [studioVoices]);

  // Persistent Learner State
  const [xp, setXp] = useState<number>(initialProgress.xp);
  const [stars, setStars] = useState<number>(initialProgress.stars);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(initialProgress.bestStreak);
  const [solvedIds, setSolvedIds] = useState<string[]>(initialProgress.solvedIds);
  const [masteredCardIds, setMasteredCardIds] = useState<string[]>(initialProgress.masteredCardIds);

  // Voice Settings (Default Vietnamese: Lê Hoàng Nam; Default English: Native US Kore)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(
    initialProgress.preferredVoiceId || defaultLeHoangNamVoiceId
  );
  const [selectedEnVoiceId, setSelectedEnVoiceId] = useState<NativeEnglishVoiceId>(
    initialProgress.preferredEnVoiceId || 'Kore'
  );
  const [speedRate, setSpeedRate] = useState<number>(initialProgress.speedRate ?? 1.0);
  const [autoRead, setAutoRead] = useState<boolean>(initialProgress.autoRead ?? false);
  const [soundFx, setSoundFx] = useState<boolean>(initialProgress.soundFx ?? true);
  const [showVoiceDrawer, setShowVoiceDrawer] = useState<boolean>(false);
  const [showFloatingChat, setShowFloatingChat] = useState<boolean>(false);

  // Speech Engine Runtime State
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingStatus, setSpeakingStatus] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRunIdRef = useRef<number>(0);
  const audioUrlCacheRef = useRef<Map<string, string>>(new Map());

  // Navigation State inside KidsLearningStudio
  const [activeTier, setActiveTier] = useState<SchoolTier>('tieu-hoc');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [activeSubject, setActiveSubject] = useState<SubjectId | 'all'>('all');
  const [studioMode, setStudioMode] = useState<StudioMode>('quiz');

  // Quiz State
  const [customDeck, setCustomDeck] = useState<LearningQuestion[] | null>(null);
  const [customLessonSummary, setCustomLessonSummary] = useState<{
    title: string;
    grade: number;
    summary: string;
    keyPoints: string[];
  } | null>(null);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [fillInput, setFillInput] = useState<string>('');
  const [answerStatus, setAnswerStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [showHint, setShowHint] = useState<boolean>(false);

  // Flashcards State
  const [flashcardIndex, setFlashcardIndex] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);

  // AI Custom Topic Tutor State
  const [tutorGrade, setTutorGrade] = useState<number>(3);
  const [tutorSubject, setTutorSubject] = useState<SubjectId>('toan');
  const [tutorTopic, setTutorTopic] = useState<string>('');
  const [isGeneratingTutor, setIsGeneratingTutor] = useState<boolean>(false);

  // Strict Ad-Free Shield: While KidsLearningStudio is mounted, hide any third-party ad elements
  // that might have been injected globally into document.body on other pages
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-kids-adfree-shield', 'true');
    styleEl.textContent = `
      [id*="aclib"],
      [data-ad-format],
      iframe[src*="adexchange"],
      iframe[src*="acscdn"] {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      styleEl.remove();
    };
  }, []);

  // Persist learner progress & voice preferences safely
  useEffect(() => {
    try {
      const payload: StoredKidsProgress = {
        xp,
        stars,
        bestStreak,
        solvedIds,
        masteredCardIds,
        preferredVoiceId: selectedVoiceId,
        preferredEnVoiceId: selectedEnVoiceId,
        speedRate,
        autoRead,
        soundFx,
      };
      localStorage.setItem(STORAGE_KEY_KIDS_PROGRESS, JSON.stringify(payload));
    } catch {}
  }, [
    xp,
    stars,
    bestStreak,
    solvedIds,
    masteredCardIds,
    selectedVoiceId,
    selectedEnVoiceId,
    speedRate,
    autoRead,
    soundFx,
  ]);

  // Resolve display label for active Vietnamese voice (explicitly showing "Lê Hoàng Nam" for vi_male_lehoang_mb)
  const activeVoiceDisplayName = useMemo(() => {
    if (selectedVoiceId === DEFAULT_LE_HOANG_NAM_VOICE_ID) {
      return 'Lê Hoàng Nam';
    }
    const found = studioVoices.find((v) => v.id === selectedVoiceId);
    if (!found) return 'Lê Hoàng Nam';
    if (found.name === 'Lê Hoàng' && (found.gender === 'Nam' || found.id.includes('_male_'))) {
      return 'Lê Hoàng Nam';
    }
    return found.name;
  }, [selectedVoiceId, studioVoices]);

  const activeEnVoiceMeta = useMemo(
    () => NATIVE_ENGLISH_VOICES.find((v) => v.id === selectedEnVoiceId) || NATIVE_ENGLISH_VOICES[0],
    [selectedEnVoiceId]
  );

  // Stop any active speech cleanly
  const stopSpeaking = useCallback(() => {
    speechRunIdRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingStatus('');
  }, []);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  // Fallback browser speech if EverAI network/credits are unavailable
  const fallbackBrowserSpeak = useCallback(
    (text: string, runId: number) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setIsSpeaking(false);
        setSpeakingStatus('');
        return;
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      const isEnglishVoice = selectedVoiceId.startsWith('en_');
      utter.lang = isEnglishVoice ? 'en-US' : 'vi-VN';
      utter.rate = Math.max(0.6, Math.min(1.8, speedRate));
      const isFemale = selectedVoiceId.includes('_female_');
      utter.pitch = isFemale ? 1.1 : 0.92;

      const voices = window.speechSynthesis.getVoices();
      const langPrefix = isEnglishVoice ? 'en' : 'vi';
      const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
      if (matching.length > 0) {
        const genderMatch = matching.find((v) =>
          isFemale ? /female|nu|linh|trang|hoaimy/i.test(v.name) : /male|nam|minh|an|david/i.test(v.name)
        );
        utter.voice = genderMatch || matching[0];
      }

      utter.onend = () => {
        if (speechRunIdRef.current === runId) {
          setIsSpeaking(false);
          setSpeakingStatus('');
        }
      };
      utter.onerror = () => {
        if (speechRunIdRef.current === runId) {
          setIsSpeaking(false);
          setSpeakingStatus('');
        }
      };
      setSpeakingStatus('Đang đọc...');
      window.speechSynthesis.speak(utter);
    },
    [selectedVoiceId, speedRate]
  );

  // Main TTS Speak Function using Studio Giọng Nói (EverAI engine + Lê Hoàng Nam default)
  const speakWithStudioVoice = useCallback(
    async (rawText: string) => {
      const cleanText = rawText.replace(/[_#*`~]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleanText) return;

      stopSpeaking();
      const currentRunId = speechRunIdRef.current;
      setIsSpeaking(true);

      const cacheKey = `${selectedVoiceId}::${speedRate.toFixed(1)}::${cleanText}`;
      const cachedUrl = audioUrlCacheRef.current.get(cacheKey);

      const playAudioLink = (url: string) => {
        if (speechRunIdRef.current !== currentRunId) return;
        const audio = new Audio(url);
        audioRef.current = audio;
        setSpeakingStatus(`Đang đọc (${activeVoiceDisplayName})...`);
        audio.onended = () => {
          if (speechRunIdRef.current === currentRunId) {
            setIsSpeaking(false);
            setSpeakingStatus('');
          }
        };
        audio.onerror = () => {
          if (speechRunIdRef.current === currentRunId) {
            fallbackBrowserSpeak(cleanText, currentRunId);
          }
        };
        audio.play().catch(() => {
          if (speechRunIdRef.current === currentRunId) {
            fallbackBrowserSpeak(cleanText, currentRunId);
          }
        });
      };

      if (cachedUrl) {
        playAudioLink(cachedUrl);
        return;
      }

      try {
        setSpeakingStatus(`Đang chuẩn bị giọng ${activeVoiceDisplayName}...`);
        const apiKey = getStoredEverAiKey();
        const job = await createEverAiTtsJob({
          inputText: cleanText,
          voiceCode: selectedVoiceId,
          modelId: 'everai-v1.6',
          audioType: 'mp3',
          bitrate: 128,
          speedRate,
          pitchRate: 1.0,
          volume: 100,
          generateSrt: false,
          apiKey,
        });

        if (speechRunIdRef.current !== currentRunId) return;

        // Poll quickly for completion
        let attempts = 0;
        const maxAttempts = 22;
        while (attempts < maxAttempts && speechRunIdRef.current === currentRunId) {
          await new Promise((r) => setTimeout(r, attempts < 3 ? 650 : 950));
          if (speechRunIdRef.current !== currentRunId) return;
          attempts += 1;
          const pollRes = await pollEverAiTtsJob(job.requestId, apiKey);
          if (pollRes.isDone && pollRes.audioLink) {
            audioUrlCacheRef.current.set(cacheKey, pollRes.audioLink);
            playAudioLink(pollRes.audioLink);
            return;
          }
          if (pollRes.status === 'FAILURE') {
            break;
          }
        }

        // Fallback if job timed out or failed
        if (speechRunIdRef.current === currentRunId) {
          fallbackBrowserSpeak(cleanText, currentRunId);
        }
      } catch {
        if (speechRunIdRef.current === currentRunId) {
          fallbackBrowserSpeak(cleanText, currentRunId);
        }
      }
    },
    [selectedVoiceId, speedRate, activeVoiceDisplayName, stopSpeaking, fallbackBrowserSpeak]
  );

  // Authentic Standard Native English Voice Engine (US / UK)
  // Layer 1: Server-side Gemini 3.8 Flash Lite TTS (24kHz WAV)
  // Layer 2: EverAI Native English Voice (Emily US / Echo US / Elara UK)
  // Layer 3: Browser Native en-US / en-GB SpeechSynthesis
  const speakEnglishNative = useCallback(
    async (rawText: string, opts?: { slow?: boolean }) => {
      const cleanText = rawText.replace(/[_#*`~]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleanText) return;

      const isSlow = Boolean(opts?.slow);
      stopSpeaking();
      const currentRunId = speechRunIdRef.current;
      setIsSpeaking(true);

      const fallbackNativeWebSpeech = () => {
        if (speechRunIdRef.current !== currentRunId) return;
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
          setIsSpeaking(false);
          setSpeakingStatus('');
          return;
        }
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(cleanText);
        utter.lang = activeEnVoiceMeta.langCode;
        utter.rate = isSlow ? 0.78 : Math.max(0.85, Math.min(1.15, speedRate));
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith(activeEnVoiceMeta.langCode.toLowerCase()) &&
              /google|samantha|aria|jenny|guy|daniel|natural/i.test(v.name)
          ) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('en'));
        if (preferred) utter.voice = preferred;
        utter.onend = () => {
          if (speechRunIdRef.current === currentRunId) {
            setIsSpeaking(false);
            setSpeakingStatus('');
          }
        };
        utter.onerror = () => {
          if (speechRunIdRef.current === currentRunId) {
            setIsSpeaking(false);
            setSpeakingStatus('');
          }
        };
        setSpeakingStatus(`Đang phát âm chuẩn bản xứ (${activeEnVoiceMeta.label})...`);
        window.speechSynthesis.speak(utter);
      };

      const playAudioUrl = (url: string, playbackSpeed = 1.0) => {
        if (speechRunIdRef.current !== currentRunId) return;
        const audio = new Audio(url);
        audio.playbackRate = playbackSpeed;
        audioRef.current = audio;
        setSpeakingStatus(`Đang phát âm Tiếng Anh (${activeEnVoiceMeta.label})...`);
        audio.onended = () => {
          if (speechRunIdRef.current === currentRunId) {
            setIsSpeaking(false);
            setSpeakingStatus('');
          }
        };
        audio.onerror = () => {
          fallbackNativeWebSpeech();
        };
        audio.play().catch(() => {
          fallbackNativeWebSpeech();
        });
      };

      const cacheKey = `EN_NATIVE::${selectedEnVoiceId}::${isSlow ? 'slow' : 'norm'}::${cleanText}`;
      const cached = audioUrlCacheRef.current.get(cacheKey);
      if (cached) {
        playAudioUrl(cached, isSlow ? 0.92 : 1.0);
        return;
      }

      // Layer 1: Server-side Gemini 3.8 Native English TTS
      try {
        setSpeakingStatus(`Đang chuẩn bị giọng bản xứ ${activeEnVoiceMeta.label}...`);
        const apiBase = getApiBaseUrl();
        const endpoint = apiBase
          ? `${apiBase.replace(/\/+$/, '')}/api/kids-learning/english-tts`
          : '/api/kids-learning/english-tts';

        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanText,
            voiceName: selectedEnVoiceId,
            slow: isSlow,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          if (data?.audioDataUrl && speechRunIdRef.current === currentRunId) {
            audioUrlCacheRef.current.set(cacheKey, String(data.audioDataUrl));
            playAudioUrl(String(data.audioDataUrl), isSlow ? 0.92 : 1.0);
            return;
          }
        }
      } catch {}

      if (speechRunIdRef.current !== currentRunId) return;

      // Layer 2: EverAI Native English Voice Fallback
      try {
        const apiKey = getStoredEverAiKey();
        const job = await createEverAiTtsJob({
          inputText: cleanText,
          voiceCode: activeEnVoiceMeta.everAiFallbackId,
          modelId: 'everai-v1.6',
          audioType: 'mp3',
          bitrate: 128,
          speedRate: isSlow ? 0.8 : 1.0,
          pitchRate: 1.0,
          volume: 100,
          generateSrt: false,
          apiKey,
        });
        let attempts = 0;
        while (attempts < 16 && speechRunIdRef.current === currentRunId) {
          await new Promise((r) => setTimeout(r, attempts < 3 ? 600 : 850));
          if (speechRunIdRef.current !== currentRunId) return;
          attempts += 1;
          const poll = await pollEverAiTtsJob(job.requestId, apiKey);
          if (poll.isDone && poll.audioLink) {
            audioUrlCacheRef.current.set(cacheKey, poll.audioLink);
            playAudioUrl(poll.audioLink, 1.0);
            return;
          }
          if (poll.status === 'FAILURE') break;
        }
      } catch {}

      // Layer 3: Browser Native English SpeechSynthesis
      fallbackNativeWebSpeech();
    },
    [selectedEnVoiceId, activeEnVoiceMeta, speedRate, stopSpeaking]
  );

  const handleEarnModuleReward = useCallback(
    (xpDelta: number, starDelta: number) => {
      setXp((prev) => prev + xpDelta);
      if (starDelta > 0) {
        setStars((prev) => prev + starDelta);
      }
      setStreak((prev) => {
        const next = prev + 1;
        if (next > bestStreak) setBestStreak(next);
        return next;
      });
    },
    [bestStreak]
  );

  // Filtered Questions for Current Tier, Grade & Subject
  const activeQuestions = useMemo(() => {
    if (customDeck && customDeck.length > 0) {
      return customDeck;
    }
    const filtered = CURRICULUM_QUESTIONS.filter((q) => {
      if (q.tier !== activeTier) return false;
      if (selectedGrade !== 'all' && q.grade !== selectedGrade) return false;
      if (activeSubject !== 'all' && q.subject !== activeSubject) return false;
      return true;
    });
    if (filtered.length > 0) return filtered;
    // Fallback to tier questions if a specific grade+subject combo has no static item yet
    return CURRICULUM_QUESTIONS.filter(
      (q) => q.tier === activeTier && (activeSubject === 'all' || q.subject === activeSubject)
    );
  }, [customDeck, activeTier, selectedGrade, activeSubject]);

  const currentQuestion: LearningQuestion | undefined =
    activeQuestions[questionIndex % Math.max(1, activeQuestions.length)];

  const shuffledWordPool = useMemo(() => {
    if (!currentQuestion || currentQuestion.type !== 'word-order' || !currentQuestion.wordTokens) {
      return [];
    }
    return shuffleTokens(currentQuestion.wordTokens, currentQuestion.id);
  }, [currentQuestion]);

  // Filtered Flashcards
  const activeFlashcards = useMemo(() => {
    const list = CURRICULUM_FLASHCARDS.filter((fc) => {
      if (fc.tier !== activeTier) return false;
      if (activeSubject !== 'all' && fc.subject !== activeSubject) return false;
      return true;
    });
    return list.length > 0 ? list : CURRICULUM_FLASHCARDS.filter((fc) => fc.tier === activeTier);
  }, [activeTier, activeSubject]);

  const currentFlashcard =
    activeFlashcards[flashcardIndex % Math.max(1, activeFlashcards.length)];

  // Reset question interaction states when question changes
  const resetQuestionInteraction = useCallback(() => {
    setSelectedChoice(null);
    setSelectedWordIds([]);
    setFillInput('');
    setAnswerStatus('idle');
    setShowHint(false);
    stopSpeaking();
  }, [stopSpeaking]);

  useEffect(() => {
    resetQuestionInteraction();
  }, [currentQuestion?.id, resetQuestionInteraction]);

  // Auto-read prompt if user turned on Auto-Read
  useEffect(() => {
    if (autoRead && studioMode === 'quiz' && currentQuestion) {
      const timer = setTimeout(() => {
        speakWithStudioVoice(currentQuestion.spokenPrompt || currentQuestion.prompt);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [autoRead, studioMode, currentQuestion, speakWithStudioVoice]);

  // Sync default tutor grade when tier changes
  useEffect(() => {
    if (activeTier === 'tieu-hoc') setTutorGrade(3);
    else if (activeTier === 'thcs') setTutorGrade(8);
    else setTutorGrade(12);
  }, [activeTier]);

  const handleRewardSuccess = (q: LearningQuestion) => {
    setAnswerStatus('correct');
    if (soundFx) playFeedbackTone('correct');
    const nextStreak = streak + 1;
    setStreak(nextStreak);
    if (nextStreak > bestStreak) setBestStreak(nextStreak);

    const alreadySolved = solvedIds.includes(q.id);
    const earnedXp = alreadySolved ? Math.max(5, Math.round(q.points / 2)) : q.points;
    setXp((prev) => prev + earnedXp);
    if (!alreadySolved) {
      setStars((prev) => prev + 1);
      setSolvedIds((prev) => [...prev, q.id]);
    }
    if (autoRead) {
      speakWithStudioVoice(q.explanation);
    }
  };

  const handleMarkWrong = () => {
    setAnswerStatus('wrong');
    setStreak(0);
    if (soundFx) playFeedbackTone('retry');
  };

  const handleSelectMultipleChoice = (idx: number) => {
    if (!currentQuestion || answerStatus === 'correct') return;
    setSelectedChoice(idx);
    if (idx === currentQuestion.correctIndex) {
      handleRewardSuccess(currentQuestion);
    } else {
      handleMarkWrong();
    }
  };

  const handleCheckWordOrder = () => {
    if (!currentQuestion || !currentQuestion.acceptedAnswers) return;
    const builtSentence = selectedWordIds
      .map((id) => shuffledWordPool.find((item) => item.id === id)?.text || '')
      .join(' ')
      .trim();

    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
    const isMatch = currentQuestion.acceptedAnswers.some(
      (ans) => normalize(ans) === normalize(builtSentence)
    );
    if (isMatch) {
      handleRewardSuccess(currentQuestion);
    } else {
      handleMarkWrong();
    }
  };

  const handleCheckFillBlank = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentQuestion || !currentQuestion.acceptedAnswers || !fillInput.trim()) return;
    const normalize = (s: string) => s.replace(/\s+/g, '').replace(',', '.').toLowerCase();
    const userClean = normalize(fillInput);
    const isMatch = currentQuestion.acceptedAnswers.some((ans) => normalize(ans) === userClean);
    if (isMatch) {
      handleRewardSuccess(currentQuestion);
    } else {
      handleMarkWrong();
    }
  };

  const handleNextQuestion = () => {
    if (activeQuestions.length <= 1) {
      const fresh = createDynamicMathQuestion(activeTier);
      setCustomDeck([fresh]);
      setQuestionIndex(0);
      return;
    }
    setQuestionIndex((prev) => (prev + 1) % activeQuestions.length);
  };

  const handleSpawnMentalMath = () => {
    const batch = Array.from({ length: 5 }, () => createDynamicMathQuestion(activeTier));
    setCustomDeck(batch);
    setCustomLessonSummary(null);
    setQuestionIndex(0);
    setStudioMode('quiz');
    onShowToast('⚡ Đã tạo 5 thử thách Toán tính nhẩm mới theo cấp học!');
  };

  const handleGenerateCustomTopicLesson = async (e?: React.FormEvent, presetTopic?: string) => {
    if (e) e.preventDefault();
    const targetTopic = (presetTopic ?? tutorTopic).trim();
    if (!targetTopic) {
      onShowToast('⚠️ Vui lòng nhập chủ đề bài học bé muốn ôn luyện!');
      return;
    }
    if (presetTopic) setTutorTopic(presetTopic);

    setIsGeneratingTutor(true);
    try {
      const apiBase = getApiBaseUrl();
      const endpoint = apiBase
        ? `${apiBase.replace(/\/+$/, '')}/api/kids-learning/generate`
        : '/api/kids-learning/generate';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: tutorGrade,
          subject: tutorSubject,
          topic: targetTopic,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data || !Array.isArray(data.questions)) {
        throw new Error(data?.error || 'Không thể khởi tạo bài học');
      }

      const tierForGrade: SchoolTier =
        tutorGrade <= 5 ? 'tieu-hoc' : tutorGrade <= 9 ? 'thcs' : 'thpt';

      const mappedQuestions: LearningQuestion[] = data.questions.map((q: any, i: number) => ({
        id: `ai-q-${Date.now()}-${i}`,
        tier: tierForGrade,
        grade: tutorGrade,
        subject: tutorSubject,
        topic: data.lessonTitle || targetTopic,
        type: 'multiple-choice',
        prompt: String(q.prompt || ''),
        visualFormulaOrHint: q.formulaOrTip ? String(q.formulaOrTip) : undefined,
        spokenPrompt: String(q.spokenPrompt || q.prompt || ''),
        options: Array.isArray(q.options) ? q.options.map(String) : ['A', 'B', 'C', 'D'],
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        hint: String(q.hint || 'Hãy đọc kỹ dữ kiện trong đề bài nhé!'),
        explanation: String(q.explanation || 'Chúc mừng em đã hoàn thành câu hỏi!'),
        points: tutorGrade <= 5 ? 15 : tutorGrade <= 9 ? 20 : 25,
      }));

      setActiveTier(tierForGrade);
      setCustomLessonSummary({
        title: String(data.lessonTitle || targetTopic),
        grade: tutorGrade,
        summary: String(data.summary || ''),
        keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints.map(String) : [],
      });
      setCustomDeck(mappedQuestions);
      setQuestionIndex(0);
      onShowToast(`✨ Đã biên soạn bài giảng & ${mappedQuestions.length} câu đố cho Lớp ${tutorGrade}!`);
    } catch (err: any) {
      onShowToast(`⚠️ ${err?.message || 'Không thể kết nối máy chủ, đã tạo bài tập nhanh cục bộ.'}`);
      const fallbackBatch = Array.from({ length: 4 }, () => createDynamicMathQuestion(activeTier));
      setCustomDeck(fallbackBatch);
      setQuestionIndex(0);
      setStudioMode('quiz');
    } finally {
      setIsGeneratingTutor(false);
    }
  };

  const currentTierMeta = SCHOOL_TIERS.find((t) => t.id === activeTier) || SCHOOL_TIERS[0];

  const getSubjectIcon = (subj: SubjectId) => {
    switch (subj) {
      case 'tieng-viet':
        return <BookOpen className="w-4 h-4" />;
      case 'tieng-anh':
        return <Globe className="w-4 h-4" />;
      case 'toan':
        return <Calculator className="w-4 h-4" />;
      case 'khoa-hoc':
        return <Atom className="w-4 h-4" />;
      case 'kham-pha':
        return <Compass className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* =================================================================== */}
      {/* TOP HEADER & STUDIO VOICE BAR ("Lê Hoàng Nam" Default)              */}
      {/* =================================================================== */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Title & Identity */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 shrink-0">
              <GraduationCap className="w-7 h-7 stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Học Mà Vui — Vui Mà Học (Lớp 1 đến Lớp 12)
                </h1>
                <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg">
                  Tiểu học • THCS • THPT
                </span>
                <span className="text-xs font-bold text-sky-300 bg-sky-500/10 border border-sky-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Không Quảng Cáo • An Toàn Cho Bé</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                Chinh phục Bảng chữ cái, Tiếng Việt, Tiếng Anh giọng bản xứ chuẩn, Toán học &amp; Khoa học cùng khung Chat hỏi bài bằng giọng nói trực tiếp.
              </p>
            </div>
          </div>

          {/* Scoreboard Metrics (tabular-nums) */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0 tabular-nums">
            <div className="px-3.5 py-2 rounded-2xl bg-slate-950 border border-amber-500/30 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Sao Thông Thái</div>
                <div className="text-sm font-black text-amber-300">{stars} sao</div>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-slate-950 border border-emerald-500/30 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Điểm Tích Lũy</div>
                <div className="text-sm font-black text-emerald-300">{xp} XP</div>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-slate-950 border border-rose-500/30 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Chuỗi Đúng</div>
                <div className="text-sm font-black text-rose-300">
                  {streak} <span className="text-[11px] text-slate-500 font-normal">(Kỷ lục: {bestStreak})</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Studio Voice Controller Strip */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-indigo-500/40 text-slate-200">
              <Mic className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-400">Giọng Việt:</span>
              <span className="font-bold text-amber-300">{activeVoiceDisplayName}</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-sky-500/40 text-slate-200">
              <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="text-slate-400">Tiếng Anh:</span>
              <span className="font-bold text-sky-300">{activeEnVoiceMeta.label}</span>
            </div>

            <button
              type="button"
              onClick={() =>
                speakWithStudioVoice(
                  `Xin chào các em học sinh! Thầy là ${activeVoiceDisplayName}. Hôm nay thầy trò mình cùng vui học Tiếng Việt, Tiếng Anh và Toán thật hào hứng nhé!`
                )
              }
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition-all active:scale-95"
            >
              {isSpeaking ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>Thử giọng Việt</span>
            </button>

            <button
              type="button"
              onClick={() =>
                speakEnglishNative(
                  'Hello everyone! Let us practice standard native English pronunciation together today!'
                )
              }
              className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Thử giọng Anh chuẩn</span>
            </button>

            {isSpeaking && (
              <button
                type="button"
                onClick={stopSpeaking}
                className="px-2.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-semibold flex items-center gap-1"
              >
                <Square className="w-3 h-3 fill-rose-400" />
                <span>Dừng đọc</span>
              </button>
            )}

            {speakingStatus && (
              <span className="text-[11px] text-indigo-300 font-medium">{speakingStatus}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Voice Q&A Chat Toggle */}
            {studioMode !== 'chat-tutor' && (
              <button
                type="button"
                onClick={() => setShowFloatingChat((prev) => !prev)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{showFloatingChat ? 'Đóng Khung Hỏi Bài' : '🎤 Hỏi Bài Trực Tiếp'}</span>
              </button>
            )}

            {/* Auto-read toggle */}
            <button
              type="button"
              onClick={() => setAutoRead((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-all ${
                autoRead
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Tự động đọc to câu hỏi và lời giải thích khi chuyển câu"
            >
              <Check className={`w-3.5 h-3.5 ${autoRead ? 'text-emerald-400' : 'opacity-40'}`} />
              <span>Tự động đọc bài</span>
            </button>

            {/* Sound FX toggle */}
            <button
              type="button"
              onClick={() => setSoundFx((prev) => !prev)}
              className={`p-1.5 rounded-xl border transition-all ${
                soundFx
                  ? 'bg-slate-950 border-slate-700 text-amber-400'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
              title={soundFx ? 'Đang bật âm thanh hiệu ứng trả lời đúng' : 'Đang tắt âm thanh hiệu ứng'}
            >
              {soundFx ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Expand Voice & Speed Drawer */}
            <button
              type="button"
              onClick={() => setShowVoiceDrawer((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 transition-all"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Đổi giọng / Tốc độ ({speedRate.toFixed(1)}x)</span>
            </button>
          </div>
        </div>

        {/* Collapsible Voice Studio Picker */}
        {showVoiceDrawer && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/30 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-5 space-y-1.5">
              <label htmlFor="kids-studio-voice" className="text-xs font-bold text-slate-200 block">
                Giọng giảng Tiếng Việt (Studio Giọng Nói):
              </label>
              <select
                id="kids-studio-voice"
                value={selectedVoiceId}
                onChange={(e) => setSelectedVoiceId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={defaultLeHoangNamVoiceId}>
                  🎙️ Lê Hoàng Nam (Nam - Miền Bắc • Mặc định)
                </option>
                {studioVoices
                  .filter((v) => v.id !== defaultLeHoangNamVoiceId)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.isCustom ? '⭐ ' : ''}
                      {v.name} ({v.gender} - {v.region} • {v.language})
                    </option>
                  ))}
              </select>
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label htmlFor="kids-en-native-voice" className="text-xs font-bold text-sky-300 block">
                Giọng Tiếng Anh Bản Xứ Chuẩn (US / UK):
              </label>
              <select
                id="kids-en-native-voice"
                value={selectedEnVoiceId}
                onChange={(e) => setSelectedEnVoiceId(e.target.value as NativeEnglishVoiceId)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-sky-500/40 text-xs text-white focus:outline-none focus:border-sky-400"
              >
                {NATIVE_ENGLISH_VOICES.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    🇺🇸 {ev.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <div className="flex justify-between text-xs tabular-nums">
                <label htmlFor="kids-voice-speed" className="font-bold text-slate-200">
                  Tốc độ đọc:
                </label>
                <span className="font-mono font-bold text-amber-400">
                  {speedRate.toFixed(1)}x
                </span>
              </div>
              <input
                id="kids-voice-speed"
                type="range"
                min={0.7}
                max={1.4}
                step={0.1}
                value={speedRate}
                onChange={(e) => setSpeedRate(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* GRADE TIER SELECTOR & LEARNING MODE TABS                            */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SCHOOL_TIERS.map((tier) => {
          const isSelected = activeTier === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => {
                setActiveTier(tier.id);
                setSelectedGrade('all');
                setCustomDeck(null);
                setQuestionIndex(0);
                setFlashcardIndex(0);
                setIsCardFlipped(false);
              }}
              className={`text-left p-4 rounded-2xl border transition-all ${
                isSelected
                  ? 'bg-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-extrabold text-white">{tier.label}</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${tier.badgeClass}`}>
                  {tier.gradesLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                {tier.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Mode Switcher + Specific Grade Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl">
        {/* 7 Rich Learning Program Modes */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStudioMode('alphabet')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              studioMode === 'alphabet'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TypeIcon className="w-4 h-4" />
            <span>Bảng Chữ Cái Việt–Anh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStudioMode('chat-tutor');
              setShowFloatingChat(false);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              studioMode === 'chat-tutor'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>🎤 Chat &amp; Nói Hỏi Bài</span>
          </button>

          <button
            type="button"
            onClick={() => setStudioMode('quiz')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              studioMode === 'quiz'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>Đố Vui Lớp 1–12</span>
          </button>

          <button
            type="button"
            onClick={() => setStudioMode('toolkit')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              studioMode === 'toolkit'
                ? 'bg-teal-400 text-slate-950 shadow-md shadow-teal-400/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span>Luyện Nói Anh &amp; Cửu Chương</span>
          </button>

          <button
            type="button"
            onClick={() => setStudioMode('sandbox')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              studioMode === 'sandbox'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Atom className="w-4 h-4" />
            <span>Mô Phỏng Trực Quan</span>
          </button>

          <button
            type="button"
            onClick={() => setStudioMode('flashcards')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              studioMode === 'flashcards'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Thẻ Học Đọc To</span>
          </button>

          <button
            type="button"
            onClick={() => setStudioMode('ai-tutor')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              studioMode === 'ai-tutor'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>Soạn Bài Theo Chủ Đề</span>
          </button>
        </div>

        {/* Grade & Subject Quick Filter (for Quiz & Flashcards) */}
        {(studioMode === 'quiz' || studioMode === 'flashcards') && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium px-1">Chọn lớp:</span>
            <button
              type="button"
              onClick={() => {
                setSelectedGrade('all');
                setCustomDeck(null);
                setQuestionIndex(0);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedGrade === 'all' && !customDeck
                  ? 'bg-slate-200 text-slate-950'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Tất cả
            </button>
            {currentTierMeta.grades.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setSelectedGrade(g);
                  setCustomDeck(null);
                  setQuestionIndex(0);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold tabular-nums transition-colors ${
                  selectedGrade === g && !customDeck
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Lớp {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Subject Filter Bar (for Quiz & Flashcards) */}
      {(studioMode === 'quiz' || studioMode === 'flashcards') && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveSubject('all');
                setCustomDeck(null);
                setQuestionIndex(0);
                setFlashcardIndex(0);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                activeSubject === 'all' && !customDeck
                  ? 'bg-white text-slate-950 border-white shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              🌟 Tất cả môn học
            </button>

            {SUBJECTS_META.map((subj) => {
              const active = activeSubject === subj.id && !customDeck;
              return (
                <button
                  key={subj.id}
                  type="button"
                  onClick={() => {
                    setActiveSubject(subj.id);
                    setCustomDeck(null);
                    setQuestionIndex(0);
                    setFlashcardIndex(0);
                    setIsCardFlipped(false);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                    active
                      ? `${subj.bgSoftClass} ${subj.borderClass} ${subj.textClass} ring-1 ring-current`
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {getSubjectIcon(subj.id)}
                  <span>{subj.shortName}</span>
                </button>
              );
            })}
          </div>

          {studioMode === 'quiz' && (
            <button
              type="button"
              onClick={handleSpawnMentalMath}
              className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tạo Đề Toán Tính Nhẩm Mới</span>
            </button>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODE 1: INTERACTIVE QUIZ & CHALLENGE ARENA                          */}
      {/* =================================================================== */}
      {studioMode === 'quiz' && currentQuestion && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Interactive Stage (8 cols) */}
          <div className="lg:col-span-8 rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-7 shadow-xl space-y-6">
            {/* Custom AI Lesson Banner if active */}
            {customDeck && (
              <div className="p-3.5 rounded-2xl bg-indigo-950/50 border border-indigo-500/40 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-indigo-200 font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Đang luyện bộ câu hỏi chuyên đề:{' '}
                    <strong className="text-white">
                      {customLessonSummary?.title || currentQuestion.topic}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomDeck(null);
                    setCustomLessonSummary(null);
                    setQuestionIndex(0);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 shrink-0"
                >
                  Về kho bài chuẩn
                </button>
              </div>
            )}

            {/* Question Top Meta */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-extrabold tabular-nums">
                  Lớp {currentQuestion.grade}
                </span>
                <span className="text-xs font-bold text-slate-300">
                  {SUBJECTS_META.find((s) => s.id === currentQuestion.subject)?.name}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-400">{currentQuestion.topic}</span>
              </div>

              <div className="flex items-center gap-2 tabular-nums text-xs">
                <span className="text-slate-400 font-mono">
                  Câu {(questionIndex % activeQuestions.length) + 1} / {activeQuestions.length}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-bold">
                  +{currentQuestion.points} XP
                </span>
              </div>
            </div>

            {/* Question Prompt + Read Aloud Buttons */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                  {currentQuestion.prompt}
                </h2>
                <div className="flex items-center gap-2 shrink-0">
                  {currentQuestion.subject === 'tieng-anh' && (
                    <button
                      type="button"
                      onClick={() =>
                        speakEnglishNative(
                          currentQuestion.visualFormulaOrHint || currentQuestion.prompt
                        )
                      }
                      className="px-3.5 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                      title={`Phát âm Tiếng Anh chuẩn bản xứ (${activeEnVoiceMeta.label})`}
                    >
                      <Globe className="w-4 h-4" />
                      <span>Đọc Chuẩn US/UK</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      speakWithStudioVoice(currentQuestion.spokenPrompt || currentQuestion.prompt)
                    }
                    className="px-3.5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                    title={`Đọc to câu hỏi bằng giọng ${activeVoiceDisplayName}`}
                  >
                    <Volume2 className="w-4 h-4 text-amber-300" />
                    <span>Đọc câu hỏi</span>
                  </button>
                </div>
              </div>

              {currentQuestion.visualFormulaOrHint && (
                <div className="inline-block px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono text-sm font-semibold">
                  {currentQuestion.visualFormulaOrHint}
                </div>
              )}
            </div>

            {/* INTERACTION TYPE 1: MULTIPLE CHOICE */}
            {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {currentQuestion.options.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isPicked = selectedChoice === idx;
                  const isCorrectOpt = idx === currentQuestion.correctIndex;

                  let btnStyle =
                    'bg-slate-950 hover:bg-slate-800/90 border-slate-800 hover:border-slate-600 text-slate-100';
                  if (answerStatus === 'correct' && isCorrectOpt) {
                    btnStyle =
                      'bg-emerald-950/70 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500';
                  } else if (answerStatus === 'wrong' && isPicked && !isCorrectOpt) {
                    btnStyle = 'bg-rose-950/60 border-rose-500 text-rose-200';
                  }

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-2 ${btnStyle}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectMultipleChoice(idx)}
                        className="flex-1 text-left flex items-center gap-3 min-w-0"
                      >
                        <span className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-black text-amber-400 shrink-0">
                          {letter}
                        </span>
                        <span className="text-sm font-semibold leading-snug">{opt}</span>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {currentQuestion.subject === 'tieng-anh' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speakEnglishNative(opt);
                            }}
                            className="p-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 transition-colors"
                            title="Nghe phát âm Tiếng Anh bản xứ của đáp án này"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {answerStatus === 'correct' && isCorrectOpt && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        )}
                        {answerStatus === 'wrong' && isPicked && !isCorrectOpt && (
                          <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* INTERACTION TYPE 2: WORD ORDER BUILDER */}
            {currentQuestion.type === 'word-order' && (
              <div className="space-y-4 pt-1">
                {/* Assembled Sentence Tray */}
                <div className="min-h-[68px] p-3.5 rounded-2xl bg-slate-950 border-2 border-dashed border-slate-700 flex flex-wrap items-center gap-2">
                  {selectedWordIds.length === 0 ? (
                    <span className="text-xs text-slate-500">
                      Chạm vào các thẻ từ bên dưới để xếp thành câu hoàn chỉnh tại đây...
                    </span>
                  ) : (
                    selectedWordIds.map((id) => {
                      const tokenObj = shuffledWordPool.find((t) => t.id === id);
                      if (!tokenObj) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={answerStatus === 'correct'}
                          onClick={() =>
                            setSelectedWordIds((prev) => prev.filter((item) => item !== id))
                          }
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-sm transition-all"
                        >
                          {tokenObj.text}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Available Word Bank */}
                <div className="flex flex-wrap items-center gap-2">
                  {shuffledWordPool.map((item) => {
                    const used = selectedWordIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={used || answerStatus === 'correct'}
                        onClick={() => setSelectedWordIds((prev) => [...prev, item.id])}
                        className={`px-3.5 py-2 rounded-xl text-sm font-bold border transition-all ${
                          used
                            ? 'bg-slate-950 border-slate-900 text-slate-700 cursor-default'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100 active:scale-95'
                        }`}
                      >
                        {item.text}
                      </button>
                    );
                  })}
                </div>

                {/* Verify & Reset Row */}
                {answerStatus !== 'correct' && (
                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={selectedWordIds.length === 0}
                      onClick={handleCheckWordOrder}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs transition-all"
                    >
                      Kiểm tra câu đã ghép
                    </button>
                    {selectedWordIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedWordIds([]);
                          setAnswerStatus('idle');
                        }}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Xếp lại</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* INTERACTION TYPE 3: FILL IN THE BLANK */}
            {currentQuestion.type === 'fill-blank' && (
              <form onSubmit={handleCheckFillBlank} className="flex flex-col sm:flex-row gap-3 pt-1">
                <input
                  type="text"
                  value={fillInput}
                  disabled={answerStatus === 'correct'}
                  onChange={(e) => {
                    setFillInput(e.target.value);
                    if (answerStatus === 'wrong') setAnswerStatus('idle');
                  }}
                  placeholder="Nhập đáp số của em vào đây (ví dụ: 15)..."
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
                {answerStatus !== 'correct' && (
                  <button
                    type="submit"
                    disabled={!fillInput.trim()}
                    className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-sm transition-all shrink-0"
                  >
                    Trả lời
                  </button>
                )}
              </form>
            )}

            {/* Feedback & Explanation Callout */}
            {answerStatus === 'wrong' && (
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 shrink-0" />
                    <span>Gần đúng rồi! Thử suy nghĩ thêm một chút nhé:</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{currentQuestion.hint}</p>
                </div>
                <button
                  type="button"
                  onClick={() => speakWithStudioVoice(currentQuestion.hint)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold shrink-0 flex items-center gap-1"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Nghe gợi ý</span>
                </button>
              </div>
            )}

            {answerStatus === 'correct' && (
              <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-sm font-extrabold text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Chính xác tuyệt đối! Giỏi quá! (+{currentQuestion.points} XP)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakWithStudioVoice(currentQuestion.explanation)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Nghe lời giải ({activeVoiceDisplayName})</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {currentQuestion.explanation}
                </p>
              </div>
            )}

            {/* Action Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowHint((prev) => !prev)}
                className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{showHint ? 'Ẩn gợi ý' : 'Xem gợi ý bài làm'}</span>
              </button>

              <button
                type="button"
                onClick={handleNextQuestion}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                <span>Câu tiếp theo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {showHint && answerStatus !== 'wrong' && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between gap-3">
                <span>💡 {currentQuestion.hint}</span>
                <button
                  type="button"
                  onClick={() => speakWithStudioVoice(currentQuestion.hint)}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold shrink-0 flex items-center gap-1"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Đọc</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Deck: Question Navigator & Progress (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {customLessonSummary && (
              <div className="rounded-3xl bg-slate-900 border border-indigo-500/40 p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-white">
                    📖 Tóm tắt bài giảng (Lớp {customLessonSummary.grade})
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      speakWithStudioVoice(
                        `${customLessonSummary.title}. ${customLessonSummary.summary}. ${customLessonSummary.keyPoints.join('. ')}`
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Đọc bài</span>
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {customLessonSummary.summary}
                </p>
                {customLessonSummary.keyPoints.length > 0 && (
                  <ul className="space-y-1.5 text-xs text-emerald-300">
                    {customLessonSummary.keyPoints.map((pt, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="font-bold">•</span>
                        <span className="text-slate-200">{pt}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Danh sách thử thách</h3>
                <span className="text-xs text-emerald-400 font-bold tabular-nums">
                  Đã giải: {activeQuestions.filter((q) => solvedIds.includes(q.id)).length}/
                  {activeQuestions.length}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {activeQuestions.map((q, idx) => {
                  const isCurrent = idx === questionIndex % activeQuestions.length;
                  const isDone = solvedIds.includes(q.id);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setQuestionIndex(idx)}
                      className={`h-10 rounded-xl text-xs font-extrabold tabular-nums border transition-all flex items-center justify-center gap-1 ${
                        isCurrent
                          ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md'
                          : isDone
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title={`Lớp ${q.grade}: ${q.topic}`}
                    >
                      <span>{idx + 1}</span>
                      {isDone && !isCurrent && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 leading-relaxed">
                Mẹo học tốt: Nhấn <strong className="text-slate-200">Đọc câu hỏi</strong> để luyện kỹ năng nghe hiểu với giọng đọc{' '}
                <strong className="text-amber-300">{activeVoiceDisplayName}</strong> trước khi chọn đáp án!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODE 2: VISUAL INTERACTIVE SANDBOX                                  */}
      {/* =================================================================== */}
      {studioMode === 'sandbox' && (
        <KidsVisualSandbox
          activeTier={activeTier}
          onSpeakText={speakWithStudioVoice}
          isSpeaking={isSpeaking}
          voiceLabel={activeVoiceDisplayName}
        />
      )}

      {/* =================================================================== */}
      {/* MODE 3: SMART READ-ALOUD FLASHCARDS                                 */}
      {/* =================================================================== */}
      {studioMode === 'flashcards' && currentFlashcard && (
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                {currentFlashcard.frontBadge}
              </span>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                Thẻ {(flashcardIndex % activeFlashcards.length) + 1} / {activeFlashcards.length}
              </span>
            </div>

            {/* Interactive Card Body */}
            <div
              onClick={() => setIsCardFlipped((prev) => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setIsCardFlipped((prev) => !prev);
              }}
              className="min-h-[220px] p-6 sm:p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all flex flex-col justify-center space-y-4"
            >
              {!isCardFlipped ? (
                <div className="text-center space-y-3">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                    {currentFlashcard.frontTitle}
                  </h2>
                  {currentFlashcard.frontSubtitle && (
                    <p className="text-sm text-amber-300 font-mono">
                      {currentFlashcard.frontSubtitle}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 pt-3">
                    👆 Chạm vào thẻ để lật xem giải thích chi tiết &amp; ví dụ
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Kiến thức trọng tâm &amp; Ví dụ
                  </div>
                  <p className="text-sm sm:text-base text-slate-100 whitespace-pre-line leading-relaxed">
                    {currentFlashcard.backContent}
                  </p>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-amber-200">
                    💡 {currentFlashcard.example}
                  </div>
                </div>
              )}
            </div>

            {/* Card Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => speakWithStudioVoice(currentFlashcard.spokenText)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all"
                >
                  <Volume2 className="w-4 h-4 text-amber-300" />
                  <span>Nghe giảng ({activeVoiceDisplayName})</span>
                </button>

                {currentFlashcard.subject === 'tieng-anh' && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        speakEnglishNative(
                          `${currentFlashcard.frontTitle}. ${currentFlashcard.example}`
                        )
                      }
                      className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Phát âm Tiếng Anh chuẩn</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        speakEnglishNative(currentFlashcard.example, { slow: true })
                      }
                      className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1"
                    >
                      <Turtle className="w-3.5 h-3.5" />
                      <span>Đọc chậm</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const exists = masteredCardIds.includes(currentFlashcard.id);
                    if (exists) {
                      setMasteredCardIds((prev) => prev.filter((id) => id !== currentFlashcard.id));
                    } else {
                      setMasteredCardIds((prev) => [...prev, currentFlashcard.id]);
                      setXp((prev) => prev + 10);
                      if (soundFx) playFeedbackTone('correct');
                    }
                  }}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                    masteredCardIds.includes(currentFlashcard.id)
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {masteredCardIds.includes(currentFlashcard.id) ? 'Đã thuộc làu!' : 'Đánh dấu đã thuộc'}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCardFlipped((prev) => !prev)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Lật thẻ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCardFlipped(false);
                    setFlashcardIndex((prev) => (prev + 1) % activeFlashcards.length);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5"
                >
                  <span>Thẻ kế tiếp</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODE 4: CUSTOM TOPIC TUTOR (GRADES 1 - 12)                          */}
      {/* =================================================================== */}
      {studioMode === 'ai-tutor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={(e) => handleGenerateCustomTopicLesson(e)}
            className="lg:col-span-7 rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-5"
          >
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-400" />
                <span>Soạn Bài Giảng &amp; Đố Vui Theo Chủ Đề Bất Kỳ</span>
              </h2>
              <p className="text-xs text-slate-400">
                Nhập bất kỳ bài học nào trên lớp (từ Lớp 1 đến Lớp 12), hệ thống sẽ tóm tắt dễ hiểu kèm bộ câu hỏi tương tác và giọng giảng của thầy{' '}
                <strong className="text-amber-300">{activeVoiceDisplayName}</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="tutor-grade" className="text-xs font-bold text-slate-300 block">
                  Chọn Lớp (1 – 12):
                </label>
                <select
                  id="tutor-grade"
                  value={tutorGrade}
                  onChange={(e) => setTutorGrade(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  {Array.from({ length: 12 }, (_, idx) => idx + 1).map((g) => (
                    <option key={g} value={g}>
                      Lớp {g} ({g <= 5 ? 'Tiểu học' : g <= 9 ? 'THCS - Cấp 2' : 'THPT - Cấp 3'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="tutor-subject" className="text-xs font-bold text-slate-300 block">
                  Môn học:
                </label>
                <select
                  id="tutor-subject"
                  value={tutorSubject}
                  onChange={(e) => setTutorSubject(e.target.value as SubjectId)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  {SUBJECTS_META.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="tutor-topic-input" className="text-xs font-bold text-slate-300 block">
                Chủ đề hoặc bài học cụ thể:
              </label>
              <input
                id="tutor-topic-input"
                type="text"
                value={tutorTopic}
                onChange={(e) => setTutorTopic(e.target.value)}
                placeholder="Ví dụ: Bảng nhân 8, Phân biệt s/x, Thì hiện tại tiếp diễn, Hệ thức Viète, Sóng cơ học..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isGeneratingTutor}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
            >
              {isGeneratingTutor ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang biên soạn bài giảng &amp; câu đố...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Tạo Bài Học &amp; Luyện Tập Ngay</span>
                </>
              )}
            </button>

            {customLessonSummary && customDeck && (
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between gap-3">
                <div className="text-xs text-emerald-200">
                  Đã tạo xong bài <strong>{customLessonSummary.title}</strong> ({customDeck.length} câu đố)!
                </div>
                <button
                  type="button"
                  onClick={() => setStudioMode('quiz')}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shrink-0"
                >
                  Vào làm bài ngay →
                </button>
              </div>
            )}
          </form>

          {/* Suggested Topics by School Level */}
          <div className="lg:col-span-5 rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Gợi ý chủ đề hay theo từng cấp</h3>
            <div className="space-y-2.5">
              {[
                { grade: 2, subj: 'tieng-viet' as SubjectId, label: 'Tiểu học: Phân biệt chính tả ch/tr và s/x' },
                { grade: 4, subj: 'tieng-anh' as SubjectId, label: 'Tiểu học: Từ vựng Động vật & Gia đình (Animals & Family)' },
                { grade: 5, subj: 'toan' as SubjectId, label: 'Tiểu học: Toán chuyển động đều Vận tốc - Quãng đường' },
                { grade: 8, subj: 'toan' as SubjectId, label: 'THCS: Hằng đẳng thức đáng nhớ & Phân tích đa thức' },
                { grade: 9, subj: 'tieng-anh' as SubjectId, label: 'THCS: Câu gián tiếp (Reported Speech) & Mệnh đề quan hệ' },
                { grade: 12, subj: 'toan' as SubjectId, label: 'THPT: Khảo sát cực trị hàm số & Tích phân cơ bản' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={isGeneratingTutor}
                  onClick={() => {
                    setTutorGrade(item.grade);
                    setTutorSubject(item.subj);
                    handleGenerateCustomTopicLesson(undefined, item.label.split(': ')[1]);
                  }}
                  className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-200 font-medium flex items-center justify-between gap-2 transition-all"
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-bold shrink-0">
                    Lớp {item.grade}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODE 5: VIETNAMESE & ENGLISH ALPHABET + PHONICS BLENDER             */}
      {/* =================================================================== */}
      {studioMode === 'alphabet' && (
        <KidsAlphabetModule
          onSpeakVi={speakWithStudioVoice}
          onSpeakEnglish={speakEnglishNative}
          isSpeaking={isSpeaking}
          viVoiceLabel={activeVoiceDisplayName}
          enVoiceLabel={activeEnVoiceMeta.label}
          onEarnReward={handleEarnModuleReward}
          soundFx={soundFx}
          onPlayFeedbackTone={playFeedbackTone}
        />
      )}

      {/* =================================================================== */}
      {/* MODE 6: MULTI-TOOL STUDY LAB (ENGLISH SPEAKING, MULTIPLICATION...)  */}
      {/* =================================================================== */}
      {studioMode === 'toolkit' && (
        <KidsStudyToolkit
          activeTier={activeTier}
          onSpeakVi={speakWithStudioVoice}
          onSpeakEnglish={speakEnglishNative}
          viVoiceLabel={activeVoiceDisplayName}
          enVoiceLabel={activeEnVoiceMeta.label}
          onEarnReward={handleEarnModuleReward}
          soundFx={soundFx}
          onPlayFeedbackTone={playFeedbackTone}
        />
      )}

      {/* =================================================================== */}
      {/* MODE 7: FULL-SCREEN INTERACTIVE Q&A VOICE TUTOR CHAT                */}
      {/* =================================================================== */}
      {studioMode === 'chat-tutor' && (
        <KidsVoiceTutorChat
          defaultGrade={
            typeof selectedGrade === 'number'
              ? selectedGrade
              : activeTier === 'tieu-hoc'
              ? 3
              : activeTier === 'thcs'
              ? 7
              : 11
          }
          defaultSubject={activeSubject}
          onSpeakVi={speakWithStudioVoice}
          onSpeakEnglish={speakEnglishNative}
          viVoiceLabel={activeVoiceDisplayName}
          enVoiceLabel={activeEnVoiceMeta.label}
          onStopSpeaking={stopSpeaking}
        />
      )}

      {/* =================================================================== */}
      {/* PERSISTENT FLOATING VOICE Q&A TUTOR DRAWER (Accessible on any tab)  */}
      {/* =================================================================== */}
      {studioMode !== 'chat-tutor' && (
        <>
          {showFloatingChat ? (
            <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[440px] max-w-full shadow-2xl">
              <KidsVoiceTutorChat
                compact
                onCloseCompact={() => setShowFloatingChat(false)}
                defaultGrade={
                  typeof selectedGrade === 'number'
                    ? selectedGrade
                    : activeTier === 'tieu-hoc'
                    ? 3
                    : activeTier === 'thcs'
                    ? 7
                    : 11
                }
                defaultSubject={activeSubject}
                onSpeakVi={speakWithStudioVoice}
                onSpeakEnglish={speakEnglishNative}
                viVoiceLabel={activeVoiceDisplayName}
                enVoiceLabel={activeEnVoiceMeta.label}
                onStopSpeaking={stopSpeaking}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowFloatingChat(true)}
              className="fixed bottom-5 right-5 z-40 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-extrabold text-xs flex items-center gap-2 shadow-2xl border border-white/15 transition-all active:scale-95"
              title="Mở khung Chat & Nói trực tiếp để hỏi bài Gia sư"
            >
              <Mic className="w-4 h-4 text-amber-300" />
              <span>Hỏi Bài &amp; Nói Trực Tiếp</span>
            </button>
          )}
        </>
      )}
    </div>
  );
};
