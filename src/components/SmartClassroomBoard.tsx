import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  Mic,
  Square,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Calculator,
  Globe,
  Layers,
  Send,
  Trash2,
  Copy,
  Check,
  Loader2,
  X,
  Image as ImageIcon,
  Database,
  ExternalLink,
  HelpCircle,
  Maximize2,
  Sparkle,
} from 'lucide-react';
import { SubjectId, SUBJECTS_META } from '../data/kidsCurriculumData';
import { getApiBaseUrl } from '../utils/api';

export interface ChalkboardStep {
  stepNumber: number;
  title: string;
  content: string;
  formula?: string;
}

export interface ChalkboardLesson {
  id: string;
  boardTitle: string;
  subject: SubjectId | string;
  grade: number;
  extractedText: string;
  coreConcept?: string;
  steps: ChalkboardStep[];
  finalAnswer: string;
  teacherAdvice?: string;
  spokenExplanation: string;
  englishPhrase?: string;
  phoneticIpa?: string;
  englishExamples?: { en: string; ipa?: string; vi: string }[];
  imagePreviewUrl?: string;
  createdAt: number;
}

export interface SmartClassroomBoardProps {
  defaultGrade?: number;
  defaultSubject?: SubjectId | 'all';
  onSpeakVi: (text: string) => void;
  onSpeakEnglish: (text: string, opts?: { slow?: boolean }) => void;
  onStopSpeaking: () => void;
  viVoiceLabel: string;
  enVoiceLabel: string;
  isAudioSpeaking?: boolean;
  onShowToast: (msg: string) => void;
  onEarnReward?: (xpDelta: number, starDelta: number) => void;
}

const SAMPLE_STARTER_LESSONS: ChalkboardLesson[] = [
  {
    id: 'starter-math-1',
    boardTitle: 'Toán Lớp 4: Tìm Hai Số Khi Biết Tổng Và Hiệu',
    subject: 'toan',
    grade: 4,
    extractedText: 'Đề bài: Tổng của hai số là 120. Hiệu của hai số là 20. Tìm hai số đó.',
    coreConcept: 'Số bé = (Tổng - Hiệu) : 2  |  Số lớn = (Tổng + Hiệu) : 2',
    steps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Áp dụng công thức tìm số bé',
        content: 'Ta lấy tổng trừ đi hiệu rồi chia cho 2.',
        formula: 'Số bé = (120 - 20) : 2 = 100 : 2 = 50',
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Tìm số lớn',
        content: 'Lấy số bé cộng với hiệu (hoặc lấy tổng trừ đi số bé).',
        formula: 'Số lớn = 50 + 20 = 70 (hoặc 120 - 50 = 70)',
      },
      {
        stepNumber: 3,
        title: 'Bước 3: Thử lại kết quả',
        content: 'Kiểm tra tổng: 50 + 70 = 120 (đúng). Hiệu: 70 - 50 = 20 (đúng).',
      },
    ],
    finalAnswer: 'Đáp số: Số bé là 50; Số lớn là 70.',
    teacherAdvice: 'Em nhớ vẽ sơ đồ đoạn thẳng khi làm bài vào vở để bài giải thêm đẹp và trực quan nhé!',
    spokenExplanation:
      'Chào em! Bài toán tìm hai số khi biết tổng và hiệu là dạng toán rất quen thuộc của Lớp 4. Thầy đã trình bày ba bước giải rất gọn gàng lên bảng xanh. Em quan sát công thức số bé bằng tổng trừ hiệu chia hai, và số lớn bằng năm mươi cộng hai mươi bằng bảy mươi nhé!',
    createdAt: Date.now(),
  },
];

