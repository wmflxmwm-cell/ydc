import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // Vite는 VITE_ 접두사가 있는 환경 변수만 클라이언트에 노출
      // GEMINI_API_KEY는 VITE_GEMINI_API_KEY로 설정해야 함
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        include: ['xlsx'],
      },
      build: {
        cssCodeSplit: false,
        chunkSizeWarningLimit: 1000, // 청크 크기 경고 임계값을 1MB로 증가
        commonjsOptions: {
          include: [/xlsx/, /node_modules/],
        },
        rollupOptions: {
          output: {
            assetFileNames: (assetInfo) => {
              if (assetInfo.name && assetInfo.name.endsWith('.css')) {
                return 'assets/[name][extname]';
              }
              return 'assets/[name]-[hash][extname]';
            },
            manualChunks: {
              // 큰 라이브러리들을 별도 청크로 분리
              'react-vendor': ['react', 'react-dom'],
              'ui-vendor': ['lucide-react'],
              'utils-vendor': ['axios'],
            },
          },
        },
      },
    };
});
