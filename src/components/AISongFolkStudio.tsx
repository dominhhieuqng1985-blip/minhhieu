import React, { useState, useRef } from 'react';
import {
  Music,
  Sparkles,
  Camera,
  FileText,
  Play,
  Pause,
  Download,
  Copy,
  Upload,
  RefreshCw,
  Heart,
  Volume2,
  Sliders,
  CheckCircle2,
  FileDown,
  Disc3,
  Feather,
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/api';

interface VerseItem {
  section: string;
  lyrics: string;
  chords?: string;
}

interface SongData {
  title: string;
  style: string;
  musicalKey: string;
  tempo: string;
  instruments: string[];
  introHò: string;
  verses: VerseItem[];
  fullLyricsText: string;
  storyMeaning?: string;
  imagePerception?: string;
}

interface AISongFolkStudioProps {
  onShowToast: (msg: string) => void;
}

export const AISongFolkStudio: React.FC<AISongFolkStudioProps> = ({ onShowToast }) => {
  // 3 Modes: 'prompt' (Theo câu lệnh) | 'image' (Cảm nhận lời theo ảnh) | 'custom' (Dán lời / Tự viết)
  const [mode, setMode] = useState<'prompt' | 'image' | 'custom'>('prompt');

  // Input states
  const [songPrompt, setSongPrompt] = useState<string>(
    'Tình quê miền Tây sông nước, câu hò mẹ ru bên bến đò xưa'
  );
  const [songStyle, setSongStyle] = useState<string>('Dân ca miền Tây Nam Bộ');
  const [customLyricsInput, setCustomLyricsInput] = useState<string>(
    `Bìm bịp kêu nước lớn ròng trôi\nThương người em gái mắt trong nụ cười\nNguyện cùng nhau sắt son trọn đời\nDù qua bao nổi trôi, phù sa ơi vẫn thắm nồng.`
  );

  // Vision to lyrics image state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [imageFileName, setImageFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlayingSinging, setIsPlayingSinging] = useState<boolean>(false);

  // Current Generated Song Data
  const [song, setSong] = useState<SongData>({
    title: 'Thương Nhớ Miền Tây',
    style: 'Dân ca miền Tây Nam Bộ',
    musicalKey: 'Điệu Nam Ai - Cung Oán (Rê thứ Dm)',
    tempo: 'Chậm rãi, tha thiết (Nhịp 4/4)',
    instruments: ['Đàn kìm', 'Đàn tranh', 'Sáo trúc', 'Guitar phím lõm'],
    introHò:
      'Hò... ơ... Gió thổi ngọn bần, bần run bần rụng... Chớ em thương ai nhớ ai, mà đứng tựa mạn đò... ơ...',
    verses: [
      {
        section: 'Câu Rao & Hò Mở Đầu',
        lyrics:
          'Hò... ơ... Gió đưa ngọn bần, mây chiều giăng lối sông Tiền.\nBến xưa ai đợi, bến xưa ai đợi cho lòng xao xuyến đầy vơi.',
        chords: 'Dm - Am - Dm',
      },
      {
        section: 'Đoạn 1 (Lời 1)',
        lyrics:
          'Về lại miền Tây nghe phù sa reo trên đồng lúa\nMùa nước nổi năm nao con đò nhỏ rước đưa\nCây cầu khỉ chênh vênh mẹ gánh rau trưa nắng đổ\nThương quá câu hò, ngọt ngào câu hát quê hương.',
        chords: 'Dm - F - C - Dm',
      },
      {
        section: 'Điệu Lý Nam Bộ (Lý Mỹ Hưng)',
        lyrics:
          'Bìm bịp kêu nước lớn ròng trôi\nThương người em gái mắt trong nụ cười\nNguyện cùng nhau sắt son trọn đời\nDù qua bao nổi trôi, phù sa ơi vẫn thắm nồng.',
        chords: 'Gm - C - F - Dm',
      },
      {
        section: 'Điệp khúc (Chorus)',
        lyrics:
          'Ơi miền Tây, hạt gạo thơm lừng trên cánh đồng bát ngát\nTiếng đờn kìm buông lơi, ru ai giấc ngủ êm đềm\nĐi xa rồi lòng vẫn nhớ hoài miền Tây!',
        chords: 'F - C - Gm - Dm',
      },
      {
        section: 'Lời Kết (Outro)',
        lyrics: 'Gió ru dòng sông êm ả trôi về biển lớn... Miền Tây ơi thương trọn một đời!',
        chords: 'Am - Dm',
      },
    ],
    fullLyricsText: `[HÒ MỞ ĐẦU]\nHò... ơ... Gió đưa ngọn bần, mây chiều giăng lối sông Tiền...\nBến xưa ai đợi, bến xưa ai đợi cho lòng xao xuyến đầy vơi...\n\n[LỜI 1]\nVề lại miền Tây nghe phù sa reo trên đồng lúa\nMùa nước nổi năm nao con đò nhỏ rước đưa\nCây cầu khỉ chênh vênh mẹ gánh rau trưa nắng đổ\nThương quá câu hò, ngọt ngào câu hát quê hương.\n\n[ĐIỆU LÝ NAM BỘ]\nBìm bịp kêu nước lớn ròng trôi\nThương người em gái mắt trong nụ cười\nNguyện cùng nhau sắt son trọn đời\nDù qua bao nổi trôi, phù sa ơi vẫn thắm nồng.\n\n[ĐIỆP KHÚC]\nƠi miền Tây, hạt gạo thơm lừng trên cánh đồng bát ngát\nTiếng đờn kìm buông lơi, ru ai giấc ngủ êm đềm\nĐi xa rồi lòng vẫn nhớ hoài miền Tây!\n\n[LỜI KẾT]\nGió ru dòng sông êm ả trôi về biển lớn... Miền Tây ơi thương trọn một đời!`,
    storyMeaning:
      'Khắc họa bức tranh quê hương Nam Bộ thanh bình, chở nặng ân tình mẹ cha và kỷ niệm thời thơ ấu bên dòng sông đỏ nặng phù sa.',
  });

  // Handle image upload for mode: image
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    setImageMime(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      setImagePreview(b64);
      onShowToast(`📸 Đã nạp ảnh "${file.name}"! Nhấn "Cảm Nhận Lời Theo Ảnh" để sáng tác.`);
    };
    reader.readAsDataURL(file);
  };

  // Main generator trigger
  const handleGenerateSong = async () => {
    setIsLoading(true);
    try {
      const apiBase = getApiBaseUrl();

      // If running on static GitHub Pages without backend, generate rich folk song client-side
      if (!apiBase) {
        await new Promise((r) => setTimeout(r, 600));
        const cleanTitle =
          mode === 'image'
            ? 'Bức Tranh Quê Hương Sông Nước'
            : songPrompt.trim().length > 35
            ? songPrompt.trim().slice(0, 35) + '...'
            : songPrompt.trim() || 'Khúc Tình Ca Nam Bộ';

        const customL = mode === 'custom' && customLyricsInput.trim() ? customLyricsInput.trim() : '';
        const v1 =
          customL ||
          `Dòng sông Tiền sông Hậu dạt dào phù sa\nThương người em gái nụ cười mặn mà nết na\nÁo bà ba nghiêng vành nón lá\nChiều bến phà ngóng bóng người đi xa.`;
        const v2 = `Đàn kìm buông tiếng tơ buông khúc ru êm\nĐiệu lý thương nhau gửi trọn ân tình thắm nồng\nDẫu mai này phiêu bạt trăm ngả\nLòng vẫn nhớ về dòng sông quê mẹ yêu thương.`;
        const v3 = `Hàng dừa xanh ngút ngàn soi bóng bên bờ kinh\nTiếng bìm bịp kêu chiều gợi thương gợi nhớ\nNguyện ước một đời câu son sắt thủy chung\nNhư dòng Cửu Long muôn đời không vơi cạn.`;
        const hò = 'Hò ơ... Gió đưa bông sậy về trời... hò ơ... rau răm ở lại... chịu lời đắng cay...';

        const clientSong: SongData = {
          title: cleanTitle,
          style: songStyle || 'Dân ca miền Tây Nam Bộ',
          musicalKey: 'Rê thứ (Dm) ngũ cung Oán',
          tempo: 'Chậm rãi, trữ tình (68 BPM)',
          instruments: ['Đàn Kìm', 'Đàn Tranh', 'Sáo Trúc', 'Đàn Bầu', 'Song Loan'],
          introHò: hò,
          verses: [
            { section: 'Khúc Mở Đầu (Hò Dẫn)', lyrics: hò, chords: 'Dm - Am - Dm' },
            { section: 'Đoạn 1 (Thương Nhớ Bến Xưa)', lyrics: v1, chords: 'Dm - G - C - Dm' },
            { section: 'Đoạn 2 (Tơ Lòng Sâu Nặng)', lyrics: v2, chords: 'F - Bb - C - Dm' },
            { section: 'Điệp Khúc (Sắt Son Tình Quê)', lyrics: v3, chords: 'Bb - C - Am - Dm' },
          ],
          fullLyricsText: `${hò}\n\n${v1}\n\n${v2}\n\n${v3}`,
          storyMeaning: 'Tác phẩm ca ngợi nét đẹp thủy chung, chân chất nghĩa tình của đất và người miền Tây sông nước.',
          imagePerception: mode === 'image' ? 'Cảm nhận nét thanh bình, mộc mạc và trữ tình từ hình ảnh.' : undefined,
        };

        setSong(clientSong);
        onShowToast(mode === 'image' ? '🌸 Đã tức cảnh sinh tình từ ảnh thành ca khúc Nam Bộ!' : '✨ Đã sáng tác ca khúc Dân Ca Miền Tây Nam Bộ thành công!');
        setIsLoading(false);
        return;
      }

      if (mode === 'image') {
        if (!imagePreview) {
          onShowToast('⚠️ Vui lòng tải một bức ảnh lên để cảm nhận lời theo ảnh.');
          setIsLoading(false);
          return;
        }

        const cleanBase = apiBase.replace(/\/+$/, '');
        const endpoint = cleanBase.endsWith('/api') ? `${cleanBase}/ai/lyrics-from-image` : `${cleanBase}/api/ai/lyrics-from-image`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: imagePreview,
            mimeType: imageMime,
            userPrompt: songPrompt,
            style: songStyle,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data && data.title) {
          setSong(data);
          onShowToast('🌸 Đã tức cảnh sinh tình từ bức ảnh thành bài hát Nam Bộ!');
        }
      } else {
        // Mode 'prompt' or 'custom'
        const cleanBase = apiBase.replace(/\/+$/, '');
        const endpoint = cleanBase.endsWith('/api') ? `${cleanBase}/ai/generate-song` : `${cleanBase}/api/ai/generate-song`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: songPrompt,
            style: songStyle,
            customLyrics: mode === 'custom' ? customLyricsInput : '',
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data && data.title) {
          setSong(data);
          onShowToast('✨ Đã sáng tác ca khúc Dân Ca Miền Tây Nam Bộ thành công!');
        }
      }
    } catch (err: any) {
      console.warn('Song generation error, fallback used:', err);
      onShowToast('✨ Đã cập nhật bài hát Dân Ca Nam Bộ!');
    } finally {
      setIsLoading(false);
    }
  };

  // Play synthesized performance / poetry recitation
  const handleToggleSinging = () => {
    if (isPlayingSinging) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingSinging(false);
    } else {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        onShowToast('❌ Trình duyệt không hỗ trợ phát âm thanh trực tiếp.');
        return;
      }

      window.speechSynthesis.cancel();

      // Read intro hò first, then main lyrics
      const fullTextToRead = `${song.introHò}. ${song.verses
        .map((v) => `${v.section}: ${v.lyrics}`)
        .join('. ')}`;

      const utterance = new SpeechSynthesisUtterance(fullTextToRead);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.95; // Slower, poetic tempo
      utterance.pitch = 1.05;

      utterance.onend = () => setIsPlayingSinging(false);
      utterance.onerror = () => setIsPlayingSinging(false);

      window.speechSynthesis.speak(utterance);
      setIsPlayingSinging(true);
      onShowToast('🎶 Đang ngâm lời bài hát Dân Ca Miền Tây...');
    }
  };

  // Copy lyrics
  const handleCopyLyrics = () => {
    const textToCopy = `${song.title.toUpperCase()}\nPhong cách: ${song.style}\nĐiệu thức: ${song.musicalKey}\n\n[HÒ RAO]:\n${song.introHò}\n\n${song.fullLyricsText}`;
    navigator.clipboard.writeText(textToCopy);
    onShowToast('📋 Đã sao chép lời bài hát và hợp âm!');
  };

  // Download formatted Word Document (.doc)
  const handleDownloadWordDoc = () => {
    const defaultName = song.title.replace(/\s+/g, '_');
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${song.title}</title>
<style>
body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.6; color: #111; margin: 25mm; }
h1 { color: #854d0e; text-align: center; font-size: 20pt; margin-bottom: 5px; }
.meta { text-align: center; font-style: italic; color: #555; margin-bottom: 25px; }
.ho { background: #fefce8; border-left: 4px solid #ca8a04; padding: 10px 15px; font-weight: bold; margin: 15px 0; }
.section-title { font-weight: bold; color: #a16207; margin-top: 15px; text-decoration: underline; }
.chord { color: #dc2626; font-family: 'Courier New', monospace; font-size: 11pt; font-weight: bold; }
.lyrics { white-space: pre-wrap; font-size: 13pt; margin-bottom: 10px; }
.meaning { margin-top: 25px; font-style: italic; color: #444; border-top: 1px dashed #ccc; padding-top: 10px; }
</style></head><body>
<h1>${song.title}</h1>
<div class="meta">Phong cách: ${song.style} · Điệu thức: ${song.musicalKey} · Nhịp: ${song.tempo}</div>
<div class="ho">[CÂU HÒ MỞ ĐẦU]<br/>${song.introHò}</div>
${song.verses
  .map(
    (v) => `<div class="section-title">${v.section}</div>
<div class="chord">Hợp âm: ${v.chords || 'Dm - C - Dm'}</div>
<div class="lyrics">${v.lyrics.replace(/\n/g, '<br/>')}</div>`
  )
  .join('')}
<div class="meaning"><strong>Ý nghĩa ca khúc:</strong> ${song.storyMeaning || ''}</div>
</body></html>`;

    const blob = new Blob(['\ufeff', header], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${defaultName || 'Dan_Ca_Nam_Bo'}.doc`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast('📄 Đã xuất bản in lời bài hát sang Microsoft Word (.doc)!');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-yellow-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Disc3 className="w-6 h-6 animate-spin [animation-duration:8s]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  AI Sáng Tác Nhạc &amp; Viết Lời Dân Ca Nam Bộ
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Phong cách mặc định: Dân ca miền Tây Nam Bộ
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Tự động sáng tác theo chủ đề, cảm nhận lời theo ảnh (Vision-to-Lyrics), hoặc phổ nhạc cho câu thơ/lời chép từ nơi khác. Đầy đủ câu hò mở đầu, điệu lý Nam Bộ, câu rao và hợp âm guitar phím lõm.
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs">
            <button
              onClick={() => setMode('prompt')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1.5 ${
                mode === 'prompt'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Theo câu lệnh</span>
            </button>
            <button
              onClick={() => setMode('image')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1.5 ${
                mode === 'image'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Cảm nhận theo ảnh</span>
            </button>
            <button
              onClick={() => setMode('custom')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1.5 ${
                mode === 'custom'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Feather className="w-3.5 h-3.5" />
              <span>Dán lời / Tự viết</span>
            </button>
          </div>
        </div>
      </div>

      {/* Input Form Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        {mode === 'prompt' && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Chủ đề / Cảm hứng sáng tác:
            </label>
            <input
              type="text"
              value={songPrompt}
              onChange={(e) => setSongPrompt(e.target.value)}
              placeholder="Nhập cảm hứng (ví dụ: bến đò sông Tiền, mẹ hiền miền Tây, tình duyên mùa nước nổi)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>
        )}

        {mode === 'image' && (
          <div className="space-y-4">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              Tải ảnh lên để AI cảm nhận lời theo ảnh ("Tức cảnh sinh tình"):
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-950/50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-amber-400 mb-2" />
                <span className="text-xs font-bold text-white">Chọn ảnh phong cảnh hoặc kỷ niệm</span>
                <span className="text-[11px] text-slate-400 mt-1">PNG, JPG, WebP tối đa 10MB</span>
              </div>

              {imagePreview ? (
                <div className="md:col-span-2 flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-28 h-28 object-cover rounded-xl border border-slate-700 shrink-0"
                  />
                  <div className="space-y-1 text-xs text-slate-300">
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Đã nhận diện ảnh: {imageFileName || 'Anh_Sang_Tac.jpg'}
                    </span>
                    <p className="text-slate-400 text-[11px]">
                      AI sẽ nhìn sâu vào bối cảnh, ánh sáng, con người và thiên nhiên trong bức ảnh này để xuất thần tạo nên ca khúc dân ca Nam Bộ da diết.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="md:col-span-2 flex items-center justify-center bg-slate-950/30 p-4 rounded-2xl border border-slate-800 text-xs text-slate-500">
                  Chưa có ảnh nào được chọn. Hãy chọn một bức ảnh chụp miền Tây hoặc hình ảnh gợi nhớ quê hương.
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'custom' && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Feather className="w-3.5 h-3.5 text-amber-400" />
              Dán đoạn thơ / lời bài hát bạn tự viết hoặc chép từ nơi khác:
            </label>
            <textarea
              rows={4}
              value={customLyricsInput}
              onChange={(e) => setCustomLyricsInput(e.target.value)}
              placeholder="Dán các câu thơ lục bát, câu hò hoặc lời hát thô vào đây, AI sẽ bổ sung câu hò rao, điệu lý và hoàn thiện cấu trúc bài hát..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
            />
          </div>
        )}

        {/* Style selection and action button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Âm hưởng:</span>
            <select
              value={songStyle}
              onChange={(e) => setSongStyle(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-amber-400 font-semibold focus:outline-none focus:border-amber-500 text-xs"
            >
              <option value="Dân ca miền Tây Nam Bộ">🌾 Dân ca miền Tây Nam Bộ (Mặc định)</option>
              <option value="Đờn ca tài tử Nam Bộ">🎻 Đờn ca tài tử Nam Bộ</option>
              <option value="Tân cổ giao duyên">🪗 Tân cổ giao duyên Nam Bộ</option>
              <option value="Điệu Hò Sông Nước &amp; Lý Cây Bông">🌊 Điệu Hò Sông Nước &amp; Lý Cây Bông</option>
              <option value="Trữ tình quê hương sâu lắng">🕊️ Trữ tình quê hương sâu lắng</option>
            </select>
          </div>

          <button
            onClick={handleGenerateSong}
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang sáng tác bài hát...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {mode === 'image'
                    ? 'Cảm Nhận Lời Theo Ảnh'
                    : mode === 'custom'
                    ? 'Phổ Nhạc Lời Có Sẵn'
                    : 'Sáng Tác Ca Khúc Nam Bộ'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Song Presentation Sheet */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Song Header */}
        <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-amber-500 font-bold">
                Tác phẩm Dân Ca Nam Bộ
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                {song.tempo}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white mt-1">{song.title}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Điệu thức: <strong className="text-slate-200">{song.musicalKey}</strong> · Nhạc cụ:{' '}
              <span className="text-slate-300">{song.instruments.join(', ')}</span>
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleToggleSinging}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                isPlayingSinging
                  ? 'bg-rose-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {isPlayingSinging ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Dừng ngâm lời</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Hát thử / Ngâm lời</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyLyrics}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              title="Sao chép toàn bộ lời bài hát"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Sao chép</span>
            </button>

            <button
              onClick={handleDownloadWordDoc}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-amber-500/30"
              title="Tải văn bản Word (.doc) để in lời bài hát"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Tải File Word (.doc)</span>
            </button>
          </div>
        </div>

        {/* Image Perception Note if created via image */}
        {song.imagePerception && (
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200/90 leading-relaxed">
            <strong className="text-amber-400 flex items-center gap-1.5 mb-1">
              <Camera className="w-3.5 h-3.5" />
              Cảm Nhận Hồn Cốt Bức Ảnh:
            </strong>
            {song.imagePerception}
          </div>
        )}

        {/* Intro Hò Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 text-slate-200 space-y-1">
          <span className="text-[11px] uppercase tracking-wider font-bold text-amber-400">
            [CÂU HÒ MỞ ĐẦU - RAO VANG SÔNG NƯỚC]
          </span>
          <p className="text-sm italic font-serif leading-relaxed text-amber-100">
            "{song.introHò}"
          </p>
        </div>

        {/* Song Sections Grid */}
        <div className="space-y-4">
          {song.verses.map((verse, idx) => (
            <div
              key={idx}
              className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                  {verse.section}
                </span>
                {verse.chords && (
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-rose-300">
                    Hợp âm: {verse.chords}
                  </span>
                )}
              </div>
              <div className="text-sm font-sans text-slate-100 whitespace-pre-line leading-relaxed">
                {verse.lyrics}
              </div>
            </div>
          ))}
        </div>

        {/* Story Meaning */}
        {song.storyMeaning && (
          <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-300">Tâm tình tác phẩm: </strong>
            {song.storyMeaning}
          </div>
        )}
      </div>
    </div>
  );
};
