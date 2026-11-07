import React, { useState, useMemo, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Flame,
  Volume2,
  VolumeX,
  Plus,
  Search,
  BookOpen,
  Settings,
  Copy,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronUp,
  Heart,
  ShieldCheck,
  ShoppingBag,
  UserCheck,
  UserPlus,
  RefreshCw,
  Sparkles,
  Pencil,
  Maximize2,
  Minimize2,
  Compass,
} from 'lucide-react';
import { MemorialPark3DCanvas } from './MemorialPark3DCanvas';
import { UniversalOfferingsStoreModal } from './UniversalOfferingsStoreModal';
import {
  MemorialPlotSlot,
  MemorialTombRecord,
  MemorialTributeRecord,
  TempleMemberRecord,
  TempleAdminPaymentSettings,
  SutraChant,
  MEMORIAL_PLOT_SLOTS,
  TOMB_MATERIAL_CATALOG,
  TOMB_ARCHITECTURE_CATALOG,
  TOMB_ADDON_ITEMS,
  TEMPLE_SUTRAS,
  DEFAULT_TEMPLE_ADMIN_PAYMENT,
  TombMaterialOption,
  TombArchitectureOption,
  TombAddonItem,
} from '../../data/buddhistTempleData';
import {
  parseSolarInputToDates,
  computeVietnameseTombLongevity,
} from '../../utils/lunarCalendarVi';
import {
  buddhistAudio,
  speakViaStudioVoiceApi,
  stopSpeaking,
} from '../../utils/buddhistAudio';
import { MINH_HIEU_LE_CHUA_VOICE_ID } from '../../utils/everai';
import { resolveApiEndpoint, safeFetchJson } from '../../utils/api';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { getAdminAuthHeaders } from '../../utils/adminAuth';
import { getMemberAuthHeaders } from '../../utils/templeMemberAuth';

interface MemorialParkSectionProps {
  timeOfDay: 'day' | 'dusk' | 'night';
  tombs: MemorialTombRecord[];
  tributes: MemorialTributeRecord[];
  members: TempleMemberRecord[];
  paymentSettings: TempleAdminPaymentSettings;
  selectedStudioVoiceId: string;
  currentMember?: TempleMemberRecord | null;
  externalFocusPlotCode?: string | null;
  isSyncingData?: boolean;
  onOpenMemberModal?: (mode?: 'login' | 'register' | 'profile') => void;
  onSyncAllData?: () => Promise<void>;
  onRefreshOverview: () => Promise<void>;
  onUpdateTombsLocal: (nextTombs: MemorialTombRecord[]) => void;
  onUpdateTributesLocal: (nextTributes: MemorialTributeRecord[]) => void;
  onUpdatePaymentSettingsLocal: (nextSettings: TempleAdminPaymentSettings) => void;
  onAddMeritPoints: (pts: number, reason: string) => void;
  onChantSutra: (sutra: SutraChant) => void;
  onShowToast: (msg: string) => void;
}

const VIET_BANKS = [
  { id: 'MB', name: 'Ngân hàng Quân Đội (MB Bank)' },
  { id: 'VCB', name: 'Ngân hàng Ngoại Thương (Vietcombank)' },
  { id: 'TCB', name: 'Ngân hàng Kỹ Thương (Techcombank)' },
  { id: 'ACB', name: 'Ngân hàng Á Châu (ACB)' },
  { id: 'BIDV', name: 'Ngân hàng Đầu Tư & Phát Triển (BIDV)' },
  { id: 'ICB', name: 'Ngân hàng Công Thương (VietinBank)' },
  { id: 'VPB', name: 'Ngân hàng Việt Nam Thịnh Vượng (VPBank)' },
  { id: 'TPB', name: 'Ngân hàng Tiên Phong (TPBank)' },
  { id: 'STB', name: 'Ngân hàng Sài Gòn Thương Tín (Sacombank)' },
];

