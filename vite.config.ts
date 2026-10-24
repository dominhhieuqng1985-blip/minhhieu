
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: process.env.VITE_BASE || '/',

    plugins: [react(), tailwindcss()],

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      port: 3000,
      host: '0.0.0.0',

      // Giữ cấu hình HMR cho AI Studio
      hmr: process.env.DISABLE_HMR !== 'true',

      // Tắt theo dõi file khi DISABLE_HMR=true
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});