import axios, { isAxiosError } from 'axios';
import { useAuthStore } from '../store/auth.store';
import { API_URL } from '../config/api';
import { isOnline } from '../utils/network';
import { getUserFacingError } from '../lib/user-messages';
import { logConnectionError } from '../lib/connection-log';

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

  // Sin red: conservar sesión local para modo offline
  if (!(await isOnline())) {
    return !!(accessToken || refreshToken);
  }

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const { data } = await authClient.post('/api/auth/refresh', {
        refreshToken: useAuthStore.getState().refreshToken,
      });
      await useAuthStore.getState().setTokens(data.data);
      return true;
    } catch (err) {
      // Fallo de red: no cerrar sesión; el usuario sigue en modo offline
      if (isAxiosError(err) && !err.response) {
        return !!(useAuthStore.getState().accessToken || useAuthStore.getState().refreshToken);
      }
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

  if (await isOnline()) {
    await ensureValidSession();
  }
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

export function getApiErrorMessage(
  err: unknown,
  fallback = 'Ocurrió un error. Intente de nuevo.',
  context: 'login' | 'sync' | 'general' = 'general'
): string {
  return getUserFacingError(err, context) || fallback;
}

export async function login(email: string, password: string) {
  try {
    const { data } = await authClient.post('/api/auth/login', { email, password });
    return data.data;
  } catch (err) {
    logConnectionError('login', err);
    throw err;
  }
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
  lng?: number,
  opts?: { mimeType?: string; fileName?: string }
) {
  const mimeType = opts?.mimeType || 'image/jpeg';
  const fileName = opts?.fileName || (mimeType.includes('audio') ? 'call-note.m4a' : 'evidence.jpg');
  const formData = new FormData();
  formData.append('deliveryId', deliveryId);
  formData.append('type', type);
  formData.append('file', {
    uri,
    type: mimeType,
    name: fileName,
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

export type MobileCallAssignment = {
  id: string;
  status: string;
  managementResult?: string | null;
  observations?: string | null;
  callDate?: string | null;
  callTime?: string | null;
  durationSec?: number | null;
  phoneUsed?: string | null;
  dialClickedAt?: string | null;
  dialClickCount?: number;
  delivery: {
    id: string;
    deliveryNumber: string;
    documentNumber?: string | null;
    status: string;
    observations?: string | null;
    patient: {
      id: string;
      firstName: string;
      lastName: string;
      documentId: string;
      documentType?: string;
      address: string;
      phone?: string | null;
      phoneAlt?: string | null;
      phoneFamily?: string | null;
      phoneAlternative?: string | null;
      notes?: string | null;
    };
    items?: Array<{
      id: string;
      quantity: number;
      medication: { name: string; code?: string; cum?: string | null };
    }>;
  };
};

export async function fetchMyCalls(limit = 50): Promise<MobileCallAssignment[]> {
  const { data } = await api.get('/api/calls/my', { params: { limit } });
  return (data.data || []) as MobileCallAssignment[];
}

export async function registerCallDial(assignmentId: string, phone?: string) {
  const { data } = await api.post(`/api/calls/my/${assignmentId}/dial`, { phone });
  return data.data;
}

export async function updateMyCall(
  assignmentId: string,
  payload: Record<string, unknown>
) {
  const { data } = await api.patch(`/api/calls/my/${assignmentId}`, payload);
  return data.data;
}
