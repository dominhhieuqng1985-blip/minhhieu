import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Camera,
  Upload,
  Mic,
  Volume2,
  Play,
  Square,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Calculator,
  Globe,
  Copy,
  Check,
  Loader2,
  X,
  Image as ImageIcon,
  Maximize2,
  Music,
  Search,
  SkipBack,
  SkipForward,
  Youtube,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SubjectId, SUBJECTS_META } from '../data/kidsCurriculumData';
import { DEFAULT_VIDEOS, DEFAULT_PODCASTS } from '../data/minhhieuChannelData';
import { resolveApiEndpoint, getOptionalAiHeaders } from '../utils/api';
import {
  searchExternalYouTube,
  searchLocalCatalogWithScores,
  parseDirectYouTubeId,
  YouTubeSearchResult,
} from '../utils/youtubeSearch';
import {
  solveProblemLocally,
  parseEntertainmentCommand,
} from '../utils/smartBoardSolver';

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
  fullOriginalProblem?: string;
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

type BoardDisplayMode = 'lesson' | 'entertainment';

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
    finalAnswer: 'Kết luận: Số bé = 50 ; Số lớn = 70',
    teacherAdvice: 'Em có thể gõ phép tính (ví dụ 1 + 1), câu trắc nghiệm A, B, C, D, đề dài nhiều câu, hoặc nói "Mở nhạc lofi học bài" để giải trí ngay trên bảng nhé!',
    spokenExplanation:
      'Chào em! Trên bảng là ví dụ bài toán tìm hai số khi biết tổng và hiệu. Kết quả số bé bằng 50 và số lớn bằng 70. Em hãy đặt câu hỏi hoặc bấm qua mục Giải trí để nghe nhạc ngay trên bảng nhé!',
    createdAt: Date.now(),
  },
];

const CURRICULUM_QUICK_PICKS = [
  { label: '➕ Phép tính nhanh: 1 + 1 = ?', subject: 'toan', prompt: '1 + 1 = ?' },
  { label: '✅ Trắc nghiệm chọn đáp án đúng (A, B, C, D)', subject: 'toan', prompt: 'Kết quả của phép tính 25 × 4 - 20 bằng bao nhiêu? A. 60  B. 70  C. 80  D. 90' },
  { label: '📐 Tìm X trong phương trình: 3x + 15 = 45', subject: 'toan', prompt: 'Tìm x: 3x + 15 = 45' },
  { label: '🍎 Tiếng Anh giao tiếp & Phát âm chuẩn', subject: 'tieng-anh', prompt: 'Dạy em 3 câu Tiếng Anh chào hỏi lịch sự và cách phát âm chuẩn bản xứ' },
  { label: '✍️ Phân biệt từ láy và từ ghép Tiếng Việt', subject: 'tieng-viet', prompt: 'Chỉ em cách phân biệt từ ghép và từ láy kèm ví dụ cụ thể' },
];

const ENTERTAINMENT_QUICK_PRESETS = [
  { label: 'Nhạc Lofi Học Bài', query: 'lofi hip hop radio beats to relax study to' },
  { label: 'Nhạc Thiếu Nhi Vui Nhộn', query: 'nhạc thiếu nhi vui nhộn sôi động cho bé' },
  { label: 'Piano Không Lời Thư Giãn', query: 'nhạc piano không lời nhẹ nhàng thư giãn học bài' },
  { label: 'English Kids Songs', query: 'super simple songs kids english' },
  { label: 'Kênh Minh Hiếu Official VN', query: 'Minh Hiếu Official VN' },
];

const FALLBACK_CURATED_TRACKS: YouTubeSearchResult[] = [
  {
    youtubeId: 'jfKfPfyJRdk',
    title: 'lofi hip hop radio 📚 beats to relax/study to',
    channel: 'Lofi Girl',
    duration: 'LIVE',
    thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    source: 'catalog',
  },
  {
    youtubeId: '4Tr0otuiQuU',
    title: 'Beethoven - Moonlight Sonata ( Piano Thư Giãn Tập Trung Học Tập )',
    channel: 'Classical Music',
    duration: '15:00',
    thumbnail: 'https://i.ytimg.com/vi/4Tr0otuiQuU/hqdefault.jpg',
    source: 'catalog',
  },
  {
    youtubeId: 'e_04ZrNroTo',
    title: 'Wheels on the Bus | CoComelon Nursery Rhymes & Kids Songs',
    channel: 'CoComelon - Nursery Rhymes',
    duration: '03:49',
    thumbnail: 'https://i.ytimg.com/vi/e_04ZrNroTo/hqdefault.jpg',
    source: 'catalog',
  },
];

