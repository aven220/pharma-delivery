import { createApiClient } from '@pharma/api-client';
import { useAuthStore } from '@/store/auth.store';
import { API_URL } from '@/config/api';

export { API_URL };

export const pharmaClient = createApiClient({
  baseURL: API_URL,
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (tokens) => useAuthStore.getState().setTokens(tokens),
  onUnauthorized: () => useAuthStore.getState().logout(),
});

/** Cliente HTTP con refresh automático de sesión (mismo que pharmaClient). */
export const api = pharmaClient.axios;

export const dashboardApi = {
  getStats: () => api.get('/api/dashboard/stats'),
};

export const deliveriesApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/deliveries', { params }),
  getById: (id: string) => api.get(`/api/deliveries/${id}`),
  updateStatus: (id: string, data: { status: string; observations?: string; failureReason?: string }) =>
    api.patch(`/api/deliveries/${id}/status`, data),
};

export const evidenceApi = {
  listByDelivery: (deliveryId: string) => api.get(`/api/evidence/delivery/${deliveryId}`),
  fileUrl: (evidenceId: string) => `${API_URL}/api/evidence/${evidenceId}/file`,
};

export const incidentsApi = {
  listByDelivery: (deliveryId: string) => api.get('/api/incidents', { params: { deliveryId, limit: 50 } }),
};

export const excelApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/api/excel-imports/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadTemplate: () =>
    api.get('/api/excel-imports/template', {
      responseType: 'blob',
    }),
  list: () => api.get('/api/excel-imports'),
};

export const assignmentsApi = {
  create: (data: { deliveryIds: string[]; courierId: string; notes?: string }) =>
    api.post('/api/assignments', data),
  list: (params?: Record<string, unknown>) => api.get('/api/assignments', { params }),
  listCouriers: (params?: Record<string, unknown>) => api.get('/api/assignments/couriers', { params }),
  reassign: (id: string, data: { courierId: string; notes?: string }) =>
    api.post(`/api/assignments/${id}/reassign`, data),
  withdraw: (id: string, notes?: string) =>
    api.post(`/api/assignments/${id}/withdraw`, { notes }),
};

export const deliveryStatusApi = {
  getReasons: () => api.get('/api/delivery-status/meta/reasons'),
  getHistory: (deliveryId: string) => api.get(`/api/delivery-status/${deliveryId}/status-history`),
  action: (deliveryId: string, data: Record<string, unknown>) =>
    api.post(`/api/delivery-status/${deliveryId}/action`, data),
};

export const callsApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/calls', { params }),
  pending: (params?: Record<string, unknown>) => api.get('/api/calls/pending', { params }),
  stats: () => api.get('/api/calls/stats'),
  myCalls: (params?: Record<string, unknown>) => api.get('/api/calls/my', { params }),
  updateMyCall: (id: string, data: Record<string, unknown>) => api.patch(`/api/calls/my/${id}`, data),
  registerDial: (id: string, phone?: string) => api.post(`/api/calls/my/${id}/dial`, { phone }),
  assign: (data: { deliveryIds: string[]; operatorUserId: string }) => api.post('/api/calls/assign', data),
  operators: () => api.get('/api/calls/operators'),
  managementStats: (params?: Record<string, unknown>) => api.get('/api/calls/management-stats', { params }),
  operatorMonitoring: (params?: Record<string, unknown>) =>
    api.get('/api/calls/operator-monitoring', { params }),
  register: (data: Record<string, unknown>) => api.post('/api/calls', data),
};

