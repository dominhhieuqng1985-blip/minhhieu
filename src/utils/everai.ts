import { getApiBaseUrl, isStaticHost, getCustomBackendUrl, resolveApiEndpoint, hasBackend } from './api';

export const DEFAULT_EVERAI_API_KEY = 'JZoMqN64fgxOuVcxViFyLj6YinIsiVbc0';
export const MINH_HIEU_LE_CHUA_VOICE_ID = 'voice-ab888766-b59f-402b';
export const DEFAULT_STUDIO_VOICE_ID = MINH_HIEU_LE_CHUA_VOICE_ID;
export const STORAGE_KEY_EVERAI_KEY = 'casttube_everai_api_key';
export const STORAGE_KEY_EVERAI_HISTORY = 'casttube_everai_history_v1';
export const STORAGE_KEY_CUSTOM_VOICES = 'casttube_custom_everai_voices_v1';
export const STORAGE_KEY_SELECTED_EVERAI_VOICE = 'casttube_selected_everai_voice_v1';
export const STUDIO_VOICE_CHANGED_EVENT = 'casttube:studio-voice-changed';

export function getSelectedStudioVoiceId(): string {
  if (typeof window === 'undefined') return DEFAULT_STUDIO_VOICE_ID;
  const saved = (localStorage.getItem(STORAGE_KEY_SELECTED_EVERAI_VOICE) || '').trim();
  if (!saved) return DEFAULT_STUDIO_VOICE_ID;
  // Ensure only valid API voice IDs (voice-* or saved custom API voices) are used
  const isCustomApiVoice = getCustomVoices().some((v) => v.id === saved);
  if (!saved.startsWith('voice-') && !isCustomApiVoice) {
    return DEFAULT_STUDIO_VOICE_ID;
  }
  return saved;
}

export function setSelectedStudioVoiceId(voiceId: string): void {
  if (typeof window === 'undefined') return;
  const clean = (voiceId || '').trim() || DEFAULT_STUDIO_VOICE_ID;
  try {
    localStorage.setItem(STORAGE_KEY_SELECTED_EVERAI_VOICE, clean);
    window.dispatchEvent(new CustomEvent(STUDIO_VOICE_CHANGED_EVENT, { detail: { voiceId: clean } }));
  } catch {}
}


export interface EverAiVoice {
  id: string;
  name: string;
  gender: 'Nam' | 'Nữ' | 'Male' | 'Female' | string;
  region: string;
  language: string;
  description: string;
  cost: string;
  isSpecial?: boolean;
  isCustom?: boolean;
  createdAt?: string;
}

export const EVERAI_MODELS = [
  { id: 'everai-v1.6', name: 'EverAI v1.6 (Khuyên dùng)', description: 'Đa ngôn ngữ, tiếng Việt & tiếng Anh chất lượng cao nhất' },
  { id: 'everai-v1.5', name: 'EverAI v1.5 (Ổn định)', description: 'Tối ưu âm điệu tiếng Việt tự nhiên, ổn định cao' },
  { id: 'everai-v1.5-turbo', name: 'EverAI v1.5 Turbo (Nhanh 2x)', description: 'Tốc độ phản hồi tức thì, tiết kiệm 50% chi phí credits' },
  { id: 'everai-v1', name: 'EverAI v1.0 (Cơ bản)', description: 'Mô hình nền tảng' },
];

