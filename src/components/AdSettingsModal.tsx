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
} from 'lucide-react';
import {
  AdSettings,
  WatermarkSettings,
  DEFAULT_AD_SETTINGS,
  DEFAULT_WATERMARK_SETTINGS,
  normalizeAdSettings,
  saveStoredAdSettings,
  saveStoredWatermarkSettings,
  saveRemoteAdSettings,
  generateShareableConfigUrl,
  decodeConfigFromBase64,
} from '../types/adConfig';

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
  const [localAd, setLocalAd] = useState<AdSettings>(() => normalizeAdSettings(adSettings));
  const [localWatermark, setLocalWatermark] = useState<WatermarkSettings>(watermarkSettings);
  const [activeTab, setActiveTab] = useState<'ad' | 'watermark' | 'sync'>('ad');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setLocalAd(normalizeAdSettings(adSettings));
      setLocalWatermark(watermarkSettings);
    }
  }, [isOpen, adSettings, watermarkSettings]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    onSaveAdSettings(localAd);
    onSaveWatermarkSettings(localWatermark);
    saveStoredAdSettings(localAd);
    saveStoredWatermarkSettings(localWatermark);

    try {
      await saveRemoteAdSettings(localAd, localWatermark);
    } catch {}

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
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
                Tùy chỉnh video quảng cáo, watermark và đồng bộ đa thiết bị
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
        <div className="p-2 border-b border-slate-800 bg-slate-950/50 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('ad')}
            className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'ad'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Quảng Cáo Phủ Video</span>
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
                    placeholder="Minh Hiếu Review Phim"
                    value={typeof localAd.sponsorName === 'string' ? localAd.sponsorName : ''}
                    onChange={(e) => setLocalAd({ ...localAd, sponsorName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Tự động hiển thị trên các banner 728x90, 336x280, 300x250 dưới dạng: <strong className="text-amber-400 font-semibold">Quảng cáo: {(typeof localAd.sponsorName === 'string' && localAd.sponsorName.trim()) || 'Minh Hiếu Review Phim'}</strong>
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
                  placeholder="https://www.youtube.com/@minhhieureviewphim"
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

          {activeTab === 'sync' && (
            <div className="space-y-4">
              {/* Cloud Sync Status */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                  <Cloud className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">Đồng Bộ Lưu Trữ Đa Thiết Bị</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Khi bạn bấm <strong className="text-amber-400">"Lưu Cài Đặt"</strong>, hệ thống tự động ghi nhớ cấu hình vào máy chủ (<code className="text-amber-300 font-mono">public/ad-settings.json</code>) để khi đổi máy khác, mở điện thoại hoặc trình duyệt khác, toàn bộ video quảng cáo và logo watermark sẽ tự động được tải về!
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
        </div>

        {/* Footer Actions */}
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
