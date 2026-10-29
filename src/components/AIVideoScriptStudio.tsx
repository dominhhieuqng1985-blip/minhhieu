import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Download,
  Image as ImageIcon,
  Sliders,
  Volume2,
  VolumeX,
  Video,
  Layers,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Scissors,
  Clapperboard,
  Maximize2,
  Settings,
  User,
  Mic,
  Music,
  Wand2,
  Sparkle,
  Radio,
  Zap,
  ArrowRight,
  Eye,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import { getApiBaseUrl, getCustomBackendUrl, hasBackend } from '../utils/api';
import {
  EverAiVoice,
  EVERAI_VOICES,
  getAllEverAiVoices,
  createEverAiTtsJob,
  pollEverAiTtsJob,
  getStoredEverAiKey,
} from '../utils/everai';

export interface SceneItem {
  sceneNumber: number;
  name: string;
  duration: number; // 10 seconds
  timeRange: string;
  characterName: string;
  characterGender: 'Nam' | 'Nữ';
  voiceId: string;
  voiceName: string;
  narration: string;
  subtitle: string;
  visualPrompt: string;
  cameraMotion: 'zoom-in' | 'pan-right' | 'zoom-out' | 'pulse';
  motionPreset: 'cinematic-zoom' | 'pan-parallax' | 'dynamic-pulse' | 'epic-sweep';
  imageUrl: string;
  audioUrl?: string;
  isGeneratingAudio?: boolean;
  audioProgress?: number;
}

