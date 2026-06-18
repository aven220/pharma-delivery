import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const packagesDir = path.resolve(__dirname, '../../packages');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@pharma/types': path.resolve(packagesDir, 'types/src/index.ts'),
      '@pharma/api-client': path.resolve(packagesDir, 'api-client/src/index.ts'),
    },
  },
  server: {
    host: true,
    port: 5173,
    fs: {
      allow: [path.resolve(__dirname, '../..')],
    },
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['@pharma/types', '@pharma/api-client'],
  },
});
