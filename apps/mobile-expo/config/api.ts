import Constants from 'expo-constants';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function isPrivateLanHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

function isLanHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' && isPrivateLanHost(u.hostname);
  } catch {
    return false;
  }
}

/** Si la URL LAN viene sin puerto, usa el puerto API local por defecto. */
function ensureLanPort(url: string): string {
  if (!url.startsWith('http://')) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.port && isPrivateLanHost(parsed.hostname)) {
      parsed.port = '4410';
      return normalizeBaseUrl(parsed.toString());
    }
  } catch {
    /* ignore */
  }
  return url;
}

/** extra.apiUrl se define en app.config.js durante el build EAS (fuente principal en APK). */
const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl?.trim();
const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();

/**
 * APK release puede ser:
 * - HTTPS público (producción)
 * - HTTP con IP privada (pruebas LAN en el celular)
 */
function assertAllowedUrl(normalized: string): void {
  try {
    const u = new URL(normalized);
    if (u.protocol === 'https:') return;
    if (u.protocol === 'http:' && isPrivateLanHost(u.hostname)) return;
  } catch {
    throw new Error(`MOBILE_API_URL inválida: ${normalized}`);
  }
  throw new Error(
    'MOBILE_API_URL debe ser HTTPS (producción) o HTTP con IP LAN (ej. http://192.168.20.26:4410).'
  );
}

function resolveApiUrl(): string {
  const url = fromExtra || fromEnv || '';
  if (!url) {
    if (__DEV__) {
      if (Constants.isDevice) {
        console.warn(
          '[A-AS] Sin EXPO_PUBLIC_API_URL en dispositivo. Use apps/mobile-expo/.env con la IP LAN.'
        );
        return normalizeBaseUrl('http://192.168.20.26:4410');
      }
      console.warn('[A-AS] Sin EXPO_PUBLIC_API_URL — usando http://localhost:4410 (emulador)');
      return normalizeBaseUrl('http://localhost:4410');
    }
    // No lanzar en import: tumba el APK al abrir. Login mostrará error de red.
    console.error('[A-AS] APK sin EXPO_PUBLIC_API_URL — regenere con npm run build:apk:lan');
    return normalizeBaseUrl('http://192.168.20.26:4410');
  }

  const normalized = ensureLanPort(normalizeBaseUrl(url));
  try {
    assertAllowedUrl(normalized);
  } catch (err) {
    console.error('[A-AS]', err instanceof Error ? err.message : err);
    if (isLanHttpUrl(normalized) || normalized.startsWith('https://')) {
      return normalized;
    }
    return normalizeBaseUrl('http://192.168.20.26:4410');
  }
  return normalized;
}

export const API_URL = resolveApiUrl();
export const IS_LAN_API = isLanHttpUrl(API_URL);
