import * as Network from 'expo-network';
import {
  getPendingSyncItems,
  markSyncItemCompleted,
  markSyncItemFailed,
} from '../offline/queue';
import { replaceCourierDeliveries } from '../database/deliveries.repo';
import { useAuthStore } from '../store/auth.store';
import { api, getApiErrorMessage } from '../services/api';
import { notifyDeliveriesSync } from './syncEvents';
import Constants from 'expo-constants';

const DEVICE_ID = Constants.sessionId || 'unknown-device';

let syncing = false;
let syncInterval: ReturnType<typeof setInterval> | null = null;
let networkListener: { remove: () => void } | null = null;
let lastSyncError: string | null = null;
let lastSyncCount = 0;
let wasOffline = false;

export function getSyncStatus() {
  return { error: lastSyncError, count: lastSyncCount };
}

export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return !!(state.isConnected && state.isInternetReachable !== false);
}

export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (syncing) return { synced: 0, failed: 0 };
  if (!(await isOnline())) return { synced: 0, failed: 0 };

  syncing = true;
  let synced = 0;
  let failed = 0;

  try {
    if (!useAuthStore.getState().accessToken) return { synced: 0, failed: 0 };

    const items = await getPendingSyncItems();
    if (items.length === 0) return { synced: 0, failed: 0 };

    const { data } = await api.post('/api/offline-sync/push', {
      deviceId: DEVICE_ID,
      items,
    });

    const results = data.data.results as Array<{ id: string; success: boolean; error?: string }>;

    for (const result of results) {
      if (result.success) {
        await markSyncItemCompleted(result.id);
        synced++;
      } else {
        await markSyncItemFailed(result.id, result.error || 'Unknown error');
        failed++;
      }
    }
  } catch (err) {
    console.error('Sync failed:', err);
  } finally {
    syncing = false;
  }

  return { synced, failed };
}

export async function fetchAndCacheDeliveries(): Promise<boolean> {
  if (!(await isOnline())) {
    lastSyncError = 'Sin conexión a internet';
    notifyDeliveriesSync();
    return false;
  }
  if (!useAuthStore.getState().accessToken) {
    lastSyncError = 'Sesión no válida';
    notifyDeliveriesSync();
    return false;
  }

  try {
    const userId = useAuthStore.getState().user?.id ?? null;
    const { data } = await api.get('/api/deliveries/my', { params: { limit: 100 } });
    const deliveries = data.data ?? [];
    await replaceCourierDeliveries(deliveries, userId);
    lastSyncError = null;
    lastSyncCount = deliveries.length;
    notifyDeliveriesSync();
    return true;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401) {
      await useAuthStore.getState().logout();
    }
    lastSyncError = getApiErrorMessage(err, 'Error al sincronizar entregas');
    notifyDeliveriesSync();
    console.error('Fetch deliveries failed:', err);
    return false;
  }
}

export function startAutoSync(intervalMs = 30000): void {
  if (syncInterval) return;
  syncInterval = setInterval(async () => {
    await performFullSync();
  }, intervalMs);

  if (!networkListener) {
    networkListener = Network.addNetworkStateListener(async (state) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      if (online && wasOffline) {
        await performFullSync();
      }
      wasOffline = !online;
    });
  }

  Network.getNetworkStateAsync().then((state) => {
    wasOffline = !(state.isConnected && state.isInternetReachable !== false);
  });
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  if (networkListener) {
    networkListener.remove();
    networkListener = null;
  }
}

export async function performFullSync(): Promise<boolean> {
  await syncOfflineQueue();
  return fetchAndCacheDeliveries();
}
