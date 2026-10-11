import React, { useState } from 'react';
import { Volume2, Sparkles, Copy, Check, Play, RefreshCw, Layers } from 'lucide-react';
import { AppLanguage } from '../types';
import { soundFx, speakText } from '../utils/audio';

interface HeroSectionProps {
  appLang: AppLanguage;
  onRunDiagnostics: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ appLang, onRunDiagnostics }) => {
  const [displayText, setDisplayText] = useState<string>(
    appLang === 'vi' ? 'Xin chào, Thế giới!' : 'Hello, World!'
  );
  const [fontMode, setFontMode] = useState<'sans' | 'mono' | 'serif' | 'display'>('sans');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [burstCount, setBurstCount] = useState<number>(0);

  const fontClasses = {
    sans: 'font-sans font-extrabold tracking-tight',
    mono: 'font-mono font-bold tracking-tight',
    serif: 'font-serif font-black italic tracking-wide',
    display: 'font-mono uppercase font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600',
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText);
    setCopied(true);
    soundFx.playPop(700);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    setIsSpeaking(true);
    const spoken = speakText(displayText, appLang === 'vi' ? 'vi-VN' : 'en-US');
    if (!spoken) {
      soundFx.playBeep();
    }
    setTimeout(() => setIsSpeaking(false), 1500);
  };

  const handleTriggerBurst = () => {
    setBurstCount((c) => c + 1);
    soundFx.playSuccess();
  };

  // Compute text statistics
  const charLength = displayText.length;
  const byteSize = new TextEncoder().encode(displayText).length;
  const binaryPreview = displayText
    .slice(0, 3)
    .split('')
    .map((c) => c.charCodeAt(0).toString(2).padStart(8, '0'))
    .join(' ');

  return (
    <section id="hero" className="relative pt-12 pb-16 overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex justify-center">
        <div className="w-[600px] h-[350px] bg-gradient-to-tr from-blue-200/40 via-indigo-100/30 to-purple-200/30 dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-purple-900/20 blur-3xl rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            {appLang === 'vi' ? 'Bản thử nghiệm đầu tiên của mọi lập trình viên' : 'The First Step of Every Programmer'}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
            {appLang === 'vi' ? 'Khởi Tạo Bản Thử Nghiệm' : 'Test Run & Playground'}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300">
              Hello World
            </span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
            {appLang === 'vi'
              ? 'Kiểm tra hoạt động toàn diện của ứng dụng: từ hiển thị chữ, kiểm tra âm thanh, lưu trữ, hiệu năng DOM tới hỗ trợ đa ngôn ngữ lập trình.'
              : 'Full verification testbench: from typography rendering and audio synthesis to browser storage, DOM performance, and multilingual code snippets.'}
          </p>
        </div>

        {/* Central Interactive Display Card */}
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-10 transition-all">
          {/* Top card toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {appLang === 'vi' ? 'Kiểu chữ:' : 'Typography:'}
              </span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                {(['sans', 'mono', 'serif', 'display'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setFontMode(mode);
                      soundFx.playPop(480);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      fontMode === mode
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSpeak}
                disabled={isSpeaking}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
                title={appLang === 'vi' ? 'Nghe phát âm' : 'Listen with Speech API'}
              >
                <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-blue-600 animate-pulse' : ''}`} />
                {appLang === 'vi' ? 'Phát âm' : 'Pronounce'}
              </button>

              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
                title={appLang === 'vi' ? 'Sao chép văn bản' : 'Copy to clipboard'}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? (appLang === 'vi' ? 'Đã chép' : 'Copied') : (appLang === 'vi' ? 'Sao chép' : 'Copy')}
              </button>
            </div>
          </div>

          {/* Big Greeting Display Area */}
          <div className="my-8 py-8 px-4 rounded-xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center min-h-[180px]">
            <div className={`text-4xl sm:text-6xl md:text-7xl transition-all duration-200 ${fontClasses[fontMode]}`}>
              {displayText}
            </div>
            {burstCount > 0 && (
              <span className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 animate-bounce">
                🎉 {appLang === 'vi' ? `Kích hoạt sự kiện thành công! (${burstCount} lần)` : `Test triggered successfully! (${burstCount} times)`}
              </span>
            )}
          </div>

          {/* Quick Custom Input */}
          <div className="flex flex-col sm:flex-row gap-2 mb-6">
            <input
              type="text"
              value={displayText}
              onChange={(e) => setDisplayText(e.target.value)}
              placeholder={appLang === 'vi' ? 'Nhập thông điệp cần kiểm tra...' : 'Enter custom message to test...'}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDisplayText(appLang === 'vi' ? 'Xin chào, Thế giới!' : 'Hello, World!');
                  soundFx.playPop(520);
                }}
                className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                title={appLang === 'vi' ? 'Đặt lại mặc định' : 'Reset default'}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {appLang === 'vi' ? 'Mặc định' : 'Reset'}
              </button>

              <button
                onClick={handleTriggerBurst}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                {appLang === 'vi' ? 'Test Phản Hồi' : 'Trigger Test'}
              </button>
            </div>
          </div>

          {/* Meta specs row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block">{appLang === 'vi' ? 'Độ dài ký tự' : 'Character Count'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{charLength} chars</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block">{appLang === 'vi' ? 'Kích thước UTF-8' : 'Byte Size'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{byteSize} bytes</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block">{appLang === 'vi' ? 'Mã nhị phân (3 đầu)' : 'Binary (First 3)'}</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200 text-[11px] truncate block" title={binaryPreview}>
                {binaryPreview}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block">{appLang === 'vi' ? 'Chẩn đoán nhanh' : 'Full Diagnostics'}</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400 text-xs">6 bài test</span>
              </div>
              <button
                onClick={onRunDiagnostics}
                className="text-xs px-2.5 py-1 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-semibold rounded-md hover:bg-blue-200 transition-colors"
              >
                {appLang === 'vi' ? 'Chạy' : 'Run'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
