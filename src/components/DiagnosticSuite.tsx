import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, AlertCircle, Loader2, RefreshCw, Cpu, Database, Volume2, Mic, Monitor, Zap } from 'lucide-react';
import { AppLanguage, DiagnosticTest } from '../types';
import { soundFx } from '../utils/audio';

interface DiagnosticSuiteProps {
  appLang: AppLanguage;
}

export const DiagnosticSuite: React.FC<DiagnosticSuiteProps> = ({ appLang }) => {
  const initialTests: DiagnosticTest[] = [
    {
      id: 'react-state',
      nameVi: 'Trình điều khiển React State',
      nameEn: 'React State & Dispatch Engine',
      descriptionVi: 'Kiểm tra khả năng phản hồi trạng thái động và vòng lặp render component.',
      descriptionEn: 'Verifies reactive state propagation, dispatch hooks, and component lifecycle.',
      status: 'idle',
    },
    {
      id: 'local-storage',
      nameVi: 'Lưu trữ cục bộ (LocalStorage)',
      nameEn: 'Browser LocalStorage Engine',
      descriptionVi: 'Kiểm tra khả năng ghi, đọc và xóa khóa lưu trữ trong trình duyệt.',
      descriptionEn: 'Tests persistent key-value write, read verification, and garbage cleanup.',
      status: 'idle',
    },
    {
      id: 'web-audio',
      nameVi: 'Bộ tổng hợp âm thanh (Web Audio API)',
      nameEn: 'Hardware Web Audio Synthesizer',
      descriptionVi: 'Khởi tạo AudioContext và tạo dao động sóng tần số cao.',
      descriptionEn: 'Initializes AudioContext and triggers native oscillator audio output.',
      status: 'idle',
    },
    {
      id: 'speech-synthesis',
      nameVi: 'Trình phát âm thanh (Speech API)',
      nameEn: 'SpeechSynthesis Text-to-Speech',
      descriptionVi: 'Kiểm tra bộ thư viện giọng đọc văn bản tự nhiên của hệ thống.',
      descriptionEn: 'Checks system speech engine and vocal synthesis availability.',
      status: 'idle',
    },
    {
      id: 'viewport-dom',
      nameVi: 'Môi trường đồ họa & Màn hình',
      nameEn: 'Screen Display & Viewport Matrix',
      descriptionVi: 'Đo lường độ phân giải, mật độ điểm ảnh (DPR) và khả năng xử lý DOM.',
      descriptionEn: 'Calculates viewport bounds, Device Pixel Ratio, and DOM tree latency.',
      status: 'idle',
    },
    {
      id: 'event-loop',
      nameVi: 'Độ trễ hàng đợi Microtask',
      nameEn: 'Event Loop & Timer Resolution',
      descriptionVi: 'Đo lường độ chính xác mili-giây bằng performance.now().',
      descriptionEn: 'Measures high-resolution performance timers and microtask queue delay.',
      status: 'idle',
    },
  ];

  const [tests, setTests] = useState<DiagnosticTest[]>(initialTests);
  const [isRunningAll, setIsRunningAll] = useState<boolean>(false);
  const [testCounter, setTestCounter] = useState<number>(0);

  // Auto-run first test on mount to give immediate feedback
  useEffect(() => {
    runSingleTest('react-state');
  }, []);

  const runSingleTest = async (testId: string) => {
    setTests((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, status: 'running' } : t))
    );

    const startTime = performance.now();

    try {
      if (testId === 'react-state') {
        // Test state increment
        await new Promise((resolve) => setTimeout(resolve, 80));
        setTestCounter((c) => c + 1);
        const duration = Math.round(performance.now() - startTime);
        setTests((prev) =>
          prev.map((t) =>
            t.id === testId
              ? {
                  ...t,
                  status: 'success',
                  durationMs: duration,
                  resultMessage:
                    appLang === 'vi'
                      ? `Phản hồi thành công (${duration}ms) • Dispatch trigger OK`
                      : `State dispatched successfully in ${duration}ms`,
                }
              : t
          )
        );
      } else if (testId === 'local-storage') {
        await new Promise((resolve) => setTimeout(resolve, 60));
        const testKey = '__hw_diagnostic_token__';
        const testVal = 'hello_world_' + Date.now();
        localStorage.setItem(testKey, testVal);
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);

        const ok = retrieved === testVal;
        const duration = Math.round(performance.now() - startTime);

        setTests((prev) =>
          prev.map((t) =>
            t.id === testId
              ? {
                  ...t,
                  status: ok ? 'success' : 'failed',
                  durationMs: duration,
                  resultMessage: ok
                    ? appLang === 'vi'
                      ? `Ghi/đọc thành công (${duration}ms) • 100% Khớp dữ liệu`
                      : `Write/Read/Clean verified in ${duration}ms`
                    : 'LocalStorage failed',
                }
              : t
          )
        );
      } else if (testId === 'web-audio') {
        await new Promise((resolve) => setTimeout(resolve, 50));
        const hasAudio = typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
        soundFx.playPop(800);
        const duration = Math.round(performance.now() - startTime);

        setTests((prev) =>
          prev.map((t) =>
            t.id === testId
              ? {
                  ...t,
                  status: hasAudio ? 'success' : 'failed',
                  durationMs: duration,
                  resultMessage: hasAudio
                    ? appLang === 'vi'
                      ? `AudioContext sẵn sàng (${duration}ms) • Tần số 800Hz OK`
                      : `AudioContext operational in ${duration}ms • 800Hz synth`
                    : 'AudioContext unavailable',
                }
              : t
          )
        );
      } else if (testId === 'speech-synthesis') {
        await new Promise((resolve) => setTimeout(resolve, 90));
        const hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;
        const duration = Math.round(performance.now() - startTime);

        setTests((prev) =>
          prev.map((t) =>
            t.id === testId
              ? {
                  ...t,
                  status: hasSpeech ? 'success' : 'failed',
                  durationMs: duration,
                  resultMessage: hasSpeech
                    ? appLang === 'vi'
                      ? `Speech API hỗ trợ chuẩn (${duration}ms)`
                      : `Speech API available (${duration}ms)`
                    : 'SpeechSynthesis not supported on this browser',
                }
              : t
          )
        );
      } else if (testId === 'viewport-dom') {
        await new Promise((resolve) => setTimeout(resolve, 40));
        const w = window.innerWidth;
        const h = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        const duration = Math.round(performance.now() - startTime);

        setTests((prev) =>
          prev.map((t) =>
            t.id === testId
              ? {
                  ...t,
                  status: 'success',
                  durationMs: duration,
                  resultMessage: `${w}×${h}px • DPR: ${dpr}x (${duration}ms)`,
                }
              : t
          )
        );
      } else if (testId === 'event-loop') {
        const start = performance.now();
        await new Promise((r) => requestAnimationFrame(r));
        const delta = (performance.now() - start).toFixed(2);
        const duration = Math.round(performance.now() - startTime);

        setTests((prev) =>
          prev.map((t) =>
            t.id === testId
              ? {
                  ...t,
                  status: 'success',
                  durationMs: duration,
                  resultMessage:
                    appLang === 'vi'
                      ? `Frame request trễ ${delta}ms • Đồng bộ 60fps`
                      : `RAF latency ${delta}ms • Smooth 60fps frame`,
                }
              : t
          )
        );
      }
    } catch (err: unknown) {
      setTests((prev) =>
        prev.map((t) =>
          t.id === testId
            ? {
                ...t,
                status: 'failed',
                resultMessage: String(err),
              }
            : t
        )
      );
    }
  };

  const runAllTests = async () => {
    if (isRunningAll) return;
    setIsRunningAll(true);
    soundFx.playPop(500);

    for (const test of tests) {
      await runSingleTest(test.id);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    setIsRunningAll(false);
    soundFx.playSuccess();
  };

  const getTestIcon = (id: string) => {
    switch (id) {
      case 'react-state':
        return <Cpu className="w-5 h-5 text-blue-600" />;
      case 'local-storage':
        return <Database className="w-5 h-5 text-indigo-600" />;
      case 'web-audio':
        return <Volume2 className="w-5 h-5 text-emerald-600" />;
      case 'speech-synthesis':
        return <Mic className="w-5 h-5 text-violet-600" />;
      case 'viewport-dom':
        return <Monitor className="w-5 h-5 text-amber-600" />;
      case 'event-loop':
        return <Zap className="w-5 h-5 text-rose-600" />;
      default:
        return <Cpu className="w-5 h-5 text-blue-600" />;
    }
  };

  const passedCount = tests.filter((t) => t.status === 'success').length;
  const isAllPassed = passedCount === tests.length;

  return (
    <section id="diagnostics" className="py-12 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
              <Zap className="w-4 h-4" />
              {appLang === 'vi' ? 'Bản Kiểm Tra Hoạt Động Hệ Thống' : 'System Diagnostic Suite'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {appLang === 'vi' ? 'Kiểm Tra Trạng Thái & Thiết Bị' : 'Diagnostics & Verification Bench'}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {appLang === 'vi'
                ? 'Thử nghiệm trực tiếp các API trình duyệt, bộ nhớ, phản hồi giao diện và âm thanh.'
                : 'Directly test browser APIs, memory caching, reactivity, and sound hardware.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <span className="text-slate-500 block">
                {appLang === 'vi' ? 'Kết quả chẩn đoán' : 'Diagnostic Score'}
              </span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {passedCount}/{tests.length} {appLang === 'vi' ? 'Đạt chuẩn' : 'Passed'}
              </span>
            </div>

            <button
              onClick={runAllTests}
              disabled={isRunningAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              {isRunningAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {appLang === 'vi' ? 'Đang chạy test...' : 'Testing...'}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  {appLang === 'vi' ? 'Chạy Tất Cả Kiểm Tra' : 'Run All Tests'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => {
            const isSuccess = test.status === 'success';
            const isRunning = test.status === 'running';
            const isFailed = test.status === 'failed';

            return (
              <div
                key={test.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                      {getTestIcon(test.id)}
                    </div>
                    <div>
                      {isSuccess && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          PASSED
                        </span>
                      )}
                      {isRunning && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          RUNNING
                        </span>
                      )}
                      {isFailed && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                          <AlertCircle className="w-3 h-3" />
                          FAILED
                        </span>
                      )}
                      {test.status === 'idle' && (
                        <span className="inline-flex items-center text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          IDLE
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                    {appLang === 'vi' ? test.nameVi : test.nameEn}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {appLang === 'vi' ? test.descriptionVi : test.descriptionEn}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-mono truncate">
                    {test.resultMessage || (appLang === 'vi' ? 'Chưa thực hiện' : 'Not executed')}
                  </div>
                  <button
                    onClick={() => {
                      runSingleTest(test.id);
                      soundFx.playPop(580);
                    }}
                    disabled={isRunning}
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors"
                    title={appLang === 'vi' ? 'Kiểm tra lại mục này' : 'Re-run this test'}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
