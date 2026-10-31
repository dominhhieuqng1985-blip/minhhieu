import { resolveApiEndpoint, hasBackend, isStaticHost } from './api';
import {
  HilltopAdsBalance,
  HilltopAdsInventory,
  HilltopAdsAntiAdBlockResponse,
  DEFAULT_HILLTOPADS_API_KEY,
  getStoredHilltopAdsApiKey,
} from '../types/hilltopAds';

export interface FetchStatsOptions {
  date?: string;
  date2?: string;
  geo?: string;
  siteId?: string | number;
  zoneId?: string | number;
  subId?: string;
  group?: string;
  apiKey?: string;
}

/**
 * Fetch Publisher Balance from HilltopAds
 */
export async function fetchHilltopAdsBalance(apiKey?: string): Promise<HilltopAdsBalance> {
  const effectiveKey = apiKey || getStoredHilltopAdsApiKey();

  if (hasBackend()) {
    try {
      const endpoint = resolveApiEndpoint('hilltopads/balance');
      const resp = await fetch(`${endpoint}?key=${encodeURIComponent(effectiveKey)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.status === 'success' && data.result) {
          return {
            balance: String(data.result.balance ?? '0.00'),
            currency: String(data.result.currency || 'USD'),
            rawBalance: parseFloat(data.result.balance) || 0,
          };
        }
      }
    } catch (err) {
      console.warn('Backend HilltopAds balance error:', err);
    }
  }

  // Direct fetch fallback
  const directUrl = `https://api.hilltopads.com/publisher/balance?key=${encodeURIComponent(effectiveKey)}`;
  const resp = await fetch(directUrl);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: Không thể lấy số dư HilltopAds`);
  }
  const data = await resp.json();
  if (data.status !== 'success' || !data.result) {
    throw new Error(data.message || 'Lỗi phản hồi từ HilltopAds');
  }
  return {
    balance: String(data.result.balance ?? '0.00'),
    currency: String(data.result.currency || 'USD'),
    rawBalance: parseFloat(data.result.balance) || 0,
  };
}

/**
 * Fetch Publisher Sites & Zones Inventory from HilltopAds
 */
export async function fetchHilltopAdsInventory(apiKey?: string): Promise<HilltopAdsInventory> {
  const effectiveKey = apiKey || getStoredHilltopAdsApiKey();

  if (hasBackend()) {
    try {
      const endpoint = resolveApiEndpoint('hilltopads/inventory');
      const resp = await fetch(`${endpoint}?key=${encodeURIComponent(effectiveKey)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.status === 'success' && data.result) {
          return {
            sites: data.result.sites || {},
            zones: data.result.zones || {},
          };
        }
      }
    } catch (err) {
      console.warn('Backend HilltopAds inventory error:', err);
    }
  }

  // Direct fetch fallback
  const directUrl = `https://api.hilltopads.com/publisher/inventory?key=${encodeURIComponent(effectiveKey)}`;
  const resp = await fetch(directUrl);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: Không thể lấy danh sách zones HilltopAds`);
  }
  const data = await resp.json();
  if (data.status !== 'success' || !data.result) {
    throw new Error(data.message || 'Lỗi danh mục HilltopAds');
  }
  return {
    sites: data.result.sites || {},
    zones: data.result.zones || {},
  };
}

/**
 * Fetch Publisher Stats from HilltopAds
 */
export async function fetchHilltopAdsStats(options: FetchStatsOptions = {}): Promise<any> {
  const effectiveKey = options.apiKey || getStoredHilltopAdsApiKey();
  const params = new URLSearchParams();
  params.set('key', effectiveKey);

  if (options.date) params.set('date', options.date);
  if (options.date2) params.set('date2', options.date2);
  if (options.geo) params.set('geo', options.geo);
  if (options.siteId) params.set('siteId', String(options.siteId));
  if (options.zoneId) params.set('zoneId', String(options.zoneId));
  if (options.subId) params.set('subId', options.subId);
  if (options.group) params.set('group', options.group);

  if (hasBackend()) {
    try {
      const endpoint = resolveApiEndpoint('hilltopads/stats');
      const resp = await fetch(`${endpoint}?${params.toString()}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.status === 'success') {
          return data.result;
        }
      }
    } catch (err) {
      console.warn('Backend HilltopAds stats error:', err);
    }
  }

  // Direct fetch fallback
  const directUrl = `https://api.hilltopads.com/publisher/listStats?${params.toString()}`;
  const resp = await fetch(directUrl);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: Không thể lấy số liệu thống kê`);
  }
  const data = await resp.json();
  if (data.status !== 'success') {
    throw new Error(data.message || 'Lỗi thống kê HilltopAds');
  }
  return data.result;
}

/**
 * Fetch Anti-AdBlock script from HilltopAds
 * Recommendations: Fetch new code every 5 minutes to bypass ad blockers effectively.
 */
export async function fetchHilltopAdsAntiAdBlock(
  zoneId: string | number,
  includeTags: boolean = true,
  apiKey?: string
): Promise<HilltopAdsAntiAdBlockResponse> {
  const effectiveKey = apiKey || getStoredHilltopAdsApiKey();
  const params = new URLSearchParams();
  params.set('key', effectiveKey);
  params.set('zoneId', String(zoneId));
  params.set('Include tags', includeTags ? '1' : '0');

  if (hasBackend()) {
    try {
      const endpoint = resolveApiEndpoint('hilltopads/anti-adblock');
      const resp = await fetch(`${endpoint}?${params.toString()}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.status === 'success' && data.result) {
          return {
            code: data.result.code || '',
            directUrl: data.result.directUrl,
          };
        }
      }
    } catch (err) {
      console.warn('Backend HilltopAds antiAdblock error:', err);
    }
  }

  // Direct fetch fallback
  const directUrl = `https://api.hilltopads.com/publisher/antiAdBlock?${params.toString()}`;
  const resp = await fetch(directUrl);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: Không thể lấy mã Anti-AdBlock`);
  }
  const data = await resp.json();
  if (data.status !== 'success' || !data.result) {
    throw new Error(data.message || 'Lỗi tạo mã Anti-AdBlock');
  }
  return {
    code: data.result.code || '',
    directUrl: data.result.directUrl,
  };
}
