import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Volume2,
  Globe,
  MapPin,
  User,
  Tag,
  ShieldCheck,
  Info,
  HelpCircle,
  FileText,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { EverAiVoice, EVERAI_VOICES } from '../utils/everai';

interface VoiceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customVoices: EverAiVoice[];
  onSaveVoice: (voice: Partial<EverAiVoice> & { id: string; name: string }) => void;
  onDeleteVoice: (id: string) => void;
  onSelectVoice: (id: string) => void;
  currentSelectedVoiceId?: string;
  onShowToast: (msg: string) => void;
}

const REGION_PRESETS = [
  'Miền Nam',
  'Miền Bắc',
  'Miền Trung',
  'Thuyết pháp & Đạo lý',
  'Review phim & Kịch bản',
  'Phát thanh viên',
];

const COUNTRY_PRESETS = ['Việt Nam', 'Hoa Kỳ (US)', 'Nhật Bản', 'Hàn Quốc', 'Anh Quốc (UK)'];

export const VoiceManagerModal: React.FC<VoiceManagerModalProps> = ({
  isOpen,
  onClose,
  customVoices,
  onSaveVoice,
  onDeleteVoice,
  onSelectVoice,
  currentSelectedVoiceId,
  onShowToast,
}) => {
  // Form State
  const [voiceId, setVoiceId] = useState<string>('');
  const [voiceName, setVoiceName] = useState<string>('');
  const [region, setRegion] = useState<string>('Miền Nam');
  const [gender, setGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [country, setCountry] = useState<string>('Việt Nam');
  const [description, setDescription] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSystemVoicesRef, setShowSystemVoicesRef] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Fill sample voice requested by user: voice-74bb4b22-98a7-41a4
  const handleLoadSampleVoice = () => {
    setVoiceId('voice-74bb4b22-98a7-41a4');
    setVoiceName('Minh Hiếu - Đạo Lý & Review Phim');
    setRegion('Thuyết pháp & Đạo lý');
    setGender('Nam');
    setCountry('Việt Nam');
    setDescription('Giọng đọc truyền cảm, ấm áp, sâu sắc phù hợp đọc kinh kệ, đạo lý và lời bình phim');
    setEditingId(null);
    onShowToast('✨ Đã nạp mẫu ID voice-74bb4b22-98a7-41a4 vào biểu mẫu!');
  };

  // Reset Form
  const handleResetForm = () => {
    setVoiceId('');
    setVoiceName('');
    setRegion('Miền Nam');
    setGender('Nam');
    setCountry('Việt Nam');
    setDescription('');
    setEditingId(null);
  };

  // Populate form to edit an existing voice
  const handleEditVoice = (v: EverAiVoice) => {
    setVoiceId(v.id);
    setVoiceName(v.name);
    setRegion(v.region);
    setGender(v.gender === 'Nữ' || v.gender === 'Female' ? 'Nữ' : 'Nam');
    setCountry(v.language || 'Việt Nam');
    setDescription(v.description || '');
    setEditingId(v.id);
    // Scroll form into view
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onShowToast(`✏️ Đang sửa thông tin giọng "${v.name}"`);
  };

  // Save Voice
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = voiceId.trim();
    const cleanName = voiceName.trim();

    if (!cleanId) {
      onShowToast('⚠️ Vui lòng nhập Mã ID Giọng Nói (ví dụ: voice-74bb4b22-98a7-41a4)');
      return;
    }
    if (!cleanName) {
      onShowToast('⚠️ Vui lòng nhập Tên Giọng Nói');
      return;
    }

    onSaveVoice({
      id: cleanId,
      name: cleanName,
      region: region.trim() || 'Tùy chỉnh',
      gender,
      language: country.trim() || 'Việt Nam',
      description:
        description.trim() ||
        `Giọng đọc tùy chỉnh ${gender === 'Nam' ? 'Nam' : 'Nữ'} (${region.trim()}, ${country.trim()})`,
      cost: '1000 credits',
      isCustom: true,
    });

    onShowToast(`🎉 Đã lưu vĩnh viễn giọng "${cleanName}" (${cleanId})!`);
    handleResetForm();
  };

  // Copy ID helper
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    onShowToast(`📋 Đã sao chép mã voice ID: ${id}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-4xl rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sliders className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Cài Đặt &amp; Quản Lý Giọng Đọc AI
                </h2>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Lưu vĩnh viễn
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Thêm giọng nói EverAI theo ID (ví dụ: <code className="text-amber-300 font-mono">voice-74bb4b22-98a7-41a4</code>), vùng miền, nam/nữ, quốc gia và lưu lại vĩnh viễn.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* Quick Helper Banner */}
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs text-indigo-200">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300">Cách cài đặt giọng mới:</span> Điền mã <code className="bg-slate-950/80 px-1.5 py-0.5 rounded text-indigo-300 font-mono">voice-xxxx</code>, tên giọng, vùng miền, giới tính nam/nữ và quốc gia. Dữ liệu được lưu vĩnh viễn trong trình duyệt.
              </div>
            </div>
            <button
              type="button"
              onClick={handleLoadSampleVoice}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/30"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Nạp mẫu voice-74bb4b22-98a7-41a4</span>
            </button>
          </div>

          {/* Form: Add or Edit Voice */}
          <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>{editingId ? `Cập Nhật Giọng Nói [${editingId}]` : 'Thêm Giọng Nói Mới'}</span>
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs text-slate-400 hover:text-white underline underline-offset-2"
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </div>

            {/* Row 1: Voice ID & Voice Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field 1: Voice ID (Most Important) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Mã ID Giọng Nói (voice_code) <span className="text-rose-400">*</span></span>
                  </span>
                  <span className="text-[11px] text-amber-400 font-normal">Quan trọng nhất</span>
                </label>
                <input
                  type="text"
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  placeholder="Ví dụ: voice-74bb4b22-98a7-41a4"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Mã định danh ID dùng để gọi API tổng hợp giọng đọc EverAI.
                </p>
              </div>

              {/* Field 2: Voice Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tên Giọng Nói <span className="text-rose-400">*</span></span>
                </label>
                <input
                  type="text"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="Ví dụ: Giọng Giảng Đạo Minh Hiếu / Kiều Nhi"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Tên hiển thị thân thiện trong danh sách chọn giọng.
                </p>
              </div>
            </div>

            {/* Row 2: Region, Gender, Country */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Field 3: Region / Dialect */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>Vùng Miền <span className="text-rose-400">*</span></span>
                </label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Ví dụ: Miền Nam, Miền Bắc, Đạo lý..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {REGION_PRESETS.slice(0, 3).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRegion(r)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 4: Gender (Nam / Nữ) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Giới Tính (Nam / Nữ) <span className="text-rose-400">*</span></span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender('Nam')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                      gender === 'Nam'
                        ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>👨 Nam</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('Nữ')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                      gender === 'Nữ'
                        ? 'bg-pink-600/30 border-pink-500 text-pink-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>👩 Nữ</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Đặc tính âm sắc giới tính của giọng đọc.
                </p>
              </div>

              {/* Field 5: Country */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quốc Gia <span className="text-rose-400">*</span></span>
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Ví dụ: Việt Nam, Hoa Kỳ..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {COUNTRY_PRESETS.slice(0, 3).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCountry(c)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 3: Description (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>Mô Tả / Ghi Chú Giọng Đọc (Tùy chọn)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ví dụ: Giọng trầm ấm, nhấn nhá kịch tính cho review phim hoặc kinh kệ..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Làm mới
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>💾 {editingId ? 'Cập Nhật Giọng Nói' : 'Lưu Giọng Nói Vĩnh Viễn'}</span>
              </button>
            </div>
          </form>

          {/* Section 2: List of Saved Custom Voices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Danh Sách Giọng Nói Đã Cài Đặt Của Bạn</span>
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  {customVoices.length}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Được lưu vĩnh viễn trên trình duyệt này
              </span>
            </div>

            {customVoices.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/50 border border-dashed border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                  <Volume2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-300">
                  Bạn chưa lưu giọng đọc tùy chỉnh nào
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Hãy điền mã ID giọng (như <code className="text-amber-300 font-mono">voice-74bb4b22-98a7-41a4</code>) vào form bên trên để thêm và lưu lại vĩnh viễn.
                </p>
                <button
                  type="button"
                  onClick={handleLoadSampleVoice}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-indigo-300 font-semibold inline-flex items-center gap-2 transition-colors border border-slate-700"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Nạp thử giọng mẫu ngay</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {customVoices.map((v) => {
                  const isSelected = currentSelectedVoiceId === v.id;
                  return (
                    <div
                      key={v.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-950/50'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {v.name}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Đang chọn
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                            {v.description || 'Giọng đọc tùy chỉnh'}
                          </p>
                        </div>
                      </div>

                      {/* Badges: Gender, Region, Country */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold border ${
                            v.gender === 'Nữ' || v.gender === 'Female'
                              ? 'bg-pink-500/10 text-pink-300 border-pink-500/20'
                              : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                          }`}
                        >
                          {v.gender === 'Nữ' || v.gender === 'Female' ? '👩 Nữ' : '👨 Nam'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800">
                          📍 {v.region}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800">
                          🌐 {v.language}
                        </span>
                      </div>

                      {/* ID with Copy button */}
                      <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs font-mono">
                        <span className="text-indigo-300 truncate mr-2 select-all">
                          {v.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyId(v.id)}
                          className="shrink-0 p-1 text-slate-400 hover:text-white transition-colors"
                          title="Sao chép ID"
                        >
                          {copiedId === v.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-1 flex items-center justify-between border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => handleEditVoice(v)}
                          className="text-xs text-slate-400 hover:text-indigo-300 transition-colors"
                        >
                          ✏️ Sửa
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn giọng "${v.name}" (${v.id})?`)) {
                                onDeleteVoice(v.id);
                                onShowToast(`🗑️ Đã xóa giọng "${v.name}"`);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 text-xs font-medium border border-rose-800/50 flex items-center gap-1 transition-colors"
                            title="Xóa vĩnh viễn giọng này"
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                            <span>Xóa</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onSelectVoice(v.id);
                              onShowToast(`🎧 Đã chọn giọng "${v.name}" cho phòng thu!`);
                              onClose();
                            }}
                            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm"
                          >
                            Dùng giọng này
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Collapsible Section: Default System Voices Reference */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <button
              type="button"
              onClick={() => setShowSystemVoicesRef(!showSystemVoicesRef)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400" />
                <span>Xem danh sách giọng hệ thống có sẵn để tham khảo mã ID ({EVERAI_VOICES.length} giọng)</span>
              </div>
              <span className="text-[11px] text-indigo-400">
                {showSystemVoicesRef ? 'Thu gọn ▲' : 'Mở rộng ▼'}
              </span>
            </button>

            {showSystemVoicesRef && (
              <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {EVERAI_VOICES.map((sv) => (
                  <div
                    key={sv.id}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">
                        {sv.name} ({sv.gender} - {sv.region})
                      </div>
                      <code className="text-[11px] text-indigo-300 font-mono">{sv.id}</code>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyId(sv.id)}
                      className="text-slate-400 hover:text-white p-1"
                      title="Sao chép ID"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Dữ liệu được lưu vĩnh viễn trong LocalStorage của máy bạn.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