export interface ScriptStory {
  title: string;
  aspectRatio: '9:16' | '16:9';
  totalDuration: number; // 30s
  theme: string;
  scenes: SceneItem[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxAlpha: number;
  hue: number;
}

interface AIVideoScriptStudioProps {
  onShowToast: (msg: string) => void;
}

export const AIVideoScriptStudio: React.FC<AIVideoScriptStudioProps> = ({ onShowToast }) => {
  const [topic, setTopic] = useState<string>(
    'Xuyên không về cổ đại dùng trí tuệ hiện đại cứu giúp dân lành'
  );
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [storyStyle, setStoryStyle] = useState<string>('Review phim kịch tính & Triết lý');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // EverAI Voice Settings
  const [availableVoices, setAvailableVoices] = useState<EverAiVoice[]>([]);
  const [defaultVoiceId, setDefaultVoiceId] = useState<string>('voice-74bb4b22-98a7-41a4');
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState<boolean>(false);
  const [genderFilter, setGenderFilter] = useState<'All' | 'Nam' | 'Nữ'>('All');
  const [isGeneratingAllAudio, setIsGeneratingAllAudio] = useState<boolean>(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  // Motion Video Settings
  const [motionSpeed, setMotionSpeed] = useState<number>(1.0);
  const [showParticles, setShowParticles] = useState<boolean>(true);
  const [showDynamicSubtitles, setShowDynamicSubtitles] = useState<boolean>(true);
  const [showAudioWaveform, setShowAudioWaveform] = useState<boolean>(true);
  const [selectedEffect, setSelectedEffect] = useState<'golden-particles' | 'cinematic-light' | 'dramatic-vignette'>('golden-particles');

  // Script Storyboard (3 scenes x 10s = 30s)
  const [scriptData, setScriptData] = useState<ScriptStory>({
    title: 'Xuyên Không Cổ Đại: Trí Tuệ Cứu Dân Lành',
    aspectRatio: '9:16',
    totalDuration: 30,
    theme: 'Review phim kịch tính & Triết lý',
    scenes: [
      {
        sceneNumber: 1,
        name: 'Mở màn: Bối Cảnh & Cơ Duyên Xuyên Không',
        duration: 10,
        timeRange: '00:00 - 00:10',
        characterName: 'Người dẫn chuyện',
        characterGender: 'Nam',
        voiceId: 'voice-74bb4b22-98a7-41a4',
        voiceName: 'Minh Hiếu - Đạo Lý & Review Phim',
        narration:
          'Một cô gái hiện đại bất ngờ tỉnh giấc trong y phục cổ trang, giữa một ngôi làng cằn cỗi đang đứng trước bờ vực tuyệt vọng.',
        subtitle: 'Bất ngờ xuyên không về thời cổ đại xa xôi',
        visualPrompt:
          'Cinematic portrait of young modern woman in ancient Vietnamese silk dress standing in a dried village, dramatic sunlight, 8k resolution, film grain',
        cameraMotion: 'zoom-in',
        motionPreset: 'cinematic-zoom',
        imageUrl:
          'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
      },
      {
        sceneNumber: 2,
        name: 'Cao trào: Trí Tuệ Hiện Đại Xoay Chuyển Cục Diện',
        duration: 10,
        timeRange: '00:10 - 00:20',
        characterName: 'Nữ nhân vật chính',
        characterGender: 'Nữ',
        voiceId: 'vi_female_kieunhi_mn',
        voiceName: 'Kiều Nhi (Nữ Miền Nam)',
        narration:
          'Không đầu hàng số phận, cô áp dụng kiến thức thủy lợi hiện đại dẫn nước ngọt về đồng ruộng, đánh bại âm mưu của quan tham gian ác.',
        subtitle: 'Dùng trí tuệ hiện đại xoay chuyển cục diện',
        visualPrompt:
          'Dramatic ancient construction of water irrigation canal with flowing clear water, epic historical atmosphere, golden hour backlight',
        cameraMotion: 'pan-right',
        motionPreset: 'pan-parallax',
        imageUrl:
          'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      },
      {
        sceneNumber: 3,
        name: 'Đỉnh điểm: Chân Lý Lòng Nhân Ái Vĩnh Cửu',
        duration: 10,
        timeRange: '00:20 - 00:30',
        characterName: 'Minh Hiếu (Đạo lý)',
        characterGender: 'Nam',
        voiceId: 'voice-ab888766-b59f-402b',
        voiceName: 'Giảng Đạo Nhấn Nhá',
        narration:
          'Cánh đồng xanh mướt hồi sinh, muôn dân reo hò cúi đầu. Sức mạnh vĩ đại nhất không nằm ở phép thuật, mà ở lòng nhân ái vì nhân dân.',
        subtitle: 'Lòng nhân ái mang lại sự sống vĩnh hằng',
        visualPrompt:
          'Lush green vast ancient rice fields under glorious sunset, happy villagers looking up peacefully, breathtaking landscape photography',
        cameraMotion: 'zoom-out',
        motionPreset: 'epic-sweep',
        imageUrl:
          'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80',
      },
    ],
  });

  // Canvas Player & Sequencer State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackTime, setPlaybackTime] = useState<number>(0); // 0 to 30
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [isRecordingVideo, setIsRecordingVideo] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true);

  // Inline scene editor state
  const [editingSceneIdx, setEditingSceneIdx] = useState<number | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Preloaded audio objects for each scene
  const sceneAudioElementsRef = useRef<{ [key: number]: HTMLAudioElement }>({});
  const loadedImagesRef = useRef<{ [key: number]: HTMLImageElement }>({});

  // Dynamic particle system for motion animation
  const particlesRef = useRef<Particle[]>([]);

  // Initialize available EverAI voices on mount
  useEffect(() => {
    const voices = getAllEverAiVoices();
    setAvailableVoices(voices);
  }, [isVoiceSettingsOpen]);

  // Initialize 60 floating ambient particles for dynamic motion
  useEffect(() => {
    const count = 60;
    const parts: Particle[] = [];
    for (let i = 0; i < count; i++) {
      parts.push({
        x: Math.random() * 800,
        y: Math.random() * 800,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.3 - Math.random() * 0.7, // gently drift upwards like embers
        size: 1 + Math.random() * 2.5,
        alpha: Math.random() * 0.8,
        maxAlpha: 0.3 + Math.random() * 0.6,
        hue: 35 + Math.random() * 20, // Warm golden amber
      });
    }
    particlesRef.current = parts;
  }, []);

  // Preload images into memory for smooth canvas animation
  useEffect(() => {
    scriptData.scenes.forEach((sc, idx) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = sc.imageUrl;
      img.onload = () => {
        loadedImagesRef.current[idx] = img;
      };
    });
  }, [scriptData.scenes]);

  // Preload and manage Audio elements when audioUrls change
  useEffect(() => {
    scriptData.scenes.forEach((sc, idx) => {
      if (sc.audioUrl) {
        try {
          const a = new Audio(sc.audioUrl);
          a.crossOrigin = 'anonymous';
          a.preload = 'auto';
          sceneAudioElementsRef.current[idx] = a;
        } catch {}
      }
    });
  }, [scriptData.scenes]);

  // Synchronize audio playback when scene changes or player toggles
  useEffect(() => {
    // Stop any existing SpeechSynthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Stop all audio elements
    Object.values(sceneAudioElementsRef.current).forEach((a) => {
      try {
        a.pause();
      } catch {}
    });

    if (!isPlaying || !voiceEnabled) return;

    const currentScene = scriptData.scenes[activeSceneIndex];
    if (!currentScene) return;

    // Check if EverAI audio exists for current scene
    const audioEl = sceneAudioElementsRef.current[activeSceneIndex];
    if (audioEl && currentScene.audioUrl) {
      try {
        const sceneOffset = Math.max(0, playbackTime - activeSceneIndex * 10);
        audioEl.currentTime = sceneOffset;
        audioEl.play().catch(() => {});
      } catch {}
    } else {
      // Fallback: Browser Web Speech
      if (typeof window !== 'undefined' && window.speechSynthesis && currentScene.narration) {
        const utterance = new SpeechSynthesisUtterance(currentScene.narration);
        utterance.lang = 'vi-VN';
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [activeSceneIndex, isPlaying, voiceEnabled]);

  // Sound generator for gentle background ambient music
  const playSynthesizedAmbientChime = (timeSec: number) => {
    if (!musicEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      // Gentle chime every 5 seconds
      if (Math.floor(timeSec) % 5 === 0 && Math.abs(timeSec - Math.floor(timeSec)) < 0.05) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.035, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      }
    } catch {}
  };

  // Main Render Loop for Stitched 3-Scene Video
  const renderFrame = (timestamp: number) => {
    if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
    const delta = (timestamp - lastTimestampRef.current) / 1000;
    lastTimestampRef.current = timestamp;

    setPlaybackTime((prevTime) => {
      const newTime = prevTime + delta * motionSpeed;

      if (newTime >= 30) {
        // Finished 30-second video
        setIsPlaying(false);
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        Object.values(sceneAudioElementsRef.current).forEach((a) => {
          try {
            a.pause();
            a.currentTime = 0;
          } catch {}
        });
        if (isRecordingVideo && mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
        }
        return 30;
      }

      // Determine active scene: 0-10s -> Scene 0, 10-20s -> Scene 1, 20-30s -> Scene 2
      const sceneIdx = Math.min(2, Math.floor(newTime / 10));
      if (sceneIdx !== activeSceneIndex) {
        setActiveSceneIndex(sceneIdx);
      }

      playSynthesizedAmbientChime(newTime);

      // Draw onto canvas
      drawCanvasFrame(newTime, sceneIdx);

      return newTime;
    });

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    }
  };

  // Draw frame on canvas with Ken Burns Parallax + Atmospheric Motion + Kinetic Subtitles + Soundwaves
  const drawCanvasFrame = (currentTime: number, sceneIdx: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const scene = scriptData.scenes[sceneIdx];
    if (!scene) return;

    const sceneTime = currentTime % 10; // 0 to 10s within scene
    const progress = sceneTime / 10; // 0.0 to 1.0

    // Clear background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    const img = loadedImagesRef.current[sceneIdx];
    if (img && img.complete) {
      // 1. Dynamic Camera Motion & Organic 2.5D Parallax
      ctx.save();
      let scale = 1.0;
      let offsetX = 0;
      let offsetY = 0;

      // Smooth sine curve easing
      const ease = Math.sin(progress * Math.PI * 0.5);

      if (scene.cameraMotion === 'zoom-in') {
        scale = 1.05 + ease * 0.18; // smooth progressive zoom in
        offsetX = Math.sin(progress * Math.PI * 2) * 8;
        offsetY = Math.cos(progress * Math.PI * 2) * 5;
      } else if (scene.cameraMotion === 'pan-right') {
        scale = 1.15;
        offsetX = (progress - 0.5) * 50;
        offsetY = Math.sin(progress * Math.PI * 2) * 6;
      } else if (scene.cameraMotion === 'zoom-out') {
        scale = 1.22 - ease * 0.16; // smooth wide reveal
        offsetX = Math.cos(progress * Math.PI * 2) * 8;
        offsetY = Math.sin(progress * Math.PI * 2) * 4;
      } else {
        // pulse / breathing
        scale = 1.1 + Math.sin(progress * Math.PI * 4) * 0.04;
      }

      ctx.translate(width / 2 + offsetX, height / 2 + offsetY);
      ctx.scale(scale, scale);
      ctx.drawImage(img, -width / 2, -height / 2, width, height);
      ctx.restore();

      // 2. Dynamic Scene Transitions (Cross-dissolve at 9.2s -> 10s)
      if (sceneTime > 9.2 && sceneIdx < 2) {
        const nextImg = loadedImagesRef.current[sceneIdx + 1];
        if (nextImg && nextImg.complete) {
          const blend = (sceneTime - 9.2) / 0.8;
          ctx.save();
          ctx.globalAlpha = blend;
          ctx.drawImage(nextImg, 0, 0, width, height);

          // Flash bloom at transition cut
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.sin(blend * Math.PI) * 0.35})`;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }
      }
    } else {
      // Stylized gradient placeholder if image still loading
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#3b0764');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Đang nạp cảnh ${sceneIdx + 1}: ${scene.name}...`, width / 2, height / 2);
    }

    // 3. Dynamic Atmospheric Motion Particle System (Golden Embers & Stardust)
    if (showParticles && particlesRef.current.length > 0) {
      ctx.save();
      particlesRef.current.forEach((p) => {
        // Update physics
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        // Render glowing particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${p.alpha * 0.7})`;
        ctx.shadowColor = `hsl(${p.hue}, 90%, 60%)`;
        ctx.shadowBlur = 8;
        ctx.fill();
      });
      ctx.restore();
    }

    // 4. Sweeping Lens Flare Shimmer Beam (Every 6 seconds)
    const beamPhase = (currentTime % 6) / 6;
    if (beamPhase < 0.4) {
      const beamX = beamPhase * (width * 2.5) - width * 0.5;
      const beamGrad = ctx.createLinearGradient(beamX - 100, 0, beamX + 100, height);
      beamGrad.addColorStop(0, 'rgba(251, 191, 36, 0)');
      beamGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.15)');
      beamGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // 5. Cinematic Vignette & Bottom Shadow Overlay
    const gradVignette = ctx.createLinearGradient(0, height * 0.55, 0, height);
    gradVignette.addColorStop(0, 'rgba(0,0,0,0)');
    gradVignette.addColorStop(0.7, 'rgba(0,0,0,0.75)');
    gradVignette.addColorStop(1, 'rgba(0,0,0,0.92)');
    ctx.fillStyle = gradVignette;
    ctx.fillRect(0, height * 0.55, width, height * 0.45);

    // 6. Top Watermark Banner with Character & Voice Badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(16, 16, width - 32, 42, 10) : ctx.rect(16, 16, width - 32, 42);
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`🎬 MINH HIẾU OFFICIAL VN · CẢNH ${sceneIdx + 1}/3 (10s)`, 28, 42);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    const characterVoiceTag = `🎙️ ${scene.characterName} [${scene.voiceName.slice(0, 16)}...]`;
    ctx.fillText(characterVoiceTag, width - 90, 42);

    // Live Second Counter (e.g. 14:30s)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    const totalSecFormatted = `${Math.floor(currentTime).toString().padStart(2, '0')}:30s`;
    ctx.fillText(totalSecFormatted, width - 28, 42);

    // 7. Dynamic Audio Visualizer Wave (Animated frequency bars)
    if (showAudioWaveform && isPlaying) {
      const waveBarCount = 14;
      const barWidth = 4;
      const barGap = 3;
      const waveStartX = width / 2 - ((waveBarCount * (barWidth + barGap)) / 2);
      const waveY = height - 125;

      for (let i = 0; i < waveBarCount; i++) {
        const barHeight = Math.abs(Math.sin(currentTime * 12 + i * 0.7)) * 18 + 4;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(waveStartX + i * (barWidth + barGap), waveY - barHeight / 2, barWidth, barHeight);
      }
    }

    // 8. Dynamic Kinetic Karaoke Subtitles (TikTok / Shorts Animated Words)
    const subText = scene.subtitle || scene.narration;
    const words = subText.split(' ');
    const activeWordIndex = Math.min(words.length - 1, Math.floor(progress * words.length * 1.15));

    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';

    if (showDynamicSubtitles && words.length > 0) {
      // Render Karaoke Word-by-Word highlight
      const lineY = height - 75;
      const totalTextWidth = ctx.measureText(subText).width;

      if (totalTextWidth < width - 60) {
        // Fits on single line: render with active word pop
        let curX = (width - totalTextWidth) / 2;
        ctx.textAlign = 'left';

        words.forEach((w, wIdx) => {
          const wWidth = ctx.measureText(w + ' ').width;
          const isActiveWord = wIdx === activeWordIndex;

          ctx.save();
          if (isActiveWord) {
            ctx.fillStyle = '#facc15'; // Bright Gold
            ctx.shadowColor = '#eab308';
            ctx.shadowBlur = 12;
            ctx.font = 'bold 26px sans-serif';
          } else if (wIdx < activeWordIndex) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
          } else {
            ctx.fillStyle = '#94a3b8';
          }

          // Black stroke for maximum legibility
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#000000';
          ctx.strokeText(w, curX, lineY);
          ctx.fillText(w, curX, lineY);
          ctx.restore();

          curX += wWidth;
        });
      } else {
        // Wrapped fallback with golden glow
        ctx.textAlign = 'center';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#000000';
        ctx.strokeText(subText, width / 2, lineY);
        ctx.fillStyle = '#fde047';
        ctx.fillText(subText, width / 2, lineY);
      }
    } else {
      // Classic subtitle rendering
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(subText, width / 2, height - 75);
      ctx.fillStyle = '#fde047';
      ctx.fillText(subText, width / 2, height - 75);
    }

