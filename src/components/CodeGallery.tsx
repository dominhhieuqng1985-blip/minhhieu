import React, { useState } from 'react';
import { Terminal, Copy, Check, Code2, ExternalLink } from 'lucide-react';
import { AppLanguage, CodeLanguageItem } from '../types';
import { CODE_LANGUAGES } from '../data/languages';
import { soundFx } from '../utils/audio';

interface CodeGalleryProps {
  appLang: AppLanguage;
}

export const CodeGallery: React.FC<CodeGalleryProps> = ({ appLang }) => {
  const [selectedLangId, setSelectedLangId] = useState<string>('javascript');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Modern Web', 'Backend', 'Systems', 'Scripting', 'Mobile'];

  const filteredLanguages = CODE_LANGUAGES.filter((item) =>
    activeCategory === 'All' ? true : item.category === activeCategory
  );

  const activeItem = CODE_LANGUAGES.find((item) => item.id === selectedLangId) || CODE_LANGUAGES[0];

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    soundFx.playPop(750);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section id="code" className="py-12 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
              <Terminal className="w-4 h-4" />
              {appLang === 'vi' ? 'Mã Nguồn Mẫu' : 'Canonical Code Snippets'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {appLang === 'vi' ? 'Hello World Trong Các Ngôn Ngữ Lập Trình' : 'Hello World Across 12+ Languages'}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {appLang === 'vi'
                ? 'So sánh cú pháp khởi đầu tiêu chuẩn từ JavaScript, Python đến Rust, Go, C++ và SQL.'
                : 'Compare standard starter syntax across JavaScript, Python, Rust, Go, C++, SQL and more.'}
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  soundFx.playPop(440);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Code Viewer Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Language Selector List */}
          <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredLanguages.map((item) => {
              const isSelected = item.id === activeItem.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedLangId(item.id);
                    soundFx.playPop(520);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Code2 className={`w-4 h-4 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-semibold">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.fileExtension}</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {item.category}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Code Block & Terminal Display */}
          <div className="lg:col-span-8 bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            {/* Terminal Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="ml-2 font-mono text-xs text-slate-400">{activeItem.fileExtension}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(activeItem.code, activeItem.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  {copiedId === activeItem.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{appLang === 'vi' ? 'Đã sao chép' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{appLang === 'vi' ? 'Sao chép mã' : 'Copy code'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Body */}
            <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto min-h-[220px] flex items-center">
              <pre className="text-slate-100 w-full">
                <code>
                  {activeItem.code.split('\n').map((line, idx) => (
                    <div key={idx} className="table-row">
                      <span className="table-cell select-none pr-6 text-slate-600 text-xs text-right w-8">
                        {idx + 1}
                      </span>
                      <span className="table-cell">{line}</span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>

            {/* Code explanation footer */}
            <div className="px-6 py-4 bg-slate-900/60 border-t border-slate-800 text-xs text-slate-300 flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white mr-1.5">
                  {appLang === 'vi' ? 'Giải thích hoạt động:' : 'How it works:'}
                </span>
                <span className="text-slate-300">
                  {appLang === 'vi' ? activeItem.explanationVi : activeItem.explanationEn}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
