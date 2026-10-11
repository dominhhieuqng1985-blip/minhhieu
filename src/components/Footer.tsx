import React from 'react';
import { Terminal, Heart, Code2 } from 'lucide-react';
import { AppLanguage } from '../types';

interface FooterProps {
  appLang: AppLanguage;
}

export const Footer: React.FC<FooterProps> = ({ appLang }) => {
  return (
    <footer className="py-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs">
              <Terminal className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Hello World <span className="text-blue-600">Test Lab</span>
            </span>
            <span className="text-slate-400 text-xs">·</span>
            <span className="text-xs text-slate-500">
              {appLang === 'vi' ? 'Bản kiểm tra môi trường thành công' : 'Environment verification passed'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>React 19</span>
            <span>·</span>
            <span>Tailwind CSS v4</span>
            <span>·</span>
            <span>Vite</span>
            <span>·</span>
            <span>TypeScript</span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <p>
            {appLang === 'vi'
              ? 'Tất cả các thành phần giao diện, âm thanh Web Audio và luồng xử lý đã sẵn sàng.'
              : 'All UI components, Web Audio synthesizers, and test suites are verified.'}
          </p>
          <p className="flex items-center gap-1">
            <span>Hello World Studio</span>
            <span>•</span>
            <span>2026</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
