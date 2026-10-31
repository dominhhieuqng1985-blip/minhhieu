export interface HilltopAdsBalance {
  balance: string;
  currency: string;
  rawBalance?: number;
}

export interface HilltopAdsSite {
  siteId: string;
  name: string;
  zones: (string | number)[];
}

export interface HilltopAdsZone {
  zoneId: string | number;
  siteId: string;
  name: string;
  type: string;
}

export interface HilltopAdsInventory {
  sites: Record<string, HilltopAdsSite>;
  zones: Record<string, HilltopAdsZone>;
}

export interface HilltopAdsStatMetric {
  subId?: string;
  countryCode?: string;
  countryName?: string;
  revenue?: string | number;
  currency?: string;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  cpm?: string | number;
  date?: string;
  zoneId?: string | number;
  siteId?: string | number;
}

export interface HilltopAdsAntiAdBlockResponse {
  code: string;
  directUrl?: string;
}

export interface HilltopAdsConfig {
  apiKey: string;
  autoRefreshAntiAdblock?: boolean;
  refreshIntervalMinutes?: number;
}

export const DEFAULT_HILLTOPADS_API_KEY =
  'XOxIVWkMqKGQUcaHf3CGzhCYAizN2oSnzrgcYPBzho9JvQUqoYY1cTqFToARZvfe';

export const STORAGE_KEY_HILLTOPADS_API_KEY = 'casttube_hilltopads_api_key';

export function getStoredHilltopAdsApiKey(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_HILLTOPADS_API_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // fallback
  }
  return DEFAULT_HILLTOPADS_API_KEY;
}

export function saveStoredHilltopAdsApiKey(key: string): void {
  try {
    if (!key || !key.trim()) {
      localStorage.removeItem(STORAGE_KEY_HILLTOPADS_API_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY_HILLTOPADS_API_KEY, key.trim());
    }
  } catch {
    // ignore
  }
}
