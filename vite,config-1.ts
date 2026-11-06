
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const root = path.resolve(); // Resolves to current working directory

  // ✅ Load toàn bộ biến môi trường từ .env, .env.local, .env.production...
  const env = loadEnv(mode, root, '');

  // ✅ Ưu tiên lấy API KEY theo thứ tự:
  // 1. Biến môi trường hệ thống (Linux / Docker / CI)
  // 2. File .env.*
  const apiKey =
    process.env.API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    env.API_KEY ||
    env.VITE_GEMINI_API_KEY ||
    '';

  console.log('─────────────────────────────');
  console.log('🚀 VITE MODE:', mode);
  console.log(
    '🔑 GEMINI API KEY:',
    apiKey ? `✅ FOUND (length: ${apiKey.length})` : '❌ NOT FOUND'
  );
  console.log('─────────────────────────────');

  return {
    base: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },

    plugins: [react()],

    // ✅ Inject API KEY vào code client
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(apiKey),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(apiKey),
    },

    resolve: {
      alias: {
        '@': path.resolve(root, '.'),
      },
    },

    build: {
      outDir: 'dist',

      // ✅ TẮT CẢNH BÁO CHUNK > 500KB
      chunkSizeWarningLimit: 1500,

      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react')) return 'vendor_react';
              if (id.includes('lucide-react')) return 'vendor_icons';
              if (id.includes('@google')) return 'vendor_google_ai';
              return 'vendor';
            }
          },
        },
      },
    },
  };
});
