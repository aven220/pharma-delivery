import Constants from 'expo-constants';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

/** extra.apiUrl se define en app.config.js durante el build EAS (fuente principal en APK). */
const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl?.trim();
const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();

function assertProductionUrl(normalized: string): void {
  if (!normalized.startsWith('https://')) {
    throw new Error('MOBILE_API_URL debe usar HTTPS en producción.');
  }
  const host = normalized.replace(/^https:\/\//, '').split('/')[0] ?? '';
  if (
    host === 'localhost' ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.includes(':8080') ||
    host.includes(':8081') ||
    host.includes(':4000')
  ) {
    throw new Error('No use localhost, IPs privadas ni puertos internos en MOBILE_API_URL.');
  }
}

function resolveApiUrl(): string {
  const url = fromExtra || fromEnv || '';
  if (!url) {
    if (__DEV__) {
      return normalizeBaseUrl('http://localhost:4000');
    }
    throw new Error(
      'MOBILE_API_URL no configurada en el APK. Regenere con: EXPO_PUBLIC_API_URL=https://TU-HOST npm run build:apk'
    );
  }
  const normalized = normalizeBaseUrl(url);
  if (!__DEV__) {
    assertProductionUrl(normalized);
  }
  return normalized;
}

export const API_URL = resolveApiUrl();