export const EVERAI_VOICES: EverAiVoice[] = [
  {
    id: 'voice-ab888766-b59f-402b',
    name: 'Minh Hiếu Lễ Chùa',
    gender: 'Nam',
    region: 'Lễ Chùa & Giảng Đạo',
    language: 'Việt Nam',
    description:
      'Giọng đọc Minh Hiếu Lễ Chùa ấm áp, nhấn nhá trang nghiêm dùng cho Chú Tiểu, giảng đạo, tụng kinh và văn khấn',
    cost: '1000 credits',
    isSpecial: true,
  },
  {
    id: 'voice-74bb4b22-98a7-41a4',
    name: 'Minh Hiếu - Đạo Lý & Review Phim',
    gender: 'Nam',
    region: 'Thuyết pháp & Đạo lý',
    language: 'Việt Nam',
    description:
      'Giọng đọc truyền cảm, ấm áp, sâu sắc phù hợp đọc kinh kệ, đạo lý và lời bình phim',
    cost: '1000 credits',
    isSpecial: true,
  },
  {
    id: 'voice-0e62b161-5866-4e85',
    name: 'Giảng đạo Uy Nghiêm',
    gender: 'Nam',
    region: 'Thuyết pháp & Phật giáo',
    language: 'Việt Nam',
    description: 'Giọng trầm ấm, vang vọng, truyền cảm và thấm thía',
    cost: '1000 credits',
    isSpecial: true,
  },
  {
    id: 'voice-f9ae90f1-12e4-470d',
    name: 'Nhân vật nam Kịch tính',
    gender: 'Nam',
    region: 'Review phim & Điện ảnh',
    language: 'Việt Nam',
    description: 'Giọng nam hào hùng, kịch tính, lôi cuốn cho tóm tắt phim & kịch bản ly kỳ',
    cost: '1000 credits',
    isSpecial: true,
  },
];

export interface EverAiTtsHistoryItem {
  id: string;
  requestId: string;
  text: string;
  voiceCode: string;
  voiceName: string;
  audioLink: string;
  srtLink?: string;
  createdAt: string;
  characters: number;
  modelId?: string;
  audioType?: string;
}

export function getStoredEverAiKey(): string {
  if (typeof window === 'undefined') return DEFAULT_EVERAI_API_KEY;
  return localStorage.getItem(STORAGE_KEY_EVERAI_KEY) || DEFAULT_EVERAI_API_KEY;
}

export function setStoredEverAiKey(key: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = key.trim();
  if (!trimmed || trimmed === DEFAULT_EVERAI_API_KEY) {
    localStorage.removeItem(STORAGE_KEY_EVERAI_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY_EVERAI_KEY, trimmed);
  }
}

/**
 * Custom error class to clearly indicate browser CORS preflight (OPTIONS -> 405) issues on GitHub Pages
 */
export class EverAiCorsError extends Error {
  isCorsBlocked: boolean = true;
  isGithubPages: boolean = true;
  constructor(message?: string) {
    super(
      message ||
        'Lỗi CORS (405 OPTIONS): Máy chủ EverAI không hỗ trợ gọi trực tiếp từ trình duyệt trên GitHub Pages. Trình duyệt gửi request OPTIONS (preflight) và bị từ chối 405 Method Not Allowed. Vui lòng kết nối Backend Proxy hoặc chuyển sang Giọng Đọc Trình Duyệt Web Speech.'
    );
    this.name = 'EverAiCorsError';
  }
}

/**
 * Ping test a remote backend or proxy URL for connectivity
 */
