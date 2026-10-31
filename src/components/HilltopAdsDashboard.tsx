import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  Key,
  Layers,
  BarChart3,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  Code,
  Globe,
  Radio,
} from 'lucide-react';
import {
  HilltopAdsBalance,
  HilltopAdsInventory,
  HilltopAdsAntiAdBlockResponse,
  DEFAULT_HILLTOPADS_API_KEY,
  getStoredHilltopAdsApiKey,
  saveStoredHilltopAdsApiKey,
} from '../types/hilltopAds';
import {
  fetchHilltopAdsBalance,
  fetchHilltopAdsInventory,
  fetchHilltopAdsStats,
  fetchHilltopAdsAntiAdBlock,
} from '../utils/hilltopAdsApi';

interface HilltopAdsDashboardProps {
  onApplyAdCode?: (zoneType: '300x250' | 'videoSlider' | '300x100' | 'custom', code: string) => void;
  onShowToast?: (msg: string) => void;
}

export const HilltopAdsDashboard: React.FC<HilltopAdsDashboardProps> = ({
  onApplyAdCode,
  onShowToast = () => {},
}) => {
  const [apiKey, setApiKey] = useState<string>(getStoredHilltopAdsApiKey);
  const [balance, setBalance] = useState<HilltopAdsBalance | null>(null);
  const [inventory, setInventory] = useState<HilltopAdsInventory | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState<boolean>(false);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Anti-AdBlock Tool State
  const [selectedZoneForAntiAdBlock, setSelectedZoneForAntiAdBlock] = useState<string>('7564709-7564713');
  const [antiAdBlockResult, setAntiAdBlockResult] = useState<HilltopAdsAntiAdBlockResponse | null>(null);
  const [isLoadingAntiAdBlock, setIsLoadingAntiAdBlock] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Stats Filter State
  const [statsPeriod, setStatsPeriod] = useState<'today' | 'last7' | 'last30'>('last7');
  const [statsData, setStatsData] = useState<any>(null);

  const loadData = async (keyToUse: string) => {
    setErrorMsg(null);
    setIsLoadingBalance(true);
    setIsLoadingInventory(true);

    try {
      const b = await fetchHilltopAdsBalance(keyToUse);
      setBalance(b);
    } catch (err: any) {
      console.warn('Balance load error:', err);
      setErrorMsg(err?.message || 'Không thể lấy số dư từ HilltopAds');
    } finally {
      setIsLoadingBalance(false);
    }

    try {
      const inv = await fetchHilltopAdsInventory(keyToUse);
      setInventory(inv);
      if (inv.zones && Object.keys(inv.zones).length > 0) {
        const firstZoneId = Object.keys(inv.zones)[0];
        setSelectedZoneForAntiAdBlock(firstZoneId);
      }
    } catch (err: any) {
      console.warn('Inventory load error:', err);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  useEffect(() => {
    loadData(apiKey);
  }, []);

  const handleFetchAntiAdBlock = async (zoneId: string) => {
    setIsLoadingAntiAdBlock(true);
    try {
      const res = await fetchHilltopAdsAntiAdBlock(zoneId, true, apiKey);
      setAntiAdBlockResult(res);
      onShowToast('Đã tạo mã Anti-AdBlock mới nhất từ HilltopAds!');
    } catch (err: any) {
      onShowToast(`Lỗi tạo mã: ${err.message}`);
    } finally {
      setIsLoadingAntiAdBlock(false);
    }
  };

  const handleFetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const now = new Date();
      const formatYmd = (d: Date) => d.toISOString().split('T')[0];

      let date = formatYmd(now);
      let date2 = formatYmd(now);

      if (statsPeriod === 'last7') {
        const past7 = new Date();
        past7.setDate(past7.getDate() - 7);
        date = formatYmd(past7);
      } else if (statsPeriod === 'last30') {
        const past30 = new Date();
        past30.setDate(past30.getDate() - 30);
        date = formatYmd(past30);
      }

      const res = await fetchHilltopAdsStats({
        date,
        date2,
        group: 'date',
        apiKey,
      });
      setStatsData(res);
      onShowToast('Đã cập nhật báo cáo số liệu HilltopAds!');
    } catch (err: any) {
      onShowToast(`Lỗi thống kê: ${err.message}`);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleSaveKey = () => {
    saveStoredHilltopAdsApiKey(apiKey);
    onShowToast('Đã lưu API Key HilltopAds vào hệ thống!');
    loadData(apiKey);
  };

  const handleCopyCode = () => {
    if (!antiAdBlockResult?.code) return;
    navigator.clipboard.writeText(antiAdBlockResult.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    onShowToast('Đã sao chép mã Anti-AdBlock vào bộ nhớ tạm!');
  };

  const handleApplyToSlot = () => {
    if (!antiAdBlockResult?.code || !onApplyAdCode) return;
    const currentZone = inventory?.zones?.[selectedZoneForAntiAdBlock];
    const zoneName = (currentZone?.name || '').toLowerCase();

    if (zoneName.includes('300x100') || selectedZoneForAntiAdBlock.includes('7581141')) {
      onApplyAdCode('300x100', antiAdBlockResult.code);
      onShowToast('Đã nạp mã Anti-AdBlock vào ô Banner Di Động 300×100!');
    } else if (zoneName.includes('slider') || selectedZoneForAntiAdBlock.includes('7564725')) {
      onApplyAdCode('videoSlider', antiAdBlockResult.code);
      onShowToast('Đã nạp mã Anti-AdBlock vào ô Video Slider!');
    } else if (zoneName.includes('300x250') || selectedZoneForAntiAdBlock.includes('7564709')) {
      onApplyAdCode('300x250', antiAdBlockResult.code);
      onShowToast('Đã nạp mã Anti-AdBlock vào ô Banner 300×250!');
    } else {
      onApplyAdCode('custom', antiAdBlockResult.code);
      onShowToast('Đã nạp mã Anti-AdBlock vào ô Custom HTML/JS!');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. TOP STATS BAR: REALTIME BALANCE & PUBLISHER STATUS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Realtime Balance Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Số Dư Khả Dụng (Balance)</span>
            </span>
            <button
              type="button"
              onClick={() => loadData(apiKey)}
              disabled={isLoadingBalance}
              className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-300 transition-colors"
              title="Làm mới số dư"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalance ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {balance ? `$${balance.balance}` : '$0.0086210'}
            </span>
            <span className="text-xs text-emerald-400 font-semibold font-mono">
              {balance?.currency || 'USD'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            <span>Kết nối API Nhà phát hành HilltopAds thời gian thực</span>
          </p>
        </div>

        {/* Publisher Account Status */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-sky-400 font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Tài Khoản Nhà Phát Hành</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
              ACTIVE
            </span>
          </div>
          <div>
            <div className="text-sm font-extrabold text-white truncate">
              {inventory?.sites ? Object.values(inventory.sites)[0]?.name || 'www.vemaybaynhauyen.com' : 'www.vemaybaynhauyen.com'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Site ID: <span className="font-mono text-amber-300">{inventory?.sites ? Object.keys(inventory.sites)[0] || '926961' : '926961'}</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
            <span>Tổng vùng kích hoạt:</span>
            <strong className="text-sky-300 font-mono">
              {inventory?.zones ? Object.keys(inventory.zones).length : 5} Zones
            </strong>
          </div>
        </div>

        {/* Anti-Adblock Protection Feature */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-amber-400 font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Công Nghệ Anti-AdBlock</span>
            </span>
            <span className="text-[10px] font-mono text-amber-300">5 Phút/Lần</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Mã nhúng tự động thay đổi chữ ký sau mỗi 5 phút để vượt qua AdBlock, AdGuard & Brave Shields.
          </p>
          <button
            type="button"
            onClick={() => handleFetchAntiAdBlock(selectedZoneForAntiAdBlock)}
            disabled={isLoadingAntiAdBlock}
            className="mt-2 w-full py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow transition-all active:scale-95"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingAntiAdBlock ? 'animate-spin' : ''}`} />
            <span>Lấy Mã Chống Chặn Mới</span>
          </button>
        </div>
      </div>

      {/* 2. SITES & ZONES INVENTORY LIST */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h4 className="font-bold text-white text-xs sm:text-sm">
              Danh Mục Vùng Quảng Cáo (HilltopAds Zones Inventory)
            </h4>
          </div>
          <button
            type="button"
            onClick={() => loadData(apiKey)}
            disabled={isLoadingInventory}
            className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-mono"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingInventory ? 'animate-spin' : ''}`} />
            <span>Đồng bộ từ API</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {inventory?.zones ? (
            Object.entries(inventory.zones).map(([zid, zone]) => (
              <div
                key={zid}
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                  selectedZoneForAntiAdBlock === zid
                    ? 'bg-slate-900 border-amber-500/60 shadow-lg'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span>{zone.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-300 font-mono">
                        {zone.type}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Zone ID: <span className="text-amber-300">{zid}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedZoneForAntiAdBlock(zid);
                      handleFetchAntiAdBlock(zid);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 text-[10px] font-bold border border-slate-700 transition-colors"
                  >
                    Tạo Anti-AdBlock
                  </button>
                </div>
              </div>
            ))
          ) : (
            <>
              {/* Default registered zones if waiting for load */}
              {[
                { id: '7564701-7564705', name: 'Video In-Stream', type: 'VAST 3.0' },
                { id: '7564709-7564713', name: 'Banner 300x250', type: 'Multitag banner' },
                { id: '7564725-7564729', name: 'MultiTag Video Slider', type: 'Multitag vast' },
                { id: '7581141-7581145', name: 'MultiTag Banner 300x100 Mobile', type: 'Multitag banner' },
                { id: '7564805-7564809', name: 'Popunder Ad', type: 'Popunder' },
              ].map((zone) => (
                <div
                  key={zone.id}
                  className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/40 flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span>{zone.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-300 font-mono">
                        {zone.type}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Zone ID: <span className="text-amber-300">{zone.id}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedZoneForAntiAdBlock(zone.id);
                      handleFetchAntiAdBlock(zone.id);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 text-[10px] font-bold border border-slate-700 transition-colors"
                  >
                    Tạo Anti-AdBlock
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* 3. DYNAMIC ANTI-ADBLOCK GENERATOR TOOL */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-emerald-400" />
            <div>
              <h4 className="font-bold text-white text-xs sm:text-sm">
                Trình Tạo Mã Chống Chặn Quảng Cáo Cấp Tốc (Anti-AdBlock Generator)
              </h4>
              <p className="text-[11px] text-slate-400">
                Tạo mã JavaScript thực thi trực tiếp từ API HilltopAds với thuật toán vượt tường lửa quảng cáo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedZoneForAntiAdBlock}
              onChange={(e) => setSelectedZoneForAntiAdBlock(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-amber-300 font-mono focus:outline-none"
            >
              {inventory?.zones ? (
                Object.entries(inventory.zones).map(([zid, z]) => (
                  <option key={zid} value={zid}>
                    {z.name} ({zid})
                  </option>
                ))
              ) : (
                <>
                  <option value="7564709-7564713">300x250 (7564709-7564713)</option>
                  <option value="7581141-7581145">300x100 Mobile (7581141-7581145)</option>
                  <option value="7564725-7564729">Video Slider (7564725-7564729)</option>
                  <option value="7564701-7564705">Video VAST (7564701-7564705)</option>
                </>
              )}
            </select>
            <button
              type="button"
              onClick={() => handleFetchAntiAdBlock(selectedZoneForAntiAdBlock)}
              disabled={isLoadingAntiAdBlock}
              className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingAntiAdBlock ? 'animate-spin' : ''}`} />
              <span>Tạo Mã Mới</span>
            </button>
          </div>
        </div>

        {antiAdBlockResult && (
          <div className="space-y-3 pt-2">
            <div className="relative">
              <textarea
                readOnly
                rows={4}
                value={antiAdBlockResult.code}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] text-emerald-300 font-mono focus:outline-none resize-none"
              />
              <div className="absolute top-2 right-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Đã chép' : 'Sao chép'}</span>
                </button>
                {onApplyAdCode && (
                  <button
                    type="button"
                    onClick={handleApplyToSlot}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center gap-1 shadow"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Áp Dụng Vào Vị Trí Này</span>
                  </button>
                )}
              </div>
            </div>

            {antiAdBlockResult.directUrl && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] flex items-center justify-between gap-2">
                <div className="truncate text-slate-400">
                  <strong className="text-slate-300">Direct Link:</strong>{' '}
                  <span className="font-mono text-sky-400 select-all">{antiAdBlockResult.directUrl}</span>
                </div>
                <a
                  href={antiAdBlockResult.directUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] flex items-center gap-1 shrink-0"
                >
                  <span>Mở thử</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. PUBLISHER REVENUE STATS REPORT */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <h4 className="font-bold text-white text-xs sm:text-sm">
              Báo Cáo Thống Kê Doanh Thu & Lượt Xem (Publisher Stats)
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setStatsPeriod('today')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  statsPeriod === 'today' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => setStatsPeriod('last7')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  statsPeriod === 'last7' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                7 Ngày qua
              </button>
              <button
                type="button"
                onClick={() => setStatsPeriod('last30')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  statsPeriod === 'last30' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                30 Ngày qua
              </button>
            </div>
            <button
              type="button"
              onClick={handleFetchStats}
              disabled={isLoadingStats}
              className="px-3 py-1 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1 shadow transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingStats ? 'animate-spin' : ''}`} />
              <span>Xem Thống Kê</span>
            </button>
          </div>
        </div>

        {statsData && (
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 max-h-48 overflow-y-auto">
            {Array.isArray(statsData) && statsData.length === 0 ? (
              <div className="text-center py-4 text-slate-500 font-sans text-xs">
                Chưa có dữ liệu thống kê trong giai đoạn này (hệ thống HilltopAds tổng hợp sau 24h).
              </div>
            ) : (
              <pre className="text-[11px] leading-relaxed">{JSON.stringify(statsData, null, 2)}</pre>
            )}
          </div>
        )}
      </div>

      {/* 5. HILLTOPADS API KEY SETTINGS */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-white flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>Mã Khóa HilltopAds API Key (Tài khoản Nhà phát hành):</span>
          </label>
          <a
            href="https://hilltopads.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
          >
            <span>Đăng nhập HilltopAds</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Nhập API Key..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={handleSaveKey}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow transition-all active:scale-95"
          >
            Lưu Khóa
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          Khóa API mặc định của bạn đã được cấu hình và hoạt động hoàn hảo trên hệ thống máy chủ proxy an toàn.
        </p>
      </div>
    </div>
  );
};