const CURRICULUM_QUICK_PICKS = [
  { label: '📐 Tìm X trong phép tính', subject: 'toan', prompt: 'Chỉ em cách giải bài toán tìm X: 3x + 15 = 45 từng bước' },
  { label: '🥧 Tính chu vi & diện tích hình tròn', subject: 'toan', prompt: 'Công thức và ví dụ tính diện tích hình tròn có bán kính r = 5cm' },
  { label: '🍎 Tiếng Anh giao tiếp chào hỏi', subject: 'tieng-anh', prompt: 'Dạy em 3 câu Tiếng Anh chào hỏi lịch sự và cách phát âm chuẩn bản xứ' },
  { label: '✍️ Phân biệt từ láy và từ ghép', subject: 'tieng-viet', prompt: 'Chỉ em mẹo phân biệt từ ghép và từ láy trong Tiếng Việt thật dễ nhớ' },
  { label: '⚡ Năng lượng & Ánh sáng Khoa học', subject: 'khoa-hoc', prompt: 'Giải thích hiện tượng cầu vồng xuất hiện sau cơn mưa như thế nào' },
];

export const SmartClassroomBoard: React.FC<SmartClassroomBoardProps> = ({
  defaultGrade = 4,
  defaultSubject = 'toan',
  onSpeakVi,
  onSpeakEnglish,
  onStopSpeaking,
  viVoiceLabel,
  enVoiceLabel,
  isAudioSpeaking = false,
  onShowToast,
  onEarnReward,
}) => {
  const [grade, setGrade] = useState<number>(defaultGrade);
  const [subject, setSubject] = useState<SubjectId | string>(defaultSubject === 'all' ? 'toan' : defaultSubject);
  const [lesson, setLesson] = useState<ChalkboardLesson>(SAMPLE_STARTER_LESSONS[0]);

  // Student Input & Capture State
  const [inputText, setInputText] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('Bé');
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [activeStepHighlight, setActiveStepHighlight] = useState<number | null>(null);
  const [copiedBoard, setCopiedBoard] = useState<boolean>(false);
  const [isZoomImageModalOpen, setIsZoomImageModalOpen] = useState<boolean>(false);

  // Voice Interaction State
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);
  const [micStatus, setMicStatus] = useState<string>('');
  const [micLang, setMicLang] = useState<'vi-VN' | 'en-US'>('vi-VN');
  const [autoReadBoard, setAutoReadBoard] = useState<boolean>(true);

  // Camera video ref
  const videoCameraRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Sync default grade
  useEffect(() => {
    if (defaultGrade) setGrade(defaultGrade);
  }, [defaultGrade]);

  // Clean up camera stream on unmount
  const stopCameraStream = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [stopCameraStream]);

  // Launch device camera for document snapshot
  const handleStartCamera = async () => {
    try {
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoCameraRef.current) {
          videoCameraRef.current.srcObject = stream;
          videoCameraRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      onShowToast('Không thể mở camera thiết bị. Vui lòng cấp quyền hoặc tải file ảnh lên!');
      setIsCameraActive(false);
    }
  };

  // Capture photo from live camera
  const handleSnapPhoto = () => {
    if (!videoCameraRef.current) return;
    const video = videoCameraRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setSelectedImagePreview(dataUrl);
    setSelectedImageBase64(dataUrl);
    stopCameraStream();
    onShowToast('📸 Đã chụp ảnh đề bài thành công! Nhấn "Thầy Giải Bài Lên Bảng"');
  };

  // Pick photo from file input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('Vui lòng chọn file hình ảnh (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = String(event.target?.result || '');
      setSelectedImagePreview(result);
      setSelectedImageBase64(result);
      onShowToast('📷 Đã tải ảnh tài liệu lên! Nhấn "Thầy Giải Bài Lên Bảng"');
    };
    reader.readAsDataURL(file);
  };

  // Trigger solve homework (multimodal vision + text)
  const handleSolveHomework = async (customPrompt?: string) => {
    const questionText = (customPrompt !== undefined ? customPrompt : inputText).trim();
    if (!questionText && !selectedImageBase64) {
      onShowToast('Vui lòng chụp ảnh tài liệu hoặc gõ câu hỏi cho Thầy giáo!');
      return;
    }

    onStopSpeaking();
    setIsSolving(true);
    setActiveStepHighlight(null);

    try {
      const apiBase = getApiBaseUrl();
      const endpoint = apiBase
        ? `${apiBase.replace(/\/+$/, '')}/api/kids-learning/solve-homework`
        : '/api/kids-learning/solve-homework';

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImageBase64 || undefined,
          mimeType: 'image/jpeg',
          grade,
          subject,
          prompt: questionText,
          studentName,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Máy chủ phản hồi HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const newLesson: ChalkboardLesson = {
        id: `lesson-${Date.now()}`,
        boardTitle: data.boardTitle || `Bài Tập Lớp ${grade}`,
        subject: data.subject || subject,
        grade,
        extractedText: data.extractedText || questionText || 'Đề bài từ ảnh tài liệu',
        coreConcept: data.coreConcept || '',
        steps: Array.isArray(data.steps) ? data.steps : [],
        finalAnswer: data.finalAnswer || '',
        teacherAdvice: data.teacherAdvice || '',
        spokenExplanation: data.spokenExplanation || '',
        englishPhrase: data.englishPhrase || undefined,
        phoneticIpa: data.phoneticIpa || undefined,
        englishExamples: data.englishExamples || undefined,
        imagePreviewUrl: selectedImagePreview || undefined,
        createdAt: Date.now(),
      };

      setLesson(newLesson);
      setInputText('');
      if (onEarnReward) onEarnReward(20, 1);

      onShowToast('✨ Thầy giáo đã viết lời giải hoàn chỉnh lên bảng!');

      // Automatically speak explanation if requested
      if (autoReadBoard && newLesson.spokenExplanation) {
        setTimeout(() => {
          if (newLesson.englishPhrase && newLesson.subject === 'tieng-anh') {
            onSpeakEnglish(newLesson.englishPhrase);
          } else {
            onSpeakVi(newLesson.spokenExplanation);
          }
        }, 500);
      }
    } catch (err: any) {
      onShowToast('Không thể giải bài lúc này: ' + (err?.message || 'Vui lòng thử lại'));
    } finally {
      setIsSolving(false);
    }
  };

  // Recite chalkboard steps with highlighter
  const handleReciteBoard = () => {
    if (!lesson) return;
    onStopSpeaking();

    if (lesson.englishPhrase && lesson.subject === 'tieng-anh') {
      onSpeakEnglish(lesson.englishPhrase);
      return;
    }

    if (lesson.spokenExplanation) {
      onSpeakVi(lesson.spokenExplanation);
    } else {
      const stepTexts = lesson.steps.map((s) => `${s.title}: ${s.content}`).join('. ');
      onSpeakVi(`Thầy hướng dẫn giải như sau. ${stepTexts}. ${lesson.finalAnswer}`);
    }
  };

  // Direct Voice ask to teacher
  const handleToggleVoiceMic = () => {
    if (isListeningMic) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListeningMic(false);
      setMicStatus('');
      return;
    }

    onStopSpeaking();
    const SpeechRec =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRec) {
      onShowToast('Trình duyệt chưa hỗ trợ Web Speech trực tiếp. Em hãy gõ câu hỏi vào ô nhé!');
      return;
    }

    try {
      const rec = new SpeechRec();
      recognitionRef.current = rec;
      rec.lang = micLang;
      rec.interimResults = true;
      rec.continuous = false;

      let speechText = '';
      rec.onresult = (e: any) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            speechText += e.results[i][0].transcript + ' ';
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        setInputText((speechText + interim).trim());
      };

      rec.onerror = () => {
        setIsListeningMic(false);
        setMicStatus('');
      };

      rec.onend = () => {
        setIsListeningMic(false);
        setMicStatus('');
        const finalQuery = speechText.trim();
        if (finalQuery) {
          handleSolveHomework(finalQuery);
        }
      };

      rec.start();
      setIsListeningMic(true);
      setMicStatus('🎙️ Thầy đang lắng nghe... Em nói xong thầy sẽ viết lời giải lên bảng nhé!');
    } catch {
      setIsListeningMic(false);
    }
  };

  // Copy full board content as text
  const handleCopyBoard = () => {
    if (!lesson) return;
    const textLines = [
      `📚 ${lesson.boardTitle}`,
      `📌 Đề bài: ${lesson.extractedText}`,
      lesson.coreConcept ? `💡 Công thức: ${lesson.coreConcept}` : '',
      '--- CÁC BƯỚC GIẢI ---',
      ...lesson.steps.map((s) => `${s.stepNumber}. ${s.title}\n   ${s.content}${s.formula ? `\n   ⇒ ${s.formula}` : ''}`),
      `🎯 Kết luận: ${lesson.finalAnswer}`,
      lesson.teacherAdvice ? `🌟 Lời dặn của Thầy: ${lesson.teacherAdvice}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    navigator.clipboard.writeText(textLines);
    setCopiedBoard(true);
    onShowToast('📋 Đã sao chép toàn bộ bài giải trên bảng xanh vào clipboard!');
    setTimeout(() => setCopiedBoard(false), 2000);
  };

  // Clear chalkboard
  const handleWipeBoard = () => {
    onStopSpeaking();
    setSelectedImageBase64(null);
    setSelectedImagePreview(null);
    setActiveStepHighlight(null);
    setLesson({
      id: `empty-${Date.now()}`,
      boardTitle: `Bảng Xanh Sẵn Sàng • Lớp ${grade}`,
      subject,
      grade,
      extractedText: 'Bảng trống sẵn sàng. Học sinh có thể chụp ảnh bài tập hoặc hỏi thầy bất cứ bài nào!',
      steps: [],
      finalAnswer: '',
      spokenExplanation: 'Thầy đã lau bảng sạch rồi. Em hãy tải ảnh bài tập hoặc nói câu hỏi để thầy giải nhé!',
      createdAt: Date.now(),
    });
    onShowToast('🧹 Đã lau bảng sạch sẽ!');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans animate-in fade-in pb-10">
      {/* ===================================================================== */}
      {/* TOP CONTROL BAR: Grade, Subject, Teacher Voice & Classroom Badges     */}
      {/* ===================================================================== */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 flex items-center justify-center text-amber-300 shadow-xl border border-emerald-500/40 shrink-0">
            <GraduationCap className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Lớp Học Trực Quan: Thầy Giáo &amp; Tấm Bảng Thông Minh
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase">
                Phấn Trắng Bảng Xanh
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Chụp ảnh bài tập trong sách hoặc nói trực tiếp — Thầy giáo phân tích và viết từng bước lên bảng xanh
            </p>
          </div>
        </div>

        {/* Grade & Subject Pickers */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
            <span className="text-slate-400 font-medium">Lớp:</span>
            <select
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              className="bg-transparent text-amber-300 font-bold focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g} className="bg-slate-900 text-white">
                  Lớp {g}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
            <span className="text-slate-400 font-medium">Môn:</span>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as SubjectId)}
              className="bg-transparent text-emerald-300 font-bold focus:outline-none cursor-pointer"
            >
              {SUBJECTS_META.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setAutoReadBoard(!autoReadBoard)}
            className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-all ${
              autoReadBoard
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
            title="Thầy giáo tự động giảng bài khi viết bảng xong"
          >
            <Check className={`w-3.5 h-3.5 ${autoReadBoard ? 'text-emerald-400' : 'opacity-40'}`} />
            <span>Thầy Tự Giảng</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2-COLUMN CLASSROOM: THẦY GIÁO (Left/Top) + TẤM BẢNG ĐEN (Center)       */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =================================================================== */}
        {/* LEFT COLUMN (4 cols): THẦY GIÁO & KHUNG CHAT NÓI CHUYỆN / CHỤP ẢNH   */}
        {/* =================================================================== */}
        <div className="lg:col-span-4 space-y-4">
          {/* Teacher Desk & Dialog Box */}
          <div className="rounded-3xl bg-slate-900 border border-indigo-500/30 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3.5 pb-3 border-b border-slate-800">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 p-0.5 shadow-xl">
                  <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center text-amber-300 font-black text-xl">
                    👨‍🏫
                  </div>
                </div>
                {isAudioSpeaking && (
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900" />
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-extrabold text-white">Thầy Giáo Minh Hiếu</h3>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    Gia sư
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Giọng giảng bài: <strong className="text-amber-300">{viVoiceLabel}</strong>
                </p>
                <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isSolving ? 'Đang nhìn bài và viết bảng...' : isAudioSpeaking ? 'Thầy đang giảng bài...' : 'Đang lắng nghe học sinh...'}</span>
                </div>
              </div>
            </div>

            {/* Teacher Speech Bubble */}
            <div className="relative p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs text-slate-200 leading-relaxed space-y-2">
              <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Lời Thầy Dặn Dò:</span>
                </div>
                {lesson.teacherAdvice && (
                  <span className="text-[10px] text-slate-500">Lời giải mới</span>
                )}
              </div>
              <p className="italic text-slate-300">
                "{lesson.teacherAdvice || 'Chào em! Em hãy chụp ảnh bài tập trong sách hoặc nói câu hỏi cho thầy nhé. Thầy sẽ viết lời giải từng bước rõ ràng lên bảng xanh!'}"
              </p>
              {lesson.englishPhrase && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-sky-400 font-bold block uppercase">Mẫu Tiếng Anh:</span>
                    <span className="font-bold text-white text-xs truncate block">{lesson.englishPhrase}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSpeakEnglish(lesson.englishPhrase!)}
                    className="px-2.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 shrink-0"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Giọng US/UK</span>
                  </button>
                </div>
              )}
            </div>

            {/* Document Photo Preview Box */}
            {selectedImagePreview && (
              <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-slate-950 p-2 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-emerald-300 font-bold">
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Ảnh tài liệu / bài tập đã chọn:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImagePreview(null);
                      setSelectedImageBase64(null);
                    }}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                    title="Xóa ảnh"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="relative group cursor-pointer" onClick={() => setIsZoomImageModalOpen(true)}>
                  <img
                    src={selectedImagePreview}
                    alt="Tài liệu bài tập"
                    className="w-full h-32 object-cover rounded-xl border border-slate-800 group-hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl text-white text-xs font-bold gap-1">
                    <Maximize2 className="w-4 h-4" />
                    <span>Xem phóng to</span>
                  </div>
                </div>
              </div>
            )}

            {/* Live Camera Viewfinder (if user opened camera) */}
            {isCameraActive && (
              <div className="relative rounded-2xl overflow-hidden border border-amber-500/60 bg-black p-2 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold">
                  <span>📸 Căn chỉnh bài tập vào khung hình:</span>
                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <video ref={videoCameraRef} autoPlay playsInline muted className="w-full h-44 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={handleSnapPhoto}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Bấm Chụp Ảnh Ngay</span>
                </button>
              </div>
            )}

            {/* Action Buttons: Chụp ảnh tài liệu & Tải file ảnh */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={handleStartCamera}
                className="p-2.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-amber-300 font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Chụp Ảnh Đề</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>Tải Ảnh Lên</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Microphone Listening Status */}
            {micStatus && (
              <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-medium flex items-center gap-2 animate-pulse">
                <Mic className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>{micStatus}</span>
              </div>
            )}

            {/* Input Form & Speech Button */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSolveHomework();
              }}
              className="space-y-2.5 pt-1"
            >
              <div className="relative">
                <textarea
                  rows={3}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Gõ đề bài hoặc câu hỏi bài tập cần Thầy giải..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleVoiceMic}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    isListeningMic
                      ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                  title="Nói trực tiếp với Thầy bằng Micro"
                >
                  <Mic className={`w-4 h-4 ${isListeningMic ? 'text-white' : 'text-amber-400'}`} />
                  <span className="hidden sm:inline">{isListeningMic ? 'Dừng' : 'Nói'}</span>
                </button>

                <button
                  type="submit"
                  disabled={isSolving || (!inputText.trim() && !selectedImageBase64)}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                >
                  {isSolving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Thầy Đang Viết Bảng...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Thầy Giải Bài Lên Bảng</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Curriculum Topic Buttons */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 shadow-xl space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Gợi ý bài tập nhanh theo chương trình:</span>
            </h4>
            <div className="flex flex-col gap-1.5">
              {CURRICULUM_QUICK_PICKS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSubject(q.subject);
                    setInputText(q.prompt);
                    handleSolveHomework(q.prompt);
                  }}
                  className="p-2 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800/80 text-left text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                >
                  <span className="truncate">{q.label}</span>
                  <span className="text-[10px] text-slate-500 group-hover:text-amber-400">Chọn ↵</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* RIGHT COLUMN (8 cols): TẤM BẢNG XANH VIẾT PHẤN CHÂN THỰC (Chalkboard)*/}
        {/* =================================================================== */}
        <div className="lg:col-span-8 space-y-3">
          {/* Authentic Slate Blackboard Container */}
          <div className="relative rounded-[2rem] p-3 sm:p-5 bg-gradient-to-br from-[#7a4b26] via-[#523218] to-[#361f0d] shadow-2xl border-4 border-[#3b2310]">
            {/* Inner Slate Surface with Realistic Dark Green Chalkboard Hue */}
            <div className="relative rounded-2xl bg-[#163024] border-2 border-[#0d1e16] p-5 sm:p-8 min-h-[580px] shadow-inner text-slate-100 flex flex-col justify-between overflow-hidden">
              {/* Subtle Chalk Dust Effect & Wood Trim Highlight */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage:
                    'radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#6ee7b7 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 12px 12px',
                }}
              />

              {/* Blackboard Header: Chalk Title & Subject Marker */}
              <div className="relative z-10 border-b-2 border-dashed border-emerald-600/40 pb-4 mb-5 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono tracking-widest uppercase text-amber-200/90 font-bold px-2.5 py-0.5 rounded border border-amber-300/30 bg-emerald-950/60">
                      LỚP {lesson.grade} • MÔN {String(lesson.subject).toUpperCase()}
                    </span>
                    <span className="text-[10px] text-emerald-300/80 font-mono">
                      {new Date(lesson.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  {/* Chalkboard Toolbar */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleReciteBoard}
                      className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                      title="Thầy giáo đọc bài giảng trên bảng"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Thầy Giảng Bài</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyBoard}
                      className="p-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-200 transition-colors"
                      title="Sao chép bài giải trên bảng"
                    >
                      {copiedBoard ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={handleWipeBoard}
                      className="p-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-200 transition-colors"
                      title="Lau bảng sạch"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Chalkboard Main Title (Handwriting feel) */}
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide font-serif pt-1 drop-shadow">
                  {lesson.boardTitle}
                </h1>
              </div>

              {/* Blackboard Core Content */}
              <div className="relative z-10 flex-1 space-y-5">
                {/* 1. Problem / Document Question Section */}
                <div className="p-3.5 rounded-xl bg-black/25 border border-emerald-600/30 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-300 font-mono">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                      <span>ĐỀ BÀI / CÂU HỎI:</span>
                    </span>
                    {lesson.imagePreviewUrl && (
                      <button
                        type="button"
                        onClick={() => setIsZoomImageModalOpen(true)}
                        className="text-[10px] text-emerald-300 hover:underline flex items-center gap-1"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Xem ảnh gốc</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-100 font-serif leading-relaxed whitespace-pre-line">
                    {lesson.extractedText}
                  </p>
                </div>

                {/* 2. Core Rule / Formula (Yellow Chalk Accent) */}
                {lesson.coreConcept && (
                  <div className="p-3 rounded-xl bg-amber-400/10 border-2 border-dashed border-amber-300/40 space-y-1">
                    <span className="text-[10px] font-mono tracking-wider font-extrabold text-amber-300 uppercase block">
                      💡 CÔNG THỨC &amp; QUY TẮC CỐT LÕI:
                    </span>
                    <div className="text-xs sm:text-sm font-black text-amber-200 font-mono tracking-wide">
                      {lesson.coreConcept}
                    </div>
                  </div>
                )}

                {/* 3. Step-by-Step Breakdown (White Chalk on Green Slate) */}
                {lesson.steps && lesson.steps.length > 0 && (
                  <div className="space-y-3 pt-1">
                    <div className="text-xs font-mono font-bold tracking-wider text-emerald-300 uppercase flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                      <span>CÁC BƯỚC GIẢI CHI TIẾT:</span>
                    </div>

                    <div className="space-y-2.5">
                      {lesson.steps.map((st) => {
                        const isHighlighted = activeStepHighlight === st.stepNumber;
                        return (
                          <div
                            key={st.stepNumber}
                            onClick={() => setActiveStepHighlight(st.stepNumber)}
                            className={`p-3 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                              isHighlighted
                                ? 'bg-emerald-900/60 border-cyan-400 shadow-lg shadow-cyan-500/20'
                                : 'bg-black/20 hover:bg-black/30 border-emerald-600/30'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="w-6 h-6 rounded-full bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                {st.stepNumber}
                              </span>
                              <div className="space-y-1 min-w-0 flex-1">
                                <h4 className="text-xs sm:text-sm font-bold text-amber-200 font-serif">
                                  {st.title}
                                </h4>
                                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                                  {st.content}
                                </p>
                                {st.formula && (
                                  <div className="mt-1.5 p-2 rounded-lg bg-black/40 border border-emerald-500/30 text-xs font-mono text-cyan-300 font-bold overflow-x-auto">
                                    ⇒ {st.formula}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. English Pronunciation & Native Audio Box (if English) */}
                {lesson.englishPhrase && (
                  <div className="p-3.5 rounded-xl bg-sky-950/60 border border-sky-400/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-sky-300 uppercase flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        <span>MẪU CÂU &amp; PHÁT ÂM TIẾNG ANH CHUẨN:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onSpeakEnglish(lesson.englishPhrase!)}
                        className="px-2.5 py-1 rounded-lg bg-sky-400 text-slate-950 font-bold text-[11px] flex items-center gap-1"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Đọc chuẩn</span>
                      </button>
                    </div>
                    <div className="text-sm sm:text-base font-black text-white font-sans">
                      {lesson.englishPhrase}
                    </div>
                    {lesson.phoneticIpa && (
                      <div className="text-xs font-mono text-amber-300">{lesson.phoneticIpa}</div>
                    )}
                  </div>
                )}

                {/* 5. Final Answer / Kết Luận (Green Chalk Frame) */}
                {lesson.finalAnswer && (
                  <div className="mt-4 p-3.5 rounded-xl bg-emerald-950/70 border-2 border-emerald-400/60 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono tracking-wider font-extrabold text-emerald-300 uppercase block">
                        🎯 KẾT LUẬN / ĐÁP SỐ CHÍNH XÁC:
                      </span>
                      <div className="text-xs sm:text-sm font-black text-white font-serif tracking-wide">
                        {lesson.finalAnswer}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Chalkboard Ledge (Khay Để Phấn & Bông Lau Bảng) */}
              <div className="relative z-10 pt-4 mt-6 border-t-2 border-[#1e4232] flex items-center justify-between text-[11px] text-emerald-300/80 font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-2 rounded-sm bg-white/90 shadow-sm" title="Viên phấn trắng" />
                  <span className="w-5 h-2 rounded-sm bg-amber-300 shadow-sm" title="Viên phấn vàng" />
                  <span className="w-5 h-2 rounded-sm bg-cyan-300 shadow-sm" title="Viên phấn xanh" />
                  <span className="w-8 h-3 rounded-md bg-stone-700 border border-stone-600 shadow-sm" title="Bông lau bảng" />
                </div>
                <span>Lớp Học Thông Minh • Minh Hiếu Review</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zoom Image Modal */}
      {isZoomImageModalOpen && (selectedImagePreview || lesson.imagePreviewUrl) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setIsZoomImageModalOpen(false)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl p-4 overflow-hidden flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Ảnh Đề Bài Gốc Đã Chụp / Tải Lên</span>
              <button
                type="button"
                onClick={() => setIsZoomImageModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={selectedImagePreview || lesson.imagePreviewUrl}
              alt="Ảnh phóng to"
              className="max-h-[75vh] w-auto object-contain rounded-2xl border border-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
};