export async function testEverAiBackendConnection(rawUrl: string): Promise<{
  ok: boolean;
  message: string;
  details?: any;
}> {
  const cleanUrl = rawUrl.trim().replace(/\/+$/, '');
  if (!cleanUrl) {
    return { ok: false, message: 'Vui lòng nhập URL Backend' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const healthUrl = cleanUrl.endsWith('/api') ? `${cleanUrl}/health` : `${cleanUrl}/api/health`;

    const res = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json().catch(() => null);
      return {
        ok: true,
        message: 'Kết nối máy chủ Backend thành công! Sẵn sàng chuyển tiếp request EverAI.',
        details: data,
      };
    }

    return {
      ok: false,
      message: `Máy chủ phản hồi HTTP ${res.status}. Vui lòng kiểm tra lại URL.`,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Không thể kết nối (${err.message || 'Lỗi mạng hoặc CORS'}). Đảm bảo backend đã bật CORS và đang online.`,
    };
  }
}

/**
 * Submit TTS generation request according to EverAI API v1.6 specification
 */
export async function createEverAiTtsJob(params: {
  inputText: string;
  voiceCode: string;
  modelId?: string;
  audioType?: 'mp3' | 'wav';
  bitrate?: number;
  speedRate?: number;
  pitchRate?: number;
  volume?: number;
  generateSrt?: boolean;
  callbackUrl?: string;
  apiKey?: string;
}): Promise<{ requestId: string; characters: number; status: number }> {
  const key = params.apiKey || getStoredEverAiKey();
  const apiBase = getApiBaseUrl();

  const sanitizedText = (params.inputText || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  const rawVoiceCode = (params.voiceCode || MINH_HIEU_LE_CHUA_VOICE_ID).trim();
  const resolvedVoiceCode =
    rawVoiceCode.startsWith('voice-') || getCustomVoices().some((v) => v.id === rawVoiceCode)
      ? rawVoiceCode
      : MINH_HIEU_LE_CHUA_VOICE_ID;

  const bodyPayload = {
    response_type: 'indirect',
    callback_url: params.callbackUrl || 'https://www.everai.vn/callback',
    input_text: sanitizedText || params.inputText,
    voice_code: resolvedVoiceCode,
    model_id: params.modelId || 'everai-v1.6',
    audio_type: params.audioType || 'mp3',
    bitrate: params.bitrate || 128,
    speed_rate: Number((params.speedRate ?? 1.0).toFixed(1)),
    pitch_rate: Number((params.pitchRate ?? 1.0).toFixed(1)),
    volume: Math.round(params.volume ?? 100),
    generate_srt: !!params.generateSrt,
  };

  // Determine endpoint: proxy through local/custom backend if available, or direct call to everai.vn
  let endpoint = 'https://www.everai.vn/api/v1/tts';
  if (hasBackend()) {
    endpoint = resolveApiEndpoint('everai/tts');
  } else {
    const customBackend = getCustomBackendUrl();
    if (customBackend) {
      endpoint = `${customBackend.replace(/\/+$/, '')}/api/everai/tts`;
    }
  }

  const isCallingDirectEverAi = endpoint.startsWith('https://www.everai.vn');

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(bodyPayload),
    });
  } catch (networkErr: any) {
    // If calling directly to EverAI on static host (GitHub Pages), the browser sends OPTIONS preflight
    // which EverAI rejects with 405 Method Not Allowed, causing fetch to throw TypeError
    if (isCallingDirectEverAi && isStaticHost) {
      throw new EverAiCorsError();
    }

    // If calling a proxy backend failed, check if we can fall back or alert user
    throw new Error(
      `Không thể kết nối đến máy chủ (${networkErr.message || 'Lỗi mạng'}). Vui lòng kiểm tra lại URL Backend hoặc mạng Internet.`
    );
  }

  // Handle HTTP errors
  if (!res.ok) {
    if (res.status === 405) {
      throw new EverAiCorsError(
        'Lỗi 405 Method Not Allowed: Máy chủ EverAI từ chối kiểm tra trước (OPTIONS) từ trình duyệt trên GitHub Pages. Vui lòng cấu hình Backend Proxy để chuyển tiếp POST từ máy chủ.'
      );
    }

    const errText = await res.text();
    let errorMessage = '';
    if (errText.trim().startsWith('<') || errText.includes('405 Not Allowed') || errText.includes('<html')) {
      errorMessage =
        res.status === 405
          ? 'Máy chủ không hỗ trợ nhận POST trực tiếp. Vui lòng kết nối Backend Proxy hoặc dùng Giọng Đọc Web Speech.'
          : `Máy chủ phản hồi mã lỗi HTTP ${res.status}.`;
    } else {
      try {
        const parsed = JSON.parse(errText);
        errorMessage = parsed.error_message || parsed.detail || parsed.message || `Lỗi EverAI HTTP ${res.status}`;
      } catch {
        errorMessage = errText.slice(0, 150);
      }
    }
    throw new Error(errorMessage || `Lỗi EverAI HTTP ${res.status}`);
  }

  const data = await res.json();
  if (data.status === 0 || !data.result) {
    // If legacy preset voice is rejected with 406 on EverAI v1.6, seamlessly retry with verified Studio voice
    if (
      (data.error_code === 406 || String(data.error_message || '').includes("doesn't support voice")) &&
      params.voiceCode !== DEFAULT_STUDIO_VOICE_ID
    ) {
      const fallbackVoice =
        params.voiceCode.includes('uynghiem') || params.voiceCode.includes('ductrong')
          ? 'voice-0e62b161-5866-4e85'
          : params.voiceCode.includes('nhannha')
          ? 'voice-ab888766-b59f-402b'
          : DEFAULT_STUDIO_VOICE_ID;
      return createEverAiTtsJob({
        ...params,
        voiceCode: fallbackVoice,
        modelId: 'everai-v1.6',
      });
    }
    throw new Error(data.error_message || 'EverAI không khởi tạo được yêu cầu');
  }

  return {
    requestId: data.result.request_id,
    characters: data.result.characters || params.inputText.length,
    status: data.status,
  };
}

/**
 * Poll TTS job status by request_id
 */
export async function pollEverAiTtsJob(
  requestId: string,
  apiKey?: string
): Promise<{
  isDone: boolean;
  progress: number;
  audioLink?: string;
  srtLink?: string;
  status: string;
  audioExpired?: boolean;
}> {
  const key = apiKey || getStoredEverAiKey();
  const apiBase = getApiBaseUrl();

  let endpoint = `https://www.everai.vn/api/v1/tts/${encodeURIComponent(requestId)}`;
  if (hasBackend()) {
    endpoint = resolveApiEndpoint(`everai/tts/${encodeURIComponent(requestId)}`);
  } else {
    const customBackend = getCustomBackendUrl();
    if (customBackend) {
      endpoint = `${customBackend.replace(/\/+$/, '')}/api/everai/tts/${encodeURIComponent(requestId)}`;
    }
  }

  const isCallingDirectEverAi = endpoint.startsWith('https://www.everai.vn');

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });
  } catch (pollErr: any) {
    if (isCallingDirectEverAi && isStaticHost) {
      throw new EverAiCorsError();
    }
    throw new Error(`Chưa lấy được trạng thái audio: ${pollErr.message || 'Mất kết nối'}`);
  }

  if (!res.ok) {
    if (res.status === 405) {
      throw new EverAiCorsError();
    }
    throw new Error(`HTTP ${res.status}: Chưa lấy được trạng thái audio`);
  }

  const data = await res.json();
  if (data.status === 0 || !data.result) {
    throw new Error(data.error_message || 'Lỗi kiểm tra tiến trình');
  }

  const r = data.result;
  const isDone =
    r.status === 'done' ||
    r.status === 'SUCCESS' ||
    r.status === 'hoàn thành' ||
    r.progress === 100 ||
    !!r.audio_link;

  return {
    isDone,
    progress: r.progress || (isDone ? 100 : 0),
    audioLink: r.audio_link,
    srtLink: r.srt_link,
    status: r.status,
    audioExpired: r.audio_expired,
  };
}

