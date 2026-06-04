import Constants from 'expo-constants';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

const fromEnv = process.env.EXPO_PUBLIC_API_URL;
const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;

export const API_URL = normalizeBaseUrl(
  fromEnv || fromExtra || 'http://192.168.11.176:4000'
);
