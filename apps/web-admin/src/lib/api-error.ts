import axios from 'axios';

export function getApiErrorMessage(error: unknown, fallback = 'Ocurrió un error'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      if (error.code === 'ECONNABORTED') return 'La solicitud tardó demasiado. Intente de nuevo.';
      if (error.message?.includes('Network Error')) {
        return 'No se pudo conectar con el API. Si el panel usa HTTPS, WEB_API_URL también debe ser HTTPS (sin :8080). Reconstruya web-admin.';
      }
      return 'No se pudo conectar con el servidor. Verifique que el backend esté activo.';
    }
    const body = error.response?.data as { error?: string; message?: string } | undefined;
    const apiMessage = body?.error || body?.message;
    if (apiMessage === 'Invalid credentials') return 'Correo o contraseña incorrectos';
    if (
      apiMessage === 'Invalid or expired token' ||
      apiMessage === 'jwt expired' ||
      apiMessage === 'Token expired'
    ) {
      return 'Su sesión expiró. Vuelva a iniciar sesión e intente de nuevo.';
    }
    return apiMessage || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