export function getSavedEverAiHistory(): EverAiTtsHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EVERAI_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveEverAiHistoryItem(item: EverAiTtsHistoryItem): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getSavedEverAiHistory();
    const updated = [item, ...list.filter((x) => x.id !== item.id)].slice(0, 30);
    localStorage.setItem(STORAGE_KEY_EVERAI_HISTORY, JSON.stringify(updated));
  } catch {}
}

/**
 * Lấy danh sách các giọng nói tùy chỉnh được lưu vĩnh viễn trong localStorage
 */
export function getCustomVoices(): EverAiVoice[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_VOICES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Thêm mới hoặc cập nhật giọng nói tùy chỉnh và lưu vĩnh viễn vào localStorage
 */
export function saveCustomVoice(voice: Partial<EverAiVoice> & { id: string; name: string }): EverAiVoice[] {
  if (typeof window === 'undefined') return [];
  try {
    const list = getCustomVoices();
    const cleanId = voice.id.trim();
    if (!cleanId) return list;

    const existingIndex = list.findIndex((v) => v.id.toLowerCase() === cleanId.toLowerCase());
    const voiceToSave: EverAiVoice = {
      id: cleanId,
      name: voice.name.trim() || cleanId,
      gender: (voice.gender as any) || 'Nam',
      region: voice.region?.trim() || 'Tùy chỉnh',
      language: voice.language?.trim() || 'Việt Nam',
      description:
        voice.description?.trim() ||
        `Giọng đọc AI tùy chỉnh EverAI (Mã: ${cleanId})`,
      cost: voice.cost || '1000 credits',
      isCustom: true,
      createdAt: voice.createdAt || new Date().toISOString(),
    };

    let updated: EverAiVoice[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = voiceToSave;
    } else {
      updated = [voiceToSave, ...list];
    }

    localStorage.setItem(STORAGE_KEY_CUSTOM_VOICES, JSON.stringify(updated));
    return updated;
  } catch {
    return getCustomVoices();
  }
}

/**
 * Xóa vĩnh viễn giọng nói tùy chỉnh khỏi localStorage
 */
export function deleteCustomVoice(id: string): EverAiVoice[] {
  if (typeof window === 'undefined') return [];
  try {
    const list = getCustomVoices();
    const cleanId = id.trim().toLowerCase();
    const updated = list.filter((v) => v.id.trim().toLowerCase() !== cleanId);
    localStorage.setItem(STORAGE_KEY_CUSTOM_VOICES, JSON.stringify(updated));
    return updated;
  } catch {
    return getCustomVoices();
  }
}

/**
 * Lấy tất cả giọng đọc bao gồm giọng tùy chỉnh của người dùng (ưu tiên đầu danh sách) và giọng mặc định
 */
export function getAllEverAiVoices(): EverAiVoice[] {
  const custom = getCustomVoices();
  return [...custom, ...EVERAI_VOICES];
}

/**
 * Xuất danh sách giọng tùy chỉnh ra chuỗi JSON để sao chép hoặc chuyển sang thiết bị/domain khác
 */
export function exportCustomVoicesJson(): string {
  const custom = getCustomVoices();
  return JSON.stringify(custom, null, 2);
}

/**
 * Nhập danh sách giọng tùy chỉnh từ JSON (hỗ trợ nhập đè hoặc hợp nhất)
 */
export function importCustomVoices(rawJson: string): EverAiVoice[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(rawJson);
    const items: any[] = Array.isArray(parsed) ? parsed : [parsed];
    const current = getCustomVoices();
    const map = new Map<string, EverAiVoice>();

    for (const v of current) {
      if (v.id) map.set(v.id.trim().toLowerCase(), v);
    }

    for (const item of items) {
      if (item && item.id && item.name) {
        const cleanId = String(item.id).trim();
        const v: EverAiVoice = {
          id: cleanId,
          name: String(item.name).trim() || cleanId,
          gender: item.gender || 'Nam',
          region: item.region || 'Tùy chỉnh',
          language: item.language || 'Việt Nam',
          description: item.description || `Giọng đọc AI tùy chỉnh (Mã: ${cleanId})`,
          cost: item.cost || '1000 credits',
          isCustom: true,
          createdAt: item.createdAt || new Date().toISOString(),
        };
        map.set(cleanId.toLowerCase(), v);
      }
    }

    const updated = Array.from(map.values());
    localStorage.setItem(STORAGE_KEY_CUSTOM_VOICES, JSON.stringify(updated));
    return updated;
  } catch (err: any) {
    throw new Error(`Định dạng JSON không hợp lệ: ${err.message}`);
  }
}

