import { getApiBaseUrl, isStaticHost, getCustomBackendUrl } from './api';

export const DEFAULT_EVERAI_API_KEY = 'JZoMqN64fgxOuVcxViFyLj6YinIsiVbc0';
export const STORAGE_KEY_EVERAI_KEY = 'casttube_everai_api_key';
export const STORAGE_KEY_EVERAI_HISTORY = 'casttube_everai_history_v1';

export interface EverAiVoice {
  id: string;
  name: string;
  gender: 'Nam' | 'Nữ' | 'Male' | 'Female';
  region: string;
  language: string;
  description: string;
  cost: string;
  isSpecial?: boolean;
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

  // Determine endpoint: proxy through local backend if available, or direct call to everai.vn
  const customBackend = getCustomBackendUrl();
  let endpoint = 'https://www.everai.vn/api/v1/tts';

  if (customBackend) {
    endpoint = `${customBackend.replace(/\/+$/, '')}/api/everai/tts`;
  } else if (apiBase) {
    const cleanBase = apiBase.replace(/\/+$/, '');
    endpoint = cleanBase.endsWith('/api') ? `${cleanBase}/everai/tts` : `${cleanBase}/api/everai/tts`;
  }

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

    // If proxy returned 404 or 405 (such as GitHub Pages static server refusing POST), attempt direct call to everai.vn
    if ((res.status === 404 || res.status === 405) && endpoint !== 'https://www.everai.vn/api/v1/tts') {
      try {
        const directRes = await fetch('https://www.everai.vn/api/v1/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify(bodyPayload),
        });
        if (directRes.ok) {
          res = directRes;
        }
      } catch {
        // Continue with original response if direct call hits CORS
      }
    }
  } catch (directErr) {
    // If backend route fails or on static pages, attempt direct call to everai.vn
    if (endpoint !== 'https://www.everai.vn/api/v1/tts') {
      try {
        res = await fetch('https://www.everai.vn/api/v1/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify(bodyPayload),
        });
      } catch {
        throw new Error('Không thể kết nối đến máy chủ EverAI TTS. Vui lòng kiểm tra kết nối mạng hoặc API Key.');
      }
    } else {
      throw new Error('Không thể kết nối trực tiếp đến EverAI TTS. Trình duyệt có thể đang chặn CORS hoặc mạng gặp sự cố.');
    }
  }

  if (!res.ok) {
    const errText = await res.text();
    let errorMessage = '';
    if (errText.trim().startsWith('<') || errText.includes('405 Not Allowed') || errText.includes('<html')) {
      errorMessage =
        res.status === 405
          ? 'Máy chủ tĩnh GitHub Pages không hỗ trợ nhận POST. Ứng dụng đã chuyển sang chế độ gọi trực tiếp EverAI API hoặc giọng đọc trình duyệt Web Speech.'
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

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    if ((res.status === 404 || res.status === 405) && endpoint !== `https://www.everai.vn/api/v1/tts/${encodeURIComponent(requestId)}`) {
      try {
        const directRes = await fetch(`https://www.everai.vn/api/v1/tts/${encodeURIComponent(requestId)}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${key}`,
          },
        });
        if (directRes.ok) {
          res = directRes;
        }
      } catch {}
    }
  } catch {
    // Fallback direct call
    if (endpoint !== `https://www.everai.vn/api/v1/tts/${encodeURIComponent(requestId)}`) {
      res = await fetch(`https://www.everai.vn/api/v1/tts/${encodeURIComponent(requestId)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });
    } else {
      throw new Error('Chưa lấy được trạng thái audio từ EverAI.');
    }
  }

  if (!res.ok) {
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
