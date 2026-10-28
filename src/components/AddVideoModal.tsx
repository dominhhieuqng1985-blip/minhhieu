import React, { useState } from 'react';
import { X, Plus, Sparkles, Youtube, AlertCircle, Loader2, Video } from 'lucide-react';
import { PodcastEpisode } from '../types/podcast';
import {
  DEFAULT_TIKTOK_URL,
  TikTokVideoData,
  isTikTokUrl,
  fetchTikTokVideoData,
  convertTikTokDataToEpisode,
} from '../utils/tiktokApi';

interface AddVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVideo: (video: PodcastEpisode) => void;
}

interface PreviewVideoState {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  isShort: boolean;
  sourceType: 'youtube' | 'tiktok';
  sourceUrl: string;
  tiktokData?: TikTokVideoData;
}

export const AddVideoModal: React.FC<AddVideoModalProps> = ({ isOpen, onClose, onAddVideo }) => {
  const [videoUrl, setVideoUrl] = useState<string>(DEFAULT_TIKTOK_URL);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewVideoState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seriesTitle, setSeriesTitle] = useState<string>('none');

  if (!isOpen) return null;

  // Extract YouTube ID
  const extractYouTubeParsed = (url: string): { id: string; isShort: boolean } | null => {
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return { id: trimmed, isShort: false };
    }
    const shortMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
    if (shortMatch) {
      return { id: shortMatch[1], isShort: true };
    }
    const watchMatch = trimmed.match(/(?:watch\?v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/i);
    if (watchMatch) {
      return { id: watchMatch[1], isShort: false };
    }
    return null;
  };

  const resolveVideoPreview = async (rawInput: string): Promise<PreviewVideoState | null> => {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      setError('Vui lòng nhập đường dẫn video TikTok hoặc YouTube.');
      return null;
    }

    setError(null);
    setIsLoadingMeta(true);

    try {
      // 1. Check TikTok URL first
      if (isTikTokUrl(trimmed)) {
        const tkData = await fetchTikTokVideoData(trimmed);
        const resolved: PreviewVideoState = {
          id: String(tkData.id),
          title:
            tkData.description?.trim() ||
            `Video TikTok @${tkData.author?.username || 'tiktok'} #${tkData.id}`,
          author: tkData.author?.nickname || tkData.author?.username || 'TikTok Creator',
          thumbnail: tkData.cover || tkData.author?.avatar || '',
          isShort: true,
          sourceType: 'tiktok',
          sourceUrl: trimmed,
          tiktokData: tkData,
        };
        setPreviewData(resolved);
        return resolved;
      }

      // 2. Otherwise check YouTube URL / 11-char ID
      const parsed = extractYouTubeParsed(trimmed);
      if (!parsed) {
        setError(
          'Đường dẫn không hợp lệ. Vui lòng nhập link TikTok, link YouTube (Video/Shorts) hoặc mã ID 11 ký tự.'
        );
        return null;
      }

      try {
        const res = await fetch(
          `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${parsed.id}`
        );
        if (!res.ok) {
          throw new Error('Không thể tải thông tin oEmbed');
        }
        const data = await res.json();
        const resolved: PreviewVideoState = {
          id: parsed.id,
          title: data.title || `Video YouTube #${parsed.id}`,
          author: data.author_name || 'Minh Hiếu review phim',
          thumbnail: `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`,
          isShort: parsed.isShort,
          sourceType: 'youtube',
          sourceUrl: trimmed,
        };
        setPreviewData(resolved);
        return resolved;
      } catch {
        const fallback: PreviewVideoState = {
          id: parsed.id,
          title: `Video YouTube #${parsed.id}`,
          author: 'Minh Hiếu review phim',
          thumbnail: `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`,
          isShort: parsed.isShort,
          sourceType: 'youtube',
          sourceUrl: trimmed,
        };
        setPreviewData(fallback);
        return fallback;
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể đọc thông tin video từ đường dẫn này.');
      return null;
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleFetchPreview = async () => {
    await resolveVideoPreview(videoUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let activePreview = previewData;
    if (!activePreview) {
      activePreview = await resolveVideoPreview(videoUrl);
      if (!activePreview) return;
    }

    if (activePreview.sourceType === 'tiktok' && activePreview.tiktokData) {
      const tiktokEpisode = convertTikTokDataToEpisode(
        activePreview.tiktokData,
        activePreview.sourceUrl,
        seriesTitle !== 'none' ? seriesTitle : undefined
      );
      onAddVideo(tiktokEpisode);
      onClose();
      return;
    }

    const newEpisode: PodcastEpisode = {
      id: `custom-${Date.now()}-${activePreview.id}`,
      youtubeId: activePreview.id,
      title: activePreview.title,
      channel: activePreview.author,
      channelAvatar:
        'https://yt3.googleusercontent.com/IAZc3hD-MjzJAtG3Eainm3ueaTvyalzFYEeBqHm-1rkIbUCmIz9--aemFtvSsV-eQIZS0AS0EQ=s900-c-k-c0x00ffffff-no-rj',
      category: seriesTitle.includes('đức phật') ? 'tam-ly-doi-song' : 'nghe-thuat-sang-tao',
      duration: activePreview.isShort ? '00:60' : '03:30',
      durationSeconds: activePreview.isShort ? 60 : 210,
      thumbnail: activePreview.thumbnail,
      description: `${activePreview.title} - Kênh ${activePreview.author}.`,
      publishedDate: activePreview.isShort ? 'YouTube Shorts' : 'Video mới thêm',
      isShort: activePreview.isShort,
      sourceType: 'youtube',
      seriesTitle: seriesTitle !== 'none' ? seriesTitle : undefined,
    };

    onAddVideo(newEpisode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600/30 to-cyan-500/30 text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-bold">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Thêm video YouTube hoặc TikTok</h3>
              <p className="text-xs text-slate-400">
                Hỗ trợ dán nhanh đường dẫn video TikTok, YouTube và YouTube Shorts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-slate-300">
                Đường dẫn TikTok hoặc YouTube (Video / Shorts):
              </label>
              <button
                type="button"
                onClick={() => {
                  setVideoUrl(DEFAULT_TIKTOK_URL);
                  setPreviewData(null);
                  setError(null);
                  resolveVideoPreview(DEFAULT_TIKTOK_URL);
                }}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
              >
                Dùng link TikTok mặc định
              </button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="https://www.tiktok.com/@... hoặc https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    setPreviewData(null);
                    setError(null);
                  }}
                  className="w-full pl-3.5 pr-8 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/70 font-mono"
                />
                {videoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setVideoUrl('');
                      setPreviewData(null);
                      setError(null);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    title="Xóa đường dẫn"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleFetchPreview}
                disabled={isLoadingMeta || !videoUrl.trim()}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
              >
                {isLoadingMeta && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isLoadingMeta ? 'Đang đọc...' : 'Kiểm tra link'}</span>
              </button>
            </div>
            {error && (
              <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> <span>{error}</span>
              </p>
            )}
          </div>

          {/* Preview Box */}
          {previewData && (
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex gap-3 items-center">
              <img
                src={previewData.thumbnail}
                alt={previewData.title}
                referrerPolicy="no-referrer"
                className="w-24 h-16 object-cover rounded-lg flex-shrink-0 bg-slate-800 border border-slate-700/60"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white line-clamp-2">{previewData.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{previewData.author}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {previewData.sourceType === 'tiktok' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      TikTok HD Player
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1 ${
                        previewData.isShort
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      <Youtube className="w-3 h-3" />
                      {previewData.isShort ? 'YouTube Shorts' : 'Video YouTube'}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 font-mono truncate">
                    ID: {previewData.id}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Choose Series */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Phân loại / Series Podcast (Tùy chọn):
            </label>
            <select
              value={seriesTitle}
              onChange={(e) => setSeriesTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/70"
            >
              <option value="none">Video độc lập (Không thuộc series)</option>
              <option value="Phim cuộc đời đức phật">Series: Phim cuộc đời đức phật</option>
              <option value="Căn nhà bị khóa">Series: Căn nhà bị khóa</option>
              <option value="Truyện ma căn nhà cuối con đường">
                Series: Truyện ma căn nhà cuối con đường
              </option>
            </select>
          </div>

          {/* Info Tip */}
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-[11px] text-cyan-200 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Tự động tối ưu chuẩn khung hình HD:
            </p>
            <p className="text-cyan-200/80">
              Hệ thống tự động nhận diện nguồn phát để tối ưu tỷ lệ dọc 9:16 hoặc ngang 16:9 sắc nét cùng âm thanh nguyên bản.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isLoadingMeta || !videoUrl.trim()}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-red-600/20"
            >
              {isLoadingMeta ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{previewData ? 'Thêm & Phát ngay' : 'Kiểm tra & Thêm ngay'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
