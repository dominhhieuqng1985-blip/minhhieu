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

type StatsGroupMode = 'date' | 'zoneId' | 'geo';

interface NormalizedHilltopStatRow {
  key: string;
  label: string;
  subLabel?: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  trafficBack: number;
  conversions: number;
  revenue: number;
  currency: string;
}

const VIETNAMESE_COUNTRY_NAMES: Record<string, string> = {
  VN: 'Việt Nam',
  US: 'Hoa Kỳ',
  SG: 'Singapore',
  JP: 'Nhật Bản',
  KR: 'Hàn Quốc',
  TW: 'Đài Loan',
  TH: 'Thái Lan',
  MY: 'Malaysia',
  ID: 'Indonesia',
  PH: 'Philippines',
  AU: 'Úc',
  CA: 'Canada',
  GB: 'Vương quốc Anh',
  DE: 'Đức',
  FR: 'Pháp',
  NL: 'Hà Lan',
  ES: 'Tây Ban Nha',
  IT: 'Ý',
  BR: 'Brazil',
  FI: 'Phần Lan',
  ME: 'Montenegro',
  NG: 'Nigeria',
  BY: 'Belarus',
  BG: 'Bulgaria',
  IM: 'Đảo Man',
};

const BUILTIN_ZONE_LABELS: Record<string, string> = {
  '7564701': 'Video VAST Trong Luồng',
  '7564705': 'Video VAST Trong Luồng (Dự phòng)',
  '7564709': 'Banner 300×250',
  '7564713': 'Banner 300×250 (MultiTag)',
  '7564725': 'MultiTag Video Slider',
  '7564729': 'MultiTag Video Slider (Luồng phụ)',
  '7581141': 'Banner Di Động 300×100',
  '7581145': 'Banner Di Động 300×100 (MultiTag)',
  '7564805': 'Quảng Cáo Popunder',
  '7564809': 'Quảng Cáo Popunder (Luồng phụ)',
};

function formatVietnameseDateLabel(ymd: string): { label: string; subLabel?: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return { label: ymd || 'Không xác định' };
  const [, year, month, day] = match;
  const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
  const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const weekday = !isNaN(dateObj.getTime()) ? weekdays[dateObj.getDay()] : undefined;
  return {
    label: `${day}/${month}/${year}`,
    subLabel: weekday,
  };
}

function resolveZoneVietnameseLabel(
  rawZoneId: string,
  inventory: HilltopAdsInventory | null
): { label: string; subLabel?: string } {
  const cleanId = rawZoneId.trim();
  if (inventory?.zones) {
    if (inventory.zones[cleanId]) {
      return {
        label: inventory.zones[cleanId].name,
        subLabel: `Mã vùng #${cleanId} • ${inventory.zones[cleanId].type}`,
      };
    }
    for (const [zid, zInfo] of Object.entries(inventory.zones)) {
      if (zid.split('-').map((s) => s.trim()).includes(cleanId)) {
        return {
          label: zInfo.name,
          subLabel: `Mã vùng #${cleanId} (Nhóm ${zid})`,
        };
      }
    }
  }
  if (BUILTIN_ZONE_LABELS[cleanId]) {
    return {
      label: BUILTIN_ZONE_LABELS[cleanId],
      subLabel: `Mã vùng #${cleanId}`,
    };
  }
  return {
    label: `Vùng Quảng Cáo #${cleanId || 'Khác'}`,
    subLabel: cleanId ? `Zone ID: ${cleanId}` : undefined,
  };
}

