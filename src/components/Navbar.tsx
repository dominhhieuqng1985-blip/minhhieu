import React from 'react';
import { Volume2, VolumeX, Globe, Terminal, Sparkles, CheckCircle2 } from 'lucide-react';
import { AppLanguage } from '../types';
import { soundFx } from '../utils/audio';

interface NavbarProps {
  appLang: AppLanguage;
  setAppLang: (lang: AppLanguage) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  activeSection: string;
  setActiveSection: (sec: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  appLang,
  setAppLang,
  soundEnabled,
  setSoundEnabled,
  activeSection,
  setActiveSection,
}) => {
  const toggleSound = () => {
    const next = !soundEnabled;
    soundFx.enabled = next;
    setSoundEnabled(next);
    if (next) soundFx.playPop(600);
  };

  const navItems = [
    { id: 'hero', vi: 'Tổng quan', en: 'Overview' },
    { id: 'diagnostics', vi: 'Chẩn đoán Test', en: 'Diagnostics' },
    { id: 'languages', vi: 'Đa ngôn ngữ', en: 'Languages' },
    { id: 'code', vi: 'Mã nguồn', en: 'Code Snippets' },
    { id: 'playground', vi: 'Thử nghiệm', en: 'Playground' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white tracking-tight">
                Hello World <span className="text-blue-600 dark:text-blue-400">Test Lab</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3" />
                v1.0 Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              {appLang === 'vi' ? 'Môi trường thử nghiệm tương tác chuẩn' : 'Standard Interactive Test Environment'}
            </p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  soundFx.playPop(440);
                  const el = document.getElementById(item.id);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {appLang === 'vi' ? item.vi : item.en}
              </button>
            );
          })}
        </nav>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            title={soundEnabled ? (appLang === 'vi' ? 'Tắt âm thanh' : 'Mute sound') : (appLang === 'vi' ? 'Bật âm thanh' : 'Enable sound')}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Language Switch */}
          <button
            onClick={() => {
              const next = appLang === 'vi' ? 'en' : 'vi';
              setAppLang(next);
              soundFx.playPop(520);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{appLang === 'vi' ? 'VI 🇻🇳' : 'EN 🇬🇧'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
