import React, { useState } from 'react';
import {
  X,
  Github,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  RefreshCw,
  Rss,
  Terminal,
  ShieldCheck,
  ChevronRight,
  Info,
  Mail,
} from 'lucide-react';

interface GithubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerCheck: () => void;
  isChecking: boolean;
  totalVideos: number;
  lastCheckedTime: string;
}

export const GithubSyncModal: React.FC<GithubSyncModalProps> = ({
  isOpen,
  onClose,
  onTriggerCheck,
  isChecking,
  totalVideos,
  lastCheckedTime,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const studoUrl = 'https://dominhhieuqng1985-blip.github.io/minhhieu/studo.xml';
  const studioUrl = 'https://dominhhieuqng1985-blip.github.io/minhhieu/studio.xml';
  const ownerEmail = 'chieuthuaroi19852@gmail.com';
  const repoUrl = 'https://github.com/dominhhieuqng1985-blip/minhhieu';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Trạng thái Đồng bộ Video &amp; GitHub</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {totalVideos} video
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Kiểm tra tự động, giải đáp nguyên nhân và cách kích hoạt tự động cập nhật
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto text-xs text-slate-300">
          {/* Quick Action & Status Bar */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Lần kiểm tra gần nhất: {lastCheckedTime}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Web tự động quét nguồn cấp RSS YouTube và file <code className="text-amber-300 font-mono">studo.xml</code> khi khởi động.
              </p>
            </div>
            <button
              onClick={onTriggerCheck}
              disabled={isChecking}
              className="px-4 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shrink-0 shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Đang quét YouTube...' : 'Quét video mới ngay'}</span>
            </button>
          </div>

          {/* RSS Feed & Email Owner Section */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/20 via-slate-900/80 to-slate-950 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
                <Rss className="w-4 h-4" />
                Nguồn cấp dữ liệu Podcast RSS Feed
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Đã kèm Email Chủ sở hữu
              </span>
            </div>

            {/* Email Owner Box */}
            <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  Email chủ sở hữu (Owner Email):
                </span>
                <button
                  onClick={() => copyToClipboard(ownerEmail, 'email')}
                  className="p-1 rounded text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1 text-[11px]"
                >
                  {copiedKey === 'email' ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Đã chép
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy className="w-3 h-3" /> Chép email
                    </span>
                  )}
                </button>
              </div>
              <div className="font-mono text-xs text-amber-300 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 flex items-center justify-between">
                <span>{ownerEmail}</span>
                <span className="text-[10px] text-slate-400 font-sans">
                  &lt;itunes:email&gt; &amp; &lt;managingEditor&gt;
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <strong className="text-slate-200">Tại sao nền tảng báo cần email?</strong> YouTube Studio Podcast, Spotify và Apple Podcasts kiểm tra thẻ này để gửi <span className="text-amber-300 font-semibold">Mã xác minh (OTP) 6 chữ số</span> về hộp thư nhằm chứng minh bạn chính là chủ sở hữu của kênh podcast.
              </p>
            </div>

            {/* Link 1: studo.xml */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-300">Link 1: studo.xml (Link mặc định):</span>
                <a
                  href={studoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline flex items-center gap-1"
                >
                  <span>Mở xem XML</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="font-mono text-[11px] text-slate-200 break-all select-all flex-1">
                  {studoUrl}
                </span>
                <button
                  onClick={() => copyToClipboard(studoUrl, 'studo')}
                  className="p-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 shrink-0 font-semibold flex items-center gap-1 text-[11px] transition-colors"
                  title="Sao chép URL"
                >
                  {copiedKey === 'studo' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Link 2: studio.xml */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-300">Link 2: studio.xml (Dự phòng nếu link 1 bị lưu cache cũ):</span>
                <a
                  href={studioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline flex items-center gap-1"
                >
                  <span>Mở xem XML</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="font-mono text-[11px] text-slate-200 break-all select-all flex-1">
                  {studioUrl}
                </span>
                <button
                  onClick={() => copyToClipboard(studioUrl, 'studio')}
                  className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 font-semibold flex items-center gap-1 text-[11px] transition-colors border border-slate-700"
                  title="Sao chép URL"
                >
                  {copiedKey === 'studio' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-200/90 leading-relaxed space-y-1.5">
              <p className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Cách tạo Podcast CHUẨN NHẤT trên YouTube Studio (Không cần RSS feed):</span>
              </p>
              <p className="text-slate-300">
                Vì toàn bộ video của bạn <strong>đã có sẵn trên YouTube</strong>, YouTube Studio có sẵn tính năng tạo Podcast trực tiếp mà không cần gửi RSS:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
                <li>Vào <strong className="text-white">YouTube Studio</strong> &gt; Bấm nút <strong className="text-amber-400">Tạo</strong> (góc trên bên phải).</li>
                <li>Chọn <strong className="text-white">Podcast mới</strong>.</li>
                <li>Chọn tùy chọn: <strong className="text-emerald-400">"Đặt một danh sách phát hiện có làm podcast"</strong> (thay vì "Gửi nguồn cấp dữ liệu RSS").</li>
                <li>Chọn Danh sách phát (Playlist) video của bạn &gt; Nhấn <strong className="text-white">Lưu</strong>.</li>
              </ol>
              <p className="text-[10px] text-emerald-300/80 italic">
                👉 Kênh YouTube của bạn sẽ có ngay tab Podcast chính thức và phát trên YouTube Music tức thì mà không bao giờ bị báo lỗi!
              </p>
            </div>
          </div>

          {/* Why GitHub doesn't sync automatically & Fixes */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Tại sao video mới chưa tự động đẩy lên repository GitHub?</span>
            </h4>

            <div className="space-y-3">
              {/* Step 1: Permission */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-200">
                      Bật quyền ghi (Read and write permissions) cho GitHub Actions
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Mặc định GitHub cài quyền cho Actions là <span className="text-rose-400 font-mono">Read-only</span> (chỉ đọc). Khi workflow tải video mới về và chuẩn bị lưu commit đẩy lên nhánh main, GitHub sẽ chặn lại nếu chưa bật quyền ghi.
                    </p>
                    <div className="mt-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] space-y-1 text-slate-300">
                      <p className="font-semibold text-amber-400">Cách bật trong 30 giây:</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-slate-300">
                        <li>Vào repository GitHub của bạn: <a href={`${repoUrl}/settings/actions`} target="_blank" rel="noopener noreferrer" className="text-amber-400 underline">{repoUrl}/settings/actions</a></li>
                        <li>Tại cột trái chọn <strong className="text-white">Actions</strong> &gt; <strong className="text-white">General</strong></li>
                        <li>Kéo xuống mục <strong className="text-white">Workflow permissions</strong></li>
                        <li>Tích chọn <strong className="text-emerald-400">"Read and write permissions"</strong></li>
                        <li>Tích chọn <strong className="text-emerald-400">"Allow GitHub Actions to create and approve pull requests"</strong></li>
                        <li>Bấm nút <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded">Save</strong></li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Trigger manually */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-200">
                      Chạy kích hoạt ngay trên tab Actions (Run workflow)
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Lịch tự động (<code className="text-amber-300 font-mono">cron: 0 */4 * * *</code>) sẽ chạy mỗi 4 tiếng. Nếu bạn vừa đăng video mới lên YouTube và muốn đồng bộ ngay lập tức mà không phải chờ:
                    </p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <a
                        href={`${repoUrl}/actions`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors text-[11px]"
                      >
                        <ExternalLink className="w-3 h-3 text-amber-400" />
                        <span>Mở GitHub Actions</span>
                      </a>
                      <span className="text-[11px] text-slate-400">
                        Chọn workflow <strong className="text-white">Deploy to GitHub Pages</strong> &gt; bấm <strong className="text-emerald-400">Run workflow</strong>!
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Local script */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="font-bold text-slate-200">
                      Hoặc chạy trực tiếp trên máy bằng dòng lệnh
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Nếu bạn đang mở source code trên máy tính, chỉ cần chạy một lệnh để tải toàn bộ video và sinh lại file <code className="text-amber-300 font-mono">studo.xml</code>:
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px]">
                      <span className="text-emerald-400 select-all">node scripts/sync-channel.cjs</span>
                      <button
                        onClick={() => copyToClipboard('node scripts/sync-channel.cjs', 'cmd')}
                        className="p-1 rounded text-slate-400 hover:text-amber-400 transition-colors"
                        title="Sao chép lệnh"
                      >
                        {copiedKey === 'cmd' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Workflow đã được tối ưu hóa đầy đủ để tự động commit &amp; push</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
