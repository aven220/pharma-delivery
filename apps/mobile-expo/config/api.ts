import Constants from 'expo-constants';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

/** En dev, si la URL es http sin puerto, el backend local usa 4000 (no 80). */
function ensureDevPort(url: string): string {
  if (!__DEV__ || !url.startsWith('http://')) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.port && (parsed.hostname === 'localhost' || /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(parsed.hostname))) {
      parsed.port = '4000';
      const withPort = parsed.toString().replace(/\/$/, '');
      console.warn(`[A-AS] URL sin puerto — usando ${withPort}`);
      return withPort;
    }
  } catch {
    /* ignore */
  }
  return url;
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
      if (Constants.isDevice) {
        throw new Error(
          'EXPO_PUBLIC_API_URL no configurada. En celular físico localhost no funciona. ' +
            'Edite apps/mobile-expo/.env (ej. EXPO_PUBLIC_API_URL=https://20.5.19.8) y reinicie con: npx expo start -c'
        );
      }
      console.warn(
        '[A-AS] Sin EXPO_PUBLIC_API_URL — usando http://localhost:4000 (solo emulador/simulador)'
      );
      return normalizeBaseUrl('http://localhost:4000');
    }
    throw new Error(
      'MOBILE_API_URL no configurada en el APK. Regenere con: EXPO_PUBLIC_API_URL=https://TU-HOST npm run build:apk'
    );
  }
  const normalized = ensureDevPort(normalizeBaseUrl(url));
  if (!__DEV__) {
    assertProductionUrl(normalized);
  }
  return normalized;
}

export const API_URL = resolveApiUrl();
