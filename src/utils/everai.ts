import { getApiBaseUrl, isStaticHost, getCustomBackendUrl } from './api';

export const DEFAULT_EVERAI_API_KEY = 'JZoMqN64fgxOuVcxViFyLj6YinIsiVbc0';
export const STORAGE_KEY_EVERAI_KEY = 'casttube_everai_api_key';
export const STORAGE_KEY_EVERAI_HISTORY = 'casttube_everai_history_v1';
export const STORAGE_KEY_CUSTOM_VOICES = 'casttube_custom_everai_voices_v1';

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
  // Special voices for Minh Hieu Review Phim / Thuyết pháp
  {
    id: 'voice-74bb4b22-98a7-41a4',
    name: 'Minh Hiếu - Đạo Lý & Review Phim',
    gender: 'Nam',
    region: 'Thuyết pháp & Đạo lý',
    language: 'Việt Nam',
    description: 'Giọng đọc truyền cảm, ấm áp, sâu sắc phù hợp đọc kinh kệ, đạo lý và lời bình phim',
    cost: '1000 credits',
    isSpecial: true,
  },
  {
    id: 'voice-ab888766-b59f-402b',
    name: 'Giảng Đạo Nhấn Nhá',
    gender: 'Nam',
    region: 'Thuyết pháp & Đạo lý',
    language: 'Việt Nam',
    description: 'Giọng đọc ngữ điệu nhấn nhá sâu sắc, phù hợp kinh Phật, đạo lý làm người & triết lý',
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

  // Việt Nam Standard Voices
  {
    id: 'vi_female_kieunhi_mn',
    name: 'Kiều Nhi',
    gender: 'Nữ',
    region: 'Miền Nam',
    language: 'Việt Nam',
    description: 'Giọng nữ miền Nam ngọt ngào, dịu dàng, phù hợp truyện tâm lý & âm nhạc dân ca',
    cost: '1000 credits',
  },
  {
    id: 'vi_male_lehoang_mb',
    name: 'Lê Hoàng',
    gender: 'Nam',
    region: 'Miền Bắc',
    language: 'Việt Nam',
    description: 'Giọng nam miền Bắc chuẩn, đĩnh đạc, rõ ràng, phong thái phát thanh viên',
    cost: '1000 credits',
  },
  {
    id: 'vi_female_thuytrang_mb',
    name: 'Thùy Trang',
    gender: 'Nữ',
    region: 'Miền Bắc',
    language: 'Việt Nam',
    description: 'Giọng nữ nhẹ nhàng, thanh thoát, truyền cảm xúc mượt mà',
    cost: '1000 credits',
  },
  {
    id: 'vi_male_minhtriet_mb',
    name: 'Minh Triết',
    gender: 'Nam',
    region: 'Miền Bắc',
    language: 'Việt Nam',
    description: 'Giọng nam ấm áp, đáng tin cậy, thích hợp tin tức & kiến thức',
    cost: '1000 credits',
  },
  {
    id: 'vi_female_hacuc_mb',
    name: 'Hạ Cúc',
    gender: 'Nữ',
    region: 'Miền Bắc',
    language: 'Việt Nam',
    description: 'Giọng nữ sâu lắng, êm dịu, đọc truyện đêm khuya rất hay',
    cost: '1000 credits',
  },
  {
    id: 'vi_male_ductrong_mb',
    name: 'Đức Trọng',
    gender: 'Nam',
    region: 'Miền Bắc',
    language: 'Việt Nam',
    description: 'Giọng nam trầm, dứt khoát, phong độ',
    cost: '1000 credits',
  },
  {
    id: 'vi_female_huyenanh_mb',
    name: 'Huyền Anh',
    gender: 'Nữ',
    region: 'Miền Bắc',
    language: 'Việt Nam',
    description: 'Giọng nữ biểu cảm, linh hoạt, lôi cuốn',
    cost: '1000 credits',
  },
  {
    id: 'vi_female_halinh_mb',
    name: 'Hà Linh',
    gender: 'Nữ',
    region: 'Miền Bắc',
    language: 'Việt Nam',
    description: 'Giọng nữ tươi vui, trẻ trung, trong trẻo',
    cost: '1000 credits',
  },
  {
    id: 'vi_female_hoaian_mb',
    name: 'Hoài An',
    gender: 'Nữ',
    region: 'Miền Bắc',
    language: 'Việt Nam',
    description: 'Giọng nữ dịu dàng, hoài niệm, cảm xúc sâu lắng',
    cost: '1000 credits',
  },
  {
    id: 'vi_female_khanhhuyentvc_mb',
    name: 'Khánh Huyền',
    gender: 'Nữ',
    region: 'Miền Bắc',
    language: 'Việt Nam',
    description: 'Giọng đọc TVC quảng cáo chuyên nghiệp, năng lượng cao',
    cost: '1000 credits',
  },
  {
    id: 'vi_male_echo_default',
    name: 'Echo (Nam)',
    gender: 'Nam',
    region: 'Giọng Mỹ chuẩn',
    language: 'Việt Nam',
    description: 'Giọng đọc hiện đại, tiết kiệm chi phí',
    cost: '100 credits',
  },
  {
    id: 'vi_female_nova_default',
    name: 'Nova (Nữ)',
    gender: 'Nữ',
    region: 'Giọng Mỹ chuẩn',
    language: 'Việt Nam',
    description: 'Giọng đọc nữ mượt mà, tiết kiệm chi phí',
    cost: '100 credits',
  },
  {
    id: 'vi_male_onyx_default',
    name: 'Onyx (Nam)',
    gender: 'Nam',
    region: 'Giọng Mỹ chuẩn',
    language: 'Việt Nam',
    description: 'Giọng đọc nam khỏe khoắn, giá rẻ',
    cost: '100 credits',
  },

  // English Voices
  {
    id: 'en_female_emily_us',
    name: 'Emily (US)',
    gender: 'Female',
    region: 'Mỹ (US)',
    language: 'English',
    description: 'Natural high-fidelity American female accent',
    cost: '1000 credits',
  },
  {
    id: 'en_female_alice_default',
    name: 'Alice (US)',
    gender: 'Female',
    region: 'Mỹ (US)',
    language: 'English',
    description: 'Warm and friendly American narrator',
    cost: '1000 credits',
  },
  {
    id: 'en_male_echo_default',
    name: 'Echo (US)',
    gender: 'Male',
    region: 'Mỹ (US)',
    language: 'English',
    description: 'Standard American male voice',
    cost: '100 credits',
  },
  {
    id: 'en_female_nova_default',
    name: 'Nova (US)',
    gender: 'Female',
    region: 'Mỹ (US)',
    language: 'English',
    description: 'Clean American female voice',
    cost: '100 credits',
  },
  {
    id: 'en_male_onyx_default',
    name: 'Onyx (US)',
    gender: 'Male',
    region: 'Mỹ (US)',
    language: 'English',
    description: 'Deep authoritative male narrator',
    cost: '100 credits',
  },
  {
    id: 'en_female_jessica_au',
    name: 'Jessica (AU)',
    gender: 'Female',
    region: 'Úc (Australia)',
    language: 'English',
    description: 'Authentic Australian female accent',
    cost: '1000 credits',
  },
  {
    id: 'en_female_elara_br',
    name: 'Elara (UK)',
    gender: 'Female',
    region: 'Anh (British)',
    language: 'English',
    description: 'Polished British RP female voice',
    cost: '1000 credits',
  },
  {
    id: 'en_female_meera_indian',
    name: 'Meera (IN)',
    gender: 'Female',
    region: 'Ấn Độ (Indian)',
    language: 'English',
    description: 'Fluent Indian English accent',
    cost: '1000 credits',
  },

  // Other Global Languages
  {
    id: 'zh_female_liu-ying_default',
    name: 'Liu Ying (Chinese)',
    gender: 'Female',
    region: 'Trung Quốc (Mandarin)',
    language: 'Chinese',
    description: 'Standard Mandarin Chinese voice',
    cost: '1000 credits',
  },
  {
    id: 'jp_female_yuki_default',
    name: 'Yuki (Japanese)',
    gender: 'Female',
    region: 'Nhật Bản (Tokyo)',
    language: 'Japanese',
    description: 'Natural Japanese narration',
    cost: '1000 credits',
  },
  {
    id: 'kr_female_seo-yeon_default',
    name: 'Seo Yeon (Korean)',
    gender: 'Female',
    region: 'Hàn Quốc (Seoul)',
    language: 'Korean',
    description: 'Natural Korean female voice',
    cost: '1000 credits',
  },
  {
    id: 'fr_female_camille_default',
    name: 'Camille (French)',
    gender: 'Female',
    region: 'Pháp (Paris)',
    language: 'French',
    description: 'Elegant French female voice',
    cost: '1000 credits',
  },
  {
    id: 'es_female_elana_default',
    name: 'Elena (Spanish)',
    gender: 'Female',
    region: 'Tây Ban Nha (Madrid)',
    language: 'Spanish',
    description: 'Warm Spanish female accent',
    cost: '1000 credits',
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

  const bodyPayload = {
    response_type: 'indirect',
    callback_url: params.callbackUrl || 'https://www.everai.vn/callback',
    input_text: params.inputText,
    voice_code: params.voiceCode,
    model_id: params.modelId || 'everai-v1.6',
    audio_type: params.audioType || 'mp3',
    bitrate: params.bitrate || 128,
    speed_rate: Number((params.speedRate ?? 1.0).toFixed(1)),
    pitch_rate: Number((params.pitchRate ?? 1.0).toFixed(1)),
    volume: Math.round(params.volume ?? 100),
    generate_srt: !!params.generateSrt,
  };

  // Determine endpoint: proxy through local/custom backend if available, or direct call to everai.vn
  const customBackend = getCustomBackendUrl();
  let endpoint = 'https://www.everai.vn/api/v1/tts';

  if (customBackend) {
    endpoint = `${customBackend.replace(/\/+$/, '')}/api/everai/tts`;
  } else if (apiBase) {
    const cleanBase = apiBase.replace(/\/+$/, '');
    endpoint = cleanBase.endsWith('/api') ? `${cleanBase}/everai/tts` : `${cleanBase}/api/everai/tts`;
  }

  const isCallingDirectEverAi = endpoint === 'https://www.everai.vn/api/v1/tts';

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

  const customBackend = getCustomBackendUrl();
  let endpoint = `https://www.everai.vn/api/v1/tts/${encodeURIComponent(requestId)}`;

  if (customBackend) {
    endpoint = `${customBackend.replace(/\/+$/, '')}/api/everai/tts/${encodeURIComponent(requestId)}`;
  } else if (apiBase) {
    const cleanBase = apiBase.replace(/\/+$/, '');
    endpoint = cleanBase.endsWith('/api')
      ? `${cleanBase}/everai/tts/${encodeURIComponent(requestId)}`
      : `${cleanBase}/api/everai/tts/${encodeURIComponent(requestId)}`;
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

