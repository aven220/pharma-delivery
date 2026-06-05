/** URL base del API. Vacío en build → mismo origen (https://host vía edge NGINX). */
export function resolveApiBaseUrl(): string {
  const fromBuild = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? '';
  if (fromBuild) {
    return fromBuild.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

export const API_URL = resolveApiBaseUrl();
