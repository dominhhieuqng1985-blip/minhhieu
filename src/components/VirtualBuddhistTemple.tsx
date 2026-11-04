import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  Heart,
  Send,
  Users,
  Sun,
  Sunset,
  Moon,
  Clock,
  Compass,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Flame,
  Music,
  Share2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Info,
  ExternalLink,
  Mic,
  Gift,
  Coins,
  Download,
  Check,
  Search,
  FileText,
  Printer,
  ShoppingBag,
  Plus,
  Minus,
  Copy,
  UserPlus,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { Temple3DCanvas } from './temple/Temple3DCanvas';
import { MemorialParkSection } from './temple/MemorialParkSection';
import { TempleMemberAuthModal } from './temple/TempleMemberAuthModal';
import {
  buddhistAudio,
  speakViaStudioVoiceApi,
  stopSpeaking,
  synthesizeWithMinhHieuVoice,
} from '../utils/buddhistAudio';
import {
  MINH_HIEU_LE_CHUA_VOICE_ID,
} from '../utils/everai';
import { resolveApiEndpoint, safeFetchJson } from '../utils/api';
import {
  getStoredMemberProfile,
  fetchCurrentTempleMember,
  getMemberAuthHeaders,
} from '../utils/templeMemberAuth';
import { getAdminAuthHeaders } from '../utils/adminAuth';
import {
  BUDDHA_STATUES,
  ARHAT_LIST,
  TEMPLE_SUTRAS,
  DHARMA_TALKS,
  SACRED_BOOKS,
  TEMPLE_OFFERINGS,
  NOVICE_MONK_QA,
  SAMPLE_GUESTBOOK,
  TEMPLE_STORE_ITEMS,
  INITIAL_MERIT_RECORDS,
  INITIAL_MEMORIAL_TOMBS,
  DEFAULT_TEMPLE_ADMIN_PAYMENT,
  BuddhaStatue,
  ArhatItem,
  SutraChant,
  DharmaTalk,
  SacredBook,
  TempleOffering,
  TempleGuestbookEntry,
  TempleStoreItem,
  TempleMeritRecord,
  MemorialTombRecord,
  MemorialTributeRecord,
  TempleMemberRecord,
  TempleAdminPaymentSettings,
} from '../data/buddhistTempleData';

interface VirtualBuddhistTempleProps {
  onShowToast?: (message: string) => void;
  onSendToTTS?: (text: string) => void;
}

type TempleTab =
  | 'chanh-dien'
  | 'hoa-vien-mo'
  | 'tung-kinh'
  | 'nghe-kinh'
  | 'giang-dao'
  | 'tang-kinh-cac'
  | 'la-han'
  | 'cung-duong'
  | 'luu-but';

const STORAGE_KEY_MERIT = 'buddhist_temple_merit_points';
const STORAGE_KEY_GUESTBOOK = 'buddhist_temple_guestbook';
const STORAGE_KEY_MERIT_RECORDS = 'buddhist_temple_merit_records_v1';