function normalizeHilltopStatsRows(
  rawData: any,
  groupMode: StatsGroupMode,
  inventory: HilltopAdsInventory | null
): NormalizedHilltopStatRow[] {
  if (!rawData) return [];

  const payload =
    rawData && typeof rawData === 'object' && 'result' in rawData && rawData.result !== undefined
      ? rawData.result
      : rawData;

  if (!payload) return [];

  const buckets = new Map<
    string,
    {
      impressions: number;
      clicks: number;
      trafficBack: number;
      conversions: number;
      revenue: number;
      weightedCpmSum: number;
      directCpmFallback: number;
      currency: string;
      countryCode?: string;
      countryName?: string;
    }
  >();

  const accumulateMetricItem = (groupKey: string, item: any) => {
    if (!item || typeof item !== 'object') return;
    const impressions = Number(item.impressions ?? item.views ?? 0) || 0;
    const clicks = Number(item.clicks ?? 0) || 0;
    const trafficBack = Number(item.trafficBack ?? item.traffic_back ?? 0) || 0;
    const conversions = Number(item.conversions ?? 0) || 0;
    const revenue = parseFloat(String(item.revenue ?? 0)) || 0;
    const itemCpm = parseFloat(String(item.cpm ?? 0)) || 0;
    const currency = String(item.currency || 'USD').toUpperCase();

    const resolvedKey =
      groupKey ||
      String(
        item.date ||
          item.zoneId ||
          item.zone_id ||
          item.countryCode ||
          item.geo ||
          'Tổng hợp'
      );

    const existing = buckets.get(resolvedKey) || {
      impressions: 0,
      clicks: 0,
      trafficBack: 0,
      conversions: 0,
      revenue: 0,
      weightedCpmSum: 0,
      directCpmFallback: 0,
      currency,
      countryCode: item.countryCode ? String(item.countryCode) : undefined,
      countryName: item.countryName ? String(item.countryName) : undefined,
    };

    existing.impressions += impressions;
    existing.clicks += clicks;
    existing.trafficBack += trafficBack;
    existing.conversions += conversions;
    existing.revenue += revenue;
    existing.weightedCpmSum += itemCpm * impressions;
    if (itemCpm > existing.directCpmFallback) {
      existing.directCpmFallback = itemCpm;
    }
    if (item.currency) existing.currency = currency;
    if (item.countryCode && !existing.countryCode) existing.countryCode = String(item.countryCode);
    if (item.countryName && !existing.countryName) existing.countryName = String(item.countryName);

    buckets.set(resolvedKey, existing);
  };

  if (Array.isArray(payload)) {
    payload.forEach((entry, idx) => {
      const keyFromEntry = String(
        entry?.date ?? entry?.zoneId ?? entry?.countryCode ?? `Dòng ${idx + 1}`
      );
      accumulateMetricItem(keyFromEntry, entry);
    });
  } else if (typeof payload === 'object') {
    const looksLikeSingleMetric =
      'revenue' in payload || 'impressions' in payload || 'clicks' in payload;
    if (looksLikeSingleMetric) {
      accumulateMetricItem(String(payload.date || 'Tổng hợp'), payload);
    } else {
      for (const [key, val] of Object.entries(payload)) {
        if (Array.isArray(val)) {
          val.forEach((item) => accumulateMetricItem(key, item));
        } else if (val && typeof val === 'object') {
          const innerIsMetric =
            'revenue' in (val as any) ||
            'impressions' in (val as any) ||
            'clicks' in (val as any);
          if (innerIsMetric) {
            accumulateMetricItem(key, val);
          } else {
            for (const [, subVal] of Object.entries(val as Record<string, any>)) {
              if (Array.isArray(subVal)) {
                subVal.forEach((item) => accumulateMetricItem(key, item));
              } else if (subVal && typeof subVal === 'object') {
                accumulateMetricItem(key, subVal);
              }
            }
          }
        }
      }
    }
  }

  let rows: NormalizedHilltopStatRow[] = Array.from(buckets.entries()).map(([key, b]) => {
    const ctr = b.impressions > 0 ? (b.clicks / b.impressions) * 100 : 0;
    const cpm =
      b.impressions > 0
        ? b.revenue > 0
          ? (b.revenue / b.impressions) * 1000
          : b.weightedCpmSum / b.impressions
        : b.directCpmFallback;

    let label = key;
    let subLabel: string | undefined;

    if (groupMode === 'date' || /^\d{4}-\d{2}-\d{2}$/.test(key)) {
      const formatted = formatVietnameseDateLabel(key);
      label = formatted.label;
      subLabel = formatted.subLabel;
    } else if (groupMode === 'zoneId') {
      const formatted = resolveZoneVietnameseLabel(key, inventory);
      label = formatted.label;
      subLabel = formatted.subLabel;
    } else if (groupMode === 'geo') {
      const code = (b.countryCode || key || '').toUpperCase();
      if (!code) {
        label = 'Không xác định';
        subLabel = 'Lưu lượng ẩn quốc gia';
      } else {
        const vnName = VIETNAMESE_COUNTRY_NAMES[code] || b.countryName || code;
        label = `${vnName} (${code})`;
        subLabel = b.countryName && VIETNAMESE_COUNTRY_NAMES[code] ? b.countryName : `Mã quốc gia: ${code}`;
      }
    }

    return {
      key,
      label,
      subLabel,
      impressions: b.impressions,
      clicks: b.clicks,
      ctr,
      cpm,
      trafficBack: b.trafficBack,
      conversions: b.conversions,
      revenue: b.revenue,
      currency: b.currency || 'USD',
    };
  });

  // Khi xem theo Quốc Gia hoặc Vùng Quảng Cáo, ẩn bớt các dòng hoàn toàn bằng 0 nếu đã có dòng phát sinh lưu lượng
  if (groupMode !== 'date') {
    const activeRows = rows.filter(
      (r) => r.impressions > 0 || r.clicks > 0 || r.revenue > 0 || r.trafficBack > 0
    );
    if (activeRows.length > 0) {
      rows = activeRows;
    }
  }

  // Sắp xếp: Theo ngày mới nhất lên đầu; theo Zone/Quốc gia ưu tiên doanh thu & lượt hiển thị cao nhất
  if (groupMode === 'date') {
    rows.sort((a, b) => b.key.localeCompare(a.key));
  } else {
    rows.sort((a, b) => b.revenue - a.revenue || b.impressions - a.impressions);
  }

  return rows;
}

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
  const [statsGroup, setStatsGroup] = useState<StatsGroupMode>('date');
  const [statsData, setStatsData] = useState<any>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

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

  const fetchStatsReport = async (
    periodToUse: 'today' | 'last7' | 'last30' = statsPeriod,
    groupToUse: StatsGroupMode = statsGroup,
    keyToUse: string = apiKey,
    notifyToast: boolean = false
  ) => {
    setIsLoadingStats(true);
    setStatsError(null);
    try {
      const formatVnYmd = (d: Date) => {
        try {
          return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
        } catch {
          return d.toISOString().split('T')[0];
        }
      };

      const now = new Date();
      let date = formatVnYmd(now);
      const date2 = formatVnYmd(now);

      if (periodToUse === 'last7') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        date = formatVnYmd(past7);
      } else if (periodToUse === 'last30') {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        date = formatVnYmd(past30);
      }

      const res = await fetchHilltopAdsStats({
        date,
        date2,
        group: groupToUse,
        apiKey: keyToUse,
      });
      setStatsData(res);
      if (notifyToast) {
        onShowToast('Đã cập nhật bảng báo cáo doanh thu & lượt xem HilltopAds!');
      }
    } catch (err: any) {
      const msg = err?.message || 'Không thể tải báo cáo thống kê HilltopAds';
      setStatsError(msg);
      if (notifyToast) {
        onShowToast(`Lỗi thống kê: ${msg}`);
      }
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    loadData(apiKey);
  }, []);

  useEffect(() => {
    fetchStatsReport(statsPeriod, statsGroup, apiKey, false);
  }, [statsPeriod, statsGroup]);

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
    await fetchStatsReport(statsPeriod, statsGroup, apiKey, true);
  };

  const handleSaveKey = () => {
    saveStoredHilltopAdsApiKey(apiKey);
    onShowToast('Đã lưu API Key HilltopAds vào hệ thống!');
    loadData(apiKey);
    fetchStatsReport(statsPeriod, statsGroup, apiKey, false);
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

      {/* 4. PUBLISHER REVENUE STATS REPORT (FULL VIETNAMESE TABLE & SUMMARY CARDS) */}
      {(() => {
        const statRows = normalizeHilltopStatsRows(statsData, statsGroup, inventory);
        const totalImpressions = statRows.reduce((acc, r) => acc + r.impressions, 0);
        const totalClicks = statRows.reduce((acc, r) => acc + r.clicks, 0);
        const totalTrafficBack = statRows.reduce((acc, r) => acc + r.trafficBack, 0);
        const totalRevenue = statRows.reduce((acc, r) => acc + r.revenue, 0);
        const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        const avgCpm = totalImpressions > 0 ? (totalRevenue / totalImpressions) * 1000 : 0;
        const primaryCurrency = statRows[0]?.currency || balance?.currency || 'USD';

        const groupColumnHeader =
          statsGroup === 'zoneId'
            ? 'Vùng Quảng Cáo (Zone)'
            : statsGroup === 'geo'
            ? 'Quốc Gia / Khu Vực'
            : 'Ngày Tháng';

        return (
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-start lg:items-center justify-between flex-col lg:flex-row gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">
                    Báo Cáo Thống Kê Doanh Thu &amp; Lượt Xem (Publisher Stats)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Bảng tổng hợp chi tiết lượt hiển thị, lượt nhấp, đơn giá CPM và doanh thu thực tế theo thời gian thực
                  </p>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto">
                {/* Bộ lọc nhóm hiển thị bằng tiếng Việt */}
                <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setStatsGroup('date')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                      statsGroup === 'date' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Theo Ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatsGroup('zoneId')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                      statsGroup === 'zoneId' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Theo Vùng QC
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatsGroup('geo')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                      statsGroup === 'geo' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Theo Quốc Gia
                  </button>
                </div>

                {/* Bộ lọc khoảng thời gian */}
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
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
                  <span>Xem Thống Kê</span>
                </button>
              </div>
            </div>

            {statsError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{statsError}</span>
              </div>
            )}

            {/* 4 Thẻ Tổng Hợp Chỉ Số Toàn Kỳ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                <div className="text-[11px] text-slate-400 font-medium">Tổng Doanh Thu Kỳ Này</div>
                <div className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-0.5">
                  ${totalRevenue.toFixed(7)} <span className="text-[10px] text-emerald-300">{primaryCurrency}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-medium">Tổng Lượt Hiển Thị</div>
                <div className="text-base sm:text-lg font-black text-white font-mono mt-0.5">
                  {totalImpressions.toLocaleString('vi-VN')}{' '}
                  <span className="text-[10px] font-sans font-semibold text-slate-400">lượt xem</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-medium">Tổng Lượt Nhấp (CTR)</div>
                <div className="text-base sm:text-lg font-black text-amber-300 font-mono mt-0.5">
                  {totalClicks.toLocaleString('vi-VN')}{' '}
                  <span className="text-[11px] text-sky-400 font-semibold">({avgCtr.toFixed(2)}%)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-medium">Đơn Giá CPM Trung Bình</div>
                <div className="text-base sm:text-lg font-black text-sky-300 font-mono mt-0.5">
                  ${avgCpm.toFixed(5)}{' '}
                  <span className="text-[10px] font-sans font-normal text-slate-400">/ 1.000 lượt</span>
                </div>
              </div>
            </div>

            {/* Bảng Dữ Liệu Tiếng Việt Đầy Đủ Cột */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              {isLoadingStats && !statsData ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 text-sky-400 animate-spin" />
                  <span>Đang tải bảng báo cáo thống kê tiếng Việt từ HilltopAds...</span>
                </div>
              ) : statRows.length === 0 ? (
                <div className="text-center py-6 px-4 text-slate-400 font-sans text-xs">
                  Chưa có phát sinh số liệu thống kê trong khoảng thời gian đã chọn. Bạn có thể chọn{' '}
                  <strong className="text-amber-300">7 Ngày qua</strong> hoặc{' '}
                  <strong className="text-amber-300">30 Ngày qua</strong> để xem lịch sử doanh thu.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left border-collapse min-w-[680px]">
                    <thead className="bg-slate-900/95 sticky top-0 z-10 border-b border-slate-800 text-[11px] text-slate-300 uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 font-bold text-center w-12">STT</th>
                        <th className="py-2.5 px-3 font-bold">{groupColumnHeader}</th>
                        <th className="py-2.5 px-3 font-bold text-right">Lượt Hiển Thị</th>
                        <th className="py-2.5 px-3 font-bold text-right">Lượt Nhấp (Click)</th>
                        <th className="py-2.5 px-3 font-bold text-right">Tỷ Lệ Nhấp (CTR)</th>
                        <th className="py-2.5 px-3 font-bold text-right">Đơn Giá CPM</th>
                        <th className="py-2.5 px-3 font-bold text-right">Lưu Lượng Trả Về</th>
                        <th className="py-2.5 px-3 font-bold text-right">Doanh Thu</th>
                        <th className="py-2.5 px-3 font-bold text-center">Tiền Tệ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-xs">
                      {statRows.map((row, index) => (
                        <tr
                          key={row.key || index}
                          className="hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                            {index + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-white">{row.label}</div>
                            {row.subLabel && (
                              <div className="text-[10px] text-slate-400 mt-0.5">{row.subLabel}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-200">
                            {row.impressions.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-300">
                            {row.clicks.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-sky-300">
                            {row.ctr.toFixed(2)}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-200">
                            ${row.cpm.toFixed(5)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                            {row.trafficBack.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                            ${row.revenue.toFixed(7)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                              {row.currency}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-950/95 border-t-2 border-emerald-500/40 text-xs font-bold sticky bottom-0">
                      <tr>
                        <td colSpan={2} className="py-3 px-3 text-emerald-300 uppercase tracking-wide">
                          Tổng Cộng Toàn Kỳ ({statRows.length}{' '}
                          {statsGroup === 'zoneId'
                            ? 'vùng'
                            : statsGroup === 'geo'
                            ? 'quốc gia'
                            : 'ngày'}
                          )
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-white">
                          {totalImpressions.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-amber-300">
                          {totalClicks.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-sky-300">
                          {avgCtr.toFixed(2)}%
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-sky-200">
                          ${avgCpm.toFixed(5)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300">
                          {totalTrafficBack.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-400 text-sm">
                          ${totalRevenue.toFixed(7)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-[11px] text-emerald-300">
                          {primaryCurrency}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 5. HILLTOPADS API KEY SETTINGS */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-xs font-bold text-white flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Mã Khóa HilltopAds API Key (Tài khoản Nhà phát hành):</span>
          </label>
          <a
            href="https://hilltopads.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 shrink-0"
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
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow transition-all active:scale-95 shrink-0"
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
