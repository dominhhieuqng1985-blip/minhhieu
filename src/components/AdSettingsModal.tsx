import React, { useState } from 'react';
import {
  X,
  Settings,
  Tv,
  Image,
  ExternalLink,
  Play,
  RotateCcw,
  Check,
  Share2,
  Copy,
  Download,
  Upload,
  Globe,
  CheckCircle2,
  Cloud,
  Lock,
  ShieldCheck,
  Code,
  Sparkles,
  CreditCard,
  DollarSign,
  FolderDown,
  FileText,
  PlusCircle,
} from 'lucide-react';
import {
  AdSettings,
  WatermarkSettings,
  DEFAULT_AD_SETTINGS,
  DEFAULT_WATERMARK_SETTINGS,
  DEFAULT_VAST_30_TAG_URL,
  ADCASH_INSTREAM_VAST_TAG_URL,
  DEFAULT_BANNER_300X250_SCRIPT,
  DEFAULT_BANNER_300X100_MOBILE_SCRIPT,
  DEFAULT_VIDEO_SLIDER_SCRIPT,
  normalizeAdSettings,
  saveStoredAdSettings,
  saveStoredWatermarkSettings,
  saveRemoteAdSettings,
  generateShareableConfigUrl,
  decodeConfigFromBase64,
} from '../types/adConfig';
import {
  PayPalSettings,
  DocumentSettings,
  DEFAULT_PAYPAL_SETTINGS,
  DEFAULT_DOCUMENT_SETTINGS,
  getStoredPayPalSettings,
  saveStoredPayPalSettings,
  getStoredDocumentSettings,
  saveStoredDocumentSettings,
} from '../types/documents';
import { useAdminAuth } from '../context/AdminAuthContext';
import { StandaloneBanner300x250, MobileBanner300x100 } from './AdcashBanner';
import { HilltopAdsDashboard } from './HilltopAdsDashboard';

interface AdSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  adSettings: AdSettings;
  watermarkSettings: WatermarkSettings;
  onSaveAdSettings: (settings: AdSettings) => void;
  onSaveWatermarkSettings: (settings: WatermarkSettings) => void;
  onTriggerTestAd?: () => void;
}

