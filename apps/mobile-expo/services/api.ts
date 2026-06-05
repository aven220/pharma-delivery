import axios, { isAxiosError } from 'axios';
import { useAuthStore } from '../store/auth.store';
import { API_URL } from '../config/api';

export { API_URL };

export const api = axios.create({ baseURL: API_URL, timeout: 30000 });

const authClient = axios.create({ baseURL: API_URL, timeout: 30000 });

function isTokenExpired(token: string, bufferSec = 60): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return true;
    return payload.exp * 1000 < Date.now() + bufferSec * 1000;
  } catch {
    return true;
  }
}

let refreshPromise: Promise<boolean> | null = null;

export async function ensureValidSession(): Promise<boolean> {
  const { accessToken, refreshToken } = useAuthStore.getState();
  if (!refreshToken) return !!accessToken;
  if (accessToken && !isTokenExpired(accessToken)) return true;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const { data } = await authClient.post('/api/auth/refresh', {
        refreshToken: useAuthStore.getState().refreshToken,
      });
      await useAuthStore.getState().setTokens(data.data);
      return true;
    } catch {
      await useAuthStore.getState().logout();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function isAuthPath(url?: string): boolean {
  if (!url) return false;
  return url.includes('/api/auth/login') || url.includes('/api/auth/refresh');
}

api.interceptors.request.use(async (config) => {
  if (isAuthPath(config.url)) return config;

  await ensureValidSession();
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry && !isAuthPath(original.url)) {
      original._retry = true;
      const ok = await ensureValidSession();
      if (ok) {
        original.headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(err: unknown, fallback = 'Error de conexión'): string {
  if (!isAxiosError(err)) return fallback;
  if (!err.response) {
    return 'No se puede conectar al servidor. Verifique red WiFi o datos móviles y que MOBILE_API_URL use HTTPS.';
  }
  if (err.response.status === 429) {
    return 'Demasiadas peticiones al servidor. Espere un momento e intente de nuevo.';
  }
  if (err.response.status === 401) {
    return 'Credenciales inválidas o sesión expirada.';
  }
  const body = err.response.data as { error?: string; message?: string } | undefined;
  return body?.error || body?.message || fallback;
}

export async function login(email: string, password: string) {
  const { data } = await authClient.post('/api/auth/login', { email, password });
  return data.data;
}

export async function updateDeliveryStatus(
  deliveryId: string,
  status: string,
  extras?: {
    lat?: number;
    lng?: number;
    accuracy?: number;
    failureReason?: string;
    observations?: string;
  }
) {
  const { data } = await api.patch(`/api/deliveries/${deliveryId}/status`, { status, ...extras });
  return data.data;
}

export async function uploadEvidence(
  deliveryId: string,
  type: string,
  uri: string,
  lat?: number,
  lng?: number
) {
  const formData = new FormData();
  formData.append('deliveryId', deliveryId);
  formData.append('type', type);
  formData.append('file', {
    uri,
    type: 'image/jpeg',
    name: 'evidence.jpg',
  } as unknown as Blob);
  if (lat) formData.append('lat', String(lat));
  if (lng) formData.append('lng', String(lng));

  const { data } = await api.post('/api/evidence', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function createIncident(payload: {
  deliveryId: string;
  type: string;
  description: string;
  lat?: number;
  lng?: number;
}) {
  const { data } = await api.post('/api/incidents', payload);
  return data.data;
}

export async function sendGpsLog(payload: {
  lat: number;
  lng: number;
  accuracy?: number;
  deliveryId?: string;
}) {
  const { data } = await api.post('/api/gps', payload);
  return data.data;
}

export async function fetchMyIntermunicipalRoutes(status?: string) {
  const { data } = await api.get('/api/intermunicipal-routes/my', {
    params: status ? { status } : undefined,
  });
  return data.data;
}

export async function fetchIntermunicipalRoute(id: string) {
  const { data } = await api.get(`/api/intermunicipal-routes/${id}`);
  return data.data;
}

export async function closeIntermunicipalRoute(id: string, notes?: string) {
  const { data } = await api.post(`/api/intermunicipal-routes/${id}/close`, { notes });
  return data.data;
}

export async function fetchDeliveryById(id: string) {
  const { data } = await api.get(`/api/deliveries/${id}`);
  return data.data;
}

export async function fetchDeliveryEvidence(deliveryId: string) {
  const { data } = await api.get(`/api/evidence/delivery/${deliveryId}`);
  return (data.data || []) as Array<{
    id: string;
    type: string;
    fileName: string;
    fileUrl: string;
  }>;
}
