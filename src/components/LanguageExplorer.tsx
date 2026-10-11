import React, { useState } from 'react';
import { Globe, Volume2, Copy, Check, Search } from 'lucide-react';
import { AppLanguage, HumanLanguageItem } from '../types';
import { HUMAN_LANGUAGES } from '../data/languages';
import { soundFx, speakText } from '../utils/audio';

interface LanguageExplorerProps {
  appLang: AppLanguage;
}

export const LanguageExplorer: React.FC<LanguageExplorerProps> = ({ appLang }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [speakingCode, setSpeakingCode] = useState<string | null>(null);

  const filteredLanguages = HUMAN_LANGUAGES.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.nameVi.toLowerCase().includes(q) ||
      item.nameEn.toLowerCase().includes(q) ||
      item.nativeName.toLowerCase().includes(q) ||
      item.greeting.toLowerCase().includes(q)
    );
  });

  const handleCopy = (greeting: string, code: string) => {
    navigator.clipboard.writeText(greeting);
    setCopiedCode(code);
    soundFx.playPop(620);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const handleSpeak = (greeting: string, speechCode: string, code: string) => {
    setSpeakingCode(code);
    speakText(greeting, speechCode);
    setTimeout(() => setSpeakingCode(null), 1500);
  };

  return (
    <section id="languages" className="py-12 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
              <Globe className="w-4 h-4" />
              {appLang === 'vi' ? 'Tiếng Nói Toàn Cầu' : 'Global Human Languages'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {appLang === 'vi' ? 'Xin Chào Thế Giới Qua Các Ngôn Ngữ' : 'Hello World Around the Globe'}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {appLang === 'vi'
                ? 'Khám phá cách nhân loại chào hỏi thế giới với phiên âm chuẩn và phát âm giọng đọc AI.'
                : 'Explore greetings across cultures with romanization and native vocal playback.'}
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={appLang === 'vi' ? 'Tìm theo tên nước hoặc câu chào...' : 'Search language or greeting...'}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Languages Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLanguages.map((item) => {
            const isCopied = copiedCode === item.code;
            const isSpeaking = speakingCode === item.code;

            return (
              <div
                key={item.code}
                className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{item.flag}</span>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-xs leading-none">
                          {appLang === 'vi' ? item.nameVi : item.nameEn}
                        </h3>
                        <span className="text-[11px] text-slate-400">{item.nativeName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="my-2">
                    <p className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                      {item.greeting}
                    </p>
                    {item.romanization && item.romanization !== item.greeting && (
                      <p className="text-xs text-slate-500 italic mt-0.5">{item.romanization}</p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-2">
                  <span className="font-mono text-[10px] text-slate-400 uppercase">{item.speechCode}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSpeak(item.greeting, item.speechCode, item.code)}
                      disabled={isSpeaking}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={appLang === 'vi' ? 'Nghe phát âm' : 'Listen'}
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-blue-600 animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleCopy(item.greeting, item.code)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={appLang === 'vi' ? 'Sao chép' : 'Copy'}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