export const medicationsApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/medications', { params }),
  search: (q: string) => api.get('/api/medications/search', { params: { q } }),
  getByCum: (cum: string) => api.get(`/api/medications/by-cum/${cum}`),
  create: (data: Record<string, unknown>) => api.post('/api/medications', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/api/medications/${id}`, data),
  import: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/api/medications/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const reportsApi = {
  download: (type: string, params?: Record<string, unknown>) =>
    api.get(`/api/reports/${type}`, {
      params: { format: params?.format || 'xlsx', ...params },
      responseType: 'blob',
    }),
};

export const intermunicipalRoutesApi = {
  listMunicipalities: (params?: Record<string, unknown>) =>
    api.get('/api/intermunicipal-routes/municipalities', { params }),
  createMunicipality: (data: Record<string, unknown>) =>
    api.post('/api/intermunicipal-routes/municipalities', data),
  updateMunicipality: (id: string, data: Record<string, unknown>) =>
    api.patch(`/api/intermunicipal-routes/municipalities/${id}`, data),
  setMunicipalityActive: (id: string, isActive: boolean) =>
    api.patch(`/api/intermunicipal-routes/municipalities/${id}/active`, { isActive }),
  dashboard: () => api.get('/api/intermunicipal-routes/dashboard'),
  listDrivers: () => api.get('/api/intermunicipal-routes/drivers'),
  getDriverActiveRoutes: (driverId: string) =>
    api.get(`/api/intermunicipal-routes/drivers/${driverId}/active-routes`),
  list: (params?: Record<string, unknown>) => api.get('/api/intermunicipal-routes', { params }),
  getById: (id: string) => api.get(`/api/intermunicipal-routes/${id}`),
  create: (data: Record<string, unknown>) => api.post('/api/intermunicipal-routes', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/api/intermunicipal-routes/${id}`, data),
  addDeliveries: (id: string, deliveryIds: string[]) =>
    api.post(`/api/intermunicipal-routes/${id}/deliveries`, { deliveryIds }),
  removeDelivery: (id: string, deliveryId: string) =>
    api.delete(`/api/intermunicipal-routes/${id}/deliveries/${deliveryId}`),
  dispatch: (id: string) => api.post(`/api/intermunicipal-routes/${id}/dispatch`),
  close: (id: string, notes?: string) => api.post(`/api/intermunicipal-routes/${id}/close`, { notes }),
  cancel: (id: string, notes?: string) => api.post(`/api/intermunicipal-routes/${id}/cancel`, { notes }),
  transferDriver: (id: string, newDriverId: string, notes?: string) =>
    api.post(`/api/intermunicipal-routes/${id}/transfer-driver`, { newDriverId, notes }),
  split: (id: string, data: Record<string, unknown>) =>
    api.post(`/api/intermunicipal-routes/${id}/split`, data),
  history: (id: string) => api.get(`/api/intermunicipal-routes/${id}/history`),
};

export const couriersApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/couriers', { params }),
  panel: () => api.get('/api/couriers/panel'),
  getById: (id: string) => api.get(`/api/couriers/${id}`),
  listRoutes: (params?: Record<string, unknown>) => api.get('/api/couriers/routes', { params }),
  getTodayRoute: (courierId: string) => api.get(`/api/couriers/routes/today/${courierId}`),
  carryOverRoute: (routeId: string, targetDate: string) =>
    api.post(`/api/couriers/routes/${routeId}/carry-over`, { targetDate }),
  closeRoute: (routeId: string, notes?: string) =>
    api.post(`/api/couriers/routes/${routeId}/close`, { notes }),
};

export const usersApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/users', { params }),
  getById: (id: string) => api.get(`/api/users/${id}`),
  create: (data: Record<string, unknown>) => api.post('/api/users', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/api/users/${id}`, data),
  changeStatus: (id: string, status: string) => api.patch(`/api/users/${id}/status`, { status }),
  activate: (id: string) => api.patch(`/api/users/${id}/activate`),
  deactivate: (id: string) => api.patch(`/api/users/${id}/deactivate`),
  resetPassword: (id: string, password: string) => api.post(`/api/users/${id}/reset-password`, { password }),
};

export const rolesApi = {
  list: () => api.get('/api/roles'),
};

export const patientsApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/patients', { params }),
  getById: (id: string) => api.get(`/api/patients/${id}`),
  getHistory: (id: string) => api.get(`/api/patients/${id}/history`),
  createManual: (data: Record<string, unknown>) => api.post('/api/patients/manual', data),
  createDeliveryManual: (data: Record<string, unknown>) => api.post('/api/patients/deliveries/manual', data),
};

export const excelApiExtended = {
  ...excelApi,
  delete: (id: string) => api.delete(`/api/excel-imports/${id}`),
  reprocess: (id: string) => api.post(`/api/excel-imports/${id}/reprocess`),
};

export const pendingPrepApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/pending-prep', { params }),
  summary: () => api.get('/api/pending-prep/summary'),
  pack: (
    id: string,
    data: {
      observations?: string;
      items?: Array<{ itemId: string; lotNumber?: string }>;
      patientUpdates?: Record<string, string>;
    }
  ) => api.post(`/api/pending-prep/${id}/pack`, data),
  reject: (id: string, observations: string) =>
    api.post(`/api/pending-prep/${id}/reject`, { observations }),
  reopen: (id: string, observations?: string) =>
    api.post(`/api/pending-prep/${id}/reopen`, { observations }),
};

export const authApi = {
  forgotPassword: (email: string) =>
    api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/api/auth/reset-password', { token, password }),
};

export const notificationsApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/notifications', { params }),
  unreadCount: () => api.get('/api/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/api/notifications/${id}/read`),
  markAllRead: () => api.patch('/api/notifications/read-all'),
};

export const auditApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/audit-logs', { params }),
};
