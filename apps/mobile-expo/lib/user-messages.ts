import { isAxiosError } from 'axios';

/** Mensajes claros para domiciliarios — sin términos técnicos. */
export function getUserFacingError(
  err: unknown,
  context: 'login' | 'sync' | 'general' = 'general'
): string {
  if (!isAxiosError(err)) {
    return context === 'login'
      ? 'No se pudo iniciar sesión. Intente de nuevo.'
      : 'Ocurrió un error. Intente de nuevo.';
  }

  if (!err.response) {
    if (err.code === 'ECONNABORTED') {
      return 'La conexión tardó demasiado. Intente de nuevo.';
    }
    if (context === 'login') {
      return 'Sin conexión con el sistema. Revise su internet e intente nuevamente.';
    }
    if (context === 'sync') {
      return 'No se pudo actualizar en este momento. Sus datos guardados siguen disponibles.';
    }
    return 'Sin conexión. Revise su internet e intente nuevamente.';
  }

  if (err.response.status === 401) {
    return context === 'login'
      ? 'Correo o contraseña incorrectos.'
      : 'Su sesión expiró. Vuelva a iniciar sesión.';
  }

  if (err.response.status === 429) {
    return 'Demasiados intentos. Espere un momento e intente de nuevo.';
  }

  const body = err.response.data as { error?: string; message?: string } | undefined;
  const apiMessage = body?.error || body?.message;
  if (apiMessage === 'Invalid credentials') {
    return 'Correo o contraseña incorrectos.';
  }

  return apiMessage || (context === 'login' ? 'No se pudo iniciar sesión.' : 'Ocurrió un error.');
}

export const OFFLINE_LOGIN_MSG =
  'Sin conexión a internet. Conéctese para iniciar sesión por primera vez.';

export const OFFLINE_WORKING_MSG =
  'Trabajando sin conexión. Los cambios se enviarán automáticamente al reconectar.';
