import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync, existsSync } from 'fs';

const packagesDir = path.resolve(__dirname, '../../packages');
const rootDir = path.resolve(__dirname, '../..');

function readDevHostPort(): number {
  const hostFile = path.join(rootDir, 'config/dev-host.env');
  if (!existsSync(hostFile)) return 5517;
  const text = readFileSync(hostFile, 'utf8');
  const m = text.match(/^DEV_WEB_PORT=(.+)$/m);
  const n = m ? Number(m[1].trim()) : 5517;
  return Number.isFinite(n) && n > 0 ? n : 5517;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://127.0.0.1:4410';
  const webPort = readDevHostPort();

  return {
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
      port: webPort,
      strictPort: true,
      fs: {
        allow: [rootDir],
      },
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/health': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    optimizeDeps: {
      include: ['@pharma/types', '@pharma/api-client'],
    },
  };
});