export const MemorialParkSection: React.FC<MemorialParkSectionProps> = ({
  timeOfDay,
  tombs,
  tributes,
  members,
  paymentSettings,
  currentMember = null,
  externalFocusPlotCode = null,
  isSyncingData = false,
  onOpenMemberModal,
  onSyncAllData,
  onRefreshOverview,
  onUpdateTombsLocal,
  onUpdateTributesLocal,
  onUpdatePaymentSettingsLocal,
  onAddMeritPoints,
  onChantSutra,
  onShowToast,
}) => {
  const { isAdmin, requireAdmin } = useAdminAuth();
  const builderSectionRef = useRef<HTMLDivElement>(null);
  const deceasedInputRef = useRef<HTMLInputElement>(null);

  // 3D Viewport & Camera HUD state
  const [selectedPlotCode, setSelectedPlotCode] = useState<string | null>(() =>
    tombs[0]?.plotCode || null
  );
  const [cameraViewMode, setCameraViewMode] = useState<'overview' | 'closeup'>('overview');
  const [isHudCollapsed, setIsHudCollapsed] = useState<boolean>(false);
  const [burningPlotCode, setBurningPlotCode] = useState<string | null>(null);
  const [isParkFullscreen, setIsParkFullscreen] = useState<boolean>(false);

  // ESC key listener to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isParkFullscreen) {
        setIsParkFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isParkFullscreen]);

  // Studio Voice API status for memorial prayer
  const [isReadingPrayer, setIsReadingPrayer] = useState<boolean>(false);
  const [prayerLoadingStage, setPrayerLoadingStage] = useState<string>('');

  // Visitor Tribute Input
  const [visitorName, setVisitorName] = useState<string>('');
  const [tributeMessage, setTributeMessage] = useState<string>('');
  const [isSubmittingTribute, setIsSubmittingTribute] = useState<boolean>(false);
  const [isTombStoreOpen, setIsTombStoreOpen] = useState<boolean>(false);

  // Addon Upgrade Checkout Modal for Existing Tomb
  const [pendingAddonUpgrade, setPendingAddonUpgrade] = useState<{
    tomb: MemorialTombRecord;
    addon: TombAddonItem;
  } | null>(null);

  // Builder / Construction Form State
  const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false);
  const [builderSlot, setBuilderSlot] = useState<MemorialPlotSlot>(() => {
    const firstEmpty = MEMORIAL_PLOT_SLOTS.find(
      (s) => !tombs.some((t) => t.plotCode === s.plotCode)
    );
    return firstEmpty || MEMORIAL_PLOT_SLOTS[0];
  });
  const [editingTombId, setEditingTombId] = useState<string | null>(null);

  const [steleHeader, setSteleHeader] = useState<string>('PHẬT QUANG TIẾP DẪN');
  const [deceasedFullName, setDeceasedFullName] = useState<string>('');
  const [deceasedDharmaName, setDeceasedDharmaName] = useState<string>('');
  const [gender, setGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [birthSolar, setBirthSolar] = useState<string>('12/05/1948');
  const [birthLunar, setBirthLunar] = useState<string>('04/04 năm Mậu Tý');
  const [deathSolar, setDeathSolar] = useState<string>('20/10/2024');
  const [deathLunar, setDeathLunar] = useState<string>('18/09 năm Giáp Thìn');
  const [longevityType, setLongevityType] = useState<'huong-tho' | 'huong-duong' | 'huong-nien'>('huong-tho');
  const [longevityAge, setLongevityAge] = useState<number>(77);
  const [hometown, setHometown] = useState<string>('');
  const [epitaph, setEpitaph] = useState<string>(
    'Công cha nghĩa mẹ cao dày, con cháu muôn đời tạc dạ ghi tâm.'
  );
  const [erectedBy, setErectedBy] = useState<string>('Toàn thể hiếu quyến đồng phụng lập');
  const [builderName, setBuilderName] = useState<string>('');
  const [builderPhone, setBuilderPhone] = useState<string>('');
  const [builderEmail, setBuilderEmail] = useState<string>('');
  const [materialId, setMaterialId] = useState<TombMaterialOption['id']>('da_xanh_cong_duc');
  const [architectureId, setArchitectureId] = useState<TombArchitectureOption['id']>('mo_don_tam_cap');
  const [selectedAddons, setSelectedAddons] = useState<TombAddonItem['id'][]>([]);
  const [dedicatedSutraId, setDedicatedSutraId] = useState<string>('kinh-a-di-da');
  const [paymentMethod, setPaymentMethod] = useState<'vietqr_admin' | 'paypal_admin' | 'tuy-tam'>('vietqr_admin');
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [isSavingTomb, setIsSavingTomb] = useState<boolean>(false);
  const [qrLoadFailed, setQrLoadFailed] = useState<boolean>(false);

  // Data Registry Tab State
  const [registryTab, setRegistryTab] = useState<'tombs' | 'members' | 'tributes' | 'admin-payment'>('tombs');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Admin Payment Form State
  const [adminPayDraft, setAdminPayDraft] = useState<TempleAdminPaymentSettings>(
    paymentSettings || DEFAULT_TEMPLE_ADMIN_PAYMENT
  );
  const [isSavingAdminPay, setIsSavingAdminPay] = useState<boolean>(false);

  useEffect(() => {
    if (paymentSettings) {
      setAdminPayDraft(paymentSettings);
    }
  }, [paymentSettings]);

  // Auto-fill member contact info when logged in
  useEffect(() => {
    if (currentMember) {
      setBuilderName((prev) => prev || currentMember.fullName);
      setBuilderPhone((prev) => prev || currentMember.phone || '');
      setBuilderEmail((prev) => prev || currentMember.email || '');
      setHometown((prev) => prev || currentMember.address || '');
      setVisitorName((prev) => prev || currentMember.fullName);
    }
  }, [currentMember]);

  useEffect(() => {
    if (externalFocusPlotCode) {
      setIsBuilderOpen(false);
      setSelectedPlotCode(externalFocusPlotCode);
      setCameraViewMode('closeup');
    }
  }, [externalFocusPlotCode]);

  const occupiedMap = useMemo(() => {
    const map = new Map<string, MemorialTombRecord>();
    tombs.forEach((t) => {
      if (!t.isDraft) {
        map.set(t.plotCode.toUpperCase(), t);
      }
    });
    return map;
  }, [tombs]);

  const selectedTomb = useMemo(() => {
    if (!selectedPlotCode) return null;
    return occupiedMap.get(selectedPlotCode.toUpperCase()) || null;
  }, [selectedPlotCode, occupiedMap]);

  // Keep selectedPlotCode synced with real tombs when sample tombs or admin-deleted tombs are removed
  useEffect(() => {
    if (isBuilderOpen) return;
    if (selectedPlotCode && !occupiedMap.has(selectedPlotCode.toUpperCase())) {
      setSelectedPlotCode(tombs[0]?.plotCode || null);
    } else if (!selectedPlotCode && tombs.length > 0) {
      setSelectedPlotCode(tombs[0].plotCode);
    }
  }, [tombs, occupiedMap, isBuilderOpen, selectedPlotCode]);

  const isTombOwner = (tomb: MemorialTombRecord | null | undefined): boolean => {
    if (!tomb || !currentMember?.id || !tomb.memberId) return false;
    return String(tomb.memberId) === String(currentMember.id);
  };

  const canEditTomb = (tomb: MemorialTombRecord | null | undefined): boolean => {
    if (!tomb) return false;
    return Boolean(isAdmin) || isTombOwner(tomb);
  };

  const canDeleteTomb = (tomb: MemorialTombRecord | null | undefined): boolean => {
    if (!tomb) return false;
    return Boolean(isAdmin);
  };

  // Recompute Lunar dates & Hưởng Thọ / Hưởng Dương automatically when Solar inputs change
  const handleSolarBirthChange = (val: string) => {
    setBirthSolar(val);
    const parsedBirth = parseSolarInputToDates(val);
    if (parsedBirth) {
      setBirthLunar(parsedBirth.lunarFormatted);
      const parsedDeath = parseSolarInputToDates(deathSolar);
      if (parsedDeath) {
        const longInfo = computeVietnameseTombLongevity(parsedBirth.lunarYear, parsedDeath.lunarYear);
        setLongevityAge(longInfo.age);
        setLongevityType(longInfo.longevityType);
      }
    }
  };

  const handleSolarDeathChange = (val: string) => {
    setDeathSolar(val);
    const parsedDeath = parseSolarInputToDates(val);
    if (parsedDeath) {
      setDeathLunar(parsedDeath.lunarFormatted);
      const parsedBirth = parseSolarInputToDates(birthSolar);
      if (parsedBirth) {
        const longInfo = computeVietnameseTombLongevity(parsedBirth.lunarYear, parsedDeath.lunarYear);
        setLongevityAge(longInfo.age);
        setLongevityType(longInfo.longevityType);
      }
    }
  };

  // Cost calculation for Tomb Builder
  const selectedMaterialObj = useMemo(
    () => TOMB_MATERIAL_CATALOG.find((m) => m.id === materialId) || TOMB_MATERIAL_CATALOG[0],
    [materialId]
  );
  const selectedArchObj = useMemo(
    () => TOMB_ARCHITECTURE_CATALOG.find((a) => a.id === architectureId) || TOMB_ARCHITECTURE_CATALOG[0],
    [architectureId]
  );
  const selectedAddonObjs = useMemo(
    () => TOMB_ADDON_ITEMS.filter((item) => selectedAddons.includes(item.id)),
    [selectedAddons]
  );

  const builderTotalCost = useMemo(() => {
    const plotCost = editingTombId ? 0 : builderSlot.plotFee;
    const matCost = selectedMaterialObj.price;
    const archCost = selectedArchObj.price;
    const addonsCost = selectedAddonObjs.reduce((s, a) => s + a.price, 0);
    return plotCost + matCost + archCost + addonsCost;
  }, [editingTombId, builderSlot, selectedMaterialObj, selectedArchObj, selectedAddonObjs]);

  // Live 3D Draft Tomb rendered right inside MemorialPark3DCanvas when Builder is open
  const previewDraftTomb: MemorialTombRecord | null = useMemo(() => {
    if (!isBuilderOpen) return null;
    return {
      id: editingTombId || `draft-${builderSlot.plotCode}`,
      isDraft: true,
      plotCode: builderSlot.plotCode,
      zoneName: builderSlot.zoneName,
      rowIndex: builderSlot.rowIndex,
      colIndex: builderSlot.colIndex,
      steleHeader: steleHeader.trim() || 'PHẬT QUANG TIẾP DẪN',
      deceasedFullName: (deceasedFullName.trim() || 'NGUYỄN VĂN AN').toUpperCase(),
      deceasedDharmaName: deceasedDharmaName.trim() || undefined,
      gender,
      birthSolar: birthSolar.trim() || '01/01/1950',
      birthLunar: birthLunar.trim() || '15/11 năm Kỷ Sửu',
      deathSolar: deathSolar.trim() || '01/01/2025',
      deathLunar: deathLunar.trim() || '02/12 năm Giáp Thìn',
      longevityType,
      longevityAge: Number(longevityAge) || 76,
      hometown: hometown.trim() || 'Việt Nam',
      epitaph: epitaph.trim(),
      erectedBy: erectedBy.trim() || 'Gia quyến đồng lập',
      builderName: builderName.trim() || currentMember?.fullName || 'Gia quyến',
      materialId,
      architectureId,
      addons: selectedAddons,
      dedicatedSutraId,
      totalCost: builderTotalCost,
      paymentMethod,
      paymentStatus: 'approved',
      incenseCount: 1,
      flowerCount: 1,
      createdAt: 'Xem trước 3D',
    };
  }, [
    isBuilderOpen,
    editingTombId,
    builderSlot,
    steleHeader,
    deceasedFullName,
    deceasedDharmaName,
    gender,
    birthSolar,
    birthLunar,
    deathSolar,
    deathLunar,
    longevityType,
    longevityAge,
    hometown,
    epitaph,
    erectedBy,
    builderName,
    currentMember,
    materialId,
    architectureId,
    selectedAddons,
    dedicatedSutraId,
    builderTotalCost,
    paymentMethod,
  ]);

  const scrollToBuilderForm = () => {
    setTimeout(() => {
      builderSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      deceasedInputRef.current?.focus({ preventScroll: true });
    }, 80);
  };

  const findPreferredEmptySlot = (): MemorialPlotSlot | null => {
    const emptyFree = MEMORIAL_PLOT_SLOTS.find(
      (s) => s.plotFee === 0 && !occupiedMap.has(s.plotCode.toUpperCase())
    );
    if (emptyFree) return emptyFree;
    return (
      MEMORIAL_PLOT_SLOTS.find((s) => !occupiedMap.has(s.plotCode.toUpperCase())) || null
    );
  };

  const openBuilderForEmptySlot = (slot?: MemorialPlotSlot) => {
    if (!currentMember && !isAdmin) {
      onShowToast(
        'Vui lòng Đăng ký hoặc Đăng nhập tài khoản Thành viên để lập mộ mới (tài khoản tạo mộ nào sẽ có quyền chỉnh sửa mộ đó)!'
      );
      onOpenMemberModal?.('login');
      return;
    }

    const targetSlot = slot || findPreferredEmptySlot();
    if (!targetSlot) {
      onShowToast('Hiện tại cả 24 ô đất trong Hoa Viên đều đã có mộ!');
      return;
    }
    setEditingTombId(null);
    setBuilderSlot(targetSlot);
    setSelectedPlotCode(targetSlot.plotCode);
    setCameraViewMode('closeup');
    setDeceasedFullName('');
    setDeceasedDharmaName('');
    setSteleHeader('PHẬT QUANG TIẾP DẪN');
    if (currentMember) {
      setBuilderName(currentMember.fullName);
      setBuilderPhone(currentMember.phone || '');
      setBuilderEmail(currentMember.email || '');
      if (!hometown) setHometown(currentMember.address || '');
    }
    if (targetSlot.plotFee === 0) {
      setMaterialId('da_xanh_cong_duc');
      setArchitectureId('mo_don_tam_cap');
      setSelectedAddons([]);
    }
    setIsBuilderOpen(true);
    scrollToBuilderForm();
  };

  const openBuilderToUpgradeTomb = (tomb: MemorialTombRecord) => {
    if (!canEditTomb(tomb)) {
      onShowToast(
        'Mộ của thành viên khác không được chỉnh sửa hay xóa — Quý khách chỉ được dọn dẹp, dâng hương và nghe đọc!'
      );
      return;
    }

    const slot =
      MEMORIAL_PLOT_SLOTS.find((s) => s.plotCode === tomb.plotCode) || {
        plotCode: tomb.plotCode,
        zoneName: tomb.zoneName,
        rowIndex: tomb.rowIndex,
        colIndex: tomb.colIndex,
        plotFee: 0,
      };
    setEditingTombId(tomb.id);
    setBuilderSlot(slot);
    setSelectedPlotCode(tomb.plotCode);
    setCameraViewMode('closeup');
    setSteleHeader(tomb.steleHeader);
    setDeceasedFullName(tomb.deceasedFullName);
    setDeceasedDharmaName(tomb.deceasedDharmaName || '');
    setGender(tomb.gender);
    setBirthSolar(tomb.birthSolar);
    setBirthLunar(tomb.birthLunar);
    setDeathSolar(tomb.deathSolar);
    setDeathLunar(tomb.deathLunar);
    setLongevityType(tomb.longevityType);
    setLongevityAge(tomb.longevityAge);
    setHometown(tomb.hometown || '');
    setEpitaph(tomb.epitaph || '');
    setErectedBy(tomb.erectedBy);
    setBuilderName(tomb.builderName);
    setBuilderPhone(tomb.builderPhone || '');
    setBuilderEmail(tomb.builderEmail || '');
    setMaterialId(tomb.materialId);
    setArchitectureId(tomb.architectureId);
    setSelectedAddons(tomb.addons || ['lu_huong_da']);
    setDedicatedSutraId(tomb.dedicatedSutraId || 'kinh-a-di-da');
    setIsBuilderOpen(true);
    scrollToBuilderForm();
  };

  const applyFreeTombPreset = () => {
    if (!editingTombId && builderSlot.plotFee > 0) {
      const freeSlot = MEMORIAL_PLOT_SLOTS.find(
        (s) => s.plotFee === 0 && !occupiedMap.has(s.plotCode.toUpperCase())
      );
      if (freeSlot) {
        setBuilderSlot(freeSlot);
        setSelectedPlotCode(freeSlot.plotCode);
      }
    }
    setMaterialId('da_xanh_cong_duc');
    setArchitectureId('mo_don_tam_cap');
    setSelectedAddons([]);
    onShowToast('Đã chọn gói Lập Mộ Công Đức Miễn Phí (0 đ) — Nhập họ tên và bấm Dựng Mộ ngay!');
  };

  const applyLuxuryTombPreset = () => {
    setMaterialId('granite_kim_sa');
    setArchitectureId('mo_mai_dao_co');
    setSelectedAddons(['lu_huong_da', 'binh_sen_ngoc']);
    onShowToast('Đã chuyển sang chế độ chọn Đá Cao Cấp & Vật Phẩm Thờ 3D!');
  };

  const toggleAddon = (id: TombAddonItem['id']) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  // Burn Incense / Clean Tomb / Offer Lotus at 3D Tomb (Allowed for all visitors & members)
  const handleTombTribute = async (
    tomb: MemorialTombRecord,
    type: 'dot-nhang' | 'dang-hoa' | 'don-dep'
  ) => {
    setIsSubmittingTribute(true);
    setBurningPlotCode(tomb.plotCode);
    if (type === 'dot-nhang') {
      buddhistAudio.playIncenseChime();
    } else {
      buddhistAudio.ringTempleBell(0.55);
    }

    const who =
      visitorName.trim() || currentMember?.fullName || 'Phật tử & Con cháu thập phương';
    const msg =
      tributeMessage.trim() ||
      (type === 'dot-nhang'
        ? `Thành tâm dâng hương tưởng nhớ ${tomb.deceasedFullName}, cầu nguyện hương linh siêu sanh Tịnh Độ.`
        : type === 'don-dep'
        ? `Thành tâm dọn dẹp, lau bia và chăm sóc phần mộ ${tomb.deceasedFullName} thanh tịnh trang nghiêm.`
        : `Dâng đóa sen thanh khiết kính viếng ${tomb.deceasedFullName}.`);

    try {
      const res = await safeFetchJson<{
        success: boolean;
        tomb?: MemorialTombRecord;
        tribute?: MemorialTributeRecord;
      }>(resolveApiEndpoint(`temple/tombs/${encodeURIComponent(tomb.id)}/tribute`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders(),
          ...getMemberAuthHeaders(),
        },
        body: JSON.stringify({
          plotCode: tomb.plotCode,
          memberId: currentMember?.id,
          visitorName: who,
          tributeType: type,
          message: msg,
        }),
      });

      if (res.tomb) {
        onUpdateTombsLocal(tombs.map((t) => (t.id === res.tomb!.id ? res.tomb! : t)));
      }
      if (res.tribute) {
        onUpdateTributesLocal([res.tribute, ...tributes]);
      }
      await onRefreshOverview();
    } catch {
      const updatedTomb: MemorialTombRecord = {
        ...tomb,
        incenseCount: tomb.incenseCount + (type === 'dot-nhang' ? 1 : 0),
        flowerCount: tomb.flowerCount + (type === 'dang-hoa' || type === 'don-dep' ? 1 : 0),
      };
      onUpdateTombsLocal(tombs.map((t) => (t.id === tomb.id ? updatedTomb : t)));
      const localTrib: MemorialTributeRecord = {
        id: `trib-local-${Date.now()}`,
        tombId: tomb.id,
        plotCode: tomb.plotCode,
        visitorName: who,
        tributeType: type,
        message: msg,
        createdAt: new Date().toLocaleString('vi-VN'),
      };
      onUpdateTributesLocal([localTrib, ...tributes]);
    } finally {
      setIsSubmittingTribute(false);
      setTributeMessage('');
      confetti({ particleCount: 40, spread: 55, origin: { y: 0.65 } });
      onAddMeritPoints(
        type === 'dot-nhang' ? 25 : type === 'don-dep' ? 20 : 30,
        type === 'dot-nhang'
          ? `Dâng hương tưởng nhớ tại mộ ${tomb.plotCode}`
          : type === 'don-dep'
          ? `Dọn dẹp & chăm sóc phần mộ ${tomb.plotCode}`
          : `Dâng hoa sen kính viếng mộ ${tomb.plotCode}`
      );
    }
  };

  // Speak Memorial Prayer & Stele Inscription via Studio Giọng Nói API
  const handleReadTombPrayer = async (tomb: MemorialTombRecord) => {
    if (isReadingPrayer) {
      stopSpeaking();
      setIsReadingPrayer(false);
      setPrayerLoadingStage('');
      return;
    }

    const longevityLabel =
      tomb.longevityType === 'huong-tho'
        ? 'Hưởng thọ'
        : tomb.longevityType === 'huong-duong'
        ? 'Hưởng dương'
        : 'Hưởng niên';

    const script = `Nam Mô A Di Đà Phật! Trước bia tưởng niệm phần mộ vị trí ${tomb.plotCode}, ${tomb.zoneName}. Thành tâm tưởng nhớ hương linh ${tomb.deceasedFullName}${
      tomb.deceasedDharmaName ? `, Pháp danh ${tomb.deceasedDharmaName}` : ''
    }. Sinh ngày ${tomb.birthSolar}, nhằm ngày ${tomb.birthLunar}. Từ trần ngày ${tomb.deathSolar}, nhằm ngày ${tomb.deathLunar}. ${longevityLabel} ${tomb.longevityAge} tuổi.${
      tomb.hometown ? ` Nguyên quán tại ${tomb.hometown}.` : ''
    } ${tomb.epitaph || ''} Nguyện đem công đức hương hoa tụng niệm này hồi hướng hương linh siêu sanh về miền Tịnh Độ an vui. Nam Mô Tiếp Dẫn Đạo Sư A Di Đà Phật!`;

    setIsReadingPrayer(true);
    await speakViaStudioVoiceApi(script, {
      voiceId: MINH_HIEU_LE_CHUA_VOICE_ID,
      speedRate: 1.0,
      onLoadingChange: (loading) => {
        setPrayerLoadingStage(loading ? 'Đang tải...' : '');
      },
      onEnd: () => {
        setIsReadingPrayer(false);
        setPrayerLoadingStage('');
      },
      onError: (errMsg) => {
        setIsReadingPrayer(false);
        setPrayerLoadingStage('');
        onShowToast(errMsg || 'Không thể kết nối giọng đọc API');
      },
    });
  };

  // Validate Builder Form & either Build Immediately (0đ) or Open Admin Payment Checkout
  const handleOpenBuilderCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deceasedFullName.trim()) {
      onShowToast('Vui lòng nhập Họ và tên người quá cố để khắc lên Bia Mộ 3D!');
      deceasedInputRef.current?.focus();
      return;
    }
    if (!birthSolar.trim() || !deathSolar.trim()) {
      onShowToast('Vui lòng nhập đầy đủ Ngày sanh và Ngày mất (Dương lịch & Âm lịch)!');
      return;
    }
    const effectiveBuilder = builderName.trim() || currentMember?.fullName || '';
    if (!effectiveBuilder) {
      onShowToast('Vui lòng nhập Họ tên thành viên / người đại diện lập mộ (hoặc Đăng nhập thành viên)!');
      return;
    }
    if (!builderName.trim() && effectiveBuilder) {
      setBuilderName(effectiveBuilder);
    }
    if (builderTotalCost <= 0) {
      handleConfirmBuildTomb();
      return;
    }
    setQrLoadFailed(false);
    setShowCheckoutModal(true);
  };

  // Confirm Tomb Construction & Persist to Neon PostgreSQL
  const handleConfirmBuildTomb = async () => {
    if (!currentMember && !isAdmin) {
      onShowToast('Vui lòng Đăng ký hoặc Đăng nhập Thành viên trước khi lập hoặc chỉnh sửa mộ!');
      onOpenMemberModal?.('login');
      return;
    }
    if (editingTombId) {
      const targetExisting = tombs.find((t) => t.id === editingTombId);
      if (targetExisting && !canEditTomb(targetExisting)) {
        onShowToast('Bạn không có quyền chỉnh sửa ngôi mộ của thành viên khác!');
        return;
      }
    }

    setIsSavingTomb(true);
    const effectiveBuilderName = builderName.trim() || currentMember?.fullName || (isAdmin ? 'Quản trị viên' : 'Gia quyến');
    const payload = {
      id: editingTombId || undefined,
      memberId: currentMember?.id || undefined,
      plotCode: builderSlot.plotCode,
      zoneName: builderSlot.zoneName,
      rowIndex: builderSlot.rowIndex,
      colIndex: builderSlot.colIndex,
      steleHeader: steleHeader.trim() || 'PHẬT QUANG TIẾP DẪN',
      deceasedFullName: deceasedFullName.trim().toUpperCase(),
      deceasedDharmaName: deceasedDharmaName.trim() || undefined,
      gender,
      birthSolar: birthSolar.trim(),
      birthLunar: birthLunar.trim(),
      deathSolar: deathSolar.trim(),
      deathLunar: deathLunar.trim(),
      longevityType,
      longevityAge: Number(longevityAge) || 75,
      hometown: hometown.trim() || currentMember?.address || undefined,
      epitaph: epitaph.trim() || undefined,
      erectedBy: erectedBy.trim() || 'Gia quyến đồng phụng lập',
      builderName: effectiveBuilderName,
      builderDharmaName: currentMember?.dharmaName || undefined,
      builderPhone: builderPhone.trim() || currentMember?.phone || undefined,
      builderEmail: builderEmail.trim() || currentMember?.email || undefined,
      materialId,
      architectureId,
      addons: selectedAddons.length > 0 ? selectedAddons : ['lu_huong_da'],
      dedicatedSutraId,
      totalCost: builderTotalCost,
      paymentMethod: builderTotalCost <= 0 ? 'tuy-tam' : paymentMethod,
    };

    try {
      const res = await safeFetchJson<{ success: boolean; tomb: MemorialTombRecord; error?: string }>(
        resolveApiEndpoint('temple/tombs'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAdminAuthHeaders(),
            ...getMemberAuthHeaders(),
          },
          body: JSON.stringify(payload),
        }
      );

      if (res.tomb) {
        const cleanSaved: MemorialTombRecord = { ...res.tomb, isDraft: false };
        const filtered = tombs.filter((t) => t.plotCode !== cleanSaved.plotCode && t.id !== cleanSaved.id);
        onUpdateTombsLocal([...filtered, cleanSaved]);
        setSelectedPlotCode(cleanSaved.plotCode);
      }
      await onRefreshOverview();
      setShowCheckoutModal(false);
      setIsBuilderOpen(false);
      setBurningPlotCode(builderSlot.plotCode);
      setCameraViewMode('closeup');
      buddhistAudio.ringTempleBell(0.75);
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
      onAddMeritPoints(editingTombId ? 40 : 200, `Lập / Cập nhật Khu Mộ 3D (${builderSlot.plotCode})`);
      onShowToast(
        editingTombId
          ? `Đã cập nhật Bia & Khu Mộ 3D vị trí ${builderSlot.plotCode} lên Neon PostgreSQL!`
          : `Đã lập & lưu thành công Khu Mộ 3D vị trí ${builderSlot.plotCode} lên cơ sở dữ liệu Neon PostgreSQL!`
      );
    } catch (err: any) {
      const msg = String(err?.message || 'Không thể lưu ngôi mộ 3D.');
      onShowToast(msg);
      if (msg.includes('Đăng ký hoặc Đăng nhập')) {
        onOpenMemberModal?.('login');
      }
      await onRefreshOverview();
    } finally {
      setIsSavingTomb(false);
    }
  };

  // Confirm Single Addon Purchase on Existing Tomb -> Only Owner or Admin
  const handleConfirmSingleAddonPurchase = async () => {
    if (!pendingAddonUpgrade) return;
    const { tomb, addon } = pendingAddonUpgrade;
    if (!canEditTomb(tomb)) {
      onShowToast('Chỉ chủ sở hữu ngôi mộ hoặc Admin mới được mua gắn thêm vật phẩm kiến trúc!');
      setPendingAddonUpgrade(null);
      return;
    }
    setIsSavingTomb(true);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        tomb?: MemorialTombRecord;
        tribute?: MemorialTributeRecord;
      }>(resolveApiEndpoint(`temple/tombs/${encodeURIComponent(tomb.id)}/tribute`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders(),
          ...getMemberAuthHeaders(),
        },
        body: JSON.stringify({
          plotCode: tomb.plotCode,
          memberId: currentMember?.id,
          visitorName: visitorName.trim() || currentMember?.fullName || tomb.builderName || 'Gia quyến',
          tributeType: 'mua-vat-pham',
          itemName: addon.name,
          addonToUnlock: addon.id,
          amount: addon.price,
          message: `Thỉnh vật phẩm 3D "${addon.name}" đặt lên khu mộ ${tomb.plotCode}.`,
        }),
      });
      if (res.tomb) {
        onUpdateTombsLocal(tombs.map((t) => (t.id === res.tomb!.id ? res.tomb! : t)));
      }
      if (res.tribute) {
        onUpdateTributesLocal([res.tribute, ...tributes]);
      }
      await onRefreshOverview();
      buddhistAudio.playIncenseChime();
      onAddMeritPoints(60, `Thỉnh vật phẩm thờ "${addon.name}"`);
      onShowToast(`Đã đặt "${addon.name}" lên ngôi mộ 3D ô ${tomb.plotCode}!`);
    } catch (err: any) {
      onShowToast(err?.message || 'Không thể gắn thêm vật phẩm lên mộ.');
    } finally {
      setIsSavingTomb(false);
      setPendingAddonUpgrade(null);
    }
  };

  // Admin: Save Payment Settings to Neon PostgreSQL
  const handleSaveAdminPaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    requireAdmin(async () => {
      setIsSavingAdminPay(true);
      try {
        await safeFetchJson(resolveApiEndpoint('temple/admin/payment-settings'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAdminAuthHeaders(),
          },
          body: JSON.stringify(adminPayDraft),
        });
        onUpdatePaymentSettingsLocal(adminPayDraft);
        await onRefreshOverview();
        onShowToast('Đã lưu cấu hình Tài Khoản Nhận Thanh Toán Admin vào Neon PostgreSQL!');
      } catch (err: any) {
        onShowToast('Lỗi lưu tài khoản Admin: ' + (err?.message || ''));
      } finally {
        setIsSavingAdminPay(false);
      }
    }, 'Cấu Hình Tài Khoản Nhận Vật Phẩm Chùa & Khu Mộ 3D');
  };

  const handleAdminApproveTomb = (tombId: string) => {
    requireAdmin(async () => {
      try {
        await safeFetchJson(resolveApiEndpoint('temple/admin/approve'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAdminAuthHeaders(),
          },
          body: JSON.stringify({
            targetType: 'tomb',
            id: tombId,
            paymentStatus: 'approved',
          }),
        });
        await onRefreshOverview();
        onShowToast('Admin đã xác nhận duyệt hồ sơ khu mộ!');
      } catch (err: any) {
        onShowToast('Lỗi duyệt: ' + (err?.message || ''));
      }
    });
  };

  const handleAdminDeleteTomb = (tomb: MemorialTombRecord) => {
    requireAdmin(async () => {
      try {
        await safeFetchJson(
          resolveApiEndpoint(`temple/admin/tombs/${encodeURIComponent(tomb.id)}`),
          {
            method: 'DELETE',
            headers: {
              ...getAdminAuthHeaders(),
            },
          }
        );
        onUpdateTombsLocal(tombs.filter((t) => t.id !== tomb.id));
        await onRefreshOverview();
        onShowToast(`Đã giải phóng ô mộ ${tomb.plotCode}.`);
      } catch (err: any) {
        onShowToast('Lỗi xóa ô mộ: ' + (err?.message || ''));
      }
    }, `Giải Phóng Ô Mộ ${tomb.plotCode}`);
  };

  const activePay = paymentSettings || DEFAULT_TEMPLE_ADMIN_PAYMENT;

  const buildVietQrUrl = (amount: number, memo: string) => {
    const bank = encodeURIComponent((activePay.bankId || 'MB').trim());
    const acc = encodeURIComponent((activePay.accountNo || '').trim());
    const name = encodeURIComponent((activePay.accountName || '').trim());
    const info = encodeURIComponent(memo.slice(0, 50));
    return `https://img.vietqr.io/image/${bank}-${acc}-compact2.png?amount=${Math.max(
      0,
      Math.round(amount)
    )}&addInfo=${info}&accountName=${name}`;
  };

  const copyText = (txt: string, label: string) => {
    navigator.clipboard?.writeText(txt).catch(() => {});
    onShowToast(`Đã sao chép ${label}: ${txt}`);
  };

  const emptyPlotsCount = MEMORIAL_PLOT_SLOTS.length - occupiedMap.size;

  return (
    <div className="space-y-8">
      {/* 0. TOP ACTION BAR: LẬP MỘ MỚI 3D + ĐĂNG KÝ / ĐĂNG NHẬP THÀNH VIÊN + CẬP NHẬT DATA */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-bold text-white">
            Hoa Viên Tâm Linh &amp; Khu Mộ Tưởng Niệm 3D Trực Tuyến
          </h3>
          <p className="text-xs text-slate-400">
            Hiện có {occupiedMap.size}/24 ngôi mộ · Còn trống <strong className="text-emerald-400">{emptyPlotsCount} ô đất</strong> · Lập mộ công đức 0 đ miễn phí hoặc chọn đá cao cấp lưu vĩnh viễn trên Neon PostgreSQL
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => openBuilderForEmptySlot()}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Lập Mộ Mới 3D</span>
          </button>

          {onOpenMemberModal && (
            <button
              type="button"
              onClick={() => onOpenMemberModal(currentMember ? 'profile' : 'login')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              {currentMember ? (
                <>
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Thành viên: {currentMember.fullName}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 text-amber-400" />
                  <span>Đăng Ký / Đăng Nhập Thành Viên</span>
                </>
              )}
            </button>
          )}

          {onSyncAllData && (
            <button
              type="button"
              disabled={isSyncingData}
              onClick={() => onSyncAllData()}
              className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
              title="Tự động tạo bảng & cập nhật toàn bộ dữ liệu bản mới vào Neon PostgreSQL"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingData ? 'animate-spin' : ''}`} />
              <span>{isSyncingData ? 'Đang cập nhật Data...' : 'Đồng Bộ Data Bản Mới'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. 3D MEMORIAL PARK SANCTUARY VIEWPORT WITH FULLSCREEN & COLLAPSIBLE CONTROL DOCK */}
      <div
        className={`${
          isParkFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : 'rounded-3xl border border-slate-800'
        } overflow-hidden bg-slate-950 shadow-2xl relative transition-all duration-300`}
      >
        <div
          className={`relative w-full ${
            isParkFullscreen ? 'h-full w-full' : 'h-[560px] sm:h-[640px] lg:h-[720px]'
          } bg-slate-950`}
        >
          <MemorialPark3DCanvas
            tombs={tombs}
            selectedPlotCode={isBuilderOpen ? builderSlot.plotCode : selectedPlotCode}
            previewDraftTomb={previewDraftTomb}
            burningPlotCode={burningPlotCode}
            timeOfDay={timeOfDay}
            cameraViewMode={cameraViewMode}
            onSelectTomb={(tomb) => {
              if (tomb.isDraft) {
                scrollToBuilderForm();
                return;
              }
              setIsBuilderOpen(false);
              setSelectedPlotCode(tomb.plotCode);
              setCameraViewMode('closeup');
            }}
            onSelectEmptyPlot={(slot) => {
              openBuilderForEmptySlot(slot);
            }}
            className="w-full h-full"
          />

          {/* Top-Left Minimal Spec Header (Solid/RGBA surface — NO backdrop-filter over WebGL) */}
          <div className="absolute top-4 left-4 z-10 pointer-events-none bg-slate-950/90 border border-slate-800 rounded-2xl px-4 py-2.5 max-w-md">
            <h3 className="text-sm sm:text-base font-bold text-amber-300 flex items-center gap-2">
              <span>Hoa Viên Tâm Linh &amp; Khu Lăng Mộ Tưởng Niệm 3D</span>
              {isParkFullscreen && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
                  Toàn Màn Hình
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Đài Tưởng Niệm Tôn Tượng Địa Tạng Vương Bồ Tát · {occupiedMap.size}/24 vị trí · Trống {emptyPlotsCount} ô đất
            </p>
          </div>

          {/* Top-Right Controls: Fullscreen Mode & Camera View Toggle */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                setCameraViewMode(cameraViewMode === 'overview' ? 'closeup' : 'overview');
              }}
              className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all"
              title={cameraViewMode === 'overview' ? 'Chuyển sang góc nhìn cận cảnh mộ' : 'Chuyển sang góc nhìn toàn cảnh hoa viên'}
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{cameraViewMode === 'overview' ? 'Cận Cảnh Mộ' : 'Toàn Cảnh'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsParkFullscreen(!isParkFullscreen)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-xl transition-all"
              title={isParkFullscreen ? 'Thu nhỏ khung nhìn (ESC)' : 'Mở toàn màn hình Hoa Viên Khu Mộ 3D'}
            >
              {isParkFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span>Thu Nhỏ (ESC)</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span>Toàn Màn Hình</span>
                </>
              )}
            </button>
          </div>

          {/* Collapsible Bottom-Center Control Dock (Zero Side-Panel Clutter, Zero backdrop-filter) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[min(940px,94vw)] flex flex-col items-center pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsHudCollapsed((v) => !v)}
              className="px-3.5 py-1 rounded-t-xl bg-slate-950/95 border border-b-0 border-slate-800 text-[11px] font-semibold text-amber-300 hover:text-white flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              {isHudCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Hiện Bảng Điều Khiển Hoa Viên 3D</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Thu Gọn Điều Khiển (Ngắm Toàn Cảnh 3D)</span>
                </>
              )}
            </button>

            {!isHudCollapsed && (
              <div className="w-full bg-slate-950/95 border border-slate-800 rounded-2xl p-3 shadow-2xl space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Camera Presets */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCameraViewMode('overview')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        cameraViewMode === 'overview'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Toàn Cảnh Hoa Viên 3D
                    </button>
                    <button
                      type="button"
                      onClick={() => setCameraViewMode('closeup')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        cameraViewMode === 'closeup'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Cận Cảnh Bia Mộ 3D ({(isBuilderOpen ? builderSlot.plotCode : selectedPlotCode) || 'A2'})
                    </button>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2">
                    <span className="hidden md:inline text-[11px] text-slate-400">
                      Kéo chuột xoay 360° · Cuộn con lăn phóng to chữ khắc trên bia đá
                    </span>
                    <button
                      type="button"
                      onClick={() => openBuilderForEmptySlot()}
                      className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Lập Mộ Mới 3D</span>
                    </button>
                  </div>
                </div>

                {/* 24-Plot Quick Jumper Strip (A1..D6) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  <span className="text-[11px] text-slate-400 font-medium shrink-0 mr-1">
                    Sơ đồ 24 ô:
                  </span>
                  {MEMORIAL_PLOT_SLOTS.map((slot) => {
                    const built = occupiedMap.get(slot.plotCode);
                    const isActive =
                      (isBuilderOpen ? builderSlot.plotCode : selectedPlotCode) === slot.plotCode;
                    return (
                      <button
                        key={slot.plotCode}
                        type="button"
                        onClick={() => {
                          if (built) {
                            setIsBuilderOpen(false);
                            setSelectedPlotCode(slot.plotCode);
                            setCameraViewMode('closeup');
                          } else {
                            openBuilderForEmptySlot(slot);
                          }
                        }}
                        title={
                          built
                            ? `Ô ${slot.plotCode}: ${built.deceasedFullName} (Nhấn để viếng & đọc bia 3D)`
                            : `Ô ${slot.plotCode} đang trống (${slot.plotFee.toLocaleString('vi-VN')} đ) - Nhấn để đặt vị trí xây mộ`
                        }
                        className={`px-2 py-1 rounded-lg text-[11px] font-mono font-semibold shrink-0 border transition-colors ${
                          isActive
                            ? 'bg-amber-400 text-slate-950 border-amber-300'
                            : built
                            ? 'bg-amber-950/60 text-amber-300 border-amber-700/60 hover:border-amber-400'
                            : 'bg-slate-900 text-emerald-300 border-slate-800 hover:border-emerald-500/60'
                        }`}
                      >
                        {slot.plotCode}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. LIVE 3D TOMB BUILDER & MATERIAL STORE (WHEN BUILDING OR UPGRADING A PLOT) */}
      {isBuilderOpen && (
        <div
          ref={builderSectionRef}
          className="rounded-3xl bg-slate-900 border border-amber-500/50 p-6 sm:p-8 shadow-2xl space-y-6 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs text-amber-400 font-medium">
                {editingTombId
                  ? `Chỉnh Sửa & Nâng Cấp Khu Mộ 3D · Ô ${builderSlot.plotCode}`
                  : `Lập Mộ Mới 3D · Ô ${builderSlot.plotCode} (${builderSlot.zoneName})`}
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                Khắc Bia Mộ Đầy Đủ (Dương Lịch · Âm Lịch · Hưởng Thọ / Hưởng Dương) &amp; Chọn Kiến Trúc Đá 3D
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Mọi thông tin bạn nhập bên dưới được khắc trực tiếp theo thời gian thực lên tấm Bia Đá 3D phía trên và lưu vào cơ sở dữ liệu Neon PostgreSQL.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start">
              {!editingTombId && (
                <>
                  <button
                    type="button"
                    onClick={applyFreeTombPreset}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                      builderTotalCost === 0
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : 'bg-slate-950 text-emerald-300 border-slate-700 hover:border-emerald-400'
                    }`}
                  >
                    Gói Công Đức Miễn Phí (0 đ)
                  </button>
                  <button
                    type="button"
                    onClick={applyLuxuryTombPreset}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                      builderTotalCost > 0
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                        : 'bg-slate-950 text-amber-300 border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    Chọn Đá &amp; Vật Phẩm Cao Cấp
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setIsBuilderOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold whitespace-nowrap"
              >
                Đóng
              </button>
            </div>
          </div>

          <form onSubmit={handleOpenBuilderCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left 7 Cols: Gravestone Inscription + Member Info */}
            <div className="lg:col-span-7 space-y-5">
              {/* Plot Selector */}
              {!editingTombId && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Chọn vị trí ô đất trống trong Hoa Viên 3D:
                  </label>
                  <select
                    value={builderSlot.plotCode}
                    onChange={(e) => {
                      const found = MEMORIAL_PLOT_SLOTS.find(
                        (s) => s.plotCode === e.target.value
                      );
                      if (found) {
                        setBuilderSlot(found);
                        setSelectedPlotCode(found.plotCode);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {MEMORIAL_PLOT_SLOTS.filter((s) => !occupiedMap.has(s.plotCode)).map((slot) => (
                      <option key={slot.plotCode} value={slot.plotCode}>
                        Ô {slot.plotCode} — {slot.zoneName} (Phí vị trí:{' '}
                        {slot.plotFee === 0
                          ? 'Miễn phí 0 đ - Công đức tùy tâm'
                          : `${slot.plotFee.toLocaleString('vi-VN')} đ`}
                        )
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Stele Header & Deceased Full Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Tiêu đề đầu bia mộ:
                  </label>
                  <select
                    value={steleHeader}
                    onChange={(e) => setSteleHeader(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="PHẬT QUANG TIẾP DẪN">PHẬT QUANG TIẾP DẪN</option>
                    <option value="CỐ PHỤ CHÍNH TRỰC">CỐ PHỤ CHÍNH TRỰC</option>
                    <option value="CỐ MẪU TỪ BI">CỐ MẪU TỪ BI</option>
                    <option value="BIA TƯỞNG NIỆM">BIA TƯỞNG NIỆM</option>
                    <option value="TÂY PHƯƠNG CỰC LẠC">TÂY PHƯƠNG CỰC LẠC</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-amber-300 block mb-1">
                    Họ và tên người quá cố (khắc chính giữa bia): *
                  </label>
                  <input
                    ref={deceasedInputRef}
                    type="text"
                    required
                    value={deceasedFullName}
                    onChange={(e) => setDeceasedFullName(e.target.value)}
                    placeholder="VD: CỤ ÔNG NGUYỄN VĂN PHÚC"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-bold uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Pháp danh / Tên Thánh:
                  </label>
                  <input
                    type="text"
                    value={deceasedDharmaName}
                    onChange={(e) => setDeceasedDharmaName(e.target.value)}
                    placeholder="VD: Minh Đức, Diệu Âm..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Giới tính:
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'Nam' | 'Nữ')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Nguyên quán / Quê quán:
                  </label>
                  <input
                    type="text"
                    value={hometown}
                    onChange={(e) => setHometown(e.target.value)}
                    placeholder="VD: Mộ Đức, Quảng Ngãi"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* SOLAR & LUNAR BIRTH / DEATH + HƯỞNG DƯƠNG / HƯỞNG THỌ */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3.5">
                <div className="text-xs font-bold text-amber-300">
                  Ngày Sanh · Ngày Mất (Dương Lịch &amp; Âm Lịch Tự Động) · Hưởng Thọ / Hưởng Dương
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Ngày Sanh Dương Lịch (DD/MM/YYYY): *
                    </label>
                    <input
                      type="text"
                      required
                      value={birthSolar}
                      onChange={(e) => handleSolarBirthChange(e.target.value)}
                      placeholder="VD: 12/05/1948"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-amber-200 block mb-1">
                      Ngày Sanh Âm Lịch (Tự tính hoặc sửa): *
                    </label>
                    <input
                      type="text"
                      required
                      value={birthLunar}
                      onChange={(e) => setBirthLunar(e.target.value)}
                      placeholder="VD: 04/04 năm Mậu Tý"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Ngày Mất Dương Lịch (DD/MM/YYYY): *
                    </label>
                    <input
                      type="text"
                      required
                      value={deathSolar}
                      onChange={(e) => handleSolarDeathChange(e.target.value)}
                      placeholder="VD: 20/10/2024"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-amber-200 block mb-1">
                      Ngày Mất Âm Lịch (Tự tính hoặc sửa): *
                    </label>
                    <input
                      type="text"
                      required
                      value={deathLunar}
                      onChange={(e) => setDeathLunar(e.target.value)}
                      placeholder="VD: 18/09 năm Giáp Thìn"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Danh xưng tuổi bia mộ (&lt;60 Hưởng Dương, &ge;60 Hưởng Thọ):
                    </label>
                    <select
                      value={longevityType}
                      onChange={(e) => setLongevityType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option value="huong-tho">HƯỞNG THỌ (Từ 60 tuổi trở lên)</option>
                      <option value="huong-duong">HƯỞNG DƯƠNG (Dưới 60 tuổi)</option>
                      <option value="huong-nien">HƯỞNG NIÊN</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Số tuổi khắc trên bia (Tuổi Âm / Tuổi Ta): *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={150}
                      required
                      value={longevityAge}
                      onChange={(e) => {
                        const ageVal = Math.max(1, Number(e.target.value));
                        setLongevityAge(ageVal);
                        setLongevityType(ageVal >= 60 ? 'huong-tho' : 'huong-duong');
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Epitaph, Erected By & Sutra Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Người lập bia (khắc chân bia mộ):
                  </label>
                  <input
                    type="text"
                    value={erectedBy}
                    onChange={(e) => setErectedBy(e.target.value)}
                    placeholder="VD: Trưởng nam Nguyễn Văn A cùng gia quyến đồng lập"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Kết nối Bài Kinh Cầu Siêu cho ngôi mộ:
                  </label>
                  <select
                    value={dedicatedSutraId}
                    onChange={(e) => setDedicatedSutraId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {TEMPLE_SUTRAS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Đôi dòng tưởng niệm khắc trên bia đá:
                </label>
                <input
                  type="text"
                  value={epitaph}
                  onChange={(e) => setEpitaph(e.target.value)}
                  placeholder="VD: Trọn đời nhân đức hiền hòa, phúc ấm lưu truyền cho con cháu..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-serif focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Member / Builder Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-xs font-semibold text-amber-300 block mb-1">
                    Họ tên thành viên xây dựng: *
                  </label>
                  <input
                    type="text"
                    required
                    value={builderName}
                    onChange={(e) => setBuilderName(e.target.value)}
                    placeholder="VD: Nguyễn Văn Bình"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Số điện thoại liên hệ:
                  </label>
                  <input
                    type="text"
                    value={builderPhone}
                    onChange={(e) => setBuilderPhone(e.target.value)}
                    placeholder="VD: 0905123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Email nhận xác nhận:
                  </label>
                  <input
                    type="email"
                    value={builderEmail}
                    onChange={(e) => setBuilderEmail(e.target.value)}
                    placeholder="VD: giadinh@gmail.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Right 5 Cols: 3D Stone Material, Architecture & Worship Addons Store */}
            <div className="lg:col-span-5 space-y-5">
              {/* Stone Material Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-amber-300 block">
                  1. Chọn Vật Liệu Đá Xây Mộ 3D:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TOMB_MATERIAL_CATALOG.map((mat) => {
                    const active = materialId === mat.id;
                    return (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => setMaterialId(mat.id)}
                        className={`text-left p-3 rounded-2xl border transition-colors ${
                          active
                            ? 'bg-amber-950/50 border-amber-400 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-white/30 shrink-0"
                            style={{ backgroundColor: mat.baseColorHex }}
                          />
                          <span className="text-[11px] font-mono font-bold text-amber-400 tabular-nums">
                            {mat.price.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        <div className="text-xs font-bold mt-1.5">{mat.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                          {mat.subtitle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3D Tomb Architecture Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-amber-300 block">
                  2. Chọn Kiến Trúc Lăng Mộ 3D:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TOMB_ARCHITECTURE_CATALOG.map((arch) => {
                    const active = architectureId === arch.id;
                    return (
                      <button
                        key={arch.id}
                        type="button"
                        onClick={() => setArchitectureId(arch.id)}
                        className={`text-left p-3 rounded-2xl border transition-colors ${
                          active
                            ? 'bg-amber-950/50 border-amber-400 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">{arch.badge}</span>
                          <span className="font-mono font-bold text-amber-400 tabular-nums">
                            {arch.price === 0 ? 'Tiêu chuẩn' : `+${arch.price.toLocaleString('vi-VN')} đ`}
                          </span>
                        </div>
                        <div className="text-xs font-bold mt-1">{arch.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3D Worship & Landscape Add-on Items */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-amber-300 block">
                  3. Mua Vật Phẩm Thờ &amp; Cảnh Quan Đặt Lên Mộ 3D:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TOMB_ADDON_ITEMS.map((item) => {
                    const checked = selectedAddons.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleAddon(item.id)}
                        className={`text-left p-2.5 rounded-xl border transition-colors flex items-start gap-2 ${
                          checked
                            ? 'bg-emerald-950/40 border-emerald-500/70 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-base shrink-0">{item.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold truncate">{item.name}</div>
                          <div className="text-[10px] font-mono text-amber-400 tabular-nums">
                            +{item.price.toLocaleString('vi-VN')} đ
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cost Summary & Checkout Connected to Admin Account */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Tài khoản Admin tiếp nhận vật liệu:</span>
                  <span className="text-amber-300 font-semibold">
                    {activePay.bankId} · {activePay.accountNo}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-2.5">
                  <span className="text-xs font-bold text-slate-200">Tổng kinh phí xây dựng 3D:</span>
                  <span className="text-lg font-black text-amber-400 font-mono tabular-nums">
                    {builderTotalCost === 0 ? '0 đ (Công đức miễn phí)' : `${builderTotalCost.toLocaleString('vi-VN')} đ`}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSavingTomb}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {isSavingTomb
                      ? 'Đang Khắc Bia & Lưu Vào Neon PostgreSQL...'
                      : editingTombId
                      ? 'Lưu Cập Nhật & Nâng Cấp Bia Mộ 3D'
                      : builderTotalCost <= 0
                      ? `Hoàn Tất Khắc Bia & Dựng Khu Mộ 3D Ngay (Ô ${builderSlot.plotCode})`
                      : `Thanh Toán Vật Liệu & Dựng Khu Mộ 3D (Ô ${builderSlot.plotCode})`}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 2B. EMPTY / UNSELECTED STATE PROMPT WHEN NO TOMB IS SELECTED */}
      {!selectedTomb && !isBuilderOpen && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-base sm:text-lg font-bold text-white">
              {tombs.length === 0
                ? 'Hoa Viên 3D Hiện Đang Trống Toàn Bộ 24 Vị Trí (A1 – D6)'
                : 'Chọn Một Ngôi Mộ Trên Sân 3D Để Dâng Hương Hoặc Chọn Ô Trống Để Lập Mộ Mới'}
            </h4>
            <p className="text-xs text-slate-400">
              {tombs.length === 0
                ? 'Các ngôi mộ mẫu đã được dọn sạch. Thành viên đăng ký / đăng nhập tạo ngôi mộ nào sẽ có quyền chỉnh sửa mộ đó; mộ của thành viên khác chỉ được dọn dẹp, dâng hương và nghe đọc. Admin có toàn quyền sửa & xóa tất cả.'
                : 'Thành viên tạo mộ nào được chỉnh sửa mộ đó · Mộ xung quanh của thành viên khác chỉ được dọn dẹp, dâng hương và nghe đọc · Admin có quyền sửa & xóa tất cả.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {!currentMember && !isAdmin && onOpenMemberModal && (
              <button
                type="button"
                onClick={() => onOpenMemberModal('register')}
                className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                <span>Đăng Ký Thành Viên</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => openBuilderForEmptySlot()}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Lập Mộ Mới 3D</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. SELECTED 3D TOMB INSPECTOR: REAL GRAVESTONE DETAILS + ĐỐT NHANG / DỌN DẸP + VĂN KHẤN STUDIO API */}
      {selectedTomb && !isBuilderOpen && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 5 Cols: Authentic Engraved Stone Tablet Representation */}
          <div className="lg:col-span-5 rounded-3xl bg-[#12161d] border-2 border-amber-500/60 p-6 sm:p-7 text-center flex flex-col justify-between shadow-2xl">
            <div className="space-y-3 border border-amber-500/30 rounded-2xl p-5 bg-[#0d1016]">
              <div className="text-xs text-amber-400/90 font-serif tracking-widest">
                🪷 卍 🪷 · Ô MỘ {selectedTomb.plotCode}
              </div>
              <div className="text-xs font-bold text-amber-200 tracking-wider uppercase">
                {selectedTomb.steleHeader}
              </div>
              <h4 className="text-xl sm:text-2xl font-black text-amber-300 font-serif tracking-wide pt-1">
                {selectedTomb.deceasedFullName}
              </h4>
              {selectedTomb.deceasedDharmaName && (
                <div className="text-xs text-amber-200 font-serif italic">
                  Pháp danh: <strong>{selectedTomb.deceasedDharmaName}</strong>
                </div>
              )}

              <div className="border-t border-b border-amber-500/25 py-3 my-2 space-y-2 text-left text-xs">
                <div>
                  <span className="text-slate-400">SINH (Dương lịch): </span>
                  <strong className="text-white font-mono tabular-nums">
                    {selectedTomb.birthSolar}
                  </strong>
                  <div className="text-amber-200/90 text-[11px] pl-3">
                    Âm lịch: {selectedTomb.birthLunar}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">MẤT (Dương lịch): </span>
                  <strong className="text-white font-mono tabular-nums">
                    {selectedTomb.deathSolar}
                  </strong>
                  <div className="text-amber-200/90 text-[11px] pl-3">
                    Âm lịch: {selectedTomb.deathLunar}
                  </div>
                </div>
              </div>

              <div className="py-1.5 px-4 rounded-xl bg-amber-500/15 border border-amber-500/40 inline-block">
                <span className="text-sm font-black text-amber-300 tracking-wider tabular-nums">
                  {selectedTomb.longevityType === 'huong-tho'
                    ? 'HƯỞNG THỌ'
                    : selectedTomb.longevityType === 'huong-duong'
                    ? 'HƯỞNG DƯƠNG'
                    : 'HƯỞNG NIÊN'}{' '}
                  {selectedTomb.longevityAge} TUỔI
                </span>
              </div>

              {selectedTomb.hometown && (
                <div className="text-xs text-slate-300 pt-1">
                  Nguyên quán: <strong>{selectedTomb.hometown}</strong>
                </div>
              )}

              {selectedTomb.epitaph && (
                <p className="text-xs text-amber-100/85 font-serif italic leading-relaxed pt-1">
                  "{selectedTomb.epitaph}"
                </p>
              )}

              <div className="text-[11px] text-amber-400/90 font-semibold pt-2 border-t border-amber-500/20">
                {selectedTomb.erectedBy}
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span>
                  Hương khói:{' '}
                  <strong className="text-amber-300 tabular-nums">{selectedTomb.incenseCount}</strong> nén · Chăm sóc &amp; Hoa:{' '}
                  <strong className="text-rose-300 tabular-nums">{selectedTomb.flowerCount}</strong> lượt
                </span>

                <div className="flex items-center gap-2">
                  {canEditTomb(selectedTomb) && (
                    <button
                      type="button"
                      onClick={() => openBuilderToUpgradeTomb(selectedTomb)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-semibold text-xs flex items-center gap-1 transition-colors whitespace-nowrap"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Sửa Bia / Nâng Cấp 3D</span>
                    </button>
                  )}
                  {canDeleteTomb(selectedTomb) && (
                    <button
                      type="button"
                      onClick={() => handleAdminDeleteTomb(selectedTomb)}
                      className="px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-600 text-rose-300 hover:text-white font-semibold text-xs flex items-center gap-1 transition-colors whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa Mộ (Admin)</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-left text-slate-400">
                {isAdmin
                  ? 'Quyền Admin: Được phép chỉnh sửa và xóa tất cả các ngôi mộ.'
                  : isTombOwner(selectedTomb)
                  ? 'Ngôi mộ do tài khoản của bạn lập · Bạn có quyền chỉnh sửa bia & nâng cấp vật liệu.'
                  : 'Mộ của thành viên khác · Không được sửa/xóa, chỉ được dọn dẹp, dâng hương và nghe đọc.'}
              </div>
            </div>
          </div>

          {/* Right 7 Cols: Worship Actions (Dâng Hương 3D, Dọn Dẹp Mộ Phần, Nghe Văn Khấn API, Tụng Kinh) */}
          <div className="lg:col-span-7 rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 flex flex-col justify-between space-y-5 shadow-xl">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-white">
                    Bàn Lễ Dâng Hương · Dọn Dẹp &amp; Nghe Đọc Tại Khu Mộ {selectedTomb.plotCode}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {
                      TOMB_MATERIAL_CATALOG.find((m) => m.id === selectedTomb.materialId)?.name
                    }{' '}
                    ·{' '}
                    {
                      TOMB_ARCHITECTURE_CATALOG.find((a) => a.id === selectedTomb.architectureId)
                        ?.name
                    }{' '}
                    · Thành viên lập: {selectedTomb.builderName}
                  </p>
                </div>
              </div>

              {/* Visitor Name & Tribute Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="Tên người dâng hương / dọn dẹp kính viếng..."
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  value={tributeMessage}
                  onChange={(e) => setTributeMessage(e.target.value)}
                  placeholder="Lời tưởng nhớ gửi đến người quá cố..."
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Primary Worship Buttons (Allowed for all members & visitors) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isSubmittingTribute}
                  onClick={() => handleTombTribute(selectedTomb, 'dot-nhang')}
                  className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow whitespace-nowrap"
                >
                  <Flame className="w-4 h-4" />
                  <span>Dâng Hương Tưởng Nhớ 3D</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmittingTribute}
                  onClick={() => handleTombTribute(selectedTomb, 'don-dep')}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Dọn Dẹp &amp; Chăm Sóc Mộ Phần</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReadTombPrayer(selectedTomb)}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  {prayerLoadingStage ? (
                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  ) : isReadingPrayer ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-amber-400" />
                  )}
                  <span>
                    {prayerLoadingStage ? 'Đang tải...' : isReadingPrayer ? 'Dừng' : 'Nghe'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isSubmittingTribute}
                  onClick={() => handleTombTribute(selectedTomb, 'dang-hoa')}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-200 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span>Dâng Hoa Sen Kính Viếng</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTombStoreOpen(true)}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow whitespace-nowrap"
                >
                  <ShoppingBag className="w-4 h-4 text-emerald-200" />
                  <span>Mua Hoa Quả &amp; Lễ Vật Đi Viếng</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const sutra =
                      TEMPLE_SUTRAS.find((s) => s.id === selectedTomb.dedicatedSutraId) ||
                      TEMPLE_SUTRAS.find((s) => s.id === 'kinh-a-di-da') ||
                      TEMPLE_SUTRAS[0];
                    onChantSutra(sutra);
                  }}
                  className="sm:col-span-2 py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Nghe / Tụng Kinh Cầu Siêu Kết Nối</span>
                </button>
              </div>

              {/* 3D Addons Section: Purchase enabled ONLY for Tomb Owner or Admin */}
              {canEditTomb(selectedTomb) ? (
                <div className="pt-2 space-y-2">
                  <div className="text-xs font-bold text-slate-300">
                    Vật phẩm thờ trên khu mộ 3D (Dành cho chủ mộ / Admin mua bổ sung qua Tài Khoản Admin):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TOMB_ADDON_ITEMS.map((addon) => {
                      const owned = selectedTomb.addons?.includes(addon.id);
                      return (
                        <div
                          key={addon.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                            owned
                              ? 'bg-slate-950/70 border-slate-800 text-slate-300'
                              : 'bg-slate-950 border-amber-500/30 text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span>{addon.icon}</span>
                            <span className="truncate font-medium">{addon.name}</span>
                          </div>
                          {owned ? (
                            <span className="text-[11px] text-emerald-400 font-semibold shrink-0">
                              Đã đặt 3D
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setQrLoadFailed(false);
                                setPendingAddonUpgrade({ tomb: selectedTomb, addon });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0 tabular-nums"
                            >
                              Mua +{addon.price.toLocaleString('vi-VN')}đ
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="pt-2 space-y-1.5 border-t border-slate-800">
                  <div className="text-xs font-semibold text-slate-300">
                    Vật phẩm thờ hiện có trên khu mộ ({selectedTomb.addons?.length || 0}):
                  </div>
                  <div className="text-xs text-slate-400">
                    {TOMB_ADDON_ITEMS.filter((a) => selectedTomb.addons?.includes(a.id))
                      .map((a) => `${a.icon} ${a.name}`)
                      .join(' · ') || 'Lư hương đá truyền thống'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. CONNECTED POSTGRESQL DATABASE TABLES (NGÔI MỘ · THÀNH VIÊN · NHẬT KÝ VIẾNG · TÀI KHOẢN ADMIN) */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
            <button
              type="button"
              onClick={() => setRegistryTab('tombs')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                registryTab === 'tombs'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Danh Sách Khu Mộ 3D ({tombs.length})
            </button>
            <button
              type="button"
              onClick={() => setRegistryTab('members')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                registryTab === 'members'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Thành Viên Cúng Dường &amp; Xây Mộ ({members.length})
            </button>
            <button
              type="button"
              onClick={() => setRegistryTab('tributes')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                registryTab === 'tributes'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Nhật Ký Đốt Nhang ({tributes.length})
            </button>
            <button
              type="button"
              onClick={() => setRegistryTab('admin-payment')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                registryTab === 'admin-payment'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-amber-300 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Tài Khoản Admin Tiếp Nhận</span>
            </button>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {registryTab === 'tombs' && (
              <button
                type="button"
                onClick={() => openBuilderForEmptySlot()}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Lập Mộ Mới 3D</span>
              </button>
            )}

            {registryTab === 'members' && onOpenMemberModal && (
              <button
                type="button"
                onClick={() => onOpenMemberModal(currentMember ? 'profile' : 'register')}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{currentMember ? 'Hồ Sơ Của Tôi' : 'Đăng Ký Thành Viên Mới'}</span>
              </button>
            )}

            {registryTab !== 'admin-payment' && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tên người quá cố, thành viên, mã ô..."
                  className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 w-60"
                />
              </div>
            )}
          </div>
        </div>

        {/* TABLE 1: DANH SÁCH NGÔI MỘ 3D */}
        {registryTab === 'tombs' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-200 tabular-nums">
              <thead className="bg-slate-950 text-[11px] font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3.5">Ô Mộ</th>
                  <th className="py-3 px-3.5">Người Quá Cố &amp; Pháp Danh</th>
                  <th className="py-3 px-3.5">Ngày Sanh (DL &amp; ÂL)</th>
                  <th className="py-3 px-3.5">Ngày Mất (DL &amp; ÂL)</th>
                  <th className="py-3 px-3.5">Hưởng Thọ / Dương</th>
                  <th className="py-3 px-3.5">Vật Liệu &amp; Người Xây</th>
                  <th className="py-3 px-3.5 text-right">Kinh Phí</th>
                  <th className="py-3 px-3.5 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {tombs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 px-4 text-center text-slate-400">
                      Hiện chưa có ngôi mộ nào trong Hoa Viên (toàn bộ 24 vị trí A1 – D6 đang trống). Vui lòng Đăng ký / Đăng nhập Thành viên và nhấn "Lập Mộ Mới 3D" để khởi tạo.
                    </td>
                  </tr>
                ) : (
                  tombs
                    .filter((t) => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        t.deceasedFullName.toLowerCase().includes(q) ||
                        t.plotCode.toLowerCase().includes(q) ||
                        t.builderName.toLowerCase().includes(q) ||
                        (t.hometown && t.hometown.toLowerCase().includes(q))
                      );
                    })
                    .map((tomb) => (
                      <tr key={tomb.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3.5 font-mono font-bold text-amber-400 whitespace-nowrap">
                          {tomb.plotCode}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-white">{tomb.deceasedFullName}</div>
                          <div className="text-[11px] text-slate-400">
                            {tomb.deceasedDharmaName ? `PD: ${tomb.deceasedDharmaName} · ` : ''}
                            {tomb.hometown || 'Việt Nam'}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="font-mono text-white">{tomb.birthSolar}</div>
                          <div className="text-[11px] text-amber-200/80">{tomb.birthLunar}</div>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="font-mono text-white">{tomb.deathSolar}</div>
                          <div className="text-[11px] text-amber-200/80">{tomb.deathLunar}</div>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap font-bold text-amber-300">
                          {tomb.longevityType === 'huong-tho' ? 'Hưởng thọ' : 'Hưởng dương'}{' '}
                          {tomb.longevityAge} tuổi
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="text-slate-200">
                            {TOMB_MATERIAL_CATALOG.find((m) => m.id === tomb.materialId)?.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Thành viên lập: {tomb.builderName} · {tomb.incenseCount} nén nhang
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-amber-400 whitespace-nowrap">
                          {tomb.totalCost.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setIsBuilderOpen(false);
                                setSelectedPlotCode(tomb.plotCode);
                                setCameraViewMode('closeup');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-semibold text-[11px] transition-colors"
                              title="Viếng mộ: Dọn dẹp, dâng hương và nghe đọc"
                            >
                              Viếng 3D
                            </button>
                            {canEditTomb(tomb) && (
                              <button
                                type="button"
                                onClick={() => openBuilderToUpgradeTomb(tomb)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-400 text-amber-200 hover:text-slate-950 font-semibold text-[11px] transition-colors"
                                title={
                                  isAdmin
                                    ? 'Admin chỉnh sửa bia mộ'
                                    : 'Chỉnh sửa ngôi mộ của bạn'
                                }
                              >
                                Sửa
                              </button>
                            )}
                            {isAdmin && tomb.paymentStatus !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => handleAdminApproveTomb(tomb.id)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-semibold text-[11px]"
                              >
                                Duyệt
                              </button>
                            )}
                            {canDeleteTomb(tomb) && (
                              <button
                                type="button"
                                onClick={() => handleAdminDeleteTomb(tomb)}
                                className="p-1 rounded-lg bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white transition-colors"
                                title="Admin xóa vị trí mộ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TABLE 2: THÀNH VIÊN CÚNG DƯỜNG & XÂY MỘ */}
        {registryTab === 'members' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-200 tabular-nums">
              <thead className="bg-slate-950 text-[11px] font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3.5">Mã Thành Viên</th>
                  <th className="py-3 px-3.5">Họ Tên &amp; Pháp Danh</th>
                  <th className="py-3 px-3.5">Liên Hệ / Quê Quán</th>
                  <th className="py-3 px-3.5 text-center">Số Khu Mộ Xây Dựng</th>
                  <th className="py-3 px-3.5 text-right">Điểm Công Đức</th>
                  <th className="py-3 px-3.5 text-right">Tổng Cúng Dường &amp; Mua Vật Liệu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {members
                  .filter((m) => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      m.fullName.toLowerCase().includes(q) ||
                      (m.dharmaName && m.dharmaName.toLowerCase().includes(q)) ||
                      (m.address && m.address.toLowerCase().includes(q))
                    );
                  })
                  .map((mem) => (
                    <tr key={mem.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5 font-mono text-[11px] text-amber-400 whitespace-nowrap">
                        {mem.id}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-bold text-white">{mem.fullName}</span>
                        {mem.dharmaName && (
                          <span className="text-amber-300 ml-1.5">({mem.dharmaName})</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-slate-400">
                        {[mem.phone, mem.address].filter(Boolean).join(' · ') || 'Việt Nam'}
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono font-bold text-emerald-300">
                        {mem.tombsBuilt}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-amber-200">
                        {mem.meritPoints.toLocaleString('vi-VN')} điểm
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-amber-400">
                        {mem.totalDonated.toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TABLE 3: NHẬT KÝ ĐỐT NHANG & DÂNG VẬT PHẨM */}
        {registryTab === 'tributes' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-200 tabular-nums">
              <thead className="bg-slate-950 text-[11px] font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3.5">Ô Mộ</th>
                  <th className="py-3 px-3.5">Người Thắp Nhang / Kính Viếng</th>
                  <th className="py-3 px-3.5">Nghi Thức</th>
                  <th className="py-3 px-3.5">Lời Tưởng Nhớ</th>
                  <th className="py-3 px-3.5 text-right">Kinh Phí Vật Phẩm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {tributes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Chưa có nhật ký viếng mới. Hãy nhấn "Đốt Nhang Tưởng Nhớ 3D" trên ngôi mộ để thắp nén hương đầu tiên.
                    </td>
                  </tr>
                ) : (
                  tributes.map((tr) => (
                    <tr key={tr.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3.5 font-mono font-bold text-amber-400">
                        {tr.plotCode}
                      </td>
                      <td className="py-3 px-3.5 font-semibold text-white">{tr.visitorName}</td>
                      <td className="py-3 px-3.5 text-amber-200">
                        {tr.tributeType === 'dot-nhang'
                          ? 'Dâng hương trầm 3D'
                          : tr.tributeType === 'don-dep'
                          ? 'Dọn dẹp & chăm sóc mộ phần'
                          : tr.tributeType === 'dang-hoa'
                          ? 'Dâng hoa sen'
                          : tr.itemName || 'Thỉnh vật phẩm 3D'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300 font-serif italic">
                        "{tr.message}"
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-amber-400">
                        {tr.amount && tr.amount > 0
                          ? `${tr.amount.toLocaleString('vi-VN')} đ`
                          : 'Tâm hương 0 đ'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: TÀI KHOẢN ADMIN TIẾP NHẬN VẬT PHẨM & CÀI ĐẶT */}
        {registryTab === 'admin-payment' && (
          <form onSubmit={handleSaveAdminPaymentSettings} className="space-y-5 max-w-3xl">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Kết Nối Trực Tiếp Tài Khoản Admin Nhận Mua Vật Phẩm Chùa &amp; Vật Liệu Khu Mộ 3D</span>
              </div>
              <p className="text-xs text-slate-400">
                Mọi giao dịch mua vật phẩm cúng dường tại Chùa và mua đá / kiến trúc xây Khu Mộ 3D đều tạo mã VietQR chuyển thẳng về tài khoản Admin bên dưới và lưu vào Neon PostgreSQL.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Ngân hàng thụ hưởng (VietQR):
                </label>
                <select
                  value={adminPayDraft.bankId}
                  onChange={(e) => {
                    const b = VIET_BANKS.find((x) => x.id === e.target.value);
                    setAdminPayDraft({
                      ...adminPayDraft,
                      bankId: e.target.value,
                      bankName: b ? b.name : e.target.value,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {VIET_BANKS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id} — {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Số tài khoản nhận thanh toán:
                </label>
                <input
                  type="text"
                  value={adminPayDraft.accountNo}
                  onChange={(e) =>
                    setAdminPayDraft({ ...adminPayDraft, accountNo: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tên chủ tài khoản Admin:
                </label>
                <input
                  type="text"
                  value={adminPayDraft.accountName}
                  onChange={(e) =>
                    setAdminPayDraft({
                      ...adminPayDraft,
                      accountName: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold uppercase focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Link PayPal.me quốc tế (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={adminPayDraft.paypalMeUrl}
                  onChange={(e) =>
                    setAdminPayDraft({ ...adminPayDraft, paypalMeUrl: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={adminPayDraft.autoApproveOrders}
                onChange={(e) =>
                  setAdminPayDraft({ ...adminPayDraft, autoApproveOrders: e.target.checked })
                }
                className="accent-amber-500 w-4 h-4"
              />
              <span>Tự động kích hoạt khu mộ 3D ngay sau khi thành viên xác nhận thanh toán</span>
            </label>

            <button
              type="submit"
              disabled={isSavingAdminPay}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
            >
              {isSavingAdminPay
                ? 'Đang lưu lên Neon PostgreSQL...'
                : isAdmin
                ? 'Lưu Cấu Hình Tài Khoản Admin'
                : 'Đăng Nhập Admin Để Lưu Cấu Hình Thanh Toán'}
            </button>
          </form>
        )}
      </div>

      {/* MODAL 1: ADMIN PAYMENT CHECKOUT FOR BUILDING / UPGRADING 3D TOMB */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-lg w-full bg-slate-900 border border-amber-500/60 rounded-3xl p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs text-amber-400 font-semibold">
                  Kết Nối Tài Khoản Admin · Xây Dựng Khu Mộ 3D Ô {builderSlot.plotCode}
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white">
                  Xác Nhận Mua Vật Liệu &amp; Khắc Bia Mộ 3D
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold px-2"
              >
                ✕
              </button>
            </div>

            {builderTotalCost > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="flex flex-col items-center justify-center">
                    {!qrLoadFailed ? (
                      <img
                        src={buildVietQrUrl(
                          builderTotalCost,
                          `MO3D ${builderSlot.plotCode} ${builderName}`
                        )}
                        alt="Mã VietQR chuyển khoản Admin"
                        referrerPolicy="no-referrer"
                        onError={() => setQrLoadFailed(true)}
                        className="w-44 h-44 object-contain rounded-xl bg-white p-1.5"
                      />
                    ) : (
                      <div className="w-44 h-44 rounded-xl bg-slate-900 border border-amber-500/40 flex flex-col items-center justify-center p-3 text-center text-xs text-amber-200">
                        <span className="font-bold">{activePay.bankName}</span>
                        <span className="font-mono text-amber-400 mt-1">{activePay.accountNo}</span>
                        <span className="text-[11px] text-slate-400 mt-1">
                          {activePay.accountName}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block">Ngân hàng Admin:</span>
                      <strong className="text-white">{activePay.bankName}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 block">Số tài khoản:</span>
                        <strong className="text-amber-400 font-mono text-sm">
                          {activePay.accountNo}
                        </strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(activePay.accountNo, 'Số tài khoản Admin')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Chủ tài khoản:</span>
                      <strong className="text-white">{activePay.accountName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Số tiền vật liệu &amp; vị trí:</span>
                      <strong className="text-amber-300 font-mono text-base tabular-nums">
                        {builderTotalCost.toLocaleString('vi-VN')} đ
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Nội dung chuyển khoản:</span>
                      <strong className="text-emerald-300 font-mono">
                        MO3D {builderSlot.plotCode} {builderName.slice(0, 14).toUpperCase()}
                      </strong>
                    </div>
                  </div>
                </div>

                {activePay.paypalMeUrl && (
                  <a
                    href={activePay.paypalMeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Hoặc thanh toán quốc tế qua PayPal Admin</span>
                  </a>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 text-xs text-emerald-300">
                Ô mộ miễn phí tùy tâm (0 đ) — Nhấn xác nhận để dựng bia mộ 3D ngay lập tức.
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Quay Lại Chỉnh Sửa
              </button>
              <button
                type="button"
                disabled={isSavingTomb}
                onClick={handleConfirmBuildTomb}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg"
              >
                {isSavingTomb ? 'Đang Dựng Mộ 3D...' : 'Xác Nhận Hoàn Tất & Dựng Mộ 3D'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SINGLE ADDON ITEM CHECKOUT FOR EXISTING 3D TOMB */}
      {pendingAddonUpgrade && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-amber-500/60 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs text-amber-400 font-semibold">
                  Mua Vật Phẩm Thờ 3D · Ô Mộ {pendingAddonUpgrade.tomb.plotCode}
                </div>
                <h4 className="text-base font-bold text-white">
                  {pendingAddonUpgrade.addon.icon} {pendingAddonUpgrade.addon.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPendingAddonUpgrade(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col items-center space-y-2.5 text-center">
              {!qrLoadFailed && (
                <img
                  src={buildVietQrUrl(
                    pendingAddonUpgrade.addon.price,
                    `VATPHAM ${pendingAddonUpgrade.tomb.plotCode}`
                  )}
                  alt="VietQR Admin"
                  referrerPolicy="no-referrer"
                  onError={() => setQrLoadFailed(true)}
                  className="w-40 h-40 object-contain rounded-xl bg-white p-1.5"
                />
              )}
              <div className="text-xs text-slate-300">
                Chuyển khoản Admin: <strong>{activePay.bankId}</strong> ·{' '}
                <strong className="text-amber-400 font-mono">{activePay.accountNo}</strong> (
                {activePay.accountName})
              </div>
              <div className="text-base font-black text-amber-300 font-mono tabular-nums">
                {pendingAddonUpgrade.addon.price.toLocaleString('vi-VN')} đ
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPendingAddonUpgrade(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={isSavingTomb}
                onClick={handleConfirmSingleAddonPurchase}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
              >
                {isSavingTomb ? 'Đang Đặt Lên Mộ 3D...' : 'Xác Nhận Đặt Lên Mộ 3D'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHOP HOA TƯƠI, MÂM TRÁI CÂY & LỄ VẬT ĐI VIẾNG MỘ */}
      {selectedTomb && (
        <UniversalOfferingsStoreModal
          isOpen={isTombStoreOpen}
          onClose={() => setIsTombStoreOpen(false)}
          initialTargetName={`Mộ ${selectedTomb.deceasedFullName} (${selectedTomb.plotCode})`}
          currentMember={currentMember}
          tombs={tombs}
          paymentSettings={paymentSettings}
          onOfferSuccess={(record) => {
            onAddMeritPoints(
              record.totalMeritPoints,
              `Dâng Lễ Viếng Mộ ${selectedTomb.deceasedFullName}`
            );
            handleTombTribute(selectedTomb, 'dang-hoa');
          }}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
