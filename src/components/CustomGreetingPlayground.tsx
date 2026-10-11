import React, { useState } from 'react';
import { Sparkles, Heart, Terminal, Rocket, Smile, Copy, Check, MousePointerClick, RotateCcw } from 'lucide-react';
import { AppLanguage } from '../types';
import { soundFx, speakText } from '../utils/audio';

interface CustomGreetingPlaygroundProps {
  appLang: AppLanguage;
}

export const CustomGreetingPlayground: React.FC<CustomGreetingPlaygroundProps> = ({ appLang }) => {
  const [userName, setUserName] = useState<string>('Minh Hiếu');
  const [persona, setPersona] = useState<'friendly' | 'coder' | 'cosmic' | 'classic'>('friendly');
  const [clickCount, setClickCount] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [eventLogs, setEventLogs] = useState<Array<{ id: number; time: string; text: string }>>([
    {
      id: 1,
      time: new Date().toLocaleTimeString(),
      text: appLang === 'vi' ? 'Hệ thống đã khởi tạo bản thử nghiệm.' : 'System testbench initialized.',
    },
  ]);

  const personas = [
    {
      id: 'friendly',
      icon: Smile,
      nameVi: 'Thân Thiện',
      nameEn: 'Friendly',
      bgClass: 'from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-800',
      badgeClass: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60',
    },
    {
      id: 'coder',
      icon: Terminal,
      nameVi: 'Lập Trình Viên',
      nameEn: 'Developer',
      bgClass: 'from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800',
      badgeClass: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60',
    },
    {
      id: 'cosmic',
      icon: Rocket,
      nameVi: 'Vũ Trụ',
      nameEn: 'Cosmic',
      bgClass: 'from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800',
      badgeClass: 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60',
    },
    {
      id: 'classic',
      icon: Sparkles,
      nameVi: 'Kinh Điển',
      nameEn: 'Classic',
      bgClass: 'from-emerald-500/10 to-teal-500/10 border-emerald-200 dark:border-emerald-800',
      badgeClass: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
    },
  ] as const;

  const generateGreetingText = (): string => {
    const name = userName.trim() || (appLang === 'vi' ? 'Bạn' : 'Friend');
    switch (persona) {
      case 'friendly':
        return appLang === 'vi'
          ? `Xin chào ${name}! Chúc bạn một ngày lập trình tràn ngập niềm vui và sáng tạo!`
          : `Hello ${name}! Wishing you a wonderful coding day full of inspiration and joy!`;
      case 'coder':
        return `// [RUNTIME_READY] - Hello World\nconst engineer = "${name}";\nconsole.log(\`Ready to build the future, \${engineer}!\`);`;
      case 'cosmic':
        return appLang === 'vi'
          ? `Từ tâm vũ trụ gửi lời chào rạng rỡ tới nhà du hành ${name}!`
          : `From the edge of the galaxy, beaming greetings to the explorer ${name}!`;
      case 'classic':
        return appLang === 'vi'
          ? `Hello, World! Trân trọng chào mừng ${name} đến với kỷ nguyên công nghệ.`
          : `Hello, World! Warmest greetings to ${name} entering the world of code.`;
    }
  };

  const messageText = generateGreetingText();

  const handleInteractiveClick = () => {
    const nextCount = clickCount + 1;
    setClickCount(nextCount);

    if (nextCount % 5 === 0) {
      soundFx.playSuccess();
    } else {
      soundFx.playPop(500 + (nextCount % 10) * 40);
    }

    const logEntry = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      text:
        appLang === 'vi'
          ? `Click #${nextCount} bởi ${userName || 'User'} (${persona})`
          : `Click #${nextCount} by ${userName || 'User'} (${persona})`,
    };

    setEventLogs((prev) => [logEntry, ...prev.slice(0, 7)]);
  };

  const handleCopyGreeting = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    soundFx.playPop(700);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeakGreeting = () => {
    speakText(messageText, appLang === 'vi' ? 'vi-VN' : 'en-US');
  };

  return (
    <section id="playground" className="py-12 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            {appLang === 'vi' ? 'Không Gian Tương Tác' : 'Interactive Playground'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {appLang === 'vi' ? 'Tạo Lời Chào Hello World Cho Riêng Bạn' : 'Personalize Your Hello World'}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {appLang === 'vi'
              ? 'Tùy biến tên gọi, phong cách thông điệp và thử nghiệm tương tác phản hồi thời gian thực.'
              : 'Customize your name, tone personality, and test real-time event logs.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                {appLang === 'vi' ? 'Tên hoặc Biệt danh của bạn' : 'Your Name or Alias'}
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder={appLang === 'vi' ? 'Ví dụ: Minh Hiếu, Alex...' : 'E.g., Alex, Dev...'}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                {appLang === 'vi' ? 'Phong cách lời chào' : 'Greeting Persona'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {personas.map((p) => {
                  const Icon = p.icon;
                  const isSelected = persona === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setPersona(p.id);
                        soundFx.playPop(560);
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{appLang === 'vi' ? p.nameVi : p.nameEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Click Test Counter */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3">
                {appLang === 'vi' ? 'Thử nghiệm Click & Tần suất' : 'Interactive Click Benchmark'}
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleInteractiveClick}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
                >
                  <MousePointerClick className="w-4 h-4" />
                  {appLang === 'vi' ? 'Bấm để Test Phản Hồi' : 'Click to Test Event'}
                </button>
                <div className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center min-w-[70px]">
                  <span className="block text-[10px] text-slate-400">CLICKS</span>
                  <span className="font-bold text-base text-slate-900 dark:text-white">{clickCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Output Card & Event Log Stream */}
          <div className="lg:col-span-7 space-y-6">
            {/* Generated Card */}
            <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-mono font-medium text-slate-400 uppercase">
                    OUTPUT // {persona.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleSpeakGreeting}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    title={appLang === 'vi' ? 'Đọc thông điệp' : 'Speak'}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  </button>
                  <button
                    onClick={handleCopyGreeting}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? (appLang === 'vi' ? 'Đã sao chép' : 'Copied') : (appLang === 'vi' ? 'Sao chép' : 'Copy')}</span>
                  </button>
                </div>
              </div>

              <div className="my-6 p-6 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-850">
                <p className="text-lg sm:text-xl font-medium text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-line font-sans">
                  {messageText}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>{appLang === 'vi' ? 'Trạng thái: Hoạt động bình thường' : 'Status: Optimal operation'}</span>
                <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">UTF-8 / Reactive React 19</span>
              </div>
            </div>

            {/* Event Logs Stream */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-600" />
                  {appLang === 'vi' ? 'Nhật Ký Sự Kiện Real-time' : 'Real-time Event Stream'}
                </span>
                <button
                  onClick={() => {
                    setEventLogs([]);
                    soundFx.playPop(400);
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  {appLang === 'vi' ? 'Xóa nhật ký' : 'Clear log'}
                </button>
              </div>

              <div className="space-y-1.5 max-h-[160px] overflow-y-auto font-mono text-xs">
                {eventLogs.length === 0 ? (
                  <p className="text-slate-400 text-xs italic py-2">
                    {appLang === 'vi' ? 'Chưa có sự kiện nào...' : 'No events logged yet...'}
                  </p>
                ) : (
                  eventLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-1.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-300"
                    >
                      <span>{log.text}</span>
                      <span className="text-[10px] text-slate-400">{log.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