export const SmartClassroomBoard: React.FC<SmartClassroomBoardProps> = ({
  defaultGrade = 4,
  defaultSubject = 'toan',
  onSpeakVi,
  onSpeakEnglish,
  onStopSpeaking,
  viVoiceLabel,
  isAudioSpeaking = false,
  onShowToast,
  onEarnReward,
}) => {
  const [grade, setGrade] = useState<number>(defaultGrade);
  const [subject, setSubject] = useState<SubjectId | string>(defaultSubject === 'all' ? 'toan' : defaultSubject);
  const [lesson, setLesson] = useState<ChalkboardLesson>(SAMPLE_STARTER_LESSONS[0]);
  const [boardMode, setBoardMode] = useState<BoardDisplayMode>('lesson');

  // Student Input & Capture State
  const [inputText, setInputText] = useState<string>('');
  const [studentName] = useState<string>('em');
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [activeStepHighlight, setActiveStepHighlight] = useState<number | null>(null);
  const [copiedBoard, setCopiedBoard] = useState<boolean>(false);
  const [isZoomImageModalOpen, setIsZoomImageModalOpen] = useState<boolean>(false);
  const [showFullProblemText, setShowFullProblemText] = useState<boolean>(false);

  // Voice Interaction State (Homework Mic)
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);
  const [micStatus, setMicStatus] = useState<string>('');
  const [micLang] = useState<'vi-VN' | 'en-US'>('vi-VN');
  const [autoReadBoard, setAutoReadBoard] = useState<boolean>(true);

  // Smart Board Entertainment & YouTube Player State
  const [musicQuery, setMusicQuery] = useState<string>('');
  const [musicResults, setMusicResults] = useState<YouTubeSearchResult[]>(() => {
    const channelSeed: YouTubeSearchResult[] = DEFAULT_VIDEOS.slice(0, 4).map((v) => ({
      youtubeId: v.youtubeId,
      title: v.title,
      channel: v.channel || 'Minh Hiếu Official VN',
      duration: v.duration || '10:00',
      thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`,
      isShort: v.isShort,
      source: 'catalog',
    }));
    return [...FALLBACK_CURATED_TRACKS, ...channelSeed];
  });
  const [activeTrackIndex, setActiveTrackIndex] = useState<number | null>(null);
  const [isSearchingMusic, setIsSearchingMusic] = useState<boolean>(false);
  const [isListeningMusicMic, setIsListeningMusicMic] = useState<boolean>(false);
  const [musicStatusNote, setMusicStatusNote] = useState<string>('');

  // Refs
  const videoCameraRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const musicRecognitionRef = useRef<any>(null);
  const musicMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speakTimerRef = useRef<number | null>(null);

  // Local channel catalog for instant hybrid search (same engine as Channel Search)
  const channelCatalog = useMemo(() => {
    const list: { episode: any; type: 'video' | 'podcast' }[] = [];
    const seen = new Set<string>();
    for (const v of DEFAULT_VIDEOS) {
      if (!seen.has(v.youtubeId)) {
        seen.add(v.youtubeId);
        list.push({ episode: v, type: 'video' });
      }
    }
    for (const p of DEFAULT_PODCASTS) {
      if (!seen.has(p.youtubeId)) {
        seen.add(p.youtubeId);
        list.push({ episode: p, type: 'podcast' });
      }
    }
    return list;
  }, []);

  useEffect(() => {
    if (defaultGrade) setGrade(defaultGrade);
  }, [defaultGrade]);

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
      if (speakTimerRef.current) {
        window.clearTimeout(speakTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (musicRecognitionRef.current) {
        try {
          musicRecognitionRef.current.stop();
        } catch {}
      }
      if (musicMediaRecorderRef.current && musicMediaRecorderRef.current.state !== 'inactive') {
        try {
          musicMediaRecorderRef.current.stop();
        } catch {}
      }
    };
  }, [stopCameraStream]);

  // =========================================================================
  // ENTERTAINMENT YOUTUBE SEARCH & DEDICATED BOARD PLAYER
  // =========================================================================
  const handleSearchAndPlayEntertainment = useCallback(
    async (rawSearchTerm?: string, shouldAutoPlayFirst = true) => {
      const q = (rawSearchTerm !== undefined ? rawSearchTerm : musicQuery).trim();
      if (!q) {
        onShowToast('Vui lòng nhập tên bài hát, ca sĩ hoặc nói tên bản nhạc cần tìm!');
        return;
      }

      onStopSpeaking();
      setBoardMode('entertainment');
      setMusicQuery(q);
      setIsSearchingMusic(true);
      setMusicStatusNote(`Đang tìm "${q}" trên YouTube & Kênh...`);

      try {
        // 1. Direct YouTube ID/URL check
        const directId = parseDirectYouTubeId(q);
        if (directId) {
          const directItem: YouTubeSearchResult = {
            youtubeId: directId,
            title: `Bản nhạc / Video YouTube [${directId}]`,
            channel: 'Phát Trực Tiếp Trên Bảng',
            duration: 'Trực tiếp',
            thumbnail: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
            source: 'direct',
          };
          setMusicResults((prev) => [
            directItem,
            ...prev.filter((item) => item.youtubeId !== directId),
          ]);
          setActiveTrackIndex(0);
          setMusicStatusNote('');
          onShowToast('🎵 Đang phát trực tiếp video YouTube ngay trên tấm bảng!');
          return;
        }

        // 2. Instant Channel Catalog matches + Global YouTube search in parallel
        const localMatches = searchLocalCatalogWithScores(q, channelCatalog)
          .slice(0, 8)
          .map((m) => ({
            youtubeId: m.episode.youtubeId,
            title: m.episode.title,
            channel: m.episode.channel || 'Minh Hiếu Official VN',
            duration: m.episode.duration || '10:00',
            thumbnail:
              m.episode.thumbnail || `https://i.ytimg.com/vi/${m.episode.youtubeId}/hqdefault.jpg`,
            isShort: m.episode.isShort,
            source: 'catalog' as const,
          }));

        const { results: extResults } = await searchExternalYouTube(q);

        // Combine external YouTube results first (for general music queries), deduplicating by youtubeId
        const queryLooksLikeChannel = /minh\s*hiếu|minhhieu|xuyên\s*không|review\s*phim/i.test(q);
        const orderedRaw = queryLooksLikeChannel
          ? [...localMatches, ...extResults]
          : [...extResults, ...localMatches];

        const seen = new Set<string>();
        const combined: YouTubeSearchResult[] = [];
        for (const item of orderedRaw) {
          if (!item.youtubeId || seen.has(item.youtubeId)) continue;
          seen.add(item.youtubeId);
          combined.push(item);
        }

        if (combined.length > 0) {
          setMusicResults(combined);
          if (shouldAutoPlayFirst) {
            setActiveTrackIndex(0);
            onShowToast(`🎵 Đang phát trên bảng: "${combined[0].title}"`);
          }
          setMusicStatusNote('');
        } else {
          setMusicStatusNote(
            'Không tìm thấy kết quả trùng khớp. Bạn có thể thử từ khóa khác hoặc dán link YouTube trực tiếp!'
          );
        }
      } catch {
        setMusicStatusNote('Kết nối tìm kiếm đang bận. Bạn có thể chọn nhạc gợi ý hoặc dán link YouTube!');
      } finally {
        setIsSearchingMusic(false);
      }
    },
    [musicQuery, channelCatalog, onStopSpeaking, onShowToast]
  );

  // Voice Search specifically for Entertainment / YouTube Music
  const handleToggleMusicVoiceSearch = () => {
    if (isListeningMusicMic) {
      if (musicRecognitionRef.current) {
        try {
          musicRecognitionRef.current.stop();
        } catch {}
      }
      if (musicMediaRecorderRef.current && musicMediaRecorderRef.current.state !== 'inactive') {
        try {
          musicMediaRecorderRef.current.stop();
        } catch {}
      }
      setIsListeningMusicMic(false);
      setMusicStatusNote('');
      return;
    }

    onStopSpeaking();
    setBoardMode('entertainment');

    const SpeechRec =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        musicRecognitionRef.current = rec;
        rec.lang = 'vi-VN';
        rec.interimResults = true;
        rec.continuous = false;

        let captured = '';
        rec.onresult = (e: any) => {
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) {
              captured += e.results[i][0].transcript + ' ';
            } else {
              interim += e.results[i][0].transcript;
            }
          }
          setMusicQuery((captured + interim).trim());
        };

        rec.onerror = () => {
          setIsListeningMusicMic(false);
          setMusicStatusNote('');
        };

        rec.onend = () => {
          setIsListeningMusicMic(false);
          const rawSpoken = captured.trim();
          if (rawSpoken) {
            const cmd = parseEntertainmentCommand(rawSpoken);
            const cleanSongQuery = cmd.isEntertainment ? cmd.query : rawSpoken;
            handleSearchAndPlayEntertainment(cleanSongQuery, true);
          } else {
            setMusicStatusNote('');
          }
        };

        rec.start();
        setIsListeningMusicMic(true);
        setMusicStatusNote('🎙️ Đang nghe tên bài hát hoặc ca sĩ... Nói xong sẽ tự động tìm và phát trên bảng!');
        return;
      } catch {}
    }

    // Fallback: MediaRecorder -> /api/kids-learning/transcribe
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const chunks: Blob[] = [];
        const recorder = new MediaRecorder(stream);
        musicMediaRecorderRef.current = recorder;

        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) chunks.push(ev.data);
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          if (blob.size < 250) {
            setIsListeningMusicMic(false);
            return;
          }
          setMusicStatusNote('Đang nhận diện tên bài hát vừa nói...');
          try {
            const base64Audio = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const s = String(reader.result || '');
                const idx = s.indexOf(',');
                resolve(idx >= 0 ? s.slice(idx + 1) : s);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            const resp = await fetch(resolveApiEndpoint('kids-learning/transcribe'), {
              method: 'POST',
              headers: getOptionalAiHeaders(),
              body: JSON.stringify({
                audioBase64: base64Audio,
                mimeType: blob.type || 'audio/webm',
                language: 'vi-VN',
              }),
            });
            const data = await resp.json();
            if (resp.ok && data?.transcript) {
              const spoken = String(data.transcript).trim();
              const cmd = parseEntertainmentCommand(spoken);
              handleSearchAndPlayEntertainment(cmd.isEntertainment ? cmd.query : spoken, true);
            } else {
              setMusicStatusNote('Chưa nghe rõ tên bài hát, vui lòng thử lại hoặc gõ từ khóa.');
            }
          } catch {
            setMusicStatusNote('Không thể nhận diện giọng nói lúc này, vui lòng gõ tên bài hát.');
          } finally {
            setIsListeningMusicMic(false);
          }
        };

        recorder.start();
        setIsListeningMusicMic(true);
        setMusicStatusNote('🎙️ Hãy nói tên bài hát yêu thích — nhấn nút Dừng khi nói xong!');
      } catch {
        onShowToast('Vui lòng cấp quyền Micro trên trình duyệt hoặc gõ tên bài hát vào ô tìm kiếm!');
        setIsListeningMusicMic(false);
      }
    })();
  };

  // =========================================================================
  // CAMERA & FILE SNAPSHOT FOR HOMEWORK
  // =========================================================================
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
    onShowToast('Đã chụp ảnh đề bài! Nhấn "Thầy Giải Bài Lên Bảng" để phân tích.');
  };

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
      onShowToast('Đã tải ảnh đề bài! Nhấn "Thầy Giải Bài Lên Bảng" để xem kết quả.');
    };
    reader.readAsDataURL(file);
  };

  // Non-blocking asynchronous voice trigger so TTS latency NEVER delays board rendering
  const scheduleBoardVoiceExplanation = useCallback(
    (targetLesson: ChalkboardLesson) => {
      if (!autoReadBoard) return;
      if (speakTimerRef.current) {
        window.clearTimeout(speakTimerRef.current);
      }
      speakTimerRef.current = window.setTimeout(() => {
        if (targetLesson.englishPhrase && targetLesson.subject === 'tieng-anh') {
          onSpeakEnglish(targetLesson.englishPhrase);
        } else if (targetLesson.spokenExplanation) {
          onSpeakVi(targetLesson.spokenExplanation);
        }
      }, 60);
    },
    [autoReadBoard, onSpeakEnglish, onSpeakVi]
  );

  // =========================================================================
  // SOLVE HOMEWORK OR EXECUTE ENTERTAINMENT COMMAND (INSTANT BOARD DISPLAY)
  // =========================================================================
  const handleSolveHomework = async (customPrompt?: string) => {
    const questionText = (customPrompt !== undefined ? customPrompt : inputText).trim();
    if (!questionText && !selectedImageBase64) {
      onShowToast('Vui lòng chụp ảnh tài liệu, gõ đề bài hoặc đọc câu lệnh giải trí!');
      return;
    }

    // 1. Check if the input is an entertainment / music command (e.g., "Mở nhạc ...", YouTube URL)
    if (!selectedImageBase64 && questionText) {
      const musicCmd = parseEntertainmentCommand(questionText);
      if (musicCmd.isEntertainment) {
        setInputText('');
        await handleSearchAndPlayEntertainment(musicCmd.query, musicCmd.autoPlay);
        return;
      }
    }

    onStopSpeaking();
    setActiveTrackIndex(null); // Pause YouTube player if playing so student focuses on lesson
    setBoardMode('lesson');
    setActiveStepHighlight(null);
    setShowFullProblemText(false);

    // 2. ZERO-LATENCY DETERMINISTIC FAST-PATH (< 2ms instant chalkboard answer!)
    // Handles arithmetic (e.g. 1 + 1 = 2), equations (3x + 15 = 45, quadratics), percentages,
    // classic geometry/word problems, and math multiple-choice (A, B, C, D) immediately!
    if (!selectedImageBase64 && questionText) {
      const instantLocal = solveProblemLocally({
        prompt: questionText,
        grade,
        subject: String(subject),
        studentName,
      });

      if (instantLocal.isExactDeterministic) {
        const instantLesson: ChalkboardLesson = {
          id: `lesson-instant-${Date.now()}`,
          boardTitle: instantLocal.boardTitle,
          subject: instantLocal.subject || subject,
          grade,
          extractedText: instantLocal.extractedText,
          fullOriginalProblem: questionText.length > 350 ? questionText : undefined,
          coreConcept: instantLocal.coreConcept,
          steps: instantLocal.steps,
          finalAnswer: instantLocal.finalAnswer,
          teacherAdvice: instantLocal.teacherAdvice,
          spokenExplanation: instantLocal.spokenExplanation,
          createdAt: Date.now(),
        };

        // Commit to board IMMEDIATELY (0ms network wait!)
        setLesson(instantLesson);
        setInputText('');
        setIsSolving(false);
        if (onEarnReward) onEarnReward(20, 1);

        // Trigger speech asynchronously in the background
        scheduleBoardVoiceExplanation(instantLesson);

        // Background log to server if online (fire-and-forget)
        fetch(resolveApiEndpoint('kids-learning/solve-homework'), {
          method: 'POST',
          headers: getOptionalAiHeaders(),
          body: JSON.stringify({
            grade,
            subject,
            prompt: questionText,
            studentName,
          }),
        }).catch(() => {});
        return;
      }
    }

    // 3. MULTIMODAL VISION / COMPLEX WORD PROBLEM / LONG MULTI-PART EXAM VIA SERVER AI
    setIsSolving(true);

    // Immediately show the student's actual problem on the chalkboard while computing (never leave stale sample!)
    setLesson({
      id: `solving-${Date.now()}`,
      boardTitle: `Đang Phân Tích & Giải Bài • Lớp ${grade}`,
      subject,
      grade,
      extractedText:
        questionText.length > 420
          ? `${questionText.slice(0, 420)}...`
          : questionText || 'Đang nhận diện chữ và dữ kiện từ ảnh chụp đề bài...',
      fullOriginalProblem: questionText.length > 420 ? questionText : undefined,
      coreConcept: 'Đang kiểm tra dữ kiện và tính toán kết quả chính xác...',
      steps: [],
      finalAnswer: '',
      spokenExplanation: '',
      imagePreviewUrl: selectedImagePreview || undefined,
      createdAt: Date.now(),
    });

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 28000);

      const endpoint = resolveApiEndpoint('kids-learning/solve-homework');
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: getOptionalAiHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          imageBase64: selectedImageBase64 || undefined,
          mimeType: 'image/jpeg',
          grade,
          subject,
          prompt: questionText,
          studentName,
        }),
      });
      window.clearTimeout(timeoutId);

      const contentType = resp.headers.get('content-type') || '';
      if (!resp.ok || contentType.includes('text/html')) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const newLesson: ChalkboardLesson = {
        id: `lesson-${Date.now()}`,
        boardTitle: data.boardTitle || `Bài Giải Chi Tiết • Lớp ${grade}`,
        subject: data.subject || subject,
        grade,
        extractedText:
          data.extractedText ||
          (questionText.length > 450 ? `${questionText.slice(0, 450)}...` : questionText) ||
          'Đề bài từ ảnh tài liệu',
        fullOriginalProblem: questionText.length > 450 ? questionText : undefined,
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

      // Render onto chalkboard IMMEDIATELY before starting any TTS synthesis
      setLesson(newLesson);
      setIsSolving(false);
      setInputText('');
      if (onEarnReward) onEarnReward(20, 1);

      scheduleBoardVoiceExplanation(newLesson);
    } catch {
      // Resilient Offline / GitHub Pages Cold-Start Fallback using local analyzer
      const fallbackSolved = solveProblemLocally({
        prompt: questionText,
        grade,
        subject: String(subject),
        studentName,
      });

      const fallbackLesson: ChalkboardLesson = {
        id: `lesson-local-${Date.now()}`,
        boardTitle: fallbackSolved.boardTitle,
        subject: fallbackSolved.subject || subject,
        grade,
        extractedText:
          fallbackSolved.extractedText.length > 450
            ? `${fallbackSolved.extractedText.slice(0, 450)}...`
            : fallbackSolved.extractedText,
        fullOriginalProblem: questionText.length > 450 ? questionText : undefined,
        coreConcept: fallbackSolved.coreConcept,
        steps: fallbackSolved.steps,
        finalAnswer: fallbackSolved.finalAnswer,
        teacherAdvice: fallbackSolved.teacherAdvice,
        spokenExplanation: fallbackSolved.spokenExplanation,
        imagePreviewUrl: selectedImagePreview || undefined,
        createdAt: Date.now(),
      };

      setLesson(fallbackLesson);
      setIsSolving(false);
      if (fallbackSolved.isExactDeterministic) {
        setInputText('');
        scheduleBoardVoiceExplanation(fallbackLesson);
      } else {
        onShowToast('Máy chủ AI đang khởi động kết nối — vui lòng bấm Giải lại sau vài giây cho câu hỏi tự luận dài!');
      }
    }
  };

  // Recite chalkboard steps manually
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
      onSpeakVi(`${stepTexts}. ${lesson.finalAnswer}`);
    }
  };

  // Direct Voice ask to teacher (supports both homework questions AND voice commands like "Mở nhạc...")
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
      onShowToast('Trình duyệt chưa hỗ trợ Web Speech trực tiếp. Hãy gõ câu hỏi vào ô bên dưới!');
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
      setMicStatus('🎙️ Đang nghe... Em có thể đọc phép tính, câu hỏi bài tập hoặc nói "Mở nhạc..."!');
    } catch {
      setIsListeningMic(false);
    }
  };

  // Copy full board content as text
  const handleCopyBoard = () => {
    if (!lesson) return;
    const textLines = [
      `${lesson.boardTitle}`,
      `Đề bài: ${lesson.fullOriginalProblem || lesson.extractedText}`,
      lesson.coreConcept ? `Công thức / Quy tắc: ${lesson.coreConcept}` : '',
      '--- PHÂN TÍCH CÁC BƯỚC GIẢI ---',
      ...lesson.steps.map(
        (s) => `${s.stepNumber}. ${s.title}\n   ${s.content}${s.formula ? `\n   => ${s.formula}` : ''}`
      ),
      `KẾT LUẬN / ĐÁP ÁN: ${lesson.finalAnswer}`,
      lesson.teacherAdvice ? `Ghi chú: ${lesson.teacherAdvice}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    navigator.clipboard.writeText(textLines);
    setCopiedBoard(true);
    onShowToast('Đã sao chép toàn bộ bài giải và kết quả trên bảng!');
    setTimeout(() => setCopiedBoard(false), 2000);
  };

  // Clear chalkboard
  const handleWipeBoard = () => {
    onStopSpeaking();
    setSelectedImageBase64(null);
    setSelectedImagePreview(null);
    setActiveStepHighlight(null);
    setShowFullProblemText(false);
    setLesson({
      id: `empty-${Date.now()}`,
      boardTitle: `Bảng Xanh Sẵn Sàng • Lớp ${grade}`,
      subject,
      grade,
      extractedText:
        'Bảng trống sẵn sàng. Học sinh có thể nhập phép tính, câu trắc nghiệm A-B-C-D, dán đề bài dài hoặc chụp ảnh tài liệu để xem kết quả ngay lập tức!',
      steps: [],
      finalAnswer: '',
      spokenExplanation: 'Thầy đã lau bảng sạch rồi. Em hãy gửi đề bài cần giải nhé!',
      createdAt: Date.now(),
    });
    onShowToast('Đã lau sạch bảng xanh!');
  };

  const activeTrack =
    activeTrackIndex !== null && musicResults[activeTrackIndex]
      ? musicResults[activeTrackIndex]
      : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans animate-in fade-in pb-10">
      {/* ===================================================================== */}
      {/* TOP CONTROL BAR: Grade, Subject, Mode Switcher & Voice Toggle         */}
      {/* ===================================================================== */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 flex items-center justify-center text-amber-300 shadow-xl border border-emerald-500/40 shrink-0">
            <GraduationCap className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
              Lớp Học Trực Quan: Thầy Giáo &amp; Tấm Bảng Thông Minh
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Phân tích rõ từng bước &amp; chốt đáp án ngay lập tức trên bảng — tích hợp trình phát nhạc giải trí YouTube
            </p>
          </div>
        </div>

        {/* Grade, Subject & Auto-Voice Controls */}
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
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
            title="Bật/tắt giọng đọc sau khi kết quả hiện lên bảng"
          >
            <Check className={`w-3.5 h-3.5 ${autoReadBoard ? 'text-emerald-400' : 'opacity-40'}`} />
            <span>Thầy Tự Giảng</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2-COLUMN CLASSROOM: THẦY GIÁO (Left) + TẤM BẢNG THÔNG MINH (Right)    */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =================================================================== */}
        {/* LEFT COLUMN (4 cols): THẦY GIÁO & NHẬP ĐỀ / CÂU LỆNH / CHỤP ẢNH     */}
        {/* =================================================================== */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3.5 pb-3 border-b border-slate-800">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-600 p-0.5 shadow-xl shrink-0">
                <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center text-amber-300 font-black text-xl px-3 py-2.5">
                  👨‍🏫
                </div>
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-sm font-extrabold text-white truncate">Thầy Giáo Minh Hiếu</h3>
                <p className="text-[11px] text-slate-400 truncate">
                  Giọng đọc: <strong className="text-amber-300">{viVoiceLabel}</strong>
                </p>
                <p className="text-[11px] text-emerald-400 font-medium truncate">
                  {isSolving
                    ? 'Đang phân tích đề & viết đáp án...'
                    : isAudioSpeaking
                    ? 'Đang đọc lời giảng (đáp án đã có trên bảng)'
                    : boardMode === 'entertainment'
                    ? 'Đang mở chế độ Giải trí trên bảng'
                    : 'Sẵn sàng giải bài & nhận câu lệnh'}
                </p>
              </div>
            </div>

            {/* Teacher Advice Box */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs text-slate-200 leading-relaxed space-y-2">
              <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ghi chú của Thầy:</span>
                </span>
                {isAudioSpeaking && (
                  <button
                    type="button"
                    onClick={onStopSpeaking}
                    className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-[10px] font-bold flex items-center gap-1"
                  >
                    <Square className="w-2.5 h-2.5 fill-current" />
                    <span>Dừng đọc</span>
                  </button>
                )}
              </div>
              <p className="text-slate-300">
                {lesson.teacherAdvice ||
                  'Nhập phép tính, bài trắc nghiệm A-B-C-D, dán đề bài dài hoặc gõ câu lệnh "Mở nhạc..." để phát nhạc ngay trên tấm bảng!'}
              </p>
            </div>

            {/* Selected Homework Photo Preview */}
            {selectedImagePreview && (
              <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-slate-950 p-2 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-emerald-300 font-bold">
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Ảnh đề bài đã đính kèm:</span>
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
                <div
                  className="relative group cursor-pointer"
                  onClick={() => setIsZoomImageModalOpen(true)}
                >
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

            {/* Live Camera Viewfinder */}
            {isCameraActive && (
              <div className="relative rounded-2xl overflow-hidden border border-amber-500/60 bg-black p-2 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold">
                  <span>Căn chỉnh đề bài vào khung hình:</span>
                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <video
                  ref={videoCameraRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-44 object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={handleSnapPhoto}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Chụp Ảnh Đề Bài</span>
                </button>
              </div>
            )}

            {/* Camera & Upload Buttons */}
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
              <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-[11px] font-medium flex items-center gap-2">
                <Mic className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>{micStatus}</span>
              </div>
            )}

            {/* Homework / Command Input Form (Supports very long problems up to 24,000 chars) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSolveHomework();
              }}
              className="space-y-2.5 pt-1"
            >
              <div className="space-y-1">
                <textarea
                  rows={inputText.length > 260 ? 6 : 4}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder='Nhập đề bài (VD: 1 + 1, câu trắc nghiệm A B C D, đề thi dài nhiều câu...) hoặc gõ lệnh "Mở nhạc lofi học bài"...'
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-y max-h-64"
                />
                {inputText.length > 0 && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                    <span>
                      {inputText.length > 500
                        ? `Đề dài (${inputText.length.toLocaleString('vi-VN')} ký tự) — Tự động phân tách từng ý`
                        : `${inputText.length} ký tự`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setInputText('')}
                      className="text-slate-400 hover:text-white underline"
                    >
                      Xóa ô nhập
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleVoiceMic}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    isListeningMic
                      ? 'bg-rose-600 text-white border-rose-400'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                  title="Nói câu hỏi bài tập hoặc đọc lệnh Mở nhạc..."
                >
                  <Mic className={`w-4 h-4 ${isListeningMic ? 'text-white' : 'text-amber-400'}`} />
                  <span>{isListeningMic ? 'Dừng' : 'Nói'}</span>
                </button>

                <button
                  type="submit"
                  disabled={isSolving || (!inputText.trim() && !selectedImageBase64)}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                >
                  {isSolving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Đang Tính Kết Quả...</span>
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

          {/* Sample Quick Questions & Voice Command Examples */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 shadow-xl space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Thử nhanh bài mẫu &amp; tiết mục giải trí:</span>
            </h4>
            <div className="flex flex-col gap-1.5">
              {CURRICULUM_QUICK_PICKS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSubject(q.subject);
                    handleSolveHomework(q.prompt);
                  }}
                  className="p-2 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800/80 text-left text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                >
                  <span className="truncate">{q.label}</span>
                  <span className="text-[10px] text-slate-500 group-hover:text-amber-400 shrink-0 ml-2">
                    Giải ngay →
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setBoardMode('entertainment');
                  if (activeTrackIndex === null && musicResults.length > 0) {
                    setActiveTrackIndex(0);
                  }
                }}
                className="p-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-left text-xs text-rose-200 hover:text-white transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5 font-bold truncate">
                  <Music className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>Tiết mục giải trí: Mở trình phát nhạc YouTube trên bảng</span>
                </span>
                <span className="text-[10px] text-amber-300 font-bold shrink-0 ml-2">Mở ↵</span>
              </button>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* RIGHT COLUMN (8 cols): TẤM BẢNG THÔNG MINH (BÀI GIẢI & GIẢI TRÍ)    */}
        {/* =================================================================== */}
        <div className="lg:col-span-8 space-y-3">
          {/* Wooden Framed Slate Blackboard */}
          <div className="relative rounded-[2rem] p-3 sm:p-5 bg-gradient-to-br from-[#7a4b26] via-[#523218] to-[#361f0d] shadow-2xl border-4 border-[#3b2310]">
            <div className="relative rounded-2xl bg-[#163024] border-2 border-[#0d1e16] p-4 sm:p-7 min-h-[600px] shadow-inner text-slate-100 flex flex-col justify-between overflow-hidden">
              {/* Subtle Chalk Texture */}
              <div
                className="absolute inset-0 pointer-events-none opacity-15"
                style={{
                  backgroundImage:
                    'radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#6ee7b7 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 12px 12px',
                }}
              />

              {/* ============================================================= */}
              {/* SMART BOARD MODE BAR: BẢNG GIẢI BÀI TẬP vs GIẢI TRÍ YOUTUBE    */}
              {/* ============================================================= */}
              <div className="relative z-10 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-emerald-700/50">
                  <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/35 border border-emerald-700/40">
                    <button
                      type="button"
                      onClick={() => setBoardMode('lesson')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                        boardMode === 'lesson'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-emerald-100/80 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Bảng Giải Bài Tập</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onStopSpeaking();
                        setBoardMode('entertainment');
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                        boardMode === 'entertainment'
                          ? 'bg-amber-400 text-slate-950 shadow-md'
                          : 'text-amber-200/90 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Music className="w-3.5 h-3.5" />
                      <span>Giải Trí &amp; Nhạc YouTube</span>
                      {activeTrack && boardMode !== 'entertainment' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500 text-white font-bold">
                          Đang mở
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Lesson Board Action Buttons */}
                  {boardMode === 'lesson' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleReciteBoard}
                        className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                        title="Đọc lời giảng cho bài trên bảng"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Đọc Lời Giảng</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyBoard}
                        className="p-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-200 transition-colors"
                        title="Sao chép lời giải và đáp án"
                      >
                        {copiedBoard ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleWipeBoard}
                        className="p-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-200 transition-colors"
                        title="Lau sạch bảng"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* =========================================================== */}
                {/* VIEW 1: LESSON CHALKBOARD (INSTANT STEP-BY-STEP & RESULT)   */}
                {/* =========================================================== */}
                {boardMode === 'lesson' && (
                  <div className="space-y-4 animate-in fade-in">
                    {/* Title & Grade Meta */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-mono tracking-wider uppercase text-amber-200/90 font-bold">
                        LỚP {lesson.grade} • MÔN {String(lesson.subject).toUpperCase()}
                      </div>
                      <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide font-serif">
                        {lesson.boardTitle}
                      </h1>
                    </div>

                    {/* INSTANT HIGH-VISIBILITY FINAL RESULT BANNER AT TOP OF BOARD */}
                    {lesson.finalAnswer && (
                      <div className="p-4 rounded-2xl bg-emerald-950/90 border-2 border-amber-300 shadow-lg flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-amber-300 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <span className="text-[11px] font-mono tracking-wider font-extrabold text-amber-300 uppercase block">
                            KẾT QUẢ / ĐÁP ÁN CHÍNH XÁC:
                          </span>
                          <div className="text-base sm:text-lg font-black text-white tracking-wide break-words">
                            {lesson.finalAnswer}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Loading Skeleton when solving complex/photo homework */}
                    {isSolving && (
                      <div className="p-4 rounded-2xl bg-emerald-950/70 border border-amber-400/50 flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-amber-300 animate-spin shrink-0" />
                        <div className="text-xs sm:text-sm text-amber-100 font-semibold">
                          Đang phân tích dữ kiện đề bài và tính kết quả chính xác lên bảng...
                        </div>
                      </div>
                    )}

                    {/* 1. Problem Statement Box (with Expand/Collapse for Very Long Exams) */}
                    <div className="p-3.5 rounded-xl bg-black/25 border border-emerald-600/30 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs font-bold text-amber-300 font-mono">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                          <span>ĐỀ BÀI / CÂU HỎI:</span>
                        </span>
                        <div className="flex items-center gap-3">
                          {lesson.fullOriginalProblem && (
                            <button
                              type="button"
                              onClick={() => setShowFullProblemText(!showFullProblemText)}
                              className="text-[11px] text-amber-200 hover:text-white flex items-center gap-1 font-sans font-bold"
                            >
                              {showFullProblemText ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                  <span>Thu gọn đề dài</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                  <span>
                                    Xem trọn đề gốc ({lesson.fullOriginalProblem.length.toLocaleString('vi-VN')} ký tự)
                                  </span>
                                </>
                              )}
                            </button>
                          )}
                          {lesson.imagePreviewUrl && (
                            <button
                              type="button"
                              onClick={() => setIsZoomImageModalOpen(true)}
                              className="text-[11px] text-emerald-300 hover:underline flex items-center gap-1 font-sans"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>Ảnh gốc</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div
                        className={`text-xs sm:text-sm text-slate-100 font-serif leading-relaxed whitespace-pre-line ${
                          showFullProblemText ? 'max-h-72 overflow-y-auto pr-2' : ''
                        }`}
                      >
                        {showFullProblemText && lesson.fullOriginalProblem
                          ? lesson.fullOriginalProblem
                          : lesson.extractedText}
                      </div>
                    </div>

                    {/* 2. Core Formula / Method */}
                    {lesson.coreConcept && (
                      <div className="p-3 rounded-xl bg-amber-400/10 border border-dashed border-amber-300/40 space-y-1">
                        <span className="text-[10px] font-mono tracking-wider font-extrabold text-amber-300 uppercase block">
                          PHƯƠNG PHÁP &amp; CÔNG THỨC ÁP DỤNG:
                        </span>
                        <div className="text-xs sm:text-sm font-bold text-amber-100 font-mono">
                          {lesson.coreConcept}
                        </div>
                      </div>
                    )}

                    {/* 3. Step-by-Step Analysis */}
                    {lesson.steps && lesson.steps.length > 0 && (
                      <div className="space-y-2.5 pt-1">
                        <div className="text-xs font-mono font-bold tracking-wider text-emerald-300 uppercase flex items-center gap-1.5">
                          <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                          <span>PHÂN TÍCH &amp; CÁC BƯỚC GIẢI RÕ RÀNG:</span>
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
                                    ? 'bg-emerald-900/60 border-cyan-400 shadow-lg'
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
                                    <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-sans">
                                      {st.content}
                                    </p>
                                    {st.formula && (
                                      <div className="mt-1.5 p-2.5 rounded-lg bg-black/45 border border-emerald-500/30 text-xs sm:text-sm font-mono text-cyan-200 font-bold overflow-x-auto">
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

                    {/* 4. English Pronunciation Box (when applicable) */}
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
                            <span>Phát âm chuẩn</span>
                          </button>
                        </div>
                        <div className="text-sm sm:text-base font-black text-white">
                          {lesson.englishPhrase}
                        </div>
                        {lesson.phoneticIpa && (
                          <div className="text-xs font-mono text-amber-300">{lesson.phoneticIpa}</div>
                        )}
                      </div>
                    )}

                    {/* 5. Bottom Final Conclusion Confirmation */}
                    {lesson.finalAnswer && lesson.steps.length >= 2 && (
                      <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-400/60 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono tracking-wider font-extrabold text-emerald-300 uppercase block">
                            CHỐT KẾT LUẬN CUỐI CÙNG:
                          </span>
                          <div className="text-sm font-black text-white tracking-wide">
                            {lesson.finalAnswer}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* =========================================================== */}
                {/* VIEW 2: DEDICATED YOUTUBE ENTERTAINMENT PLAYER ON THE BOARD */}
                {/* =========================================================== */}
                {boardMode === 'entertainment' && (
                  <div className="space-y-4 animate-in fade-in">
                    {/* Search Bar (Text + Voice Mic + Channel/YouTube Search) */}
                    <div className="p-3.5 rounded-2xl bg-black/35 border border-emerald-600/40 space-y-3">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSearchAndPlayEntertainment(musicQuery, true);
                        }}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                      >
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-emerald-300/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={musicQuery}
                            onChange={(e) => setMusicQuery(e.target.value)}
                            placeholder="Tìm bản nhạc yêu thích trên YouTube, video kênh hoặc dán link..."
                            className="w-full bg-slate-950/90 border border-emerald-600/40 rounded-xl pl-10 pr-8 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                          />
                          {musicQuery && (
                            <button
                              type="button"
                              onClick={() => setMusicQuery('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleToggleMusicVoiceSearch}
                            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                              isListeningMusicMic
                                ? 'bg-rose-600 border-rose-400 text-white'
                                : 'bg-slate-950/90 hover:bg-slate-900 border-emerald-600/40 text-amber-300'
                            }`}
                            title="Tìm bài hát trên YouTube bằng giọng nói"
                          >
                            <Mic className="w-4 h-4" />
                            <span>{isListeningMusicMic ? 'Đang nghe...' : 'Tìm Giọng Nói'}</span>
                          </button>

                          <button
                            type="submit"
                            disabled={isSearchingMusic || !musicQuery.trim()}
                            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all"
                          >
                            {isSearchingMusic ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Youtube className="w-4 h-4" />
                            )}
                            <span>Tìm &amp; Phát</span>
                          </button>
                        </div>
                      </form>

                      {/* Quick Entertainment Genre Chips */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ENTERTAINMENT_QUICK_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => handleSearchAndPlayEntertainment(preset.query, true)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-800/80 border border-emerald-600/30 text-[11px] text-emerald-100 font-medium transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {musicStatusNote && (
                        <div className="text-xs text-amber-200 font-medium flex items-center gap-2 pt-0.5">
                          {isSearchingMusic && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                          <span>{musicStatusNote}</span>
                        </div>
                      )}
                    </div>

                    {/* Dedicated Smart Board Embedded YouTube Player */}
                    {activeTrack ? (
                      <div className="rounded-2xl overflow-hidden bg-slate-950 border-2 border-amber-400/50 shadow-2xl">
                        <div className="relative w-full aspect-video bg-black">
                          <iframe
                            key={activeTrack.youtubeId}
                            src={`https://www.youtube.com/embed/${activeTrack.youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                            title={activeTrack.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        </div>

                        {/* Player Control Strip */}
                        <div className="p-3 sm:p-4 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800">
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-mono uppercase text-amber-300 font-bold">
                              ĐANG PHÁT TRỰC TIẾP TRÊN BẢNG THÔNG MINH
                            </div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">
                              {activeTrack.title}
                            </h3>
                            <p className="text-[11px] text-slate-400 truncate">{activeTrack.channel}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={musicResults.length <= 1}
                              onClick={() =>
                                setActiveTrackIndex((prev) =>
                                  prev === null
                                    ? 0
                                    : (prev - 1 + musicResults.length) % musicResults.length
                                )
                              }
                              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 disabled:opacity-40"
                              title="Bài trước"
                            >
                              <SkipBack className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              disabled={musicResults.length <= 1}
                              onClick={() =>
                                setActiveTrackIndex((prev) =>
                                  prev === null ? 0 : (prev + 1) % musicResults.length
                                )
                              }
                              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 disabled:opacity-40"
                              title="Bài tiếp theo"
                            >
                              <SkipForward className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveTrackIndex(null)}
                              className="px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1"
                              title="Dừng phát nhạc"
                            >
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Tắt Player</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl bg-black/25 border border-dashed border-emerald-500/40 text-center space-y-2">
                        <Music className="w-8 h-8 text-amber-300 mx-auto" />
                        <h3 className="text-sm font-bold text-white">
                          Chọn bài hát bên dưới hoặc bấm &ldquo;Tìm Giọng Nói&rdquo; để phát ngay trên tấm bảng
                        </h3>
                        <p className="text-xs text-emerald-200/80">
                          Bạn cũng có thể nói câu lệnh ở cột bên trái như: &ldquo;Mở nhạc thiếu nhi vui nhộn&rdquo; hoặc &ldquo;Phát nhạc lofi học bài&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Search Results Playlist Inside the Board */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-300 uppercase">
                        <span>DANH SÁCH NHẠC &amp; VIDEO ({musicResults.length})</span>
                        <span className="text-[11px] text-amber-200/80 font-sans normal-case">
                          Nhấn vào bài bất kỳ để phát lên bảng
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                        {musicResults.map((item, idx) => {
                          const isPlayingThis = activeTrackIndex === idx;
                          return (
                            <button
                              key={`${item.youtubeId}-${idx}`}
                              type="button"
                              onClick={() => {
                                onStopSpeaking();
                                setActiveTrackIndex(idx);
                              }}
                              className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                                isPlayingThis
                                  ? 'bg-amber-400/20 border-amber-300 shadow-md'
                                  : 'bg-black/30 hover:bg-black/45 border-emerald-700/40'
                              }`}
                            >
                              <div className="relative w-20 aspect-video rounded-lg overflow-hidden bg-slate-900 shrink-0">
                                <img
                                  src={item.thumbnail}
                                  alt={item.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const t = e.currentTarget;
                                    if (!t.src.includes('hqdefault.jpg')) {
                                      t.src = `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`;
                                    }
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <Play
                                    className={`w-4 h-4 ${
                                      isPlayingThis ? 'text-amber-300 fill-amber-300' : 'text-white fill-white/80'
                                    }`}
                                  />
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-white line-clamp-2 leading-snug">
                                  {item.title}
                                </div>
                                <div className="text-[10px] text-emerald-200/80 truncate mt-0.5">
                                  {item.channel} {item.duration ? `• ${item.duration}` : ''}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Chalkboard Ledge */}
              <div className="relative z-10 pt-4 mt-6 border-t-2 border-[#1e4232] flex items-center justify-between text-[11px] text-emerald-300/80 font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-2 rounded-sm bg-white/90 shadow-sm" title="Phấn trắng" />
                  <span className="w-5 h-2 rounded-sm bg-amber-300 shadow-sm" title="Phấn vàng" />
                  <span className="w-5 h-2 rounded-sm bg-cyan-300 shadow-sm" title="Phấn xanh" />
                  <span
                    className="w-8 h-3 rounded-md bg-stone-700 border border-stone-600 shadow-sm"
                    title="Khăn lau bảng"
                  />
                </div>
                <span>Lớp Học Thông Minh • Minh Hiếu Official VN</span>
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