export const VirtualBuddhistTemple: React.FC<VirtualBuddhistTempleProps> = ({
  onShowToast = () => {},
  onSendToTTS,
}) => {
  // Navigation & View state
  const [activeTab, setActiveTab] = useState<TempleTab>('chanh-dien');
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'dusk' | 'night'>('dusk');

  // Altar & 3D Interactive State
  const [isIncenseLit, setIsIncenseLit] = useState<boolean>(true);
  const [isBellRinging, setIsBellRinging] = useState<boolean>(false);
  const [isBowing, setIsBowing] = useState<boolean>(false);
  const [meritPoints, setMeritPoints] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MERIT);
      return saved ? parseInt(saved, 10) : 100;
    } catch {
      return 100;
    }
  });

  // Capacity & Visitor Queue Simulation (Max 500)
  const [visitorCount, setVisitorCount] = useState<number>(382);
  const [simulateOverCapacity, setSimulateOverCapacity] = useState<boolean>(false);
  const [queueCountdown, setQueueCountdown] = useState<number>(8);
  const [isQueueBypassed, setIsQueueBypassed] = useState<boolean>(false);

  // Direct API Voice ID: Minh Hiếu Lễ Chùa (voice-ab888766-b59f-402b)
  const selectedStudioVoiceId = MINH_HIEU_LE_CHUA_VOICE_ID;

  // Chú Tiểu NPC State
  const [noviceSpeech, setNoviceSpeech] = useState<string>(
    'A Di Đà Phật! Con là Chú Tiểu Thích Đồng An kính chào quý Phật tử. Chúc quý đạo hữu thân tâm an lạc, vạn sự cát tường!'
  );
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [noviceLoadingStage, setNoviceLoadingStage] = useState<string>('');
  const [userQuestion, setUserQuestion] = useState<string>('');

  // Selected Items for Modals
  const [selectedStatue, setSelectedStatue] = useState<BuddhaStatue | null>(null);
  const [selectedArhat, setSelectedArhat] = useState<ArhatItem | null>(null);
  const [isArhatSpeaking, setIsArhatSpeaking] = useState<boolean>(false);
  const [arhatLoadingStage, setArhatLoadingStage] = useState<string>('');
  const [fortuneVerse, setFortuneVerse] = useState<string | null>(null);
  const [isDrawingFortune, setIsDrawingFortune] = useState<boolean>(false);

  // Chanting Hall State (Tụng Kinh Tương Tác + API Voice Minh Hiếu Lễ Chùa)
  const [selectedChantSutra, setSelectedChantSutra] = useState<SutraChant>(TEMPLE_SUTRAS[0]);
  const [activeSutraLineIdx, setActiveSutraLineIdx] = useState<number>(0);
  const [woodenFishCount, setWoodenFishCount] = useState<number>(0);
  const [isAutoWoodenFish, setIsAutoWoodenFish] = useState<boolean>(false);
  const [autoFishBpm, setAutoFishBpm] = useState<number>(60);
  const [isChantingStudioSutra, setIsChantingStudioSutra] = useState<boolean>(false);
  const [chantStudioStage, setChantStudioStage] = useState<string>('');
  const autoFishTimerRef = useRef<any>(null);

  // Nghe Kinh Hall State (YouTube & Direct API Audio Mode)
  const [selectedAudioSutra, setSelectedAudioSutra] = useState<SutraChant>(TEMPLE_SUTRAS[0]);
  const [sutraPlaybackMode, setSutraPlaybackMode] = useState<'youtube' | 'audio'>('youtube');
  const [customYoutubeInput, setCustomYoutubeInput] = useState<string>('');
  const [activeYoutubeId, setActiveYoutubeId] = useState<string>(TEMPLE_SUTRAS[0].youtubeId);
  const [ytSearchQuery, setYtSearchQuery] = useState<string>('');
  const [ytSearchResults, setYtSearchResults] = useState<any[]>([]);
  const [isSearchingYoutube, setIsSearchingYoutube] = useState<boolean>(false);
  const [showYtSearchPanel, setShowYtSearchPanel] = useState<boolean>(false);
  const [sutraStudioAudioMap, setSutraStudioAudioMap] = useState<Record<string, string>>({});
  const [isGeneratingSutraAudio, setIsGeneratingSutraAudio] = useState<boolean>(false);
  const [sutraAudioStage, setSutraAudioStage] = useState<string>('');

  // Dharma Hall State (Direct API Voice: Minh Hiếu Lễ Chùa)
  const [selectedDharma, setSelectedDharma] = useState<DharmaTalk>(DHARMA_TALKS[0]);
  const [isGeneratingMinhHieuVoice, setIsGeneratingMinhHieuVoice] = useState<boolean>(false);
  const [minhHieuAudioUrl, setMinhHieuAudioUrl] = useState<string | null>(null);
  const [isDharmaPlaying, setIsDharmaPlaying] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationStage, setGenerationStage] = useState<string>('');
  const audioPlayerRef = useRef<HTMLAudioElement>(null);

  // Sutra Book Library State
  const [selectedBook, setSelectedBook] = useState<SacredBook>(SACRED_BOOKS[0]);
  const [currentChapterIdx, setCurrentChapterIdx] = useState<number>(0);
  const [isBookSpeaking, setIsBookSpeaking] = useState<boolean>(false);
  const [bookLoadingStage, setBookLoadingStage] = useState<string>('');

  // Merit Certificate Voice State
  const [isCertSpeaking, setIsCertSpeaking] = useState<boolean>(false);
  const [certLoadingStage, setCertLoadingStage] = useState<string>('');

  // Cúng Dường Tam Bảo & Store Items State
  const [selectedOffering, setSelectedOffering] = useState<TempleOffering | null>(null);
  const [offeringDedication, setOfferingDedication] = useState<string>('');
  const [storeItemQuantities, setStoreItemQuantities] = useState<Record<string, number>>({});
  const [customOfferingDonation, setCustomOfferingDonation] = useState<number>(0);

  // Ghi Danh Công Đức Form State
  const [donorName, setDonorName] = useState<string>('');
  const [donorDharmaName, setDonorDharmaName] = useState<string>('');
  const [donorPhone, setDonorPhone] = useState<string>('');
  const [donorAddress, setDonorAddress] = useState<string>('');
  const [donorPrayerType, setDonorPrayerType] = useState<TempleMeritRecord['prayerType']>('cau-an');
  const [donorSutraId, setDonorSutraId] = useState<string>('kinh-duoc-su');
  const [donorPrayerText, setDonorPrayerText] = useState<string>('');
  const [isSubmittingMerit, setIsSubmittingMerit] = useState<boolean>(false);
  const [showMeritCheckoutModal, setShowMeritCheckoutModal] = useState<boolean>(false);
  const [meritQrFailed, setMeritQrFailed] = useState<boolean>(false);

  // Sổ Vàng Công Đức & Hoa Viên Khu Mộ 3D Connected Neon PostgreSQL State
  const [meritRecords, setMeritRecords] = useState<TempleMeritRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MERIT_RECORDS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_MERIT_RECORDS;
  });
  const [memorialTombs, setMemorialTombs] = useState<MemorialTombRecord[]>(INITIAL_MEMORIAL_TOMBS);
  const [memorialTributes, setMemorialTributes] = useState<MemorialTributeRecord[]>([]);
  const [templeMembers, setTempleMembers] = useState<TempleMemberRecord[]>([]);
  const [templePaymentSettings, setTemplePaymentSettings] = useState<TempleAdminPaymentSettings>(
    DEFAULT_TEMPLE_ADMIN_PAYMENT
  );
  const [meritSearchQuery, setMeritSearchQuery] = useState<string>('');
  const [meritFilterType, setMeritFilterType] = useState<string>('all');
  const [selectedCertificateRecord, setSelectedCertificateRecord] = useState<TempleMeritRecord | null>(null);

  const [lanternWish, setLanternWish] = useState<string>('');
  const [releasedLanterns, setReleasedLanterns] = useState<
    { id: string; name: string; wish: string; color: string }[]
  >([
    { id: 'l-1', name: 'Phật tử Tâm An', wish: 'Cầu cha mẹ bình an trường thọ', color: 'from-amber-400 to-orange-500' },
    { id: 'l-2', name: 'Đạo hữu Diệu Thiện', wish: 'Cầu gia đình thuận hòa tai qua nạn khỏi', color: 'from-rose-400 to-pink-500' },
    { id: 'l-3', name: 'Phật tử Nhuận Trí', wish: 'Cầu quốc thái dân an mưa thuận gió hòa', color: 'from-sky-400 to-blue-500' },
  ]);

  // Guestbook State
  const [guestbookList, setGuestbookList] = useState<TempleGuestbookEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GUESTBOOK);
      if (saved) return JSON.parse(saved);
    } catch {}
    return SAMPLE_GUESTBOOK;
  });
  const [authorName, setAuthorName] = useState<string>('');
  const [authorDharmaName, setAuthorDharmaName] = useState<string>('');
  const [authorLocation, setAuthorLocation] = useState<string>('');
  const [prayerWish, setPrayerWish] = useState<string>('');
  const [isSubmittingGuestbook, setIsSubmittingGuestbook] = useState<boolean>(false);

  // Member Authentication & Auto Data Sync State
  const [currentMember, setCurrentMember] = useState<TempleMemberRecord | null>(() =>
    getStoredMemberProfile()
  );
  const [isMemberModalOpen, setIsMemberModalOpen] = useState<boolean>(false);
  const [memberModalMode, setMemberModalMode] = useState<'login' | 'register' | 'profile'>('login');
  const [externalFocusPlotCode, setExternalFocusPlotCode] = useState<string | null>(null);
  const [isSyncingAllData, setIsSyncingAllData] = useState<boolean>(false);

  const openMemberAuthModal = (mode: 'login' | 'register' | 'profile' = 'login') => {
    setMemberModalMode(mode);
    setIsMemberModalOpen(true);
  };

  // Auto-fill forms when member logs in
  useEffect(() => {
    if (currentMember) {
      setDonorName((prev) => prev || currentMember.fullName);
      setDonorDharmaName((prev) => prev || currentMember.dharmaName || '');
      setDonorPhone((prev) => prev || currentMember.phone || '');
      setDonorAddress((prev) => prev || currentMember.address || '');
      setAuthorName((prev) => prev || currentMember.fullName);
      setAuthorDharmaName((prev) => prev || currentMember.dharmaName || '');
      setAuthorLocation((prev) => prev || currentMember.address || '');
    }
  }, [currentMember]);

  // Sync Studio Voice Selection & Load Neon PostgreSQL Temple + Memorial Park Overview
  const refreshTempleOverview = async () => {
    try {
      const data = await safeFetchJson<{
        success: boolean;
        paymentSettings?: TempleAdminPaymentSettings | null;
        members?: TempleMemberRecord[];
        meritRecords?: TempleMeritRecord[];
        tombs?: MemorialTombRecord[];
        tributes?: MemorialTributeRecord[];
        guestbook?: TempleGuestbookEntry[];
      }>(resolveApiEndpoint('temple/overview'));

      if (data.paymentSettings) {
        setTemplePaymentSettings({ ...DEFAULT_TEMPLE_ADMIN_PAYMENT, ...data.paymentSettings });
      }
      if (Array.isArray(data.members)) {
        setTempleMembers(data.members);
      }
      if (Array.isArray(data.meritRecords) && data.meritRecords.length > 0) {
        setMeritRecords(data.meritRecords);
        try {
          localStorage.setItem(STORAGE_KEY_MERIT_RECORDS, JSON.stringify(data.meritRecords));
        } catch {}
      }
      if (Array.isArray(data.tombs)) {
        setMemorialTombs(data.tombs.filter((t) => !String(t.id || '').startsWith('tomb-seed-')));
      }
      if (Array.isArray(data.tributes)) {
        setMemorialTributes(data.tributes);
      }
      if (Array.isArray(data.guestbook) && data.guestbook.length > 0) {
        setGuestbookList(data.guestbook);
        try {
          localStorage.setItem(STORAGE_KEY_GUESTBOOK, JSON.stringify(data.guestbook));
        } catch {}
      }
    } catch {
      // Static / offline graceful fallback keeps local records
    }
  };

  // Automatic Schema Migration & Full Data Sync to Neon PostgreSQL
  const handleSyncAllTempleData = async (silent = false) => {
    setIsSyncingAllData(true);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        message?: string;
        syncedTombs?: number;
        syncedMerit?: number;
        syncedGuestbook?: number;
        overview?: any;
      }>(resolveApiEndpoint('temple/sync-all'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders(),
          ...getMemberAuthHeaders(),
        },
        body: JSON.stringify({
          tombs: memorialTombs.filter(
            (t) =>
              !t.isDraft &&
              !String(t.id || '').startsWith('tomb-seed-') &&
              Boolean(t.memberId)
          ),
          meritRecords,
          guestbook: guestbookList,
          memberId: currentMember?.id,
          meritPoints,
        }),
      });

      if (res.overview) {
        if (res.overview.paymentSettings) {
          setTemplePaymentSettings({
            ...DEFAULT_TEMPLE_ADMIN_PAYMENT,
            ...res.overview.paymentSettings,
          });
        }
        if (Array.isArray(res.overview.members)) {
          setTempleMembers(res.overview.members);
        }
        if (Array.isArray(res.overview.meritRecords) && res.overview.meritRecords.length > 0) {
          setMeritRecords(res.overview.meritRecords);
          try {
            localStorage.setItem(
              STORAGE_KEY_MERIT_RECORDS,
              JSON.stringify(res.overview.meritRecords)
            );
          } catch {}
        }
        if (Array.isArray(res.overview.tombs)) {
          setMemorialTombs(
            res.overview.tombs.filter((t: MemorialTombRecord) => !String(t.id || '').startsWith('tomb-seed-'))
          );
        }
        if (Array.isArray(res.overview.tributes)) {
          setMemorialTributes(res.overview.tributes);
        }
        if (Array.isArray(res.overview.guestbook) && res.overview.guestbook.length > 0) {
          setGuestbookList(res.overview.guestbook);
        }
      }

      if (!silent) {
        onShowToast(
          res.message ||
            'Đã tự động tạo bảng & cập nhật toàn bộ dữ liệu bản mới vào cơ sở dữ liệu Neon PostgreSQL!'
        );
      }
    } catch (err: any) {
      if (!silent) {
        onShowToast('Lỗi đồng bộ dữ liệu: ' + (err?.message || 'Không kết nối được máy chủ'));
      }
    } finally {
      setIsSyncingAllData(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const verifiedMember = await fetchCurrentTempleMember();
      if (active && verifiedMember) {
        setCurrentMember(verifiedMember);
      }
      // Tự động tạo bảng mới & đồng bộ toàn bộ dữ liệu bản mới lên Neon PostgreSQL ngay khi mở ứng dụng
      await handleSyncAllTempleData(true);
    })();
    return () => {
      active = false;
      stopSpeaking();
    };
  }, []);

  // Live visitor fluctuation (Simulate real crowd between 340 and 460)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!simulateOverCapacity) {
        setVisitorCount((prev) => {
          const delta = Math.floor(Math.random() * 5) - 2;
          return Math.min(485, Math.max(320, prev + delta));
        });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [simulateOverCapacity]);

  // Handle over-capacity countdown
  useEffect(() => {
    if (simulateOverCapacity && !isQueueBypassed) {
      setVisitorCount(518);
      const timer = setInterval(() => {
        setQueueCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsQueueBypassed(true);
            onShowToast('Đến lượt bạn vào chùa chiêm bái! A Di Đà Phật.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else if (!simulateOverCapacity) {
      setQueueCountdown(8);
      setIsQueueBypassed(false);
    }
  }, [simulateOverCapacity, isQueueBypassed]);

  // Auto wooden fish ticker
  useEffect(() => {
    if (isAutoWoodenFish) {
      const intervalMs = (60 / autoFishBpm) * 1000;
      autoFishTimerRef.current = setInterval(() => {
        buddhistAudio.hitWoodenFish(0.5);
        setWoodenFishCount((c) => (c >= 108 ? 1 : c + 1));
      }, intervalMs);
    } else {
      if (autoFishTimerRef.current) clearInterval(autoFishTimerRef.current);
    }
    return () => {
      if (autoFishTimerRef.current) clearInterval(autoFishTimerRef.current);
    };
  }, [isAutoWoodenFish, autoFishBpm]);

  // Sync merit points
  const addMerit = (pts: number, reason: string) => {
    const next = meritPoints + pts;
    setMeritPoints(next);
    try {
      localStorage.setItem(STORAGE_KEY_MERIT, String(next));
    } catch {}
    onShowToast(`+${pts} Điểm Công Đức (${reason})! A Di Đà Phật.`);
  };

  // Sound triggers
  const handleRingBell = () => {
    setIsBellRinging(true);
    buddhistAudio.ringTempleBell(0.7);
    addMerit(5, 'Thỉnh Đại Hồng Chung');
    setTimeout(() => setIsBellRinging(false), 3800);
  };

  const handleHitWoodenFish = () => {
    buddhistAudio.hitWoodenFish(0.65);
    setWoodenFishCount((prev) => {
      const next = prev + 1;
      if (next === 108) {
        addMerit(108, 'Hoàn thành 108 biến niệm Phật');
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      }
      return next;
    });
  };

  const handleLightIncense = () => {
    setIsIncenseLit(true);
    buddhistAudio.playIncenseChime();
    addMerit(15, 'Dâng Tam Nén Tâm Hương');
    confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
  };

  const handleBowToBuddha = () => {
    setIsBowing(true);
    buddhistAudio.ringTempleBell(0.4);
    addMerit(10, 'Cung Kính Đảnh Lễ Chư Phật');
    setTimeout(() => setIsBowing(false), 2000);
  };

  // Draw Fortune Lot (Gieo Quẻ Xăm Lời Phật Dạy)
  const handleDrawFortune = () => {
    setIsDrawingFortune(true);
    buddhistAudio.hitWoodenFish(0.6);
    setTimeout(() => {
      const fortunes = [
        'Quẻ Thượng Cát: "Tâm bình thế giới bình. Việc lành tích lũy hôm nay sẽ trổ hoa thơm trái ngọt vào ngày mai. Gia đạo hưng thịnh, vạn sự hanh thông."',
        'Quẻ Đại Lành: "Nhẫn nhục là sức mạnh tối thượng. Mọi thị phi tranh chấp đều tự tiêu tan trước lòng bao dung. Cầu tài đắc tài, cầu an đắc an."',
        'Quẻ An Lạc: "Hiếu thuận với cha mẹ là gốc của mọi phúc báo. Hãy dành thời gian lắng nghe người thân, phước lành sẽ tự tìm đến cửa."',
        'Quẻ Thiện Duyên: "Vạn sự tùy duyên, giữ tâm thanh tịnh như hoa sen nở trong đầm lầy. Bệnh tật tiêu trừ, quý nhân phù trợ."',
        'Quẻ Tinh Tấn: "Gieo nhân thiện ắt gặt quả lành. Buông bỏ lo âu phiền não, bước từng bước chánh niệm, tương lai rạng ngời."',
      ];
      const randomF = fortunes[Math.floor(Math.random() * fortunes.length)];
      setFortuneVerse(randomF);
      setIsDrawingFortune(false);
      buddhistAudio.ringTempleBell(0.5);
      addMerit(20, 'Gieo Quẻ Lời Vàng Phật Dạy');
    }, 1200);
  };

  // Chú Tiểu NPC Speaking directly via API Voice Minh Hiếu Lễ Chùa (voice-ab888766-b59f-402b)
  const playNoviceApiSpeech = async (textToSpeak: string) => {
    setIsSpeaking(true);
    await speakViaStudioVoiceApi(textToSpeak, {
      voiceId: MINH_HIEU_LE_CHUA_VOICE_ID,
      speedRate: 1.0,
      onLoadingChange: (loading) => {
        setNoviceLoadingStage(loading ? 'Đang tải...' : '');
      },
      onEnd: () => {
        setIsSpeaking(false);
        setNoviceLoadingStage('');
      },
      onError: (errMsg) => {
        setIsSpeaking(false);
        setNoviceLoadingStage('');
        onShowToast(errMsg || 'Không thể kết nối giọng đọc API');
      },
    });
  };

  const handleNoviceSpeak = async (textToSpeak: string = noviceSpeech) => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      setNoviceLoadingStage('');
      return;
    }
    await playNoviceApiSpeech(textToSpeak);
  };

  // Ask Chú Tiểu QA -> Directly speak answer via API Voice Minh Hiếu Lễ Chùa
  const handleAskNovice = (qaItem?: { question: string; answer: string }) => {
    const q = qaItem ? qaItem.question : userQuestion.trim();
    if (!q) return;

    let ans =
      'A Di Đà Phật! Lời dạy của Đức Phật quý báu vô cùng. Quý Phật tử hãy giữ tâm thanh tịnh, siêng làm việc lành, hiếu thảo mẹ cha, thì mọi mong cầu thiện lành đều sẽ được như ý nguyện ạ!';

    const found = NOVICE_MONK_QA.find((item) =>
      q.toLowerCase().includes(item.question.toLowerCase().slice(0, 15))
    );
    if (found) {
      ans = found.answer;
    }

    setNoviceSpeech(ans);
    setUserQuestion('');
    stopSpeaking();
    playNoviceApiSpeech(ans);
  };

  // Direct API Sutra Chanting (voice-ab888766-b59f-402b + Mõ)
  const handleToggleStudioSutraChant = async (sutra: SutraChant) => {
    if (isChantingStudioSutra) {
      stopSpeaking();
      setIsChantingStudioSutra(false);
      setChantStudioStage('');
      setIsAutoWoodenFish(false);
      return;
    }

    buddhistAudio.ringTempleBell(0.65);
    setIsChantingStudioSutra(true);
    setIsAutoWoodenFish(true);
    const fullChantText = `${sutra.title}. ${sutra.lyrics.join(' ')}`;

    await speakViaStudioVoiceApi(fullChantText, {
      voiceId: MINH_HIEU_LE_CHUA_VOICE_ID,
      speedRate: 0.9,
      onLoadingChange: (loading) => {
        setChantStudioStage(loading ? 'Đang tải...' : '');
      },
      onEnd: () => {
        setIsChantingStudioSutra(false);
        setChantStudioStage('');
        setIsAutoWoodenFish(false);
        buddhistAudio.ringTempleBell(0.6);
        addMerit(35, `Trì tụng trọn bài ${sutra.title}`);
      },
      onError: (errMsg) => {
        setIsChantingStudioSutra(false);
        setChantStudioStage('');
        setIsAutoWoodenFish(false);
        onShowToast(errMsg || 'Không thể kết nối giọng đọc API');
      },
    });
  };

  // Generate & Play Direct API MP3 inside Phòng Nghe Kinh (Audio Mode)
  const handleGenerateStudioSutraAudio = async (sutra: SutraChant) => {
    const cacheKey = `${MINH_HIEU_LE_CHUA_VOICE_ID}::${sutra.id}`;
    if (sutraStudioAudioMap[cacheKey]) return;

    setIsGeneratingSutraAudio(true);
    setSutraAudioStage('Đang tải...');
    try {
      const fullChantText = `${sutra.title}. ${sutra.lyrics.join(' ')}`;
      const url = await synthesizeWithMinhHieuVoice(
        fullChantText,
        (_prog, stage) => setSutraAudioStage(stage),
        MINH_HIEU_LE_CHUA_VOICE_ID,
        0.9
      );
      setSutraStudioAudioMap((prev) => ({ ...prev, [cacheKey]: url }));
      buddhistAudio.ringTempleBell(0.5);
      addMerit(25, `Nghe Kinh (${sutra.title})`);
    } catch (err: any) {
      onShowToast(err?.message || 'Lỗi kết nối API giọng đọc');
    } finally {
      setIsGeneratingSutraAudio(false);
      setSutraAudioStage('');
    }
  };

  const handleJumpToSutra = (sutra: SutraChant, mode: 'youtube' | 'audio' = 'youtube') => {
    setSelectedAudioSutra(sutra);
    setSelectedChantSutra(sutra);
    setActiveYoutubeId(sutra.youtubeId);
    setSutraPlaybackMode(mode);
    setActiveTab('nghe-kinh');
    if (mode === 'audio') {
      handleGenerateStudioSutraAudio(sutra);
    }
    onShowToast(`Đã kết nối tới bài kinh: ${sutra.title}`);
  };

  // =========================================================================
  // DHARMA TALK: DIRECT API VOICE MINH HIẾU LỄ CHÙA (voice-ab888766-b59f-402b)
  // =========================================================================
  const handlePlayMinhHieuVoice = async () => {
    if (minhHieuAudioUrl && audioPlayerRef.current) {
      if (audioPlayerRef.current.paused) {
        audioPlayerRef.current.play().catch(() => {});
      } else {
        audioPlayerRef.current.pause();
      }
      return;
    }

    stopSpeaking();
    setIsGeneratingMinhHieuVoice(true);
    setGenerationProgress(15);
    setGenerationStage('Đang tải...');

    try {
      const audioUrl = await synthesizeWithMinhHieuVoice(
        selectedDharma.fullSpeech,
        (progress, stage) => {
          setGenerationProgress(progress);
          setGenerationStage(stage);
        },
        MINH_HIEU_LE_CHUA_VOICE_ID,
        1.0
      );
      setMinhHieuAudioUrl(audioUrl);
      setIsDharmaPlaying(true);
      addMerit(25, 'Lắng Nghe Giảng Đạo');
    } catch (err: any) {
      onShowToast(err?.message || 'Lỗi kết nối API giọng đọc Minh Hiếu Lễ Chùa');
    } finally {
      setIsGeneratingMinhHieuVoice(false);
    }
  };

  // Sutra Book Chapter Reading directly via API Voice Minh Hiếu Lễ Chùa
  const handleToggleBookSpeech = async () => {
    if (isBookSpeaking) {
      stopSpeaking();
      setIsBookSpeaking(false);
      setBookLoadingStage('');
    } else {
      setIsBookSpeaking(true);
      const curChapter = selectedBook.chapters[currentChapterIdx];
      const ok = await speakViaStudioVoiceApi(
        `${selectedBook.title}. ${curChapter.title}. ${curChapter.content}`,
        {
          voiceId: MINH_HIEU_LE_CHUA_VOICE_ID,
          speedRate: 1.0,
          onLoadingChange: (loading) => {
            setBookLoadingStage(loading ? 'Đang tải...' : '');
          },
          onEnd: () => {
            setIsBookSpeaking(false);
            setBookLoadingStage('');
          },
          onError: (errMsg) => {
            setIsBookSpeaking(false);
            setBookLoadingStage('');
            onShowToast(errMsg || 'Không thể kết nối giọng đọc API');
          },
        }
      );
      if (ok) addMerit(10, 'Nghe Kinh Điển');
    }
  };

  // Handle Offering Dedication (100% Free Spiritual Offering)
  const handleConfirmOffering = () => {
    if (!selectedOffering) return;
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    buddhistAudio.ringTempleBell(0.6);
    addMerit(selectedOffering.meritPoints, `Dâng Cúng ${selectedOffering.name}`);
    setSelectedOffering(null);
    setOfferingDedication('');
  };

  // Store item quantity modifier
  const handleItemQuantityChange = (itemId: string, delta: number) => {
    setStoreItemQuantities((prev) => {
      const cur = prev[itemId] || 0;
      const next = Math.max(0, cur + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const selectedStoreItems = TEMPLE_STORE_ITEMS.filter(
    (item) => (storeItemQuantities[item.id] || 0) > 0
  ).map((item) => ({
    ...item,
    quantity: storeItemQuantities[item.id] || 0,
    subtotal: (storeItemQuantities[item.id] || 0) * item.price,
    itemMeritTotal: (storeItemQuantities[item.id] || 0) * item.meritPoints,
  }));

  const totalStoreAmount =
    selectedStoreItems.reduce((sum, item) => sum + item.subtotal, 0) +
    (Number(customOfferingDonation) || 0);

  const totalStoreMerit =
    selectedStoreItems.reduce((sum, item) => sum + item.itemMeritTotal, 0) +
    (Number(customOfferingDonation) > 0 ? Math.floor(Number(customOfferingDonation) / 1000) : 50);

  // Persist Ghi Danh Công Đức + Purchased Items to Neon PostgreSQL & Sổ Vàng
  const finalizeMeritSubmission = async (chosenMethod: 'tuy-tam' | 'vietqr_admin' | 'paypal_admin') => {
    setIsSubmittingMerit(true);
    const codeId = `CB-${Date.now().toString().slice(-6)}`;
    const chosenSutra =
      TEMPLE_SUTRAS.find((s) => s.id === donorSutraId) || TEMPLE_SUTRAS[0];

    const draftRecord: TempleMeritRecord = {
      id: codeId,
      memberId: currentMember?.id || undefined,
      donorName: donorName.trim(),
      dharmaName: donorDharmaName.trim() || undefined,
      phone: donorPhone.trim() || undefined,
      address: donorAddress.trim() || undefined,
      prayerType: donorPrayerType,
      prayerText:
        donorPrayerText.trim() ||
        'Cầu bình an gia đạo, phước lộc thọ khang ninh, vạn sự cát tường',
      sutraId: chosenSutra.id,
      sutraTitle: chosenSutra.title,
      items: selectedStoreItems.map((item) => ({
        itemId: item.id,
        itemName: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      })),
      customDonation: Number(customOfferingDonation) || 0,
      totalAmount: totalStoreAmount,
      totalMeritPoints: Math.max(50, totalStoreMerit),
      paymentMethod: chosenMethod,
      paymentStatus: totalStoreAmount > 0 ? 'approved' : 'completed',
      createdAt: new Date().toLocaleString('vi-VN'),
    };

    let savedRecord = draftRecord;
    try {
      const apiRes = await safeFetchJson<{ success: boolean; record: TempleMeritRecord }>(
        resolveApiEndpoint('temple/merit'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getMemberAuthHeaders(),
          },
          body: JSON.stringify(draftRecord),
        }
      );
      if (apiRes.record) {
        savedRecord = apiRes.record;
      }
      await refreshTempleOverview();
    } catch {
      const nextRecords = [draftRecord, ...meritRecords];
      setMeritRecords(nextRecords);
      try {
        localStorage.setItem(STORAGE_KEY_MERIT_RECORDS, JSON.stringify(nextRecords));
      } catch {}
    }

    addMerit(savedRecord.totalMeritPoints, `Ghi Danh Sổ Vàng Tam Bảo (${savedRecord.donorName})`);
    buddhistAudio.ringTempleBell(0.8);
    confetti({ particleCount: 85, spread: 85, origin: { y: 0.6 } });
    setSelectedCertificateRecord(savedRecord);
    setShowMeritCheckoutModal(false);
    setIsSubmittingMerit(false);
    setStoreItemQuantities({});
    setCustomOfferingDonation(0);
    setDonorPrayerText('');
    onShowToast(
      `Đã lưu Ghi Danh & Vật Phẩm Cúng Dường vào cơ sở dữ liệu! Mã điệp: ${savedRecord.id}`
    );
  };

  // Submit Ghi Danh Công Đức Tam Bảo
  const handleSubmitMeritRegistry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName.trim()) {
      onShowToast('Vui lòng nhập Họ và tên hoặc Pháp danh để ghi danh vào Sổ Vàng!');
      return;
    }
    if (totalStoreAmount > 0) {
      setMeritQrFailed(false);
      setShowMeritCheckoutModal(true);
      return;
    }
    finalizeMeritSubmission('tuy-tam');
  };

  // YouTube / Audio Player Handlers
  const handleApplyCustomYoutube = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const input = customYoutubeInput.trim();
    if (!input) return;
    const match =
      input.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/) ||
      (input.length === 11 ? [, input] : null);
    if (match && match[1]) {
      setActiveYoutubeId(match[1]);
      setSutraPlaybackMode('youtube');
      onShowToast('Đang phát bài kinh YouTube được chọn!');
    } else {
      handleSearchYoutube(input);
    }
  };

  const handleSearchYoutube = async (queryText?: string) => {
    const q = (queryText || ytSearchQuery || selectedAudioSutra.title).trim();
    if (!q) return;
    setIsSearchingYoutube(true);
    setShowYtSearchPanel(true);
    try {
      const res = await fetch(
        resolveApiEndpoint(`youtube/search?q=${encodeURIComponent(q + ' tụng kinh phật giáo')}`)
      );
      if (res.ok) {
        const data = await res.json();
        setYtSearchResults(data.results || []);
      } else {
        setYtSearchResults([]);
      }
    } catch {
      setYtSearchResults([]);
    } finally {
      setIsSearchingYoutube(false);
    }
  };

  // Thả Đèn Hoa Đăng Cầu An trên Hồ Sen
  const handleReleaseLantern = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lanternWish.trim()) {
      onShowToast('Vui lòng nhập lời cầu an khi thả hoa đăng!');
      return;
    }
    const colors = [
      'from-amber-400 to-orange-500',
      'from-rose-400 to-pink-500',
      'from-emerald-400 to-teal-500',
      'from-sky-400 to-indigo-500',
    ];
    const newLantern = {
      id: `lantern-${Date.now()}`,
      name: authorName.trim() || 'Phật tử thập phương',
      wish: lanternWish.trim(),
      color: colors[Math.floor(Math.random() * colors.length)],
    };
    setReleasedLanterns([newLantern, ...releasedLanterns]);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    buddhistAudio.playIncenseChime();
    addMerit(35, 'Thả Đèn Hoa Đăng Cầu An');
    setLanternWish('');
  };

  // Handle Guestbook Submission (Persisted to Neon PostgreSQL)
  const handleSubmitGuestbook = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveName = authorName.trim() || currentMember?.fullName || '';
    if (!effectiveName || !prayerWish.trim()) {
      onShowToast('Vui lòng nhập họ tên và lời cầu nguyện!');
      return;
    }

    setIsSubmittingGuestbook(true);
    const localId = `gb-${Date.now()}`;
    let savedEntry: TempleGuestbookEntry = {
      id: localId,
      name: effectiveName,
      dharmaName: authorDharmaName.trim()
        ? authorDharmaName.trim().startsWith('Pháp danh')
          ? authorDharmaName.trim()
          : `Pháp danh ${authorDharmaName.trim()}`
        : undefined,
      location: authorLocation.trim() || currentMember?.address || 'Việt Nam',
      wish: prayerWish.trim(),
      createdAt: new Date().toLocaleString('vi-VN'),
      likes: 1,
      offeringsCount: 1,
    };

    try {
      const apiRes = await safeFetchJson<{ success: boolean; entry?: TempleGuestbookEntry }>(
        resolveApiEndpoint('temple/guestbook'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getMemberAuthHeaders(),
          },
          body: JSON.stringify({
            id: localId,
            memberId: currentMember?.id,
            name: savedEntry.name,
            dharmaName: savedEntry.dharmaName,
            location: savedEntry.location,
            wish: savedEntry.wish,
          }),
        }
      );
      if (apiRes.entry) {
        savedEntry = apiRes.entry;
      }
    } catch {}

    const updated = [savedEntry, ...guestbookList.filter((g) => g.id !== savedEntry.id)];
    setGuestbookList(updated);
    try {
      localStorage.setItem(STORAGE_KEY_GUESTBOOK, JSON.stringify(updated));
    } catch {}

    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    buddhistAudio.ringTempleBell(0.5);
    addMerit(30, 'Ghi Sổ Lưu Bút Công Đức');

    if (!currentMember) {
      setAuthorName('');
      setAuthorDharmaName('');
    }
    setPrayerWish('');
    setIsSubmittingGuestbook(false);
  };

  const handleLikeGuestbook = async (id: string) => {
    setGuestbookList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, likes: item.likes + 1 } : item))
    );
    buddhistAudio.hitWoodenFish(0.4);
    addMerit(2, 'Tán Thán Nguyện Lành');
    try {
      await safeFetchJson(resolveApiEndpoint(`temple/guestbook/${encodeURIComponent(id)}/like`), {
        method: 'POST',
      });
    } catch {}
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 pb-20">
      {/* 1. TOP TEMPLE STATUS & TIME HEADER */}
      <header className="sticky top-16 z-30 bg-slate-950/95 backdrop-blur border-b border-amber-900/40 shadow-xl px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Temple Brand & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-500 flex items-center justify-center text-white shadow-lg shadow-amber-600/30 shrink-0">
              <span className="text-lg">🪷</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-500 uppercase">
                  Đại Bi Tự • Chùa Online 3D/4D
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Tịnh Độ
                </span>
              </div>
              <p className="text-[11px] text-amber-200/70">
                Chiêm bái, thắp hương, tụng kinh, nghe kinh, giảng đạo và cúng dường Tam Bảo
              </p>
            </div>
          </div>

          {/* Quick Metrics & Direct Cúng Dường + Khu Mộ 3D + Thành Viên Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {/* MEMBER LOGIN / REGISTER / PROFILE BUTTON */}
            <button
              type="button"
              onClick={() => openMemberAuthModal(currentMember ? 'profile' : 'login')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              {currentMember ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>TV: {currentMember.fullName}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Đăng Ký / Đăng Nhập</span>
                </>
              )}
            </button>

            {/* DIRECT PROMINENT BUTTON: HOA VIÊN KHU MỘ 3D */}
            <button
              type="button"
              onClick={() => setActiveTab('hoa-vien-mo')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/50 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <span>🪦</span>
              <span>Hoa Viên Khu Mộ 3D</span>
            </button>

            {/* DIRECT PROMINENT BUTTON: CÚNG DƯỜNG TAM BẢO */}
            <button
              type="button"
              onClick={() => setActiveTab('cung-duong')}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all whitespace-nowrap"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Cúng Dường Tam Bảo</span>
            </button>

            {/* Live Visitor Meter & Capacity Limit Indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-xl border text-xs font-semibold tabular-nums ${
                visitorCount >= 500
                  ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300'
              }`}
              title="Sức chứa tối đa cùng lúc: 500 Phật tử tham quan"
            >
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>
                <strong className={visitorCount >= 500 ? 'text-rose-400' : 'text-emerald-400'}>
                  {visitorCount}
                </strong>
                /500 Phật tử
              </span>
            </div>

            {/* Simulated Over-Capacity Toggle (for testing queue feature) */}
            <button
              type="button"
              onClick={() => {
                setSimulateOverCapacity(!simulateOverCapacity);
                setIsQueueBypassed(false);
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors ${
                simulateOverCapacity
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
              }`}
              title="Nhấn để thử nghiệm giao diện hàng đợi khi số lượng khách vượt quá 500 người"
            >
              {simulateOverCapacity ? 'Đang bật >500' : 'Thử >500'}
            </button>

            {/* Merit Accumulator */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-950/60 to-yellow-950/60 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span>{meritPoints} Điểm</span>
            </div>

            {/* Time of Day Switcher */}
            <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setTimeOfDay('day')}
                className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  timeOfDay === 'day' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Thời khắc Ban Ngày"
              >
                <Sun className="w-3 h-3" />
                <span className="hidden sm:inline">Ngày</span>
              </button>
              <button
                type="button"
                onClick={() => setTimeOfDay('dusk')}
                className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  timeOfDay === 'dusk' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Thời khắc Hoàng Hôn"
              >
                <Sunset className="w-3 h-3" />
                <span className="hidden sm:inline">Chiều</span>
              </button>
              <button
                type="button"
                onClick={() => setTimeOfDay('night')}
                className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  timeOfDay === 'night' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Thời khắc Ban Đêm"
              >
                <Moon className="w-3 h-3" />
                <span className="hidden sm:inline">Đêm</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* OVER-CAPACITY QUEUE MODAL (When visitor count > 500) */}
      {simulateOverCapacity && !isQueueBypassed && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-7 text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 mx-auto flex items-center justify-center text-3xl shadow-lg">
              🪷
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Cổng Tam Quan • Hàng Đợi Công Quả
              </span>
              <h3 className="text-lg font-black text-white">Chùa Đang Đón Đủ 500 Phật Tử</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Số lượng quý đạo hữu chiêm bái hiện tại là{' '}
                <strong className="text-amber-400">{visitorCount} người</strong>. Xin quý vị hoan hỷ
                chờ trong chốc lát để vào chùa trong thanh tịnh và trang nghiêm.
              </p>
            </div>

            <div className="py-3 px-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Vị trí hàng đợi của bạn:</span>
                <strong className="text-amber-300 font-mono">#12</strong>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Thời gian tự động vào:</span>
                <strong className="text-emerald-400 font-mono text-sm">{queueCountdown} giây</strong>
              </div>
              <p className="text-[11px] text-amber-300/80 italic pt-1">
                "Trong lúc chờ đợi, quý vị có thể niệm Nam Mô A Di Đà Phật để thân tâm an lạc."
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => buddhistAudio.hitWoodenFish(0.6)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <span>Gõ Mõ Niệm Phật</span>
              </button>
              <button
                type="button"
                onClick={() => setIsQueueBypassed(true)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black shadow-lg transition-all"
              >
                Vào Chùa Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. THREE.JS 3D/4D SANCTUARY HERO CANVAS WITH ALTAR ACTIONS */}
      <section className="relative w-full h-[380px] sm:h-[460px] lg:h-[500px] bg-slate-950 overflow-hidden border-b border-amber-950/60">
        <Temple3DCanvas
          timeOfDay={timeOfDay}
          isIncenseLit={isIncenseLit}
          isBellRinging={isBellRinging}
          className="w-full h-full"
        />

        {/* Overlay Ambient Vignette & Buddhist Lighting */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950 via-transparent to-slate-950/50" />

        {/* 3D Scene Interactive Overlay Controls */}
        <div className="absolute bottom-5 inset-x-4 max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-2 sm:gap-3 pointer-events-auto">
          {/* Thắp Hương Button */}
          <button
            type="button"
            onClick={handleLightIncense}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
              isIncenseLit
                ? 'bg-amber-500/20 border-2 border-amber-400 text-amber-200'
                : 'bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300'
            }`}
          >
            <Flame className={`w-4 h-4 ${isIncenseLit ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
            <span>{isIncenseLit ? 'Hương Trầm Đang Tỏa Khói' : 'Thắp 3 Nén Tâm Hương'}</span>
          </button>

          {/* Lạy Phật 3 Lạy */}
          <button
            type="button"
            onClick={handleBowToBuddha}
            disabled={isBowing}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
              isBowing
                ? 'bg-yellow-500 text-slate-950 font-black scale-105'
                : 'bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200'
            }`}
          >
            <span>🙏</span>
            <span>{isBowing ? 'Cúi Đầu Cung Kính Lạy Phật...' : 'Lạy Phật 3 Lạy'}</span>
          </button>

          {/* Thỉnh Chuông Gia Trì */}
          <button
            type="button"
            onClick={handleRingBell}
            disabled={isBellRinging}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
              isBellRinging
                ? 'bg-amber-600 text-white font-black animate-pulse'
                : 'bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200'
            }`}
          >
            <span>🔔</span>
            <span>{isBellRinging ? 'Chuông Ngân Vang...' : 'Thỉnh Đại Hồng Chung'}</span>
          </button>

          {/* Gieo Quẻ Xăm Lời Phật Dạy */}
          <button
            type="button"
            onClick={handleDrawFortune}
            disabled={isDrawingFortune}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>{isDrawingFortune ? 'Đang Lắc Ống Xăm...' : 'Gieo Quẻ Lời Phật Dạy'}</span>
          </button>
        </div>

        {/* 3D Scene Controls Hint */}
        <div className="absolute top-4 left-4 bg-slate-900/70 backdrop-blur-sm border border-slate-800 px-3 py-1.5 rounded-xl text-[11px] text-amber-200/80 flex items-center gap-1.5 pointer-events-none">
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span>Kéo chuột hoặc vuốt màn hình để xoay góc nhìn 3D</span>
        </div>
      </section>

      {/* POPUP FORTUNE LOT RESULT */}
      {fortuneVerse && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 mx-auto flex items-center justify-center text-2xl shadow-inner">
              📜
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400">
                Thẻ Quẻ May Mắn • Lời Vàng Phật Dạy
              </span>
              <h4 className="text-base font-black text-white">Quẻ Xăm Thiện Lành</h4>
            </div>
            <p className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 text-amber-200 text-xs sm:text-sm font-serif leading-relaxed italic">
              "{fortuneVerse}"
            </p>
            <button
              type="button"
              onClick={() => setFortuneVerse(null)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
            >
              Cảm Tạ Phật Pháp • Hoan Hỷ Tiếp Nhận
            </button>
          </div>
        </div>
      )}

      {/* 3. CHÚ TIỂU NPC GUIDE (TIỂU ĐỒNG TỊNH ĐỘ - THÍCH ĐỒNG AN) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/40 border border-amber-500/30 p-4 sm:p-5 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Chú Tiểu Avatar & Welcome Speech */}
            <div className="flex items-start gap-3.5 flex-1 min-w-0">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-md shadow-amber-500/20">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-3xl">
                    🧑‍🦲
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] uppercase">
                  NPC
                </div>
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-black text-amber-300">
                    Chú Tiểu Thích Đồng An (Tiểu Đồng Hướng Dẫn)
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-400 font-medium border border-amber-500/30">
                    Thuyết Minh
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-serif leading-relaxed italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  "{noviceSpeech}"
                </p>
              </div>
            </div>

            {/* Direct API Voice Control & Quick Navigate */}
            <div className="flex items-center flex-wrap gap-2 shrink-0 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleNoviceSpeak()}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 whitespace-nowrap ${
                  isSpeaking
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
                }`}
              >
                {noviceLoadingStage ? (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isSpeaking ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4 text-amber-400" />
                )}
                <span>{noviceLoadingStage ? 'Đang tải...' : isSpeaking ? 'Dừng' : 'Nghe'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('cung-duong')}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Cúng Dường Ghi Danh</span>
              </button>
            </div>
          </div>

          {/* Quick Questions for Chú Tiểu */}
          <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 shrink-0">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Hỏi nhanh Chú Tiểu:</span>
            </span>
            {NOVICE_MONK_QA.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAskNovice(item)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-200 transition-colors"
              >
                {item.question.length > 35 ? item.question.slice(0, 35) + '...' : item.question}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. MAIN TEMPLE HALLS TAB NAVIGATION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none pb-2 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('chanh-dien')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              activeTab === 'chanh-dien'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>🏛️</span>
            <span>Đại Hùng Bảo Điện</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hoa-vien-mo')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              activeTab === 'hoa-vien-mo'
                ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                : 'bg-amber-950/40 text-amber-300 hover:text-white border border-amber-500/40'
            }`}
          >
            <span>🪦</span>
            <span>Hoa Viên Khu Mộ 3D</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tung-kinh')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              activeTab === 'tung-kinh'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>📿</span>
            <span>Phòng Tụng Kinh (Trì Tụng)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('nghe-kinh')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              activeTab === 'nghe-kinh'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>🔔</span>
            <span>Phòng Nghe Kinh (YouTube)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('giang-dao')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              activeTab === 'giang-dao'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>🎙️</span>
            <span>Phòng Giảng Đạo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tang-kinh-cac')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              activeTab === 'tang-kinh-cac'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>📜</span>
            <span>Phòng Đọc Sách Kinh</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('la-han')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              activeTab === 'la-han'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>🪷</span>
            <span>La Hán Đường (18 Vị)</span>
          </button>

          {/* DEDICATED PROMINENT TAB: CÚNG DƯỜNG TAM BẢO */}
          <button
            type="button"
            onClick={() => setActiveTab('cung-duong')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              activeTab === 'cung-duong'
                ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                : 'bg-amber-950/40 text-amber-300 hover:text-white border border-amber-500/40'
            }`}
          >
            <span>🌸</span>
            <span>Cúng Dường Tam Bảo (Dâng Lễ)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('luu-but')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              activeTab === 'luu-but'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>✍️</span>
            <span>Sổ Lưu Bút Thập Phương</span>
          </button>
        </div>
      </section>

      {/* 5. TAB CONTENTS */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* ========================================================================= */}
        {/* TAB 1: ĐẠI HÙNG BẢO ĐIỆN (TÔN TƯỢNG CHƯ PHẬT & BỒ TÁT TRANG NGHIÊM) */}
        {/* ========================================================================= */}
        {activeTab === 'chanh-dien' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-2">
                  <span>Tôn Tượng Chư Phật &amp; Chư Bồ Tát</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Nhấn vào từng tôn tượng để đọc hạnh nguyện, niệm chân ngôn và phát tâm chiêm bái
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {BUDDHA_STATUES.map((statue) => (
                <div
                  key={statue.id}
                  onClick={() => setSelectedStatue(statue)}
                  className="group relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-amber-500/60 transition-all duration-300 shadow-xl hover:shadow-amber-500/15 cursor-pointer flex flex-col"
                >
                  <div className="relative h-56 w-full overflow-hidden bg-slate-950">
                    <img
                      src={statue.imageUrl}
                      alt={statue.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-950/80 text-amber-300 border border-amber-500/40 backdrop-blur-sm">
                      Chiêm Bái
                    </div>
                  </div>

                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-black text-white text-sm group-hover:text-amber-300 transition-colors">
                        {statue.name}
                      </h4>
                      <div className="text-[11px] text-amber-400 font-medium">{statue.title}</div>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">{statue.description}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-amber-300 font-semibold">
                      <span>Đọc hạnh nguyện</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PHÒNG TỤNG KINH (ĐIỆN TRÌ TỤNG TƯƠNG TÁC) */}
        {/* ========================================================================= */}
        {activeTab === 'tung-kinh' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                      Điện Trì Tụng • Tụng Niệm Chánh Tâm
                    </span>
                    <h3 className="text-lg font-black text-white">{selectedChantSutra.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{selectedChantSutra.merit}</p>
                  </div>

                  {/* Quick Bell and Studio AI Chanting on Top */}
                  <div className="flex items-center flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleStudioSutraChant(selectedChantSutra)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                        isChantingStudioSutra
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {chantStudioStage ? (
                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : isChantingStudioSutra ? (
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                      <span>{chantStudioStage ? 'Đang tải...' : isChantingStudioSutra ? 'Dừng' : 'Nghe'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRingBell}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1.5"
                    >
                      <span>🔔</span>
                      <span>Thỉnh Chuông</span>
                    </button>
                  </div>
                </div>

                {/* Interactive Mõ Percussion Dashboard */}
                <div className="p-5 rounded-3xl bg-slate-950 border border-amber-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={handleHitWoodenFish}
                      className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                      title="Bấm hoặc nhấn phím để gõ mõ"
                    >
                      🪵
                    </button>
                    <div>
                      <div className="text-xs text-slate-400 font-semibold">Chuỗi Hạt Niệm Phật:</div>
                      <div className="text-2xl font-black text-amber-300 font-mono">
                        {woodenFishCount} <span className="text-sm font-sans text-slate-400">/ 108 biến</span>
                      </div>
                    </div>
                  </div>

                  {/* Auto Wooden Fish Controls */}
                  <div className="flex items-center flex-wrap gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsAutoWoodenFish(!isAutoWoodenFish)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                        isAutoWoodenFish
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800'
                      }`}
                    >
                      {isAutoWoodenFish ? 'Tắt Gõ Tự Động' : 'Bật Tự Động Gõ Mõ'}
                    </button>

                    {isAutoWoodenFish && (
                      <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                        <span className="text-slate-400">Nhịp:</span>
                        <input
                          type="range"
                          min={40}
                          max={120}
                          value={autoFishBpm}
                          onChange={(e) => setAutoFishBpm(Number(e.target.value))}
                          className="w-20 accent-amber-500"
                        />
                        <span className="font-mono text-amber-300">{autoFishBpm}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Big Readable Sutra Verses with Step Navigation */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Lời Kinh Trì Tụng (Chữ To Dễ Đọc):</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveSutraLineIdx((p) => Math.max(0, p - 1))}
                        disabled={activeSutraLineIdx <= 0}
                        className="px-2 py-1 rounded bg-slate-800 disabled:opacity-30 hover:text-white"
                      >
                        Câu trước
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveSutraLineIdx((p) =>
                            Math.min(selectedChantSutra.lyrics.length - 1, p + 1)
                          )
                        }
                        disabled={activeSutraLineIdx >= selectedChantSutra.lyrics.length - 1}
                        className="px-2 py-1 rounded bg-slate-800 disabled:opacity-30 hover:text-white"
                      >
                        Câu kế
                      </button>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 max-h-72 overflow-y-auto font-serif text-base text-slate-200 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
                    {selectedChantSutra.lyrics.map((line, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setActiveSutraLineIdx(idx);
                          buddhistAudio.hitWoodenFish(0.5);
                        }}
                        className={`p-2.5 rounded-xl cursor-pointer transition-all ${
                          activeSutraLineIdx === idx
                            ? 'bg-amber-950/60 border border-amber-500/50 text-amber-200 font-bold scale-[1.01]'
                            : 'hover:text-amber-300 hover:bg-slate-900/50'
                        }`}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Sutra Selection */}
            <div className="lg:col-span-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Chọn Bài Kinh Trì Tụng
              </h4>
              <div className="space-y-2.5">
                {TEMPLE_SUTRAS.map((sutra) => (
                  <button
                    key={sutra.id}
                    type="button"
                    onClick={() => {
                      setSelectedChantSutra(sutra);
                      setActiveSutraLineIdx(0);
                      setWoodenFishCount(0);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                      selectedChantSutra.id === sutra.id
                        ? 'bg-amber-950/40 border-amber-500 text-white shadow-lg'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    <div className="text-[10px] text-amber-400 font-bold mb-1">
                      {sutra.category} • {sutra.duration}
                    </div>
                    <div className="text-xs font-bold">{sutra.title}</div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                      {sutra.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PHÒNG NGHE KINH (YOUTUBE & KHO ÂM THANH TUYỂN CHỌN) */}
        {/* ========================================================================= */}
        {activeTab === 'nghe-kinh' && (
          <div className="space-y-4">
            {/* Control Bar: Mode Toggle & Custom YouTube Link */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
              {/* Mode switch */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 self-stretch md:self-auto">
                <button
                  type="button"
                  onClick={() => setSutraPlaybackMode('youtube')}
                  className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    sutraPlaybackMode === 'youtube'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Video YouTube</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSutraPlaybackMode('audio');
                    handleGenerateStudioSutraAudio(selectedAudioSutra);
                  }}
                  className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    sutraPlaybackMode === 'audio'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Nghe Âm Thanh</span>
                </button>
              </div>

              {/* Custom YouTube Link / ID Form */}
              <form
                onSubmit={handleApplyCustomYoutube}
                className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-xl"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={customYoutubeInput}
                    onChange={(e) => setCustomYoutubeInput(e.target.value)}
                    placeholder="Dán link YouTube hoặc nhập ID bài kinh tùy chọn..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition-all shadow"
                >
                  Phát Ngay
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchYoutube()}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs shrink-0 flex items-center gap-1 font-medium"
                  title="Tìm kiếm các bài tụng kinh khác trên YouTube"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tìm Trên YouTube</span>
                </button>
              </form>
            </div>

            {/* YouTube Search Modal / Results Drawer */}
            {showYtSearchPanel && (
              <div className="rounded-2xl bg-slate-900 border border-amber-500/40 p-4 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Kết Quả Tìm Kiếm Bài Kinh Trên YouTube
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowYtSearchPanel(false)}
                    className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
                  >
                    Đóng lại
                  </button>
                </div>

                {isSearchingYoutube ? (
                  <div className="py-6 text-center text-xs text-amber-300 flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <span>Đang tìm kiếm bài kinh thanh tịnh trên YouTube...</span>
                  </div>
                ) : ytSearchResults.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    Không tìm thấy video phù hợp. Quý Phật tử có thể dán trực tiếp link YouTube vào ô trên để phát.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto">
                    {ytSearchResults.slice(0, 9).map((resVid) => (
                      <div
                        key={resVid.youtubeId}
                        onClick={() => {
                          setActiveYoutubeId(resVid.youtubeId);
                          setSutraPlaybackMode('youtube');
                          setShowYtSearchPanel(false);
                          onShowToast(`Đang phát: ${resVid.title.slice(0, 40)}...`);
                        }}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500 cursor-pointer flex items-center gap-2.5 transition-all"
                      >
                        <img
                          src={resVid.thumbnail}
                          alt={resVid.title}
                          referrerPolicy="no-referrer"
                          className="w-16 h-10 object-cover rounded-lg shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-200 truncate">{resVid.title}</p>
                          <p className="text-[10px] text-slate-400 truncate">{resVid.channel}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Main Stage Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-4">
                <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
                  {sutraPlaybackMode === 'youtube' ? (
                    /* 16:9 Verified Live YouTube Video Embed + Multi-Source Backup Bar */
                    <div>
                      <div className="relative aspect-video w-full bg-slate-950">
                        <iframe
                          key={activeYoutubeId || selectedAudioSutra.youtubeId}
                          src={`https://www.youtube.com/embed/${activeYoutubeId || selectedAudioSutra.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                          title={selectedAudioSutra.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full border-0"
                        />
                      </div>
                      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-slate-400">Nguồn phát bài kinh:</span>
                          {[
                            selectedAudioSutra.youtubeId,
                            ...(selectedAudioSutra.youtubeFallbackIds || []),
                          ].map((ytId, idx) => (
                            <button
                              key={ytId}
                              type="button"
                              onClick={() => setActiveYoutubeId(ytId)}
                              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                                (activeYoutubeId || selectedAudioSutra.youtubeId) === ytId
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                              }`}
                            >
                              Video #{idx + 1}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSutraPlaybackMode('audio');
                            handleGenerateStudioSutraAudio(selectedAudioSutra);
                          }}
                          className="text-amber-300 hover:text-amber-200 font-semibold underline"
                        >
                          Nghe âm thanh bài kinh
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Direct API Chanting Player + Chuông Mõ */
                    <div className="p-8 sm:p-10 bg-gradient-to-br from-slate-950 via-amber-950/30 to-slate-950 text-center space-y-5">
                      <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/15 border border-amber-500/50 flex items-center justify-center text-3xl">
                        🪷
                      </div>
                      <div className="max-w-lg mx-auto space-y-1">
                        <span className="text-[11px] font-bold text-amber-400">
                          Tụng Kinh Âm Thanh · Minh Hiếu Lễ Chùa
                        </span>
                        <h4 className="text-lg font-black text-white">
                          {selectedAudioSutra.title}
                        </h4>
                      </div>

                      {isGeneratingSutraAudio ? (
                        <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-900 border border-amber-500/40 text-xs text-amber-300 flex items-center justify-center gap-2.5">
                          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                          <span>{sutraAudioStage || 'Đang tải...'}</span>
                        </div>
                      ) : sutraStudioAudioMap[`${MINH_HIEU_LE_CHUA_VOICE_ID}::${selectedAudioSutra.id}`] ? (
                        <div className="max-w-md mx-auto space-y-3">
                          <audio
                            key={`${MINH_HIEU_LE_CHUA_VOICE_ID}::${selectedAudioSutra.id}`}
                            src={
                              sutraStudioAudioMap[`${MINH_HIEU_LE_CHUA_VOICE_ID}::${selectedAudioSutra.id}`]
                            }
                            controls
                            autoPlay
                            className="w-full accent-amber-500"
                          />
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsAutoWoodenFish((v) => !v)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border ${
                                isAutoWoodenFish
                                  ? 'bg-emerald-600 text-white border-emerald-500'
                                  : 'bg-slate-900 text-amber-300 border-slate-800'
                              }`}
                            >
                              {isAutoWoodenFish ? 'Đang Gõ Mõ Đệm Nhịp' : 'Bật Gõ Mõ Đệm Theo Kinh'}
                            </button>
                            <a
                              href={
                                sutraStudioAudioMap[
                                  `${MINH_HIEU_LE_CHUA_VOICE_ID}::${selectedAudioSutra.id}`
                                ]
                              }
                              download={`${selectedAudioSutra.id}.mp3`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-sky-300 border border-slate-800 text-xs font-semibold flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Tải MP3</span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleGenerateStudioSutraAudio(selectedAudioSutra)}
                          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-2 shadow-lg"
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>Nghe</span>
                        </button>
                      )}

                      <div className="max-w-xl mx-auto p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-left font-serif text-xs sm:text-sm text-amber-100/90 max-h-48 overflow-y-auto space-y-1.5">
                        {selectedAudioSutra.lyrics.map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Player Meta & Quick Actions */}
                  <div className="p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                          {selectedAudioSutra.category} • {selectedAudioSutra.duration}
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                          {selectedAudioSutra.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`https://www.youtube.com/watch?v=${activeYoutubeId || selectedAudioSutra.youtubeId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 border border-slate-700"
                          title="Mở trực tiếp trên trang YouTube"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Mở Trên YouTube</span>
                        </a>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedAudioSutra.description}
                    </p>

                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Công đức trì niệm:</span>
                      <strong className="text-amber-300">{selectedAudioSutra.merit}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Sutra List */}
              <div className="lg:col-span-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Tuyển Tập Kinh Tụng Bất Hủ
                </h4>
                <div className="space-y-2.5">
                  {TEMPLE_SUTRAS.map((sutra) => (
                    <button
                      key={sutra.id}
                      type="button"
                      onClick={() => {
                        setSelectedAudioSutra(sutra);
                        setActiveYoutubeId(sutra.youtubeId);
                        if (sutraPlaybackMode === 'audio') {
                          handleGenerateStudioSutraAudio(sutra);
                        }
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                        selectedAudioSutra.id === sutra.id
                          ? 'bg-amber-950/40 border-amber-500 text-white shadow-lg'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850'
                      }`}
                    >
                      <div className="text-[10px] text-amber-400 font-bold mb-1">
                        {sutra.category} • {sutra.duration}
                      </div>
                      <div className="text-xs font-bold">{sutra.title}</div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {sutra.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PHÁP ĐƯỜNG (PHÒNG GIẢNG ĐẠO - MINH HIẾU LỄ CHÙA) */}
        {/* ========================================================================= */}
        {activeTab === 'giang-dao' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                      Pháp Thoại Phật Học • {selectedDharma.speaker}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                      {selectedDharma.title}
                    </h3>
                  </div>

                  {/* Single Clean Nghe / Dừng Button Connected Directly to Minh Hiếu Lễ Chùa API */}
                  <div className="flex items-center shrink-0">
                    <button
                      type="button"
                      onClick={handlePlayMinhHieuVoice}
                      disabled={isGeneratingMinhHieuVoice}
                      className="px-5 py-2 rounded-2xl text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 flex items-center gap-2 shadow-lg transition-all active:scale-95 whitespace-nowrap"
                    >
                      {isGeneratingMinhHieuVoice ? (
                        <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : isDharmaPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                      <span>
                        {isGeneratingMinhHieuVoice
                          ? 'Đang tải...'
                          : isDharmaPlaying
                          ? 'Dừng'
                          : 'Nghe'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Progress while loading API audio */}
                {isGeneratingMinhHieuVoice && (
                  <div className="p-3 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-2">
                    <div className="flex items-center justify-between text-xs text-amber-300">
                      <span>{generationStage || 'Đang tải...'}</span>
                      <span className="font-mono tabular-nums">{generationProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Native Audio Player when generated */}
                {minhHieuAudioUrl && (
                  <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Đang phát giọng Minh Hiếu Lễ Chùa</span>
                      </span>
                      <a
                        href={minhHieuAudioUrl}
                        download={`${selectedDharma.title}.mp3`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải MP3</span>
                      </a>
                    </div>
                    <audio
                      ref={audioPlayerRef}
                      src={minhHieuAudioUrl}
                      controls
                      autoPlay
                      onPlay={() => setIsDharmaPlaying(true)}
                      onPause={() => setIsDharmaPlaying(false)}
                      onEnded={() => setIsDharmaPlaying(false)}
                      className="w-full h-10 accent-amber-500"
                    />
                  </div>
                )}

                {/* Key Lessons Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                  {selectedDharma.keyLessons.map((lesson, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-950 border border-amber-900/30 text-xs text-amber-200/90 leading-relaxed font-serif"
                    >
                      <strong className="text-amber-400 font-sans block mb-1">Cốt Tủy #{idx + 1}:</strong>
                      {lesson}
                    </div>
                  ))}
                </div>

                {/* Full Dharma Speech Manuscript */}
                <div className="space-y-2 pt-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Bản Văn Thuyết Pháp:
                    </h4>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 font-serif text-sm text-slate-200 leading-loose max-h-72 overflow-y-auto whitespace-pre-line scrollbar-thin scrollbar-thumb-slate-800">
                    {selectedDharma.fullSpeech}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Dharma Talks List */}
            <div className="lg:col-span-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Chuyên Đề Pháp Thoại Minh Hiếu Lễ Chùa
              </h4>
              <div className="space-y-2.5">
                {DHARMA_TALKS.map((talk) => (
                  <button
                    key={talk.id}
                    type="button"
                    onClick={() => {
                      if (audioPlayerRef.current) {
                        audioPlayerRef.current.pause();
                      }
                      setIsDharmaPlaying(false);
                      setMinhHieuAudioUrl(null);
                      setSelectedDharma(talk);
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      selectedDharma.id === talk.id
                        ? 'bg-amber-950/40 border-amber-500 text-white shadow-lg'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    <div className="text-[10px] text-amber-400 font-bold mb-1">{talk.duration}</div>
                    <div className="text-xs font-bold">{talk.title}</div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{talk.summary}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PHÒNG ĐỌC SÁCH KINH (TÀNG KINH CÁC) */}
        {/* ========================================================================= */}
        {activeTab === 'tang-kinh-cac' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-2">
                  <span>Tàng Kinh Các • Đọc Tụng Kinh Điển Đại Thừa</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Đọc kinh sách trang nghiêm và lắng nghe qua giọng đọc Minh Hiếu Lễ Chùa
                </p>
              </div>

              {/* Clean Single Nghe Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleBookSpeech}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all whitespace-nowrap ${
                    isBookSpeaking
                      ? 'bg-rose-600 text-white'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                  }`}
                >
                  {bookLoadingStage ? (
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isBookSpeaking ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  <span>{bookLoadingStage ? 'Đang tải...' : isBookSpeaking ? 'Dừng' : 'Nghe'}</span>
                </button>
              </div>
            </div>

            {/* Book Selector Pills */}
            <div className="flex items-center gap-2">
              {SACRED_BOOKS.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => {
                    setSelectedBook(book);
                    setCurrentChapterIdx(0);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedBook.id === book.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {book.title}
                </button>
              ))}
            </div>

            {/* Antique Parchment Paper Reading Surface */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#f7f2e7] text-slate-900 border-4 border-[#e2d5bd] shadow-2xl space-y-5 font-serif">
              <div className="flex items-center justify-between border-b border-[#dfd0b5] pb-3 text-xs text-slate-700">
                <span className="font-sans font-bold uppercase tracking-wider text-amber-900">
                  {selectedBook.title}
                </span>
                <div className="flex items-center gap-2 font-sans">
                  <span>
                    Chương {currentChapterIdx + 1} / {selectedBook.chapters.length}
                  </span>
                  <button
                    type="button"
                    disabled={currentChapterIdx <= 0}
                    onClick={() => setCurrentChapterIdx((p) => Math.max(0, p - 1))}
                    className="p-1 rounded bg-[#eae1ce] disabled:opacity-30 hover:bg-[#d8cbb1]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={currentChapterIdx >= selectedBook.chapters.length - 1}
                    onClick={() =>
                      setCurrentChapterIdx((p) => Math.min(selectedBook.chapters.length - 1, p + 1))
                    }
                    className="p-1 rounded bg-[#eae1ce] disabled:opacity-30 hover:bg-[#d8cbb1]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-lg sm:text-xl font-bold text-amber-950 mb-3 text-center">
                  {selectedBook.chapters[currentChapterIdx].title}
                </h4>
                <div className="text-sm sm:text-base leading-loose whitespace-pre-line text-slate-800 max-w-3xl mx-auto">
                  {selectedBook.chapters[currentChapterIdx].content}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: LA HÁN ĐƯỜNG (THẬP BÁT LA HÁN) */}
        {/* ========================================================================= */}
        {activeTab === 'la-han' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-2">
                <span>Điện Thập Bát La Hán (18 Vị Tôn Giả)</span>
              </h3>
              <p className="text-xs text-slate-400">
                18 vị đại đệ tử đắc quả A-la-hán của Đức Thế Tôn, tiêu biểu cho các hạnh nguyện cao quý và trí tuệ vô úy
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {ARHAT_LIST.map((arhat) => (
                <div
                  key={arhat.id}
                  onClick={() => setSelectedArhat(arhat)}
                  className="group rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/60 p-3 flex flex-col justify-between transition-all cursor-pointer hover:shadow-lg"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-950 mb-2">
                    <img
                      src={arhat.imageUrl}
                      alt={arhat.nameVi}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-slate-950/80 text-[10px] font-mono text-amber-400">
                      #{arhat.id}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-bold text-white text-xs group-hover:text-amber-300 truncate">
                      {arhat.nameVi}
                    </h5>
                    <div className="text-[10px] text-slate-400 truncate font-serif italic">
                      {arhat.alias}
                    </div>
                    <p className="text-[10px] text-amber-400/80 line-clamp-2 mt-1">
                      {arhat.meaning}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: ĐIỆN CÚNG DƯỜNG TAM BẢO & BÀN DÂNG LỄ (TÙY TÂM HOÀN TOÀN MIỄN PHÍ) */}
        {/* ========================================================================= */}
        {activeTab === 'cung-duong' && (
          <div className="space-y-8">
            {/* Banner Header Cúng Dường Tam Bảo */}
            <div className="rounded-3xl bg-gradient-to-r from-amber-900/70 via-yellow-950/80 to-amber-900/70 border-2 border-amber-500/60 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="relative z-10 max-w-3xl space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow">
                    Điện Cúng Dường Tam Bảo
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Tùy Tâm Không Mua Cũng Được
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Ghi Danh Công Đức &amp; Kệ Vật Phẩm Dâng Cúng Chư Phật
                </h3>
                <p className="text-xs sm:text-sm text-amber-200/90 leading-relaxed font-serif">
                  "Phật tại tâm, một nén tâm hương dâng lên mười phương chư Phật quý giá hơn ngàn vạn bạc tiền. 
                  Quý Phật tử có thể chọn vật phẩm dâng cúng, ghi danh vào <strong>Sổ Vàng Công Đức</strong>, 
                  hoặc cúng dường tùy tâm hoàn toàn hoan hỷ để cầu an cho gia đạo và hồi hướng phước đức."
                </p>
              </div>
            </div>

            {/* PHẦN 1: KỆ VẬT PHẨM CẦN MUA ĐỂ CÚNG (CHỌN SỐ LƯỢNG) */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-amber-400" />
                    <span>Kệ Vật Phẩm Cúng Dường Chư Phật</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Chọn số lượng vật phẩm tâm linh cần dâng cúng lên ban thờ chư Phật
                  </p>
                </div>
                <div className="text-xs text-amber-300/90 font-medium">
                  Đã chọn: <strong className="text-amber-400">{selectedStoreItems.length} loại vật phẩm</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {TEMPLE_STORE_ITEMS.map((item) => {
                  const qty = storeItemQuantities[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-3 ${
                        qty > 0
                          ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-500/10'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="text-3xl p-2 bg-slate-950 rounded-xl border border-slate-800">
                            {item.icon}
                          </span>
                          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                            {item.price.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        <div>
                          <h5 className="font-bold text-white text-xs sm:text-sm">{item.name}</h5>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                            {item.description}
                          </p>
                        </div>
                        <div className="text-[10px] text-amber-300/80 font-serif italic">
                          Ý nghĩa: {item.meaning}
                        </div>
                      </div>

                      {/* Stepper Controls */}
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-emerald-400 font-bold">
                          +{item.meritPoints} Điểm Công Đức
                        </span>

                        <div className="flex items-center gap-2 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleItemQuantityChange(item.id, -1)}
                            disabled={qty <= 0}
                            className="w-6 h-6 rounded-lg bg-slate-800 disabled:opacity-30 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-white w-5 text-center font-mono">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleItemQuantityChange(item.id, 1)}
                            className="w-6 h-6 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PHẦN 2: MẪU GHI DANH CÔNG ĐỨC & GIỎ LỄ VẬT DÂNG CÚNG */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Ghi Danh Công Đức */}
              <div className="lg:col-span-7 rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-7 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <h4 className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-amber-400" />
                      <span>Mẫu Ghi Danh Sổ Vàng Công Đức</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Điền thông tin thí chủ để nhà chùa dâng sớ cầu an, cầu siêu và lưu trữ vĩnh viễn trên Neon PostgreSQL
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openMemberAuthModal(currentMember ? 'profile' : 'login')}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-300 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {currentMember ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{currentMember.fullName}</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Đăng nhập tự điền</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isSyncingAllData}
                      onClick={() => handleSyncAllTempleData(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-emerald-300 flex items-center gap-1.5 whitespace-nowrap"
                      title="Cập nhật toàn bộ dữ liệu mới vào Neon PostgreSQL"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAllData ? 'animate-spin' : ''}`} />
                      <span>Đồng Bộ Data</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmitMeritRegistry} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Họ và tên thí chủ: *
                      </label>
                      <input
                        type="text"
                        required
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        placeholder="VD: Đỗ Minh Hiếu"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Pháp danh (nếu có):
                      </label>
                      <input
                        type="text"
                        value={donorDharmaName}
                        onChange={(e) => setDonorDharmaName(e.target.value)}
                        placeholder="VD: Nhuận Trí, Diệu Tâm..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Quê quán / Tỉnh thành:
                      </label>
                      <input
                        type="text"
                        value={donorAddress}
                        onChange={(e) => setDonorAddress(e.target.value)}
                        placeholder="VD: Quảng Ngãi, Hà Nội, TP. HCM..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Mục đích phát tâm:
                      </label>
                      <select
                        value={donorPrayerType}
                        onChange={(e: any) => {
                          const val = e.target.value;
                          setDonorPrayerType(val);
                          if (val === 'cau-sieu') setDonorSutraId('kinh-a-di-da');
                          else if (val === 'thi-cu') setDonorSutraId('bat-nha-tam-kinh');
                          else if (val === 'cau-an' || val === 'suc-khoe')
                            setDonorSutraId('kinh-duoc-su');
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="cau-an">Cầu An Gia Đạo &amp; Bản Thân (Bình an, may mắn)</option>
                        <option value="cau-sieu">Cầu Siêu Cửu Huyền Thất Tổ (Vãng sanh Cực Lạc)</option>
                        <option value="hoi-huong">Hồi Hướng Công Đức Tam Bảo Cho Muôn Loài</option>
                        <option value="suc-khoe">Cầu Sức Khỏe &amp; Tiêu Trừ Tật Ách</option>
                        <option value="thi-cu">Cầu Con Cái Ngoan Ngoãn, Thi Cử Đỗ Đạt</option>
                        <option value="cong-danh">Cầu Công Danh Sự Nghiệp Thuận Buồm Xuôi Gió</option>
                        <option value="khac">Tâm Nguyện Khác</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Số điện thoại liên hệ thành viên:
                      </label>
                      <input
                        type="text"
                        value={donorPhone}
                        onChange={(e) => setDonorPhone(e.target.value)}
                        placeholder="VD: 0985123688"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-amber-300 block mb-1">
                        Kết nối Bài Kinh Tụng Hồi Hướng:
                      </label>
                      <select
                        value={donorSutraId}
                        onChange={(e) => setDonorSutraId(e.target.value)}
                        className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-200 focus:outline-none focus:border-amber-500"
                      >
                        {TEMPLE_SUTRAS.map((sutra) => (
                          <option key={sutra.id} value={sutra.id}>
                            {sutra.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Lời cầu nguyện / Khấn nguyện chân thành:
                    </label>
                    <textarea
                      rows={3}
                      value={donorPrayerText}
                      onChange={(e) => setDonorPrayerText(e.target.value)}
                      placeholder="Nguyện cầu mười phương Chư Phật gia hộ cho cha mẹ mạnh khỏe sống lâu trăm tuổi, con cháu hiếu thuận, gia đạo thuận hòa..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 font-serif leading-relaxed resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Tùy tâm phát tâm thêm vào quỹ chùa (Tùy chọn, 0 đ):
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      value={customOfferingDonation || ''}
                      onChange={(e) => setCustomOfferingDonation(Math.max(0, Number(e.target.value)))}
                      placeholder="Nhập số tiền phát tâm thêm (VNĐ) hoặc để 0 đ..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingMerit}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>
                      {totalStoreAmount > 0
                        ? `Mua Lễ Vật Qua Tài Khoản Admin (${totalStoreAmount.toLocaleString('vi-VN')} đ) & Ghi Danh`
                        : 'Dâng Tâm Hương (0 đ) & Lưu Vào Sổ Vàng Công Đức'}
                    </span>
                  </button>
                </form>
              </div>

              {/* Giỏ Lễ Vật & Tóm Tắt Công Đức */}
              <div className="lg:col-span-5 rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-7 shadow-xl space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <span>Mâm Lễ Vật Chuẩn Bị Dâng Kính</span>
                    </h4>
                    <span className="text-xs text-amber-400 font-bold">
                      {selectedStoreItems.length} món
                    </span>
                  </div>

                  {selectedStoreItems.length === 0 ? (
                    <div className="py-8 text-center space-y-2 text-slate-400">
                      <div className="text-3xl">🪷</div>
                      <p className="text-xs">
                        Chưa chọn vật phẩm nào trên kệ. Bạn có thể bấm (+) ở các món trên để thêm vào mâm lễ, hoặc dâng tâm hương 0 đ.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {selectedStoreItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span>{item.icon}</span>
                            <div className="truncate">
                              <span className="font-bold text-white block truncate">{item.name}</span>
                              <span className="text-[10px] text-slate-400">
                                {item.quantity} x {item.price.toLocaleString('vi-VN')} đ
                              </span>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-amber-300 ml-2">
                            {item.subtotal.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {customOfferingDonation > 0 && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <span className="text-slate-300">Tùy tâm đóng góp thêm:</span>
                      <strong className="font-mono text-emerald-400">
                        {customOfferingDonation.toLocaleString('vi-VN')} đ
                      </strong>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Tổng điểm công đức:</span>
                    <strong className="text-emerald-400 font-bold text-sm">
                      +{totalStoreMerit} Điểm
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Tổng tiền công đức:</span>
                    <span className="text-lg font-black text-amber-400 font-mono">
                      {totalStoreAmount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 text-center italic">
                    * Khoản tiền cúng dường mang ý nghĩa công đức tượng trưng, gieo duyên lành Tam Bảo
                  </p>
                </div>
              </div>
            </div>

            {/* PHẦN 3: BẢN DỮ LIỆU LƯU LẠI (SỔ VÀNG CÔNG ĐỨC TAM BẢO) */}
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-7 shadow-2xl space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h4 className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-amber-400" />
                    <span>Sổ Vàng Công Đức Tam Bảo (Bản Dữ Liệu Lưu Trữ)</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Danh bạ ghi danh thiện nam tín nữ cúng dường, cầu an và hồi hướng công đức
                  </p>
                </div>

                {/* Search & Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={meritSearchQuery}
                      onChange={(e) => setMeritSearchQuery(e.target.value)}
                      placeholder="Tìm theo tên hoặc mã điệp..."
                      className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 w-48"
                    />
                  </div>

                  <select
                    value={meritFilterType}
                    onChange={(e) => setMeritFilterType(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">Tất cả tâm nguyện</option>
                    <option value="cau-an">Cầu An</option>
                    <option value="cau-sieu">Cầu Siêu</option>
                    <option value="hoi-huong">Hồi Hướng</option>
                    <option value="thi-cu">Thi Cử</option>
                  </select>
                </div>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    📜
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Tổng lượt ghi danh</span>
                    <div className="text-base font-black text-white">{meritRecords.length} lượt</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    🪙
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Tổng tiền công đức</span>
                    <div className="text-base font-black text-amber-400 font-mono">
                      {meritRecords
                        .reduce((sum, r) => sum + r.totalAmount, 0)
                        .toLocaleString('vi-VN')}{' '}
                      đ
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                    ✨
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Tổng điểm phước báu</span>
                    <div className="text-base font-black text-purple-300">
                      {meritRecords.reduce((sum, r) => sum + r.totalMeritPoints, 0)} điểm
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3.5">Mã Điệp</th>
                      <th className="py-3 px-3.5">Thời Gian</th>
                      <th className="py-3 px-3.5">Thí Chủ &amp; Pháp Danh</th>
                      <th className="py-3 px-3.5">Quê Quán</th>
                      <th className="py-3 px-3.5">Tâm Nguyện</th>
                      <th className="py-3 px-3.5">Lễ Vật Dâng Cúng</th>
                      <th className="py-3 px-3.5 text-right">Tiền Công Đức</th>
                      <th className="py-3 px-3.5 text-center">Phiếu Điệp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 font-sans">
                    {meritRecords
                      .filter((r) => {
                        const matchQ =
                          !meritSearchQuery.trim() ||
                          r.donorName.toLowerCase().includes(meritSearchQuery.toLowerCase()) ||
                          r.id.toLowerCase().includes(meritSearchQuery.toLowerCase()) ||
                          (r.dharmaName && r.dharmaName.toLowerCase().includes(meritSearchQuery.toLowerCase()));
                        const matchType = meritFilterType === 'all' || r.prayerType === meritFilterType;
                        return matchQ && matchType;
                      })
                      .map((record) => (
                        <tr key={record.id} className="hover:bg-slate-850/60 transition-colors">
                          <td className="py-3 px-3.5 font-mono text-[11px] text-amber-400 font-bold whitespace-nowrap">
                            {record.id}
                          </td>
                          <td className="py-3 px-3.5 text-[11px] text-slate-400 whitespace-nowrap">
                            {record.createdAt}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className="font-bold text-white">{record.donorName}</span>
                            {record.dharmaName && (
                              <span className="text-[10px] text-amber-300 ml-1.5">
                                ({record.dharmaName})
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-[11px] text-slate-400">
                            {record.address || 'Việt Nam'}
                          </td>
                          <td className="py-3 px-3.5 max-w-xs">
                            <span className="text-[11px] font-semibold text-amber-300">
                              {record.prayerType === 'cau-an'
                                ? 'Cầu An'
                                : record.prayerType === 'cau-sieu'
                                ? 'Cầu Siêu'
                                : record.prayerType === 'thi-cu'
                                ? 'Thi Cử'
                                : record.prayerType === 'suc-khoe'
                                ? 'Sức Khỏe'
                                : 'Hồi Hướng'}
                              {record.sutraTitle ? ` · ${record.sutraTitle.slice(0, 28)}...` : ''}
                            </span>
                            <p className="text-[11px] text-slate-300 line-clamp-1 italic font-serif">
                              "{record.prayerText}"
                            </p>
                          </td>
                          <td className="py-3 px-3.5 text-[11px] text-slate-300">
                            {record.items.length > 0 ? (
                              <span>
                                {record.items.map((it) => `${it.itemName} (${it.quantity})`).join(', ')}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">Dâng tâm hương</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-amber-400 whitespace-nowrap tabular-nums">
                            {record.totalAmount.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedCertificateRecord(record)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-[10px] transition-all flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Xem Điệp</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const s =
                                    TEMPLE_SUTRAS.find((x) => x.id === record.sutraId) ||
                                    (record.prayerType === 'cau-sieu'
                                      ? TEMPLE_SUTRAS.find((x) => x.id === 'kinh-a-di-da')
                                      : TEMPLE_SUTRAS[0]) ||
                                    TEMPLE_SUTRAS[0];
                                  handleJumpToSutra(s, 'youtube');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold text-[10px] transition-all"
                                title="Mở bài kinh kết nối để tụng / nghe hồi hướng"
                              >
                                Nghe Kinh
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PHẦN 4: THẢ ĐÈN HOA ĐĂNG & HÒM CÔNG ĐỨC TRUYỀN THỐNG */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Box 1: Hòm Công Đức Tam Bảo (Tùy Hỷ) */}
              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl">
                    🪙
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">Hòm Công Đức Tam Bảo (Tùy Hỷ)</h4>
                    <p className="text-xs text-slate-400">
                      Góp viên gạch tu bổ chùa, in kinh ấn tống (Hoàn toàn tùy tâm 0đ)
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="text-xs text-slate-300">
                    <span>Chọn mức phát tâm tùy hỷ (tượng trưng công đức):</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['0 đ (Tùy tâm)', '10.000 đ', '20.000 đ', '50.000 đ', '100.000 đ', 'Tùy Hỷ'].map(
                      (tier, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
                            buddhistAudio.ringTempleBell(0.5);
                            addMerit(50, `Cúng dường Tam Bảo ${tier}`);
                          }}
                          className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500 text-xs font-bold text-amber-300 transition-all text-center"
                        >
                          {tier}
                        </button>
                      )
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-400 font-medium text-center pt-1">
                    ✓ Hoàn toàn miễn phí. Điểm công đức được ghi nhận trực tiếp vào tài khoản của bạn.
                  </p>
                </div>
              </div>

              {/* Box 2: Thả Đèn Hoa Đăng Cầu An Trên Hồ Sen */}
              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-2xl">
                    🪔
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">Thả Đèn Hoa Đăng Cầu An Hồ Sen</h4>
                    <p className="text-xs text-slate-400">
                      Thả ngọn đèn hoa đăng trôi trên hồ sen, gửi ước nguyện an lành cho gia đình
                    </p>
                  </div>
                </div>

                <form onSubmit={handleReleaseLantern} className="space-y-3">
                  <input
                    type="text"
                    value={lanternWish}
                    onChange={(e) => setLanternWish(e.target.value)}
                    placeholder="Nhập lời cầu an (VD: Cầu cho cha mẹ mạnh khỏe, con cái bình an)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <span>Thả Hoa Đăng Xuống Hồ Sen (+35 Công Đức)</span>
                  </button>
                </form>

                {/* Floating lanterns preview */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-1">
                  {releasedLanterns.slice(0, 4).map((l) => (
                    <div
                      key={l.id}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-amber-200/90 shrink-0 font-serif"
                    >
                      🪷 <strong>{l.name}:</strong> "{l.wish.slice(0, 25)}..."
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: SỔ LƯU BÚT THẬP PHƯƠNG */}
        {/* ========================================================================= */}
        {activeTab === 'luu-but' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Guestbook Form */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm sm:text-base font-black text-amber-300">
                    Ghi Lời Cầu Nguyện &amp; Lưu Bút
                  </h4>
                  <p className="text-xs text-slate-400">
                    Lời cầu an cho cha mẹ, gia đình và hồi hướng công đức cho khắp chúng sinh
                  </p>
                </div>

                <form onSubmit={handleSubmitGuestbook} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Họ và tên của bạn: *
                    </label>
                    <input
                      type="text"
                      required
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="VD: Nguyễn Văn An"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Pháp danh (nếu có):
                      </label>
                      <input
                        type="text"
                        value={authorDharmaName}
                        onChange={(e) => setAuthorDharmaName(e.target.value)}
                        placeholder="VD: Tâm An"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Nơi ở / Quê quán:
                      </label>
                      <input
                        type="text"
                        value={authorLocation}
                        onChange={(e) => setAuthorLocation(e.target.value)}
                        placeholder="VD: TP. HCM, Hà Nội..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Lời nguyện ước / Hồi hướng công đức: *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={prayerWish}
                      onChange={(e) => setPrayerWish(e.target.value)}
                      placeholder="Cầu cho cha mẹ mạnh khỏe bình an, gia đình hạnh phúc, tai qua nạn khỏi..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 resize-none font-serif leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingGuestbook}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Lưu Lời Cầu Nguyện Vào Sổ Chùa</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right: Public Guestbook Feed */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Sổ Vàng Công Đức Thập Phương ({guestbookList.length} lời nguyện)
                </h4>
              </div>

              <div className="space-y-3 max-h-[560px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-1">
                {guestbookList.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-white font-bold">{entry.name}</strong>
                        {entry.dharmaName && (
                          <span className="text-[10px] text-amber-300 ml-1.5 font-medium">
                            ({entry.dharmaName})
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 ml-2">• {entry.location}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{entry.createdAt}</span>
                    </div>

                    <p className="text-xs text-amber-100/90 font-serif leading-relaxed italic bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                      "{entry.wish}"
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                      <span className="text-amber-400/80">A Di Đà Phật 🙏</span>
                      <button
                        type="button"
                        onClick={() => handleLikeGuestbook(entry.id)}
                        className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Heart className="w-3.5 h-3.5 fill-current text-rose-500" />
                        <span>{entry.likes} Chúc Phúc</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB HOA VIÊN KHU MỘ 3D (KHU THỜ & BIA MỘ TƯỞNG NIỆM 3D TRỰC TUYẾN) */}
        {/* ========================================================================= */}
        {activeTab === 'hoa-vien-mo' && (
          <MemorialParkSection
            timeOfDay={timeOfDay}
            tombs={memorialTombs}
            tributes={memorialTributes}
            members={templeMembers}
            paymentSettings={templePaymentSettings}
            selectedStudioVoiceId={selectedStudioVoiceId}
            currentMember={currentMember}
            externalFocusPlotCode={externalFocusPlotCode}
            isSyncingData={isSyncingAllData}
            onOpenMemberModal={openMemberAuthModal}
            onSyncAllData={() => handleSyncAllTempleData(false)}
            onRefreshOverview={refreshTempleOverview}
            onUpdateTombsLocal={setMemorialTombs}
            onUpdateTributesLocal={setMemorialTributes}
            onUpdatePaymentSettingsLocal={setTemplePaymentSettings}
            onAddMeritPoints={addMerit}
            onChantSutra={(sutra) => handleJumpToSutra(sutra, 'youtube')}
            onShowToast={onShowToast}
          />
        )}
      </main>

      {/* MODAL: ĐĂNG KÝ / ĐĂNG NHẬP / HỒ SƠ THÀNH VIÊN PHẬT TỬ */}
      <TempleMemberAuthModal
        isOpen={isMemberModalOpen}
        initialMode={memberModalMode}
        currentMember={currentMember}
        tombs={memorialTombs}
        meritRecords={meritRecords}
        onClose={() => setIsMemberModalOpen(false)}
        onAuthSuccess={(member, isNew) => {
          setCurrentMember(member);
          if (isNew) {
            addMerit(100, 'Đăng ký Thành Viên Phật Tử');
          }
          refreshTempleOverview();
        }}
        onLogoutSuccess={() => {
          setCurrentMember(null);
        }}
        onJumpToTomb={(plotCode) => {
          setActiveTab('hoa-vien-mo');
          setExternalFocusPlotCode(plotCode);
        }}
        onViewCertificate={(record) => {
          setSelectedCertificateRecord(record);
        }}
        onShowToast={onShowToast}
      />

      {/* MODAL: INSPECT BUDDHA STATUE */}
      {selectedStatue && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-amber-500/50 rounded-3xl overflow-hidden shadow-2xl space-y-4">
            <div className="relative h-60 w-full bg-slate-950">
              <img
                src={selectedStatue.imageUrl}
                alt={selectedStatue.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
              <button
                type="button"
                onClick={() => setSelectedStatue(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-950/80 text-white hover:bg-rose-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3 pt-0">
              <div>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                  {selectedStatue.title}
                </span>
                <h3 className="text-lg font-black text-white">{selectedStatue.name}</h3>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <strong className="text-amber-300 block">Đại Nguyện Cứu Độ:</strong>
                <p className="font-serif italic leading-relaxed">{selectedStatue.vow}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <span className="text-slate-400">Chân ngôn trì tụng: </span>
                <strong className="text-amber-400 font-serif">{selectedStatue.mantra}</strong>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleBowToBuddha();
                    setSelectedStatue(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Cung Kính Lạy Phật
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INSPECT ARHAT */}
      {selectedArhat && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                  Vị La Hán Thứ #{selectedArhat.id} • {selectedArhat.nameSanskrit}
                </span>
                <h3 className="text-base font-black text-white">{selectedArhat.nameVi}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setIsArhatSpeaking(false);
                  setArhatLoadingStage('');
                  setSelectedArhat(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950">
              <img
                src={selectedArhat.imageUrl}
                alt={selectedArhat.nameVi}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <strong className="text-amber-300">Biểu tượng &amp; Tư thế: </strong>
                <span className="text-slate-300">{selectedArhat.symbol}</span>
              </div>
              <div>
                <strong className="text-amber-300">Ý nghĩa triết lý: </strong>
                <span className="text-slate-300">{selectedArhat.meaning}</span>
              </div>
              <div>
                <strong className="text-amber-300">Sự tích &amp; Hạnh nguyện: </strong>
                <p className="text-slate-300 font-serif leading-relaxed italic mt-0.5">
                  {selectedArhat.story}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (isArhatSpeaking) {
                    stopSpeaking();
                    setIsArhatSpeaking(false);
                    setArhatLoadingStage('');
                    return;
                  }
                  setIsArhatSpeaking(true);
                  const ok = await speakViaStudioVoiceApi(
                    `${selectedArhat.nameVi}. ${selectedArhat.meaning}. ${selectedArhat.story}`,
                    {
                      voiceId: MINH_HIEU_LE_CHUA_VOICE_ID,
                      speedRate: 1.0,
                      onLoadingChange: (loading) => setArhatLoadingStage(loading ? 'Đang tải...' : ''),
                      onEnd: () => {
                        setIsArhatSpeaking(false);
                        setArhatLoadingStage('');
                      },
                      onError: (errMsg) => {
                        setIsArhatSpeaking(false);
                        setArhatLoadingStage('');
                        onShowToast(errMsg || 'Không thể kết nối giọng đọc API');
                      },
                    }
                  );
                  if (ok) addMerit(5, `Chiêm bái ${selectedArhat.nameVi}`);
                }}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                  isArhatSpeaking
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
                }`}
              >
                {arhatLoadingStage ? (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isArhatSpeaking ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                <span>{arhatLoadingStage ? 'Đang tải...' : isArhatSpeaking ? 'Dừng' : 'Nghe'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: OFFERING DEDICATION */}
      {selectedOffering && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 text-center shadow-2xl space-y-4">
            <div className="text-4xl">{selectedOffering.icon}</div>
            <div className="space-y-1">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                Dâng Cúng Tam Bảo • Tùy Tâm Công Đức
              </span>
              <h3 className="text-base font-black text-white">{selectedOffering.name}</h3>
              <p className="text-xs text-slate-300">{selectedOffering.meaning}</p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <span className="text-slate-400 block mb-1">Lời phát tâm dâng cúng (tùy chọn):</span>
              <input
                type="text"
                value={offeringDedication}
                onChange={(e) => setOfferingDedication(e.target.value)}
                placeholder="VD: Cầu mong cha mẹ bình an, con cháu hiếu thuận..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedOffering(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmOffering}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-black shadow-lg"
              >
                Xác Nhận Dâng Lễ Kính Phật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ĐIỆP CÔNG ĐỨC VÀNG KIM (CERTIFICATE OF MERIT) */}
      {selectedCertificateRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-xl w-full bg-[#fcf8ee] text-slate-900 border-8 border-[#d4af37] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 relative my-8 font-serif">
            {/* Top decorative seal */}
            <div className="text-center space-y-1 relative border-b-2 border-[#d4af37]/40 pb-4">
              <span className="text-xs uppercase font-sans font-bold tracking-widest text-[#996515]">
                Chùa Tam Bảo Trực Tuyến • Sổ Vàng Chứng Minh
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#664200] tracking-wide">
                ĐIỆP CÔNG ĐỨC TAM BẢO
              </h2>
              <div className="text-[10px] font-mono text-[#996515]">
                Mã Biên Bản: <strong>{selectedCertificateRecord.id}</strong> • Ngày: {selectedCertificateRecord.createdAt}
              </div>

              <button
                type="button"
                onClick={() => setSelectedCertificateRecord(null)}
                className="absolute top-0 right-0 w-8 h-8 rounded-full bg-[#ecdab3] hover:bg-[#dfc592] text-slate-800 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Certificate Body */}
            <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-slate-800">
              <p className="text-center italic text-[#8a5d14]">
                "Phụng Phật cúng dường, phước báo vô lượng. Gieo mầm Bồ Đề, kết quả an vui."
              </p>

              <div className="p-4 rounded-2xl bg-[#f5eddc] border border-[#e2d5bd] space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Thí chủ phát tâm:</span>
                    <strong className="text-sm font-black text-[#5c3c00]">
                      {selectedCertificateRecord.donorName}
                    </strong>
                    {selectedCertificateRecord.dharmaName && (
                      <span className="text-[11px] text-[#8a5d14] block">
                        (Pháp danh: {selectedCertificateRecord.dharmaName})
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block">Nơi chốn / Quê quán:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedCertificateRecord.address || 'Việt Nam'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#dfd0b5] text-xs">
                  <span className="text-slate-500 block">Tâm nguyện sở cầu:</span>
                  <p className="italic text-[#5c3c00] font-semibold mt-0.5">
                    "{selectedCertificateRecord.prayerText}"
                  </p>
                </div>
              </div>

              {/* Items and Merit Total */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-[#ebdcb9]">
                  <span className="text-slate-600">Lễ vật dâng cúng chư Phật:</span>
                  <span className="font-bold text-slate-900 text-right">
                    {selectedCertificateRecord.items.length > 0
                      ? selectedCertificateRecord.items.map((i) => `${i.itemName} (${i.quantity})`).join(', ')
                      : 'Tam Nén Tâm Hương Thanh Tịnh'}
                  </span>
                </div>

                {selectedCertificateRecord.customDonation > 0 && (
                  <div className="flex items-center justify-between py-1 border-b border-[#ebdcb9]">
                    <span className="text-slate-600">Đóng góp tu bổ chùa &amp; in kinh:</span>
                    <strong className="text-[#8a5d14]">
                      {selectedCertificateRecord.customDonation.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                )}

                <div className="flex items-center justify-between py-1.5 font-bold text-sm text-[#5c3c00]">
                  <span>Tổng tiền cúng dường ghi sổ:</span>
                  <span className="font-mono text-base font-black text-[#b8860b]">
                    {selectedCertificateRecord.totalAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              {/* Official Seal and Blessing */}
              <div className="pt-2 flex items-center justify-between border-t-2 border-[#d4af37]/40">
                <div className="text-[11px] text-slate-600 max-w-xs italic leading-normal">
                  Kính chúc thí chủ cùng bửu quyến: Thân tâm an lạc, gia đạo hưng long, phước thọ miên trường, sở cầu như ý!
                </div>

                <div className="w-20 h-20 rounded-full border-4 border-rose-700/80 text-rose-700 flex flex-col items-center justify-center text-[9px] font-sans font-black rotate-[-12deg] shrink-0 shadow">
                  <span>CHỨNG MINH</span>
                  <span>CHÙA TAM BẢO</span>
                  <span>CÔNG ĐỨC</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#dfd0b5] flex flex-wrap items-center gap-2 font-sans">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>In / Tải Điệp Công Đức</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const s =
                    TEMPLE_SUTRAS.find((x) => x.id === selectedCertificateRecord.sutraId) ||
                    TEMPLE_SUTRAS[0];
                  setSelectedCertificateRecord(null);
                  handleJumpToSutra(s, 'youtube');
                }}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Tụng Kinh Hồi Hướng</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (isCertSpeaking) {
                    stopSpeaking();
                    setIsCertSpeaking(false);
                    setCertLoadingStage('');
                    return;
                  }
                  setIsCertSpeaking(true);
                  await speakViaStudioVoiceApi(
                    `Chứng nhận công đức Tam Bảo. Thí chủ: ${selectedCertificateRecord.donorName}. Lời cầu: ${selectedCertificateRecord.prayerText}. Kính chúc quý đạo hữu cùng toàn gia quyến thân tâm an lạc, vạn sự cát tường, phước huệ trang nghiêm!`,
                    {
                      voiceId: MINH_HIEU_LE_CHUA_VOICE_ID,
                      speedRate: 1.0,
                      onLoadingChange: (loading) => setCertLoadingStage(loading ? 'Đang tải...' : ''),
                      onEnd: () => {
                        setIsCertSpeaking(false);
                        setCertLoadingStage('');
                      },
                      onError: (errMsg) => {
                        setIsCertSpeaking(false);
                        setCertLoadingStage('');
                        onShowToast(errMsg || 'Không thể kết nối giọng đọc API');
                      },
                    }
                  );
                }}
                className="px-4 py-2.5 rounded-xl bg-[#ecdab3] hover:bg-[#dfc592] text-[#5c3c00] font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
              >
                {certLoadingStage ? (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isCertSpeaking ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                <span>{certLoadingStage ? 'Đang tải...' : isCertSpeaking ? 'Dừng' : 'Nghe'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setIsCertSpeaking(false);
                  setCertLoadingStage('');
                  setSelectedCertificateRecord(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b8860b] text-slate-950 font-black text-xs shadow"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KẾT NỐI TÀI KHOẢN ADMIN MUA VẬT PHẨM CÚNG DƯỜNG */}
      {showMeritCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-lg w-full bg-slate-900 border border-amber-500/60 rounded-3xl p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs text-amber-400 font-semibold">
                  Kết Nối Tài Khoản Admin · Thỉnh Lễ Vật Cúng Dường Tam Bảo
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white">
                  Thanh Toán Vật Phẩm &amp; Lưu Sổ Vàng Công Đức
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowMeritCheckoutModal(false)}
                className="text-slate-400 hover:text-white px-2"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex flex-col items-center">
                {!meritQrFailed ? (
                  <img
                    src={`https://img.vietqr.io/image/${encodeURIComponent(
                      templePaymentSettings.bankId || 'MB'
                    )}-${encodeURIComponent(
                      templePaymentSettings.accountNo || ''
                    )}-compact2.png?amount=${Math.round(
                      totalStoreAmount
                    )}&addInfo=${encodeURIComponent(
                      `CUNGDUONG ${donorName.slice(0, 16)}`
                    )}&accountName=${encodeURIComponent(templePaymentSettings.accountName || '')}`}
                    alt="VietQR Tài Khoản Admin"
                    referrerPolicy="no-referrer"
                    onError={() => setMeritQrFailed(true)}
                    className="w-44 h-44 object-contain rounded-xl bg-white p-1.5"
                  />
                ) : (
                  <div className="w-44 h-44 rounded-xl bg-slate-900 border border-amber-500/40 flex flex-col items-center justify-center p-3 text-center text-xs text-amber-200">
                    <span className="font-bold">{templePaymentSettings.bankName}</span>
                    <span className="font-mono text-amber-400 mt-1">
                      {templePaymentSettings.accountNo}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">
                      {templePaymentSettings.accountName}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block">Ngân hàng nhận (Admin):</span>
                  <strong className="text-white">{templePaymentSettings.bankName}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block">Số tài khoản:</span>
                    <strong className="text-amber-400 font-mono text-sm">
                      {templePaymentSettings.accountNo}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard
                        ?.writeText(templePaymentSettings.accountNo)
                        .catch(() => {});
                      onShowToast(`Đã sao chép STK Admin: ${templePaymentSettings.accountNo}`);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <span className="text-slate-400 block">Chủ tài khoản:</span>
                  <strong className="text-white">{templePaymentSettings.accountName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Tổng tiền lễ vật &amp; công đức:</span>
                  <strong className="text-amber-300 font-mono text-base tabular-nums">
                    {totalStoreAmount.toLocaleString('vi-VN')} đ
                  </strong>
                </div>
              </div>
            </div>

            {templePaymentSettings.paypalMeUrl && (
              <a
                href={templePaymentSettings.paypalMeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Hoặc thanh toán qua PayPal Admin</span>
              </a>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowMeritCheckoutModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Quay Lại
              </button>
              <button
                type="button"
                disabled={isSubmittingMerit}
                onClick={() => finalizeMeritSubmission('vietqr_admin')}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg"
              >
                {isSubmittingMerit
                  ? 'Đang Lưu Sổ Vàng...'
                  : 'Xác Nhận Đã Chuyển & Xuất Điệp Công Đức'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
