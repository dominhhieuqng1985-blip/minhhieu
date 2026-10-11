import React, { useState } from 'react';
import {
  Bookmark,
  Plus,
  Trash2,
  Clock,
  Download,
  Share2,
  Check,
  FileText,
} from 'lucide-react';
import { PodcastNote, PodcastEpisode } from '../types/podcast';
import { formatSeconds } from '../utils/youtube';

interface TimecodedNotesPanelProps {
  episode: PodcastEpisode;
  notes: PodcastNote[];
  currentTimeSeconds: number;
  onAddNote: (timestamp: number, text: string) => void;
  onDeleteNote: (noteId: string) => void;
  onSeekToTime: (seconds: number) => void;
}

export const TimecodedNotesPanel: React.FC<TimecodedNotesPanelProps> = ({
  episode,
  notes,
  currentTimeSeconds,
  onAddNote,
  onDeleteNote,
  onSeekToTime,
}) => {
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [selectedTimestamp, setSelectedTimestamp] = useState<number>(currentTimeSeconds);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync timestamp when opening or typing if user wants current point
  const handleCaptureCurrentTime = () => {
    setSelectedTimestamp(Math.floor(currentTimeSeconds));
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    onAddNote(selectedTimestamp, newNoteText.trim());
    setNewNoteText('');
  };

  const episodeNotes = notes.filter((n) => n.episodeId === episode.id);

  const exportAsMarkdown = () => {
    if (episodeNotes.length === 0) return;

    let md = `# Ghi chú Podcast: ${episode.title}\n`;
    md += `Host / Kênh: ${episode.channel}\n`;
    md += `Liên kết YouTube: https://www.youtube.com/watch?v=${episode.youtubeId}\n\n`;
    md += `## Danh sách mốc thời gian & Ghi chú\n`;

    episodeNotes
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach((n) => {
        md += `- **[${n.formattedTime}]**: ${n.content}\n`;
      });

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Ghi Chú Có Timestamp
            </h3>
            <p className="text-xs text-slate-400">
              {episodeNotes.length} ghi chú cho tập này
            </p>
          </div>
        </div>

        {episodeNotes.length > 0 && (
          <button
            onClick={exportAsMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700/60 transition-colors"
            title="Sao chép toàn bộ ghi chú dạng Markdown"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Đã sao chép</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Markdown</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Add note input form */}
      <form onSubmit={handleCreateNote} className="mt-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Ghi lại khoảnh khắc hoặc ý tưởng đắt giá:</span>
          <button
            type="button"
            onClick={handleCaptureCurrentTime}
            className="flex items-center gap-1 text-amber-400 hover:underline font-mono"
          >
            <Clock className="w-3 h-3" />
            <span>Chốt mốc [{formatSeconds(selectedTimestamp)}]</span>
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder={`Nội dung ghi chú tại [${formatSeconds(selectedTimestamp)}]...`}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={!newNoteText.trim()}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold rounded-xl text-xs flex items-center gap-1 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Lưu</span>
          </button>
        </div>
      </form>

      {/* Notes List */}
      <div className="mt-4 flex-1 max-h-72 overflow-y-auto space-y-2 pr-1">
        {episodeNotes.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800/80 rounded-xl">
            <FileText className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
            <span>Chưa có ghi chú nào cho tập này. Nhấn nút "Ghi chú" trên thanh điều khiển hoặc nhập vào ô trên để đánh dấu những khoảnh khắc hay!</span>
          </div>
        ) : (
          episodeNotes
            .sort((a, b) => a.timestamp - b.timestamp)
            .map((note) => (
              <div
                key={note.id}
                className="group flex items-start justify-between p-3 bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 rounded-xl transition-all gap-3"
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <button
                    onClick={() => onSeekToTime(note.timestamp)}
                    className="mt-0.5 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-xs font-mono font-semibold rounded shrink-0 transition-colors"
                    title="Nhấp để nghe lại từ mốc này"
                  >
                    ▶ {note.formattedTime}
                  </button>
                  <p className="text-xs text-slate-300 leading-relaxed break-words">
                    {note.content}
                  </p>
                </div>

                <button
                  onClick={() => onDeleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 rounded transition-all"
                  title="Xóa ghi chú"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
        )}
      </div>
    </div>
  );
};
