import React, { useState } from 'react';
import { X, Plus, Sparkles, Youtube, Check, AlertCircle, Play, Film, Clock, HelpCircle } from 'lucide-react';
import { PodcastEpisode } from '../types/podcast';

interface AddVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVideo: (video: PodcastEpisode) => void;
}

export const AddVideoModal: React.FC<AddVideoModalProps> = ({ isOpen, onClose, onAddVideo }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [previewData, setPreviewData] = useState<{
    id: string;
    title: string;
    author: string;
    thumbnail: string;
    isShort: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seriesTitle, setSeriesTitle] = useState<string>('none');

  if (!isOpen) return null;

  // Extract YouTube ID
  const extractId = (url: string): { id: string; isShort: boolean } | null => {
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

  const handleFetchPreview = async () => {
    setError(null);
    const parsed = extractId(videoUrl);
    if (!parsed) {
      setError('Đường dẫn không hợp lệ. Vui lòng nhập link YouTube hoặc mã ID 11 ký tự.');
      return;
    }

    setIsLoadingMeta(true);
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${parsed.id}&format=json`;
      const res = await fetch(oembedUrl);
      if (!res.ok) {
        throw new Error('Không thể tải thông tin oEmbed từ YouTube');
      }
      const data = await res.json();
      setPreviewData({
        id: parsed.id,
        title: data.title || 'Video mới',
        author: data.author_name || 'Minh Hiếu review phim',
        thumbnail: `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`,
        isShort: parsed.isShort,
      });
    } catch {
      // Fallback preview
      setPreviewData({
        id: parsed.id,
        title: `Video YouTube #${parsed.id}`,
        author: 'Minh Hiếu review phim',
        thumbnail: `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`,
        isShort: parsed.isShort,
      });
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewData) {
      handleFetchPreview();
      return;
    }

    const newEpisode: PodcastEpisode = {
      id: `custom-${Date.now()}-${previewData.id}`,
      youtubeId: previewData.id,
      title: previewData.title,
      channel: previewData.author,
      channelAvatar: 'https://yt3.googleusercontent.com/IAZc3hD-MjzJAtG3Eainm3ueaTvyalzFYEeBqHm-1rkIbUCmIz9--aemFtvSsV-eQIZS0AS0EQ=s900-c-k-c0x00ffffff-no-rj',
      category: seriesTitle.includes('đức phật') ? 'tam-ly-doi-song' : 'nghe-thuat-sang-tao',
      duration: previewData.isShort ? '00:60' : '03:30',
      durationSeconds: previewData.isShort ? 60 : 210,
      thumbnail: previewData.thumbnail,
      description: `${previewData.title} - Kênh ${previewData.author}.`,
      publishedDate: previewData.isShort ? 'YouTube Shorts' : 'Video mới thêm',
      isShort: previewData.isShort,
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
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center font-bold">
              <Youtube className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Thêm video mới vào kênh</h3>
              <p className="text-xs text-slate-400">Dán link video hoặc Shorts vừa tải lên YouTube</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Đường dẫn YouTube (Video hoặc Shorts):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=... hoặc shorts link"
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  setPreviewData(null);
                  setError(null);
                }}
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/70"
              />
              <button
                type="button"
                onClick={handleFetchPreview}
                disabled={isLoadingMeta || !videoUrl.trim()}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                {isLoadingMeta ? 'Đang đọc...' : 'Kiểm tra link'}
              </button>
            </div>
            {error && (
              <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </div>

          {/* Preview Box */}
          {previewData && (
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex gap-3 items-center">
              <img
                src={previewData.thumbnail}
                alt={previewData.title}
                className="w-24 h-16 object-cover rounded-lg flex-shrink-0 bg-slate-800"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white line-clamp-2">{previewData.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{previewData.author}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      previewData.isShort
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {previewData.isShort ? 'YouTube Shorts' : 'Video thông thường'}
                  </span>
                  <span className="text-[10px] text-slate-500">ID: {previewData.id}</span>
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
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500/70"
            >
              <option value="none">Video độc lập (Không thuộc series)</option>
              <option value="Phim cuộc đời đức phật">Series: Phim cuộc đời đức phật</option>
              <option value="Căn nhà bị khóa">Series: Căn nhà bị khóa</option>
              <option value="Truyện ma căn nhà cuối con đường">Series: Truyện ma căn nhà cuối con đường</option>
            </select>
          </div>

          {/* GitHub Actions Tip */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Tự động hóa qua GitHub Actions:
            </p>
            <p className="text-blue-300/80">
              Dự án đã được tích hợp quy trình tự động cập nhật mỗi 4 giờ từ kênh YouTube <b>@minhhieureviewphim</b>. Video thêm thủ công tại đây sẽ được lưu trữ ngay lập tức trên trình duyệt của bạn!
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
              disabled={!previewData}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-red-600/20"
            >
              <Plus className="w-4 h-4" />
              Thêm vào danh sách phát
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
