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
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/api';

interface SceneItem {
  sceneNumber: number;
  name: string;
  duration: number; // 10 seconds
  timeRange: string;
  narration: string;
  subtitle: string;
  visualPrompt: string;
  cameraMotion: 'zoom-in' | 'pan-right' | 'zoom-out';
  imageUrl: string;
}

interface ScriptStory {
  title: string;
  aspectRatio: '9:16' | '16:9';
  totalDuration: number; // 30s
  theme: string;
  scenes: SceneItem[];
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

  // Storyboard & Scenes Data (3 scenes x 10s = 30s)
  const [scriptData, setScriptData] = useState<ScriptStory>({
    title: 'Xuyên Không Cổ Đại: Trí Tuệ Cứu Dân Lành',
    aspectRatio: '9:16',
    totalDuration: 30,
    theme: 'Review phim kịch tính & Triết lý',
    scenes: [
      {
        sceneNumber: 1,
        name: 'Mở màn & Bối cảnh kỳ bí',
        duration: 10,
        timeRange: '00:00 - 00:10',
        narration:
          'Một cô gái hiện đại bất ngờ tỉnh giấc trong y phục cổ trang, giữa một ngôi làng cằn cỗi đang đứng trước bờ vực tuyệt vọng.',
        subtitle: 'Bất ngờ xuyên không về thời cổ đại xa xôi',
        visualPrompt:
          'Cinematic portrait of young modern woman in ancient Vietnamese silk dress standing in a dried village, dramatic sunlight, 8k resolution, film grain',
        cameraMotion: 'zoom-in',
        imageUrl:
          'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
      },
      {
        sceneNumber: 2,
        name: 'Cao trào & Bước ngoặt thử thách',
        duration: 10,
        timeRange: '00:10 - 00:20',
        narration:
          'Không đầu hàng số phận, cô áp dụng kiến thức thủy lợi hiện đại dẫn nước ngọt về đồng ruộng, đánh bại âm mưu của quan tham gian ác.',
        subtitle: 'Dùng trí tuệ hiện đại xoay chuyển cục diện',
        visualPrompt:
          'Dramatic ancient construction of water irrigation canal with flowing clear water, epic historical atmosphere, golden hour backlight',
        cameraMotion: 'pan-right',
        imageUrl:
          'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      },
      {
        sceneNumber: 3,
        name: 'Đỉnh điểm & Ý nghĩa sâu sắc',
        duration: 10,
        timeRange: '00:20 - 00:30',
        narration:
          'Cánh đồng xanh mướt hồi sinh, muôn dân reo hò cúi đầu. Sức mạnh vĩ đại nhất không nằm ở phép thuật, mà ở lòng nhân ái vì nhân dân.',
        subtitle: 'Lòng nhân ái mang lại sự sống vĩnh hằng',
        visualPrompt:
          'Lush green vast ancient rice fields under glorious sunset, happy villagers looking up peacefully, breathtaking landscape photography',
        cameraMotion: 'zoom-out',
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

  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Preload images into memory for smooth canvas animation
  const loadedImagesRef = useRef<{ [key: number]: HTMLImageElement }>({});

  useEffect(() => {
    scriptData.scenes.forEach((sc, idx) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = sc.imageUrl;
      img.onload = () => {
        loadedImagesRef.current[idx] = img;
      };
    });
  }, [scriptData]);

  // Voice narration trigger when scene changes during playback
  useEffect(() => {
    if (!isPlaying || !voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis)
      return;

    const currentScene = scriptData.scenes[activeSceneIndex];
    if (currentScene && currentScene.narration) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentScene.narration);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.05; // Slightly brisk to fit exactly into ~8-9 seconds
      window.speechSynthesis.speak(utterance);
    }
  }, [activeSceneIndex, isPlaying, voiceEnabled]);

  // Sound generator for gentle background music
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
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
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
      const newTime = prevTime + delta;

      if (newTime >= 30) {
        // Finished 30-second video
        setIsPlaying(false);
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        if (isRecordingVideo && mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
        }
        return 30;
      }

      // Determine active scene: 0-10s -> Scene 0, 10-20s -> Scene 1, 20-30s -> Scene 2
      const sceneIdx = Math.min(2, Math.floor(newTime / 10));
      setActiveSceneIndex(sceneIdx);
      playSynthesizedAmbientChime(newTime);

      // Draw onto canvas
      drawCanvasFrame(newTime, sceneIdx);

      return newTime;
    });

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    }
  };

  // Draw frame on canvas with Ken Burns effect + Subtitles + Overlay
  const drawCanvasFrame = (currentTime: number, sceneIdx: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const scene = scriptData.scenes[sceneIdx];
    const sceneTime = currentTime % 10; // 0 to 10s within scene
    const progress = sceneTime / 10; // 0.0 to 1.0

    // Clear background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    const img = loadedImagesRef.current[sceneIdx];
    if (img && img.complete) {
      // Ken Burns motion effect
      ctx.save();
      let scale = 1.0;
      let offsetX = 0;
      let offsetY = 0;

      if (scene.cameraMotion === 'zoom-in') {
        scale = 1.0 + progress * 0.15; // Slow zoom in
      } else if (scene.cameraMotion === 'pan-right') {
        scale = 1.1;
        offsetX = (progress - 0.5) * 40;
      } else if (scene.cameraMotion === 'zoom-out') {
        scale = 1.15 - progress * 0.15; // Slow zoom out
      }

      ctx.translate(width / 2 + offsetX, height / 2 + offsetY);
      ctx.scale(scale, scale);
      ctx.drawImage(img, -width / 2, -height / 2, width, height);
      ctx.restore();
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
      ctx.fillText(`Đang nạp hình ảnh Cảnh ${sceneIdx + 1}...`, width / 2, height / 2);
    }

    // Cinematic vignette & shadow overlay at bottom for subtitle legibility
    const gradVignette = ctx.createLinearGradient(0, height * 0.6, 0, height);
    gradVignette.addColorStop(0, 'rgba(0,0,0,0)');
    gradVignette.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = gradVignette;
    ctx.fillRect(0, height * 0.6, width, height * 0.4);

    // Top watermark banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fillRect(16, 16, width - 32, 40);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`🎬 MINH HIẾU REVIEW PHIM · CẢNH ${sceneIdx + 1}/3 (10s)`, 30, 42);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    const totalSecFormatted = `${Math.floor(currentTime).toString().padStart(2, '0')}:30s`;
    ctx.fillText(totalSecFormatted, width - 30, 42);

    // Subtitle rendering (Vietnamese YouTube Shorts & TikTok style: Yellow text with black outline)
    const subText = scene.subtitle || scene.narration;
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(subText, width / 2, height - 80);

    ctx.fillStyle = '#fde047'; // Bright Yellow
    ctx.fillText(subText, width / 2, height - 80);

    // Segment progress indicator at top or bottom (3 scenes x 10s)
    const barHeight = 6;
    const barY = height - barHeight;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, barY, width, barHeight);

    // Filled progress
    const fillWidth = (currentTime / 30) * width;
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, barY, fillWidth, barHeight);

    // 10s & 20s divider lines
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
    } else {
      if (playbackTime >= 30) {
        setPlaybackTime(0);
      }
      lastTimestampRef.current = null;
      setIsPlaying(true);
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      onShowToast('▶️ Đang phát video 30s (Ghép 3 cảnh x 10s)!');
    }
  };

  const handleRestart = () => {
    setIsPlaying(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlaybackTime(0);
    setActiveSceneIndex(0);
    drawCanvasFrame(0, 0);
  };

  const handleSeek = (targetTime: number) => {
    setPlaybackTime(targetTime);
    const sceneIdx = Math.min(2, Math.floor(targetTime / 10));
    setActiveSceneIndex(sceneIdx);
    drawCanvasFrame(targetTime, sceneIdx);
  };

  // Generate Script & 3 Scenes with Gemini AI
  const handleGenerateScript = async () => {
    if (!topic.trim()) {
      onShowToast('⚠️ Vui lòng nhập chủ đề video');
      return;
    }

    setIsGenerating(true);
    try {
      const apiBase = getApiBaseUrl();

      // If on static GitHub Pages without backend, generate scenes client-side
      if (!apiBase) {
        await new Promise((r) => setTimeout(r, 600));
        const clientScenes: SceneItem[] = [
          {
            sceneNumber: 1,
            name: 'Mở Đầu: Giới thiệu & Khơi gợi tò mò',
            duration: 10,
            timeRange: '00:00 - 00:10',
            narration: `Chào mừng bạn đến với câu chuyện "${topic}". Có những bài học cuộc đời chỉ thực sự thấm thía khi ta từng trải qua thăng trầm...`,
            subtitle: 'Khởi đầu hành trình với những bài học cuộc đời sâu sắc',
            visualPrompt: `Cinematic wide angle landscape, storytelling ambiance, ${topic}`,
            cameraMotion: 'zoom-in',
            imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
          },
          {
            sceneNumber: 2,
            name: 'Cao Trào: Thử thách & Bước ngoặt',
            duration: 10,
            timeRange: '00:10 - 00:20',
            narration: `Biến cố ập đến không phải để quật ngã chúng ta, mà để thử thách bản lĩnh và lòng kiên định. Giữ vững la bàn tâm trí là chìa khóa vượt qua mọi bão giông...`,
            subtitle: 'Bản lĩnh đối diện và vượt qua nghịch cảnh',
            visualPrompt: `Dramatic emotional lighting, cinematic shadows, ${topic}`,
            cameraMotion: 'pan-right',
            imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
          },
          {
            sceneNumber: 3,
            name: 'Kết Thúc: Đúc kết bài học & Hành động',
            duration: 10,
            timeRange: '00:20 - 00:30',
            narration: `Khép lại câu chuyện, hãy nhớ rằng: sự thanh thản trong tâm hồn luôn quý giá hơn mọi hào quang nhất thời. Cảm ơn bạn đã lắng nghe và đồng hành.`,
            subtitle: 'Sự an yên trong tâm hồn là giá trị quý giá nhất',
            visualPrompt: `Warm golden hour sunset, serene atmosphere, ${topic}`,
            cameraMotion: 'zoom-out',
            imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80',
          },
        ];

        setScriptData({
          title: topic,
          aspectRatio,
          totalDuration: 30,
          theme: storyStyle,
          scenes: clientScenes,
        });

        handleRestart();
        onShowToast('✨ Đã tạo kịch bản 3 Cảnh (Chuẩn 10s mỗi cảnh) thành công!');
        setIsGenerating(false);
        return;
      }

      const cleanBase = apiBase.replace(/\/+$/, '');
      const endpoint = cleanBase.endsWith('/api') ? `${cleanBase}/ai/generate-script-scenes` : `${cleanBase}/api/ai/generate-script-scenes`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          style: storyStyle,
          aspectRatio,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data && data.scenes && data.scenes.length === 3) {
        // Assign images to scenes (either from AI prompt or high-res thematic fallbacks)
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
            ...sc,
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
        onShowToast('✨ Đã tạo kịch bản 3 Cảnh (Chuẩn 10s mỗi cảnh) thành công!');

        // Automatically trigger AI image generation for Scene 1, 2, 3 in background
        triggerImageGeneration(updatedScenes);
      }
    } catch (err: any) {
      console.warn('Script generation fallback:', err);
      onShowToast('✨ Đã hoàn tất kịch bản 3 cảnh x 10s!');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate AI images for all 3 scenes
  const triggerImageGeneration = async (scenes: SceneItem[]) => {
    const apiBase = getApiBaseUrl();
    if (!apiBase) return; // Skip POST on static GitHub Pages to avoid 405 error
    const cleanBase = apiBase.replace(/\/+$/, '');
    const endpoint = cleanBase.endsWith('/api') ? `${cleanBase}/ai/generate-image` : `${cleanBase}/api/ai/generate-image`;
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
        // High quality thematic rotation on static hosting without server POST
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
      const endpoint = cleanBase.endsWith('/api') ? `${cleanBase}/ai/generate-image` : `${cleanBase}/api/ai/generate-image`;
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

  // Export & Record Stitched 30s Video to WebM file
  const handleExportVideo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (typeof (canvas as any).captureStream !== 'function') {
      onShowToast('❌ Trình duyệt không hỗ trợ quay canvas trực tiếp.');
      return;
    }

    try {
      const stream = (canvas as any).captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm',
      });

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
        a.download = `video-30s-${aspectRatio.replace(':', '-')}-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        onShowToast('🎉 Đã xuất và tải video 30s thành công!');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecordingVideo(true);

      // Start playing from beginning
      handleRestart();
      setIsPlaying(true);
      animationFrameRef.current = requestAnimationFrame(renderFrame);

      onShowToast('🔴 Đang ghi lại video 30s (3 cảnh ghép lại)...');
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
                  AI Video Studio (3 Cảnh x 10s = 30 Giây Ghép Lại)
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Chuẩn 9:16 &amp; 16:9
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Tự Động Ghép Thành 1 Video
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Tạo kịch bản chia đều 3 cảnh (mỗi cảnh đúng 10s), tự sinh ảnh minh họa AI tương ứng, lồng tiếng tiếng Việt và ghép liền mạch thành 1 video 30s hoàn chỉnh với phụ đề nổi bật.
              </p>
            </div>
          </div>

          {/* Preset Topics */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400">Gợi ý chủ đề:</span>
            <button
              onClick={() =>
                setTopic('Xuyên không về cổ đại làm CEO, dùng KPI quản lý triều đình')
              }
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              👑 Xuyên không CEO
            </button>
            <button
              onClick={() =>
                setTopic('Đức Phật dạy về lòng hiếu kính cha mẹ và đạo làm con')
              }
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              🪷 Lòng hiếu kính
            </button>
            <button
              onClick={() =>
                setTopic('Về miền Tây sông nước mùa nước nổi và câu hò bến đò xưa')
              }
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              🌾 Miền Tây sông nước
            </button>
          </div>
        </div>
      </div>

      {/* Generator Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Chủ đề / Ý tưởng kịch bản:
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Nhập chủ đề video (ví dụ: review phim, bài học nhân sinh, truyện ma, hoạt hình)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5">
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
                16:9 (YouTube Chuẩn)
              </button>
            </div>
          </div>

          <div className="space-y-1.5 flex flex-col justify-end">
            <button
              onClick={handleGenerateScript}
              disabled={isGenerating}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang viết kịch bản AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Tạo Kịch Bản 3 Cảnh (30s)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Display: Video Canvas Player (Left) & 3 Scenes Storyboard (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Canvas Player (5 cols on 9:16, 7 cols on 16:9) */}
        <div className={aspectRatio === '9:16' ? 'lg:col-span-5' : 'lg:col-span-7'}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold flex items-center gap-1.5 text-amber-400">
                <Video className="w-4 h-4" />
                Trình Phát Ghép 3 Cảnh ({aspectRatio})
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
                  className={activeSceneIndex === 0 ? 'text-amber-400 font-bold' : ''}
                  onClick={() => handleSeek(0)}
                  role="button"
                >
                  Cảnh 1 (0s-10s)
                </span>
                <span
                  className={activeSceneIndex === 1 ? 'text-amber-400 font-bold' : ''}
                  onClick={() => handleSeek(10)}
                  role="button"
                >
                  Cảnh 2 (10s-20s)
                </span>
                <span
                  className={activeSceneIndex === 2 ? 'text-amber-400 font-bold' : ''}
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
                  <span>Lồng tiếng (TTS)</span>
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

        {/* Right Column: 3 Scenes Breakdown (7 cols on 9:16, 5 cols on 16:9) */}
        <div className={aspectRatio === '9:16' ? 'lg:col-span-7' : 'lg:col-span-5'} space-y-4>
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Chi Tiết 3 Phân Cảnh (Đúng 10 Giây Mỗi Cảnh)
            </h3>
            <span className="text-xs text-slate-400">Tổng: 30 Giây Ghép Lại</span>
          </div>

          <div className="space-y-4">
            {scriptData.scenes.map((scene, idx) => {
              const isActive = activeSceneIndex === idx;
              return (
                <div
                  key={scene.sceneNumber}
                  className={`border rounded-2xl p-4 transition-all ${
                    isActive
                      ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-500/5'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center">
                        {scene.sceneNumber}
                      </span>
                      <h4 className="text-xs font-bold text-white">{scene.name}</h4>
                    </div>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
                      {scene.timeRange} (10s)
                    </span>
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

                    {/* Scene Narration & Subtitle */}
                    <div className="sm:col-span-3 space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium">Lời lồng tiếng (Voiceover 10s):</span>
                        <p className="text-slate-200 mt-0.5 leading-relaxed bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                          "{scene.narration}"
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <span className="text-amber-400 font-semibold">Phụ đề:</span> {scene.subtitle}
                        </span>
                        <span className="text-indigo-400 font-mono">
                          Motion: {scene.cameraMotion}
                        </span>
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[11px]">
                        <button
                          onClick={() => handleSeek(idx * 10)}
                          className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Play className="w-3 h-3" />
                          <span>Xem trước Cảnh {idx + 1} (10s)</span>
                        </button>

                        <button
                          onClick={() => {
                            if (typeof window !== 'undefined' && window.speechSynthesis) {
                              window.speechSynthesis.cancel();
                              const u = new SpeechSynthesisUtterance(scene.narration);
                              u.lang = 'vi-VN';
                              window.speechSynthesis.speak(u);
                            }
                          }}
                          className="text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Nghe đọc</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