    // 9. Segment Progress Indicator at Bottom (3 scenes x 10s = 30s)
    const barHeight = 6;
    const barY = height - barHeight;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, barY, width, barHeight);

    // Filled progress
    const fillWidth = (currentTime / 30) * width;
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, barY, fillWidth, barHeight);

    // 10s & 20s scene divider lines
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(width / 3, barY - 4, 2, barHeight + 4);
    ctx.fillRect((width * 2) / 3, barY - 4, 2, barHeight + 4);
  };

  // Play/Pause handler
  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      Object.values(sceneAudioElementsRef.current).forEach((a) => {
        try {
          a.pause();
        } catch {}
      });
    } else {
      if (playbackTime >= 30) {
        setPlaybackTime(0);
      }
      lastTimestampRef.current = null;
      setIsPlaying(true);
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      onShowToast('▶️ Đang phát video động 30s (Ghép 3 cảnh x 10s)!');
    }
  };

  const handleRestart = () => {
    setIsPlaying(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    Object.values(sceneAudioElementsRef.current).forEach((a) => {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
    });
    setPlaybackTime(0);
    setActiveSceneIndex(0);
    drawCanvasFrame(0, 0);
  };

  const handleSeek = (targetTime: number) => {
    setPlaybackTime(targetTime);
    const sceneIdx = Math.min(2, Math.floor(targetTime / 10));
    setActiveSceneIndex(sceneIdx);
    drawCanvasFrame(targetTime, sceneIdx);

    // Sync audio if playing
    const audioEl = sceneAudioElementsRef.current[sceneIdx];
    if (audioEl) {
      try {
        audioEl.currentTime = targetTime % 10;
      } catch {}
    }
  };

  // Intelligent Client-Side Script Synthesizer when offline or backend unavailable
  const generateDynamicClientScript = (inputTopic: string): ScriptStory => {
    const isAncient = /xuyên không|cổ trang|triều đình|hoàng đế|cung đấu|tiên hiệp|kiếm hiệp/i.test(inputTopic);
    const isBuddhist = /phật|đạo lý|nhân quả|nhân sinh|thiền|chùa|tâm linh|nghiệp/i.test(inputTopic);
    const isFamily = /mẹ|cha|gia đình|con cái|hiếu|quê hương|bến đò/i.test(inputTopic);
    const isGhost = /ma|kinh dị|bí ẩn|rùng rợn|u hồn/i.test(inputTopic);

    let sc1: SceneItem;
    let sc2: SceneItem;
    let sc3: SceneItem;

    if (isAncient) {
      sc1 = {
        sceneNumber: 1,
        name: 'Mở Màn: Xuyên Không & Bối Cảnh Lạ Kỳ',
        duration: 10,
        timeRange: '00:00 - 00:10',
        characterName: 'Người dẫn chuyện',
        characterGender: 'Nam',
        voiceId: 'voice-74bb4b22-98a7-41a4',
        voiceName: 'Minh Hiếu - Đạo Lý & Review Phim',
        narration: `Tỉnh giấc giữa chốn hoàng cung xa lạ, nhân vật chính phát hiện mình mang theo trọn vẹn kho tàng tri thức hiện đại.`,
        subtitle: `Xuyên không bỡ ngỡ giữa triều đình cổ xưa`,
        visualPrompt: `Young protagonist in exquisite ancient royal silk attire opening eyes in antique palace, cinematic rim lighting, 8k wallpaper`,
        cameraMotion: 'zoom-in',
        motionPreset: 'cinematic-zoom',
        imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
      };
      sc2 = {
        sceneNumber: 2,
        name: 'Cao Trào: Trí Tuệ Đối Đầu Cường Quyền',
        duration: 10,
        timeRange: '00:10 - 00:20',
        characterName: 'Nhân vật Nữ',
        characterGender: 'Nữ',
        voiceId: 'vi_female_kieunhi_mn',
        voiceName: 'Kiều Nhi (Nữ Miền Nam)',
        narration: `Trước sự ép bức của gian thần, nàng khéo léo dùng mưu lược kinh tế và kỹ thuật hiện đại phá tan mọi âm mưu hiểm ác.`,
        subtitle: `Trí tuệ phá vỡ gông cùm gian trá`,
        visualPrompt: `Intense ancient confrontation chamber, flickering torches, dramatic cinematic suspense, photorealistic, 8k render`,
        cameraMotion: 'pan-right',
        motionPreset: 'pan-parallax',
        imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      };
      sc3 = {
        sceneNumber: 3,
        name: 'Kết Thúc: Chân Lý Lòng Dân Là Gốc',
        duration: 10,
        timeRange: '00:20 - 00:30',
        characterName: 'Minh Hiếu (Đạo lý)',
        characterGender: 'Nam',
        voiceId: 'voice-ab888766-b59f-402b',
        voiceName: 'Giảng Đạo Nhấn Nhá',
        narration: `Thiên hạ thái bình, bách tính no ấm. Quyền lực tối thượng không bằng một tấm lòng vì dân, vì nước.`,
        subtitle: `Lấy lòng dân làm gốc rễ thái bình`,
        visualPrompt: `Glorious ancient city under magnificent sunrise, peaceful atmosphere, vibrant historical Vietnam scenery, breathtaking`,
        cameraMotion: 'zoom-out',
        motionPreset: 'epic-sweep',
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80',
      };
    } else if (isBuddhist) {
      sc1 = {
        sceneNumber: 1,
        name: 'Mở Màn: Duyên Khởi & Soi Rọi Tâm Hồn',
        duration: 10,
        timeRange: '00:00 - 00:10',
        characterName: 'Minh Hiếu (Thuyết pháp)',
        characterGender: 'Nam',
        voiceId: 'voice-74bb4b22-98a7-41a4',
        voiceName: 'Minh Hiếu - Đạo Lý & Review Phim',
        narration: `Cuộc đời như dòng nước trôi vô tận, người buông bỏ được phiền muộn mới thấu hiểu ý nghĩa an nhiên thực sự.`,
        subtitle: `Tĩnh lặng soi rọi cõi lòng sâu thẳm`,
        visualPrompt: `Ancient serene Buddhist temple in misty bamboo forest, golden Buddha statue with gentle incense smoke, majestic peaceful lighting`,
        cameraMotion: 'zoom-in',
        motionPreset: 'cinematic-zoom',
        imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      };
      sc2 = {
        sceneNumber: 2,
        name: 'Cao Trào: Nghịch Cảnh & Thử Thách Lòng Người',
        duration: 10,
        timeRange: '00:10 - 00:20',
        characterName: 'Nhân vật chiêm nghiệm',
        characterGender: 'Nữ',
        voiceId: 'vi_female_kieunhi_mn',
        voiceName: 'Kiều Nhi (Nữ Miền Nam)',
        narration: `Bão giông ập đến là phép thử của ý chí. Giữ vẹn chữ tâm trong sáng chính là ngọn đèn soi sáng bước đường đi.`,
        subtitle: 'Giữ tâm bất biến giữa dòng đời vạn biến',
        visualPrompt: `Monk walking steadily through mountain stormy winds, holding warm lantern, epic cinematic spiritual depth`,
        cameraMotion: 'pan-right',
        motionPreset: 'pan-parallax',
        imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
      };
      sc3 = {
        sceneNumber: 3,
        name: 'Kết Thúc: Giác Ngộ Chân Lý & Tâm An Lạc',
        duration: 10,
        timeRange: '00:20 - 00:30',
        characterName: 'Giảng đạo Uy Nghiêm',
        characterGender: 'Nam',
        voiceId: 'voice-0e62b161-5866-4e85',
        voiceName: 'Giảng đạo Uy Nghiêm',
        narration: `Vạn sự tùy duyên, tâm an thì vạn sự an. Sống một đời thiện lương là phúc đức lớn nhất của kiếp nhân sinh.`,
        subtitle: 'Tâm an thì vạn sự đều an lành',
        visualPrompt: `Golden lotus blooming on tranquil lake, glowing Buddha aura, heavenly sunset sky, breathtaking spiritual art 8k`,
        cameraMotion: 'zoom-out',
        motionPreset: 'epic-sweep',
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80',
      };
    } else {
      // General Dramatic / Review Story
      sc1 = {
        sceneNumber: 1,
        name: 'Mở Màn: Điểm Xuất Phát & Bí Ẩn Đời Người',
        duration: 10,
        timeRange: '00:00 - 00:10',
        characterName: 'Người dẫn chuyện',
        characterGender: 'Nam',
        voiceId: 'voice-74bb4b22-98a7-41a4',
        voiceName: 'Minh Hiếu - Đạo Lý & Review Phim',
        narration: `Bước vào câu chuyện "${inputTopic}", nơi những ngã rẽ cuộc đời bất ngờ đẩy nhân vật vào tình thế nan giải nhất.`,
        subtitle: `Khởi đầu kịch tính: ${inputTopic.slice(0, 30)}...`,
        visualPrompt: `Cinematic wide angle storytelling ambiance about ${inputTopic}, atmospheric lighting, photorealistic masterpiece`,
        cameraMotion: 'zoom-in',
        motionPreset: 'cinematic-zoom',
        imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
      };
      sc2 = {
        sceneNumber: 2,
        name: 'Cao Trào: Đỉnh Điểm Đối Đầu & Bước Ngoặt',
        duration: 10,
        timeRange: '00:10 - 00:20',
        characterName: 'Nhân vật cao trào',
        characterGender: 'Nam',
        voiceId: 'voice-f9ae90f1-12e4-470d',
        voiceName: 'Nhân vật nam Kịch tính',
        narration: `Khi mọi hy vọng dường như vụt tắt, bản lĩnh không đầu hàng đã thắp lên ngọn lửa hy vọng lật ngược tình thế ngoạn mục.`,
        subtitle: 'Bản lĩnh kiên cường vượt qua nghịch cảnh',
        visualPrompt: `High contrast dramatic cinematic scene with intense shadows and lighting, ${inputTopic}, dynamic emotion 8k`,
        cameraMotion: 'pan-right',
        motionPreset: 'pan-parallax',
        imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      };
      sc3 = {
        sceneNumber: 3,
        name: 'Kết Thúc: Đúc Kết Bài Học & Chân Lý Sâu Sắc',
        duration: 10,
        timeRange: '00:20 - 00:30',
        characterName: 'Minh Hiếu (Đạo lý)',
        characterGender: 'Nam',
        voiceId: 'voice-ab888766-b59f-402b',
        voiceName: 'Giảng Đạo Nhấn Nhá',
        narration: `Thành công lớn nhất không phải là thắng người khác, mà là chiến thắng chính những nỗi sợ bên trong tâm trí mình.`,
        subtitle: 'Chiến thắng vĩ đại nhất là chiến thắng chính mình',
        visualPrompt: `Inspirational cinematic conclusion sunset landscape, ray of hope, peaceful profound mood, 8k resolution`,
        cameraMotion: 'zoom-out',
        motionPreset: 'epic-sweep',
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80',
      };
    }

    return {
      title: inputTopic,
      aspectRatio,
      totalDuration: 30,
      theme: storyStyle,
      scenes: [sc1, sc2, sc3],
    };
  };

  // Generate Script & 3 Scenes with Gemini AI or Smart Dynamic Engine
  const handleGenerateScript = async () => {
    if (!topic.trim()) {
      onShowToast('⚠️ Vui lòng nhập chủ đề video');
      return;
    }

    setIsGenerating(true);
    try {
      const apiBase = getApiBaseUrl();

      // If on static GitHub Pages without backend, synthesize dynamic script client-side
      if (!apiBase) {
        await new Promise((r) => setTimeout(r, 600));
        const synthesized = generateDynamicClientScript(topic);
        setScriptData(synthesized);
        handleRestart();
        onShowToast('✨ Đã tự động tạo 3 Cảnh & Lời thoại AI thành công!');
        triggerImageGeneration(synthesized.scenes);
        setIsGenerating(false);
        return;
      }

      const cleanBase = apiBase.replace(/\/+$/, '');
      const endpoint = cleanBase.endsWith('/api')
        ? `${cleanBase}/ai/generate-script-scenes`
        : `${cleanBase}/api/ai/generate-script-scenes`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          style: storyStyle,
          aspectRatio,
          defaultVoiceGender: 'Nam',
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data && data.scenes && data.scenes.length === 3) {
        const updatedScenes: SceneItem[] = data.scenes.map((sc: any, idx: number) => {
          let fallbackImg = scriptData.scenes[idx]?.imageUrl;
          if (idx === 0)
            fallbackImg =
              'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80';
          if (idx === 1)
            fallbackImg =
              'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80';
          if (idx === 2)
            fallbackImg =
              'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80';

          return {
            sceneNumber: sc.sceneNumber || idx + 1,
            name: sc.name || `Cảnh ${idx + 1}`,
            duration: 10,
            timeRange: sc.timeRange || `00:${idx * 10} - 00:${(idx + 1) * 10}`,
            characterName: sc.characterName || (idx === 1 ? 'Nhân vật Nữ' : 'Minh Hiếu'),
            characterGender: sc.characterGender || (idx === 1 ? 'Nữ' : 'Nam'),
            voiceId:
              sc.recommendedVoice?.includes('kieunhi')
                ? 'vi_female_kieunhi_mn'
                : sc.recommendedVoice?.includes('f9ae')
                ? 'voice-f9ae90f1-12e4-470d'
                : idx === 1
                ? 'vi_female_kieunhi_mn'
                : 'voice-74bb4b22-98a7-41a4',
            voiceName:
              idx === 1
                ? 'Kiều Nhi (Nữ Miền Nam)'
                : 'Minh Hiếu - Đạo Lý & Review Phim',
            narration: sc.narration || '',
            subtitle: sc.subtitle || '',
            visualPrompt: sc.visualPrompt || topic,
            cameraMotion: sc.cameraMotion || (idx === 0 ? 'zoom-in' : idx === 1 ? 'pan-right' : 'zoom-out'),
            motionPreset: sc.motionPreset || (idx === 0 ? 'cinematic-zoom' : idx === 1 ? 'pan-parallax' : 'epic-sweep'),
            imageUrl: fallbackImg,
          };
        });

        setScriptData({
          title: data.title || topic,
          aspectRatio,
          totalDuration: 30,
          theme: data.theme || storyStyle,
          scenes: updatedScenes,
        });

        handleRestart();
        onShowToast('✨ Đã viết kịch bản 3 Cảnh với lời thoại & giọng đọc nhân vật!');
        triggerImageGeneration(updatedScenes);
      }
    } catch (err: any) {
      console.warn('Script generation fallback:', err);
      const fallbackScript = generateDynamicClientScript(topic);
      setScriptData(fallbackScript);
      handleRestart();
      onShowToast('✨ Đã hoàn tất kịch bản 3 Cảnh sống động!');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate AI images for all 3 scenes
  const triggerImageGeneration = async (scenes: SceneItem[]) => {
    const apiBase = getApiBaseUrl();
    if (!apiBase) {
      // High quality dynamic Unsplash thematic images
      const thematicImgs = [
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80',
      ];
      setScriptData((prev) => {
        const updated = prev.scenes.map((sc, i) => ({
          ...sc,
          imageUrl: thematicImgs[i % thematicImgs.length],
        }));
        return { ...prev, scenes: updated };
      });
      return;
    }

    const cleanBase = apiBase.replace(/\/+$/, '');
    const endpoint = cleanBase.endsWith('/api')
      ? `${cleanBase}/ai/generate-image`
      : `${cleanBase}/api/ai/generate-image`;

    scenes.forEach(async (sc, idx) => {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: sc.visualPrompt || topic,
            aspectRatio,
          }),
        });
        if (res.ok) {
          const imgData = await res.json();
          if (imgData.imageUrl) {
            setScriptData((prev) => {
              const updated = [...prev.scenes];
              updated[idx] = { ...updated[idx], imageUrl: imgData.imageUrl };
              return { ...prev, scenes: updated };
            });
          }
        }
      } catch {}
    });
  };

  // Regenerate single image for a specific scene
  const handleRegenerateSceneImage = async (sceneIndex: number) => {
    const targetScene = scriptData.scenes[sceneIndex];
    onShowToast(`🎨 Đang tạo ảnh cho Cảnh ${sceneIndex + 1}...`);
    try {
      const apiBase = getApiBaseUrl();
      if (!apiBase) {
        const thematicImgs = [
          'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1511497584788-87676104235f?w=800&auto=format&fit=crop&q=80',
        ];
        const nextImg = thematicImgs[(sceneIndex + Date.now()) % thematicImgs.length];
        setScriptData((prev) => {
          const updated = [...prev.scenes];
          updated[sceneIndex] = { ...updated[sceneIndex], imageUrl: nextImg };
          return { ...prev, scenes: updated };
        });
        onShowToast(`✅ Đã cập nhật ảnh đẹp cho Cảnh ${sceneIndex + 1}!`);
        return;
      }

      const cleanBase = apiBase.replace(/\/+$/, '');
      const endpoint = cleanBase.endsWith('/api')
        ? `${cleanBase}/ai/generate-image`
        : `${cleanBase}/api/ai/generate-image`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: targetScene.visualPrompt || topic,
          aspectRatio,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) {
          setScriptData((prev) => {
            const updated = [...prev.scenes];
            updated[sceneIndex] = { ...updated[sceneIndex], imageUrl: data.imageUrl };
            return { ...prev, scenes: updated };
          });
          onShowToast(`✅ Đã cập nhật ảnh Cảnh ${sceneIndex + 1}!`);
        }
      }
    } catch {
      onShowToast(`⚠️ Không thể tạo ảnh mới cho Cảnh ${sceneIndex + 1}`);
    }
  };

  // Generate EverAI Voice for a single scene
  const handleGenerateSceneVoice = async (sceneIndex: number) => {
    const scene = scriptData.scenes[sceneIndex];
    if (!scene || !scene.narration) return;

    onShowToast(`🎙️ Đang kết nối EverAI tạo giọng đọc cho Cảnh ${sceneIndex + 1}...`);
    setScriptData((prev) => {
      const updated = [...prev.scenes];
      updated[sceneIndex] = { ...updated[sceneIndex], isGeneratingAudio: true, audioProgress: 15 };
      return { ...prev, scenes: updated };
    });

    try {
      const job = await createEverAiTtsJob({
        inputText: scene.narration,
        voiceCode: scene.voiceId,
        modelId: 'everai-v1.6',
        audioType: 'mp3',
        speedRate: 1.0,
      });

      let completed = false;
      let attempts = 0;
      while (!completed && attempts < 25) {
        attempts++;
        await new Promise((r) => setTimeout(r, 2000));
        const status = await pollEverAiTtsJob(job.requestId);

        setScriptData((prev) => {
          const updated = [...prev.scenes];
          updated[sceneIndex] = {
            ...updated[sceneIndex],
            audioProgress: Math.min(95, status.progress || attempts * 10),
          };
          return { ...prev, scenes: updated };
        });

        if (status.isDone && status.audioLink) {
          completed = true;
          setScriptData((prev) => {
            const updated = [...prev.scenes];
            updated[sceneIndex] = {
              ...updated[sceneIndex],
              audioUrl: status.audioLink,
              isGeneratingAudio: false,
              audioProgress: 100,
            };
            return { ...prev, scenes: updated };
          });
          onShowToast(`🎉 Đã tạo thành công giọng đọc EverAI cho Cảnh ${sceneIndex + 1}!`);
          break;
        }
      }
    } catch (err: any) {
      console.warn('EverAI voice generation error:', err);
      setScriptData((prev) => {
        const updated = [...prev.scenes];
        updated[sceneIndex] = { ...updated[sceneIndex], isGeneratingAudio: false };
        return { ...prev, scenes: updated };
      });
      onShowToast(
        err.message?.includes('405')
          ? '⚠️ EverAI yêu cầu Backend Proxy hoặc dùng Giọng Đọc Trình Duyệt Web Speech.'
          : `⚠️ Lỗi tạo giọng EverAI: ${err.message || 'Không thể tạo âm thanh'}`
      );
    }
  };

  // Generate EverAI Voice for ALL 3 Scenes
  const handleGenerateAllVoices = async () => {
    setIsGeneratingAllAudio(true);
    onShowToast('🎙️ Bắt đầu tạo giọng đọc EverAI cho cả 3 cảnh (30s)...');

    for (let i = 0; i < scriptData.scenes.length; i++) {
      await handleGenerateSceneVoice(i);
    }

    setIsGeneratingAllAudio(false);
    onShowToast('✨ Đã hoàn tất đồng bộ giọng đọc EverAI cho cả 3 cảnh!');
  };

  // Preview voice sample
  const handlePreviewVoice = (v: EverAiVoice) => {
    setPreviewingVoiceId(v.id);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const text = `Xin chào! Đây là giọng đọc ${v.name}, chuyên lồng tiếng video ngắn tại Minh Hiếu Official VN.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.onend = () => setPreviewingVoiceId(null);
      utterance.onerror = () => setPreviewingVoiceId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setPreviewingVoiceId(null), 2000);
    }
  };

  // Apply Quick Voice Preset Archetypes
  const handleApplyVoicePreset = (preset: 'minhhieu' | 'dialogue-mn-mb' | 'kieunhi' | 'dramatic-male') => {
    setScriptData((prev) => {
      const updated = [...prev.scenes];
      if (preset === 'minhhieu') {
        updated[0].voiceId = 'voice-74bb4b22-98a7-41a4';
        updated[0].voiceName = 'Minh Hiếu - Đạo Lý & Review Phim';
        updated[0].characterName = 'Minh Hiếu';
        updated[0].characterGender = 'Nam';

        updated[1].voiceId = 'voice-74bb4b22-98a7-41a4';
        updated[1].voiceName = 'Minh Hiếu - Đạo Lý & Review Phim';
        updated[1].characterName = 'Minh Hiếu';
        updated[1].characterGender = 'Nam';

        updated[2].voiceId = 'voice-ab888766-b59f-402b';
        updated[2].voiceName = 'Giảng Đạo Nhấn Nhá';
        updated[2].characterName = 'Minh Hiếu (Đạo lý)';
        updated[2].characterGender = 'Nam';
      } else if (preset === 'dialogue-mn-mb') {
        // Multi-role dialogue: Cảnh 1 Nam dẫn chuyện, Cảnh 2 Nữ chính, Cảnh 3 Nam đạo lý
        updated[0].voiceId = 'voice-74bb4b22-98a7-41a4';
        updated[0].voiceName = 'Minh Hiếu - Đạo Lý & Review Phim';
        updated[0].characterName = 'Người dẫn chuyện (Nam)';
        updated[0].characterGender = 'Nam';

        updated[1].voiceId = 'vi_female_kieunhi_mn';
        updated[1].voiceName = 'Kiều Nhi (Nữ Miền Nam)';
        updated[1].characterName = 'Nữ nhân vật chính';
        updated[1].characterGender = 'Nữ';

        updated[2].voiceId = 'vi_male_lehoang_mb';
        updated[2].voiceName = 'Lê Hoàng (Nam Miền Bắc)';
        updated[2].characterName = 'Đúc kết đạo lý';
        updated[2].characterGender = 'Nam';
      } else if (preset === 'kieunhi') {
        updated[0].voiceId = 'vi_female_kieunhi_mn';
        updated[0].voiceName = 'Kiều Nhi (Nữ Miền Nam)';
        updated[0].characterName = 'Kiều Nhi';
        updated[0].characterGender = 'Nữ';

        updated[1].voiceId = 'vi_female_kieunhi_mn';
        updated[1].voiceName = 'Kiều Nhi (Nữ Miền Nam)';
        updated[1].characterName = 'Kiều Nhi';
        updated[1].characterGender = 'Nữ';

        updated[2].voiceId = 'vi_female_kieunhi_mn';
        updated[2].voiceName = 'Kiều Nhi (Nữ Miền Nam)';
        updated[2].characterName = 'Kiều Nhi';
        updated[2].characterGender = 'Nữ';
      } else if (preset === 'dramatic-male') {
        updated[0].voiceId = 'voice-f9ae90f1-12e4-470d';
        updated[0].voiceName = 'Nhân vật nam Kịch tính';
        updated[0].characterName = 'Nam kịch tính';
        updated[0].characterGender = 'Nam';

        updated[1].voiceId = 'voice-f9ae90f1-12e4-470d';
        updated[1].voiceName = 'Nhân vật nam Kịch tính';
        updated[1].characterName = 'Nam kịch tính';
        updated[1].characterGender = 'Nam';

        updated[2].voiceId = 'voice-ab888766-b59f-402b';
        updated[2].voiceName = 'Giảng Đạo Nhấn Nhá';
        updated[2].characterName = 'Đạo lý kết';
        updated[2].characterGender = 'Nam';
      }
      return { ...prev, scenes: updated };
    });
    onShowToast(`✅ Đã áp dụng mẫu giọng lồng tiếng đa vai!`);
  };

  // Export & Record Stitched 30s Dynamic Video to WebM file with Audio
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (typeof (canvas as any).captureStream !== 'function') {
      onShowToast('❌ Trình duyệt không hỗ trợ quay canvas trực tiếp.');
      return;
    }

    try {
      const canvasStream = (canvas as any).captureStream(30);

      // Create AudioContext and MediaStreamDestination to combine audio
      let combinedStream: MediaStream = canvasStream;
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const audioCtx = audioContextRef.current;
        const dest = audioCtx.createMediaStreamDestination();

        // Connect ambient chime to destination
        const tracks = [...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()];
        combinedStream = new MediaStream(tracks);
      } catch (e) {
        console.warn('Audio capture stream fallback:', e);
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const mediaRecorder = new MediaRecorder(combinedStream, { mimeType });

      recordedChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        setIsRecordingVideo(false);
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-dong-30s-${aspectRatio.replace(':', '-')}-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        onShowToast('🎉 Đã xuất và tải video động 30s thành công!');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecordingVideo(true);

      // Start playing from beginning
      handleRestart();
      setIsPlaying(true);
      animationFrameRef.current = requestAnimationFrame(renderFrame);

      onShowToast('🔴 Đang ghi hình video động 30s (hiệu ứng chuyển cảnh & phụ đề karaoke)...');
    } catch (err: any) {
      console.error('Export video error:', err);
      onShowToast('❌ Lỗi khi xuất video: ' + err.message);
    }
  };

  // Canvas size depending on aspect ratio
  const canvasWidth = aspectRatio === '9:16' ? 450 : 720;
  const canvasHeight = aspectRatio === '9:16' ? 800 : 405;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Clapperboard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  AI Video Studio 30s (Video Động + Lồng Tiếng EverAI Đa Vai)
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Chuẩn 9:16 &amp; 16:9
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Video Động Parallax &amp; Hạt Bụi Điện Ảnh
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Tự động viết kịch bản 3 cảnh x 10s theo cốt truyện của bạn, kết nối kho giọng đọc <strong>EverAI (Nam / Nữ / Minh Hiếu)</strong> cho từng nhân vật, tạo hiệu ứng chuyển động camera 2.5D, phụ đề động nhảy chữ TikTok và xuất video 30s mượt mà.
              </p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap text-xs">
            <button
              onClick={() => setIsVoiceSettingsOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold border border-amber-500/30 flex items-center gap-2 transition-all shadow-md"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>Cài Đặt Giọng EverAI &amp; Nhân Vật</span>
            </button>
            <button
              onClick={handleGenerateAllVoices}
              disabled={isGeneratingAllAudio}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
            >
              {isGeneratingAllAudio ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang tạo giọng 3 cảnh...</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Tạo Giọng EverAI Cả 3 Cảnh</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preset Topics Bar */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-4 border-t border-slate-800/80 mt-4">
          <span className="text-slate-400">Gợi ý chủ đề nhanh:</span>
          <button
            onClick={() =>
              setTopic('Xuyên không về cổ đại làm CEO, dùng KPI và trí tuệ quản lý triều đình')
            }
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            👑 Xuyên không CEO
          </button>
          <button
            onClick={() =>
              setTopic('Đức Phật dạy về đạo làm con, sự hiếu kính và nhân quả kiếp luân hồi')
            }
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            🪷 Đạo lý Phật giáo
          </button>
          <button
            onClick={() =>
              setTopic('Báo thù gia tộc: Nữ chủ tịch giả nghèo về quê và cú twist vạch trần kẻ ác')
            }
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            🔥 Kịch tính báo thù
          </button>
          <button
            onClick={() =>
              setTopic('Miền Tây sông nước mùa nước nổi và tình mẹ bao la bên bến đò xưa')
            }
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            🌾 Miền Tây sông nước
          </button>
        </div>
      </div>

      {/* Generator Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Chủ đề kịch bản (AI sẽ tự động viết các cảnh &amp; lời thoại chân thực):
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Nhập chủ đề video (xuyên không, đạo lý, review phim, tình cảm, hài hước, kinh dị)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Tỉ lệ khung hình:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAspectRatio('9:16')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  aspectRatio === '9:16'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                9:16 (Shorts/TikTok)
              </button>
              <button
                onClick={() => setAspectRatio('16:9')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  aspectRatio === '16:9'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                16:9 (YouTube)
              </button>
            </div>
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <button
              onClick={handleGenerateScript}
              disabled={isGenerating}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang viết kịch bản AI &amp; lời thoại...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Tự Động Tạo Kịch Bản 3 Cảnh (30s)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Motion & Video Visual Toggles Bar */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Tùy biến video động:
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
              <input
                type="checkbox"
                checked={showParticles}
                onChange={(e) => setShowParticles(e.target.checked)}
                className="accent-amber-500"
              />
              <span>Hạt bụi vàng điện ảnh</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
              <input
                type="checkbox"
                checked={showDynamicSubtitles}
                onChange={(e) => setShowDynamicSubtitles(e.target.checked)}
                className="accent-amber-500"
              />
              <span>Phụ đề động karaoke nhảy chữ</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
              <input
                type="checkbox"
                checked={showAudioWaveform}
                onChange={(e) => setShowAudioWaveform(e.target.checked)}
                className="accent-amber-500"
              />
              <span>Sóng âm thanh khi nói</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span>Tốc độ chuyển động:</span>
            <select
              value={motionSpeed}
              onChange={(e) => setMotionSpeed(parseFloat(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 focus:outline-none text-[11px]"
            >
              <option value="0.75">0.75x (Chậm &amp; Thơ mộng)</option>
              <option value="1.0">1.0x (Chuẩn điện ảnh)</option>
              <option value="1.25">1.25x (Kịch tính dồn dập)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Studio Display: Video Canvas Player (Left) & 3 Scenes Storyboard (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Canvas Player */}
        <div className={aspectRatio === '9:16' ? 'lg:col-span-5' : 'lg:col-span-7'}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold flex items-center gap-1.5 text-amber-400">
                <Video className="w-4 h-4" />
                Trình Phát Video Động 30s ({aspectRatio})
              </span>
              <span className="font-mono text-slate-400 font-bold">
                {Math.floor(playbackTime).toString().padStart(2, '0')}:30s (Cảnh {activeSceneIndex + 1}/3)
              </span>
            </div>

            {/* Video Canvas Container */}
            <div className="relative flex justify-center items-center bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="max-h-[560px] w-auto object-contain cursor-pointer"
                onClick={handleTogglePlay}
              />

              {/* Play Overlay if paused */}
              {!isPlaying && (
                <button
                  onClick={handleTogglePlay}
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                >
                  <Play className="w-8 h-8 fill-current ml-1" />
                </button>
              )}
            </div>

            {/* Timeline Scrubber & Markers */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span
                  className={activeSceneIndex === 0 ? 'text-amber-400 font-bold' : 'hover:text-white'}
                  onClick={() => handleSeek(0)}
                  role="button"
                >
                  Cảnh 1 (0s-10s)
                </span>
                <span
                  className={activeSceneIndex === 1 ? 'text-amber-400 font-bold' : 'hover:text-white'}
                  onClick={() => handleSeek(10)}
                  role="button"
                >
                  Cảnh 2 (10s-20s)
                </span>
                <span
                  className={activeSceneIndex === 2 ? 'text-amber-400 font-bold' : 'hover:text-white'}
                  onClick={() => handleSeek(20)}
                  role="button"
                >
                  Cảnh 3 (20s-30s)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="0.1"
                value={playbackTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Player Controls Bar */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTogglePlay}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Tạm dừng</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Phát video 30s</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleRestart}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                  title="Phát lại từ đầu"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={voiceEnabled}
                    onChange={(e) => setVoiceEnabled(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span>Giọng nói</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={musicEnabled}
                    onChange={(e) => setMusicEnabled(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span>Nhạc nền</span>
                </label>
              </div>

              {/* Export Video Button */}
              <button
                onClick={handleExportVideo}
                disabled={isRecordingVideo}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-600/20"
              >
                {isRecordingVideo ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang ghi hình...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Xuất Video (.webm)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: 3 Scenes Breakdown */}
        <div className={`${aspectRatio === '9:16' ? 'lg:col-span-7' : 'lg:col-span-5'} space-y-4`}>
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Chi Tiết 3 Phân Cảnh &amp; Giọng Lồng Tiếng EverAI
            </h3>
            <span className="text-xs text-slate-400">3 Cảnh x 10 Giây = 30s Ghép Lại</span>
          </div>

          <div className="space-y-4">
            {scriptData.scenes.map((scene, idx) => {
              const isActive = activeSceneIndex === idx;
              const isEditing = editingSceneIdx === idx;

              return (
                <div
                  key={scene.sceneNumber}
                  className={`border rounded-2xl p-4 transition-all ${
                    isActive
                      ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-500/5'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Scene Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center">
                        {scene.sceneNumber}
                      </span>
                      <h4 className="text-xs font-bold text-white">{scene.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-semibold border border-slate-700 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {scene.characterName} ({scene.characterGender})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
                        {scene.timeRange} (10s)
                      </span>
                      <button
                        onClick={() => setEditingSceneIdx(isEditing ? null : idx)}
                        className="p-1 text-slate-400 hover:text-white rounded"
                        title="Chỉnh sửa nội dung cảnh này"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Scene Content Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {/* Scene Thumbnail & Image Generator */}
                    <div className="sm:col-span-1 space-y-2">
                      <div className="aspect-[9/16] sm:aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative group">
                        <img
                          src={scene.imageUrl}
                          alt={scene.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleRegenerateSceneImage(idx)}
                          className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-slate-950/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Tạo lại ảnh minh họa AI cho cảnh này"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleRegenerateSceneImage(idx)}
                        className="w-full py-1 text-[10px] text-slate-400 hover:text-amber-400 transition-colors flex items-center justify-center gap-1"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Đổi ảnh AI</span>
                      </button>
                    </div>

                    {/* Scene Narration & Voice Controls */}
                    <div className="sm:col-span-3 space-y-2 text-xs">
                      {isEditing ? (
                        <div className="space-y-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                          <div>
                            <label className="text-[10px] text-slate-400">Lời thoại lồng tiếng (khoảng 25 từ = 10s):</label>
                            <textarea
                              value={scene.narration}
                              onChange={(e) => {
                                const val = e.target.value;
                                setScriptData((prev) => {
                                  const updated = [...prev.scenes];
                                  updated[idx].narration = val;
                                  return { ...prev, scenes: updated };
                                });
                              }}
                              rows={2}
                              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400">Phụ đề trên video:</label>
                            <input
                              type="text"
                              value={scene.subtitle}
                              onChange={(e) => {
                                const val = e.target.value;
                                setScriptData((prev) => {
                                  const updated = [...prev.scenes];
                                  updated[idx].subtitle = val;
                                  return { ...prev, scenes: updated };
                                });
                              }}
                              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => setEditingSceneIdx(null)}
                              className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded text-[11px]"
                            >
                              Lưu thay đổi
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Lời thoại lồng tiếng (Voiceover 10s):</span>
                            <span className="text-[10px] text-amber-400/90 font-mono">
                              {scene.narration.split(' ').filter(Boolean).length} từ
                            </span>
                          </div>
                          <p className="text-slate-200 mt-0.5 leading-relaxed bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                            "{scene.narration}"
                          </p>
                        </div>
                      )}

                      {/* Voice Selection & Status Badge */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/30 p-2 rounded-xl border border-slate-800/60">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Mic className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-slate-300 font-medium">Giọng:</span>
                          <select
                            value={scene.voiceId}
                            onChange={(e) => {
                              const newVoiceId = e.target.value;
                              const found = availableVoices.find((v) => v.id === newVoiceId);
                              setScriptData((prev) => {
                                const updated = [...prev.scenes];
                                updated[idx].voiceId = newVoiceId;
                                if (found) {
                                  updated[idx].voiceName = found.name;
                                  updated[idx].characterGender = found.gender === 'Nữ' || found.gender === 'Female' ? 'Nữ' : 'Nam';
                                }
                                return { ...prev, scenes: updated };
                              });
                            }}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-amber-300 font-semibold focus:outline-none"
                          >
                            {availableVoices.map((v) => (
                              <option key={v.id} value={v.id}>
                                [{v.gender === 'Nữ' || v.gender === 'Female' ? 'Nữ' : 'Nam'}] {v.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {scene.audioUrl ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Đã có audio EverAI
                          </span>
                        ) : scene.isGeneratingAudio ? (
                          <span className="text-amber-400 font-mono animate-pulse flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Đang tạo ({scene.audioProgress || 10}%)
                          </span>
                        ) : (
                          <button
                            onClick={() => handleGenerateSceneVoice(idx)}
                            className="text-indigo-400 hover:text-indigo-300 underline font-medium"
                          >
                            Tạo giọng EverAI
                          </button>
                        )}
                      </div>

                      {/* Scene Action Buttons */}
                      <div className="pt-1 flex items-center justify-between text-[11px]">
                        <button
                          onClick={() => handleSeek(idx * 10)}
                          className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Play className="w-3 h-3" />
                          <span>Xem trước Cảnh {idx + 1} (10s)</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (scene.audioUrl) {
                                const a = new Audio(scene.audioUrl);
                                a.play();
                              } else if (typeof window !== 'undefined' && window.speechSynthesis) {
                                window.speechSynthesis.cancel();
                                const u = new SpeechSynthesisUtterance(scene.narration);
                                u.lang = 'vi-VN';
                                window.speechSynthesis.speak(u);
                              }
                            }}
                            className="text-slate-400 hover:text-white flex items-center gap-1"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>Nghe thử</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Voice Settings Modal: Cài đặt giọng lồng tiếng EverAI & Nhân vật */}
      {isVoiceSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Cài Đặt Giọng Lồng Tiếng EverAI &amp; Nhân Vật
                  </h3>
                  <p className="text-xs text-slate-400">
                    Phân vai và chọn giọng lồng tiếng Nam, Nữ, Minh Hiếu cho video 30s
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVoiceSettingsOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Quick Archetype Preset Buttons */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">
                  Mẫu phân vai giọng lồng tiếng nhanh:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  <button
                    onClick={() => handleApplyVoicePreset('minhhieu')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition-all group"
                  >
                    <span className="text-xs font-bold text-amber-400 group-hover:text-amber-300">
                      🎙️ Giọng Minh Hiếu
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Đạo lý, review phim &amp; dẫn chuyện xuyên suốt
                    </p>
                  </button>

                  <button
                    onClick={() => handleApplyVoicePreset('dialogue-mn-mb')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition-all group"
                  >
                    <span className="text-xs font-bold text-sky-400 group-hover:text-sky-300">
                      🎭 Đa vai Nam - Nữ
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Cảnh 1 Nam dẫn, Cảnh 2 Nữ chính, Cảnh 3 Nam kết
                    </p>
                  </button>

                  <button
                    onClick={() => handleApplyVoicePreset('kieunhi')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition-all group"
                  >
                    <span className="text-xs font-bold text-pink-400 group-hover:text-pink-300">
                      🌸 Nữ Kiều Nhi
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Giọng nữ Miền Nam ngọt ngào, dịu dàng, truyền cảm
                    </p>
                  </button>

                  <button
                    onClick={() => handleApplyVoicePreset('dramatic-male')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition-all group"
                  >
                    <span className="text-xs font-bold text-red-400 group-hover:text-red-300">
                      ⚡ Kịch tính Hào hùng
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Giọng nam trầm, giật gân, cuốn hút cho review kịch tính
                    </p>
                  </button>
                </div>
              </div>

              {/* Configure Per-Scene Character and Voice */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Phân công giọng cho từng cảnh (Cảnh 1, Cảnh 2, Cảnh 3):</span>
                  <span className="text-slate-400 font-normal">Mỗi cảnh dài 10 giây</span>
                </label>

                <div className="space-y-3">
                  {scriptData.scenes.map((sc, idx) => (
                    <div
                      key={sc.sceneNumber}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                          {sc.sceneNumber}
                        </span>
                        <div>
                          <span className="font-bold text-white">Cảnh {sc.sceneNumber}: {sc.name}</span>
                          <div className="text-[11px] text-slate-400">
                            Nhân vật: <strong>{sc.characterName}</strong> ({sc.characterGender})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select
                          value={sc.voiceId}
                          onChange={(e) => {
                            const newId = e.target.value;
                            const found = availableVoices.find((v) => v.id === newId);
                            setScriptData((prev) => {
                              const updated = [...prev.scenes];
                              updated[idx].voiceId = newId;
                              if (found) {
                                updated[idx].voiceName = found.name;
                                updated[idx].characterGender =
                                  found.gender === 'Nữ' || found.gender === 'Female' ? 'Nữ' : 'Nam';
                              }
                              return { ...prev, scenes: updated };
                            });
                          }}
                          className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-semibold focus:outline-none flex-1 sm:w-60"
                        >
                          {availableVoices.map((v) => (
                            <option key={v.id} value={v.id}>
                              [{v.gender === 'Nữ' || v.gender === 'Female' ? 'Nữ' : 'Nam'}] {v.name}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => {
                            const v = availableVoices.find((item) => item.id === sc.voiceId);
                            if (v) handlePreviewVoice(v);
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors font-medium"
                        >
                          Nghe thử
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Voice Filter & Library Reference */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    Thư viện giọng đọc EverAI ({availableVoices.length} giọng):
                  </label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      onClick={() => setGenderFilter('All')}
                      className={`px-2 py-0.5 rounded-md ${
                        genderFilter === 'All'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Tất cả
                    </button>
                    <button
                      onClick={() => setGenderFilter('Nam')}
                      className={`px-2 py-0.5 rounded-md ${
                        genderFilter === 'Nam'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Giọng Nam
                    </button>
                    <button
                      onClick={() => setGenderFilter('Nữ')}
                      className={`px-2 py-0.5 rounded-md ${
                        genderFilter === 'Nữ'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Giọng Nữ
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-950 rounded-2xl border border-slate-800">
                  {availableVoices
                    .filter((v) => {
                      if (genderFilter === 'All') return true;
                      if (genderFilter === 'Nam') return v.gender === 'Nam' || v.gender === 'Male';
                      if (genderFilter === 'Nữ') return v.gender === 'Nữ' || v.gender === 'Female';
                      return true;
                    })
                    .map((v) => (
                      <div
                        key={v.id}
                        className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded ${
                                v.gender === 'Nữ' || v.gender === 'Female'
                                  ? 'bg-pink-500/20 text-pink-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}
                            >
                              {v.gender === 'Nữ' || v.gender === 'Female' ? 'Nữ' : 'Nam'}
                            </span>
                            <span>{v.name}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{v.region}</p>
                        </div>

                        <button
                          onClick={() => handlePreviewVoice(v)}
                          disabled={previewingVoiceId === v.id}
                          className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Nghe thử giọng mẫu"
                        >
                          {previewingVoiceId === v.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <button
                onClick={() => {
                  handleGenerateAllVoices();
                  setIsVoiceSettingsOpen(false);
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                <span>Áp Dụng &amp; Tạo Giọng EverAI Cả 3 Cảnh</span>
              </button>

              <button
                onClick={() => setIsVoiceSettingsOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
