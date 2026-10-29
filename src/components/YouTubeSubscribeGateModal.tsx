import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Lock,
  Unlock,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Bell,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { getApiBaseUrl, hasBackend } from '../utils/api';

export const MINHHIEU_CHANNEL_URL = 'https://www.youtube.com/@MinhHieuOfficialvn';
export const MINHHIEU_SUBSCRIBE_URL = 'https://www.youtube.com/@MinhHieuOfficialvn?sub_confirmation=1';
export const MINHHIEU_CHANNEL_ID = 'UCUr78N1iiRNyg_UoBgtPPhw';
export const MINHHIEU_CHANNEL_NAME = 'Minh Hiếu Official';
export const MINHHIEU_CHANNEL_AVATAR =
  'https://yt3.googleusercontent.com/IAZc3hD-MjzJAtG3Eainm3ueaTvyalzFYEeBqHm-1rkIbUCmIz9--aemFtvSsV-eQIZS0AS0EQ=s900-c-k-c0x00ffffff-no-rj';

const STORAGE_KEY_YT_SUB_UNLOCKED = 'minhhieu_yt_sub_verified_v1';
const YT_SUB_UNLOCKED_EVENT = 'minhhieu-yt-sub-unlocked-change';

// Minimum dwell time (ms) on YouTube tab so instant close without subscribing is caught
const MIN_YOUTUBE_DWELL_MS = 5500;

export function isYouTubeSubUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_YT_SUB_UNLOCKED);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed && parsed.unlocked === true);
  } catch {
    return false;
  }
}

export function setYouTubeSubUnlocked(method: 'smart_focus' | 'google_oauth' | 'manual_confirm'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY_YT_SUB_UNLOCKED,
      JSON.stringify({
        unlocked: true,
        channel: '@MinhHieuOfficialvn',
        method,
        verifiedAt: Date.now(),
      })
    );
    // Also mark in main app subscribed channels list if present
    const subsRaw = localStorage.getItem('casttube_subscribed_channels');
    const subs: string[] = subsRaw ? JSON.parse(subsRaw) : [];
    if (!subs.includes('Minh Hiếu review phim')) {
      subs.push('Minh Hiếu review phim');
      localStorage.setItem('casttube_subscribed_channels', JSON.stringify(subs));
    }
    window.dispatchEvent(new CustomEvent(YT_SUB_UNLOCKED_EVENT, { detail: { unlocked: true } }));
  } catch {}
}

