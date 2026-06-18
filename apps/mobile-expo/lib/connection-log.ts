import { isAxiosError } from 'axios';
import { API_URL } from '../config/api';

/** Registra detalle técnico en logcat (adb). No mostrar al usuario final. */
export function logConnectionError(context: string, err: unknown): void {
  if (isAxiosError(err)) {
    console.error(`[A-AS ${context}] URL=${API_URL}`, {
      message: err.message,
      code: err.code,
      status: err.response?.status,
      data: err.response?.data,
    });
    return;
  }
  console.error(`[A-AS ${context}] URL=${API_URL}`, err);
}
