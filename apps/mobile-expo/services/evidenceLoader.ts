import * as FileSystem from 'expo-file-system/legacy';
import { API_URL } from '../config/api';
import { useAuthStore } from '../store/auth.store';
import {
  getLocalEvidenceByDelivery,
  upsertCachedRemoteEvidence,
  type LocalEvidenceRecord,
} from '../database/evidence.repo';
import { fetchDeliveryEvidence } from './api';
import { isOnline } from '../sync/syncManager';

export type DeliveryPhoto = {
  key: string;
  uri: string;
  pendingSync?: boolean;
};

function recordToPhoto(record: LocalEvidenceRecord): DeliveryPhoto | null {
  if (record.localPath) {
    return {
      key: record.remoteId || record.id,
      uri: record.localPath,
      pendingSync: !record.synced,
    };
  }
  if (record.base64Data) {
    return {
      key: record.remoteId || record.id,
      uri: `data:image/jpeg;base64,${record.base64Data}`,
      pendingSync: !record.synced,
    };
  }
  return null;
}

async function cacheRemotePhoto(deliveryId: string, remoteId: string): Promise<string | null> {
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;

  const dir = `${FileSystem.documentDirectory}evidence`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const target = `${dir}/${deliveryId}_${remoteId}.jpg`;

  const info = await FileSystem.getInfoAsync(target);
  if (info.exists) {
    await upsertCachedRemoteEvidence(deliveryId, remoteId, target);
    return target;
  }

  try {
    const result = await FileSystem.downloadAsync(
      `${API_URL}/api/evidence/${remoteId}/file`,
      target,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    await upsertCachedRemoteEvidence(deliveryId, remoteId, result.uri);
    return result.uri;
  } catch {
    return null;
  }
}

export async function loadPhotosForDelivery(
  deliveryId: string,
  maxPhotos = 2
): Promise<DeliveryPhoto[]> {
  const localRecords = await getLocalEvidenceByDelivery(deliveryId);
  const photos: DeliveryPhoto[] = [];
  const seenKeys = new Set<string>();

  for (const record of localRecords) {
    if (record.type !== 'PHOTO') continue;
    const photo = recordToPhoto(record);
    if (!photo || seenKeys.has(photo.key)) continue;
    seenKeys.add(photo.key);
    photos.push(photo);
  }

  if ((await isOnline()) && photos.length < maxPhotos) {
    try {
      const remoteItems = await fetchDeliveryEvidence(deliveryId);
      for (const item of remoteItems) {
        if (item.type !== 'PHOTO' || seenKeys.has(item.id)) continue;

        const cachedLocal = localRecords.find((r) => r.remoteId === item.id && r.localPath);
        if (cachedLocal?.localPath) {
          photos.push({ key: item.id, uri: cachedLocal.localPath });
          seenKeys.add(item.id);
          continue;
        }

        const cachedPath = await cacheRemotePhoto(deliveryId, item.id);
        if (cachedPath) {
          photos.push({ key: item.id, uri: cachedPath });
          seenKeys.add(item.id);
        } else {
          const token = useAuthStore.getState().accessToken;
          if (token) {
            photos.push({
              key: item.id,
              uri: `${API_URL}/api/evidence/${item.id}/file`,
            });
            seenKeys.add(item.id);
          }
        }

        if (photos.length >= maxPhotos) break;
      }
    } catch {
      // Sin red o error: mostrar solo evidencia local
    }
  }

  return photos.slice(0, maxPhotos);
}