export function subscribeYouTubeUnlockState(cb: (unlocked: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb(isYouTubeSubUnlocked());
  window.addEventListener(YT_SUB_UNLOCKED_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(YT_SUB_UNLOCKED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

interface YouTubeSubscribeGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlocked: () => void;
  onOpenAdminLogin?: () => void;
  onShowToast?: (msg: string) => void;
  initialWaiting?: boolean;
}

type GateStep = 'idle' | 'waiting_youtube' | 'too_fast' | 'verifying' | 'unlocked';

export const YouTubeSubscribeGateModal: React.FC<YouTubeSubscribeGateModalProps> = ({
  isOpen,
  onClose,
  onUnlocked,
  onOpenAdminLogin,
  onShowToast,
  initialWaiting = false,
}) => {
  const [step, setStep] = useState<GateStep>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [googleClientId, setGoogleClientId] = useState<string>(
    () => (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || ''
  );
  const [isVerifyingOAuth, setIsVerifyingOAuth] = useState<boolean>(false);

  const clickedSubscribeAtRef = useRef<number | null>(null);
  const leftWindowAtRef = useRef<number | null>(null);
  const completedRef = useRef<boolean>(false);

  // Check if backend provides a Google OAuth Client ID for 100% API verification
  useEffect(() => {
    if (!isOpen) return;
    setStep(initialWaiting ? 'waiting_youtube' : 'idle');
    setStatusMessage('');
    setElapsedSec(0);
    clickedSubscribeAtRef.current = initialWaiting ? Date.now() : null;
    leftWindowAtRef.current = null;
    completedRef.current = false;

    if (!googleClientId && hasBackend()) {
      const apiBase = getApiBaseUrl();
      if (apiBase) {
        fetch(`${apiBase}youtube/sub-gate-config`)
          .then((r) => (r.ok ? r.json() : null))
          .then((cfg) => {
            if (cfg?.googleClientId) {
              setGoogleClientId(String(cfg.googleClientId));
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen]);

  const completeUnlock = (method: 'smart_focus' | 'google_oauth' | 'manual_confirm') => {
    if (completedRef.current) return;
    completedRef.current = true;
    setStep('unlocked');
    setYouTubeSubUnlocked(method);
    if (onShowToast) {
      onShowToast('Đã mở khóa tải video! Cảm ơn bạn đã đăng ký kênh @MinhHieuOfficialvn.');
    }
    setTimeout(() => {
      onClose();
      onUnlocked();
    }, 650);
  };

  // Automatic tab switch + dwell time verification when user opens YouTube channel to subscribe
  useEffect(() => {
    if (!isOpen || (step !== 'waiting_youtube' && step !== 'too_fast')) return;

    const timer = setInterval(() => {
      if (clickedSubscribeAtRef.current) {
        setElapsedSec(Math.floor((Date.now() - clickedSubscribeAtRef.current) / 1000));
      }
    }, 500);

    const handleLeave = () => {
      if (!leftWindowAtRef.current) {
        leftWindowAtRef.current = Date.now();
      }
    };

    const handleReturn = () => {
      if (!clickedSubscribeAtRef.current || completedRef.current) return;
      const refStart = leftWindowAtRef.current || clickedSubscribeAtRef.current;
      const awayDuration = Date.now() - refStart;

      if (awayDuration < MIN_YOUTUBE_DWELL_MS) {
        leftWindowAtRef.current = null;
        setStep('too_fast');
        setStatusMessage(
          'Bạn quay lại quá nhanh khi chưa kịp nhấn nút Đăng ký trên YouTube. Vui lòng mở kênh và nhấn Đăng ký để mở khóa tự động!'
        );
        return;
      }

      setStep('verifying');
      setStatusMessage('Đang tự động xác nhận trạng thái đăng ký kênh @MinhHieuOfficialvn...');
      setTimeout(() => {
        completeUnlock('smart_focus');
      }, 1400);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleLeave();
      } else if (document.visibilityState === 'visible') {
        handleReturn();
      }
    };

    window.addEventListener('blur', handleLeave);
    window.addEventListener('focus', handleReturn);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(timer);
      window.removeEventListener('blur', handleLeave);
      window.removeEventListener('focus', handleReturn);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isOpen, step]);

  // 100% Google OAuth YouTube Data API v3 check (when GOOGLE_CLIENT_ID is configured)
  const handleVerifyViaGoogleOAuth = async () => {
    if (!googleClientId || isVerifyingOAuth) return;
    setIsVerifyingOAuth(true);
    setStatusMessage('');

    try {
      // Dynamically load Google Identity Services if not loaded
      if (!(window as any).google?.accounts?.oauth2) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
          if (existing) {
            existing.addEventListener('load', () => resolve());
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Không thể tải thư viện xác thực Google.'));
          document.head.appendChild(script);
        });
      }

      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'https://www.googleapis.com/auth/youtube.readonly',
        callback: async (tokenResponse: any) => {
          if (tokenResponse?.error || !tokenResponse?.access_token) {
            setIsVerifyingOAuth(false);
            setStatusMessage('Bạn đã hủy xác thực Google. Bạn vẫn có thể nhấn nút Đăng ký kênh ở trên để mở khóa.');
            return;
          }

          try {
            const apiBase = getApiBaseUrl() || '/api/';
            const verifyRes = await fetch(`${apiBase}youtube/verify-subscription`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokenResponse.access_token}`,
              },
            });
            const data = await verifyRes.json();
            if (data?.verified) {
              completeUnlock('google_oauth');
            } else {
              setStep('too_fast');
              setStatusMessage(
                'Tài khoản Google của bạn hiện chưa đăng ký kênh @MinhHieuOfficialvn. Hãy nhấn nút Đăng ký bên dưới rồi xác nhận lại nhé!'
              );
            }
          } catch {
            setStatusMessage('Không thể kiểm tra qua Google API lúc này. Vui lòng nhấn nút Đăng ký kênh bên dưới.');
          } finally {
            setIsVerifyingOAuth(false);
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      setIsVerifyingOAuth(false);
      setStatusMessage(err?.message || 'Lỗi khởi tạo xác thực Google.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 flex items-center justify-center">
              {step === 'unlocked' ? (
                <Unlock className="w-4 h-4 text-emerald-400" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white">
                Mở Khóa Tải Video Không Logo
              </h3>
              <p className="text-[11px] text-slate-400">
                Đăng ký kênh YouTube ủng hộ để tải miễn phí không giới hạn
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Channel Preview Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3.5">
            <img
              src={MINHHIEU_CHANNEL_AVATAR}
              alt={MINHHIEU_CHANNEL_NAME}
              referrerPolicy="no-referrer"
              className="w-13 h-13 rounded-2xl object-cover border-2 border-red-500/40 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-white truncate">
                  {MINHHIEU_CHANNEL_NAME}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
              </div>
              <p className="text-xs font-mono text-amber-400 truncate">@MinhHieuOfficialvn</p>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{MINHHIEU_CHANNEL_URL}</p>
            </div>
          </div>

          {/* Step Status Feedback */}
          {step === 'idle' && (
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/90 text-xs text-slate-300 leading-relaxed">
              Nhấn nút <strong className="text-white">Đăng ký kênh @MinhHieuOfficialvn</strong> bên dưới và bấm{' '}
              <strong className="text-red-400">Đăng ký (Subscribe)</strong> trên YouTube. Khi bạn quay lại tab này, hệ thống sẽ{' '}
              <strong className="text-emerald-400">tự động nhận diện và tải video ngay</strong>!
            </div>
          )}

          {step === 'waiting_youtube' && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-300">
                  Đang chờ bạn nhấn Đăng ký trên tab YouTube...
                </p>
                <p className="text-[11px] text-amber-200/80">
                  Sau khi nhấn <strong>Đăng ký</strong> trên kênh <strong>@MinhHieuOfficialvn</strong>, hãy quay lại trang này — hệ thống sẽ tự động mở khóa!
                </p>
              </div>
            </div>
          )}

          {step === 'too_fast' && statusMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          {step === 'verifying' && (
            <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center gap-3 text-xs text-cyan-200">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
              <span className="font-semibold">
                {statusMessage || 'Đang tự động kiểm tra trạng thái đăng ký kênh...'}
              </span>
            </div>
          )}

          {step === 'unlocked' && (
            <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 flex items-center gap-3 text-xs text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-bold">
                Xác nhận thành công! Đang bắt đầu tải video cho bạn...
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <a
              href={MINHHIEU_SUBSCRIBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                clickedSubscribeAtRef.current = Date.now();
                leftWindowAtRef.current = null;
                setStep('waiting_youtube');
                setStatusMessage('');
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 transition-all active:scale-95"
            >
              <Bell className="w-4 h-4 fill-current" />
              <span>
                {step === 'waiting_youtube' || step === 'too_fast'
                  ? 'Mở lại kênh @MinhHieuOfficialvn để Đăng Ký'
                  : 'Đăng Ký Kênh @MinhHieuOfficialvn'}
              </span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            {/* Fallback button if user opened YouTube in split-screen where tab blur didn't fire */}
            {step === 'waiting_youtube' && elapsedSec >= 8 && (
              <button
                type="button"
                onClick={() => {
                  setStep('verifying');
                  setTimeout(() => completeUnlock('manual_confirm'), 1000);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Tôi đã nhấn Đăng ký kênh — Mở khóa &amp; Tải ngay</span>
              </button>
            )}

            {/* Optional 100% Google OAuth API Check if GOOGLE_CLIENT_ID is configured */}
            {googleClientId && step !== 'unlocked' && (
              <button
                type="button"
                onClick={handleVerifyViaGoogleOAuth}
                disabled={isVerifyingOAuth}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isVerifyingOAuth ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                )}
                <span>Xác thực tự động bằng tài khoản Google (YouTube API)</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer: Admin quick login bypass */}
        <div className="px-6 py-3 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Chỉ cần đăng ký 1 lần duy nhất</span>
          {onOpenAdminLogin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdminLogin();
              }}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <KeyRound className="w-3 h-3" />
              <span>Quản trị viên (Admin)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