export const AdSettingsModal: React.FC<AdSettingsModalProps> = ({
  isOpen,
  onClose,
  adSettings,
  watermarkSettings,
  onSaveAdSettings,
  onSaveWatermarkSettings,
  onTriggerTestAd,
}) => {
  const { isAdmin, openAdminModal } = useAdminAuth();
  const [localAd, setLocalAd] = useState<AdSettings>(() => normalizeAdSettings(adSettings));
  const [localWatermark, setLocalWatermark] = useState<WatermarkSettings>(watermarkSettings);
  const [localPayPal, setLocalPayPal] = useState<PayPalSettings>(getStoredPayPalSettings);
  const [localDocSettings, setLocalDocSettings] = useState<DocumentSettings>(getStoredDocumentSettings);
  const [newExtensionInput, setNewExtensionInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'rich_ads' | 'hilltopads' | 'ad' | 'watermark' | 'paypal' | 'documents' | 'sync'>('rich_ads');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [preview300x250, setPreview300x250] = useState<boolean>(false);
  const [preview300x100Mobile, setPreview300x100Mobile] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      setLocalAd(normalizeAdSettings(adSettings));
      setLocalWatermark(watermarkSettings);
      setLocalPayPal(getStoredPayPalSettings());
      setLocalDocSettings(getStoredDocumentSettings());
      setSaveError(null);
      setPreview300x250(false);
      setPreview300x100Mobile(false);
    }
  }, [isOpen, adSettings, watermarkSettings]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    onSaveAdSettings(localAd);
    onSaveWatermarkSettings(localWatermark);
    saveStoredAdSettings(localAd);
    saveStoredWatermarkSettings(localWatermark);
    saveStoredPayPalSettings(localPayPal);
    saveStoredDocumentSettings(localDocSettings);

    if (isAdmin) {
      try {
        const res = await saveRemoteAdSettings(localAd, localWatermark, localPayPal, localDocSettings);
        if (!res.success) {
          setIsSaving(false);
          setSaveError(res.message || 'Không thể lưu vào cơ sở dữ liệu Neon PostgreSQL.');
          return;
        }
      } catch (e: any) {
        setIsSaving(false);
        setSaveError(e?.message || 'Lỗi kết nối máy chủ khi lưu cài đặt.');
        return;
      }
    }

    setIsSaving(false);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const handleResetDefaults = () => {
    setLocalAd(DEFAULT_AD_SETTINGS);
    setLocalWatermark(DEFAULT_WATERMARK_SETTINGS);
    setLocalPayPal(DEFAULT_PAYPAL_SETTINGS);
    setLocalDocSettings(DEFAULT_DOCUMENT_SETTINGS);
  };

  const handleCopyShareLink = () => {
    const url = generateShareableConfigUrl(localAd, localWatermark);
    if (url) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleExportJson = () => {
    const data = {
      adSettings: localAd,
      watermarkSettings: localWatermark,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `minhhieu_ad_settings_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = () => {
    if (!importJsonText.trim()) return;
    try {
      let parsed: any;
      if (importJsonText.includes('ad_cfg=')) {
        const match = importJsonText.match(/ad_cfg=([^&]+)/);
        if (match) parsed = decodeConfigFromBase64(decodeURIComponent(match[1]));
      } else {
        parsed = JSON.parse(importJsonText.trim());
      }

      if (parsed) {
        if (parsed.adSettings) {
          setLocalAd(normalizeAdSettings(parsed.adSettings));
        }
        if (parsed.watermarkSettings) {
          setLocalWatermark({ ...DEFAULT_WATERMARK_SETTINGS, ...parsed.watermarkSettings });
        }
        setImportStatus('Nhập cấu hình thành công! Hãy bấm "Lưu Cài Đặt" để áp dụng.');
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus('Không tìm thấy dữ liệu cấu hình hợp lệ');
      }
    } catch (e: any) {
      setImportStatus('Lỗi phân tích JSON: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl sm:max-w-3xl lg:max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <Settings className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <span>Cài Đặt Quảng Cáo &amp; Logo Video</span>
              </h3>
              <p className="text-xs text-slate-400">
                Tùy chỉnh video quảng cáo, watermark, API HilltopAds và đồng bộ đa thiết bị
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="p-2 border-b border-slate-800 bg-slate-950/50 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('rich_ads')}
            className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'rich_ads'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>VAST 3.0 &amp; HTML/JS</span>
          </button>

          <button
            onClick={() => setActiveTab('hilltopads')}
            className={`flex-1 min-w-[155px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'hilltopads'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-extrabold'
                : 'text-emerald-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>HilltopAds &amp; Số Dư</span>
          </button>

          <button
            onClick={() => setActiveTab('ad')}
            className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'ad'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Video &amp; Phủ Sóng</span>
          </button>

          <button
            onClick={() => setActiveTab('watermark')}
            className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'watermark'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Image className="w-4 h-4" />
            <span>Chèn Logo / Watermark</span>
          </button>

          <button
            onClick={() => setActiveTab('paypal')}
            className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'paypal'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Cài Đặt PayPal</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'documents'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FolderDown className="w-4 h-4" />
            <span>Định Dạng File &amp; Upload</span>
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'sync'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Đổi Máy &amp; Đồng Bộ</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {activeTab === 'rich_ads' && (
            <div className="space-y-4">
              {/* Highlight Notice */}
              <div className="p-3 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <h5 className="font-bold text-white text-xs">Cài Đặt Định Dạng Quảng Cáo Mới</h5>
                    <p className="text-[11px] text-slate-300">
                      Tùy chỉnh thẻ VAST 3.0 trong luồng, banner 300×250, Video Slider và tự động luân phiên ngẫu nhiên
                    </p>
                  </div>
                </div>
              </div>

              {/* 1. In-Stream VAST 3.0 */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4 text-amber-400" />
                    <div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">
                        Quảng Cáo Video Trong Luồng (VAST 3.0)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Chạy video quảng cáo theo chuẩn VAST 3.0 trực tiếp trước hoặc giữa video
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={localAd.enableVastAds !== false}
                      onChange={(e) => setLocalAd({ ...localAd, enableVastAds: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Random Rotation Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <span>🎲 Luân Phiên Ngẫu Nhiên Các Quảng Cáo Video Đã Cài Sẵn</span>
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Tự động hoán đổi luân phiên ngẫu nhiên giữa VAST 3.0 mới, VAST Adcash và video tài trợ khi phát
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localAd.rotateVideoAds !== false}
                    onChange={(e) => setLocalAd({ ...localAd, rotateVideoAds: e.target.checked })}
                    className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                  />
                </div>

                {/* VAST URL input */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-white text-xs">
                      URL Thẻ Quảng Cáo VAST 3.0 Trong Luồng:
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLocalAd({ ...localAd, vastTagUrl: DEFAULT_VAST_30_TAG_URL })}
                        className="text-[10px] text-amber-400 hover:underline font-mono"
                      >
                        Đặt lại VAST 3.0
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocalAd({ ...localAd, vastTagUrl: ADCASH_INSTREAM_VAST_TAG_URL })}
                        className="text-[10px] text-slate-400 hover:text-white font-mono"
                      >
                        Dùng VAST Adcash
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="https://... VAST 3.0 URL"
                    value={localAd.vastTagUrl || ''}
                    onChange={(e) => setLocalAd({ ...localAd, vastTagUrl: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Extra Multiline VAST URLs for Random Rotation */}
                <div className="space-y-1.5 pt-1">
                  <label className="font-bold text-white text-xs block">
                    Danh Sách Nhiều Link VAST Luân Phiên Ngẫu Nhiên (Mỗi dòng 1 URL):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Dán thêm các link VAST 2.0 / 3.0 / 4.0 khác (mỗi dòng 1 link) để hệ thống tự động xoay vòng ngẫu nhiên..."
                    value={localAd.extraVastTagUrls || ''}
                    onChange={(e) => setLocalAd({ ...localAd, extraVastTagUrls: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-100 font-mono focus:outline-none focus:border-amber-500 resize-y"
                  />
                </div>

                {/* Active VAST tags list */}
                <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">Nguồn quảng cáo video sẵn sàng luân phiên:</div>
                  <div className="font-mono text-[10px] text-amber-300 truncate">1. VAST 3.0: {localAd.vastTagUrl || DEFAULT_VAST_30_TAG_URL}</div>
                  <div className="font-mono text-[10px] text-slate-400 truncate">2. VAST Adcash: {ADCASH_INSTREAM_VAST_TAG_URL}</div>
                  <div className="font-mono text-[10px] text-emerald-400 truncate">3. Video Dự Phòng: {localAd.videoUrl} (Chỉ phát khi các thẻ VAST không có quảng cáo)</div>
                </div>
              </div>

              {/* 2. Banner 300x250 HTML / Javascript (ylse Standalone - Zero YouTube) */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">
                        Quảng Cáo Banner 300×250 Độc Lập (ylse — Không Kèm YouTube)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Chạy riêng hoàn toàn ở các vị trí ưu tiên ngoài trình phát YouTube, không kèm thẻ dự phòng kênh
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={localAd.enableBanner300x250 !== false}
                      onChange={(e) => setLocalAd({ ...localAd, enableBanner300x250: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="font-bold text-white text-xs">
                      Mã Nhúng HTML / JavaScript cho 300×250 (ylse):
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreview300x250((prev) => !prev)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        <span>{preview300x250 ? 'Ẩn khung chạy thử' : 'Chạy thử 300×250 ngay'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setLocalAd({
                            ...localAd,
                            banner300x250Html: DEFAULT_BANNER_300X250_SCRIPT,
                            enableBanner300x250: true,
                          })
                        }
                        className="text-[10px] text-amber-400 hover:underline font-mono"
                      >
                        Khôi phục mã ylse 300×250
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="<script>...</script>"
                    value={localAd.banner300x250Html || ''}
                    onChange={(e) => setLocalAd({ ...localAd, banner300x250Html: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-100 font-mono focus:outline-none focus:border-amber-500 resize-y"
                  />

                  {preview300x250 && (
                    <div className="pt-2 pb-1 px-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col items-center gap-2">
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        Khung chạy thử trực tiếp 300×250 (độc lập 100%, không kèm YouTube):
                      </span>
                      <StandaloneBanner300x250
                        forceShow={true}
                        previewCode={localAd.banner300x250Html || DEFAULT_BANNER_300X250_SCRIPT}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Banner Di Động 300x100 MultiTag (ozrqy — Mobile Only) */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-sky-500/30 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                        <span>Quảng Cáo Banner Di Động 300×100 (ozrqy — Mobile MultiTag)</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                          Mobile
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Định dạng biểu ngữ 300×100 tối ưu cho điện thoại di động và màn hình dọc, hiển thị ở các vị trí phù hợp
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={localAd.enableBanner300x100Mobile !== false}
                      onChange={(e) => setLocalAd({ ...localAd, enableBanner300x100Mobile: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="font-bold text-white text-xs">
                      Mã Nhúng HTML / JavaScript 300×100 Mobile (ozrqy):
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreview300x100Mobile((prev) => !prev)}
                        className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{preview300x100Mobile ? 'Đóng xem trước' : 'Xem trước 300×100'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocalAd({ ...localAd, banner300x100MobileHtml: DEFAULT_BANNER_300X100_MOBILE_SCRIPT })}
                        className="text-[10px] text-sky-400 hover:underline font-mono"
                      >
                        Khôi phục mã gốc
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="<script>...</script>"
                    value={localAd.banner300x100MobileHtml || ''}
                    onChange={(e) => setLocalAd({ ...localAd, banner300x100MobileHtml: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-100 font-mono focus:outline-none focus:border-sky-500 resize-y"
                  />

                  {preview300x100Mobile && (
                    <div className="pt-2 pb-1 px-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col items-center gap-2">
                      <span className="text-[10px] text-sky-400 font-semibold">
                        Khung chạy thử biểu ngữ di động 300×100:
                      </span>
                      <MobileBanner300x100
                        forceShow={true}
                        previewCode={localAd.banner300x100MobileHtml || DEFAULT_BANNER_300X100_MOBILE_SCRIPT}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 3. MultiTag Video Slider HTML / Javascript (alsq) */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-amber-400" />
                    <div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">
                        Quảng Cáo MultiTag Video Slider (alsq — HTML / JavaScript)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Quảng cáo video trượt nổi tự động ở góc dưới màn hình
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={localAd.enableVideoSlider !== false}
                      onChange={(e) => setLocalAd({ ...localAd, enableVideoSlider: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-white text-xs">
                      Mã Nhúng MultiTag Video Slider:
                    </label>
                    <button
                      type="button"
                      onClick={() => setLocalAd({ ...localAd, videoSliderHtml: DEFAULT_VIDEO_SLIDER_SCRIPT })}
                      className="text-[10px] text-amber-400 hover:underline font-mono"
                    >
                      Khôi phục mã Slider mẫu
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="<script>...</script>"
                    value={localAd.videoSliderHtml || ''}
                    onChange={(e) => setLocalAd({ ...localAd, videoSliderHtml: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-100 font-mono focus:outline-none focus:border-amber-500 resize-y"
                  />
                </div>
              </div>

              {/* 4. Custom Ad Code (HTML / JS / VAST) */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm">
                      Mã Quảng Cáo Tùy Chỉnh Mở Rộng (HTML, JavaScript hoặc VAST)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Dán mã HTML, JavaScript hoặc URL VAST tùy chỉnh — lưu trực tiếp vào Neon PostgreSQL
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <select
                      value={localAd.customAdCodeType || 'vast'}
                      onChange={(e) => setLocalAd({ ...localAd, customAdCodeType: e.target.value as any })}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-semibold"
                    >
                      <option value="vast">VAST Trong Luồng</option>
                      <option value="html">Mã HTML</option>
                      <option value="js">Mã JavaScript</option>
                    </select>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={localAd.enableCustomHtmlJs !== false}
                        onChange={(e) => setLocalAd({ ...localAd, enableCustomHtmlJs: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                </div>

                <textarea
                  rows={3}
                  placeholder="Dán mã HTML (<script>...</script>), JavaScript hoặc URL VAST vào đây..."
                  value={localAd.customHtmlJsCode || ''}
                  onChange={(e) => setLocalAd({ ...localAd, customHtmlJsCode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-100 font-mono focus:outline-none focus:border-amber-500 resize-y"
                />
              </div>
            </div>
          )}

          {activeTab === 'ad' && (
            <div className="space-y-4">
              {/* Toggle Enable */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                <div>
                  <h4 className="font-bold text-white text-sm">Bật Quảng Cáo Phủ Màn Hình</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Hiển thị video quảng cáo có nút đếm ngược bỏ qua khi phát phim hoặc video
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localAd.enabled}
                    onChange={(e) => setLocalAd({ ...localAd, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Video URL Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-white flex items-center justify-between">
                  <span>Link Video Quảng Cáo (MP4 / WebM hoặc Link YouTube):</span>
                  <span className="text-[10px] text-amber-400 font-normal">Hỗ trợ MP4 trực tiếp hoặc YouTube</span>
                </label>
                <input
                  type="text"
                  placeholder="https://.../video.mp4 hoặc https://www.youtube.com/watch?v=..."
                  value={localAd.videoUrl}
                  onChange={(e) => setLocalAd({ ...localAd, videoUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Destination URL Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-white flex items-center justify-between">
                  <span>Link Đích Khi Người Dùng Bấm Vào Quảng Cáo:</span>
                  <span className="text-[10px] text-emerald-400 font-normal">Mở trang web tài trợ / sản phẩm</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="https://shopee.vn/... hoặc https://facebook.com/..."
                    value={localAd.redirectUrl}
                    onChange={(e) => setLocalAd({ ...localAd, redirectUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Skip Delay Seconds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-white flex items-center justify-between">
                    <span>Đếm Ngược Bỏ Qua (Giây):</span>
                    <span className="font-mono text-amber-400 font-bold">{localAd.skipDelaySeconds}s</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="1"
                    value={localAd.skipDelaySeconds}
                    onChange={(e) => setLocalAd({ ...localAd, skipDelaySeconds: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>0s (Bỏ qua ngay)</span>
                    <span>5s (Chuẩn)</span>
                    <span>15s</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-white">Tên Nhà Quảng Cáo (Hiển thị ở nhãn "Quảng cáo: [Tên]"):</label>
                  <input
                    type="text"
                    placeholder="Minh Hiếu Official VN"
                    value={typeof localAd.sponsorName === 'string' ? localAd.sponsorName : ''}
                    onChange={(e) => setLocalAd({ ...localAd, sponsorName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Tự động hiển thị trên các banner 728x90, 336x280, 300x250 dưới dạng: <strong className="text-amber-400 font-semibold">Quảng cáo: {(typeof localAd.sponsorName === 'string' && localAd.sponsorName.trim()) || 'Minh Hiếu Official VN'}</strong>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-white">Tiêu Đề Video / Nội Dung Quảng Cáo:</label>
                  <input
                    type="text"
                    value={localAd.adTitle}
                    onChange={(e) => setLocalAd({ ...localAd, adTitle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Ad Break Timing Slots: Pre-roll, Mid-roll, Random, Post-roll */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white text-xs">
                    Thời Điểm Phát Quảng Cáo Trong Video:
                  </span>
                  <span className="text-[10px] text-slate-400">Có thể bật nhiều vị trí cùng lúc</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-2 p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localAd.enablePreRoll !== false}
                      onChange={(e) => setLocalAd({ ...localAd, enablePreRoll: e.target.checked })}
                      className="accent-amber-500 w-4 h-4 rounded"
                    />
                    <span className="text-xs font-medium text-slate-200">Đầu video (Pre-roll)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localAd.enableMidRoll !== false}
                      onChange={(e) => setLocalAd({ ...localAd, enableMidRoll: e.target.checked })}
                      className="accent-amber-500 w-4 h-4 rounded"
                    />
                    <span className="text-xs font-medium text-slate-200">Giữa video (Mid-roll)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localAd.enableRandomRoll !== false}
                      onChange={(e) => setLocalAd({ ...localAd, enableRandomRoll: e.target.checked })}
                      className="accent-amber-500 w-4 h-4 rounded"
                    />
                    <span className="text-xs font-medium text-slate-200">Ngẫu nhiên khi xem</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localAd.enablePostRoll !== false}
                      onChange={(e) => setLocalAd({ ...localAd, enablePostRoll: e.target.checked })}
                      className="accent-amber-500 w-4 h-4 rounded"
                    />
                    <span className="text-xs font-medium text-slate-200">Cuối video (Post-roll)</span>
                  </label>
                </div>

                {/* Pre-Ad Countdown Seconds */}
                <div className="pt-1 space-y-1">
                  <label className="font-semibold text-slate-300 flex items-center justify-between text-[11px]">
                    <span>Thông báo đếm ngược &quot;Quảng cáo sắp bắt đầu&quot;:</span>
                    <span className="font-mono tabular-nums text-amber-400 font-bold">
                      {localAd.preAdNoticeSeconds ?? 5}s
                    </span>
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="1"
                    value={localAd.preAdNoticeSeconds ?? 5}
                    onChange={(e) =>
                      setLocalAd({ ...localAd, preAdNoticeSeconds: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Display Banner Fallback (728x90 & 160x600) */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h5 className="font-bold text-white text-xs">
                      Banner Hiển Thị Dự Phòng (728×90 &amp; 160×600)
                    </h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Tự động hiển thị banner kênh cài sẵn khi mạng quảng cáo ngoài chưa phân phối
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localAd.enableBannerFallback !== false}
                    onChange={(e) =>
                      setLocalAd({ ...localAd, enableBannerFallback: e.target.checked })
                    }
                    className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Link ảnh banner tùy chỉnh (để trống sẽ tự lấy ảnh thumbnail video quảng cáo)"
                  value={localAd.bannerImageUrl || ''}
                  onChange={(e) => setLocalAd({ ...localAd, bannerImageUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Scope Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localAd.showInMovie}
                    onChange={(e) => setLocalAd({ ...localAd, showInMovie: e.target.checked })}
                    className="accent-amber-500 w-4 h-4 rounded"
                  />
                  <span className="text-xs font-semibold text-slate-200">Áp dụng cho Phim</span>
                </label>

                <label className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localAd.showInYouTube}
                    onChange={(e) => setLocalAd({ ...localAd, showInYouTube: e.target.checked })}
                    className="accent-amber-500 w-4 h-4 rounded"
                  />
                  <span className="text-xs font-semibold text-slate-200">Áp dụng cho YouTube</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'watermark' && (
            <div className="space-y-4">
              {/* Watermark Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                <div>
                  <h4 className="font-bold text-white text-sm">Chèn Logo / Watermark Vào Phim</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Hiển thị logo thương hiệu Minh Hiếu góc trên hoặc dưới màn hình phim
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localWatermark.enabled}
                    onChange={(e) => setLocalWatermark({ ...localWatermark, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Logo URL Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-white flex items-center justify-between">
                  <span>URL Ảnh Logo (PNG / JPG / SVG):</span>
                  {localWatermark.logoUrl && (
                    <img
                      src={localWatermark.logoUrl}
                      alt="Preview"
                      className="w-6 h-6 rounded-full object-cover border border-amber-500/40"
                    />
                  )}
                </label>
                <input
                  type="text"
                  placeholder="https://.../logo.png"
                  value={localWatermark.logoUrl}
                  onChange={(e) => setLocalWatermark({ ...localWatermark, logoUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Logo Target URL */}
              <div className="space-y-1.5">
                <label className="font-bold text-white">Link Khi Bấm Vào Logo:</label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/@MinhHieuOfficialvn"
                  value={localWatermark.targetUrl}
                  onChange={(e) => setLocalWatermark({ ...localWatermark, targetUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Position and Size */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-white">Vị Trí Hiển Thị:</label>
                  <select
                    value={localWatermark.position}
                    onChange={(e: any) => setLocalWatermark({ ...localWatermark, position: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="top-right">Góc Trên Phải (Khuyên dùng)</option>
                    <option value="top-left">Góc Trên Trái</option>
                    <option value="bottom-right">Góc Dưới Phải</option>
                    <option value="bottom-left">Góc Dưới Trái</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-white">Kích Thước Logo:</label>
                  <select
                    value={localWatermark.size}
                    onChange={(e: any) => setLocalWatermark({ ...localWatermark, size: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="sm">Nhỏ (Gọn gàng)</option>
                    <option value="md">Vừa Phải (Tiêu chuẩn)</option>
                    <option value="lg">Lớn (Nổi bật)</option>
                  </select>
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="space-y-1.5">
                <label className="font-bold text-white flex items-center justify-between">
                  <span>Độ Trong Suốt (Opacity):</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {Math.round(localWatermark.opacity * 100)}%
                  </span>
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={localWatermark.opacity}
                  onChange={(e) => setLocalWatermark({ ...localWatermark, opacity: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === 'paypal' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-gradient-to-r from-blue-500/10 via-slate-900 to-slate-900 border border-blue-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CreditCard className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <h5 className="font-bold text-white text-xs">Cấu Hình Cổng Thanh Toán PayPal</h5>
                    <p className="text-[11px] text-slate-300">
                      Tích hợp PayPal cho phép nhận thanh toán trực tiếp khi người dùng tải tài liệu số hoặc các tính năng mở rộng
                    </p>
                  </div>
                </div>
              </div>

              {/* PayPal Master Switch */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">
                        Kích Hoạt Cổng Thanh Toán PayPal
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Bật để kích hoạt các tính năng thanh toán mở rộng và thu phí tải tài liệu
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={localPayPal.enabled}
                      onChange={(e) => setLocalPayPal({ ...localPayPal, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                {/* PayPal Client ID */}
                <div className="space-y-1.5 pt-1">
                  <label className="font-bold text-white text-xs">
                    PayPal Client ID (Mã khách hàng PayPal):
                  </label>
                  <input
                    type="text"
                    placeholder="sb (mặc định thử nghiệm) hoặc Client ID từ developer.paypal.com"
                    value={localPayPal.clientId}
                    onChange={(e) => setLocalPayPal({ ...localPayPal, clientId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Nhập "sb" để sử dụng chế độ PayPal Sandbox Demo, hoặc dán Client ID từ tài khoản doanh nghiệp PayPal của bạn.
                  </p>
                </div>

                {/* Environment Mode & Currency */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="font-bold text-white text-xs">Môi trường PayPal:</label>
                    <select
                      value={localPayPal.mode}
                      onChange={(e) => setLocalPayPal({ ...localPayPal, mode: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="sandbox">Sandbox (Thử nghiệm &amp; Test)</option>
                      <option value="live">Live (Nhận tiền thật)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-white text-xs">Đơn vị tiền tệ:</label>
                    <select
                      value={localPayPal.currency}
                      onChange={(e) => setLocalPayPal({ ...localPayPal, currency: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="VND">VND (₫)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-white text-xs">Giá tải tài liệu mặc định:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={localPayPal.defaultPrice}
                      onChange={(e) => setLocalPayPal({ ...localPayPal, defaultPrice: parseFloat(e.target.value) || 1.99 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Button Text */}
                <div className="space-y-1.5 pt-1">
                  <label className="font-bold text-white text-xs">
                    Tiêu đề nút thanh toán PayPal:
                  </label>
                  <input
                    type="text"
                    value={localPayPal.buttonText}
                    onChange={(e) => setLocalPayPal({ ...localPayPal, buttonText: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FolderDown className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <h5 className="font-bold text-white text-xs">Cài Đặt Quản Lý Tệp &amp; Định Dạng Cho Phép</h5>
                    <p className="text-[11px] text-slate-300">
                      Bật/tắt yêu cầu thanh toán khi tải tài liệu, mở rộng thêm các đuôi file cho phép upload lên dữ liệu
                    </p>
                  </div>
                </div>
              </div>

              {/* Paywall Toggle for Documents */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span>Yêu Cầu Thanh Toán PayPal Để Tải File Tài Liệu</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {localDocSettings.enablePaywall
                        ? 'ĐANG BẬT: Người xem cần thanh toán qua PayPal để mở khóa tải các file tài liệu số.'
                        : 'ĐANG TẮT: Người xem có thể tải toàn bộ tài liệu miễn phí và bình thường.'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={localDocSettings.enablePaywall}
                      onChange={(e) => setLocalDocSettings({ ...localDocSettings, enablePaywall: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>

              {/* Allowed Extensions Manager */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3.5">
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>Các Loại Định Dạng Tệp Cho Phép Upload Lên Data</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Danh sách các đuôi file hợp lệ được phép tải lên hệ thống (zip, pdf, doc, docx, xls, xlsx, v.v.):
                  </p>
                </div>

                {/* Chips list */}
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-900 rounded-xl border border-slate-800">
                  {localDocSettings.allowedExtensions.map((ext) => (
                    <span
                      key={ext}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-800 text-amber-300 border border-slate-700"
                    >
                      <span>.{ext}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setLocalDocSettings({
                            ...localDocSettings,
                            allowedExtensions: localDocSettings.allowedExtensions.filter((x) => x !== ext),
                          });
                        }}
                        className="text-slate-400 hover:text-rose-400 font-bold ml-1"
                        title={`Xóa định dạng .${ext}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add extension field */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Nhập đuôi mở rộng mới (vd: pptx, mp3, mp4, json)..."
                    value={newExtensionInput}
                    onChange={(e) => setNewExtensionInput(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newExtensionInput.trim() && !localDocSettings.allowedExtensions.includes(newExtensionInput.trim())) {
                          setLocalDocSettings({
                            ...localDocSettings,
                            allowedExtensions: [...localDocSettings.allowedExtensions, newExtensionInput.trim()],
                          });
                          setNewExtensionInput('');
                        }
                      }
                    }}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newExtensionInput.trim() && !localDocSettings.allowedExtensions.includes(newExtensionInput.trim())) {
                        setLocalDocSettings({
                          ...localDocSettings,
                          allowedExtensions: [...localDocSettings.allowedExtensions, newExtensionInput.trim()],
                        });
                        setNewExtensionInput('');
                      }
                    }}
                    disabled={!newExtensionInput.trim()}
                    className="py-2 px-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 transition-all"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Thêm Định Dạng</span>
                  </button>
                </div>

                {/* Max File Size */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <label className="font-bold text-white text-xs">Giới hạn kích thước file tối đa (MB):</label>
                    <p className="text-[10px] text-slate-500">Mặc định 50MB cho các file PDF, Word, Excel, ZIP</p>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={localDocSettings.maxFileSizeMb}
                    onChange={(e) => setLocalDocSettings({ ...localDocSettings, maxFileSizeMb: parseInt(e.target.value) || 50 })}
                    className="w-24 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono text-center focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="space-y-4">
              {/* Cloud Sync Status */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                  <Cloud className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">Đồng Bộ Lưu Trữ Vĩnh Viễn Trên Admin Data (Neon PostgreSQL)</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Khi bạn bấm <strong className="text-amber-400">"Lưu Cho Mọi Máy"</strong>, hệ thống ghi trực tiếp cấu hình quảng cáo và logo vào bảng <code className="text-emerald-300 font-mono">neon_app_settings</code> trên cơ sở dữ liệu Neon PostgreSQL để giữ nguyên sau khi nhấn F5 và đồng bộ tự động trên mọi máy tính, điện thoại!
                  </p>
                </div>
              </div>

              {/* Shareable Link (1-Click Sync on Any Device) */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Link Đồng Bộ Cài Đặt (Mở trên máy mới):</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">1 cú click là xong</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Gửi đường link này qua Zalo, Facebook hoặc bookmark trên máy tính/điện thoại khác để áp dụng tức thì:
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyShareLink}
                    className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-amber-500/20"
                  >
                    {copiedLink ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-950" />
                        <span>Đã Sao Chép Link Cấu Hình Vào Bộ Nhớ Tạm!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Sao Chép Link Cài Đặt (Mở Trên Máy Mới)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Import / Export JSON */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sao Lưu &amp; Nhập Mã Cấu Hình (JSON):</span>
                  </span>
                  <button
                    onClick={handleExportJson}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Tải file .json</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <textarea
                    rows={3}
                    placeholder="Dán nội dung file JSON cấu hình hoặc dán link chứa ?ad_cfg=... vào đây rồi nhấn Nhập Cấu Hình"
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  {importStatus && (
                    <p className={`text-[11px] font-semibold ${importStatus.includes('thành công') ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {importStatus}
                    </p>
                  )}
                  <button
                    onClick={handleImportJson}
                    disabled={!importJsonText.trim()}
                    className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold rounded-lg flex items-center gap-1.5 text-[11px] transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nhập Cấu Hình Từ Đoạn Mã Trên</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'hilltopads' && (
            <div className="space-y-4">
              <HilltopAdsDashboard
                onApplyAdCode={(zoneType, code) => {
                  if (zoneType === '300x250') {
                    setLocalAd((prev) => ({
                      ...prev,
                      banner300x250Html: code,
                      enableBanner300x250: true,
                    }));
                    setImportStatus('Đã áp dụng mã Anti-AdBlock vào vị trí Banner 300x250! Hãy bấm "Lưu Cho Mọi Máy".');
                    setTimeout(() => setImportStatus(null), 4000);
                  } else if (zoneType === 'videoSlider') {
                    setLocalAd((prev) => ({
                      ...prev,
                      videoSliderHtml: code,
                      enableVideoSlider: true,
                    }));
                    setImportStatus('Đã áp dụng mã Anti-AdBlock vào vị trí Video Slider! Hãy bấm "Lưu Cho Mọi Máy".');
                    setTimeout(() => setImportStatus(null), 4000);
                  } else if (zoneType === '300x100') {
                    setLocalAd((prev) => ({
                      ...prev,
                      banner300x100MobileHtml: code,
                      enableBanner300x100Mobile: true,
                    }));
                    setImportStatus('Đã áp dụng mã Anti-AdBlock vào vị trí Banner Mobile 300x100! Hãy bấm "Lưu Cho Mọi Máy".');
                    setTimeout(() => setImportStatus(null), 4000);
                  }
                }}
                onShowToast={(msg) => {
                  setImportStatus(msg);
                  setTimeout(() => setImportStatus(null), 3500);
                }}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {saveError && (
          <div className="px-4 py-2 bg-rose-500/15 border-t border-rose-500/30 text-rose-300 text-xs font-medium">
            {saveError}
          </div>
        )}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors flex items-center gap-1.5"
            title="Khôi phục cài đặt gốc"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mặc Định</span>
          </button>

          <div className="flex items-center gap-2">
            {onTriggerTestAd && (
              <button
                onClick={() => {
                  onSaveAdSettings(localAd);
                  onTriggerTestAd();
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 transition-colors flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Xem Thử QC</span>
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-60"
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : null}
              <span>{savedSuccess ? 'Đã Lưu & Đồng Bộ!' : isSaving ? 'Đang Lưu...' : 'Lưu Cho Mọi Máy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
