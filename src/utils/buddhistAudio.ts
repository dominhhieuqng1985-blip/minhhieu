/**
 * Web Audio API Synthesizers & Studio Giọng Nói API Speech Engine for Buddhist Temple & 3D Memorial Park
 */
import {
  createEverAiTtsJob,
  pollEverAiTtsJob,
  getStoredEverAiKey,
  DEFAULT_EVERAI_API_KEY,
  getSelectedStudioVoiceId,
} from './everai';

class BuddhistAudioEngine {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Thỉnh Chuông Gia Trì / Đại Hồng Chung (Deep resonant bronze temple bell)
   */
  public ringTempleBell(volume = 0.5) {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const baseFreq = 261.63; // C4 Middle Bell
      const harmonics = [
        { mult: 1, gain: 0.6, decay: 4.2 },
        { mult: 2.76, gain: 0.35, decay: 3.5 },
        { mult: 5.4, gain: 0.2, decay: 2.2 },
        { mult: 8.9, gain: 0.08, decay: 1.2 },
        { mult: 11.2, gain: 0.04, decay: 0.7 },
      ];

      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(volume, now);
      masterGain.connect(this.ctx.destination);

      harmonics.forEach(({ mult, gain: hGain, decay }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();

        osc.type = mult === 1 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(baseFreq * mult, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * mult * 0.998, now + decay);

        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(hGain, now + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, now + decay);

        osc.connect(g);
        g.connect(masterGain);

        osc.start(now);
        osc.stop(now + decay);
      });
    } catch (err) {
      console.warn('Bell audio error:', err);
    }
  }

  /**
   * Gõ Mõ Tụng Kinh (Traditional Wooden Fish Percussion)
   */
  public hitWoodenFish(volume = 0.6) {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(820, now);
      osc.frequency.exponentialRampToValueAtTime(410, now + 0.07);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(780, now);
      filter.Q.setValueAtTime(6, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (err) {
      console.warn('Wooden fish audio error:', err);
    }
  }

  /**
   * Thắp Hương Xẹt Lửa (Subtle sacred sparkle chime when lighting incense)
   */
  public playIncenseChime() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      [880, 1320, 1760, 2640].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.06;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.65);
      });
    } catch (err) {
      console.warn('Incense chime error:', err);
    }
  }

  /**
   * Alias: Gõ mõ
   */
  public strikeWoodenFish(volume = 0.6) {
    this.hitWoodenFish(volume);
  }

  /**
   * Alias: Thỉnh chuông / bát chuông xoay
   */
  public strikeSingingBowl(volume = 0.5) {
    this.ringTempleBell(volume);
  }
}

export const buddhistAudio = new BuddhistAudioEngine();

export const MINH_HIEU_DHARMA_VOICE_ID = 'voice-ab888766-b59f-402b';

let activeStudioAudioEl: HTMLAudioElement | null = null;
let activeStudioSessionId = 0;
const studioAudioMemoryCache = new Map<string, string>();
const CACHE_STORAGE_KEY = 'casttube_temple_tts_cache_v2';

function getCachedStudioAudioUrl(cacheKey: string): string | null {
  if (studioAudioMemoryCache.has(cacheKey)) {
    return studioAudioMemoryCache.get(cacheKey) || null;
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return null;
    const mapObj = JSON.parse(raw);
    if (mapObj && typeof mapObj[cacheKey] === 'string') {
      studioAudioMemoryCache.set(cacheKey, mapObj[cacheKey]);
      return mapObj[cacheKey];
    }
  } catch {}
  return null;
}

function setCachedStudioAudioUrl(cacheKey: string, url: string) {
  studioAudioMemoryCache.set(cacheKey, url);
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(CACHE_STORAGE_KEY);
    const mapObj = raw ? JSON.parse(raw) : {};
    const keys = Object.keys(mapObj);
    if (keys.length > 40) {
      delete mapObj[keys[0]];
    }
    mapObj[cacheKey] = url;
    sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(mapObj));
  } catch {}
}

