/**
 * Generates a pleasant synthesized WAV audio buffer for instant preview and demo playback
 * when API keys are being tested or when external network is restricted.
 */
export function createDemoAudioWav(durationSeconds: number = 3.5, sampleRate: number = 22050): Blob {
  const numChannels = 1;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Write WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16 bits per sample
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Generate pleasant harmonic chord sound (soft synth chord)
  const notes = [261.63, 329.63, 392.00, 523.25]; // C major chord
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    // Envelope: quick attack, steady sustain, soft release
    const attack = 0.05;
    const release = 0.6;
    let envelope = 1;
    if (t < attack) {
      envelope = t / attack;
    } else if (t > durationSeconds - release) {
      envelope = (durationSeconds - t) / release;
    }

    notes.forEach((freq, idx) => {
      const vol = 0.25 / (idx + 1);
      sample += Math.sin(2 * Math.PI * freq * t) * vol;
    });

    sample *= envelope;
    // Clamping to 16-bit signed integer
    const pcm = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
    view.setInt16(44 + i * 2, pcm, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

let currentAudioInstance: HTMLAudioElement | null = null;

export function stopCurrentAudio() {
  if (currentAudioInstance) {
    currentAudioInstance.pause();
    currentAudioInstance.currentTime = 0;
    currentAudioInstance = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export const EVERAI_OFFICIAL_VOICE_MP3: Record<string, string> = {
  vi_male_nhanvatnam_default: "https://www.everai.vn/media/audio/Nh%C3%A2n_V%E1%BA%ADt_Nam_Xin_ch%C3%A0o_qu%C3%BD_v%E1%BB%8B_%C4%91%C3%A2y_ddacb0453854.mp3",
  "voice-f9ae90f1-12e4-470d": "https://www.everai.vn/media/audio/Nh%C3%A2n_V%E1%BA%ADt_Nam_Xin_ch%C3%A0o_qu%C3%BD_v%E1%BB%8B_%C4%91%C3%A2y_ddacb0453854.mp3",
  "f9ae90f1-12e4-470d": "https://www.everai.vn/media/audio/Nh%C3%A2n_V%E1%BA%ADt_Nam_Xin_ch%C3%A0o_qu%C3%BD_v%E1%BB%8B_%C4%91%C3%A2y_ddacb0453854.mp3",
  vi_male_dominhhieu_mb: "https://everai.vn/media/speakers/vi_male_lehoang_mb_SRojRwi.mp3",
  vi_male_dominhhieu_mn: "https://everai.vn/media/speakers/ductrong_sample2.mp3",
  vi_male_namhongkong_mn: "https://everai.vn/media/speakers/vi_male_minhtriet_mb.mp3",
  vi_male_lehoang_mb: "https://everai.vn/media/speakers/vi_male_lehoang_mb_SRojRwi.mp3",
  vi_female_thuytrang_mb: "https://everai.vn/media/speakers/vi_female_thuytrang_mb_rzuuQ7F.mp3",
  vi_male_minhtriet_mb: "https://everai.vn/media/speakers/vi_male_minhtriet_mb.mp3",
  vi_female_kieunhi_mn: "https://everai.vn/media/speakers/vi_female_thuytien_mn.mp3",
  vi_male_ductrong_mb: "https://everai.vn/media/speakers/ductrong_sample2.mp3",
  vi_female_khanhhuyentvc_mb: "https://everai.vn/media/speakers/khanhhuyentvc_sample.mp3",
  vi_female_hoaian_mb: "https://everai.vn/media/speakers/vi_female_hoaian_mb.mp3",
  vi_female_halinh_mb: "https://everai.vn/media/speakers/thuylinh_thuyetminh.mp3",
  vi_female_huyenanh_mb: "https://everai.vn/media/speakers/thuylinh_thuyetminh.mp3",
  vi_female_hacuc_mb: "https://everai.vn/media/speakers/vi_female_hoaian_mb.mp3",
  vi_male_echo_default: "https://everai.vn/media/speakers/en_male_eward__thomas.mp3",
  vi_female_nova_default: "https://everai.vn/media/speakers/en_famle_christopher.mp3",
  vi_male_onyx_default: "https://everai.vn/media/speakers/en_male_lucas_brown.mp3",
  en_male_echo_default: "https://everai.vn/media/speakers/en_male_eward__thomas.mp3",
  en_female_nova_default: "https://everai.vn/media/speakers/en_famle_christopher.mp3",
  en_male_onyx_default: "https://everai.vn/media/speakers/en_male_lucas_brown.mp3",
};

export function playVoicePreview(
  text: string,
  langCode: string = "vi-VN",
  rate: number = 1.0,
  pitch: number = 1.0,
  volume: number = 1.0,
  voiceCode?: string,
  sampleAudioUrl?: string
): Promise<void> {
  return new Promise((resolve) => {
    stopCurrentAudio();

    // STRICTLY prefer the 100% authentic EverAI Studio Recording MP3 served via reliable backend proxy!
    const targetUrl = voiceCode
      ? `/api/tts/sample-audio/${encodeURIComponent(voiceCode)}`
      : sampleAudioUrl || `/api/tts/voice-sample?text=${encodeURIComponent(text.slice(0, 180))}&voice_code=vi_male_nhanvatnam_default`;

    const audio = new Audio(targetUrl);
    currentAudioInstance = audio;
    audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    audio.volume = 1.0;

    audio.onended = () => {
      currentAudioInstance = null;
      resolve();
    };

    audio.onerror = () => {
      console.warn("Direct sample audio error, falling back to voice-sample API with exact voice");
      const fallbackAudio = new Audio(`/api/tts/voice-sample?text=${encodeURIComponent(text.slice(0, 180))}&voice_code=${encodeURIComponent(voiceCode || 'vi_male_nhanvatnam_default')}`);
      currentAudioInstance = fallbackAudio;
      fallbackAudio.onended = () => {
        currentAudioInstance = null;
        resolve();
      };
      fallbackAudio.play().then(resolve).catch(resolve);
    };

    audio.play().catch((playErr) => {
      console.warn("Audio play() blocked:", playErr);
      resolve();
    });
  });
}

export function playTextWithSpeechSynthesis(
  text: string,
  lang: string = "vi-VN",
  rate: number = 1.0,
  pitch: number = 1.0,
  volume: number = 1.0,
  voiceCode?: string
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = Math.max(0.5, Math.min(2.0, rate));

    const isMale = voiceCode?.includes("_male_");
    const isFemale = voiceCode?.includes("_female_");
    const finalPitch = isMale ? Math.max(0.65, pitch * 0.72) : isFemale ? Math.min(1.4, pitch * 1.18) : pitch;
    utterance.pitch = finalPitch;
    utterance.volume = 1.0; // Maximum browser volume

    // Try finding matching voice by language and gender
    const voices = window.speechSynthesis.getVoices();
    const matchingLang = voices.filter(v => v.lang.startsWith(lang.slice(0, 2)));

    if (isMale) {
      const maleVoice = matchingLang.find(v => /male|nam|an|minh|david|george/i.test(v.name));
      if (maleVoice) utterance.voice = maleVoice;
    } else if (isFemale) {
      const femaleVoice = matchingLang.find(v => /female|nu|linh|hoaimy|trang|zira|samantha/i.test(v.name));
      if (femaleVoice) utterance.voice = femaleVoice;
    } else if (matchingLang.length > 0) {
      utterance.voice = matchingLang[0];
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
