import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress unhandled third-party script errors (e.g. ad blockers or cross-origin ad scripts)
if (typeof window !== 'undefined') {
  const isThirdPartyAdSource = (src?: string) => {
    if (!src) return false;
    return (
      src.includes('acscdn') ||
      src.includes('fond-appointment') ||
      src.includes('troubled-entertainment') ||
      src.includes('youradexchange') ||
      src.includes('phoroglopsu')
    );
  };

  window.addEventListener(
    'error',
    (event) => {
      if (
        event.message === 'Script error.' ||
        !event.message ||
        isThirdPartyAdSource(event.filename)
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return true;
      }
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reasonStr =
        typeof event.reason === 'string'
          ? event.reason
          : typeof event.reason?.message === 'string'
          ? event.reason.message
          : '';
      const stackStr = typeof event.reason?.stack === 'string' ? event.reason.stack : '';
      if (
        reasonStr === 'Script error.' ||
        reasonStr.includes('Script error') ||
        isThirdPartyAdSource(reasonStr) ||
        isThirdPartyAdSource(stackStr)
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RootErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-rose-400">Đã xảy ra lỗi tạm thời</h2>
            <p className="text-xs text-slate-300">
              Ứng dụng vừa gặp sự cố gián đoạn. Vui lòng bấm làm mới để tải lại ứng dụng.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold text-white transition-all shadow-md"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