function sanitizeVietnameseSpeechText(text: string): string {
  return (text || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[*_#]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2400);
}

/**
 * Synthesize Buddhist preaching / Sutra / Chú Tiểu / Memorial speech directly via EverAI API
 * Defaulting strictly to Minh Hiếu Lễ Chùa (voice-ab888766-b59f-402b)
 */
export async function synthesizeWithMinhHieuVoice(
  text: string,
  onProgress?: (progress: number, stage: string) => void,
  customVoiceId?: string,
  speedRate = 1.0
): Promise<string> {
  const cleanText = sanitizeVietnameseSpeechText(text);

  if (!cleanText) {
    throw new Error('Nội dung văn bản trống');
  }

  const candidateId = (customVoiceId || MINH_HIEU_DHARMA_VOICE_ID).trim();
  const targetVoiceId = candidateId.startsWith('voice-') ? candidateId : MINH_HIEU_DHARMA_VOICE_ID;
  const normalizedSpeed = Number(speedRate.toFixed(1));
  const cacheKey = `${targetVoiceId}::${normalizedSpeed}::${cleanText}`;
  const cachedUrl = getCachedStudioAudioUrl(cacheKey);
  if (cachedUrl) {
    onProgress?.(100, 'Đang phát...');
    return cachedUrl;
  }

  const key = getStoredEverAiKey() || DEFAULT_EVERAI_API_KEY;
  onProgress?.(25, 'Đang tải...');

  const result = await createEverAiTtsJob({
    inputText: cleanText,
    voiceCode: targetVoiceId,
    modelId: 'everai-v1.6',
    speedRate: normalizedSpeed,
    pitchRate: 1.0,
    volume: 100,
    audioType: 'mp3',
    bitrate: 128,
    apiKey: key,
  });

  onProgress?.(55, 'Đang tải...');

  const startTime = Date.now();
  while (Date.now() - startTime < 38000) {
    await new Promise((r) => setTimeout(r, 1000));
    const poll = await pollEverAiTtsJob(result.requestId, key);
    if (poll.isDone && poll.audioLink) {
      setCachedStudioAudioUrl(cacheKey, poll.audioLink);
      onProgress?.(100, 'Đã sẵn sàng');
      return poll.audioLink;
    }
    if (poll.progress) {
      onProgress?.(Math.min(95, 55 + Math.floor(poll.progress * 0.4)), 'Đang tải...');
    }
  }

  throw new Error('Hết thời gian chờ kết nối giọng đọc API');
}

/**
 * Play any text in the Temple or 3D Memorial Park strictly via API Voice (voice-ab888766-b59f-402b).
 * Zero browser / non-API speech fallback.
 */
export async function speakViaStudioVoiceApi(
  text: string,
  options?: {
    voiceId?: string;
    speedRate?: number;
    onLoadingChange?: (loading: boolean, stage?: string) => void;
    onStart?: (audioUrl: string) => void;
    onEnd?: () => void;
    onError?: (errMessage: string) => void;
  }
): Promise<boolean> {
  stopSpeaking();
  const mySession = ++activeStudioSessionId;
  const targetVoice = options?.voiceId || MINH_HIEU_DHARMA_VOICE_ID;
  const targetSpeed = options?.speedRate ?? 1.0;

  try {
    options?.onLoadingChange?.(true, 'Đang tải...');
    const audioUrl = await synthesizeWithMinhHieuVoice(
      text,
      (_prog, stage) => {
        if (mySession === activeStudioSessionId) {
          options?.onLoadingChange?.(true, stage);
        }
      },
      targetVoice,
      targetSpeed
    );

    if (mySession !== activeStudioSessionId) {
      return false;
    }

    options?.onLoadingChange?.(false);

    const audio = new Audio(audioUrl);
    activeStudioAudioEl = audio;

    audio.onplay = () => {
      if (mySession === activeStudioSessionId) {
        options?.onStart?.(audioUrl);
      }
    };
    audio.onended = () => {
      if (activeStudioAudioEl === audio) {
        activeStudioAudioEl = null;
      }
      if (mySession === activeStudioSessionId) {
        options?.onEnd?.();
      }
    };
    audio.onerror = () => {
      if (activeStudioAudioEl === audio) {
        activeStudioAudioEl = null;
      }
      // If cached MP3 link expired on EverAI CDN, clear cache entry and report error cleanly
      const cleanText = sanitizeVietnameseSpeechText(text);
      const cacheKey = `${targetVoice}::${Number(targetSpeed.toFixed(1))}::${cleanText}`;
      studioAudioMemoryCache.delete(cacheKey);
      if (mySession === activeStudioSessionId) {
        options?.onError?.('Liên kết âm thanh hết hạn, vui lòng nhấn Nghe lại');
      }
    };

    await audio.play();
    return true;
  } catch (err: any) {
    if (mySession !== activeStudioSessionId) return false;
    options?.onLoadingChange?.(false);
    options?.onError?.(err?.message || 'Lỗi kết nối API giọng đọc');
    return false;
  }
}

/**
 * Legacy helper routed 100% through API Voice Minh Hiếu Lễ Chùa (zero browser speech)
 */
export function speakVietnameseText(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    onEnd?: () => void;
    onError?: () => void;
  }
): boolean {
  speakViaStudioVoiceApi(text, {
    voiceId: MINH_HIEU_DHARMA_VOICE_ID,
    speedRate: options?.rate ?? 1.0,
    onEnd: options?.onEnd,
    onError: () => options?.onError?.(),
  });
  return true;
}

export function stopSpeaking() {
  activeStudioSessionId++;
  if (activeStudioAudioEl) {
    try {
      activeStudioAudioEl.pause();
      activeStudioAudioEl.currentTime = 0;
    } catch {}
    activeStudioAudioEl = null;
  }
}
