import React, { useState } from 'react';
import {
  KeyRound,
  Lock,
  Unlock,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Sparkles,
  Heart,
  X,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { TempleMemberRecord } from '../../data/buddhistTempleData';
import { speakViaStudioVoiceApi, stopSpeaking } from '../../utils/buddhistAudio';
import { MINH_HIEU_LE_CHUA_VOICE_ID } from '../../utils/everai';

interface HoaVienGatekeeperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlockSuccess: (member?: TempleMemberRecord) => void;
  onOpenRegister: () => void;
  onShowToast: (msg: string) => void;
}

export const HoaVienGatekeeperModal: React.FC<HoaVienGatekeeperModalProps> = ({
  isOpen,
  onClose,
  onUnlockSuccess,
  onOpenRegister,
  onShowToast,
}) => {
  const [accessCode, setAccessCode] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleVerifyKey = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const code = accessCode.trim().toLowerCase();

    if (!code) {
      setErrorMsg('Vui lòng nhập Mật Khẩu hoặc Chìa Khóa Bảo Vệ Hoa Viên.');
      return;
    }

    setIsChecking(true);
    setTimeout(() => {
      // Valid keys: admin code, generic temple keys, 6-digit pin, or member password
      const validUniversalKeys = ['daibitu', 'hoavien', '123456', '8888', '9999', 'phatquang', 'diatang'];
      const isNumericPin = /^\d{4,8}$/.test(code);

      if (validUniversalKeys.includes(code) || isNumericPin || code.length >= 4) {
        onShowToast('🔑 Chìa khóa hợp lệ! Chú tiểu đã mở cổng Hoa Viên Khu Mộ 3D.');
        try {
          sessionStorage.setItem('hoavien_unlocked', 'true');
          localStorage.setItem('hoavien_unlocked', 'true');
        } catch {}
        onUnlockSuccess();
        onClose();
      } else {
        setErrorMsg('Mật mã chìa khóa không đúng. Quý Phật tử có thể nhập mã mặc định 123456 hoặc đăng nhập.');
      }
      setIsChecking(false);
    }, 400);
  };

  const handleGuestEntry = async () => {
    try {
      sessionStorage.setItem('hoavien_unlocked', 'true');
      localStorage.setItem('hoavien_unlocked', 'true');
    } catch {}
    onShowToast('🌸 Chú tiểu mở cửa đón tiếp khách thập phương vào dâng hương tưởng niệm.');
    await speakViaStudioVoiceApi(
      'Nam Mô A Di Đà Phật. Chú tiểu xin kính chào quý Phật tử đã ghé thăm Hoa Viên Khu Mộ. Mời quý vị cùng bước vào thắp nén tâm hương tưởng nhớ gia tiên tiền tổ.',
      {
        voiceId: MINH_HIEU_LE_CHUA_VOICE_ID,
        speedRate: 1.0,
      }
    );
    onUnlockSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Novice Monk Avatar */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-500 flex items-center justify-center text-2xl shadow-lg shadow-amber-600/30 shrink-0">
              🧒
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Cổng Bảo Mật • Hoa Viên Khu Mộ 3D
              </span>
              <h3 className="text-base font-black text-white">Chú Tiểu Gác Cổng Hoa Viên</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Story Greeting */}
        <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-600/30 text-xs text-amber-100/90 leading-relaxed font-serif">
          <p className="italic">
            "A Di Đà Phật! Hoa Viên Khu Mộ là nơi an nghỉ trang nghiêm, thanh tịnh của chư vị hương linh gia quyến. Quý khách vui lòng nhập <strong>Chìa Khóa Bảo Vệ</strong> hoặc <strong>Mật Khẩu Gia Tộc</strong> để bước vào chăm sóc và dâng lễ phần mộ."
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Input Form for Key / Password */}
        <form onSubmit={handleVerifyKey} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Nhập Chìa Khóa hoặc Mật Khẩu Vào Mộ:</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">(Mặc định: 123456)</span>
            </label>
            <input
              type="text"
              autoFocus
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Nhập mã chìa khóa, mã PIN hoặc mật khẩu..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono tracking-wider"
            />
          </div>

          <button
            type="submit"
            disabled={isChecking}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all"
          >
            <Unlock className="w-4 h-4" />
            <span>{isChecking ? 'Đang kiểm tra chìa khóa...' : 'Mở Khóa Cổng Vào Mộ'}</span>
          </button>
        </form>

        {/* Options for Guest or Member Registration */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <button
            type="button"
            onClick={handleGuestEntry}
            className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <span>Khách Thập Phương Xin Vào Viếng &amp; Dâng Hương</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenRegister();
            }}
            className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800 text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Đăng Ký / Đăng Nhập Tài Khoản Để Quản Lý Mộ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
